import db from '../../db'
import { named_log } from '../../util'

const name = 'paste'
const log = named_log(name)
const C = db.of({
    paste: 'paste',
        // id: string-id
        // user: string-id
        // t: number-date
        // title: string
        // text: string
        // ext: string
        // public: boolean
})

async function list(viewer) {
    log('list', {viewer})
    const list = Array.from(await C.paste().find({ user:viewer }).toArray())
    return { list }
}

async function get(viewer, id) {
    log('get', {viewer, id})
    const item = await C.paste().findOne({ id })
    const not_found = !item
    const not_allowed = !not_found && !item.public && item.user !== viewer
    if (not_found || not_allowed) throw 'not found'
    return { item }
}

async function create(viewer) {
    log('create', {viewer})
    const item = { user:viewer }
    do {
        item.id = rand.alphanum(8)
    } while (await C.paste().findOne({ id: item.id }))
    await C.paste().insertOne(item)
    return { item }
}

async function set(viewer, data) {
    log('set', {viewer, id:data.id})
    const item = await C.paste().findOne({ id: data.id })
    const not_found = !item
    const not_allowed = !not_found && item.user !== viewer
    if (not_found || not_allowed) throw 'not found'
    
    // only allow initial set for anonymous pastes
    if (!viewer && item.text) throw 'already set anonymous paste'

    Object.assign(item, pick(data, 'title text ext public'))
    await C.paste().updateOne({ id: data.id }, { $set: item })
    delete item._id
    return { item }
}

async function del(viewer, id) {
    log('del', {viewer, id})
    const item = await C.paste().findOne({ id })
    const not_found = !item
    const not_allowed = !not_found && item.user !== viewer
    if (not_found || not_allowed) throw 'not found'
    await C.paste().deleteOne({ id })
    return { success:true }
}

export {
    name, C,
    list,
    get,
    create,
    set,
    del,
}
