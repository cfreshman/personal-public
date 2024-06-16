import db from '../../db'
import { named_log } from '../../util'

const name = 'hot'
const log = named_log(name)
const C = db.of({
    [name]: name,
        // user: string-user
        // _hots: {string-user:true}
        // _nots: {string-user:false}
        // > hot: number
        // > not: number
        // > total: number
        // > vote: boolean
})

db.queueInit(async () => {
    await C.hot().deleteOne({ user:'cyrus' })
})

const _publicize_return = (item) => {
    // recursively _publicize contents: any fields beginning with an underscore will be removed
    Array.from(Object.keys(item)).map(k => {
        if (k[0] === '_') {
            delete item[k]
        } else if (Array.isArray(item[k])) {
            item[k].map(_publicize_return)
        } else if (typeof item[k] === 'object') {
            _publicize_return(item[k])
        }
    })
    return item
}
const _render_item = (viewer, item) => {
    item.hot = Object.keys(item._hots).length
    item.not = Object.keys(item._nots).length
    item.total = item.hot + item.not
    if (!item.total) {
        item.hot = item.not = .5
        item.total = 1
    }
    item.hotted = viewer in item._hots
    item.notted = viewer in item._nots
    item.voted = item.hotted || item.notted
    item.vote = !!viewer && !item.voted
    return item
}

async function _get(user) {
    return (await db.item(name, { user })) || {
        user, _hots:{}, _nots:{}
    }
}
async function get(viewer, user) {
    return _publicize_return({ item:_render_item(viewer, await _get(user)) })
}
async function vote(viewer, user, { hot=true, un=false }={}) {
    if (!viewer) throw 'not signed in'
    const item = await _get(user)
    // log('[vote]', item)
    const k = hot ? '_hots' : '_nots'
    if (un) delete item[k][viewer]
    else item[k][viewer] = true
    await db.set(name, { user }, item)
    return _publicize_return({ item:_render_item(viewer, item) })
}

export {
    name, C,
    get, vote,
}
