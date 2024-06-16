import express from 'express';
import * as M from './model';

async function get(rq, res, next, force=false) {
    const hash = decodeURIComponent(rq.url.replace(/\/?(ly\/)?[.:-]?/, ''))
    const prefix = hash.replace(/\/.*/, '')

    let { ly } = await M.get('', prefix)
    if (!ly && prefix.startsWith('git:')) ly = { links: 'https://github.com/cfreshman/' + prefix.replace('git:', '') }

    // filter to exact links
    // console.debug('ly?', {hash, force}, ly)
    if (ly?.hash !== hash) return next()

    // redirect to single links, display /ly for multi links
    console.log('[REDIRECT:?]', prefix, hash, ly?.links)
    if (ly?.user) {
        if (ly.links.length === 1) {
            console.log('[REDIRECT]', prefix, hash, ly)
            let link = ly.links[0].split(' ')[0]
            if (!link.startsWith('http')) {
                if (link.startsWith('/')) link = 'freshman.dev' + link
                link = 'http://' + link
            }
            return res.redirect(link + hash.replace(prefix, ''))
        } else {
            console.log('[REDIRECT:list]', hash)
            if (force && hash === rq.params.hash) return res.redirect(`/:${hash}`)
        }
    }
    next()
}

const R = express.Router();
R.get('/(:hash)?', get)

const forceRoutes = express.Router();
forceRoutes.get('/:hash', async (rq, res, next) => get(rq, res, next, true))


export default {
    routes: R,
    model: M, ...M,
    forceRoutes,
};