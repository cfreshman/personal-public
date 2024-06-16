import db from '../../db';
import { entryMap } from '../../util';
import ioUtils from '../../io';


const names = {
    q: 'q',
        // space: string
        // name: string
        // key: string?
        // allow: string? in { get, add, del }
        // list: [{ i: number, msg: string }]
}
const C = entryMap(names, name => () => db.collection(name));
function blank(query, reset=false) {
    const { space, name, key } = query
    return {
        space, name, key,
        n: reset ? 0 : (query.n ?? 0),
        list: []
    }
}
function clean(q, query) {
    delete q._id
    q.key = !!q.key
    if (!q.key) delete q.key
    // delete q.key
    delete q.n
    if (query.view) q.list = q.list.length
    return q
}

// setTimeout(async () => {
//     const guestbook = await C.q().findOne({ space: 'cyrus', name: 'guestbook' })
//     console.debug(guestbook)
//     guestbook.list.forEach(item => {
//         if (/ Z\+(\d+)"/.test(item.msg)) {
//             item.msg = item.msg.replace(/ Z\+(\d+)"/, ' Z-$1"')
//         } else {
//             item.msg = item.msg.replace(/ Z-(\d+)"/, ' Z+$1"')
//         }
//     })
//     console.debug(guestbook)
//     await C.q().updateOne({ space: 'cyrus', name: 'guestbook' }, { $set: guestbook }, { upsert: true })
// })


async function get(query) {
    const { space, name, key, lock, action, allow } = query
    const q = (await C.q().find({ space, name }).project({_id:0}).next())
        || blank(query)

    // if key required, return if action not allowed
    if (q.key && key != q.key && (!q.allow || !q.allow.includes(action))) {
        throw `${space}/${name} requires key`
    }

    // if key provided, can change lock or allowed
    if (!q.key || key == q.key) {
        let updated = false
        if (allow != undefined) {
            q.allow = allow
            updated = true
            console.log(allow)
        }
        if (lock !== undefined) {
            q.key = lock
            if (!lock) q.allow = undefined
            query.key = lock
            updated = true
        }
        updated && (await update(q))
    }

    return q
}
async function update(q) {
    const { space, name } = q
    const current = await C.q().find({ space, name }).project({_id:0}).next()
    if (current && q.list) {
        if (current.list?.map(m => m.i).join() !== q.list.map(m => m.i).join()) {
            ioUtils.inst().in('q').emit('q', `/${space}/${name}`)
        }
    }
    return await C.q().updateOne({ space, name }, { $set: q }, { upsert: true })
}

let promise
let internal = []
function reschedule() {
    promise = new Promise(r=>r())
    internal.forEach(() => {
        promise = promise
            .then(internal.pop())
            .catch(reschedule)
    })
}
reschedule()
async function queue(cmd) {
    return await new Promise(resolve => {
        internal.push(async () => resolve(await cmd()))
        promise = promise
            .then(internal.pop())
            .catch(reschedule)
    })
}

async function add(query, msg) {
    // console.log(msg)
    if (msg === undefined) throw `${query.space}/${query.name} msg is undefined}`
    return await queue(async () => {
        let q = await get(query)
        q.list = q.list.concat({ i: q.n, t: Date.now(), msg })
        q.n += 1
        await update(q)
        return clean(q, query)
    })
}
async function del(query, i) {
    return await queue(async () => {
        let q = await get(query)
        console.debug('[QUEUE:DEL]', i, query)
        // 'i' can take the form 1,3-6,8
        String(i).split(',').filter(part=>part).forEach(part => {
            let ends = part.split('-').map(Number)
            if (ends.length === 1) ends.push(ends[0])
            let start = 0
            while (start < q.list.length && q.list[start].i < ends[0]) start += 1
            if (start < q.list.length) {
                let end = start
                while (end < q.list.length && q.list[end].i <= ends[1]) end += 1
                q.list.splice(start, end - start)
            }
        })
        await update(q)
        return clean(q, query)
    })
}
// async function lock(query, key) {
//     return await queue(async () => {
//         let q = await get(query)
//         q.key = key
//         await update(q)
//         return clean(q, query)
//     })
// }

const POLL_MAX_MS = 30_000
const POLL_TRY_MS = 100
function sleep(ms) { return new Promise(res => setTimeout(res, ms)) }
async function _poll(query, getQ) {
    const start = Date.now()
    let q = await getQ()
    const check_ms = Math.min(POLL_MAX_MS, query.ms ?? POLL_MAX_MS) - POLL_TRY_MS
    while (q.list.length == 0 && Date.now() - start < check_ms) {
        await sleep(POLL_TRY_MS)
        q = await getQ()
    }
    return clean(q, query)
}
async function poll(query) {
    return await _poll(query, () => get(query))
}
async function flush(query) {
    return await _poll(query, () => queue(async () => {
        const q = await get(query)
        if (q.list.length > 0) await update(blank(q))
        return q
    }))
    // return await queue(async () => {
    //     const q = await get(query)
    //     await update(blank(q))
    //     return q
    // })
}

async function handle(query, i, msg) {
    let q
    if (i !== undefined) {
        q = await del(query, i)
    }
    if (msg !== undefined) {
        q = await add(query, msg)
    }
    if (query.ms) {
        q = await poll(query)
    }
    if (q === undefined) {
        q = await get(query)
    }
    return clean(q, query)
}

export {
    names,
    get,
    flush,
    poll,

    add,
    del,
    // lock,

    handle,

    POLL_MAX_MS,
};