import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.get('/:id', J(rq => M.get(rq.user, P(rq, 'id'))))
R.get('/:id/hot', J(rq => M.vote(rq.user, P(rq, 'id'), { hot:1, un:0 })))
R.get('/:id/hot/un', J(rq => M.vote(rq.user, P(rq, 'id'), { hot:1, un:1 })))
R.get('/:id/not', J(rq => M.vote(rq.user, P(rq, 'id'), { hot:0, un:0 })))
R.get('/:id/not/un', J(rq => M.vote(rq.user, P(rq, 'id'), { hot:0, un:1 })))

export default {
    routes: R,
    model: M, ...M,
}
