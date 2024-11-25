import { MongoClient } from 'mongodb';
import { entryMap, remove, resolve, sleep } from '../util';
const { rand } = window

let client;

let _ons = []
function on() {
    return new Promise((resolve, reject) => {
        if (client) resolve(client)
        else _ons.push(resolve)
    })
}

function connect(url, callback) {
    if (client) callback();

    console.log('Connecting to DB', url)
    MongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        // serverSelectionTimeoutMS: 10_000,
    }, (err, result) => {
        const currOns = _ons
        _ons = []
        client = result;
        callback(err);
        currOns.forEach(resolve => resolve(result))
    });
}

function get() {
    return client.db();
}

function collection(name) {
    return client.db().collection(name);
}
function misc() {
    return client.db().collection('misc');
}

function close(callback=()=>{}) {
    if (!client) callback()
    Promise.all(_closeQueue.map(resolve)).then(() => client.close(er => callback(er)))
    _closeQueue = []
}

function of(names) {
    return entryMap(names, name => () => collection(name))
}

const _store = of({
    store: 'store',
    // key: value
})
function store() {
    return _store.store()
}
const simple = {
    get: async (key) => {
        // console.debug('[DB:get]', key)
        return ((await store().findOne({ [key]: { $exists: true } })) ?? {})[key];
    },
    set: async (key, value) => {
        // console.debug('[DB:set]', key)
        return await store().updateOne({ [key]: { $exists: true } }, {
            $set: { [key]: value }
        }, { upsert: true })
    },
}


// queue functions to run synchronously at startup after DB connection
let _initQueue = [] // [{ func, timeout }]
let _initQueueActive = false
const startTime = Date.now()
async function _nextQueuedInit() {
    if (_initQueueActive) return
    _initQueueActive = true
    await on()

    while (_initQueue.length) {
        const next = _initQueue.reduce((max, curr) => curr.timeout < max.timeout ? curr : max)
        const timeout = next.timeout - (Date.now() - startTime)
        if (timeout > 0) {
            setTimeout(_nextQueuedInit, timeout)
            break
        } else {
            _initQueue = remove(_initQueue, next)
            await next.func()
        }
    }
    _initQueueActive = false
}
function queueInit(func, timeout=0) {
    _initQueue.push({ func, timeout })
    _nextQueuedInit()
}

// store non-critical data on db close
let _closeQueue = [] // [func]
function queueClose(func) {
    _closeQueue.push(func)
}

const _resolve_collection = (f_collection) => (typeof f_collection === 'string') ? collection(f_collection) : f_collection()
async function list(f_collection, query={}) {
    return Array.from(await f_collection().find(query).toArray()).map(x => {
        delete x._id
        return x
    })
}
async function has(f_collection, query={}) {
    const collection = _resolve_collection(f_collection)
    return Boolean(await collection.findOne(query))
}
async function item(f_collection, query={}) {
    const collection = _resolve_collection(f_collection)
    return await collection.findOne(query, { _id:0 })
}
async function set(f_collection, query, value) {
    const collection = _resolve_collection(f_collection)
    return await collection.updateOne(query, { $set:value }, { upsert:true })
}


export default {
    on,
    connect,
    get,
    collection,
    misc,
    close,
    of,
    store, simple, kv: simple,
    queueInit,
    queueClose,
    list, has, item, set,
};