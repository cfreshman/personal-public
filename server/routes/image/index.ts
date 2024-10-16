import express from 'express'
import { readSecret } from '../../secrets/index.js'
// import { ImgurClient } from 'imgur'
import db from '../../db/index.js'
import { toYearMonthDay } from '../../util.js'


const R = express.Router()

const IMGUR_DAILY_LIMIT = 500 // 1250
let imgur_client
readSecret('imgur.json').then(keys => {
    // imgur_client = new ImgurClient({
    //     clientId: keys.client_id,
    //     clientSecret: keys.client_secret,
    //     refreshToken: keys.refresh_token,
    // })
})
R.post('/', async (req, res) => {
    if (!req.user) throw 'unauthorized'
    
    const today = toYearMonthDay(new Date())
    const limit = (await db.simple.get('image-limit')) || { today, count:0 }
    if (limit.today !== today) {
        limit.today = today
        limit.count = 0
    }
    if (limit.count >= IMGUR_DAILY_LIMIT) throw 'limit per day hit'
    limit.count += 1
    db.simple.set('image-limit', limit)

    console.log('[FILE:IMAGE]', limit)
    const { success, data } = await imgur_client.upload({
        image: req.body,
        title: 'freshman.dev upload',
    })
    res.json({ success, href:data?.link })
})

export default {
    routes: R,
}
