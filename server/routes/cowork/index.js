import express from 'express'
import { J, P, U, named_log } from '../../util'

const name = 'cowork'
const log = named_log(name)

let online = {}

export default {
    io: (io, socket, info) => {
        const broadcast_online = () => io.to('cowork').emit('cowork:online', [...Object.keys(online)].filter(x => x))

        socket.on(`${name}:join`, () => {
            log('joined chat', info)
            online[info.user||''] = true
            socket.join(name)
            broadcast_online()
        })
        const leave = () => () => {
            online[info.user||''] = false
            socket.leave(name)
            broadcast_online()
        }
        socket.on(`${name}:leave`, leave)
        socket.on('disconnect', leave)
    }
}
