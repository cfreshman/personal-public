import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.get('/', J(rq => M.all(rq.user)))
R.post('/', J(rq => M.edit(U(rq), rq.body)))
R.delete('/:id', J(rq => M.del(U(rq), P(rq, 'id'))))

export default {
    routes: R,
    model: M, ...M,
}
