import express from 'express';
import * as M from './model';
import { J, U } from '../../util';

const R = express.Router();
R.post('/user', J(rq => M.user( U(rq), rq.body.pass )));
R.post('/request', J(rq => M.request( rq.body.user )));
R.post('/token', J(rq => M.token( rq.body.user, rq.body.token, rq.body.pass )));


export default {
    routes: R,
     model: M, ...M,
}
