import db from '../../db';
import io from '../../io';
import { entryMap } from '../../util';

const names = {
    default: 'cost',
        // id: string,
        // t: number
        // dollars: number
        // name: string
        // data: any
}
const C = entryMap(names, name => () => db.collection(name))

// C.default().deleteMany({})
// add(0, 6, new Date('8/1/22'), 'Maurice Maltbia')
// add(1, 20, new Date('8/29/22'), 'Aluce')

const supporters = Object.fromEntries(['cyrus', 'felicity', 'mwiggin'].map(x => [x, true]))

async function get() {
    // console.log('[COST:get]')
    const list = Array.from(await C.default()
        .find({})
        .project({ _id:0, t:1, dollars:1, name:1 })
        .toArray())
    return {
        list,
        sum: list.reduce((acc, v) => acc + v.dollars, 0),
    }
}

async function supporter(user) {
    return supporters[user] || !!await C.default().findOne({ name:user })
}

async function month(timestamp) {
    const list = Array.from(await C.default()
        .find({})
        .project({ _id:0, t:1, dollars:1, name:1 })
        .toArray())

    const month = new Date(timestamp)
    month.setDate(0)
    month.setHours(0)
    month.setMinutes(0)
    const nextMonth = new Date(month)
    nextMonth.setMonth(month.getMonth() + 1)
    const range = [Number(month), Number(nextMonth)]

    const monthly = list.filter(x => range[0] <= x.t && x.t < range[1])
    return {
        list: monthly,
        sum: monthly.reduce((acc, v) => acc + v.dollars, 0),
        supporters: list.map(x => x.name),
    }
}

async function add(id, dollars, t, name, data) {
    console.log('[COST:add]', id, dollars, t, name, data)
    const payment = {
        id,
        t: t ? Number(t) : new Date(),
        dollars,
        name: name || 'anonymous',
        data,
    }
    await C.default().updateOne({ id }, { $set: payment }, { upsert: true })
    return { success: true }
}

export {
    get,
    supporter,
    month,
    add,
};