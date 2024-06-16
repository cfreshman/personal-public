import express from 'express';
import * as M from './model';
import { J, U } from '../../util';

const R = express.Router();
R.get('/(:hash(*))?', async (rq, res, next) => {
    const hash = /\/[.:-]/.test(rq.originalUrl)
        ? rq.originalUrl.slice(2)
        : rq.params.hash
    // const hash = rq.params.hash ?? rq.originalUrl.slice(2)
    // console.log('LOG', rq.url, rq.originalUrl, rq.params.hash, hash)
    let { ly: { url } } = await M.get('', hash)
    // console.log(ly)

    // redirect to single urls
    if (url) {
        console.log('[REDIRECT]', hash)
        if (!url.startsWith('http')) url = 'http://'+url
        res.redirect(url)
    } else {
        console.log('[REDIRECT:missing]', hash)
        next()
    }
});

export default {
    routes: R,
     model: M, ...M,
}