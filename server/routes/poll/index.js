import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.post('/new_id', J(rq => M.get(P(rq, 'id'))))
R.post('/get', J(rq => M.get(rq.body.id)))
R.post('/set', J(rq => M.set(rq.body.data)))

R.post('/new', J(rq => M.create()))
R.post('/vote', J(rq => M.vote(rq.body.id, rq.body.i)))

export default {
    routes: R,
    model: M, ...M,
}
