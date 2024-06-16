import db from '../../db'
import { list, named_log, randAlphanum } from '../../util'

const name = 'printgames'
const log = named_log(name)
const C = db.of({
    printgames: 'printgames',
        // id: string-id
        // name: string,
        // url: string,
        // description: string,
        // submit: string,
        // media: any[],
        // color?: string,
})

async function all(viewer) {
    log('[all]', {viewer})
    return {
        list: await db.list(C.printgames)
    }
}

async function edit(viewer, { item }) {
    log('[edit]', {viewer, item})

    // reject if required info not complete
    if (list('name url description').some(key => !item[key])) {
        throw `missing required field`
    }

    if (!item.id) {
        // reject if already submitted
        if (await db.has(C.printgames, { url: item.url })) {
            throw 'url already submitted'
        }
        // reject if user has already submitted 10 games
        const list = await db.list(C.printgames, { submit: viewer })
        if (list.length >= 10) {
            throw 'max 10 submissions'
        }
    } else {
        const existing = await db.item(C.printgames, { id:item.id })
        if (existing.submit !== viewer) {
            throw `not the submitter`
        }
    }

    item = {
        ...item,
        id: item.id || randAlphanum(12),
        t: item.t || Date.now(),
        submit: viewer,
    }
    await C.printgames().updateOne({ id:item.id }, { $set:item }, { upsert:true })

    return {
        item: await db.item(C.printgames, { id:item.id }),
    }
}

async function del(viewer, id) {
    log('[del]', {viewer, id})

    const existing = await db.item(C.printgames, { id })
    if (existing.submit !== viewer) {
        throw `not the submitter`
    }

    await C.printgames().deleteOne({ id })
    return {
        success: true,
    }
}

export {
    name, C,
    all,
    edit,
    del,
}
