import db from '../../db'
import { named_log } from '../../util'
import file from '../file'
const { rand, duration, datetimes } = window


const name = 'beam'
const log = named_log(name)
const C = db.of({
    beam: 'beam',
    // id: string-id
    // t: number
    // d: number
    // path: string
    // name: string
})

const set_expiry = (data) => {
    const ms_till_expiry = data.t + data.d - Date.now()
    setTimeout(async () => {
        file.remove(data.path)
        await C.beam().deleteOne({ id:data.id })
    }, ms_till_expiry)
    log(`will expire ${data.name} (${data.id}) in ${datetimes.durations.pretty(ms_till_expiry)}`)
}
db.queueInit(async () => {
    // delete all older than an hour
    Array.from(await C.beam().find().toArray()).forEach(set_expiry)
}, 10_000)


async function _id() {
    let id
    do {
        id = rand.alphanum(12)
    } while (await C.beam().findOne({ id }))
    return id
}

async function store({ data, name}) {
    const id = await _id()
    const [_, ...ext_parts] = name.split('.')
    const ext = ext_parts.join('.')
    const path = `beam-${id}.${ext}`
    file.write(path, data)
    const item = {
        id: await _id(),
        t: Date.now(),
        d: duration({ h:1 }),
        path,
        name,
    }
    await C.beam().insertOne(item)
    set_expiry(item)
    return { data:item }
}

async function get(id) {
    const data = await C.beam().findOne({ id })
    return { data }
}

export {
    name, C,
    store,
    get,
}
