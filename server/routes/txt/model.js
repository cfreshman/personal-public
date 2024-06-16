import db from '../../db';
import { randAlphanum } from '../../rand';
import { entryMap, pick } from '../../util';

const names = {
    txt: 'txt',
        // user: string
        // hash: string
        // rule: ['narrow', 'college', 'wide']
        // value: string
        // public?: boolean
        // hidden?: boolean
}
const C = entryMap(names, name => () => db.collection(name));

async function _get(hash) {
    return await C.txt().findOne({ hash },{_id:0})
}
async function _getOrDefault(user, hash) {
    return (await _get(hash)) ?? { user, hash, rule: 'college', value: '' };
}
async function _update(user, hash, props) {
    if (props.hash && hash !== props.hash) throw `${props.hash} can't update /txt/${hash}`

    const txt = _getOrDefault(user, hash)
    if (txt.user && txt.user !== user) throw `/txt/${hash} already exists`

    txt.user = user
    txt.t = txt.t || Date.now()
    Object.assign(txt, props)
    C.txt().updateOne({ hash }, { $set: txt }, { upsert: true })
    return txt;
}

async function all(user) {
    let list = []
    if (user) {
        list = list.concat((await C.txt().find({
            user, // public:{$ne:true}, hidden:{$ne:true} // nvm keep public & hidden in user's view
        }).project({_id:0}).toArray()) ?? [])
    }
    list = list.concat((await C.txt().find({
        public: true, hidden:{$ne:true}
    }).project({_id:0}).toArray()) ?? [])

    const returned = new Set()
    list = list.filter(item => {
        if (returned.has(item.hash)) return false
        returned.add(item.hash)
        return true
    })

    return { list: list }
}

const decode = str => str && decodeURIComponent(str.replaceAll('+', ' '))
async function get(user, hash) {
    hash = decode(hash)
    let txt = await _getOrDefault(user, hash)
    if (txt && !txt.public && !txt.hidden && txt.user !== user) throw `/txt/${hash} is private`
    return { txt }
}
async function create(user, params) {
    let hash = params.hash || randAlphanum(7)
    let existing = await _get(hash)
    if (existing) throw `/txt/${hash} already exists`
    return {
        txt: await _update(user, hash, params)
    }
}
async function update(user, hash, params) {
    hash = decode(hash)
    return {
        txt: await _update(user, hash, pick(params, 'value public hidden rule'))
    }
}
async function remove(user, hash) {
    hash = decode(hash)
    return {
        txt: await _update(user, hash, { user: undefined })
    }
}

export {
    names,
    all,
    get,
    create,
    update,
    remove,
}