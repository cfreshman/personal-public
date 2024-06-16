import express from 'express';
import * as M from './model';
import { J, U, P } from '../../util';

const R = express.Router();
R.get('/', J(rq => M.get( U(rq) )));
R.get('/new', J(rq => M.generate( U(rq) )));
R.delete('/:key', J(rq => M.remove( U(rq), P(rq, 'key') )));

R.get('/auth', J(async rq => ({ user: getApiAuth(rq) })))


async function authorized(rq, app, identifier) {
    const user = await getApiAuth(rq)
    const locked = await M.locked(user, app, identifier)
    return !locked
}
async function getApiAuth(rq) {
    return await _keyAuth(P(rq, 'auth'))
}

async function _keyAuth(apiKey) {
    const parts = (apiKey || '').split(':')
    let authorized = false
    if (parts.length == 2) {
        const [user, key] = parts
        const { info } = await M.get(user)
        if (info.keys.includes(key)) {
            authorized = user
        }
    }
    return authorized
}


export default {
    routes: R,
    model: M, ...M,
    getApiAuth, A: getApiAuth,
    authorized,
};