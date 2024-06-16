import db from '../../db';
import { entryMap, HttpError } from '../../util';
import * as keyModel from '../key/model';

const names = {
    counter: 'counter',
        // space: string
        // key: string
        // value: number
        // owner: string
        // user: { [user]: value }
}
const C = entryMap(names, name => () => db.collection(name));

async function get(user, space, key, view=false) {
    space = space || 'default'
    const counter = (await C.counter().find({ space, key }).project({_id:0}).next()) || { space, key, value: 0 }
    // console.log(user, counter)
    if (!view && counter.owner && counter.owner !== user) throw HttpError(403, 'already owned')
    return counter
}
async function all(user, space) {
    if (!space) throw `space is required`
    const counters = Array.from(await C.counter().find({ space }).project({_id:0}).toArray()) ?? []
    console.log(user, counters)
    if (counters[0] && counters[0].owner && counters[0].owner !== user) throw HttpError(403, 'already owned')
    return counters
}
async function prefix(user, space) {
    if (!space) throw `space is required`
    const counters = Array.from(await C.counter().find({ space: { $regex: `^${space}`, $options: 'i' } }).project({_id:0}).toArray()) ?? []
    console.log('[COUNTER:PREFIX]', user, space, counters)
    if (counters[0] && counters[0].owner && counters[0].owner !== user) throw HttpError(403, 'already owned')
    return counters
}
async function update(space, key, counter) {
    space = space || 'default'
    // await C.counter().deleteOne({ space, key })
    await C.counter().updateOne({ space, key }, { $set: counter }, { upsert: true })
}
async function shift(user, space, key, amount) {
    space = space || 'default'
    let counter = await get(user, space, key)
    counter.value += amount
    counter.user = counter.user ?? {}
    counter.user[user] = (counter.user[user] || 0) + amount
    // console.log(user, amount, counter)
    console.log(user, space, key, 'shift', amount)
    await update(space, key, counter)
    return counter
}
async function set(user, space, key, amount) {
    space = space || 'default'
    const counter = await get(user, space, key)
    counter.value = amount
    counter.user = { user: amount }
    console.log(user, space, key, 'set', amount)
    await update(space, key, counter)
    return counter
}

async function lock(user, space, key) {
    space = space || 'default'
    await keyModel.lock(user, 'counter', `${space}/${key}`)
    let counter = await get(user, space, key)
    if (user) {
        counter.owner = user
        await update(space, key, counter)
    }
    return counter
}
async function unlock(user, space, key) {
    space = space || 'default'
    await keyModel.unlock(user, 'counter', `${space}/${key}`)
    let counter = await get(user, space, key)
    delete counter.owner
    await update(space, key, counter)
    return counter
}
async function setlock(user, space, key, amount) {
    await lock(user, space, key)
    await set(user, space, key, amount)
}

export {
    names,
    get, all, prefix,
    shift,
    set,
    lock,
    unlock,
    setlock,
};