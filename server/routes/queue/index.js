import express from 'express';
import * as M from './model';
import { J, P } from '../../util';

const R = express.Router();

function query(rq, action='get') {
    return {
        space: rq.params.space || 'default',
        name: rq.params.name,
        key: P(rq, 'k key'),
        lock: P(rq, 'l lock'),
        action,
        allow: P(rq, 'a allow'),
        ms: P(rq, 't ms'),
        view: P(rq, 'v view') !== undefined,
    }
}

function add(rq) {
    let msg = P(rq, 'm') ?? P(rq, 'msg')
    return M.add(query(rq, 'add'), msg)
}
R.get('/((\\+)|add)/:space?/:name', J(add));
R.post('/:space?/:name', J(add));

function del(rq) {
    let i = P(rq, 'i') ?? P(rq, 'id')
    return M.del(query(rq, 'del'), i)
}
R.get('/((-)|del)/:space?/:name', J(del));
R.patch('/:space?/:name', J(del));

function flush(rq) {
    return M.flush(query(rq, 'del'), P(rq, 'ms'))
}
R.get('/flush/:space?/:name', J(flush));
R.delete('/:space?/:name', J(flush));

R.get('/poll/:space?/:name', J(rq => M.poll(query(rq))));

R.get('/:space?/:name', J(async rq => {
    const qry = query(rq)
    const i = P(rq, 'i') ?? P(rq, 'id')
    const msg = P(rq, 'm') ?? P(rq, 'msg')
    return M.handle(qry, i, msg)
}));


export default {
    routes: R,
     model: M, ...M,
}

// function lock(rq) {
//     let newKey = P(rq, 'l') ?? P(rq, 'lock')
//     return M.lock(query(rq), newKey)
// }
// R.get('/lock/:space?/:name', J(lock));
// R.put('/:space?/:name', J(lock));
