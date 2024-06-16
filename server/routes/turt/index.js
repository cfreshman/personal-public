import express from 'express';
import * as util from '../../util';
import model from './model';

let routes = express.Router();
routes.get('/random/', (req, res) => {
    model.random(1)
        .then(data => res.json(data[0]))
        .catch(err => res.json(err));
});
routes.get('/random/:count', (req, res) => {
    model.random(Number(req.params.count))
        .then(data => res.json(data))
        .catch(err => res.json(err));
});

export default {
    routes: util.genModelRoutes(model, routes),
    model
}
