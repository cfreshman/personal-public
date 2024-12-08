import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.get('/', J(rq => M.list(U(rq))))
R.get('/:id', J(rq => M.get(rq.user, P(rq, 'id'))))
R.post('/', J(rq => M.create(rq.user)))
R.put('/:id', J(rq => M.set(rq.user, rq.body)))
R.delete('/:id', J(rq => M.del(U(rq), P(rq, 'id'))))

export default {
    routes: R,
    model: M, ...M,
}
