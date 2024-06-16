import express from 'express';
import * as model from './model';
import { J, P, U } from '../../util';
import { OAuth2Client } from 'google-auth-library';

export const routes = express.Router();
export { model }
routes.post('/', J(req => {
    let { user, pass, } = req.body;
    // console.log(user, pass);
    return model.login(user, pass);
}));
routes.post('/token', J(req => {
    let { user, token, } = req.body
    return model.token(user, token)
}))
routes.post('/signup', J(req => {
    let { user, pass, info, options } = req.body;
    // console.log(user, pass);
    return model.signup(user, pass, info, options);
}));
routes.post('/verify', J(req => {
    let { user, token, tz } = req.body;
    return model.check(user, token, tz);
}));
routes.post('/accept', J(req => model.accept(U(req), req.body)))

async function exists(user) {
    try {
        return !!(await model.get(user))
    } catch {
        return false
    }
}

routes.get('/google-precheck/:username', J(async rq => ({ exists: await exists(P(rq, 'username')) })))
routes.post('/google', J(async rq => {
    const { user, client_id='1033547890894-k2liippvrka0q7j9vf5g7d26k050iu7m.apps.googleusercontent.com', jwt, info, options } = rq.body
    console.debug('[login] [google]', { client_id, jwt, user, info, options })
    const client = new OAuth2Client(client_id)
    const ticket = await client.verifyIdToken({
        idToken: jwt,
        audience: client_id,
    })
    const payload = ticket.getPayload()
    console.debug('[login] google payload', payload)

    if (await exists(user)) {
        return model.login(user, payload.email)
    } else {
        return model.signup(user, payload.email, info, { ...options, type:'google' })
    }
}))

async function auth(rq) {
    let user = rq.header('X-Freshman-Auth-User') ?? rq.query.user;
    let token = rq.header('X-Freshman-Auth-Token') ?? rq.query.token;
    if (user && token) {
        let result = await model.check(user, token);
        if (result.ok) return user;
    }
    return false;
}
async function authIo(data) {
    let { user, token } = data
    if (user && token) {
        let result = await model.check(user, token);
        if (result.ok) return user;
    }
    return false;
}
function preAuth(rq) {
    let user = rq.header('X-Freshman-Auth-User') ?? rq.query.user
    let token = rq.header('X-Freshman-Auth-Token') ?? rq.query.token
    if (user !== undefined) {
        if (user && token && model.preCheck(user, token)) {
            rq.user = user
            rq.token = token
            return user
        } else {
            return false
        }
    } else {
        return undefined
    }
}

export default {
    routes, model,
    exists,
    auth,
    authIo,
    preAuth,
};