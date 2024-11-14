import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.get('/', J(rq => M.get(U(rq))))
R.post('/', J(rq => M.set(U(rq), rq.body)))

export default {
    routes: R,
    model: M, ...M,
}
