import express from 'express'
import { readSecret } from '../../secrets/index.js'
import { ImgurClient } from 'imgur'
import db from '../../db/index.js'
import { isDevelopment, J, named_log, randAlphanum, toYearMonthDay } from '../../util.js'
import file from '../file/index.js'

const log = named_log('audio')
const DAILY_LIMIT = 100
const R = express.Router()
R.post('/', J(async (req, res) => {
    if (!req.user) throw 'unauthorized'
    log('save new')

    const today = toYearMonthDay(new Date())
    const limit = (await db.simple.get('audio-limit')) || { today, count:0 }
    if (limit.today !== today) {
        limit.today = today
        limit.count = 0
    }
    if (limit.count >= DAILY_LIMIT) throw 'limit per day hit'
    limit.count += 1
    db.simple.set('audio-limit', limit)

    const hash = randAlphanum(16)
    const filename = `public-audio-${hash}.mp3`
    file.write(filename, req.body)
    res.json({ success:true, href:`${isDevelopment() ? 'http://localhost:3030' : 'https://freshman.dev'}/api/file/${filename}` })
}))

export default {
    routes: R,
}
