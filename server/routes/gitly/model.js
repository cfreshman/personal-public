import { ObjectId } from 'mongodb';
import * as util from '../../util';
import db from '../../db';
import { entryMap } from '../../util';
import { randAlphanum } from '../../rand';

const names = {
    ly: 'gitly',
        // user: string
        // hash: string - at very least, this will redirect
        // short: string - git.nn.fo/<short>, consists of <repo>/<hash>
        // url: string - e.g. https://github.com/adafruit/Adafruit-PN532/blob/master/examples/ntag2xx_updatendef/ntag2xx_updatendef.ino

        // org: string
        // repo: string
        // branch: string
        // path: string
        // file: string
}
const C = entryMap(names, name => () => db.collection(name));

async function _get(hash, short, url) {
    return await C.ly().findOne({ $or: [{hash}, {short}, {url}] })
}
async function _update(user, hash, props) {
    if (props.hash && hash !== props.hash) throw `${props.hash} can't update ${hash}`

    const ly = (await _get(hash)) || { user, hash }
    if (ly.user && ly.user !== user) throw `${hash} already exists`
    ly.user = user

    Object.assign(ly, props)
    await C.ly().updateOne({ hash }, { $set: ly }, { upsert: true })
    return ly;
}

async function all(user) {
    return { list: await C.ly().find({ user }).toArray() }
}
async function get(_, short) {
    return { ly: await _get(false, short) }
}
async function create(user, { hash, url }) {
    hash = hash || randAlphanum(7)
    if (await _get(hash, false, url)) throw `${hash} already exists`
    const match = /github.com\/(?<org>[^\/]*)\/(?<repo>[^\/]*)\/blob\/(?<branch>[^\/]*)\/(?<path>.*)\/(?<file>[^\/#]*)/.exec(url)?.groups
    if (!match) throw `unexpected url. make sure you're linking to a file on github`
    console.log(url, match)
    const short = `${match.repo}/${hash}`
    return {
        ly: await _update(user, hash, {
            user,
            hash,
            short,
            url,
            org: match.org,
            repo: match.repo,
            branch: match.branch,
            path: match.path,
            file: match.file,
        })
    }
}
async function remove(user, hash) {
    return { ly: await _update(user, hash, { user: undefined }) }
}

export {
    names,
    all,
    get,
    create,
    remove,
};
