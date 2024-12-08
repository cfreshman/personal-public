import fs from 'fs';
import { entryMap, named_log, set, staticPath } from '../../util';
import db from '../../db';
import { randAlphanum } from '../../rand';
import ioM from '../../io';
import { send } from '../notify/model';
import notify from '../notify';
import io from '../../io';
import path from 'path';

const log = named_log('chat model')
const names = {
    user: 'chat-user',
        // user string
        // dms { user: string }
        // unread { string: number }
    chat: 'chat',
        // hash string
        // users string[]
        // messages { text: string, meta: { t: number, user: string, silent: boolean }}
        // unread { string: number } where string=user, number=count
        // notifyApp? string
    list: 'chat-list',
        // id: string-hash
        // marked: { number:true }
}
const C = entryMap(names, name => () => db.collection(name));

// clear repeated messages
setTimeout(async () => {
    // const chats = await C.chat().find({}).toArray()
    // Array.from(chats).forEach(chat => {
    //     chat.messages = chat.messages.filter((curr, i, all) => {
    //         if (i === 0) return true
    //         const before = all[i-1]
    //         if (curr.text === before.text && curr.meta.t - before.meta.t < 2000) {
    //             console.log(curr.text, curr.meta.t, before.meta.t)
    //             return false
    //         }
    //         return true
    //     })
    //     C.chat().updateOne({ hash: chat.hash }, { $set: chat }, { upsert: true });
    // })
    // C.user().updateOne({ user: 'cyrus' }, { $set: {unread:{}} }, { upsert: true });

    // clear site chat
    const site_chat = await C.user().findOne({ user:'site' })
    await Promise.allSettled(Object.entries(site_chat.dms).map(async ([other, hash]) => {
        const other_chat = await C.chat().findOne({ hash })
        if (other_chat.messages.length > 100) {
            log('reset site chat', other, other_chat.messages.length)
            other_chat.messages = []
            await C.chat().updateOne({ hash }, { $set: other_chat })
        }
    }))

}, 3000)

async function _get(hash) {
    let chat = await C.chat().findOne({ hash })
    // chat.messages = chat.messages.slice(0, 74)
    // C.chat().updateOne({ hash }, { $set: chat })
    return chat
}
async function _getUser(user) {
    // await C.user().updateMany({}, { $set: { unread: {} } });
    return (await C.user().findOne({ user })) || {
        user,
        chats: [],
        dms: {},
        unread: {},
    }
}
async function _putUser(props) {
    await C.user().updateOne({ user: props.user }, { $set: props }, { upsert: true });
}

async function getUser(user) {
    return {
        chatUser: await _getUser(user)
    }
}

async function getUserChat(profile, other, create=false) {
    // console.log(profile)
    if (!profile.friends?.includes(other) && profile.user !== other && ![profile.user, other].some(u => 'cyrus site'.includes(u))) throw `${other} is not a friend`
    let chatUser = await _getUser(profile.user)
    let hash = chatUser.dms[other]
    let chat
    if (hash) {
        chat = await _get(hash)
    }
    if (!chat) {
        hash = hash || randAlphanum(7)
        chat = {
            hash,
            users: [profile.user, other],
            messages: []
        }
        if (create) {
            let chatOther = await _getUser(other)
            chatUser.dms[other] = hash
            chatOther.dms[profile.user] = hash
            _putUser(chatUser)
            _putUser(chatOther)
            C.chat().insertOne(chat);
        }
    }
    return { chat, chatUser }
}
async function userchat_from_hash(user, hash) {
    let user_chat = await C.chat().findOne({hash})
    if (!user_chat || !user_chat.users.includes(user)) throw `unable to see user for chat ${hash}`
    return { user:user_chat.users.find(x => x !== user) }
}
async function readUserChat(profile, other) {
    let { chat, chatUser } = await getUserChat(profile, other)
    chatUser.unread && delete chatUser.unread[chat.hash]
    _putUser(chatUser)
    ioM.send(profile.user, 'chat:unread', chatUser.unread)
    return { chat, chatUser }
}
async function sendUserChat(profile, other, messages) {
    // if (!profile.friends?.includes(other) && ![profile.user, other].some(u => 'cyrus site'.includes(u))) throw `${other} is not a friend`
    let { chat, chatUser } = await getUserChat(profile, other, true)
    const dedupes = new Set()
    // I accidentally sent a bunch of dupes from site
    chat.messages = chat.messages.filter(({ text, meta}) => {
        if (meta.user === 'site' && dedupes.has(meta.dedupe)) return false
        if (meta.dedupe) dedupes.add(meta.dedupe)
        return true
    })
    messages = messages.map(({ text, meta }) => {
        meta = meta || {}
        if (dedupes.has(meta.dedupe || text)) return false
        meta.t = Date.now()
        meta.user = profile.user
        return { text, meta }
    }).filter(x=>x)
    chat.messages = chat.messages.concat(messages)
    C.chat().updateOne({ hash: chat.hash }, { $set: chat }, { upsert: true });
    ioM.send([profile.user, other], "chat:update", chat.hash, messages)
    let unread = messages.reduce((acc, msg) => acc + (msg.meta.read ? 0 : 1), 0)
    if (unread) {
        let chatOther = await _getUser(other)
        // console.log(chatOther)
        if (!chatOther.unread) chatOther.unread = {}
        if (!chatOther.unread[chat.hash]) {
            chatOther.unread[chat.hash] = unread
            ioM.send(other, 'chat:unread', chatOther.unread)
            !['site', other].includes(profile.user) && send(other, 'chat', `new chat from /u/${profile.user}`, `freshman.dev/chat/${profile.user}`)
        } else {
            chatOther.unread[chat.hash] += unread
        }
        _putUser(chatOther)
    }
    return { chat, chatUser }
}

const PUBLIC_CHATS = set('uglychat')
async function newChat(users, hash) {
    if (hash) {
        if (await _get(hash)) throw `/chat/${hash} already exists`
    } else do {
        hash = randAlphanum(7)
    } while (await _get(hash))

    let unread = []
    users = users.filter(u => u)
    users.forEach(u => unread[u] = 0)

    let chat = {
        hash,
        users,
        unread,
        messages: [],
    }
    await C.chat().insertOne(chat);
    console.log('[CHAT:new]', hash, users)
    return { chat }
}
async function getChat(user, hash) {
    let chat = await _get(hash)
    if (chat && !chat.users.includes(user) && !PUBLIC_CHATS.has(hash)) throw `${user} can't view /chat/${hash}`
    return { chat }
}
async function readChat(user, hash) {
    let { chat } = (user === 'cyrus') ? { chat: await _get(hash) } : await getChat(user, hash)
    return { chat }
}
async function sendChat(user, hash, messages) {
    let { chat } = await getChat(user, hash)
    let silent = 0
    const dedupes = new Set(chat.messages
        .map(m => m.meta.dedupe)
        .filter(m => m !== undefined))
    messages = messages.map(({ text, meta }) => {
        meta = meta || {}
        if (dedupes.has(meta.dedupe)) return false
        meta.t = Date.now()
        meta.user = user
        if (meta.silent) silent++
        return { text, meta }
    }).filter(m => m)
    let read = chat.read || {}
    chat.users.forEach(u => read[u] = (read[u] || chat.messages.length) + silent)
    read[user] += messages.length - silent
    chat.read = read
    chat.messages = chat.messages.concat(messages)

    let unread = {}
    chat.users.forEach(u => unread[u] = chat.messages.length - read[u])
    // console.log('[CHAT:send]', user, hash, unread, messages.map(m => m.text))
    console.log('[CHAT:send]', user, hash, unread)
    await C.chat().updateOne({ hash: chat.hash }, { $set: chat }, { upsert: true });
    ioM.send(chat.users, "chat:update", chat.hash, messages, unread)
    if (chat.notifyApp) {
        notify.send(chat.users.filter(x => x !== user), chat.notifyApp, 'new message')
    }
    return { chat }
}
async function notifyChat(hash, app=undefined) {
    const chat = await _get(hash)
    chat.notifyApp = app
    await C.chat().updateOne({ hash }, { $set: chat })
    chat.users.map(async user => {
        const { unread } = await getUnread(user, hash)
        if (unread) await notify.send([user], chat.notifyApp, 'new message')
    })
}
async function getUnread(user, hash) {
    let { chat } = await getChat(user, hash)
    return { unread: chat.messages.length - ((chat.read || {})[user] || 0) }
}
async function clearUnread(user, hash) {
    let { chat } = await getChat(user, hash)
    let read = chat.read || {}
    read[user] = chat.messages.length
    chat.read = read
    C.chat().updateOne({ hash: chat.hash }, { $set: chat }, { upsert: true });
    return { success: true }
}

async function _addUser(hash, user) {
    let chat = await _get(hash)
    if (chat.users.includes(user)) return
    console.log('[CHAT:add]', hash, user, chat)
    chat.users.push(user)
    chat.unread[user] = 0
    await C.chat().updateOne({ hash: chat.hash }, { $set: chat }, { upsert: true });
}
async function addChat(user, hash) {
    return await _addUser(hash, user)
}

async function siteChat(user, msgs) {
    if (!(msgs instanceof Array)) msgs = [msgs]
    msgs = msgs.filter(x=>x).map(msg => typeof(msg) === 'string' ? { text: msg } : msg)
    // console.log(user, msgs)
    await sendUserChat({ user: 'site' }, user, msgs)
}

async function get_marked(viewer, id) {
    const chat = await C.chat().findOne({ hash:id })
    if (!chat) throw 'not found'
    if (!chat.users.includes(viewer)) throw 'unauthorized'
    const marked = (await C.list().findOne({ id })) || {
        id,
        marked: {},
    }
    return { marked }
}
async function set_mark(viewer, id, { t, marked:is_marked=true }) {
    log({ t, is_marked })
    const { marked } = await get_marked(viewer, id)
    marked.marked[t] = is_marked
    await C.list().updateOne({ id }, { $set:marked }, { upsert:true })
    await io.inst().to(`chat:list:${id}`).emit(`chat:list:${id}:update`)
    return { marked }
}

export const CHAT_RAW_PATH = path.join(staticPath, 'raw', 'chat')
async function get_ai_suggestions(viewer, { logs=`(no logs. make something up! my username is ${viewer})` }) {
    log('get_ai_suggestions', viewer)
    const ai_template = fs.readFileSync(path.join(CHAT_RAW_PATH, `ai_template.txt`)).toString()
    const query = ai_template.replace('\${user}', viewer).replace('\${logs}', logs)
    return { query }
}

const HASH_UGLYCHAT = 'uglychat'
async function join_uglychat(viewer) {
    if (!viewer) return { success:false }
    const uglychat = await _get(HASH_UGLYCHAT)
    if (!uglychat) await newChat([], HASH_UGLYCHAT)
    await _addUser('uglychat', viewer)
    return { success:true }
}

export {
    names,
    getUser,

    newChat,
    getChat,
    readChat,
    sendChat,
    notifyChat,
    addChat,

    getUserChat,
    readUserChat,
    sendUserChat,
    getUnread,
    clearUnread,

    _putUser,
    _addUser,

    siteChat,

    userchat_from_hash,

    get_marked, set_mark,

    get_ai_suggestions,

    join_uglychat,
};