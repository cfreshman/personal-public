import express from 'express'
import { J, P, U, named_log } from '../../util'

const name = 'matchbox'
const log = named_log(name)
const R = express.Router()

export default {
    io: (io, socket, info) => {
        let registered = false
        socket.on('matchbox', (data) => {
            const { id, player } = data
            // log('matchbox', id, data)
            socket.to(`matchbox-${id}`).emit('matchbox', data)

            if (!registered && player) {
                registered = true
                socket.on('disconnect', () => {
                    socket.to(`matchbox-${id}`).emit('matchbox', { id, player, leave:true })
                })
            }
        })
    }
}
