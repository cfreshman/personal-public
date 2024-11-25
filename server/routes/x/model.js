import db from '../../db'
import { isProduction, named_log } from '../../util'
import file from '../file'
import { url_for_data_url } from '../integrations'
const { rand, duration, datetimes } = window


const name = 'x'
const log = named_log(name)
const C = db.of({
    x: 'x',
    // id: string-id
    // t: number
    // path: string
})

async function store({ id, html }) {
    const path = `x-${id}.html`
    file.write(path, html)
    const item = {
        id,
        t: Date.now(),
        path,
    }
    log('store', item)
    await C.x().updateOne({ id }, { $set:item }, { upsert:true })
    return { data:item }
}

async function get(id) {
    const data = await C.x().findOne({ id })
    return { data }
}

async function icon(id, dataurl) {
    const data = await C.x().findOne({ id })
    data.icon = dataurl ? (isProduction() ? 'https://freshman.dev' : 'http://localhost:5050') + url_for_data_url(dataurl) : undefined
    await C.x().updateOne({ id }, { $set:{ icon:data.icon } })
    return { data }
}

async function del(id) {
    const { deletedCount } = await C.x().deleteOne({ id })
    return { success:!!deletedCount }
}

export {
    name, C,
    store,
    get,
    icon,
    del,
}
