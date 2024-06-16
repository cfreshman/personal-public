import { ObjectId } from 'mongodb';
import * as util from '../../util';
import db from '../../db';

const name = 'turt';

async function random(count) {
    const quotes = await db.collection(name).aggregate([
        { "$sample": { "size": count } }
    ]).toArray()
    console.log(quotes)
    return quotes
    // return db.collection(name).aggregate([
    //     { "$sample": { "size": count } }
    // ]).toArray();
}

const get = util.genGet(name);

async function create(params) {
    let result = await db.collection(name).insertOne({
        content: params.content,
        author: params.author
    });
    return get(result.insertedId);
}

async function update(id, updatedTurt) {
    updatedTurt._id = ObjectId(updatedTurt._id);
    return db.collection(name).replaceOne(
        { _id: ObjectId(id) },
        { $set: updatedTurt }
    );
}

export default {
    name,
    get,
    create,
    update,
    random
};