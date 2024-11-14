import db from '../../db'
import { named_log } from '../../util'
import io from '../../io'

const name = 'template'
const log = named_log(name)
const C = db.of({
    tly: 'tly',
        // user: string-user
        // t: number-date
        // terms: { [term]: { [string-YMD]:number }[] }
        // on: { [term]: string-YMD }
        // - a term that is on by default
        // 
        // color?: string
        // - custom tally color
        // dark?: boolean
        // hidden: { [term]:true }
})

async function _get(user) {
    const data = {
        user,
        terms: {},
        on: {},
        hidden: {},
        ...(await C.tly().findOne({ user }) || {}),
    }
    delete data._id
    return data
}
async function get(viewer) {
    const data = await _get(viewer)
    return { data }
}
async function set(viewer, {data}) {
    data.t = data.t || Date.now()
    await C.tly().updateOne({ user: viewer }, { $set: data }, { upsert: true })
    io.update(`tly:${viewer}`, data.t)
    return { success:true }
}

export {
    name, C,
    get, set,
}
