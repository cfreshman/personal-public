import db from '../../db'
import io from '../../io'
import { named_log } from '../../util'

const { rand, duration } = window

const name = 'poll'
const log = named_log(name)
const C = db.of({
    poll: 'poll',
        // id: string,
        // t: number,
        // d: number,
        // question: string,
        // items: string[],
        // votes: number[],
        // color: string,
})

async function id() {
    let id
    do {
        id = rand.alphanum(12)
    } while (await C.poll().findOne({ id }))
    return { id }
}

async function get(id) {
    const data = await C.poll().findOne({ id })
    delete data._id
    return { data }
}
async function set(data) {
    await C.poll().updateOne({ id:data.id }, { $set:data }, { upsert:true })
    io.update(`poll:${data.id}`, data)
    return { success:true }
}

async function create() {
    const data = {
        ...(await id()),
        t: undefined,
        d: duration({ d:1 }),
        question: '',
        items: ['', ''],
        votes: undefined,
        color: '#ffffff',
    }
    await set(data)
    return { data }
}
async function vote(id, i) {
    const { data } = await get(id)
    data.votes[i]++
    await set(id, { data })
    return { success:true, data }
}

export {
    name, C,
    id, get, set,

    create,
    vote,
}
