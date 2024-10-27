import db from '../../db'
import { named_log } from '../../util'
import mail from '../mail'
import notify from '../notify'

const name = 'stream-pledge'
const log = named_log(name)
const C = db.of({
    profile: 'sp_profile',
        // user: string-user
        // active: boolean
        // goal: number
        // link: string-url
        // schedule: string
        // decoration: string-emoji
        // pledges: { email:string, sent:boolean }[]
})

const _clean_profile = (data, viewer=undefined) => {
    delete data._id
    if (viewer !== 'site') {
        delete data.pledges // can only be accessed by server
    }
}

async function get(viewer, user) {
    const self = viewer === user
    const data = {
        user,
        active: false,
        goal: self ? 10 : 0,
        link: self ? `https://www.twitch.tv/${user}` : '',
        schedule: '',
        decoration: '⭐️',
        pledges: [],
        ...(await C.profile().findOne({ user })||{})
    }
    _clean_profile(data, viewer)
    return { data }
}
async function set(viewer, { data }) {
    data.user = viewer
    const { data:existing } = await get('site', viewer)
    data = { ...existing, ...data, active:true }
    await C.profile().updateOne({ user:viewer }, { $set:data }, { upsert:true })
    _clean_profile(data, viewer)
    return { success:true, data }
}

async function pledge(user, { email }) {
    const { data } = await get('site', user)
    if (!data.active) throw 'not active'
    const existing = data.pledges.find(x => x.email === email)
    if (!existing) {
        data.pledges.push({ email, sent:false })
        if (data.pledges.length >= data.goal) {
            // send email to users
            data.pledges.map(item => {
                const { email, sent } = item
                if (!sent) {
                    mail.send('freshman.dev', email, `${data.user} has reached their goal!`, `see their stream link and schedule at https://freshman.dev/stream-pledge/${user}`)
                    item.sent = true
                }
            })
            if (data.pledges.length === data.goal) {
                notify.send([user], 'stream-pledge', 'pledge goal hit! confirm your stream link and schedule - and start streaming!', `freshman.dev/stream-pledge/${user}`)
            }
        }
    }
    await C.profile().updateOne({ user }, { $set:data })
    return { success:true }
}

export {
    name, C,
    get, set,
    pledge,
}
