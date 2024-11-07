import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.post('/profile/get', J(rq => M.get_user(U(rq))))
R.post('/profile/posts', J(rq => M.get_user_posts(U(rq))))
R.post('/post/add', J(rq => M.add_post(U(rq), rq.body)))
R.post('/post/get', J(rq => M.get_post(rq.user, rq.body)))
R.post('/posts/get', J(rq => M.get_posts(rq.user, rq.body)))
R.post('/post/like', J(rq => M.like_post(U(rq), rq.body)))
R.post('/post/delete', J(rq => M.delete_post(U(rq), rq.body)))

export default {
    routes: R,
    model: M, ...M,
}
