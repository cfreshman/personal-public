import db from '../../db';
import ioM from '../../io';

const name = 'graffiti';
// hash: string
// dataUrl: string

// setInterval(() => {
//     del('~/home')
// }, 3 * 60 * 60 * 1000) // clear homepage every 3 hours

async function get(hash) {
    return (await db.collection(name).findOne({ hash })) || { hash };
}

async function set(hash, dataUrl) {
    await db.collection(name).updateOne({ hash }, { $set: { dataUrl } }, { upsert: true })
    ioM.inst().to(name).emit(`${name}:update`, hash)
    return { success: true }
}

async function del(hash) {
    await db.collection(name).deleteMany({ hash })
    return { success: true }
}

export {
    name,
    get,
    set,
    del,
};