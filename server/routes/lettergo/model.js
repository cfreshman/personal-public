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

const names = {
    game_profile: 'lettergo_profile',
        // user: string-user
        // t: number
        // ids: string-id[]
        // stats: { longest_word:string, letters_played:number, words_played:number, games_played:string, longest_game:number }
        // challenge: string-id
        // challenge_on: boolean
        //
        // DEPRECATED
        // color: string-hex
        // icon: string
    game_info: 'lettergo_info',
        // id: string-id
        // info state
        // multipress: boolean
    game_state: 'lettergo_state',
        // id: string-id
        // game state
    game_invite: 'lettergo_invite',
        // id: string-id
        // user: string
        // n_users: number
    game_spectate: 'lettergo_spectate'
        // id: string-id
        // users: string-user[]
}
const C = entryMap(names, name => () => db.collection(name))

db.queueInit(async () => {
    const day_ms = 24 * 60 * 60 * 1_000
    const daily_stats = async () => {
        const active_info_n = await C.game_info().count({
            last_t: { '$gte': Date.now() - day_ms * 7 },
            status: -1,
        })
        console.debug('lettergo daily stats', {active_info_n})
        await M_counter.setlock('site', 'lettergo', 'active', active_info_n)
    }
    daily_stats()
    setTimeout(daily_stats, day_ms)
}, 5_000)

const chat_id = (info) => `lettergo:${info.id}`
export const user_ids = (info) => 'p2' in info ? [info.p0, info.p1, info.p2] : [info.p0, info.p1]
export const user_id_range = (info) => range(user_ids(info).length)
export const user_ids_to_map = (ids) => Object.fromEntries(ids.map((id, i) => [`p${i}`, id]))
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
    const game_profile = await C.game_profile().findOne({ user }) || empty_profile(user)
    const profile_profile = await M_profile._get(user)
    if (profile_profile?.color || profile_profile?.emoji) {
        game_profile.color = profile_profile.color
        game_profile.icon = profile_profile.emoji
    }
    return game_profile
}
async function _info(id) {
    return await C.game_info().findOne({ id })
}
async function _state(id) {
    return await C.game_state().findOne({ id })
}
async function _spectate(id, viewer=undefined) {
    const spectates = await C.game_spectate().findOne({ id }) || {
        id,
        users: [],
    }
    if (viewer && !spectates.users.includes(viewer)) {
        spectates.users.push(viewer)
        await C.game_spectate().updateOne({ id }, { $set:spectates }, { upsert:true })
    }
    return spectates
}
async function _spectators(id) {
    const spectate = await _spectate(id)
    return spectate.users
}

async function profile(viewer, user) {
    console.debug('[lettergo:profile] get', {viewer,user})
    const user_empty_profile = empty_profile(user)
    const stored_profile = await _profile(user)
    const profile = {
        ...user_empty_profile,
        ...stored_profile,
    }
    profile.stats = profile.stats || user_empty_profile.stats
    profile.stats.active_games = (await M_counter.get('site', 'lettergo', 'active', true)).value
    profile.stats.global_letters = (await M_counter.get('site', 'lettergo', 'letters', true)).value
    // console.debug('get stats', profile.stats)
    if (viewer !== user) {
        delete profile.ids
    } else {
        await C.game_profile().updateOne({ user:viewer }, { $set:profile }, { upsert:true })
    }
    return { profile }
}
async function profile_set(viewer, data) {
    console.debug('[lettergo:set_profile]', {viewer,data})
    const { color, icon } = data
    let profile = await _profile(viewer)
    profile = {
        ...profile,
        color,
        icon,
    }
    await C.game_profile().updateOne({ user:viewer }, { $set:profile }, { upsert:true })
    return { profile }
}

async function infos(viewer) {
    console.debug('[lettergo:infos] get', {viewer})

    const { ids } = await _profile(viewer)
    const list = Array.from(await C.game_info().find({ id: { $in:ids }}).toArray())
    return { list }
}
async function game_info(viewer, id) {
    const info = await _info(id)
    // await authorized(viewer, [info.p0, info.p1])
    return {
        info,
    }
}
async function game(viewer, id) {
    const info = await _info(id)
    // await authorized(viewer, [info.p0, info.p1])
    if (viewer && info.status > -1) await _spectate(id, viewer)
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
        const invite = await C.game_invite().findOne({ user:{$ne:viewer}, n_users:raw_users.length })
        if (invite) {
            await C.game_invite().deleteOne({ id:invite.id })
            return await game_join(viewer, invite.id)
        }
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
        status: -1,
        tries: 0,
        words: [],
        public: is_public,
        multipress: users.length > 2,
    }
    await authorized(viewer, users)
    const state = {
        id,
        tiles,
        deltas,
    }

    const unique_users = unique_ids(users)
    await chat.newChat(unique_users, chat_id(info))
    info.chat = true

    await C.game_info().updateOne({ id }, { $set:info }, { upsert:true })
    await C.game_state().updateOne({ id }, { $set:state }, { upsert:true })

    await Promise.all(unique_users.map(async user => {
        const profile = await _profile(user)
        profile.ids.push(id)
        await C.game_profile().updateOne({ user }, { $set:profile }, { upsert:true })
    }))
    
    const unique_others = unique_users.filter(x => x && x !== viewer)
    notify.send(unique_others, 'lettergo', `${viewer} started a new lettergo game`, `freshman.dev/lettergo/${id}`)
    io.send(unique_others, 'message', {
        text: `${viewer} started a new lettergo game: /lettergo/${id}`,
        ms: 5_000,
        id: 'lettergo-new', delete: 'lettergo-new',
        to: `/lettergo/${id}`,
    })
    unique_others.map(other => siteChat(other, `${viewer} started a new lettergo game: /lettergo/${id}`))

    // if a raw user was 'public', add to invites
    if (is_public) {
        await C.game_invite().updateOne({ id }, { $set: { id, user:viewer, n_users:raw_users.length } }, { upsert: true })
    }

    return { profile, info, state }
}

async function game_turn(viewer, id, data) {
    const { info:proto_info, state:proto_state } = data
    const { id:info_id, turn, owner, turns, status, tries, words } = proto_info
    const { id:state_id, tiles, deltas } = proto_state
    if (id !== info_id || id !== state_id) throw 'mismatched game id'

    const saved_info = await _info(id)
    if (saved_info.status > -1) throw 'game is already finished'
    if (saved_info.turn >= turn) throw 'invalid turn number'

    const users = user_ids(saved_info)
    const info = {
        ...saved_info,
        id,
        ...user_ids_to_map(users),
        turn, owner,
        last_t: Date.now(),
        turns,
        status,
        tries,
        words,
    }
    await authorized(viewer, users)
    const word = info.turns.at(-1).word
    const state = {
        id,
        tiles,
        deltas,
    }

    const unique_users = unique_ids(users)
    if (!info.chat) {
        try {
            await chat.newChat(unique_users, chat_id(info))
        } catch (e) {
            console.error(e)
        }
        info.chat = true
    }

    await C.game_info().updateOne({ id }, { $set:info }, { upsert:true })
    await C.game_state().updateOne({ id }, { $set:state }, { upsert:true })

    const unique_others = unique_users.filter(x => x && x !== viewer)
    const gameover = info.status > -1
    const action = word ? `${gameover ? 'won with' : 'played'} ${word.toUpperCase()}` : gameover ? 'resigned' : 'skipped'
    const next_user = info[`p${info.owner}`]
    notify.send(gameover ? unique_others : [next_user], 'lettergo', `${viewer} ${action} in lettergo`, `freshman.dev/lettergo/${id}`)
    io.send(unique_others, 'message', {
        text: `${viewer} ${action} in lettergo: /lettergo/${id}`,
        ms: 5_000,
        id: 'lettergo-turn', delete: 'lettergo-turn',
        to: `/lettergo/${id}`,
    })
    if (gameover) unique_others.map(other => siteChat(other, `${viewer} ${action} in lettergo: /lettergo/${id}`))

    // update stats (& add game if missing)
    unique_ids(users).map(async (user, i) => {
        const profile = (await _profile(user)) || empty_profile(user)
        const { stats } = profile
        console.debug('update stats', stats)

        if (!info.multipress) {
            if (info.owner !== i) {
                if (!stats.longest_word || word.length > stats.longest_word.length) {
                    stats.longest_word = word
                }
                stats.words_played = (stats.words_played || 0) + 1
                stats.letters_played = (stats.letters_played || 0) + word.length
    
                let {value:total_letters} = await M_counter.get('site', 'lettergo', 'letters', true)
                total_letters += word.length
                await M_counter.setlock('site', 'lettergo', 'letters', total_letters)
            }
    
            if (gameover) {
                stats.games_played = (stats.games_played || 0) + 1
                if (!stats.longest_game || info.turn > stats.longest_game) {
                    stats.longest_game = info.turn
                }
            }
        }

        if (!profile.ids.includes(info.id)) {
            profile.ids.push(info.id)
        }

        await C.game_profile().updateOne({ user }, { $set:profile }, { upsert:true })
    })

    await chat.sendChat(viewer, chat_id(info), [{
        text: word || 'SKIP',
        meta: {
            silent: true,
            classes: `lettergo-word ${word?'':'lettergo-skip'} p${saved_info.owner}`,
            dedupe: info.turn,
        }
    }])
    io.send(unique_ids([...unique_users, ...(await _spectators(id))]), 'lettergo:update', id)
    if (gameover) await C.game_spectate().deleteOne({ id })

    return { info, state }
}

async function game_react(viewer, id, body) {
    const info = await _info(id)
    const users = user_ids(info)
    await authorized(viewer, users)

    const last_turn = info.turns.at(-1)
    const { reaction } = body
    if (!last_turn || viewer !== info[`p${last_turn.owner}`] || !reaction) throw 'unable to react'

    last_turn.reaction = reaction
    await C.game_info().updateOne({ id }, { $set:info }, { upsert:true })
    io.send(unique_ids([...users, ...(await _spectators(id))]), 'lettergo:update', id)
    
    return {
        info,
    }
}

async function game_join(viewer, id) {
    if (!viewer) throw 'unauthorized'
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

    await C.game_info().updateOne({ id }, { $set:info }, { upsert:true })

    await Promise.all([viewer].map(async user => {
        const profile = await _profile(user)
        profile.ids.push(id)
        await C.game_profile().updateOne({ user }, { $set:profile }, { upsert:true })
    }))
    
    const unique_others = unique_ids(users).filter(x => x !== viewer)
    notify.send(unique_others, 'lettergo', `${viewer} joined your lettergo game`, `freshman.dev/lettergo/${id}`)
    io.send(unique_others, 'message', {
        text: `${viewer} joined your lettergo game: /lettergo/${id}`,
        ms: 5_000,
        id: 'lettergo-joined', delete: 'lettergo-joined',
        to: `/lettergo/${id}`,
    })
    unique_others.map(other => siteChat(other, `${viewer} joined your lettergo game: /lettergo/${id}`))
    io.send(unique_ids([...unique_others, ...(await _spectators(id))]), 'lettergo:update', id)

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
    if (range(2).some(i => !users[i] || users[i] !== rematch_users[i] )) throw 'invalid rematch'
    
    info.rematch = rematch
    info.thread = info.thread || {
        id: info.id,
        index: 0,
    }
    await C.game_info().updateOne({ id }, { $set:info }, { upsert:true })

    rematch_info.previous = info.id
    rematch_info.thread = {
        ...info.thread,
        index: info.thread.index + 1,
    }
    await C.game_info().updateOne({ id:rematch }, { $set:rematch_info }, { upsert:true })

    await Promise.all(users.map(async user => {
        const profile = await _profile(user)
        if (profile.stats) {
            profile.stats.longest_feud = Math.max(profile.stats.longest_feud, rematch_info.thread.index + 1)
            await C.game_profile().updateOne({ user }, { $set:profile }, { upsert:true })
        }
    }))
    
    return {
        info,
        rematch_info,
    }
}

async function pair_stats(viewer, user_1, user_2) {
    console.debug('[lettergo:pair_stats] get', {viewer, user_1, user_2})
    await authorized(viewer, [user_1, user_2])
    const profile_1 = await _profile(user_1)
    const profile_2 = await _profile(user_2)

    const ids_1_set = new Set(profile_1.ids)
    const common_ids = profile_2.ids.filter(id => ids_1_set.has(id))
    const common_infos = Array.from(await C.game_info().find({ id:{$in:common_ids}}).toArray())

    const stats = {}
    stats.total = common_ids.length
    stats.completed = common_infos.filter(x => x.status > -1).length
    stats.win = common_infos.filter(x => x.status === user_ids(x).indexOf(viewer)).length

    return { stats }
}

async function set_challenge_hash(viewer, { on=undefined, randomize=undefined }={}) {
    const { challenge=undefined, challenge_on=false } = await _profile(viewer)
    let new_challenge = challenge
    let new_challenge_on = challenge_on
    if (on !== undefined || randomize !== undefined) {
        if (on !== undefined) {
            new_challenge_on = !!on
            await C.game_profile().updateOne({ user:viewer }, { $set: { challenge_on:new_challenge_on } })
        }
        if (randomize !== undefined) {
            if (randomize) {
                do {
                    new_challenge = randAlphanum(8)
                } while (await C.game_profile().findOne({ challenge:new_challenge }) || await M_profile._get(new_challenge))
            } else {
                new_challenge = undefined
            }
            await C.game_profile().updateOne({ user:viewer }, { $set: { challenge:new_challenge } })
        }
        console.info('[lettergo:challenge_hash]', {challenge,challenge_on}, '->', {new_challenge,new_challenge_on})
    }
    return { challenge:new_challenge, challenge_on:new_challenge_on }
}
async function get_challenge_user(viewer, id) {
    let { user, challenge_on } = 
        await C.game_profile().findOne({ challenge:id, challenge_on:true })
        || (await C.game_profile().findOne({ user:id, challenge:undefined, challenge_on:true }) || await C.game_profile().findOne({ user:id, challenge:{$exists:false}, challenge_on:true }))
        || {}

    if (!user || !challenge_on) return { user:undefined, id:undefined }
    
    // find existing match
    const existing = await C.game_info().findOne({ p0:{$in:[viewer, user]}, p1:{$in:[user, viewer]} })
    return { user, id:existing?.id }
}

export {
    names, C,
    _profile, _info, _state,
    profile, profile_set,
    infos, game_info,
    game,
    game_new,
    game_turn, game_react,
    game_join,
    game_rematch,
    pair_stats,
    set_challenge_hash, get_challenge_user,
}