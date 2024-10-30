import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.get('/(:id)?', J(rq => M.get(rq.user, P(rq, 'id'))))
R.post('/(:id)?', J(rq => M.update(rq.user, P(rq, 'id'), rq.body)))

export default {
    routes: R,
    model: M, ...M,
    io: (io, socket, info) => {
        socket.on('graffiti-2:get', async (hash) => {
            const { data } = await M.get(undefined, hash)
            socket.emit(`graffiti-2:${hash}:update`, data)
        })
        socket.on('graffiti-2:set', async (hash, image) => {
            await M.update(undefined, hash, {image})
        })
    }
}
