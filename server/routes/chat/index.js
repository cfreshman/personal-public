import express from 'express';
import * as M from './model';
import { J, P, U } from '../../util';
import { requireProfile } from '../profile';

const R = express.Router();
// R.get('/', J(rq => M.getAll( U(rq) )));
R.get('/', J(rq => M.getUser( U(rq) )));
R.get('/user-chat/:hash', J(async rq => M.userchat_from_hash(rq.user, rq.params.hash)))
R.get('/u/:user', J(async rq => M.readUserChat( await requireProfile(rq), rq.params.user )));
R.post('/u/:user', J(async rq => M.sendUserChat( await requireProfile(rq), rq.params.user, rq.body.messages )));

R.get('/marked/:id', J(async rq => M.get_marked(U(rq), P(rq, 'id'))))
R.post('/marked/:id', J(async rq => M.set_mark(U(rq), P(rq, 'id'), rq.body)))

R.post('/ai/suggestions', J(rq => M.get_ai_suggestions(U(rq), rq.body)))

R.get('/uglychat/join', J(rq => M.join_uglychat(rq.user)))

R.get('/:hash', J(rq => M.readChat( rq.user, rq.params.hash )));
R.get('/:hash/unread', J(rq => M.getUnread( U(rq), rq.params.hash )));
// don't expose ability to create new groups with random users
// R.post('/', J(rq => M.newChat( [...new Set(rq.body.users.concat(U(rq)))], rq.body.hash )));
R.post('/:hash', J(rq => M.sendChat( U(rq), rq.params.hash, rq.body.messages )));
R.post('/:hash/unread', J(rq => M.clearUnread( U(rq), rq.params.hash )));

export const contact = async (user, msg) => {
    M.sendUserChat( await requireProfile({ user }), 'cyrus', [{ text: msg }] )
}

export default {
    routes: R,
    model: M, ...M,
}