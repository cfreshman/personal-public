const express = require('express');
const M = require('./model');
const { J, U } = require('../../util');

const R = express.Router()
R.get('/', J(rq => M.all( rq.user )))
R.get('/:hash', J(rq => M.get( rq.user, rq.params.hash)))
R.put('/', J(rq => M.create( U(rq), rq.body)))
R.post('/:hash', J(rq => M.update( U(rq), rq.params.hash, rq.body)))
R.delete('/:hash', J(rq => M.remove( U(rq), rq.params.hash)))

module.exports = {
    routes: R,
    model: M,
}
