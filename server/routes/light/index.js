import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.post(`/user/:id`, J(rq => M.get_user(rq.user, P(rq, 'id'))))

R.post(`/post/:id`, J(rq => M.get_post(rq.user, P(rq, 'id'))))
R.post(`/post`, J(rq => M.create_post(U(rq), rq.body)))
R.post(`/post/:id/like`, J(rq => M.like_post(U(rq), P(rq, 'id'))))

R.post(`/posts`, J(rq => M.get_posts(rq.user, rq.body.ids)))

R.post(`/`, J(rq => M.home(rq.user)))

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
