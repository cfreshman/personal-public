import db from '../../db';
import { entryMap, pick, squash, toYearMonthDay } from '../../util';
import login from '../login'

const names = {
    tally: 'tally',
        // user: string
        // terms: { [term]: { d: string }[] }
        // on: { [term]: string-YMD }
        // include: { [term]: string-term[] }
        // color?: string
        // colors: { [term]: string }
        // dark?: boolean
        // hidden: { [term]:true }
}
const C = entryMap(names, name => () => db.collection(name));

db.queueInit(async () => {
    Array.from(await C.tally().find({}).toArray()).map(tally => {
        C.tally().updateOne({ user:tally.user }, { $set: { hidden: tally.hidden||{} } })
    })
})

async function _get(user) {
    const entry = Object.assign({
        user,
        terms: {},
        on: {},
        include: {},
        color: undefined,
        colors: {},
        dark: undefined,
        hidden: {},
    }, await C.tally().findOne({ user }) || {})
    // if (typeof(color) !== 'string') entry.color = undefined
    return entry
}
async function _update(props) {
    const tally = (await _get(props.user)) || props
    Object.assign(tally, props)
    delete tally._id
    // console.debug(tally.user, Object.keys(tally.terms))
    await C.tally().updateOne({ user: tally.user }, { $set: tally }, { upsert: true })
    return tally;
}

async function get(user) {
    return {
        tally: await _get(user)
    }
}
async function create(user, term) {
    term = decodeURIComponent(term)
    let tally = await _get(user)
    if (!tally.terms[term]) {
        tally.terms[term] = []
        await _update(tally)
    }
    return { tally }
}
async function update(user, body) {
    if (body.user && body.user !== user) throw `users mismatch`
    body.user = user
    // console.debug('[TALLY:UPDATE]', user, body)
    return {
        tally: await _update(body)
    }
}
async function tally(user, term, date) {
    term = decodeURIComponent(term)
    let tally = await _get(user)
    if (!tally.terms[term]) {
        tally.terms[term] = []
    }
    if (tally.terms[term].find(entry => entry.d === date)) {
        tally.terms[term] = tally.terms[term].filter(entry => entry.d !== date)
    } else {
        tally.terms[term].push({
            d: date
        })
    }
    await _update(tally)
    console.debug((await get(user)).tally.terms[term])
    return { tally }
}
async function remove(user, term) {
    term = decodeURIComponent(term)
    let tally = await _get(user)
    delete tally.terms[term]
    await _update(tally)
    return { tally }
}
async function rename(user, term, to) {
    term = decodeURIComponent(term)
    to = decodeURIComponent(to)
    let tally = await _get(user)
    if (!tally.terms[to]) {
        tally.terms[to] = tally.terms[term]
        delete tally.terms[term]
    }
    await _update(tally)
    return { tally }
}
async function toggle(user, term, on=undefined) {
    term = decodeURIComponent(term)
    let tally = await _get(user)
    tally.on = tally.on ?? {}
    on = on ?? !tally.on[term]
    const changed = on !== !!tally.on[term]
    const today = toYearMonthDay(await login.model.time(user))
    console.log('[TALLY:TOGGLE]', user, term, on, today, changed)
    if (changed) {
        if (on) {
            tally.on[term] = today
        } else {
            // invert all dates since term toggled on
            if (tally.terms[term]) {
                let toggled = Number(new Date(tally.on[term] + ' 0:0:0'))
                const termDatesSinceToggle = new Set()
                tally.terms[term].map(({ d }) => {
                    if (Number(new Date(d)) >= toggled) {
                        termDatesSinceToggle.add(d)
                    }
                })
                console.log('INVERT', user, term, tally.on[term], termDatesSinceToggle, tally.terms[term])
                // remove previous tallies
                tally.terms[term] = 
                    tally.terms[term].filter(({ d }) => !termDatesSinceToggle.has(d))
                // add tallies for dates without previous tallies
                while (toggled < Date.now()) {
                    const d = toYearMonthDay(new Date(toggled))
                    if (!termDatesSinceToggle.has(d)) {
                        tally.terms[term].push({ d })
                    }
                    toggled += 24 * 60 * 60 * 1000
                }
            }
            delete tally.on[term]
        }

        // remove today's tally to set to default
        tally.terms[term] = tally.terms[term].filter(({ d }) => d !== today)
    }
    await _update(tally)
    console.debug((await get(user)).tally.terms[term])
    return await get(user)
}

async function hide(user, term) {
    term = decodeURIComponent(term)
    const tally = await _get(user)
    tally.hidden[term] = true
    await _update(tally)
    return { tally }
}
async function unhide(user, term=undefined) {
    term = term && decodeURIComponent(term)
    const tally = await _get(user)
    if (term) {
        delete tally.hidden[term]
    } else {
        tally.hidden = {}
    }
    await _update(tally)
    return { tally }
}
async function bulk_hide(user, hidden) {
    // this is needed to avoid an issue with spaces in api requests

    const tally = await _get(user)
    tally.hidden = hidden
    await _update(tally)
    return { tally }
}

export {
    names,
    get,
    create,
    update,
    tally,
    remove,
    rename,
    toggle,
    hide, unhide, bulk_hide,
};
