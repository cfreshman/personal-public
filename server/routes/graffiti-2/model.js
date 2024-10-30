import db from '../../db'
import io from '../../io'
import { named_log } from '../../util'

const name = 'graffiti-2'
const log = named_log(name)
const C = db.of({
   graffiti: 'graffiti_2',
   // id:string
   // image:string
})

async function get(viewer, id) {
   const data = await C.graffiti().findOne({ id }) || { id }
   return { data }
}
async function update(viewer, id, {image}) {
   const data = { id, image }
   await C.graffiti().updateOne({ id }, { $set:data }, { upsert: true })
   io.update(`graffiti-2:${id}`, data)
   return { success: true }
}

export {
    name, C,
    get,
    update,
}
