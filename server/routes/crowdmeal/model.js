import db from '../../db'
import { pick, stringifyEquals } from '../../util'
import * as mail from '../mail'


const C = db.of({
    default: 'crowdmeal',
        // user string-user
        // zipcode string
        // meals: boolean
        // prepare: boolean
        // deliver: boolean
        // optin?: boolean
        // opts?: yyyy-mm-dd | number[]
    
    meals: 'crowdmeal-meals',
    prepare: 'crowdmeal-prepare',
    deliver: 'crowdmeal-deliver',

    calendar: 'crowdmeal-calendar',
        // date: yyyy-mm-dd
        // recipe: string-dinder-recipe-id

    fulfilled: 'crowdmeal-fulfilled',
        // user
        // date: yyyy-mm-dd
})

async function _get(user) {
    return (user && await C.default().findOne({ user })) || {
        user,
        meals: false,
        prepare: false,
        deliver: false,
    }
}

async function profile(user) {
    return { profile: await _get(user) }
}
async function signup(user, request) {
    const profile = pick(await _get(user), 'user zipcode meals prepare deliver optin opts')
    const new_signup = !profile.opts?.length || !stringifyEquals(
        pick(request, 'meals prepare deliver'),
        pick(profile, 'meals prepare deliver'),
    )
    Object.assign(profile, pick(request, 'meals prepare deliver zipcode optin opts'))
    if (new_signup) {
        console.debug('[CROWDMEAL] signup', profile)
        mail.send('crowdmeal.app', 'cyrus@freshman.dev', `crowdmeal signup`, JSON.stringify(pick(request, 'meals prepare deliver')))
    }
    await C.default().updateOne({ user }, { $set: profile }, { upsert: true })
    return { profile }
}

async function calendar(user) {
    const calendar = await C.calendar().find({})
    return { calendar }
}

export {
    C,

    profile,
    signup,
    calendar,
}
