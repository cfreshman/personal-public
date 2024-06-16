import db from '../../db'
import io from '../../io'
import { list, named_log, randAlphanum, remove } from '../../util'

const name = 'rent-splitter'
const log = named_log(name)
const C = db.of({
    profile: 'rs_profile',
        // user: string-user
        // splits: { string-id:string }
    splits: 'rs_splits'
        // id: string-id
        // t: number
        // user: string-user
        // name: string
        
        // code: string
        // token: string

        // rooms: number[]
        // round: number
        // choices: { string-user:number[] }
        // complete: boolean
})

async function profile(viewer) {
    log('[profile]', {viewer})
    let profile = await C.profile().findOne({ user:viewer })
    if (!profile) {
        profile = {
            user: viewer,
            splits: {},
        }
        await C.profile().updateOne({ user:viewer }, { $set:profile }, { upsert:true })
    }
    return { profile }
}

async function get(id) {
    log('[get]', {id})
    let item = await C.splits().findOne({ id })
    return { item }
}

async function join({ code, name }) {
    log('[join]', {code, name})
    code = code.toUpperCase()
    let item = await C.splits().findOne({ code })
    
    if (item) {
        // add name to choices if not there
        if (!item.choices[name]) {
            item.choices[name] = []
        }
        await C.splits().updateOne({ id:item.id }, { $set:item })
        io.inst().to('rent-splitter').emit('rent-splitter:update', item.id)
    }

    return { item }
}

async function edit(viewer_or_token, { item }) {
    log('[edit]', {viewer_or_token, item})

    // reject if required info not complete
    if (list('user name rent roommates code').some(key => !item[key])) {
        throw `missing required field`
    }

    const { item:existing } = await get(item.id)
    if (existing && viewer_or_token !== existing.user && viewer_or_token !== existing.token) {
        throw `unauthorized`
    }

    if (!item.id) {
        do {
            item.id = randAlphanum(6)
        } while (await C.splits().findOne({ id:item.id }))
    }
    if (!item.avg) {
        // calculate avg rent, rounded up to 10
        item.avg = Math.ceil(item.rent / item.roommates / 10) * 10
    }
    if (!item.rooms) {
        item.rooms = Array.from({ length:item.roommates }).map(() => item.avg)
    }
    item = {
        ...item,
        t: item.t || Date.now(),
        token: item.token || randAlphanum(16),
        round: item.round || 0,
        choices: item.choices || {},
    }

    // move to round?
    // or complete?
    const { round, choices } = item
    const last_choices = [...Object.values(choices)].map(list => list[round])
    if (last_choices.length && last_choices.every(x => x !== undefined)) {
        const choice_set = new Set(last_choices)
        if (choice_set.size === last_choices.length) {
            item.complete = true
        } else {
            // adjust rents
            const RENT_ADJUST = 20
            item.rooms = item.rooms.map(x => x - RENT_ADJUST)
            last_choices.map(i => item.rooms[i] += RENT_ADJUST)
            item.round += 1
        }
    }

    delete item._id
    await C.splits().updateOne({ id:item.id }, { $set:item }, { upsert:true })
    io.inst().to('rent-splitter').emit('rent-splitter:update', item.id)

    if (viewer_or_token === item.user) {
        const viewer = viewer_or_token
        const profile = await C.profile().findOne({ user:viewer })
        if (profile.splits[item.id] !== item.name) {
            profile.splits[item.id] = item.name
            await C.profile().updateOne({ user:viewer }, { $set:profile })
        }
    }

    return {
        item: await db.item(C.splits, { id:item.id }),
        profile,
    }
}

async function del(viewer, id) {
    log('[del]', {viewer, id})
    
    // await C.splits().deleteOne({ user, id })
    
    const profile = await C.profile().findOne({ user:viewer })
    log('del', profile, id)
    if (profile.splits[id]) {
        delete profile.splits[id]
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
    join,
    edit,
    del,
}
