import express from 'express'
import { J, P, U, named_log } from '../../util'

const name = 'cowork'
const log = named_log(name)

let online = {}

export default {
    io: (io, socket, info) => {
        const broadcast_online = () => io.to('cowork').emit('cowork:online', [...Object.keys(online)].filter(x => x))

        socket.on('cowork:online', broadcast_online)

        let joined = false
        socket.on(`${name}:join`, () => {
            if (info.user && !joined) {
                online[info.user] = (online[info.user] || 0) + 1
            }
            socket.join(name)
            joined = true
            broadcast_online()
        })
        const leave = () => {
            if (info.user && joined) {
                online[info.user] = (online[info.user] || 1) - 1
                if (!online[info.user]) {
                    delete online[info.user]
                }
            }
            socket.leave(name)
            joined = false
            broadcast_online()
        }
        socket.on(`${name}:leave`, leave)
        socket.on('disconnect', leave)
    }
}
