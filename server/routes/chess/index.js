import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.get('/state/:id', J(rq => M.get(rq.user, P(rq, 'id'))))
R.post('/state/:id', J(rq => M.set(rq.user, P(rq, 'id'), rq.body)))

export default {
    routes: R,
    model: M, ...M,
}
