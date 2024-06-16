import express from 'express'
import { J, P } from '../../util'
import * as M from './model'
import io from './io'

const R = express.Router();
R.get('/:room', J(rq => M.get_room(P(rq, 'room'))))

export default {
    routes: R,
    model: M, ...M,
    io,
}