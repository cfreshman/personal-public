import db from '../../db'
import { named_log } from '../../util'
import notify from '../notify'

const name = 'template'
const log = named_log(name)
const C = db.of({
    dating_user: 'dating_user',
        // user: string-user
        // notify: boolean
        // profile: string-id
    dating_profile: 'dating_profile',
        // id: string-id
        // user: string-user
        // name: string
        // sex: string
        // birthday: string-date
        // location: { type:"Point", coordinates:[number, number] }
        // sti: string-date
        // bio: string
        // photos: { url:string-url, label:string }[]
        // preferences: { sex:string, age:[number-timedelta, number-timedelta], miles:number|false }
        // hidden: boolean
    dating_match: 'dating_match',
        // users: [string-user, string-user]
        // t: number
        // chat: string
})

async function user_get(viewer, user=viewer) {
    const data = (await C.dating_user().findOne({ user })) || {
        user,
        notify: false,
    }
    if (viewer !== user) {
        delete data.notify
    }
    return { data }
}
async function user_notify(viewer) {
    const { data } = await user_get(viewer)
    data.notify = true
    await C.dating_user().updateOne({ user:viewer }, { $set: data }, { upsert:true })
    notify.send(['cyrus'], 'dating', `new /dating - ${await C.dating_user().count()} total`, `freshman.dev/dating`)
    return { data }
}

async function profile_set(viewer, { data:profile }) {
    if (!profile.id) {
        do {
            profile.id = rand.alphanum(12)
        } while (await C.dating_profile().findOne({ id:profile.id }))
    }
    profile.user = viewer
    await C.dating_profile().updateOne({ id:profile.id }, { $set:profile }, { upsert:true })
    await C.dating_user().updateOne({ user:viewer }, { $set:{ profile:profile.id } })
    return { success:true, data:profile }
}
async function profile_get(viewer, user) {
    const data = {
        user,
        name:undefined,
        sex:undefined,
        birthday: Date.now() - duration({ y:21 }),
        location:undefined,
        sti:undefined,
        bio:undefined,
        photos:[],
        preferences: {
            sex:undefined,
            years_below: 2,
            years_above: 2,
            local: false,
            miles: 15,
        },
        hidden:false,
        
        ...(await C.dating_profile().findOne({ user }) || {})
    }
    data.age = Math.floor((Date.now() - Number(new Date(data.birthday))) / duration({ y:1 }))

    delete data._id
    if (user !== viewer) {
        delete data.birthday
        delete data.location
        delete data.preferences
    }
    return { data }
}

export {
    name, C,
    user_get,
    user_notify,
    profile_set, profile_get,
}
