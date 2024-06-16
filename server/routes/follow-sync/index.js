import qs from 'querystring';
import express from 'express';
import * as M from './model';
import { fetch, pick, randAlphanum, J } from '../../util';


// TODO clean up code after implementing background sync

const R = express.Router();
R.get('/oauth/twitter', async (req, res) => {
    const { code } = req.query

    const { body: twitterAuth } = await fetch(`https://api.twitter.com/2/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        form: {
            code,
            grant_type: 'authorization_code',
            client_id: M.auth.TWITTER_V2_CLIENT_ID,
            redirect_uri: `${req.get('origin')}/follow-sync/twitter`,
            code_verifier: 'challenge',
        },
    })
    console.log('TWITTER OAUTH', twitterAuth)
    if (twitterAuth.error) throw twitterAuth

    const { body: result } = await M.auth.fetch(
        { code, ...twitterAuth }, code,
        `https://api.twitter.com/2/users/me`,
        {
            query: {
                'user.fields': 'description,url',
            }
        })
    const { data: twitterUser } = result
    console.log(pick(twitterUser, 'username description'))
    await M.twitter.set(twitterUser.username, { code, ...twitterAuth, ...pick(twitterUser, 'username id description url') })
    res.json(twitterUser)
})
R.post('/twitter', M.twitter.request)
R.post('/tco', M.tco.request)

R.post('/oauth/twitter-v1', async (req, res) => {
    const { username, oauth_token, oauth_verifier } = req.body
    // 1) request_token( oauth_consumer_key oauth_callback ) => oauth_token oauth_token_secret
    // 2) access_token( oauth_consumer_key oauth_token oauth_consumer_key ) => oauth_consumer_key
    const stage = (oauth_token && oauth_verifier) ? 2 : 1
    console.debug('OAUTH TWITTER V1', stage, oauth_token, oauth_verifier)
    switch (stage) {
        case 1: {
            const { statusCode, body } = await M.twitter.v1.request(
                {},
                `https://api.twitter.com/oauth/request_token`,
                {
                    method: 'POST',
                    query: {
                        oauth_callback: `${req.get('origin')}/follow-sync/twitter-profile`,
                    },
                })

            // expect a form-encoded response
            if (statusCode === 200) {
                const twitterProfileAuth = { ...qs.parse(body) }
                console.log('REQUEST TOKEN', username, body, twitterProfileAuth)
                await M.twitter.v1.set(username, twitterProfileAuth)
                const { oauth_token } = twitterProfileAuth
                res.json({ oauth_token })
            } else throw `${statusCode} ${body}`
        } break
        case 2: {
            await M.twitter.v1.set(username, { oauth_token, oauth_verifier, })
            const { statusCode, body } = await fetch(
                `https://api.twitter.com/oauth/access_token`,
                {
                    method: 'POST',
                    query: {
                        oauth_token,
                        oauth_verifier,
                    },
                })

            // expect a form-encoded response
            if (statusCode === 200) {
                const twitterProfileAuth = { ...qs.parse(body) }
                console.log('ACCESS TOKEN', username, body, twitterProfileAuth)
                await M.twitter.v1.set(username, twitterProfileAuth)
                // await sleep(3000) // give Twitter time to propagate
                res.json(pick(twitterProfileAuth, 'oauth_token'))
            } else throw `${statusCode} ${body}`
        } break
    }
})
R.post('/twitter-v1', async (req, res) => {
    const { username, oauth_token } = req.body
    const oauth = (await M.twitter.v1.get(username)) ?? {}
    console.debug({ username, oauth_token }, oauth)
    if (!oauth_token || oauth_token !== oauth.oauth_token) {
        throw new Error(`invalid/expired credentials, please re-authorize`)
    }

    const { method='GET', endpoint, headers=[], query, form, json, body } = req.body
    M.twitter.v1.request(
        oauth,
        `https://api.twitter.com/${endpoint.replace(/^\//, '')}`,
        { method, headers, query, form, json, body }
        )
        .then(async result => {
            // console.log(result.body)
            res.json(result.body)
        })
})


R.get('/oauth/mastodon/:server', async (req, res) => {
    const { server } = req.params
    const { code, client_id, client_secret } = req.query

    const { body: mastodonAuth } = await fetch(`https://${server}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        form: {
            code,
            grant_type: 'authorization_code',
            client_id,
            client_secret,
            redirect_uri: `${req.get('origin')}/follow-sync/mastodon`,
            scope: 'read:accounts read:search write:follows',
            code_verifier: 'challenge',
        },
    })
    console.log('MASTODON OAUTH', mastodonAuth)
    // await sleep(1000) // ???
    const { body } = await M.auth.fetch(
        { code, ...mastodonAuth }, code,
        `https://${server}/api/v1/accounts/verify_credentials`)
    // console.debug(body)
    const { username, id, display_name } = body
    const mastodonUser = { server, username, id, display_name }
    console.log(mastodonUser)
    await M.mastodon.set(server, username, { code, ...mastodonAuth, ...pick(mastodonUser, 'id') })
    res.json(mastodonUser)
})
R.post('/mastodon', M.mastodon.request)

R.post('/auto', J(M.sync.enable))
R.post('/sync', J(M.sync.perform))

export default {
    routes: R,
     model: M, ...M,
}