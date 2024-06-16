import express from 'express';
import * as M from './model';
import { J, U, P } from '../../util';
import { F } from '../profile';

const R = express.Router();
R.get('/', J(rq => M.get( U(rq) )));
// R.post('/web', J(rq => M.web( U(rq), rq.body.something)));
// R.post('/twitter', J(rq => M.twitter( U(rq), rq.body.handle)));
R.post('/email', J(rq => M.email( U(rq), rq.body.email, rq.body.source)));
R.post('/method', J(rq => M.method( U(rq), rq.body)));
R.post('/verify', J(rq => M.verify(rq.body.token)));
R.post('/domain', J(rq => M.domain( U(rq), P(rq, 'domain'))));

R.get('/sub/:app', J(rq => M.sub( U(rq), rq.params.app )));
R.get('/sub/:app/:user', J(async rq => (await F(rq, 'user')) && M.sub( rq.params.user, rq.params.app )));
R.put('/sub/:app', J(rq => M.sub( U(rq), rq.params.app, true )));
R.delete('/sub/:app', J(rq => M.sub( U(rq), rq.params.app, false )));

R.get('/msg', J(rq => M.read( U(rq) )));
R.get('/msg/:app', J(rq => M.read( U(rq), rq.params.app)));

// don't expose ability to send notifs to other users
// R.post('/msg/:app', J(rq => U(rq) && M.send(rq.body.user, rq.params.app, rq.body.text)));

// initialize notify methods (Telegram bot, etc)
import './methods';

R.get('/test', J(rq => {
    console.debug('[notify:/test] send test notification to', rq.user)
    return M.send(U(rq), 'test', 'test notification', 'freshman.dev/notify')
}))

R.get('/dangerous/mailer', J(rq => M.ADMIN_get_all_email_users(U(rq))))
R.post('/dangerous/mailer', J(rq => M.ADMIN_email_all_users(U(rq), rq.body)))

export default {
    routes: R,
    model: M, ...M,
    send: M.send,
}
