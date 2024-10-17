import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.get('/', J(rq => M.get(rq.user)))
R.post('/', J(rq => M.set(U(rq), rq.body)))
R.post('/taken', J(rq => M.taken_fruit(rq.user, rq.body)))
R.post('/fruit', J(rq => M.add_fruit(U(rq), rq.body)))
R.post('/sell', J(rq => M.sell(U(rq), rq.body)))
R.get('/market', J(rq => M.market(rq.user)))
R.get('/buy/:id', J(rq => M.buy(U(rq), P(rq, 'id'))))
R.get('/board', J(rq => M.board(rq.user)))

export default {
    routes: R,
    model: M, ...M,
    // io: (io, socket, info) => {
    //     socket.on(`${name}:join`, () => socket.join(name))
    //     const leave = () => socket.leave(name)
    //     socket.on(`${name}:leave`, leave)
    //     socket.on('disconnect', leave)
    // }
}
