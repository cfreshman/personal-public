import db from '../../db'
import { named_log, pick } from '../../util'
import { addChat, newChat } from '../chat/model'
import notify from '../notify'

const name = 'plat'
const log = named_log(name)
const C = db.of({
    profile: 'plat',
        // user: string-user
        // plate: string-state-number
    chats: 'plat_chats',
        // plate: string-state-number
        // chats: string-chat-id[]
})

const fix_ids = (...x) => x.map(x => x.toUpperCase())
const get_chat_id = (...plates) => `plat:${plates.sort().join('&')}`
const clean_profile = (raw_profile) => pick({...raw_profile}, 'user plate')

async function _get(viewer) {
    return clean_profile(await C.profile().findOne({ user:viewer }) || {
        user: viewer,
        plate: undefined,
    })
}
async function get(viewer) {
    const profile = await _get(viewer)
    log('[get]', {viewer, raw_profile:profile})
    if (profile.plate) {
        profile.chats = (await C.chats().findOne({ plate:profile.plate }))?.chats || []
    } else {
        profile.chats = []
    }
    return { profile }
}

async function set(viewer, { plate }) {
    ;[plate] = fix_ids(plate)
    const raw_profile = await _get(viewer)
    log('[set]', {raw_profile, plate})

    const taken = clean_profile(await C.profile().findOne({ plate }))
    if (taken && taken.user !== viewer) {
        log('[set] taken', {taken})
        if (taken.user) {
            // throw 'license plate taken'
            throw `${plate} has already been claimed`
        } else {
            log('[set] taken clear')
            await C.profile().deleteOne({ plate })
        }
    }

    raw_profile.plate = plate
    log('[set] set', raw_profile)
    await C.profile().updateOne({ user:viewer }, { $set: raw_profile }, { upsert:true })
    return await get(viewer)
}

async function _get_chats(plate) {
    return (await C.chats().findOne({ plate })) || {
        plate,
        chats: [],
    }
}
async function open(viewer, { other_plate }) {
    ;[other_plate] = fix_ids(other_plate)
    const raw_profile = await _get(viewer)
    log('[open]', {raw_profile, other_plate})

    if (!raw_profile.plate) throw 'no plate'

    const id = get_chat_id(raw_profile.plate, other_plate)
    let new_chat = false
    await Promise.allSettled([raw_profile.plate, other_plate].map(async plate => {
        const chats = await _get_chats(plate)
        if (!chats.chats.includes(id)) {
            chats.chats.push(id)
            await C.chats().updateOne({ plate }, { $set:chats }, { upsert:true })
            new_chat = true
        }
    }))

    // create chat
    const other = (await C.profile().findOne({ plate:other_plate }))?.user
    log('[open]', {viewer, other, id})
    const users = [viewer, other].filter(x => x)
    try {
        await newChat([], id)
    } catch { /* already exists */ }
    users.map(user => addChat(user, id))
    if (new_chat && other) {
        // siteChat(other, `new plat chat: `)
        notify.send([other], 'plat', `new plat with ${other_plate}`, `freshman.dev/plat/${id.replace('plat:', '')}`)
    }

    return { id }
}
async function count({ plate }) {
    ;[plate] = fix_ids(plate)
    const chats = await _get_chats(plate) || { chats:[] }
    const count = chats.chats.length
    log('[count]', {plate, count})
    return { value:count }
}

export {
    name, C,
    get, set,
    open,
    count,
}
