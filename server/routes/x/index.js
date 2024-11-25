import express from 'express'
import * as M from './model'
import { J, P, U, named_log } from '../../util'
import file from '../file'

const name = M.name
const log = named_log(name)
const R = express.Router()

R.post('/item/add', J(rq => M.store({ id:U(rq), html:rq.body })))
R.post('/item/get', J(rq => M.get(U(rq))))
R.post('/item/icon', J(rq => M.icon(U(rq), rq.body.dataurl)))
R.post('/item/del', J(rq => M.del(U(rq))))

R.get('/html/:id', async (rq, rs) => {
    const { data } = await M.get(P(rq, 'id'))
    if (data) {
        let html = file.read(data.path)
        if (data.icon) {
            html = `<link rel='icon' href='${data.icon}'>${html}`
        }
        rs.send(html)
    } else {
        rs.send(`<!doctype html><html><body>not found - back to <a href='https://x.tu.fo'>x.tu.fo</a></body></html>`)
    }
})

export default {
    routes: R,
    model: M, ...M,
}
