import express from 'express';
import { J, P } from '../../util';
import * as M from './model';

const R = express.Router()
R.get('/', J(rq => M.get()))
R.post('/', J(rq => M.add(rq.body)))

R.get('/month', J(rq => M.month(new Date())))
R.get('/:timestamp', J(rq => M.month(P(rq, 'timestamp'))))

R.post('/ko-fi', J(rq => {
    const data = JSON.parse(rq.body.data)
    if (data.verification_token !== '6fc54574-68dd-4c04-9603-cad73617e53b') {
        return console.error(
            '[COST:add] invalid ko-fi verification token',
            data.verification_token)
    }
    const t = new Date(data.timestamp)
    const id = `ko-fi_${data.from_name.replace(/ /g, '+')}_${t.toLocaleDateString()}`
    return M.add(id, Number(data.amount), t, data.from_name, data)
}))

R.post('/github', J(rq => {
    const data = JSON.parse(rq.body)
    console.debug(`[COST:GITHUB]`, data)
    if (data.action === 'created') {
        const t = new Date(data.sponsorship.created_at)
        const id = `github_${data.sender.login}_${t.toLocaleDateString()}`
        return M.add(id, Number(data.sponsorship.tier.monthly_price_in_dollars), t, data.sender, data)
    }
}))

export default {
    routes: R,
     model: M, ...M,
}
