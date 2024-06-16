import express from 'express'
import { J, P, U, request_parser,  } from '../../util'

// import '../../../public/lib/2/common/script.js'
// const log = named_log('otp')
const log = (...x) => console.log('[otp]', ...x)

const R = express.Router()

const otp_to_token = {}
const otp_to_poll = {}
R.post('/pollers', (rq, rs) => {
    // const { otp } = P(rq, 'otp')
    console.debug('CHECK POLL', otp_to_poll)
    rs.json({otp_to_token, otp_to_poll_keys:Object.keys(otp_to_poll)})
})
R.post('/(:otp)?', (rq, rs) => {
    const { otp, user, token:user_token, mode='numeric', dryrun=false } = request_parser.parse(rq)
    const handler = otp ? user ? 'input' : 'poll' : user ? 'unknown' : 'new'
    log({handler,otp,mode,dryrun,user,user_token})

    if (otp) {
        if (user) {
            // OTP input, resolve poller with auth
            if (otp_to_token[otp]) {
                const poll = otp_to_poll[otp]
                if (poll) {
                    log('resolve poller')
                    poll({ user, token:user_token })
                    delete otp_to_poll[otp]
                    rs.sendStatus(200)
                } else {
                    throw 'unknown OTP'
                }
            }
        } else {
            // poll for OTP input
            otp_to_poll[otp] = ({ user, token }) => {
                rs.set('X-Freshman-Auth-User', user)
                rs.set('X-Freshman-Auth-Token', token)
                rs.send({ user, token })
            }
            defer(() => {
                delete otp_to_poll[otp]
                throw 'timeout'
            }, duration({ m:5 }))
        }
    } else {
        if (user) {
            // unexpected
        } else {
            // new OTP
            const otp = {
                numeric: () => String(rand.i(1e6)).padStart(6, 0),
                alphanumeric: () => rand.somebiguous(6),
            }[mode]()
            dryrun || rs.json({otp, token:otp_to_token[otp] = rand.base62(16)})
        }
    }
})

export default {
    routes: R,
}
