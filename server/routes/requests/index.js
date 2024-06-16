import express from 'express';
import * as M from './model';
import { J, U, P } from '../../util';

const R = express.Router()
R.post('/download', J(rq => M.download( U(rq) )))
R.post('/delete', J(rq => M.remove( U(rq) )))


export default {
    routes: R,
     model: M, ...M,
}
