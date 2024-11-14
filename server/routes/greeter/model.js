import fs from 'fs';
import db from '../../db';
import io from '../../io';
import { entryMap, fetch, named_log, remove as removeArr, staticPath } from '../../util';
import { randAlphanum } from '../../rand';
import file from '../file';
import notify from '../notify';
import { url_for_data_url } from '../integrations';
import * as M_profile from '../profile/model'
import { siteChat } from '../chat/model';
import { query_llm } from '../../ai';
import path from 'path';
import ly from '../ly';
const { duration } = window

const log = named_log('greeter')
const names = {
    greeter: 'greeter',
        // user: string
        // links: string[]
        // hangouts: { string:true }
    greeter_detail: 'greeter_detail',
        // id: string
        // users: string[]
        // t: number_date
        // location: string
        // links: string[]
        // icon: string
        // icon_url: string
    greeter_met: 'greeter_met',
        // user: string
        // other: string
        // id: string
        // public: string
        // private: string
        // group: string
        // quiz: { string:string }
    greeter_hangout: 'greeter_hangout',
        // id: string
        // users: string[]
        // t: number_date
        // title string
        // location: string
        // public: { string_user:string }
        // links: string[]
        // icon: string
        // icon_url: string
        // code?: string
}
const C = entryMap(names, name => () => db.collection(name))

// db.queueInit(async () => {
//     // console.debug(Array.from(await C.greeter_detail().find({}).toArray()))
//     // console.debug(Array.from(await C.greeter_met().find({}).toArray()))
//     // await C.greeter_detail().deleteMany({})
//     // await C.greeter_met().deleteMany({})

//     const mets = Array.from(await C.greeter_met().find({}).toArray())

//     const single_user_ids = mets.filter(x => x.user === x.other).map(x => x.id)
//     await C.greeter_met().deleteMany({ id: {$in:single_user_ids} })
//     await C.greeter_detail().deleteMany({ id: {$in:single_user_ids} })

//     // const mets = Array.from(await C.greeter_met().find({}).toArray())
//     // const ids_per_user = {}
//     const mets_per_id = {}
//     mets.map(met => {
//         // ;[meet.user, meet.other].map(user => ids_per_user[user] = (ids_per_user[user]||[]).concat([meet.id]))
//         mets_per_id[met.id] = (mets_per_id[met.id]||[]).concat([met])
//     })
//     const ids = mets.map(met => met.id)
//     for (let i = 0; i < mets.length; i++) {
//         const id = ids[i]
//         const mets = mets_per_id[id]
//         const { user, other } = mets[0]
//         // console.debug(mets.map(met => met.group))
//         await M_profile.set_hidden(user, other, mets.map(met => met.group).includes('dates'))
//     }
// }, 5_000)

// fetch('https://open.spotify.com/user/cfreshman').then(result => console.debug('twitter', result.body))

const authorized = async (viewer, users) => {
    const reject = () => {throw 'unauthorized'}
    if (!viewer) reject()
    if (users.includes(viewer) || viewer === 'site') return
    // authorized if in follows
    // const profiles = await Promise.all(users.map(user => M_profile._get(user)))
    // const authorized_users = new Set(profiles.flatMap(x=>x.follows||[]))
    // if (!authorized_users.has(viewer) && viewer !== 'site') reject()
    // authorized if any user follows viewer
    const profile = await M_profile._get(viewer)
    const follower_set = new Set(profile?.followers || [])
    if (!users.some(x => follower_set.has(x))) reject()
}
const authorized_group = async (viewer, friend, other) => {
    await authorized(viewer, [friend, other])

    const reject = () => {throw 'unauthorized group'}
    if (!viewer) reject()
    if ([friend, other, 'site'].includes(viewer)) return
    
    const a = await _met(friend, other)
    const b = await _met(other, friend)
    if (a && b) {
        const id = a.id || b.id
        const item = fill_full(id ? await C.greeter_detail().findOne({ id }) : {}, [a, b], 'site')
    
        const groups = [...Object.values(item.group)]
        const group_private = groups.includes('dates')
    
        if (group_private) throw reject()
    }
}

// TODO get meets as follows minus dating group

function full_to_met(item, user) {
    const other = item.users[0] === user ? item.users[1] : item.users[0]
    return {
        user, other,
        id: item.id,
        public: item.public[user],
        private: item.private[user],
        group: item.group[user],
        quiz: item.quiz[user]||{},
    }
}
function full_to_detail(item) {
    const new_item = JSON.parse(JSON.stringify(item))
    delete new_item.public
    delete new_item.private
    delete new_item.group
    delete new_item.quiz
    return new_item
}
function fill_full(detail, user_mets, viewer=undefined) {
    const item = Object.assign({
        location: '',
        links: [],
    }, detail || {}, {
        users: [],
        public: {},
        private: {},
        group: {},
        quiz: {},
    })
    delete item._id
    user_mets.map(met => {
        item.users.push(met.user)
        item.public[met.user] = met.public
        item.private[met.user] = met.private
        item.group[met.user] = met.group
        item.quiz[met.user] = met.quiz
    })
    const non_viewers = viewer === 'site' ? [] : item.users.filter(x => x !== viewer)
    non_viewers.map(non_viewer => {
        delete item.private[non_viewer]
        delete item.group[non_viewer]
    })
    return item
}

async function _met(user, other) {
    return (await C.greeter_met().findOne({ user, other })) || {
        user, other,
        public: '',
        private: '',
        group: '',
    }
}
async function get_meet(viewer, friend, other) {
    console.debug('[greeter] get meet', {viewer, friend, other})
    // viewer must be followed by either friend or other
    // await authorized(viewer, [friend, other])
    await authorized_group(viewer, friend, other)
    const a = await _met(friend, other)
    const b = await _met(other, friend)
    const id = a.id || b.id
    const item = fill_full(id ? await C.greeter_detail().findOne({ id }) : {}, [a, b], viewer)
    return { item }
}
async function set_meet(user, data) {
    let { users=[], t, location, links, icon, public:_public={}, private:_private={}, group={}, quiz={} } = data
    let [_user, other] = users
    console.debug('[greeter:set_meet] users', {users, _user, other, user})
    if (user !== _user) {
        ;[user, other] = [other, _user]
    }
    const { item } = await get_meet('site', user, other)
    console.debug('[greeter:set_meet] inputs', user, other, users, data, item)
    if (!item.users.includes(user)) throw 'unauthorized'
    console.debug('[greeter:set_meet] original', item)
    if (!item.id) {
        notify.send(other, 'greeter', `${user} added the first time you met`, `freshman.dev/greeter/${user}/met/${other}`)
    }
    item.id = item.id || randAlphanum(12)
    item.t = t
    item.location = location
    item.links = links
    // console.debug(item)
    // item.icon = icon
    // item.icon_url = icon && url_for_data_url(icon)
    item.icon = icon && (icon.startsWith('/api') ? icon : url_for_data_url(icon))
    item.icon_url = item.icon
    item.public[user] = _public[user]
    item.private[user] = _private[user]
    item.group[user] = group[user]
    item.quiz[user] = quiz[user]
    console.debug('[greeter:set_meet] set', item)
    await C.greeter_met().updateOne({ user, other }, { $set: full_to_met(item, user) }, { upsert:true })
    await C.greeter_met().updateOne({ user:other, other:user }, { $set: full_to_met(item, other) }, { upsert:true })
    await C.greeter_detail().updateOne({ id:item.id }, { $set: full_to_detail(item) }, { upsert:true })
    
    await M_profile.set_hidden(...item.users, Object.values(item.group).includes('dates'))

    io.send(other, 'message', {
        // text: `${user} made edits, <a onclick="location.reload()">reload</a> to see them`,
        text: `${user} made edits to /greeter/${other}/met/${user} (tap to load)`,
        // ms: 60_000,
        id: 'greeter-edit', delete: 'greeter-edit',
    })
    // siteChat(other, `${user} made edits to /greeter/${other}/met/${user}`)

    return { item }
}

async function _greet(user) {
    return (await C.greeter().findOne({ user })) || {
        user,
        links: [],
        hangouts: {},
    }
}
async function get_greet(user, other) {
    console.debug('[greeter] get greet', user, other)
    const item = await _greet(other)
    return { item }
}
async function set_greet(user, data) {
    console.debug('[greeter] set greet', user)
    const { links } = data
    const { item } = await get_greet('site', user)
    item.links = links
    await C.greeter().updateOne({ user }, { $set: item }, { upsert:true })
    return { item }
}

async function get_meets(viewer, name) {
    await authorized(viewer, [name])
    const viewer_meets = Array.from(await C.greeter_met().find({ user:name }).toArray())
    const other_meets = Array.from(await C.greeter_met().find({ other:name }).toArray())
    const viewer_ids = viewer_meets.map(x => x.id)
    const details = Array.from(await C.greeter_detail().find({ id: { $in: viewer_ids } }).toArray())

    const id_to_parts = {}
    viewer_ids.map(id => id_to_parts[id] = {})
    viewer_meets.map(x => id_to_parts[x.id].viewer = x)
    other_meets.map(x => id_to_parts[x.id].other = x)
    details.map(x => id_to_parts[x.id].detail = x)

    const hidden_set = new Set()
    viewer_ids.map(id => {
        const parts = id_to_parts[id]
        const item = fill_full(parts.detail, [parts.viewer, parts.other], 'site')
        const groups = [...Object.values(item.group)]
        const group_private = groups.includes('dates')
        if (group_private && !item.users.includes(viewer)) hidden_set.add(id)
    })
    const list = viewer_ids.filter(id => !hidden_set.has(id)).map(id => {
        const parts = id_to_parts[id]
        return fill_full(parts.detail, [parts.viewer, parts.other], name)
    })

    return { list }
}


async function _hangout(viewer, id) {
    const item = (await C.greeter_hangout().findOne({ id })) || {
        users: [viewer],
        location: undefined,
        public: {},
        icon: undefined, icon_url: undefined,
    }
    // console.debug(item)
    // if (id && item && viewer !== 'site') {
    //     await authorized(viewer, item.users)

    //     if (!item.users.includes(viewer)) {
    //         const user_profiles = await Promise.all(item.users.map(user => M_profile._get(user)))
    //         if (user_profiles.some(profile => item.users.some(user => (profile.hidden||{})[user]))) {
    //             throw 'unauthorized'
    //         }
    //     }
    // }
    return item
}
async function get_hangout(viewer, id) {
    console.debug('[greeter] get hangout', {viewer, id})
    // viewer must be followed by either friend or other
    // await authorized(viewer, [friend, other])
    const item = await _hangout(viewer, id)
    if (!item.users.includes(viewer)) {
        delete item.code
    }
    // console.log(item)
    return { item }
}
async function set_hangout(viewer, data) {
    let { id, users, t, title, location, public:_public={}, links, icon, code, delete:_delete } = data
    if (viewer === 'cyrus' && _delete) {
        users = []
    }
    log('set_hangout', viewer, users, data)
    const item = await _hangout(viewer, id)
    if (!item.users.includes(viewer) && (!code || item.code !== code)) throw 'unauthorized'
    if (code) log('set_hangout join', code)
    const new_hangout = !item.id
    const existing_users = item.users
    item.id = item.id || randAlphanum(12)
    item.users = users !== undefined ? users : item.users
    // if (new_hangout) {
    //     notify.send(others, 'greeter', `${viewer} added a new hangout`, `freshman.dev/greeter/hangout/${item.id}`)
    // }
    item.t = t !== undefined ? t : item.t
    item.title = title !== undefined ? title : item.title || ''
    item.location = location !== undefined ? location : item.location || ''
    // item.icon = icon !== undefined ? icon : item.icon
    // item.icon_url = item.icon && url_for_data_url(item.icon)
    item.icon = icon !== undefined ? icon && (icon.startsWith('/api') ? icon : url_for_data_url(icon)) : item.icon
    item.icon_url = item.icon
    const is_first_note = !item.public[viewer] && _public[viewer]
    item.public[viewer] = _public[viewer] !== undefined ? _public[viewer] : item.public[viewer]
    item.links = links !== undefined ? links : item.links || []
    item.code = item.code || randAlphanum(12)
    await C.greeter_hangout().updateOne({ id:item.id }, { $set: item }, { upsert:true })

    Array.from(new Set([...existing_users, ...item.users])).map(async (user) => {
        const user_greeter = await _greet(user)
        user_greeter.hangouts = {
            ...(user_greeter.hangouts || {}),
            [item.id]: true,
        }
        if (!item.users.includes(user)) delete user_greeter.hangouts[item.id]
        await C.greeter().updateOne({ user }, { $set: user_greeter }, { upsert: true })
    })
    
    const others = item.users.filter(x => x !== viewer)
    io.send(others, 'message', {
        // text: `${user} made edits, <a onclick="location.reload()">reload</a> to see them`,
        text: `${viewer} made edits to /greeter/hangout/${item.id} (tap to load)`,
        // ms: 60_000,
        id: 'greeter-edit', delete: 'greeter-edit',
    })
    // others.map(other => siteChat(other, `${viewer} made edits to /greeter/hangout/${item.id}`))

    const notified = new Set()

    // notify new users
    const existing_users_set = new Set(existing_users)
    const new_others = others.filter(user => !existing_users_set.has(user))
    notify.send(new_others, 'greeter', `${viewer} added you to a hangout`, `freshman.dev/greeter/hangout/${item.id}`)
    new_others.map(x => notified.add(x))
    
    // notify others of first note
    if (is_first_note) {
        notify.send(others.filter(x => !notified.has(x)), 'greeter', `${viewer} added a note`, `freshman.dev/greeter/hangout/${item.id}`)
    }

    // if from today and made by cyrus and title is worksesh, update /ly's 'today' to this hangout
    if (viewer === 'cyrus' && item.t > Date.now() - duration({ d:1 }) && item.title === 'worksesh') {
        const { ly:ly_data } = await ly.update('cyrus', 'today', { links:[`/greeter/hangout/${item.id}/${item.code}`] })
        log('set_hangout set ly worksesh', ly_data)
    }

    return { item }
}
async function get_hangouts(viewer, user) {
    await authorized(viewer, [user])
    const user_greeter = await C.greeter().findOne({ user })
    const hangout_ids = Array.from(Object.keys(user_greeter?.hangouts||{}))
    const user_hangouts = Array.from(await C.greeter_hangout().find({ id: { $in:hangout_ids } }).toArray())

    // filter to hangouts where viewer is included or none of the users are hidden (this is after initial follow check)
    const { hidden:user_hidden={} } = await M_profile._get(user)
    const list = user_hangouts.filter(hangout => {
        const { users } = hangout
        return users.includes(viewer) || !users.some(user => user_hidden[user])
    })
    return { list }
}
async function side_hangouts(viewer, id, user=viewer) {
    await authorized(viewer, [user])
    const hangout = await _hangout(user, id)
    const previous_hangout = await C.greeter_hangout().find({ id:{$ne:id}, t:{$lt:hangout.t}, users:user }).sort({ t: -1 }).limit(1).next()
    const equal_hangouts = Array.from(await C.greeter_hangout().find({ id:{$ne:id}, t:hangout.t, users:user }).toArray())
    const next_hangout = await C.greeter_hangout().find({ id:{$ne:id}, t:{$gt:hangout.t}, users:user }).sort({ t: 1 }).limit(1).next()
    // console.debug(hangout.t, {previous_hangout,next_hangout}, hangout, viewer, id)
    return { previous_hangout, equal_hangouts, next_hangout }
}


export const GREETER_RAW_PATH = path.join(staticPath,'raw', 'greeter')
log({ GREETER_RAW_PATH })

async function get_ai_suggestions(viewer, { logs=`(no logs. make something up! my username is ${viewer})` }) {
    const ai_template = fs.readFileSync(path.join(GREETER_RAW_PATH, `ai_template${viewer==='cyrus'?'_cyrus':''}.txt`)).toString()
    const query = ai_template.replace('\$\{logs\}', logs)
    // log({ai_template, query})
    return { query }

    // return await query_llm(query)
}

export {
    names, C,
    get_meet, set_meet,
    get_greet, set_greet,
    get_meets,
    get_hangout, set_hangout,
    get_hangouts,
    side_hangouts,

    get_ai_suggestions,
}