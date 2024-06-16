import express from 'express'
import * as M from './model'
import { J, U, P } from '../../util'

const R = express.Router()
R.get('/', J(rq => M.get( U(rq) )))
R.post('/', J(rq => M.update( U(rq), rq.body)))
R.post('/unhide', J(rq => M.unhide( U(rq) )))
R.post('/hide', J(rq => M.bulk_hide( U(rq), P(rq, 'hidden') )))
R.post('/:term/hide', J(rq => M.hide( U(rq), P(rq, 'term') )))
R.post('/:term/unhide', J(rq => M.unhide( U(rq), P(rq, 'term') )))
R.post('/:term/rename/:to', J(rq => M.rename( U(rq), rq.params.term, rq.params.to)))
R.post('/:term/toggle', J(rq => M.toggle( U(rq), rq.params.term)))
R.post('/:term/toggle/:to?', J(rq => M.toggle( U(rq), rq.params.term, rq.params.to)))
R.put('/:term', J(rq => M.create( U(rq), rq.params.term)))
R.post('/:term/:date', J(rq => M.tally( U(rq), rq.params.term, rq.params.date)))
R.delete('/:term', J(rq => M.remove( U(rq), rq.params.term)))


export default {
    routes: R,
    model: M, ...M,
}
