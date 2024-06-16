import express from 'express'
import * as M from './model'
import { J, P, pick } from '../../util'


const R = express.Router()

const state = (req, res, next) => {
    req.resolve = ['item.state']
    req.url = req.url.replace('/state', '')
    console.debug('resolve state', pick(req, 'resolve url'))
    next('route')
}
R.get('/state/*', state)
R.post('/state/*', state)

const add = async rq => M.add(
    rq.user,
    P(rq, 'space'),
    P(rq, 'name'))
R.get('/add/:space?/:name', J(add))
R.post('/add/:space?/:name', J(add))

const on = async rq => M.on(
    rq.user,
    P(rq, 'space'),
    P(rq, 'name'))
R.get('/on/:space?/:name', J(on))
R.post('/on/:space?/:name', J(on))

const off = async rq => M.off(
    rq.user,
    P(rq, 'space'),
    P(rq, 'name'))
R.get('/off/:space?/:name', J(off))
R.post('/off/:space?/:name', J(off))

const toggle = async rq => M.toggle(
    rq.user,
    P(rq, 'space'),
    P(rq, 'name'))
R.get('/toggle/:space?/:name', J(toggle))
R.post('/toggle/:space?/:name', J(toggle))

const logic = async rq => M.logic(
    rq.user,
    P(rq, 'space'),
    P(rq, 'name'),
    P(rq, 'gate'),
    P(rq, 'inputs'))
R.get('/logic/:space?/:name', J(logic))
R.post('/logic/:space?/:name', J(logic))

const lock = async rq => M.lock(
    rq.user,
    P(rq, 'space'))
R.post('/lock/:space', J(lock))
R.post('/lock/:space', J(lock))

const unlock = async rq => M.unlock(
    rq.user,
    P(rq, 'space'))
R.delete('/lock/:space', J(unlock))
R.get('/unlock/:space', J(unlock))
R.post('/unlock/:space', J(unlock))

R.get('/all/:space', J(async rq => M.all(rq.user, P(rq, 'space'))))
R.get('/:space?/:name', J(async rq => M.get(rq.user, P(rq, 'space'), P(rq, 'name'))))
R.delete('/:space?/:name', J(async rq => M.reset(rq.user, P(rq, 'space'), P(rq, 'name'))))

export default {
    routes: R,
     model: M, ...M,
}
