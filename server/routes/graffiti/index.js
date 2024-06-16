import express from 'express';
import * as M from './model';
import { J } from '../../util';
import { F } from '../profile';

const R = express.Router();
R.get('/', J(rq => M.get('')));
R.put('/', J(rq => M.set('', rq.body.dataUrl)));

R.get('/~/:id', J(rq => M.get(`~/${rq.params.id}`)));
R.put('/~/:id', J(rq => M.set(`~/${rq.params.id}`, rq.body.dataUrl)));
R.get('/~/del/:id', J(rq => M.del(`~/${rq.params.id}`)));

R.get('/:friend', J(async rq => (await F(rq, 'friend')) && M.get(rq.params.friend)));
R.put('/:friend', J(async rq => (await F(rq, 'friend')) && M.set(rq.params.friend, rq.body.dataUrl)));

export default {
    routes: R,
     model: M, ...M,
}