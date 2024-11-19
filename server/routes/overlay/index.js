import express from 'express'
import { J, P, U, named_log } from '../../util'
import db from '../../db'
import io from '../../io'

const { strings } = window
const name = 'overlay'
const log = named_log(name)

const reset_data = {
    face: undefined,
    last_actions: ['stream started'],
}
let data = strings.json.clone(reset_data)
const C = db.of({
    overlay: 'overlay',
        // data
})
db.queueInit(async () => {
    data = (await C.overlay().findOne()) || data
    delete data._id
    log('loaded', data)
})
db.queueClose(async () => {
    await C.overlay().updateOne({}, { $set:data }, { upsert:true })
})

const do_client_update = () => {
    io.update('overlay', data)
}
const send_command = (command, args=undefined) => {
    io.send_room('overlay', 'command', command, args)
}
const make_sound = () => {
    io.send_room('overlay', 'sound')
}

const R = express.Router()
R.get('/', J(async rq => {
    return { data }
}))
R.delete('/', J(async rq => {
    data = strings.json.clone(reset_data)
    do_client_update()
    return { success:true, data }
}))

import ComfyJS from 'comfy.js'
const set_last_action = async (action) => {
    data.last_actions = [action, ...data.last_actions].slice(0, 5)
    do_client_update()
    make_sound()
}
const set_face = async (face) => {
    data.face = face
    do_client_update()
}
db.queueInit(async () => {
    ComfyJS.onJoin = (user, self, extra) => {
        if (user.startsWith('justinfan')) return
        const join_message = `${user} joined the stream`
        if (data.last_actions.includes(join_message)) return
        set_last_action(join_message)
    }
    ComfyJS.onCheer = (user, message, bits, flags, extra) => {
        set_last_action(`${user} cheered ${bits} bits!`)
    }
    ComfyJS.onSub = (user, message, subTierInfo, extra) => {
        set_last_action(`${user} subscribed!`)
    }
    ComfyJS.onResub = (user, message, streakMonths, subTierInfo, extra) => {
        set_last_action(`${user} resubscribed! (${streakMonths} months)`)
    }
    ComfyJS.onSubGift = (giver, recipient, subTierInfo, extra) => {
        set_last_action(`${giver} gifted a sub to ${recipient}!`)
    }
    ComfyJS.onSubMysteryGift = (giver, numbOfSubs, subTierInfo, extra) => {
        set_last_action(`${giver} gifted ${numbOfSubs} subs!`)
    }
    ComfyJS.onGiftSubContinue = (user, sender, extra) => {
        set_last_action(`${sender} continued their gift sub to ${user}!`)
    }

    ComfyJS.onCommand = (user, command, message, flags, extra) => {
        if (command === 'ping') {
            set_last_action(`${user}: pong!`)
        }
        if (command === 'face') {
            set_face(message)
            make_sound()
        }
        if (command === 'firework') {
            send_command('firework')
            make_sound()
        }
    }

    ComfyJS.Init('freshman_dev')
})

export default {
    routes: R,
    C,
}
