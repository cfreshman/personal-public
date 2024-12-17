import db from '../../db';
import { entryMap, remove, pick, isDevelopment } from '../../util';
import { model as login } from '../login';
import mail from '../mail';
import { randAlphanum } from '../../rand';
import ioM from '../../io';

const alwaysAllowed = 'verify u profile reset chat'.split(' ')

const names = {
    notify: 'notify',
        // user: string
        // email: string
        // verify: string
        // verified: string[] user@domain
        // emailThread: string
        // apps: string[] (deprecated, use !unsub so true by default)
        // unsub: string[]
        // msg: { [app]: string[] }
        // domain?: string

        /* NEW other contact options
        method: string
        methods: {
            email
            twitter
            whatsapp
            discord
            telegram
            imessage
        }
        */

    ids: 'notify-ids', // IDs for individual user notification chat instances (e.g. Telegram)
        // user string
        // method string
        // id string
        // variant? string
}
const C = db.of(names)

const getMethodKey = ({ method, methods }) => typeof methods[method] === 'string' && (method === 'email' ? methods[method] : `${methods[method]}@${method}`)
const methodInstances = {}
const setMethodInstances = instances => Object.assign(methodInstances, instances)

const email_users = []
db.queueInit(async () => {
    // register 'site' user to send certain notifications
    try {
        const { notify } = await get('site')
        if (!notify.email) await email('site', 'cyrus+site@freshman.dev', 'site')
        // await email('site', 'cyrus+site@freshman.dev', 'site')
    } catch {}

    // migrate email: string to method: email methods: { email: string }
    await Promise.allSettled(Array.from(await C.notify().find({}).toArray()).map(async x => {
        const { user, email, method, methods } = x
        if (!methods) {
            await C.notify().updateOne({ user }, {
                $set: email ? {
                    method: 'email',
                    methods: {
                        email,
                    },
                } : { method: undefined, methods: {} },
            })
        } else {
            if (method === 'email' && methods.email && (!isDevelopment() || email_users.length < 2)) {
                email_users.push({ user, email:methods.email })
            }
        }
    }))
    // console.debug(Array.from(await C.notify().find({ email: { $exists: true, $ne: '' }}).toArray()))
    // console.debug(Array.from(await C.ids().find({}).toArray()))

    console.debug('[notify] email users', {email_users})
}, 3000)

async function _chain(notify, app, text, {simple=false}={}) {
    // intercept other notification methods
    if (notify.method !== 'email') {
        console.log('[NOTIFY:other]', notify.method)
        switch (notify.method) {
            case 'twitter': return await methodInstances.twitter.send(notify.user, text)
            case 'telegram': return await methodInstances.telegram.send(notify.user, text)
        }
    }

    notify.email = notify.methods.email
    console.log('[NOTIFY:email]', notify.user, notify.domain, app, text)
    mail.send(notify.domain, notify.email, 'notification', text)
    .catch(console.log)
}

async function get(user) {
    let notify = await C.notify().findOne({ user });
    if (!notify) {
        if (await login.get(user)) {
            notify = { user, method: '', methods: {}, apps: [], msg: [], };
            await C.notify().insertOne(notify);
        }
    }
    return { notify }
}
async function update(user, props) {
    if (props.user && user !== props.user) throw `${props.user} can't update ${user}`
    let { notify } = await get(user);
    if (notify) {
        Object.assign(notify, props);
        await C.notify().updateOne({ user }, { $set: props });
    }
    return { notify };
}

async function email(user, email=false, source='freshman.dev') {
    console.debug(`[NOTIFY:EMAIL]`, { user, email, source })
    let { notify } = await get(user)
    let verified = notify.verified || (notify.verify ? [] : [notify.email])
    let verify = (email && !verified.includes(email)) ? randAlphanum(7) : false
    // let verify = undefined
    let emailThread = email === notify.email ? notify.emailThread : undefined
    notify = (await update(user, { email, verified, verify, emailThread })).notify
    verify && _chain(notify, 'notify', `click to verify email – ${source}/notify#${verify}`)
    return { notify }
}
async function method(user, { method, value, source='freshman.dev', force_verify=false }) {
    // set method and/or value

    const { notify={} } = await get(user)
    const { methods={} } = notify
    methods[method] = (value === true || (value === false && method === 'email'))
        ? methods[method]
        : value

    if (value) {
        // create token if method not yet verified
        let verified = notify.verified || /*legacy*/(notify.verify ? [] :[notify.email])
        const key = getMethodKey({ method, methods})
        console.debug('[NOTIFY:method]', user, key, verified, methods)
        if (force_verify) {
            verified = [key, ...verified.filter(x => x !== key)]
        }
        const verify = (key && verified.includes(key)) ? false : randAlphanum(7)

        // set new method & token
        Object.assign(notify, { method, methods, verified, verify })
        await update(user, notify)

        // some methods require the user to message first
        // otherwise, send verification token now
        switch (method) {
            case 'email': {
                const emailThread = email === notify.email ? notify.emailThread : undefined
                Object.assign(notify, { emailThread })
                await update(user, notify)
                verify && _chain(notify, 'notify', `click to verify email – ${source ?? notify.domain}/notify#${verify}`)
            } break
        }
    } else {
        await update(user, { methods, method: method === 'email' ? '' : method })
    }

    return { notify }
}
async function verify(token, value=undefined) {
    let notify = await C.notify().findOne({ verify: token })
    if (notify) {
        const { method, methods } = notify
        if (value) methods[method] = value
        const key = getMethodKey({ method, methods })
        Object.assign(notify, {
            methods,
            verify: undefined,
            verified: [key, ...notify.verified.filter(x => x !== key)],
        })
        console.debug('[NOTIFY:VERIFY]', pick(notify, 'user domain method methods verify verified'))
        await update(notify.user, notify)
    }
    return { notify }
}

async function sub(user, app, _set) {
    let { notify } = await get(user)
    let set
    if (_set !== undefined) {
        set = _set
        let unsub = _set
            ? remove(notify.unsub || [], app)
            : [app].concat(notify.unsub || [])
        notify = update(user, { unsub })
    } else {
        set = !!(notify.email && !(notify.unsub || []).includes(app))
    }
    return { user, set }
}

async function read(user, _app) {
    let { notify } = await get(user)
    let { msg } = notify
    let clearedMsg = {}
    if (_app !== undefined) {
        clearedMsg = Object.assign({}, msg)
        msg = { [_app]: msg[_app] }
        delete clearedMsg[_app]
    }
    update(user, { msg: clearedMsg })
    return { msg }
}

async function send(users, app, text, link='', {simple=false}={}) {
    text = `${text}${link || app ? `\n${link || `freshman.dev/${app}`}` : ''}`
    let isSingle = typeof users === 'string'
    let results = await Promise.allSettled((isSingle ? [users] : users || []).map(async user => {
        const { notify={} } = await get(user) || {}
        if (!notify) return { success:false }

        let { msg={}, domain=undefined } = notify || {}
        if (Array.isArray(msg)) {
            msg = {}
        }

        const userText = text
            .replaceAll('freshman.dev', domain || 'freshman.dev')
            .replaceAll('wordbase.app/wordbase', 'wordbase.app')
        msg[app] = (msg[app] || []).concat(userText)

        let success = false // await ioM.confirm(user, 'notify:msg', msg)
        if (!success) {
            await update(user, { msg })

            const key = getMethodKey(notify)
            console.log('[NOTIFY:send]', user, key, app, userText)
            // will notify if not read & cleared within 10s
            let unsub = notify.unsub || []
            if (key && !unsub.includes(app)) {
            // if (notify.email && !notify.verify && !unsub.includes(app)) {
                setTimeout(async () => {
                    let { notify, notify: { msg } } = await get(user)

                    let appMsg = msg[app] || []
                    if (appMsg.includes(userText)) {
                        msg[app] = remove(appMsg, userText)
                        update(user, { msg })
                        _chain(notify, app, userText, {simple})
                    }
                }, 1000) // wait 1s
                success = true
            }
        }
        return { msg, success }
    }))

    return isSingle ? results[0] : results;
}
async function soft(users, app, text, link='') {
    text = `${text} – ${link || `freshman.dev/${app}`}`
    let msg = {
        [app]: [text]
    }
    return await ioM.send(users, "notify:msg", msg)
}

async function domain(user, domain) {
    let notify = await C.notify().findOne({ user });
    // console.log(user, domain)
    if (notify) {
        notify = (await update(notify.user, {
            domain
        })).notify
    }
    return { notify }
}

async function ADMIN_get_all_email_users(user) {
    if (user !== 'cyrus') throw `unauthorrized and this doesn't exist`
    return { list:email_users }
}
async function ADMIN_email_all_users(user, {text, link}) {
    if (user !== 'cyrus') throw `unauthorrized and this doesn't exist`
    console.debug(`[notify:ADMIN_email_all_users]`, {user,text,link})
    const instance_users = email_users.slice().reverse()
    for (let i = 0; i < instance_users.length; i++) {
        const {user} = instance_users[i]
        console.debug(`[notify:ADMIN_email_all_users] i`, i, user)
        send([user], undefined, text, link, {simple:true})
        await new Promise(r => setTimeout(r, 1_000))
    }
}


export {
    names, C,
    get, update,
    /*deprecated*/email,
    method,
    verify,

    sub,
    read,
    send,
    soft,

    domain,

    getMethodKey,
    setMethodInstances,

    ADMIN_get_all_email_users, ADMIN_email_all_users,
};