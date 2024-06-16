import db from '../../db';
import ioM from '../../io';

const name = 'garden';
// hash: string
// dataUrl: string

async function get(hash) {
    return (await db.collection(name).findOne({ hash })) || { hash };
}

async function set(hash, dataUrl) {
    await db.collection(name).deleteMany({ hash });
    await db.collection(name).insertOne({ hash, dataUrl });
    ioM.inst().to(name).emit(`${name}:update`, hash);
    return { success: true };
}

export {
    name,
    get,
    set,
};