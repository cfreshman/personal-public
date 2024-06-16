import { ObjectId } from 'mongodb';
import * as util from '../../util';
import db from '../../db';
import { entryMap, pick } from '../../util';
import { randAlphanum } from '../../rand';

const names = {
    ly: 'ly',
        // user: string
        // hash: string
        // isPublic: boolean
        // links: string[]
}
const C = entryMap(names, name => () => db.collection(name));

async function _get(hash) {
    // find longest prefix
    // NVM e.g. hash = abcd , hashes = { a ab bcd abcdef } , return abcdef
    // e.g. hash = abcd , hashes = { a ab bcd } , return ab
    // method: query with regex ^abc then ^a(b(c)?)$
    // console.log(`^${hash}`)
    let ly = false
    try {
        ly = await C.ly().findOne({ hash: { $regex: new RegExp(`^${hash}$`) } })
        if (!ly) {
            const regex = new RegExp(
                `^${Array.from(hash).reduceRight((right, curr) => `${curr}(${right})?`)}$`)
            ly = await C.ly().findOne({ hash: { $regex: regex } })
        }
    } catch {
        // couldn't form valid regex
        ly = await C.ly().findOne({ hash })
    }
    return ly
}
async function _update(user, hash, props) {
    if (user !== 'cyrus') throw `you aren't cyrus, sorry :/`
    if (props.hash && hash !== props.hash) throw `${props.hash} can't update /ly/${hash}`

    let ly = (await C.ly().findOne({hash})) || { user, hash }
    if (ly.user && ly.user !== user) throw `/ly/${hash} already exists`

    ly.user = user
    Object.assign(ly, props)
    C.ly().updateOne({ hash }, { $set: ly }, { upsert: true })
    return ly;
}

async function getUser(user) {
    let list = await C.ly().find({ user }).toArray()
    return { list }
}
async function get(user, hash) {
    let ly = await _get(hash)
    // console.debug(hash, ly)
    // if (ly && !ly.isPublic && ly.user !== user)
    //     throw `/ly/${hash} is private`
    return { ly }
}
async function create(user, params) {
    let hash = params.hash || randAlphanum(7)
    let existing = await _get(hash)
    if (existing) throw `/ly/${hash} already exists`
    return {
        ly: await _update(user, hash, params)
    }
}
async function update(user, hash, params) {
    console.debug('[LY:UPDATE]', user, hash, params)
    return {
        ly: await _update(user, hash, pick(params, 'links isPublic domain'))
    }
}
async function remove(user, hash) {
    return {
        ly: await _update(user, hash, { user: undefined, hash: undefined, _hash: hash })
    }
}

export {
    names,
    getUser,
    get,
    create,
    update,
    remove,
};