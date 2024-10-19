import db from '../../db'
import { named_log } from '../../util'
import notify from '../notify'

const name = 'recurder'
const log = named_log(name)
const C = db.of({
    recurder: 'recurder',
        // user: string-user
        // reminders: reminder[]
})

// once per day, set all timeouts
let timeouts
const d_24_hr = 24 * 60 * 60 * 1000
const tick = async () => {
    timeouts?.map(x => clearTimeout(x))
    timeouts = []
    const datas = [...await C.recurder().find().toArray()]
    // log('recurder', datas)
    const now = Date.now()
    await Promise.all(datas.map(async data => {
        let groups = {}
        const { reminders } = data
        reminders.map(x => {
            if (!x.active) return
            // let ms_till_remind = Math.max(0, x.t + x.d - now)
            let ms_till_remind = x.t + x.d - now
            while (ms_till_remind < 0) ms_till_remind += d_24_hr
            // log('recurder reminder', ms_till_remind, data.user, x.label)
            // timeouts.push(setTimeout(async () => {
            //     await notify.send([data.user], 'recurder', `${x.label}`, `freshman.dev/recurder`)
            // }, ms_till_remind))
            if (!groups[ms_till_remind]) groups[ms_till_remind] = []
            groups[ms_till_remind].push(x.id)
        })
        // log({ groups })
        Array.from(Object.entries(groups)).map(([k, group]) => {
            const group_set = new Set(group)
            timeouts.push(setTimeout(async () => {
                const { data:inner_data } = await get(data.user)
                const group_reminders = inner_data.reminders.filter(x => group_set.has(x.id) && x.active)
                if (group_reminders.length) {
                    await notify.send([data.user], 'recurder', group_reminders.map(x => x.label).join(', '), `freshman.dev/recurder`)
                }
            }, Number(k)))
        })
    }))
}
db.queueInit(async () => {
    setTimeout(() => {
        log('tick')
        tick()
        setInterval(tick, d_24_hr)
    })
}, 10_000)

async function get(viewer) {
    log('get', {viewer})
    const data = (await C.recurder().findOne({ user:viewer })) || {
        user: viewer,
        reminders: [],
    }
    return { data }
}
async function set(viewer, { data }) {
    log('set', {viewer})
    data.user = viewer
    delete data._id
    await C.recurder().updateOne({ user:viewer }, { $set:data }, { upsert:true })
    return { success:true }
}

export {
    name, C,
    get, set,
}
