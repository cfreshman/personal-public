import db from '../../db';
import { entryMap, remove } from '../../util';
import { model as login } from '../login';
import notify from '../notify';
import profile from '../profile';
import { randAlphanum } from '../../rand';

const names = {
    reset: 'reset',
        // user: string
        // token: string
}
const C = entryMap(names, name => () => db.collection(name));

async function _get(user) {
    let reset = (await C.reset().findOne({ user })) || {};
    return { reset }
}
async function _update(user, props) {
    if (props.user && user !== props.user) throw `${props.user} can't update ${user}`
    let { reset } = await _get(user);
    Object.assign(reset, props);
    C.reset().updateOne({ user }, { $set: props }, { upsert: true });
    return { reset };
}

async function request(user) {
    let token = randAlphanum(7)
    _update(user, { token })
    const { success } = await notify.send(
        user, 'reset', `password reset`, `freshman.dev/reset/${user}#${token}`)
    console.log('[RESET:success]', success)
    if (!success) {
        console.log(await profile._get(user))
        throw `no email found`
    }
    return { success }
}

async function user(user, pass) {
    return login.setPass(user, pass)
}

async function token(user, token, pass) {
    console.log('token', user, token, pass)
    let { reset } = await _get(user);
    if (reset.token === token) {
        _update(user, { token: false })
        return login.setPass(user, pass)
    }
}

export {
    names,
    user,
    request,
    token,
};