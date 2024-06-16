import express from 'express';
import { roomed } from '../../io';
import { J, P } from '../../util';
import * as M from './model';

const R = express.Router()
R.get('/', J(rq => M.get('still')))
R.post('/', J(rq => M.update('still', P(rq, 'img'), P(rq, 'key'))))

R.get('/lapse', J(rq => M.get('lapse')))
R.post('/lapse', J(rq => M.update('lapse', P(rq, 'img'), P(rq, 'key'))))

export default {
    routes: R,
     model: M, ...M,
}
export const io = (io, socket, info) => roomed(io, socket, info, 'cityhall')
