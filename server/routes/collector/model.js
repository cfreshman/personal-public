import db from '../../db'
import { list, named_log, randAlphanum, remove } from '../../util'

const name = 'collector'
const log = named_log(name)
const C = db.of({
    profile: 'collector_profile',
        // user: string-user
        // lists: { string-id:string }
    lists: 'collector_lists'
        // id: string-id
        // user: string-user
        // name: string,
        // links: string[],
        // t: number
})

async function profile(viewer) {
    log('[profile]', {viewer})
    let profile = await C.profile().findOne({ user:viewer })
    if (!profile || Array.isArray(profile.lists)) {
        profile = {
            user: viewer,
            lists: {},
        }
        await C.profile().updateOne({ user:viewer }, { $set:profile }, { upsert:true })
    }
    return { profile }
}

async function get(viewer, id) {
    log('[get]', {viewer, id})
    let item = await C.lists().findOne({ user:viewer, id })
    return { item }
}

async function get_list(viewer) {
    let { profile:_profile } = await profile(viewer)
    return {
        list: await C.lists().find({ id:{ $in:Object.keys(_profile.lists) } })
    }
}

async function edit(viewer, { item }) {
    log('[edit]', {viewer, item})

    // reject if required info not complete
    if (list('user name').some(key => !item[key])) {
        throw `missing required field`
    }

    if (viewer !== item.user) {
        throw `owned by other user`
    }

    item = {
        ...item,
        t: item.t || Date.now(),
        links: item.links || [],
    }
    if (!item.id) {
        do {
            item.id = randAlphanum(6)
        } while (await C.lists().findOne({ id:item.id }))
    }
    delete item._id
    await C.lists().updateOne({ id:item.id }, { $set:item }, { upsert:true })

    const profile = await C.profile().findOne({ user:viewer })
    if (profile.lists[item.id] !== item.name) {
        profile.lists[item.id] = item.name
        await C.profile().updateOne({ user:viewer }, { $set:profile })
    }

    return {
        item: await db.item(C.lists, { id:item.id }),
        profile,
    }
}

async function del(viewer, user, id) {
    log('[del]', {viewer, user, id})
    if (user !== viewer) {
        throw `not the submitter`
    }
    
    // await C.lists().deleteOne({ user, id })
    
    const profile = await C.profile().findOne({ user:viewer })
    log('del', profile, id)
    if (profile.lists[id]) {
        delete profile.lists[id]
        await C.profile().updateOne({ user:viewer }, { $set:profile })
    }

    return {
        success: true,
    }
}

export {
    name, C,
    profile,
    get,
    get_list,
    edit,
    del,
}
