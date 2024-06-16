import db from '../../db'
import { named_log } from '../../util'

const name = 'template'
const log = named_log(name)
const C = db.of({
    [name]: name,
        // id: string-id
})

async function all(viewer) {
    log('all', {viewer})

    const list = Array.from(await C[name]().find({}).toArray())
    return { list }
}

export {
    name, C,
    all,
}
