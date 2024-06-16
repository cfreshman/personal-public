import express from 'express';
import * as M from './model';
import { J, U, P, range, exists } from '../../util';
import key from '../key';

const R = express.Router();

const Action = {
    tick: 0,
    untick: 1,
    set: 2,
}
async function perform(user, space, key, action, amount) {
    return (action === Action.set ? M.set : M.shift)(
        user, space, key, action === Action.untick ? -amount : amount)
}

R.post('/batch/:space', J(async rq => {
    // batch read with list of keys
    const counts = {}
    const space = P(rq, 'space')
    let keys = P(rq, 'keys')
    // or
    // batch write with list of shifts or sets
    const set = P(rq, 'set')
    const shift = P(rq, 'shift')
    const tick = P(rq, 'tick')
    const untick = P(rq, 'untick')

    let sets = P(rq, 'sets') ?? []
    const parse_shift = x => x ? x === true ? 1 : x : 0
    let shifts = P(rq, 'shifts') ?? []
    let ticks = P(rq, 'ticks') ?? []
    let unticks = P(rq, 'unticks') ?? []

    // TODO allow overlap
    if (!Array.isArray(sets)) {
        keys = Object.keys(sets)
        sets = Object.values(sets)
    }
    if (!Array.isArray(shifts)) {
        keys = Object.keys(shifts)
        shifts = Object.values(shifts)
    }
    if (!Array.isArray(ticks)) {
        keys = Object.keys(ticks)
        ticks = Object.values(ticks)
    }
    if (!Array.isArray(unticks)) {
        keys = Object.keys(unticks)
        unticks = Object.values(unticks)
    }

    const actions = range(keys.length).map(i => {
        // individual amounts override global, but global sets override individual shifts
        let action = [sets[i], set].some(exists)
            ? Action.set
            : [shift, tick, untick, shifts[i], ticks[i], unticks[i]].some(exists)
            ? Action.tick
            : undefined
        let amount =  (sets[i] ?? set ?? 0)
            + parse_shift(shifts[i] ?? shift)
            + parse_shift(ticks[i] ?? tick)
            - parse_shift(unticks[i] ?? untick)

        return exists(action) ? [action, amount] : undefined
    })

    counts['user'] = {}
    await Promise.all(keys.map(async (key, i) => {
        const counter = actions[i]
            ? await perform(rq.user, space, key, ...actions[i])
            : await M.get(rq.user, space, key, true)
        counts[key] = counter.value
        counts['user'][key] = counter.user ? counter.user[rq.user] : 0
    }))
    console.log('[COUNTER:batch]', space, counts)
    return counts
}))

async function tick(rq, action=Action.tick) {
    let amount = Number(P(rq, 'amount') ?? P(rq, 'shift') ?? P(rq, 'by') ?? P(rq, 'x') ?? 1)
    let user = await key.A(rq)
    return perform(user, rq.params.space, rq.params.key, action, amount)
}
R.get('/(\\++|tick)/:space?/:key', J(tick));
R.get('/(-+|untick)/:space?/:key', J(rq => tick(rq, Action.untick)));
R.get('/(=|set)/:space?/:key', J(rq => tick(rq, Action.set)));
R.get('/((k)|lock)/:space?/:key', J(async rq => M.lock(await key.A(rq),
    P(rq, 'space'), P(rq, 'key'))));
R.get('/((u)|unlock)/:space?/:key', J(async rq => M.unlock(await key.A(rq),
    P(rq, 'space'), P(rq, 'key'))));
R.post('/:space?/:key', J(tick));

R.get('/:space/op/all', J(async rq => M.all(rq.user, rq.params.space)));
R.get('/:space/op/prefix', J(async rq => M.prefix(rq.user, rq.params.space)));
R.get('/:space?/:key', J(async rq => M.get(rq.user, rq.params.space, rq.params.key, true)));

export default {
    routes: R,
     model: M, ...M,
}