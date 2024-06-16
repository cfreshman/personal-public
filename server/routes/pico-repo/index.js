import express from 'express'
import * as M from './model'
import { J, U } from '../../util'

const R = express.Router()

R.get('/app', J(rq => M.all(rq.user)))
R.get('/app/:id', J(rq => M.get(rq.user, rq.params.id)))
R.post('/app', J(rq => M.create(U(rq))))
R.post('/app/:id', J(rq => M.edit(U(rq), rq.params.id, rq.body)))
R.delete('/app/:id', J(rq => M.remove(U(rq), rq.params.id)))

R.get('/collection', J(rq => M.getCollection(U(rq))))
R.post('/app/:id/collect', J(rq => M.collect(U(rq), rq.params.id)))
R.delete('/app/:id/collect', J(rq => M.uncollect(U(rq), rq.params.id)))

R.post('/scripts/micropython-uf2/:id/:target', J(rq => 
    M.buildMicroPythonUf2(rq.user, rq.params.id, rq.params.target, rq.body)))
R.get('/scripts/micropython-uf2/:id/:target', (rq, rs) => M.getMicroPythonUf2(rs, rq.params.id, rq.params.target))

R.post('/scripts/micropython-uf2/:target', (rq, rs) => M.serveMicroPythonUf2(rs, rq.params.target, rq.query.name, rq.body))

export default {
    routes: R,
    model: M, ...M,
}
