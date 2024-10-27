import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.post(`/:id`, J(rq => M.get(rq.user, P(rq, 'id'))))
R.post(`/:id/set`, J(rq => M.set(U(rq), rq.body)))

R.post(`/:id/pledge`, J(rq => M.pledge(P(rq, 'id'), rq.body)))

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
