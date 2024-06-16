import { entryMap, named_log, unpick } from '../../util'
import db from '../../db'

const log = named_log('fishbowl model')

const names = {
    room: 'fishbowl_room'
        // id string
        // version number
        // host string-session
        // settings { slips:number players:number seconds:number teams:number extra:boolean }
        // slips string[]
        // players { id:string-session joined:boolean slips:number-slip[] }[]
        // teams { i:number slips:number-slip[] points:number[] color:string-color }
        // round number
        // turn number
        // start number
        // guessed string[]
}
const C = entryMap(names, name => () => db.collection(name))
setTimeout(async () => {
}, 3000)

async function _get(id) {
    // log('_get', id)
    return unpick(await C.room().findOne({ id }), '_id')
}
async function _set(room) {
    // log('_set', room)
    // log('_set', room.id)
    return await C.room().updateOne({ id:room.id }, { $set:room }, { upsert:true })
}

async function get_room(id) { return { room: await _get(id) } }

export {
    names, C,
    _get, _set,
    get_room,
}