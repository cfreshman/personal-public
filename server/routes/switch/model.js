import db from '../../db';
import io from '../../io';
import { pick, set, truthy, unpick } from '../../util';
import key from '../key';

const APP = 'switch'
const C = db.of({
    default: 'switch',
        // space: string
        // name: string
        // state: boolean
        // gate: undefined|'NOT'|'AND'|'OR'|'XOR'|'NAND'
        // inputs: string-space/name[]
        // ? webhooks: string-url[]
    input: 'input',
        // from string-space/name
        // to string-space/name
})

const toKey = item => item.space + '/' + item.name
const fromKey = key => {
    const space = key.split('/')[0]
    return [space, key.replace(space+'/', '')]
}

const FORBIDDEN_SPACES = set('space on off toggle lock unlock all')
function _resolveSpace(space, lock=false) {
    if (FORBIDDEN_SPACES.has(space)) throw `sorry, "${space}" isn't an allowed space name`
    if (lock && space === 'default') throw `sorry, you can't lock the default space`
    return space || 'default'
}
function _spaceLockIdentifier(space) {
    return `space-${_resolveSpace(space)}`
}
function _topicNames(space, name) {
    return [
        space && `switch:${space}`,
        `switch:${space ? toKey({space, name}) : name}`,
        !space && `switch:${toKey({space:'default', name})}`,
    ].filter(truthy)
}
async function _permissionedSpace(user, space) {
    const locked = await key.model.locked(user, APP, _spaceLockIdentifier(space))
    if (locked) throw `sorry, you don't have permission to access this`
    return unpick(Array.from(await C.default().find({ space }).toArray()), '_id')
}
async function _permissionedItem(user, space, name) {
    const locked = await key.model.locked(user, APP, _spaceLockIdentifier(space))
    if (locked) throw `sorry, you don't have permission to access this`
    return unpick(await C.default().findOne({ space, name }), '_id') || {
        space, name,
        state: false,
    }
}

async function all(user, space) {
    space = _resolveSpace(space)
    return { list: await _permissionedSpace(user, space) }
}
async function get(user, space, name) {
    space = _resolveSpace(space)
    return { item: await _permissionedItem(user, space, name) }
}
async function reset(user, space, name) {
    space = _resolveSpace(space)
    const existing = await _permissionedItem(user, space, name)
    if (existing) {
        await C.default().deleteOne({ space, name })
    }
    return { success: true }
}

const _triggerCache = {}
const INVERT_GATES = set('NOT', 'NAND', 'XNOR')
// disallow more than 16 updates from one sync
let syncCount = 0, SYNC_LIMIT = 16
async function _sync(space, name) {
    const syncRoot = syncCount === 0
    syncCount += 1
    if (syncCount > SYNC_LIMIT) throw `too many outputs - this isn't meant to be a production service, but contact me if you need a higher limit`

    try {
        const item = await C.default().findOne({ space, name })
        const to = toKey({ space, name })
        console.debug('sync to', to, item.gate, item.inputs)
        const toUser = await key.model.user(APP, _spaceLockIdentifier(space))
        if (item.gate && item.inputs?.length) {
            const states = []
            await Promise.allSettled(item.inputs.map(async x => {
                const from = x
                const [fromSpace, fromName] = fromKey(from)
                const fromUser = await key.model.user(APP, _spaceLockIdentifier(fromSpace))
                const allowed = !fromUser || toUser === fromUser
                console.debug('sync allowed', allowed, from, '->', to)
                if (allowed) {
                    states.push(
                        _triggerCache[from]
                        ?? (await C.default().findOne({ space:fromSpace, name:fromName})).state)
                } else {
                    throw `switch doesn't have permission to all inputs`
                }
            }))
            console.debug(states)
            let state
            switch (item.gate) {
                case 'OR': // meant for 2 inputs, true <=> any true
                case 'NOT': // meant for 1 input, true <=> none true
                    state = states.some(truthy)
                    break
                case 'AND': // meant for 2 inputs, true <=> all true
                case 'NAND': // meant for 2 inputs, true <=> all false
                    state = states.every(truthy)
                    break
                case 'XOR': // meant for 2 inputs, true <=> some different
                case 'XNOR': // meant for 2 inputs, true <=> all same
                    break
            }
            if (INVERT_GATES.has(item.gate)) state = !state

            console.debug('sync value:', to, state, 'old:', item.state)
            if (state !== item.state) {
                await _mutate(toUser, space, name, x => {
                    x.state = state
                })
            }
        }
    } finally {
        if (syncRoot) syncCount = 0
    }
}
async function _trigger(space, name, state) {
    const user = await key.model.user(APP, _spaceLockIdentifier(space))
    const from = toKey({ space, name })
    _triggerCache[from] = state
    const outputs = Array.from(await C.input().find({ from }).toArray())
    setTimeout(async () => {
        while (outputs.length) {
            const { to } = outputs.pop(0)
            const [toSpace, toName] = fromKey(to)
            // don't allow effect unless either:
            // - 'from' space is unlocked
            // - 'from' and 'to' are locked by same user
            const allowed =
                !user
                || user === await key.model.user(APP, _spaceLockIdentifier(toSpace))
            console.debug('trigger allowed', allowed, from, '->', to)
            if (allowed) {
                await _sync(toSpace, toName)
            }
        }
    })
}
async function _mutate(user, space, name, func) {
    space = _resolveSpace(space)
    const item = await _permissionedItem(user, space, name)
    await func(item)
    await C.default().updateOne({ space, name }, { $set: item }, { upsert: true })
    _topicNames(space, name).map(x => io.emit(x, item))
    _trigger(item.space, item.name, item.state)
    return { item }
}

async function add(user, space, name) {
    return _mutate(user, space, name, x => {
        console.debug('[SWITCH:ADD]', x)
    })
}
async function on(user, space, name) {
    return _mutate(user, space, name, x => {
        x.state = true
    })
}
async function off(user, space, name) {
    return _mutate(user, space, name, x => {
        x.state = false
    })
}
async function toggle(user, space, name) {
    return _mutate(user, space, name, x => {
        x.state = !x.state
    })
}
async function logic(user, space, name, gate, inputs) {
    if (typeof(inputs) === 'string') inputs = inputs.split(',')
    inputs = inputs.filter(truthy)
    if (inputs?.length > 8) throw 'too many inputs'

    // require permissions? or fail silently
    // if (item.gate && item.inputs?.length) {
    //     console.debug('TRIGGER', item.gate, item)
    //     await Promise.all(item.inputs.map(x => {
    //         const [space, name] = fromKey(x)
    //         _permissionedItem(user, space, name)
    //     }))
    // }
    
    const item = await _permissionedItem(user, space, name)
    const key = toKey(item)
    if (item.gates) await C.input().deleteMany({ to: key })
    
    return _mutate(user, space, name, async x => {
        x.gate = gate
        x.inputs = inputs
        console.debug(`[SWITCH] logic gate:`, key, x.gate, x.inputs)
        if (inputs?.length) {
            await C.input().insertMany(inputs.map(y => ({ from: y, to: key })))
        }
    })
}

async function lock(user, space) {
    space = _resolveSpace(space, true)
    await key.model.lock(user, APP, _spaceLockIdentifier(space))
    return { success: true }
}
async function unlock(user, space) {
    space = _resolveSpace(space, true)
    await key.model.unlock(user, APP, _spaceLockIdentifier(space))
    return { success: true }
}

const getSpaceIdentifier=_spaceLockIdentifier
export {
    APP,
    C,

    getSpaceIdentifier,

    all,
    get,
    reset,

    add,
    on,
    off,
    toggle,

    lock,
    unlock,

    logic,
}
