import express from 'express'
import { J, P, U, request_parser,  } from '../../util'
import * as M from './model'

const R = express.Router()
R.get('/', J(rq => M.all(rq.user)))
R.get('/user/:viewed', J(rq => M.user(rq.user, P(rq, 'viewed'))))
R.get('/:hash', J(rq => M.get(rq.user, rq.params.hash)))
R.get('/:hash/replies', J(rq => M.replies(rq.user, rq.params.hash)))
R.post('/:hash/like', J(rq => M.like(rq.user, rq.params.hash)))
R.post('/:hash/unlike', J(rq => M.unlike(rq.user, rq.params.hash)))
R.put('/', J(rq => M.create(U(rq), rq.body)))
R.put('/file', J(rq => M.audio(U(rq), rq.body)))
// R.post('/:hash', J(rq => M.update(U(rq), rq.params.hash, rq.body)))
R.delete('/:hash', J(rq => M.remove(U(rq), rq.params.hash)))

export default {
    routes: R,
    model: M,
}
