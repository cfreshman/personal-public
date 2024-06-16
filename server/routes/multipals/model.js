import db from '../../db'
import io from '../../io'
import { P, entryMap, fetch, range, remove as removeArr, truthy } from '../../util'
import { randAlphanum } from '../../rand'
import file from '../file'
import notify from '../notify'
import { url_for_data_url } from '../integrations'
import * as M_profile from '../profile/model'
import { siteChat } from '../chat/model'
import * as M_counter from '../counter/model'
import chat from '../chat'
import * as M_capitals from '../capitals/model'

const names = {
    multipals_profile: 'multipals_profile',
        // migrated: boolean
        // user: string
        // t: string
        // ids: string-id[]
        // color: string
        // icon: string
        // stats: { longest_word:string, letters_played:number, words_played:number, games_played:string, longest_game:number }
    multipals_info: 'multipals_info',
        // id: string
        // info state
    multipals_state: 'multipals_state',
        // id: string
        // game state
    multipals_invite: 'multipals_invite',
        // id: string
        // user: string
        // n_users: number
}
const C = entryMap(names, name => () => db.collection(name))

db.queueInit(async () => {
    const profiles = Array.from(await C.multipals_profile().find({}).toArray())
    const ids_to_migrate = new Set()
    profiles.map(async profile => {
        if (profile.migrated) return

        profile.ids.map(id => ids_to_migrate.add(id))
        const capitals_profile = await M_capitals.C.game_profile().findOne({ user:profile.user })
        if (capitals_profile) {
            capitals_profile.ids.push(...profile.ids)
            await M_capitals.C.game_profile().updateOne({ user:profile.user }, { $set:capitals_profile })
        } else {
            await M_capitals.C.game_profile().updateOne({ user:profile.user }, { $set:profile }, { upsert:true })
        }
        await C.multipals_profile().updateOne({ user:profile.user }, { $set:{migrated:true} })
    })
    Array.from(ids_to_migrate).map(async id => {
        const info = await _info(id)
        const state = await _state(id)

        if (!info || !state) return
        
        await M_capitals.C.game_info().insertOne(info)
        await M_capitals.C.game_state().insertOne(state)

        await C.multipals_info().deleteOne({ id })
        await C.multipals_state().deleteOne({ id })
    })
    Array.from(await C.multipals_invite().find({}).toArray()).map(async invite => {
        await M_capitals.C.game_invite().insertOne(invite)
        await C.multipals_invite().deleteOne({ id:invite.id })
    })
    // const day_ms = 24 * 60 * 60 * 1_000
    // const daily_stats = async () => {
    //     const active_info_n = await C.multipals_info().count({
    //         last_t: { '$gte': Date.now() - day_ms * 7 },
    //         status: -1,
    //     })
    //     console.debug('multipals daily stats', {active_info_n})
    //     await M_counter.setlock('site', 'multipals', 'active', active_info_n)
    // }
    // daily_stats()
    // setTimeout(daily_stats, day_ms)
}, 5_000)

const chat_id = (info) => `multipals:${info.id}`
const user_ids = (info) => ('p5' in info) ? [info.p0, info.p1, info.p2, info.p3, info.p4, info.p5] : [info.p0, info.p1, info.p2]
const user_ids_to_map = (ids) => ids.length === 6 ? ({p0:ids[0],p1:ids[1],p2:ids[2],p3:ids[3],p4:ids[4],p5:ids[5]}) : ({p0:ids[0],p1:ids[1],p2:ids[2]})
const unique_ids = (ids) => Array.from(new Set(ids))

const authorized = async (viewer, users) => {
    const reject = () => {throw 'unauthorized'}
    if (!viewer) reject()
    if (users.some(x => !x) || users.includes(viewer) || viewer === 'site') return
    reject()
    // // authorized if any user follows viewer
    // const profile = await M_profile._get(viewer)
    // const follower_set = new Set(profile?.followers || [])
    // if (!users.some(x => follower_set.has(x))) reject()
}

const empty_profile = (user) => ({
    user,
    t: Date.now(),
    ids: [],
    // color: user === 'top' ? '#f44' : '#44f',
    // icon: user === 'top' ? '🐱' : '🐶',
    stats: {
        longest_word: '',
        total_letters: 0,
        total_words: 0,
        games_played: 0,
        longest_game: 0,
    },
})
async function _profile(user) {
    const game_profile = await C.multipals_profile().findOne({ user }) || empty_profile(user)
    const profile_profile = await M_profile._get(user)
    // console.debug({game_profile,profile_profile})
    if (profile_profile?.color || profile_profile?.emoji) {
        game_profile.color = profile_profile.color
        game_profile.icon = profile_profile.emoji
    }
    return game_profile
}
async function _info(id) {
    return await C.multipals_info().findOne({ id })
}
async function _state(id) {
    return await C.multipals_state().findOne({ id })
}

async function profile(viewer, user) {
    console.debug('[multipals] get profile', {viewer,user})
    const user_empty_profile = empty_profile(user)
    const stored_profile = await _profile(user)
    const profile = {
        ...user_empty_profile,
        ...stored_profile,
    }
    profile.stats = profile.stats || user_empty_profile.stats
    profile.stats.active_games = (await M_counter.get('site', 'multipals', 'active', true)).value
    profile.stats.global_letters = (await M_counter.get('site', 'multipals', 'letters', true)).value
    // console.debug('get stats', profile.stats)
    if (viewer !== user) {
        delete profile.ids
    } else {
        await C.multipals_profile().updateOne({ user:viewer }, { $set:profile }, { upsert:true })
    }
    return { profile }
}
async function profile_set(viewer, data) {
    console.debug('[multipals] set profile', {viewer,data})
    const { color, icon } = data
    let profile = await _profile(viewer)
    profile = {
        ...profile,
        color,
        icon,
    }
    await C.multipals_profile().updateOne({ user:viewer }, { $set:profile }, { upsert:true })
    return { profile }
}

async function infos(viewer) {
    console.debug('[multipals] get infos', {viewer})

    const { ids } = await _profile(viewer)
    const list = Array.from(await C.multipals_info().find({ id: { $in:ids }}).toArray())
    return { list }
}
async function game_info(viewer, id) {
    const info = await _info(id)
    // await authorized(viewer, user_ids(info))
    return {
        info,
    }
}
async function game(viewer, id) {
    const info = await _info(id)
    // await authorized(viewer, user_ids(info))
    return {
        info,
        state: await _state(id),
    }
}

async function game_new(viewer, data) {
    const { info:proto_info, state:proto_state } = data
    const { tiles, deltas } = proto_state

    const raw_users = user_ids(proto_info)
    const is_public = raw_users.includes('public')
    if (is_public) {
        // try to join invite instead
        let invite, tries = 0
        do {
            invite = await C.multipals_invite().findOne({ n_users:raw_users.length })
            console.debug({invite})
            const delete_invite = async () => await C.multipals_invite().deleteOne({ id:invite.id })
            if (invite) {
                try {
                    const result = await game_join(viewer, invite.id)
                    if (user_ids(result.info).every(x=>x)) await delete_invite()
                    return result
                } catch (e) {
                    console.error(e)
                    await delete_invite()
                }
            }
            tries += 1
        } while (invite && tries < 3)
    }
    const users = raw_users.map(x => x && !['invite', 'public'].includes(x) ? x : undefined)

    let id
    do {
        id = randAlphanum(8)
    } while (await _info(id))
    const info = {
        id,
        ...user_ids_to_map(users),
        turn: 0, owner: 0,
        start_t: Date.now(), last_t: Date.now(),
        turns: [],
        status: -1, out: {},
        tries: 0,
        words: [],
        public: is_public,
    }
    await authorized(viewer, users)
    const state = {
        id,
        tiles,
        deltas,
    }
    console.debug('[capitals] new game', proto_info, raw_users, users, user_ids_to_map(users), info)

    await chat.newChat(unique_ids(users), chat_id(info))
    info.chat = true

    await C.multipals_info().updateOne({ id }, { $set:info }, { upsert:true })
    await C.multipals_state().updateOne({ id }, { $set:state }, { upsert:true })

    await Promise.all(users.map(async user => {
        const profile = await _profile(user)
        profile.ids.push(id)
        await C.multipals_profile().updateOne({ user }, { $set:profile }, { upsert:true })
    }))
    
    const others = users.filter(x => x && x !== viewer)
    const unique_others = unique_ids(others)
    notify.send(unique_others, 'multipals', `${viewer} started a new multipals game`, `freshman.dev/multipals/${id}`)
    io.send(unique_others, 'message', {
        text: `${viewer} started a new multipals game: /multipals/${id}`,
        ms: 5_000,
        id: 'multipals-new', delete: 'multipals-new',
        to: `/multipals/${id}`,
    })
    unique_others.map(other => siteChat(other, `${viewer} started a new multipals game: /multipals/${id}`))

    // if is_public, add to invites
    if (is_public) {
        await C.multipals_invite().updateOne({ id }, { $set: { id, user:viewer, n_users:raw_users.length } }, { upsert: true })
    }

    return { profile, info, state }
}

async function game_turn(viewer, id, data) {
    const { info:proto_info, state:proto_state } = data
    const { id:info_id, turn, owner, turns, status, tries, words, out } = proto_info
    const { id:state_id, tiles, deltas } = proto_state
    if (id !== info_id || id !== state_id) throw 'mismatched game id'

    const saved_info = await _info(id)
    if (saved_info.turn >= turn) throw 'invalid turn number'

    const info = {
        ...saved_info,
        id,
        ...user_ids_to_map(user_ids(proto_info)),
        turn, owner,
        last_t: Date.now(),
        turns,
        status, out,
        tries,
        words,
    }
    const users = user_ids(info)
    await authorized(viewer, users)
    const word = info.turns.at(-1).word
    const state = {
        id,
        tiles,
        deltas,
    }

    if (!info.chat) {
        try {
            await chat.newChat(unique_ids(users), chat_id(info))
        } catch (e) {
            console.error(e)
        }
        info.chat = true
    }

    await C.multipals_info().updateOne({ id }, { $set:info }, { upsert:true })
    await C.multipals_state().updateOne({ id }, { $set:state }, { upsert:true })

    const unique_users = unique_ids(users) 
    const unique_others = unique_users.filter(x => x && x !== viewer)
    const next_other = users[info.owner]
    const gameover = info.status > -1
    const action = word ? `${gameover ? 'won with' : 'played'} ${word.toUpperCase()}` : gameover ? 'resigned' : 'skipped'
    notify.send(gameover ? unique_others : [next_other], 'multipals', `${viewer} ${action} in multipals`, `freshman.dev/multipals/${id}`)
    io.send(unique_others, 'message', {
        text: `${viewer} ${action} in multipals: /multipals/${id}`,
        ms: 5_000,
        id: 'multipals-turn', delete: 'multipals-turn',
        to: `/multipals/${id}`,
    })
    if (gameover) others.map(other => siteChat(other, `${viewer} ${action} in multipals: /multipals/${id}`))

    // update stats
    users.map(async (user, i) => {
        const stats = (await _profile(user))?.stats || empty_profile(user).stats
        console.debug('update stats', stats)

        if (info.owner !== i) {
            if (!stats.longest_word || word.length > stats.longest_word.length) {
                stats.longest_word = word
            }
            stats.words_played = (stats.words_played || 0) + 1
            stats.letters_played = (stats.letters_played || 0) + word.length

            let {value:total_letters} = await M_counter.get('site', 'multipals', 'letters', true)
            total_letters += word.length
            await M_counter.setlock('site', 'multipals', 'letters', total_letters)
        }

        if (gameover) {
            stats.games_played = (stats.games_played || 0) + 1
            if (!stats.longest_game || info.turn > stats.longest_game) {
                stats.longest_game = info.turn
            }
        }

        await C.multipals_profile().updateOne({ user }, { $set:{stats} }, { upsert:true })
    })

    await chat.sendChat(viewer, chat_id(info), [{
        text: word || 'SKIP',
        meta: {
            silent: true,
            classes: `multipals-word ${word?'':'multipals-skip'} p${saved_info.owner}`,
            dedupe: info.turn,
        }
    }])
    io.send(unique_users, 'multipals:update', id)

    return { info, state }
}

async function game_join(viewer, id) {
    const info = await _info(id)
    const state = await _state(id)

    const users = user_ids(info)
    if (users.every(truthy)) throw 'game is full'
    if (users.find(x => x === viewer)) {
        // already joined
        return { info, state }
    }

    // reverse order to add users from back to front
    let added = false
    Object.assign(info, user_ids_to_map(users.slice().reverse().map(user_id => {
        if (!added && !user_id) {
            added = true
            return viewer
        }
        return user_id
    }).reverse()))

    await C.multipals_info().updateOne({ id }, { $set:info }, { upsert:true })

    await Promise.all([viewer].map(async user => {
        const profile = await _profile(user)
        profile.ids.push(id)
        await C.multipals_profile().updateOne({ user }, { $set:profile }, { upsert:true })
    }))
    
    const others = users.filter(x => x !== viewer)
    const unique_others = unique_ids(others)
    const next_other = users[info.owner]
    notify.send([next_other], 'multipals', `${viewer} joined your multipals game`, `freshman.dev/multipals/${id}`)
    io.send(unique_others, 'message', {
        text: `${viewer} joined your multipals game: /multipals/${id}`,
        ms: 5_000,
        id: 'multipals-joined', delete: 'multipals-joined',
        to: `/multipals/${id}`,
    })
    unique_others.map(other => siteChat(other, `${viewer} joined your multipals game: /multipals/${id}`))
    io.send(unique_others, 'multipals:update', id)

    if (info.chat) await chat.addChat(viewer, chat_id(info))

    return { info, state }
}

async function game_rematch(viewer, id, rematch) {
    const info = await _info(id)
    const users = user_ids(info).sort()
    await authorized(viewer, users)

    const rematch_info = await _info(rematch)
    const rematch_users = user_ids(rematch_info).sort()
    await authorized(viewer, rematch_users)
    
    if (info.rematch || rematch_info.previous) throw 'invalid rematch'
    if (range(4).some(i => !users[i] || users[i] !== rematch_users[i] )) throw 'invalid rematch'
    
    info.rematch = rematch
    info.thread = info.thread || {
        id: info.id,
        index: 0,
    }
    await C.multipals_info().updateOne({ id }, { $set:info }, { upsert:true })

    rematch_info.previous = info.id
    rematch_info.thread = {
        ...info.thread,
        index: info.thread.index + 1,
    }
    await C.multipals_info().updateOne({ id:rematch }, { $set:rematch_info }, { upsert:true })

    await Promise.all(users.map(async user => {
        const profile = await _profile(user)
        if (profile.stats) {
            profile.stats.longest_feud = Math.max(profile.stats.longest_feud, rematch_info.thread.index + 1)
            await C.multipals_profile().updateOne({ user }, { $set:profile }, { upsert:true })
        }
    }))
    
    return {
        info,
        rematch_info,
    }
}

async function pair_stats(viewer, user_1, user_2) {
    console.debug('[multipals] get pair stats', {viewer, user_1, user_2})
    await authorized(viewer, [user_1, user_2])
    const profile_1 = await _profile(user_1)
    const profile_2 = await _profile(user_2)

    const ids_1_set = new Set(profile_1.ids)
    const common_ids = profile_2.ids.filter(id => ids_1_set.has(id))
    const common_infos = Array.from(await C.multipals_info().find({ id:{$in:common_ids}}).toArray())
    // console.debug('[multipals] get pair stats common', common_ids, common_infos.map(x => x.status))

    const stats = {}
    stats.total = common_ids.length
    stats.completed = common_infos.filter(x => x.status > -1).length
    stats.win = common_infos.filter(x => x.status === user_ids(x).indexOf(viewer)).length

    return { stats }
}

export {
    names, C,
    _profile, _info, _state,
    profile, profile_set,
    infos, game_info,
    game,
    game_new,
    game_turn,
    game_join,
    game_rematch,
    pair_stats,
}