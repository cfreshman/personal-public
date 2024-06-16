const { ObjectID } = require('mongodb');
const util = require('../../util');
const db = require('../../db');
const { entryMap } = require('../../util');
const { randAlphanum } = require('../../rand');

const names = {
    box: 'box',
        // user: string
        // hash: string
        // public: boolean
        // value: string
}
const C = entryMap(names, name => () => db.collection(name));

async function _get(hash) {
    return await C.box().findOne({ hash })
}
async function _getOrDefault(user, hash) {
    return await _get(hash) ?? { user, hash, public: false, rule: 'college', value: '' }
}
async function _update(user, hash, props) {
    // if (user !== 'cyrus') throw `you aren't cyrus, sorry :/`
    if (props.hash && hash !== props.hash) throw `${props.hash} can't update /box/${hash}`

    const box = _getOrDefault(user, hash)
    if (box.user && box.user !== user) throw `/box/${hash} already exists`

    box.user = user
    Object.assign(box, props)
    C.box().updateOne({ hash }, { $set: box }, { upsert: true })
    return box;
}

async function all(user) {
    let list = []
    if (user) {
        list = list.concat(await C.box().find({ user }).toArray() ?? [])
    }
    list = list.concat(await C.box().find({ public: true }).toArray() ?? [])

    const returned = new Set()
    list = list.filter(item => {
        if (returned.has(item.hash)) return false
        returned.add(item.hash)
        return true
    })

    return { list: list }
}
async function get(user, hash) {
    let box = await _getOrDefault(user, hash)
    if (box && !box.public && box.user !== user)
        throw `/box/${hash} is private`
    return { box }
}
async function create(user, params) {
    let hash = params.hash || randAlphanum(7)
    let existing = await _get(hash)
    if (existing) throw `/box/${hash} already exists`
    return {
        box: await _update(user, hash, params)
    }
}
async function update(user, hash, params) {
    let { value, public, rule } = params
    return {
        box: await _update(user, hash, {
            value,
            public,
            rule,
        })
    }
}
async function remove(user, hash) {
    return {
        box: await _update(user, hash, { user: undefined })
    }
}

module.exports = {
    names,
    all,
    get,
    create,
    update,
    remove,
}