import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.get('/', J(rq => M.apps(rq.user)))
R.get('/app/:id', J(rq => M.app(rq.user, rq.params.id)))
R.post('/app', J(rq => M.publish(U(rq), rq.body)))
R.delete('/app/:id', J(rq => M.del_app(U(rq), rq.params.id)))
R.get('/app/:id/ratings', J(rq => M.ratings(rq.user, rq.params.id)))
R.post('/app/:id/rate', J(rq => M.rate(U(rq), rq.params.id, rq.body)))
R.delete('/app/:id/rate', J(rq => M.del_rating(U(rq), rq.params.id)))

export default {
    routes: R,
    model: M, ...M,
}
