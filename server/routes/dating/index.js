import fs from 'fs'
import path from 'path'
import express from 'express'
import * as M from './model'
import { J, P, U, named_log, staticPath } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

// UNSECURE
// const template = fs.readFileSync(path.join(staticPath, 'raw/dating/template.html')).toString()
// R.get('/view/:id', async (rq, rs) => {
//     const user = P(rq, 'id')
//     const { data:profile } = await M.profile_get(undefined, user)
//     let html = template
//     // hydrate template
//     html = html.replace('{{user}}', profile.name || '@'+user)
//     html = html.replace('{{bio}}', profile.bio)
//     html = html.replace('{{photos}}', profile.photos.map(({ url, label }) => `<img data-src="${url}" title="${label.replaceAll('\\"', '"').replaceAll('"', '\\"')||''}">`).join(''))
//     rs.send(html)
// })

R.post('/user', J(rq => M.user_get(U(rq))))
R.post('/notify', J(rq => M.user_notify(U(rq))))
R.post('/profile', J(rq => M.profile_set(U(rq), rq.body)))
R.post('/profile/:id', J(rq => M.profile_get(rq.user, P(rq, 'id'))))

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
