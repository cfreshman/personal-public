import { ObjectId } from 'mongodb';
import db from '../../db';
import crypto from 'crypto';
import * as uuid from 'uuid';
import mail from '../mail';
import { named_log, pick, set, toYearMonthDay } from '../../util';
import { embedLength } from 'discord.js';
import { setlock } from '../counter/model';

const name = 'login';
const log = named_log(name)
const genToken = () => uuid.v4();
const userAndToken = entry => entry ? pick(entry, 'user token conditions is_21') : {};
const names = {
    login: name,
    // user: string
    // pass: hash | string-email
    // reset: string
    // conditions: { cn?: number-date, pptc?: number-date, is_21?: number-date }
    // tz: string
    // email: string
    // type?: 'google'|undefined
}

const C = db.of(names)

db.queueInit(() => {
    // register 'site' user to send certain notifications
    'site admin mod user player chat settings invite join orange blue you wordbase picorepo dinder login contact wordle hash public about calendar delete open slte s1te hangout easy medium hard impossible strategist wordsmith beast speedy loading invalid username sername ai gail gai selfchat self'.split(' ').map(async special => {
        try {
            await signup(special, 'internal')
        } catch {}
    })

    // write cookies => { cn: true }
    Array.from(C.login().find({})).map(entry => {
        entry.conditions = entry.conditions ?? (entry.cookies ? { cn: entry.cookies } : {})
        C.login().updateOne({ user: entry.user }, { $set: entry }, { upsert: true })
    })

    // publicize user count
    // db.login.find({pass:{$ne:'internal'}}).count()


    const update_user_count = async () => {
        await setlock('cyrus', 'site', 'accounts', await C.login().countDocuments({pass:{$ne:'internal'}}))
    }
    update_user_count()
    setInterval(update_user_count, 1000 * 60 * 60 * 24) // 24hr
})

async function get(user) {
    if (user && !user.match(/^\w+$/)) {
        console.log('alphanumeric name error', user)
        throw `use alphanumeric name`
    }
    return db.collection(name).findOne({ user: new RegExp(`^${user}$`, 'i') });
}

// store in-memory hash for quick lookup, backed by actual database
// make sure we update _check immediately when token changes in _update below
const _check = {}

async function _update(entry) {
    if (entry.user && entry.token) _check[entry.user] = entry.token
    return db.collection(name).updateOne(
        { _id: entry._id },
        { $set: entry },
        { upsert: true },
    )
}

const kicked = set('')
async function login(user, passHash) {
    if (kicked.has(user)) throw `you've been kicked`
    let entry = await get(user);
    if (entry && !entry.pass) entry.pass = passHash
    if (entry && entry.pass === passHash) {
        // entry.token = genToken();
        await _update(entry);
        console.debug(userAndToken(entry))
        return userAndToken(entry);
    }
    throw (entry ? 'incorrect password' : "user doesn't exist")
}
async function token(user, token) {
    if (kicked.has(user)) throw `you've been kicked`
    let entry = await get(user)
    console.debug(user, token, entry)
    if (entry && entry.token === token) {
        await _update(entry)
        return userAndToken(entry)
    }
    throw (entry ? 'incorrect token' : "user doesn't exist")
}

async function signup(user, passHash, info, options={}) {
    let entry = await get(user);
    if (await get(user)) throw 'user already exists';
    if (user.length < 3) throw 'too short (<3)';
    if (user.length > 8) throw 'too long (>8)';

    entry = {
        user,
        pass: passHash,
        token: genToken(),
        conditions: {
            cn: Date.now(),
            pptc: Date.now(),
            is_21: options.checks?.is_21 ? Date.now() : undefined,
        },
        email: options.email,
        type: options.type,
    }
    log('signup', {user, info, options})
    const short = info?.href.replace(/https?:\/\//, '')
    // info = `at ${short || '?'}\n\n${info?.timezone||''}`
    info = `at ${short || '?'}`
    console.log('[SIGNUP]', entry.user, info.replaceAll(/\n+/g, ' '));
    mail.send(short, 'cyrus+signup@freshman.dev', 'user signup',
        // `<a href="f3n.co/~${entry.user}">~${entry.user}</a> ${info}`)
        // `freshman.dev/u/${entry.user}\n\n${info}`)
        `<a href="freshman.dev/u/${entry.user}">${entry.user}</a> ${info}`)
    await db.collection(name).updateOne({ user }, { $set: entry }, { upsert: true });
    return userAndToken(entry);
}

async function check(user, token, tz=undefined) {
    if (kicked.has(user)) throw `you've been kicked`
    let actual = _check[user]
    if (!actual) {
        actual = _check[user] = (await get(user))?.token
    }
    // console.log(user, entry && entry.token, token);
    setTimeout(async () => {
        const entry = await C.login().findOne({ user })
        if (entry && entry.tz !== tz) {
            entry.tz = tz
            C.login().updateOne({ user }, { $set: entry })
        }
    }, 500)
    return { ok: actual && actual === token }
}
function preCheck(user, token) {
    const actual = _check[user]
    return actual && actual === token
}

async function setPass(user, pass) {
    let entry = await get(user)
    entry.pass = pass
    entry.token = genToken()
    _update(entry)
    return userAndToken(entry)
}

async function accept(user, { cn, pptc, is_21 }) {
    const entry = await get(user)
    const prior = entry.conditions ?? { cn: entry.cookies }
    entry.conditions = {
        cn: cn ? Date.now() : prior.cn,
        pptc: pptc ? Date.now() : prior.pptc,
        is_21: is_21 ? Date.now() : prior.is_21,
    }
    _update(entry)
    log('accept', pick(entry, 'user conditions'))
    return userAndToken(entry)
}

async function timezone(user) {
    const entry = await get(user)
    return entry?.tz || 0
}
async function time(user, date=undefined) {
    const { tz } = (await get(user) || {})
    const adjusted = date || new Date()
    if (tz !== undefined) {
        adjusted.setHours(adjusted.getHours() - adjusted.getTimezoneOffset()/60)
        adjusted.setHours(adjusted.getHours() + tz)
    }
    return adjusted
}
async function date(user, date=undefined) {
    return toYearMonthDay(await time(user, date))
}

export {
    name, C,
    get,
    login, token,
    signup,
    check,
    preCheck,
    setPass,
    accept,

    timezone,
    time, date,
};