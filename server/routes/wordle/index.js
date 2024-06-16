import express from 'express';
import * as M from './model';
import { J, U } from '../../util';

const R = express.Router();

// each day, attempt to fetch future words
// this endpoint returns those words up to the current day (starting Nov 7 2022 #507)
R.get('/played', J(rq => M.played()))

R.get('/', J(rq => M.all()));
R.post('/', J(rq => M.add(rq.user, rq.body)));
R.get('/:id/tree', J(rq => M.tree(rq.params.id, rq.user)));
R.post('/:id', J(rq => M.edit(U(rq), rq.params.id, rq.body)));
R.delete('/:id', J(rq => M.remove(U(rq), rq.params.id)));


export default {
    routes: R,
    model: M, ...M,
}
