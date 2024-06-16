import express from 'express'
import { J, P, U, request_parser,  } from '../../util'
import * as M from './model'

const R = express.Router()
// R.get('/', J(rq => M.all(rq.user)))
R.post('/met', J(rq => M.get_meet(rq.user, P(rq, 'friend'), P(rq, 'other'))))
R.post('/meet', J(rq => M.set_meet(rq.user, rq.body)))
R.get('/greet/:other', J(rq => M.get_greet(rq.user, P(rq, 'other'))))
R.post('/greet', J(rq => M.set_greet(rq.user, rq.body)))
R.get('/meets/:name', J(rq => M.get_meets(rq.user, P(rq, 'name'))))
R.get('/hangout/:id', J(rq => M.get_hangout(rq.user, P(rq, 'id'))))
R.get('/hangout/:id/side', J(rq => M.side_hangouts(rq.user, P(rq, 'id'))))
R.get('/hangout/:id/side/:other', J(rq => M.side_hangouts(rq.user, P(rq, 'id'), P(rq, 'other'))))
R.post('/hangout', J(rq => M.set_hangout(rq.user, rq.body)))
R.get('/hangouts/:name', J(rq => M.get_hangouts(rq.user, P(rq, 'name'))))

R.post('/ai/suggestions', J(rq => M.get_ai_suggestions(U(rq), rq.body)))

R.get('/:friend/met/:other', J(rq => M.get_meet(rq.user, P(rq, 'friend'), P(rq, 'other'))))

export default {
    routes: R,
    model: M,
}
