import db from '../../db';
import io from '../../io';
import { entryMap } from '../../util';

const C = db.of({
    note: 'note'
        // user: string
        // id: string
})

async function get_or_set(user, note_id) {
    const entry = await C.note().findOne({ user, id:note_id })
    if (!entry) await C.note().insertOne({ user, id:note_id })
    return !!entry
}

export {
    get_or_set,
}