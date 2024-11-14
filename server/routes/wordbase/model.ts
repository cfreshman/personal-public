import { group, range, truthy } from "../../util";

import chat from '../chat';
import { lock, set, setlock } from '../counter/model';
import db from '../../db';
import {clearUrl, respondWithTwitterCard, urlForDataUrl} from '../integrations';
import ioM from '../../io';
import { send } from '../mail';
import notify from '../notify';
import profile from '../profile';
import { randAlphanum } from '../../rand';
import { entryMap, HttpError, isProduction, pick } from '../../util';
import { addWord, isValidWord } from './dict';
import io from "../../io";

const names = {
    user: 'wordbase-user',
        // user: string
        // games: string[]
        // hidden: string[]
        // stats: { string: any }
        // allowChallenges: boolean
        // challengeHash: hash
        // challengeSettings?
        // challenges: { string: string }
        // competitions: string[]
    info: 'wordbase-info',
        // id: string
        // p1: string
        // p2: string
        // status: {-1 0 1}
        // progress: [number, number]
        // turn: number
        // lastWord?: string
        // lastUpdate?: number
        // rematch?: string
        // chat?: string
        // tries?: number
        // ai?: number
        // replayable?: boolean
        // unseen?: boolean
        // previous?: string
        // attempts: [string[], string[]]
        // lang?: string
        // settings?: { mode, options: { timePerMove, timePerPlayer } }
        // publicReplay?: boolean
        // img?: dataUrl

        // compete: { id:string }

    save: 'wordbase-save',
        // id: string
        // state: string
    invite: 'wordbase-invite',
        // id: string
        // user: string
        // lang: string
    timeout: 'wordbase-timeout',
        // id: string
        // ms: number
    compete: 'wordbase-compete',
        // id: number
        // users: string[]
        // settings: any
        // bracket: blob
        // games: { [id:string]: {
        //    id: string, name: string, p1,p2,winner: string, round,i: number, start: number, next: id:string
        // } }
        // start: number
        // active: boolean
        // round: number
        // roundStart: number
        // gameDurationMs: number
        // breakDurationMs: ms
    competeGamePool: 'wordbase-compete-save',
        // id: string
        // state: string
}
const C = entryMap(names, name => () => db.collection(name));

const STAT = {
    LONGEST_WORD: 'longestWord',
    LONGEST_GAME: 'longestGame',
    WORDS_PLAYED: 'wordsPlayed',
    GAMES_PLAYED: 'gamesPlayed',
    LETTERS_PLAYED: 'lettersPlayed',
    AVERAGE_WORD: 'averageWordLength',
}
const computeStats = async () => {
    console.log('computing /wordbase stats');
    (await C.invite().find({}).toArray()).forEach(invite => {
        C.invite().updateOne(
            { id: invite.id },
            { $set: { lang: invite.lang || 'english' } },
        );
    })
    let gameProfiles = await C.user().find({}).toArray()
    // console.log('computing stats:', gameProfiles.map(profile => profile.user))
    let totalGames = 0, totalWords = 0, totalLetters = 0
    gameProfiles.forEach(async gameProfile => {
        let user = gameProfile.user
        if (!user) {
            C.user().deleteOne({ user })
            return
        }
        // if (user !== 'cyrus') return
        let longestWord = ''
        let longestGame = 0
        let wordsPlayed = 0
        let gamesPlayed = 0
        let lettersPlayed = 0
        // let games = await Promise.all(gameProfile.games.map(async id => {
        //     let { info, state } = await getState(user, id, true)
        //     if (!info || !JSON.parse(state)) {
        //         // console.log(id, info, state)
        //         return { info, words: [] }
        //     }
        //     return {
        //         info,
        //         words: JSON.parse(state).history.map(tiles => tiles.map(t => t.letter).join('')).reverse()
        //     }
        // }))
        const games:any = (
            await Promise.all(Array.from(await C.info()
            .find({
                $or: [{ p1: user }, { p2: user }],
            }).toArray()
            ).map(async (info: any) => {
                try {
                    let { state } = await getState(user, info.id, true)
                    if (!info || !JSON.parse(state)) {
                        // console.log(id, info, state)
                        return { info, words: [] }
                    }
                    return {
                        info,
                        words: JSON.parse(state).history.map(tiles => tiles.map(t => t.letter).join('')).reverse()
                    }
                } catch (e) {
                    await remove(user, info.id)
                    return false
                }
            }))).filter(x=>x)
        // console.log(user, games)
        games.map(({ info, words }) => {
            let i = (user === info.p1) ? 0 : 1
            let plays = words.filter((_, j) => j%2 === i)
            // console.log(plays)

            longestWord = plays.reduce((l, w) => w.length > l.length ? w : l, longestWord, plays)
            wordsPlayed += plays.filter(w => w).length
            lettersPlayed += plays.reduce((sum, word) => sum + word.length, 0)
            if (info.status > -1) {
                longestGame = Math.max(longestGame, words.filter(w => w).length)
                gamesPlayed += 1
            }
            // console.log(longestWord, wordsPlayed, longestGame, gamesPlayed)
        })
        let stats = {
            [STAT.LONGEST_WORD]: longestWord,
            [STAT.LONGEST_GAME]: longestGame,
            [STAT.WORDS_PLAYED]: wordsPlayed,
            [STAT.GAMES_PLAYED]: gamesPlayed,
            [STAT.LETTERS_PLAYED]: lettersPlayed,
            [STAT.AVERAGE_WORD]: (lettersPlayed / wordsPlayed).toFixed(2)
        }
        // console.log(user, stats)
        C.user().updateOne(
            { user },
            { $set: { stats } },
        );
        totalGames += gamesPlayed
        totalWords += wordsPlayed
        totalLetters += lettersPlayed
    })
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const activeGames = await C.info().count({
        lastUpdate: { '$gte': weekAgo.getTime() },
    })
    await lock('cyrus', 'wordbase', 'active')
    await set('cyrus', 'wordbase', 'active', activeGames)
    totalGames = totalGames / 2
    // console.log(totalGames, await C.info().count())
    await lock('cyrus', 'wordbase', 'total')
    await set('cyrus', 'wordbase', 'total', totalGames)
    // console.log(totalWords, (await C.info().aggregate([
    //     { $match: {} },
    //     { $group: {
    //         _id: null,
    //         sum: { $sum: '$turn' },
    //     } },
    // ]).toArray())[0].sum)
    await setlock('cyrus', 'wordbase', 'words', totalWords)
    await setlock('cyrus', 'wordbase', 'letters', totalLetters)

    await setlock('cyrus', 'wordbase', 'challenges', await C.user().count({ allowChallenges: true }))
    await setlock('cyrus', 'wordbase', 'users', await C.user().count())
}
db.queueInit(computeStats, 60_000);
setInterval(computeStats, 1000 * 60 * 60 * 24); // 24hr

// re-schedule game timeouts
db.queueInit(async () => {
    const timeouts = Array.from<any>(await C.timeout().find({}).toArray())
    console.log('scheduling', timeouts.length, '/wordbase timeouts')
    timeouts.map(({ id, ms }) => timeout(id, ms))

    // delete non-existent rematches
    const missingRematches:any = []
    await Promise.all(Array.from(await C.info().find({}).toArray())
    .map(async (info:any) => {
        if (info.rematch) {
            const rematch = await C.info().findOne({ id: info.rematch })
            if (!rematch) {
                missingRematches.push(info.rematch)
                info.rematch = false
                C.info().updateOne({ id: info.id }, { $set:info })
            }
        }
    }))
    console.debug('CLEARED MISSING REMATCHES', missingRematches)
}, 5000)

async function getLang(user) {
    const settings = (await profile._get(user))?.settings || {}
    const lang = settings['wordbase.language'] || 'english'
    return lang
}
async function _getGameProfile(user) {
    if (!user) throw 'user not signed in';
    let entry = await C.user().findOne({ user },{_id:0});
    if (!entry) {
        entry = { user, games: [], hidden: [], stats: {}, /* challenges, competitions */ };
        await C.user().insertOne(entry);
    }
    return entry;
}
async function _getInfo(user, id) {
    let entry = await C.info().findOne({ id },{_id:0});
    if (!entry || (entry.p1 && ![entry.p1, entry.p2, 'cyrus'].includes(user))) {
        if (entry?.status > -1 && entry.publicReplay) {
            delete entry.chat
        } else throw `game ${id} doesn't exist for ${user}`
    }
    return entry;
}
async function _setInfo(info) {
    await C.info().updateOne({ id: info.id }, { $set: info }, { upsert: true })
    // manage timers
    timeout(info.id)
}

async function getUserInfo(user) {
    let gameProfile = await _getGameProfile(user);
    let infoList = await C.info()
        .find({ id: { $in: gameProfile.games } })
        .project({_id:0})
        .toArray();
    return { gameProfile, infoList };
}
async function getInfo(user, id) {
    let info = await _getInfo(user, id);
    return { info };
}
async function getState(user, id, stats=false) {
    let info = await _getInfo(user, id);
    let save = await C.save().findOne({ id });
    // !stats && info.status > -1 && console.log(info.seen, user, info[info.status === 0 ? 'p2' : 'p1'])
    if (!stats && (
        (info.unseen === true || info.unseen?.includes(user))
        || (info.status > -1
            && !info.unseen
            && !info.seen
            && user === info[info.status === 0 ? 'p2' : 'p1'])
    )) {
        const other = [info.p1, info.p2].filter(p => p !== user)
        info.unseen = info.unseen === true ? other : undefined
        info.seen = Date.now()
        _setInfo(info)
        ioM.send(other, 'wordbase:update', info)
        // console.log(info)
    }
    // if (!stats && info.status > -1 && info.unseen === user) {
    //     delete info.unseen
    //     info.seen = true
    //     _setInfo(info)
    // }
    return { info, state: save.state };
}

async function _addGame(user, info) {
    const { games=[] } = await _getGameProfile(user)
    // console.log(user, games)
    if (!games.includes(info.id)) {
        C.user().updateOne(
            { user },
            { $set: { games: [info.id].concat(games) } },
        );
        info.chat && (await chat._addUser(info.chat, user))
        // console.log(user, games)
    }
}
async function _removeGame(user, id) {
    const { games=[], hidden=[] } = await _getGameProfile(user)
    if (games.includes(id)) {
        hidden.push(id)
        C.user().updateOne(
            { user },
            { $set: {
                games: games.filter(other => other !== id),
                hidden,
            } },
        );
        C.invite().deleteOne({ id }).then(result => {
            if (result.deletedCount > 0) ioM.emit('wordbase-public-invite', 'DELETE', id)
        });
    }
}

async function _updateStats(user, compute) {
    let gameProfile = await _getGameProfile(user);
    let stats = gameProfile.stats || {}
    let update = compute(stats)
    if (update !== undefined) {
        // console.log('[WORDBASE:stats]', user, update, stats)
        Object.assign(stats, update)
        await C.user().updateOne(
            { user },
            { $set: { stats } },
        );
    }
}
async function _updateStat(user, stat, compute) {
    let gameProfile = await _getGameProfile(user);
    let stats = gameProfile.stats || {}
    let value = compute(stats[stat])
    if (value !== undefined) {
        // console.log('[WORDBASE:stats]', user, stat, value, stats)
        stats[stat] = value
        await C.user().updateOne(
            { user },
            { $set: { stats } },
        );
    }
}
async function _updateEndStats(info) {
    await Promise.all([info.p1, info.p2].filter(u => u).map(async user => {
        let { state } = await getState(user, info.id, true)
        await _updateStat(user, STAT.GAMES_PLAYED, current => (current || 0) + 1)
        await _updateStat(user, STAT.LONGEST_GAME, current => {
            let words = JSON.parse(state).history.map(tiles => tiles.map(t => t.letter).join('')).reverse()
            return Math.max(current || 0, words.filter(w => w).length)
        })
    }))
}
async function _updatePlayStats(user, info) {
    await _updateStat(user, STAT.LONGEST_WORD, current => {
        if (!current || info.lastWord.length > current.length) {
            return info.lastWord
        }
    })
    await _updateStat(user, STAT.WORDS_PLAYED, current => (current || 0) + 1)
    await _updateStat(user, STAT.LETTERS_PLAYED, current => (current || 0) + info.lastWord.length)
}

async function play(user, id, newInfo, state) {
    let info = await _getInfo(user, id);
    const challenge = info.p1 && info.turn === 0
    if (!info.p1) {
        info.p1 = user;
        // wait for user to be added to chat
        // await _addGame(user, info);
        // _addGame(info.p2, info);
        C.invite().deleteOne({ id }).then(result => {
            if (result.deletedCount > 0) ioM.emit('wordbase-public-invite', 'DELETE', id)
        });
    }
    await _addGame(user, info);
    await _addGame(info.p2, info);
    if (info.turn > 0) {
        // due to 'contest' word, a player may submit their opponent's play
        // assign user manually based on current turn instead of request
        user = [info.p1, info.p2][info.turn % 2]
    }

    Object.assign(info, pick(
        newInfo,
        'turn status progress lastWord confirm timePerPlayer animationMs'));
    // console.log(info);
    info.lastUpdate = Date.now()
    info.animationMs = Math.max(info.animationMs || 0, 1000)
    info.tries = 0;
    let completed = info.status > -1
    let other = info.p1 === user ? info.p2 : info.p1;

    const { timePerMove, timePerPlayer } = info.settings?.options || {}
    if (completed) {
        info.unseen = other
        _updateEndStats(info)
    } else if (timePerMove || timePerPlayer) {
        info.unseen = other // let other accept challenge before starting timer
    }
    if (completed && info.compete) { // wait if ended competitive match
        await _setInfo(info);
        await C.save().updateOne(
            { id },
            { $set: { state } },
        );
        _handleCompetitiveEnd(info)
    } else {
        _setInfo(info);
        C.save().updateOne(
            { id },
            { $set: { state } },
        );
    }

    const lastWord = info.lastWord.toLocaleUpperCase()
    const skip = lastWord === '.SKIP'
    const timeout = lastWord === '.TIMEOUT'
    let confirm:any = lastWord === '.CONFIRM'
    const special = skip || timeout || confirm
    if (!special) {
        _updatePlayStats(user, info)
    }
    confirm = confirm && info.confirm[0]

    ioM.send([user, other], 'wordbase:update', info)

    if (info.chat) {
        await chat.sendChat(user, info.chat, [{
            text: skip
                ? 'SKIPPED'
                : timeout
                ? 'TIMED OUT'
                : confirm
                ?
                    confirm.type === 'draw'
                    ? 'DRAW?'
                    : confirm.type === 'contest'
                    ? `${confirm.value.letters.toLocaleUpperCase()}`
                    : confirm.type.toLocaleUpperCase()+'ED'
                : lastWord,
            meta: {
                silent: true,
                classes: `last ${skip || timeout ? 'skip' : ''} ${confirm?'confirm':''} ${
                    'accept'.includes(confirm.type) && 'contest'.includes(info.confirm[1].type)?'collapse':''} ${info.turn%2 ? 'p1' : 'p2'}`,
                dedupe: info.turn,
            }
        }])
    }

    if (confirm && confirm.type === 'accept') {
        // if this accepted a previous request, perform action instead
        // not exhautive, some actions are performed client-side instead (like playing the requested word)
        const accepted = info.confirm[1]
        console.log('[WORDBASE:accept]', user, id, accepted)
        if (accepted.type === 'draw') {
            return await _draw(other, id)
        } else if (accepted.type === 'contest') {
            // add word in timeout to avoid issues with dev auto-reload
            isProduction() && setTimeout(() => addWord(accepted.value.letters, info.lang), 2000)
        }
    } else {
        notify.send(other, 'wordbase',
            skip
            ? `${user} skipped, your turn!`
            : confirm
            ?
                confirm.type === 'draw'
                ? `${user} requested a draw`
                : confirm.type === 'contest'
                ? `${user} requested ${confirm.value.letters.toLocaleUpperCase()}`
                : `${user} ${confirm.type}ed request`
            : completed
            ? `${user} won with ${lastWord}`
            : `${user} played ${lastWord}`,
            `freshman.dev/wordbase/${info.id}`)
        console.log('[WORDBASE:play]', user, id, info.chat,
            skip ? 'SKIPPED' : confirm ? confirm : lastWord)
    }

    return { info }
}

// check game timeout
// if expired, end game & delete from timeout DB
// else, store in timeout DB & schedule next check
const _timeout = {}
async function timeout(id, ms=0) {
    const _inner = async () => {
        const info = await C.info().findOne({ id })
        if (!info) return
        const { timePerMove, timePerPlayer } = info.settings?.options || {}
        const timed = info.compete?.start || (info.turn > 0 && info.status === -1 && (info.turn > 1 || !info.unseen) && (timePerMove || timePerPlayer))

        let storeTimeoutMs, removeTimeout
        if (timed) {
            const timePerPlayer = info.timePerPlayer || false
            const timeForMove = Math.min(
                timePerMove || 1e9,
                timePerPlayer ? timePerPlayer[info.turn % 2] : 1e9)

            const timeStart = (info.turn < 2 ? info.seen || info.lastUpdate : info.lastUpdate)
                + (info.animationMs || 0)
                + 1_000 /* animation delay */

            const timeSinceLast = (Date.now() - timeStart) / 1000
            const serverTimeout = timeForMove - timeSinceLast + 3 // 3s buffer for communication with server
            const serverEnd = timePerPlayer[info.turn % 2] - timeSinceLast + 3

            if (serverTimeout > 0) {
                // re-schedule timeout
                storeTimeoutMs = serverTimeout * 1000
            } else if (serverEnd > 0) {
                // skip turn
                const user = [info.p1, info.p2][info.turn % 2]
                console.log('[WORDBASE:timeout:skip]', user, info)
                info.turn += 1
                info.timePerPlayer = timePerPlayer
                info.lastWord = '.skip'
                const save = JSON.parse((await getState(user, id)).state)
                save.turn +=  1
                save.history.unshift([])
                await play(user, id, info, JSON.stringify(save))
            } else {
                removeTimeout = true
                if (timePerPlayer) timePerPlayer[info % 2] -= timeSinceLast

                // end game
                console.log('[WORDBASE:timeout]', info)
                const players = [info.p1, info.p2]
                const [winner, loser] = info.turn % 2 ? players : players.reverse()
                info.status = (info.turn + 1) % 2
                info.lastUpdate = Date.now()
                info.lastWord = '.timeout'
                info.unseen = players
                info.timePerPlayer = timePerPlayer
                _setInfo(info)

                ioM.send(players, 'wordbase:update', info)
                notify.send(winner, 'wordbase',
                    `${loser} timed out, you win!`, `freshman.dev/wordbase/${info.id}`)
                notify.send(loser, 'wordbase',
                    `you timed out, ${winner} wins`, `freshman.dev/wordbase/${info.id}`)

                _updateEndStats(info)
            }
        }

        if (storeTimeoutMs) {
            C.timeout().updateOne({ id }, { $set: { id, timeout: storeTimeoutMs } }, { upsert: true })
            timeout(id, storeTimeoutMs)
        } else if (removeTimeout) C.timeout().deleteOne({ id })
    }

    clearTimeout(_timeout[id])
    if (ms) {
        if (ms > 1e8) return // ignore very large timeouts
        console.log('scheduling wordbase timeout for', id)
        _timeout[id] = setTimeout(() => _inner(), ms)
    } else _inner()
}
async function _draw(user, id) {
    let info = await _getInfo(user, id);
    if (info.status === -1) {
        console.log('[WORDBASE:draw]', info)
        info.status = 2;
        info.lastUpdate = Date.now()
        info.lastWord = '.draw'
        let other = info.p1 === user ? info.p2 : info.p1
        info.unseen = other
        _setInfo(info)

        ioM.send([user, other], 'wordbase:update', info)
        notify.send(other, 'wordbase',
            `${user} accepted a draw`, `freshman.dev/wordbase/${info.id}`)

        _updateEndStats(info)
    }
    return { info }
}
async function resign(user, id) {
    let info = await _getInfo(user, id);
    if (info.status === -1) {
        info.status = (info.p1 === user) ? 1 : 0;
        info.lastUpdate = Date.now();
        info.lastWord = '.resign'
        let other = info.p1 === user ? info.p2 : info.p1;
        info.unseen = other
        _setInfo(info);

        ioM.send([user, other], 'wordbase:update', info)
        notify.send(other, 'wordbase',
            `${user} resigned, you win!`, `freshman.dev/wordbase/${info.id}`)

        _updateEndStats(info)
    }
    return { info }
}
async function remove(user, id) {
    _removeGame(user, id);
    return resign(user, id);
}
async function hide(user, id) {
    await _removeGame(user, id);
    return { success: true }
}
async function unhide(user) {
    const gameProfile = await _getGameProfile(user)
    const hidden = gameProfile.hidden || []
    // unhide from profile's hidden list (new), else unhide all games related to player
    if (hidden.length) {
        const games = gameProfile.games || []
        games.push(hidden.pop())
        await C.user().updateOne({ user }, { $set: { games, hidden }})
    } else {
        const games = Array
            .from<any>(await C.info().find({ $or: [{ p1: user }, { p2: user }] }).toArray())
            .filter(info => info.p1 && info.p2)
            .map(info => info.id)
        await C.user().updateOne({ user }, { $set: { games }})
    }
    return { success: true }
}
async function rematch(user, id, { state, settings }) {
    let info = await _getInfo(user, id);
    if (info.status === -1) throw 'game still in progress';

    let rematch
    if (info.rematch) {
        rematch = { info: await _getInfo(user, info.rematch) }
    } else {
        let players:[string,string] = [info.p1, info.p2];
        if (info.status === 0) players.reverse(); // if p1 won, swap
        rematch = await create(...players, { state, previous: info.id, settings });
        info.rematch = rematch.info.id;
        const other = info.p1 === user ? info.p2 : info.p1;
        info.unseen = other
        if (settings) {
            const { timePerPlayer } = settings.options
            if (timePerPlayer) info.timePerPlayer = [timePerPlayer, timePerPlayer]
        }
        _setInfo(info)

        notify.send(other, 'wordbase',
            `${user} requested a rematch!`, `freshman.dev/wordbase/${info.rematch}`)
        ioM.send(other, 'wordbase:update', info)
    }
    return rematch
}
async function friend(user, other, { state, settings }) {
    let { info } = await create(user, other, { state, settings });
    notify.send(other, 'wordbase',
        `${user} challenged you!`, `freshman.dev/wordbase/${info.id}`)
    let userProfile = (await profile.get(user)).profile
    chat.sendUserChat(userProfile, other, [{
        meta: {
            read: true,
            page: `/wordbase/${info.id}`,
            pageDesc: `new /wordbase challenge!`,
            pageImg: `/raw/wordbase/favicon.png`,
        }
    }])
    return { info }
}
async function accept(user, id) {
    if (!id) {
        // public matchmaking
        // TODO:
        // if user already has open game, create invite for others to match with
        // else, match with random invite

        // don't match with user if you already have an open game with them
        let profile:any = await C.user().findOne({ user })
        let games:any = await C.info().find({ id: { $in: profile.games }}).toArray()
        let perUser = Array.from<any>(games)
            .filter(game => game.status === -1)
            .filter(game => game.p1 && game.p2)
            .reduce((acc, game) => {
                let other = game.p1 === user ? game.p2 : game.p1
                acc[other] = (acc[other] ?? 0) + 1
                return acc
            }, {})
        let alreadyMatched = Object.keys(perUser).filter(other => perUser[other] >= 1)

        // let me create multiple open invites, but match others with themselves
        // let entry = await C.invite().findOne(user === 'cyrus'
        //     ? { user: { $nin: at3.concat('cyrus') }}
        //     // : { user: { $nin: at3 }});
        //     : { user: { $nin: at3.concat(user) }});
        // let entry = await C.invite().find({ user: { $nin: at3 }}).limit(4).toArray();
        // if (!entry) {
        //     let any = await C.invite().findOne({});
        //     if (!any) {
        //         send(
        //             'cyrus+invites@freshman.dev',
        //             '/wordbase out of invites',
        //             `${user} - freshman.dev/api/wordbase/invites`)
        //     }
        //     throw 'no open invites'
        // }
        // id = entry.id;
        // if (entry.user === user) {
        //     return {
        //         error: 'already open',
        //         id,
        //     }
        // }

        const lang = await getLang(user)
        // update: allow users to create up to 3 invites
        let entries:any = Array.from(
            await C.invite().find({
                user: { $nin: alreadyMatched },
                lang: { $eq: lang },
            }).toArray());
        let userEntries = entries.filter(entry => entry.user === user)
        if (userEntries.length >= 3) {
            return {
                error: 'already open',
                id: userEntries[0].id,
            }
        }
        id = entries.find(entry => entry.user !== user)?.id
        if (!id) {
            let any = await C.invite().findOne({});
            if (!any) {
                send(
                    'cyrus+invites@freshman.dev',
                    `/wordbase ${lang} out of invites`,
                    `${user} - freshman.dev/api/wordbase/invites`)
            }
            throw 'no open invites'
        }
    }
    console.log('accept', user, id);
    C.invite().deleteOne({ id }).then(result => {
        if (result.deletedCount > 0) ioM.emit('wordbase-public-invite', 'DELETE', id)
    });

    let info = await _getInfo(user, id);
    console.log(info);
    if (info.p1) throw 'game already accepted';
    info.p1 = user;
    info.lastUpdate = Date.now();
    _setInfo(info);
    await _addGame(user, info);
    await _addGame(info.p2, info);
    return { info };
}
async function settings(user, id, { settings }) {
    const info = await _getInfo(user, id)
    Object.assign(info, { settings })
    await C.info().updateOne({ id }, { $set: info })
    ioM.send([info.p1, info.p2], 'wordbase:update', info)
    return { info }
}

async function getInvites(custom=false) {
    let invites = await C.invite().find(custom ? {} : { custom: { $ne: !custom }}).project({_id:0}).toArray();
    return { invites }
}

async function _createInfo({ lang, settings, previous=false, public:pub=false }) {
    const id = randAlphanum(7)
    const info = {
        id, p1: undefined, p2: undefined,
        turn: 0,
        status: -1,
        progress: [0, 100],
        lastWord: undefined,
        lastUpdate: Date.now(),
        chat: `wordbase+${id}`,
        replayable: true,
        previous: previous ?? false,
        lang,
        public: pub ?? false,
        settings,
        unseen: undefined,
        compete: false as any,
    }
    console.log('[WORDBASE:create]', pick(info, 'id lang public settings'))
    await chat.newChat([], info.chat)
    return info
}
async function _assignPlayers(info, p1, p2) {
    if (info.p1 && info.p1 !== p1) throw 'p1 already defined'
    if (info.p2 && info.p2 !== p2) throw 'p2 already defined'

    const newPlayers = [!info.p1 && p1, !info.p2 && p2].filter(truthy)
    Object.assign(info, { p1, p2, unseen: [p1, p2] })
    console.log('[WORDBASE:assign]', newPlayers, { id:info.id, p1, p2 })
    for (let i = 0; i < newPlayers.length; i++) await _addGame(newPlayers[i], info)
    ioM.send(newPlayers, 'wordbase:update', info)
    return info
}
async function _insertGame(info, state) {
    await _setInfo(info)
    await C.save().insertOne({ id: info.id, state });
}
async function create(user, other, { state, previous=false, public:pub=false, settings=undefined }) {
    if (!user) throw 'sign in to create game';
    const info = await _createInfo({
        lang: user ? await getLang(user) : 'english',
        previous,
        public: pub,
        settings,
    })
    const p1 = other ? user : undefined
    const p2 = other ? other : user
    await _assignPlayers(info, p1, p2)
    await _insertGame(info, state)
    return { info }
}
async function open(user, { state, settings, custom=false }) {
    let { info } = await create(user, undefined, { state, public: true, settings });
    C.invite().insertOne({
        id: info.id,
        user,
        lang: info.lang,
        ...(custom ? { custom } : {}), // only assign custom if true
    });
    ioM.emit('wordbase-public-invite', 'NEW', info.id)
    return { info }
}
async function challenge(user, hash, { state, settings }) {
    const { user: other } = await challengeUser(user, hash)
    if (user === other) throw `you can't challenge yourself`
    console.debug('[WORDBASE:challenge]', other, user, hash)
    const { allowChallenges=false, challenges={} } = other ? (await C.user().findOne({ user: other })) || {} : {}
    if (!allowChallenges) throw `${other} hasn't allowed challenges`
    const existingId = challenges[user]
    if (existingId) return await getState(user, existingId)

    // use friend(), but I should eventually fix friend so it doesn't work for non-friends
    const { info } = await friend(user, other, { state, settings })
    challenges[user] = info.id
    await C.user().updateOne({ user: other }, { $set: { challenges }}, { upsert: true })

    return { info, state }
}
async function toggleChallenges(user, enable=undefined) {
    const { allowChallenges=false } = await C.user().findOne({ user })
    await C.user().updateOne({ user }, { $set: {
        allowChallenges: enable ?? !allowChallenges
    }}, { upsert: true })
    console.log('[WORDBASE:toggleChallenges]', user, (await C.user().findOne({ user })))
    return await getUserInfo(user)
}
async function challengeHash(user, toggle=false) {
    let { challengeHash } = await C.user().findOne({ user })
    if (toggle) {
        console.debug('[WORDBASE:challengeHash] update CHALLENGE', challengeHash)
        challengeHash = challengeHash ? undefined : randAlphanum(7)
        await C.user().updateOne({ user }, { $set: { challengeHash }}, { upsert: true })
    }
    return challengeHash || user
}
async function challengeUser(viewer, hash, { challengeSettings:newSettings=false }={}) {
    let { user, challengeSettings } = 
        await C.user().findOne({ challengeHash: hash })
        || await C.user().findOne({ user: hash, challengeHash: undefined })
        || {}
    if (newSettings !== false && viewer === user) { // unset with { settings: undefined }
        challengeSettings = newSettings
        console.debug('[WORDBASE:challengeUser] update settings', challengeSettings)
        await C.user().updateOne({ user }, { $set: { challengeSettings } })
    }
    return { user, challengeSettings }
}
async function get_challenge_user(hash) {
    let { user } = 
        await C.user().findOne({ challengeHash: hash })
        || await C.user().findOne({ user: hash, challengeHash: undefined })
        || {}
    return { user }
}

async function check(user, id, word) {
    let info = await _getInfo(user, id);
    if (!info.p1) {
        info.p1 = user;
        _addGame(user, info);
        _addGame(info.p2, info);
        C.invite().deleteOne({ id }).then(result => {
            if (result.deletedCount > 0) ioM.emit('wordbase-public-invite', 'DELETE', id)
        });
    }

    let isValid = isValidWord(word, info.lang);
    let tries = info.tries || 0;
    // console.log(user, id, word, isValid, tries)

    if (!isValid) {
        if (!info.attempts) {
            info.attempts = [[], []]
        }
        const i = user === info.p1 ? 0 : 1
        if (!info.attempts[i].includes(word)) {
            tries++
            info.tries = tries
            info.attempts[i].push(word)
        }
        info.lastUpdate = Date.now();
        _setInfo(info);
    }

    return { tries, isValid }
}

async function stats(viewer, user) {
    let { stats } = await _getGameProfile(user)
    // viewer has been fed through isFriend. note, this is confusing
    stats.friend = viewer ? viewer : false
    return { stats }
}

async function compete(id, user, { join=false, leave=false }={}) {
    const { competitions=[] } = await _getGameProfile(user)
    const { users=[] } = (await C.compete().findOne({ id })) ?? {}
    if (users.length === 0 && user !== 'cyrus') throw HttpError(404, `competition ${id} does not exist`)
    if (join) {
        competitions.push(id)
        users.push(user)
    }
    if (leave) {
        competitions.splice(competitions.indexOf(id))
        users.splice(users.indexOf(user))
    }
    await C.user().updateOne({ user }, { $set: {competitions} })
    await C.compete().updateOne({ id }, { $set: {id, users} }, { upsert: true })
    const result = { id, joined: users.includes(user) }
    console.debug('[WORDBASE:COMPETE]', user, { join, leave }, result)
    return result
}

async function states() {
    const open:any = Array.from(await C.info().find({ status: -1 }).project({
        _id: 0, id: 1, p1: 1, p2: 1, turn: 1
    }).toArray())
    const invite = open.filter(g => !g.p1)
    const nonInvite = open.filter(g => g.p1)
    const start = nonInvite.filter(g => !g.turn)
    const middle = nonInvite.filter(g => g.turn)
    return {
        invite,
        start,
        middle,
    }
}

async function updateProgressImage(user, id, { img='' }={}) {
    const info = await _getInfo(user, id)
    try {
        info.img && clearUrl(info.img)
    } catch {}
    Object.assign(info, { img: urlForDataUrl(img) })
    console.debug('[WORDBASE] image update', info.img)
    _setInfo(info)
    return { info }
}
async function enablePublicReplay(user, id, { img='' }={}) {
    const info = await _getInfo(user, id)
    try {
        info.img && clearUrl(info.img)
    } catch {}
    Object.assign(info, {
        publicReplay: true,
        // lastUpdate: Date.now(),
        img: urlForDataUrl(img),
    })
    _setInfo(info)

    let other = info.p1 === user ? info.p2 : info.p1
    ioM.send([user, other], 'wordbase:update', info)

    return { info }
}
async function resultTwitterHTML(rs, id) {
    const { info, state } = await getState('cyrus', id)
    console.debug('[WORDBASE:REPLAY]', id)
    respondWithTwitterCard(rs, {
        'twitter:card': 'summary_large_image',
        'twitter:url': `https://wordbase.app/replay/${info.id}`,
        'twitter:title': `${info.p1} vs ${info.p2}`,
        'twitter:site': '@wordbase_app',
        'twitter:creator': '@__freshman',
        'twitter:description': `${['BLUE', 'ORANGE'][info.status]} wins!`,
        'twitter:image': info.img || 'https://wordbase.app/raw/wordbase/favicon256.png',
        // 'twitter:image': 'https://wordbase.app/raw/wordbase/favicon256.png',
    })
}

async function seedCompetition(id, user, { settings, states }) {
    if (user !== 'cyrus') return
    C.compete().updateOne({ id }, { $set: {settings} })
    await C.competeGamePool().deleteMany()
    // await C.competeGamePool().deleteMany({ id })
    const op = C.competeGamePool().initializeOrderedBulkOp();
    states.forEach(state => op.insert({ id, state }))
    op.execute()
    return { success: true }
}
async function getCompetition(id, user) {
    if (user !== 'cyrus') return
    return await C.competeGamePool().find({ id })
}

const N_GAMES_PER_MATCH = 2
async function generateCompetition(id, user, settings) {
    if (user !== 'cyrus') return
    // generate competition given current users and seeded matches
    const bracketize = players => {
        if (players.length < 1) return players
        // for n players, tree with height on order of log2(n)

        // TODO redo splits from top
        const recurseSplit = <T,>(values: T[], score: (T)=>number) => {
          const ordered = values.slice().sort((a, b) => score(a) - score(b))
          // console.debug(ordered)
          if (ordered.length <= 2) return ordered

          let left:any = []
          let right:any = []
          while (ordered.length) {
            right.push(ordered.shift())
            ordered.length && left.push(ordered.shift())
            ordered.length && right.push(ordered.pop())
            ordered.length && left.push(ordered.pop())
          }
          // console.debug(left, right)

          left = recurseSplit(left, score)
          right = recurseSplit(right, score)
          if (left.length === right.length
              && Math.min(...right.map(score)) < Math.min(...left.map(score))) {
            [left, right] = [right, left]
          }

          return [...left, ...right]
        }
        const baseSplit = <T,>(values: T[], score: (T)=>number) => {
          if (values.length < 2) return values
          const ordered = recurseSplit(values, score)
          // return ordered

          let maxScore
          let tree = ordered.map(x => {
            const x_score = score(x)
            if (x_score < maxScore) maxScore = x_score
            return {
              value: x,
              min: x_score,
            }
          })
          while (tree.length > 1) tree = group(tree, 2).map(x => ({
            value: x, min: x.length < 2 ? maxScore : Math.min(x[0].min, x[1].min),
          }))
          const recurseSortTree = (tree: { value, min?:number }, score) => {
            // sort pairs, sort & flatten nodes
            if (!Array.isArray(tree.value)) {
              // pass
            } else {
              recurseSortTree(tree.value[0] as any, score)
              tree.value[1] && recurseSortTree(tree.value[1] as any, score)
              tree.value = tree.value.sort((a,b) => a.min - b.min).flatMap(x => x.value)
            }
            return tree
          }
          return recurseSortTree(tree[0], score).value
        }

        // initialize order to match first & last by rating
        const ratingOrder = players.slice().sort((a, b) => b.rating - a.rating)
        ratingOrder.map((x, i) => {
          x.rank = i + 1
        })
        let layer = baseSplit(ratingOrder, x => x.rank)

        // this outputs an order which can be iteratively composed into a bracket
        // (it would be easier to just use internal pairs, but this is a nice property)1qq12q1qq1
        layer.map((x, i) => x.total = 1)
        const layers = [layer]
        while (layer.length > 1) {
          const previous = layer.slice()
          layer = []
          let pick, put, reverse
          if (layers.length % 2) {
            pick = () => previous.shift()
            put = x => layer.push(x)
            reverse = false
          } else {
            pick = () => previous.pop()
            put = x => layer.unshift(x)
            reverse = true
          }

          while (previous.length > 1) {
            const [first, second] = (x => reverse ? x.reverse() : x)([pick(), pick()])
            first.class = 'first'
            second.class = 'second'
            // second.total = Math.max(2, second.total)
            put({
              name: `(${first.name} or ${second.name})`,
              incomplete: true,
              rating: Math.max(first.rating, second.rating),

              total: first.total + second.total,
              min: Math.min(first.min ?? 1, second.min ?? 1),
              last: layers.length,

              first, second,
              rank: Math.min(first.rank, second.rank),
            })
          }
          if (previous.length) {
            const first = previous[0]
            first.class = 'first second'
            put({
              ...first,
              first,
              second: { total: 0 },
              bye: true,
            })
          }
          layers.push(layer)
        }

        return layers
    }
    let { users: players } = await C.compete().find({ id })
    if (true || !players) {
        // players = range(4).map(x => ({
        //     name: ''+x,
        //     rating: randi(10),
        // }))
        // players = ['cyrus', 'test', 'foo', 'bar', 'baz'].map((x,i)=>({ name: x, rating: i }))
        players = ['cyrus', 'cyrus', 'test', 'test'].map((x,i)=>({ name: x, rating: i }))
    }
    const bracket = bracketize(players)

    console.debug('[WORDBASE:BRACKET]', players)//, bracket)

    // create games from game pool
    const games:any = {}
    const matchNameToGames = {}
    for (let i = 0; i < bracket.length-1; i++) {
        const round = bracket[i+1]
        // console.debug(round)
        // create match games like:
        /*

        {
            id: string,
            round: number,
            p1: string, p2: string,
            winner: false|string,
            next: id:string
        }[]

        p1, p2, winner, and next may be blank
        next is assigned when subsequent match is created
        p1, p2 are assigned on completion of final game in feeder match
        winner is assigned on completion of game

        **/
        console.debug('ROUND', i)
        for (let j = 0; j < round.length; j++) {
            const matchInfo = round[j]
            // create games, but don't assign players yet
            // each match consists of two game
            // TODO same tile types, different letters
            const players = [
                matchInfo.first.total === 1 && matchInfo.first.name,
                matchInfo.second.total === 1 && matchInfo.second.name
            ]
            // console.debug('MATCH', matchInfo, matchNameToGames)
            let prevs = [
                (matchNameToGames[matchInfo.first.name] ?? [])[N_GAMES_PER_MATCH-1],
                (matchNameToGames[matchInfo.second.name] ?? [])[N_GAMES_PER_MATCH-1],
            ].filter(truthy)
            const matchGames = await Promise.all(
                range(N_GAMES_PER_MATCH).map(async j => {
                    const info = await _createInfo({
                        lang: 'english',
                        settings,
                    })
                    info.compete = { id }
                    const state = await C.competeGamePool().findOne({})
                    await _insertGame(info, state)

                    prevs.forEach(game => game.next = info.id)

                    let p1, p2
                    if (j % 2) [p1, p2] = players.slice().reverse()
                    else [p1, p2] = players
                    const game = {
                        id: info.id,
                        name: matchInfo.name,
                        round: i,
                        i: j,
                        p1, p2,
                        winner: false,
                        next: false,
                    }
                    prevs = [game] // if first in round, assign second to assign
                    games[game.id] = game
                    // console.debug('GAME', game)
                    return game
                }))
            matchNameToGames[matchInfo.name] = matchGames
            matchInfo.links = matchGames.map(x => `/wordbase/${x.id}`)
            // console.debug('CREATED MATCH', matchNameToGames[matchInfo.name])
        }
    }
    console.debug('bracket games', Object.values(games).map(g => pick(g, 'id name round i next')))
    await C.compete().updateOne({ id }, { $set: { bracket, games, settings } }, { upsert:true })
    return { bracket, games }
}

async function startCompetition(id, user, timestamp=Date.now()+5_000) {
    if (user !== 'cyrus' || timestamp < Date.now()) return

    const compete = await C.compete().findOne({ id })
    // start matches in first round
    // queue matches in later rounds
        // per match, start/queue the first game
        // the other games will be started on end

    // fetch games & sort by round
    const { settings, games } = compete
    const gameList = Object.values<{
        id:string, round:number, i:number, start:number
    }>(games).sort((a,b) => a.round - b.round)

    // define start times
    const ROUND_BREAK_M = 5
    const { timePerPlayer } = settings
    const gameDurationMs = (2 * timePerPlayer) * 1000 /* convert s -> ms */
    const breakDurationMs = ROUND_BREAK_M * 60 * 1000
    const roundDurationMs = gameDurationMs + breakDurationMs
    console.debug('schedule wb-comp', gameList.map(g => pick(g, 'id round i')))
    for (let i = 0; i < gameList.length; i++) {
        const game = gameList[i]
        if (game.i < N_GAMES_PER_MATCH-1) {
            const delay = game.round * roundDurationMs
            Object.assign(game, {
                start: timestamp + delay,
            })
            console.debug('schedule wb-comp '+game.id, game.start)
        }
    }
    await C.compete().updateOne({ id }, { $set: {
        games,
        gameDurationMs,
        breakDurationMs,
    } })

    // add players to games using timeouts
    await _setCompetitionTimeouts(id)

    setTimeout(async () => {
        await C.compete().updateOne({ id }, { $set: { active:true } })
        io.inst().emit('wordbase:compete', id)
    }, timestamp - Date.now())
}
async function _startCompetitiveGame(game) {
    console.debug('start wb-comp', game)
    const id = game.id
    const info = await C.info().findOne({ id })
    await _assignPlayers(info, game.p1, game.p2)
    info.lastUpdate = info.compete.start = Date.now() + 5000
    console.debug(info)
    await C.info().updateOne({ id }, { $set:info })
    timeout(id)
    notify.send([game.p1, game.p2], 'wordbase', `${game.p1} vs ${game.p2} #${game.i} has begun (round ${game.round+1})`, `freshman.dev/wordbase/${id}`)

    if (game.i === 0) {
        const round = game.round
        const roundStart = Date.now()
        await C.compete().updateOne({ id:info.compete.id }, { $set:{
            round, roundStart,
        } })
        io.inst().emit('wordbase:compete', info.compete.id)
    }
}
const competitionTimeouts={}
async function _setCompetitionTimeouts(id) {
    competitionTimeouts[id] = competitionTimeouts[id] ?? []
    competitionTimeouts[id].forEach(clearTimeout)

    const now = Date.now()
    const { games } = await C.compete().findOne({ id })
    Object
    .values<{
        id:string, round:number, i:number, start:number
    }>(games).sort((a,b) => a.round - b.round)
    .filter(game => now < game.start)
    .forEach(gameToQueue => {
        const handle = setTimeout(() => {
            _startCompetitiveGame(gameToQueue)
        }, gameToQueue.start - now)
        competitionTimeouts[id].push(handle)
    })
}
async function _handleCompetitiveEnd(info) {
    // when a competitive game ends:
    // - start next game in round if one exists
    // OR
    // - determine winner if end of round
    //  - break ties
    //  - update bracket
    //  - send next game to winner, send link to bracket for loser
    //  - if last round, declare winner & distribute badges
    //  - if second-to-last round & two pairs, create 3rd place match
    if (info.compete) {
        const id = info.compete.id
        const { games } = await C.compete().findOne({ id })
        const matchToGames = {}
        Object.values(games).forEach((x:any) => {
            matchToGames[x.name] = matchToGames[x.name] ?? []
            matchToGames[x.name].push(x)
        })
        const game = games[info.id]
        const next = games[game.next]
        if (next && next.round === game.round) {
            // start next game in match
            _startCompetitiveGame(next)
        } else {
            // determine winner, update games in bracket
            game.winner = info.status === 0 ? info.p1 : info.p2
            game.loser = info.status === 1 ? info.p1 : info.p2
            if (next) {
                // determine match winner
                const matchGames = matchToGames[game.name]
                const wins = [
                    matchGames.filter(g => g.winner === info.p1),
                    matchGames.filter(g => g.winner === info.p2),
                ]
                // TODO break ties
                const matchWinner = wins[0] > wins[1] ? info.p1 : info.p2
                const matchLoswer = wins[0] < wins[1] ? info.p1 : info.p2

                // update next game (which should already be queued)
                if (next.first.name === game.name) next.p1 = matchWinner
                else next.p2 = matchWinner

                // send next link to winner, send bracket link to loser
                notify.send(matchWinner, 'wordbase', `You won round ${game.round+1} against ${game.loser}! Your next game will appear here:`, `freshman.dev/wordbase/${next.id}`)
                notify.send(matchLoswer, 'wordbase', `You lost round ${game.round+1} to ${game.loser}! View the updated bracket here:`, `freshman.dev/wordbase/compete`)
            } else {
                // if this was the final game, declare winner & badges
                // TODO 3rd place match
                notify.send(game.winner, 'wordbase', `You are the champion of wordbase.app Weekend Tournament #${id}!`, `freshman.dev/wordbase/compete`)
                notify.send(game.loser, 'wordbase', `You won 2nd place in wordbase.app Weekend Tournament #${id}!`, `freshman.dev/wordbase/compete`)
                // TODO badges
            }
            await C.compete().updateOne({ id }, { $set:{games} })
        }
    }
}
async function getCompetitionBracket(id) {
    console.debug(id)
    console.debug(Array.from(await C.compete().find({}).toArray()).map(x => pick(x, 'id users')))
    // return pick(await C.compete().findOne({ id }), 'bracket games settings start active')
    return await C.compete().findOne({ id })
}

db.queueInit(async () => {
    // const comp = Array.from(await C.info().find({ compete: { $exists:true } }).toArray())
    // console.debug(comp.map(x => pick(x, 'id p1 p2 compete')))
    // await C.info().deleteMany({ compete: { $exists:true } })
    // await C.compete().deleteMany({})
    // while (comp.length) {
    //     const info:any = comp.pop()
    //     try{ await info.p1 && remove(info.p1, info.id) }catch{}
    //     try{ await info.p2 && remove(info.p2, info.id) }catch{}
    // }

    // await generateCompetition('2', 'cyrus', { timePerPlayer: 30 })
    // await startCompetition('2', 'cyrus')
}, 1000)

export {
    names,
    STAT,

    getUserInfo,
    getInfo,
    getState,
    play,

    resign,
    remove,
    hide,
    unhide,
    rematch,
    friend,
    accept,
    settings,

    getInvites,
    create,
    open,
    challenge,
    toggleChallenges,
    challengeHash, challengeUser,
    enablePublicReplay,

    check,
    stats,
    states,

    compete,

    updateProgressImage,
    resultTwitterHTML,

    seedCompetition,
    getCompetition,
    generateCompetition,
    getCompetitionBracket,

    get_challenge_user,
};
