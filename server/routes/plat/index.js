import express from 'express'
import * as M from './model'
import { J, P, U } from '../../util'

const name = M.name
const R = express.Router()

R.get('/', J(rq => M.get(U(rq))))
R.post('/', J(rq => M.set(U(rq), rq.body)))

R.post('/open', J(rq => M.open(U(rq), rq.body)))

R.post('/count', J(rq => M.count(rq.body)))

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
