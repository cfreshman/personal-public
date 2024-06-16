import db from '../../db';
import { entryMap, pick } from '../../util';
import { randAlphanum } from '../../rand';
import { send } from '../mail';

const names = {
    requests: 'requests'
        // user: string
        // type: string
        // t: Date
        // id: string
        // data?: any
}
const C = entryMap(names, name => () => db.collection(name));

const Request = {
    DELETE: 1,
    DOWNLOAD: 2,
}

// db.queueInit(() => C.requests().deleteMany({}))

async function _insert(entry) {
    const id = randAlphanum(16)
    await C.requests().insertOne({ ...entry, t: new Date(), id })
    send(
        'freshman.dev',
        'cyrus+contact@freshman.dev',
        `[ADMIN REQUEST] ${entry.type} ${entry.user}`,
        JSON.stringify(entry, 0, 2),
        `cyrus@freshman.dev`,
    )
    return id
}

async function download(user) {
    if (!user) throw 'user not signed in'
    return { id: await _insert({ user, type: Request.DOWNLOAD }) }
}

async function remove(user) {
    if (!user) throw 'user not signed in'
    return { id: await _insert({ user, type: Request.DELETE }) }
}

export {
    names,
    download,
    remove,
};