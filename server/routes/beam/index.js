import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'
import file from '../file'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.post('/store/:name', J(rq => M.store({ data:rq.body, name:P(rq, 'name') })))
R.post('/get', J(rq => M.get(rq.body.id)))

R.get('/download/:id', async (rq, rs) => {
    const { data } = await M.get(P(rq, 'id'))
    file.send(data.path, rs)
})

export default {
    routes: R,
    model: M, ...M,
}
