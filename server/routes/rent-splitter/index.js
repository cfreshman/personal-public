import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.get('/profile', J(rq => M.profile(U(rq))))
R.get('/:id', J(rq => M.get(P(rq, 'id'))))
R.post('/', J(rq => M.edit(rq.user || P(rq, 'token'), rq.body)))
R.post('/join', J(rq => M.join(rq.body)))
R.post('/:token', J(rq => M.edit(P(rq, 'token'), rq.body)))
R.delete('/:id', J(rq => M.del(U(rq), P(rq, 'id'))))

export default {
    routes: R,
    model: M, ...M,
    io: (io, socket, info) => {
        socket.on(`${name}:join`, () => {
            log('joined room')
            socket.join(name)
        })
        const leave = () => socket.leave(name)
        socket.on(`${name}:leave`, leave)
        socket.on('disconnect', leave)
    }
}
