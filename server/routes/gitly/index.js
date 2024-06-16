import express from 'express';
import * as M from './model';
import { J, U } from '../../util';

const R = express.Router();
R.get('/', J(rq => M.all( U(rq) )));
R.get('/:hash(*)', J(rq => M.get( rq.user, rq.params.hash )));
R.delete('/:hash(*)', J(rq => M.remove( U(rq), rq.params.hash )));

R.put('/', J(rq => M.create( U(rq), rq.body )));
R.post('/:hash(*)', J(rq =>
    M.update( U(rq), rq.params.hash, rq.body )));

export default {
    routes: R,
     model: M, ...M,
}