import db from '../../db'
import io from '../../io'
import { named_log } from '../../util'

const name = 'chess'
const log = named_log(name)
const C = db.of({
    chess: 'chess',
        // id: string-id
        // ...state
    // chess_user: 'chess_user',
    //     // user: string-user
    //     // rooms: { string-id:true }
})

async function get(viewer, id) {
    const state = await C.chess().findOne({ id })
    log('get', {viewer, id}, !!state)
    if (state) {
        delete state._id
    }
    return { state }
}
async function set(viewer, id, { state }) {
    log('set', {viewer, id})
    await C.chess().updateOne({ id }, { $set:{ ...state, id } }, { upsert:true })
    io.inst().to(`chess:${id}`).emit(`chess:${id}:update`, state)
    return { state }
}

export {
    name, C,
    get, set,
}
