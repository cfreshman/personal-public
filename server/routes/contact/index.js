import express from 'express';
import * as util from '../../util';
import * as model from './model';

const routes = express.Router()
routes.post('/', util.J(rq => model.create(rq.body)))

export default {
    routes,
    model
};