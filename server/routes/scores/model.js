import { ObjectId } from 'mongodb';
import * as util from '../../util';
import db from '../../db';
import { entryMap } from '../../util';
import { randAlphanum } from '../../rand';

const N_SCORES = 7

const names = {
    user: 'score-user',
        // user: string
        // app: string
        // scores: { user: string, score: number, t: number }[]
    global: 'score-global',
        // app: string
        // scores: { user: string, score: number, t: number }[]
}
const C = entryMap(names, name => () => db.collection(name));

async function getUser(user) {
    // C.user().deleteMany({ app: 'befruited' })
    // C.global().deleteMany({ app: 'befruited' })
    let records = (await C.user().find({ user }).toArray()).sort((a, b) => a.app.localeCompare(b.app))
    return { records }
}
async function getGlobal() {
    let records = (await C.global().find().toArray()).sort((a, b) => a.app.localeCompare(b.app))
    return { records }
}
async function getUserApp(user, app) {
    let record = (await C.user().findOne({ user, app })) || {
        user,
        app,
        scores: []
    }
    return { record }
}
async function getGlobalApp(app) {
    let record = (await C.global().findOne({ app })) || {
        app,
        scores: []
    }
    return { record }
}

function _getFirsts(records) {
    let firsts = {}
    records.forEach(record => {
        firsts[record.app] = record.scores[0]
    })
    return firsts
}
async function getUserFirst(user) {
    let { records } = await getUser(user)
    return _getFirsts(records)
}
async function getGlobalFirst(user) {
    let { records } = await getGlobal(user)
    return _getFirsts(records)
}
async function getUserAppFirst(user, app) {
    let { record } = await getUserApp(user, app)
    return record.scores[0]
}
async function getGlobalAppFirst(user, app) {
    let { record } = await getGlobalApp(user, app)
    return record.scores[0]
}

async function getScore(app, optionalUser) {
    let payload = {
        global: (await getGlobalApp(app)).record
    }
    if (optionalUser) {
        payload.user = (await getUserApp(optionalUser, app)).record
    }
    return payload
}
async function getScores(optionalUser) {
    let payload = {
        global: (await getGlobal()).records
    }
    if (optionalUser) {
        payload.user = (await getUser(optionalUser)).records
    }
    return payload
}
async function addScore(user, app, score, desc=true) {
    let { record: userRecord } = await getUserApp(user, app)
    let { record: globalRecord } = await getGlobalApp(app)

    score = Number(score)
    t = Date.now()
    let isPersonal = false;
    let isGlobal = false;

    scoreEntry = { user, score, t }
    function appendScore(arr) {
        return [scoreEntry].concat(arr)
            // .sort((a, b) => (b.score - a.score) || a.t - b.t) // desc by score, then asc by time
            .sort((a, b) => (desc ? (b.score - a.score) : (a.score - b.score)) || a.t - b.t) // desc or asc by score, then asc by time
            .slice(0, N_SCORES)
    }
    // console.log('[SCORES:ENTRY]', app, scoreEntry)

    let userScores = userRecord.scores.filter(s => typeof s.score === 'number')
    if (userScores.length < N_SCORES
        || (desc && Math.min(...userScores.map(s => s.score)) < score)
        || (!desc && Math.max(...userScores.map(s => s.score)) > score)) {
        isPersonal = true
        userRecord.scores = appendScore(userScores)
        // console.log('[SCORES:PERSONAL]', userRecord.scores)
        C.user().updateOne({ user, app }, { $set: userRecord }, { upsert: true })
    }

    let globalScores = globalRecord.scores.filter(s => typeof s.score === 'number')
    if (globalScores.length < N_SCORES
        || (desc && Math.min(...globalScores.map(s => s.score)) < score)
        || (!desc && Math.max(...globalScores.map(s => s.score)) > score)) {
        // only keep one global record per user
        let userGlobal = globalScores.find(s => s.user === user)
        if (!userGlobal
            || (desc && userGlobal.score < score)
            || (!desc && userGlobal.score > score)) {
            isGlobal = true
            globalRecord.scores = appendScore(globalScores.filter(s => s.user !== user))
            // console.log('[SCORES:GLOBAL]', globalRecord.scores)
            C.global().updateOne({ app }, { $set: globalRecord }, { upsert: true })
        }
    }

    return {
        user: userRecord,
        global: globalRecord,
        isPersonal,
        isGlobal
    }
}

export {
    names,

    getUser,
    getGlobal,
    getUserApp,
    getGlobalApp,

    getUserFirst,
    getGlobalFirst,
    getUserAppFirst,
    getGlobalAppFirst,

    getScore,
    getScores,
    addScore,
};