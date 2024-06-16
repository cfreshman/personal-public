import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.get('/profile', J(rq => M.profile(U(rq))))
R.get('/', J(rq => M.get_list(U(rq))))
R.get('/:u/:id', J(rq => M.get(P(rq, 'u'), P(rq, 'id'))))
// R.put('/', J(rq => M.new(U(rq), rq.body)))
R.post('/', J(rq => M.edit(U(rq), rq.body)))
R.delete('/:u/:id', J(rq => M.del(U(rq), P(rq, 'u'), P(rq, 'id'))))

export default {
    routes: R,
    model: M, ...M,
}
