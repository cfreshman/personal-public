import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.get('/', J(rq => M.all(rq.user)))

export default {
    routes: R,
    model: M, ...M,
    io: (io, socket, info) => {
        socket.on(`${name}:join`, () => socket.join(name))
        const leave = () => socket.leave(name)
        socket.on(`${name}:leave`, leave)
        socket.on('disconnect', leave)
    }
}
