import db from '../../db';
import { randAlphanum } from '../../rand';
import { entryMap, HttpError, remove as removeItem } from '../../util';

const names = {
    key: 'key',
        // user: string-user
        // keys: string[]
        // locks: { [app]: string[] }
    lock: 'lock',
        // app: string-app,
        // identifier: string,
        // user: string-user
}
const C = entryMap(names, name => () => db.collection(name));

async function get(user) {
    return {
        info: (await C.key().findOne({ user },{_id:0})) || {
            user,
            keys: [],
        }
    }
}

async function generate(user) {
    const { info } = await get(user)
    const key = randAlphanum(12)
    info.keys = info.keys.concat(key)
    await C.key().updateOne({ user }, { $set: info }, { upsert: true })
    return { info }
}

async function remove(user, key) {
    const { info } = await get(user)
    info.keys = removeItem(info.keys, key)
    await C.key().updateOne({ user }, { $set: info }, { upsert: true })
    return { info }
}

async function lock(user, app, identifier, max=100) {
    const _locked = await locked(user, app, identifier)
    if (_locked) throw `user ${user} can't lock this resource`

    const { info } = await get(user)
    info.locks = (info.locks || {})
    const appLocks = info.locks[app] || []
    if (appLocks?.length > max) throw HttpError(405, 'too many locked resources')
    info.locks[app] = appLocks.filter(lock => lock != identifier).concat(identifier)
    await C.key().updateOne({ user }, { $set: info }, { upsert: true })
    await C.lock().updateOne({ app, identifier }, { $set: { app, identifier, user } }, { upsert: true })
    return { info }
}
async function unlock(user, app, identifier) {
    const _locked = await locked(user, app, identifier)
    if (_locked) throw `user ${user} can't unlock this resource`

    const { info } = await get(user)
    info.locks = (info.locks || {})
    info.locks[app] = removeItem(info.locks[app] || [], identifier)
    await C.key().updateOne({ user }, { $set: info }, { upsert: true })
    await C.lock().deleteOne({ app, identifier })
    return { info }
}

async function locked(user, app, identifier) {
    const entry = await C.lock().findOne({ app, identifier })
    if (!entry || entry.user === user) {
        return false
    } else {
        return true
    }
}
async function user(app, identifier) {
    const entry = await C.lock().findOne({ app, identifier })
    return entry?.user
}

export {
    names,
    get,
    generate,
    remove,
    lock,
    unlock,
    locked,
    user,
};
