import express from 'express'
import { J, P, U, request_parser,  } from '../../util'
import * as M from './model'

const R = express.Router()
R.get('/', J(rq => M.infos(rq.user)))
R.get('/game/:id/info', J(rq => M.game_info(rq.user, P(rq, 'id'))))

R.post('/game', J(rq => M.game_new(rq.user, rq.body)))
R.get('/game/:id', J(rq => M.game(rq.user, P(rq, 'id'))))
R.post('/game/:id', J(rq => M.game_turn(rq.user, P(rq, 'id'), rq.body)))

R.post('/game/:id/join', J(rq => M.game_join(rq.user, P(rq, 'id'))))
R.post('/invite', J(rq => M.game_invite(rq.user, rq.body)))

R.post('/game/:id/react', J(rq => M.game_react(rq.user, P(rq, 'id'), rq.body)))

// R.post('/game/:id/resign', J(rq => M.game_resign(rq.user, P(rq, 'id'))))
R.post('/game/:id/rematched/:rematch', J(rq => M.game_rematch(rq.user, P(rq, 'id'), P(rq, 'rematch'))))

R.get('/profile/:name', J(rq => M.profile(rq.user, P(rq, 'name'))))
// R.post('/profile', J(rq => M.profile_set(rq.user, rq.body)))

R.get('/pair/:user_1/:user_2', J(rq => M.pair_stats(rq.user, P(rq, 'user_1'), P(rq, 'user_2'))))

R.get('/challenge', J(rq => M.set_challenge_hash(rq.user)))
R.post('/challenge', J(rq => M.set_challenge_hash(rq.user, rq.body)))
R.get('/challenge/:id', J(rq => M.get_challenge_user(rq.user, P(rq, 'id'))))

export default {
    routes: R,
    model: M,
}
