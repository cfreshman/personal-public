import express from 'express'
import * as M from './model'
import { J, P, U } from '../../util'
import db from '../../db'

const R = express.Router()

R.post('/day', J(rq => M.day(rq.user, P(rq, 'day'))))

R.post('/recipe', J(rq => M.create(rq.user, rq.body)))
R.get('/recipe', J(rq => M.suggestions(rq.user)))
R.post('/recipe/:id/made', J(rq => M.made(rq.user, rq.params.id, rq.body)))
R.delete('/recipe/:id', J(rq => M.remove(rq.user, rq.params.id)))

// new, yes, no, back support swipes before login
R.post('/recipe/new/:id', J(rq => M.open(rq.user || rq.body.temp, rq.params.id)))
R.post('/recipe/new', J(rq => M.random(rq.user || rq.body.temp)))
R.post('/recipe/yes', J(rq => M.yes(rq.user || rq.body.temp)))
R.post('/recipe/no', J(rq => M.no(rq.user || rq.body.temp)))
R.post('/recipe/back', J(rq => M.back(rq.user || rq.body.temp)))

R.get('/recipe/count', J(rq => db.simple.get('dinder-user-recipe-count')))
R.get('/recipe/:id', J(rq => M.recipe(rq.params.id)))

R.get('/matches', J(rq => M.matches(rq.user)))
R.get('/match/:id?', J(rq => M.match(rq.user, rq.params.id)))
R.delete('/match/:id', J(rq => M.unmatch(rq.user, rq.params.id)))

R.post('/match/:id/vote', J(rq => M.vote(rq.user, P(rq, 'id'), P(rq, 'vote'))))
R.post('/match/:id/postpone', J(rq => M.postpone(rq.user, P(rq, 'id'), P(rq, 'vote'))))
R.get('/filter', J(rq => M.filter(rq.user)))
R.post('/filter', J(rq => M.filter(rq.user, P(rq, 'categories') || [P(rq, 'category')])))
R.delete('/filter', J(rq => M.resetFilter(rq.user)))

R.get('/tags', J(rq => M.tags(rq.user)))
R.post('/tags', J(rq => M.tags(rq.user, P(rq, 'tags'))))

export default {
    routes: R,
    model: M, ...M,
}
