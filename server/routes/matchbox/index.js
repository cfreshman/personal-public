import express from 'express'
import { J, P, U, named_log } from '../../util'

const name = 'matchbox'
const log = named_log(name)
const R = express.Router()

export default {
    io: (io, socket, info) => {
        socket.on('matchbox', (...x) => {
            log('matchbox', ...x)
            io.emit('matchbox', ...x)
        })
    }
}
