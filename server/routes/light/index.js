import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.post(`/user/:id`, J(rq => M.user_get(rq.user, P(rq, 'id'))))

R.post(`/post/:id`, J(rq => M.post_get(rq.user, P(rq, 'id'))))
R.post(`/post`, J(rq => M.post_create(U(rq), rq.body)))
R.post(`/post/:id/edit`, J(rq => M.post_edit(U(rq), P(rq, 'id'), rq.body)))
R.post(`/post/:id/like`, J(rq => M.post_like(U(rq), P(rq, 'id'))))
R.post(`/post/:id/delete`, J(rq => M.post_delete(U(rq), P(rq, 'id'))))
R.post(`/post/:id/permadelete`, J(rq => M.post_permadelete(U(rq), P(rq, 'id'))))
R.post(`/post/:id/pin`, J(rq => M.post_pin(U(rq), P(rq, 'id'))))

R.post(`/posts`, J(rq => M.posts_get(rq.user, rq.body.ids)))

R.post(`/`, J(rq => M.home(rq.user)))
R.post(`/feed/friends`, J(rq => M.friends(U(rq))))

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
