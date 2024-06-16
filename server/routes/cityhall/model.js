import db from '../../db';
import io from '../../io';
import { entryMap } from '../../util';

const names = {
    cityhall: 'cityhall',
        // type: string
        // dataUrl: string
}
const C = entryMap(names, name => () => db.collection(name))

async function get(type) {
    return C.cityhall().findOne({ type })
}

async function update(type, img, key) {
    if (key !== 'woo') throw 'unexpected input'
    await C.cityhall().updateOne({ type }, { $set: {
        dataUrl: img,
        t: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    } }, { upsert: true })
    io.inst().in('cityhall').emit('cityhall:update', type)
    return { success: true }
    // return get();
}

export {
    get,
    update
};