import crypto from 'node:crypto';
import db from '../../db';
import secrets from '../../secrets';

import {
    set,
    truthy,
    pick,
    fetch,
    pass,
    debug,
    debug_prefix,
    group,
    range,
    randAlphanum,
} from '../../util';

const log = debug('follow-sync')
const console = Object.assign({}, globalThis.console, { log, debug: log })

const C = db.of({
    sync: 'follow-sync', // accounts to sync
    // sync: boolean
    // twitter: string user
    // mastodon: string @user@server
    // options: { acceptExisting: boolean }
    twitter: 'follow-sync-twitter', // twitter info per sync
    // username: string
    // id: string
    // sync: boolean (sync from Twitter)
    // ...auth { code, access_token, refresh_token }
    // v1 { ...auth } // credentials for v1 of twitter api
    mastodon: 'follow-sync-mastodon', // mastodon info per sync
    // server: string
    // username: string
    // id: string
    // sync: boolean (sync from Mastodon)
    // ...auth { code, client_id, client_secret, access_token }

    tco: 'follow-sync-tco', // resolved t.co links required to read accounts in bio
    // hash: string
    // url: string

    // IGNORE BELOW Mastodon IDs seem to change
    // store twitter <-> mastodon mapping
    // Mastodon search can only query a single user, so this is massively efficient for reloads, etc
    // but can still delete if it takes too much storage
    mapping: 'follow-sync-mapping', // mapping from mastodon name to id
    // mastodon: string @user@server
    // mastodon_id: string
    // mastodon_follow_ids: string[] string // which accounts have been followed using this tool
})

const auth = {
    TWITTER_V2_CLIENT_ID:'', TWITTER_V1_OAUTH_CONSUMER_KEY:'', TWITTER_V1_OAUTH_CONSUMER_SECRET:'',
    verify: (oauth, code) => {
        if (!code || code !== oauth?.code) {
            console.debug(code, oauth)
            throw new Error(`invalid/expired credentials, please re-authorize`)
        }
    },
    fetch: async (oauth, code, url, options={}) => {
        // console.debug(code, oauth)
        auth.verify(oauth, code)
        options.headers = {
            'Authorization': 'Bearer '+oauth.access_token,
            ...options.headers,
        }
        return fetch(url, options)
    },
}
secrets.readSecret('/twitter.json').then(twitter_secrets => {
    auth.TWITTER_V2_CLIENT_ID = twitter_secrets.client_id
    auth.TWITTER_V1_OAUTH_CONSUMER_KEY = twitter_secrets.oauth_consumer_key
    auth.TWITTER_V1_OAUTH_CONSUMER_SECRET = twitter_secrets.oauth_consumer_secret
}).catch(console.log)

const IGNORE_DOMAINS = set('youtube.com tiktok.com')
const performSync = async ({ twitter: twitter_at, mastodon: mastodon_at, options={ acceptExisting: false } }) => {
    const ats = {
        twitter: twitter_at,
        mastodon: mastodon_at,
    }
    const twitter = { username: twitter_at }
    let mastodon = mastodon_at.split('@').slice(1)
    mastodon = {
        username: mastodon[0],
        server: mastodon[1],
    }
    const { acceptExisting=false } = options
    console.debug('syncing', twitter, mastodon, { acceptExisting })

    // query tokens
    const twitterAuth = await module.exports.twitter.get(twitter.username)
    const mastodonAuth = await module.exports.mastodon.get(mastodon.server, mastodon.username)

    // Twitter -> Mastodon
    // fetch Twitter follows
    // TODO store previous & only fetch updates ? but we need updated info
    // parse Mastodon @s
    // fetch unknown Mastodon IDs
    // store mastodon IDs
    // follow @s on Mastodon

    // Mastodon -> Twitter
    // fetch Mastodon follows (contain defined Twitter @s)
    // follow @s on Twitter

    const returns = {}

    await Promise.resolve()
    .then(async () => { // fetch Twitter follows
        const { id, code, sync } = twitterAuth
        if (!sync) return {} // skip

        let response
        do {
            const followCount = response?.data.length || 0
            console.debug(`fetch Twitter follows`, followCount + 1, 'up to', followCount + 1000)
            const previous = response?.data ?? []
            try {
                response = (await module.exports.twitter.request({
                    body: {
                        code,
                        username: twitter.username,
                        endpoint: `2/users/${id}/following`,
                        query: {
                            max_results: 1000,
                            pagination_token: response?.meta?.next_token,
                            'user.fields': 'description,url,location',
                            'tweet.fields': 'text',
                            expansions: 'pinned_tweet_id',
                        },
                    }
                })).body
                // console.debug(response)

                // concat all user fields, including pinned tweets
                const pinned = {}
                response.includes.tweets.map(({ id, text }) => pinned[id] = text)
                response.data = previous.concat(response.data.map(item => {
                    item.description = [
                        item.description,
                        item.location,
                        // item.url,
                        pinned[item.pinned_tweet_id],
                    ].filter(x=>x).join(' ')
                    return item
                }))

                // setTwitterFollows(response?.data ?? [])
            } catch {
                console.debug('ERROR', response)
                if (response) delete response.meta
            }
        } while (response?.meta?.next_token)
        return response
    })
    .then(async ({ data }) => { // parse Mastodon accounts
        // console.debug('TWITTER FOLLOWS', data.length)
        if (!data) return {} // authorization has expired TODO request new access token
        data = data.filter(truthy)

        // first, we need to expand any shortened t.co URLs (thanks Twitter)
        // just append to end of description
        // (also - expand user's own links here ** )
        const TWITTER_LINK_REGEX = /https:\/\/t\.co\/([\w\d]+)/g
        const hashes = Array
        .from(data.concat([twitterAuth]) // ** include user's links too
            .flatMap(({ description, url }) => [description, url]).join(' ')
            .matchAll(TWITTER_LINK_REGEX))
        .map(match => match[1])

        // console.debug(`resolving`, hashes.length, `t.co links`)
        const { mapping: resolved } = await module.exports.tco.request({
            body: {
                code: twitterAuth.code,
                username: twitter.username,
                hashes,
            }
        })
        // console.debug('FETCHED T.CO', Object.keys(resolved).length)

        // resolve user's own links (to avoid overwriting bio/url with t.co)
        const { description, url } = twitterAuth
        // console.debug('REPLACE', description, url)
        const resolveTCo = str => str.replaceAll(TWITTER_LINK_REGEX, match =>
        resolved[match.replace('https://t.co/', '')].replace(/https?:\/\//, ''))
        module.exports.twitter.set(twitter.username, {
            ...twitterAuth,
            description: resolveTCo(description),
            url: resolveTCo(url),
        })
        // console.debug('RESOLVED OWN LINKS')

        const usernameToResolved = {}
        data.forEach((_, i) => {
            const { username, description, url } = data[i]
            const matches = Array
                .from((description + ' ' + url).matchAll(TWITTER_LINK_REGEX))
                .map(match => match[1])

            if (matches.length) {
                const urls = matches.map(match => resolved[match])
                usernameToResolved[username] = urls
                data[i].description += ' ' + urls.join(' ')
            }
        })
        // console.debug('RESOLVED T.CO')

        // console.debug(`searching for Mastodon @s (0/${data.length})`)
        console.debug(`search for Mastodon @s across`, data.length, 'Twitter profiles')
        // resolve links asynchronously to allow for UI to update
        const twitterToMastodon = {}
        const promises = data.map(({ name, username, description }, i) => () => new Promise(resolve => setTimeout(() => {
            // console.debug(
            //     username,
            //     name + ' ' + description)
            // console.debug(`searching for Mastodon @s (${i}/${data.length})`)
            const MASTODON_AT_REGEX = /[@\p{Emoji}][\w\d_]+@(\.?[\w\d/-]+)+/g
            // match email syntex as well (fairly noisy)
            // const MASTODON_AT_REGEX = /(^|[@ \p{Emoji}])[\w\d_]+@(\.?[\w\d/-]+)+/g
            const atMatches = Array
                .from((name + ' ' + description).matchAll(MASTODON_AT_REGEX))
                .map(match => match[0])
                .filter(x => '@🦣 '.includes(x[0]))

            //                            domains      tld/path?    @name     not another @
            //                            |            |            |         |
            const MASTODON_LINK_REGEX = /(([\w\d-]+\.)+([\w\d-]+\/)+@[\w\d_]+)([^@\w\d_]|$)/g

            const linkMatches =
                Array
                .from((name + ' ' + description).matchAll(MASTODON_LINK_REGEX))
                .map(match => match[1])
                .map(link => {
                    // console.debug(link)
                    const [server, username] = link.split('/@')
                    return `@${username}@${server}`
                })
            const matches = [].concat(atMatches, linkMatches)
            // matches.length && console.debug('-', username, matches.join(' '))

            // remove repeat domains
            // (TODO including updates like @user@test.example @user@test.example/web ? *might* remove different ones)
            twitterToMastodon[username] =
                Array.from(new Set(matches)).filter(x => !IGNORE_DOMAINS.has(x.split('@').slice(-1)[0]))
            resolve()
        })))
        while (promises.length) await promises.shift()()

        // as last resort, search own DB for remaining Twitter accounts without Mastodon mapping in case they used this tool
        const twittersMissingMastodons = new Set(data.map(x => x.username))
        Object.keys(twitterToMastodon).forEach(x => twittersMissingMastodons.delete(x))
        console.debug('search for', twittersMissingMastodons.size, 'implicit Mastodons')
        const implicitMastodons = Array.from(await C.sync().find({ twitter: { $in: Array.from(twittersMissingMastodons) } }))
        implicitMastodons.forEach(x => twitterToMastodon[x.twitter] = x.mastodon)

        // console.debug(twitterToMastodon)
        const n_mastodons = ({ username }) => twitterToMastodon[username].length
        // console.debug(`sorting found Mastodon @s`)
        data.filter(a => n_mastodons(a)).sort((a, b) => n_mastodons(b) - n_mastodons(a))
        // console.debug(data)
        return { twitterInfo: data, twitterToMastodon }
    })
    .then(async ({ twitterToMastodon }) => { // follow Mastodon accounts
        if (!twitterToMastodon) return // previously skipped
        await Promise.resolve()
        .then(async () => {
            // fetch account IDs (TODO support multiple Mastodons)
            const { code, server, username, id } = mastodonAuth
            const mastodonFollowList = Object.values(twitterToMastodon).flatMap(pass)
            console.debug(`fetch`, mastodonFollowList.length, `Mastodon IDs`)

            // query known IDs locally NVM ids seem to change
            const mastodonToId = {}
            // Array
            // .from(await C.mapping().find({ mastodon: { $in: mastodonFollowList }}).toArray())
            // .forEach(x => mastodonToId[x.mastodon] = x.mastodon_id)
            console.debug(
                '- skip', Object.values(mastodonToId).filter(pass).length, 'known IDs')

            // fetch unknown IDs
            await Promise.allSettled(mastodonFollowList
                .filter(x => !mastodonToId[x])
                .map(async unknown => {
                    const { body: unknownResult } = await module.exports.mastodon.request({
                        body: {
                            method: 'GET',
                            code, server, username,
                            endpoint: `api/v2/search`,
                            ms: 2000,
                            query: {
                                q: unknown,
                                resolve: true,
                                limit: 1,
                                type: 'accounts',
                            },
                        }
                    })
                    // console.debug(unknownResult)
                    const account = unknownResult?.accounts[0]
                    if (account) {
                        mastodonToId[unknown] = account.id
                        C.mapping().updateOne({ mastodon: unknown }, {
                            $set: { mastodon: unknown, mastodon_id: account.id},
                        }, { upsert: true })
                    }
                }))

            // follow each account

            // ignore existing follows
            const selfMappingQuery = { mastodon_id: id }
            const { mastodon_follow_ids=[] } = (await C.mapping().find(selfMappingQuery)) ?? {}
            const mastodonFollowIdsSet = new Set(mastodon_follow_ids)
            const mastodonNewFollowList = mastodonFollowList.filter(
                x => !mastodonFollowIdsSet.has(mastodonToId[x]))

            console.debug(`follow`, mastodonNewFollowList.length, 'new Mastodon accounts',
                `(${mastodonFollowList.length - mastodonNewFollowList.length} existing)`)
            await Promise.allSettled(mastodonNewFollowList
                .map(x => {
                    // OLD reversed meaning of mastodon_follow_ids
                    // const mastodon = `@${x.username}@${x.server}`
                    // C.mapping().update({ mastodon }, {
                    //     $set: { mastodon,
                    //         // mastodon_follows: Array.from(mastodonToFollows[follow] ?? []).concat([ats.mastodon])
                    //     },
                    // }, { upsert: true })
                    return module.exports.mastodon.request({
                        body: {
                            method: 'POST',
                            code, server, username,
                            endpoint: `api/v1/accounts/${mastodonToId[x]}/follow`,
                        }
                    })
                }))

            // store new followed ids
            C.mapping().updateOne(selfMappingQuery, { $set: {
                ...selfMappingQuery,
                mastodon_follow_ids: mastodonFollowList.map(x => mastodonToId[x]),
            } }, { upsert: true })

            console.debug('done syncing Twitter -> Mastodon', ats)
        })
    })
    .then(async () => { // fetch Mastodon follows
        const { id, code, sync } = mastodonAuth

        console.debug('sync from Mastodon?', sync)
        if (!sync) return {} // sync from Mastodon not enabled

        let results = [], pagination
        do {
            const followCount = results.length
            console.debug(`fetch Mastodon follows`, followCount + 1, 'up to', followCount + 1000)
            try {
                const { headers, body: result } = await module.exports.mastodon.request({
                    body: {
                        code,
                        ...mastodon,
                        endpoint: `api/v1/accounts/${id}/following`,
                        headers: pagination && { Link: pagination },
                        query: {
                            limit: 1000, // TODO determine actual value
                        },
                    }
                })
                // console.debug(headers, result)
                pagination = headers['Link']
                results.push(...result)
            } catch (e) {
                console.debug(e)
                pagination = undefined
            }
        } while (pagination)
        // console.debug(results.map(x => ({
        //     username: x.username,
        //     ...x.fields.filter(y => /twitter/i.test(y.name))
        // })))

        const mastodonToTwitter = {}
        results.forEach(x => {
            // parse Mastodon @ from url
            const [server, username] = x.url?.replace(/https?:\/\//, '').split('/@')
            const twitterField = x.fields.find(y => /twitter/i.test(y.name))
            if (twitterField) {
                // parse Twitter @ from field { name, value, verified_at }
                const { value } = twitterField
                // console.debug(value)
                let twitter
                if (value[0] === '@') twitter = value.slice(1)
                else if (!value.includes(' ')) twitter = value
                else twitter = (
                    /href="https?:\/\/twitter.com\/([^"]+)"/.exec(value) || []
                    )[1]
                if (twitter) mastodonToTwitter[`@${username}@${server}`] =
                    twitter.replace(/\/$/, '')
            }
        })
        // console.debug(mastodonToTwitter)

        return { mastodonToTwitter }
    })
    .then(async ({ mastodonToTwitter }) => { // follow Twitter users
        if (!mastodonToTwitter) return {} // previously skipped
        const { id, code } = twitterAuth

        // query Twitter user IDs (to follow)
        console.debug('fetch', Object.keys(mastodonToTwitter).length, 'Twitter IDs')
        const twitterToId = {}
        const groups = group(Object.values(mastodonToTwitter), 100) // max per request
        while (groups.length) {
            const { body: { data } } = await module.exports.twitter.request({
                body: {
                    code,
                    ...twitter,
                    endpoint: `2/users/by`,
                    query: { usernames: groups.pop().join(',') },
                }
            })
            data?.forEach(x => twitterToId[x.username] = x.id)
        }
        // console.debug(twitterToId)

        // follow Twitter users
        console.debug('follow', Object.keys(twitterToId).length, 'Twitter accounts')
        await Promise.all(Object.values(twitterToId).map(target_user_id => {
            return module.exports.twitter.request({
                body: {
                    method: 'POST',
                    code,
                    ...twitter,
                    endpoint: `2/users/${id}/following`,
                    json: { target_user_id },
                }
            })
        }))
        console.debug('done syncing Mastodon -> Twitter', ats)
    })
    .then(async () => { // accept requests from existing followers (Twitter -> Mastodon as of now)
        if (!acceptExisting) return {} // skip

        const { code } = mastodonAuth

        let results = [], pagination
        do {
            const requestCount = results.length
            console.debug(`fetch Mastodon pending requests`, requestCount + 1, 'up to', requestCount + 1000)
            try {
                const { headers, body: result } = await module.exports.mastodon.request({
                    body: {
                        code,
                        ...mastodon,
                        endpoint: `api/v1/follow_requests`,
                        headers: pagination && { Link: pagination },
                        query: {
                            limit: 1000, // TODO determine actual value
                        },
                    }
                })
                // console.debug(headers, result)
                pagination = headers['Link']
                results.push(...result)
            } catch (e) {
                console.debug(e)
                pagination = undefined
            }
        } while (pagination)

        // search for Twitter accounts across those Mastodon profiles
        const mastodonToTwitter = {}
        const m2i = {}
        results.forEach(x => {
            // parse Mastodon @ from url
            if (!x.url) return
            const [server, username] = x.url.replace(/https?:\/\//, '').split('/@')
            const twitterField = x.fields.find(y => /twitter/i.test(y.name))
            if (twitterField) {
                // parse Twitter @ from field { name, value, verified_at }
                const { value } = twitterField
                // console.debug(value)
                let twitter
                if (value[0] === '@') twitter = value.slice(1)
                else if (!value.includes(' ')) twitter = value
                else twitter = (
                    /href="https?:\/\/twitter.com\/([^"]+)"/.exec(value) || []
                    )[1]
                if (twitter) {
                    const mastodonAt = `@${username}@${server}`
                    mastodonToTwitter[mastodonAt] = twitter.replace(/\/$/, '')
                    m2i[mastodonAt] = x.id
                }
            }
        })
        console.debug('found', Object.keys(mastodonToTwitter).length, 'Twitter accounts in requests')

        return { mastodonToTwitter, m2i }
    })
    .then(async ({ mastodonToTwitter, m2i }) => { // check linked Twitter @s 1) are followers 2) link back
        if (!mastodonToTwitter) return {} // continue skip

        const oauth = (await module.exports.twitter.v1.get(ats.twitter)) ?? {}
        console.debug(oauth)

        // filter discovered Twitter @s to followers
        const mastodonToTwitterFilter = new Set()
        await Promise.allSettled(group(Object.values(mastodonToTwitter), 100).map(twitters => {
            return module.exports.twitter.v1.request(
                oauth,
                `https://api.twitter.com/1.1/friendships/lookup.json`,
                {
                    method: 'GET',
                    query: {
                        screen_name: twitters.join(',')
                    },
                }
                )
                .then(async result => {
                    result.body
                        .filter(x => x.connections.includes('followed_by'))
                        .forEach(x => mastodonToTwitterFilter.add(x.screen_name))
                })
                .catch(console.error)
        }))
        console.debug('filtered requests to', mastodonToTwitterFilter.size, 'existing followers')

        // find Mastodon @s per Twitter
        const { code } = twitterAuth
        const data = []
        await Promise.allSettled(group(Array.from(mastodonToTwitterFilter), 100).map(usernames => {
            return module.exports.twitter.request({
                body: {
                    code,
                    ...twitter,
                    endpoint: `2/users/by`,
                    query: {
                        usernames: usernames.join(','),
                        'user.fields': 'description,url,location',
                        'tweet.fields': 'text',
                        expansions: 'pinned_tweet_id',
                    },
                }
            }).then(result => {
                // concat all user fields, including pinned tweets
                const pinned = {}
                const { body } = result
                body.includes.tweets.map(({ id, text }) => pinned[id] = text)
                data.push(...body.data.map(item => {
                    item.description = [
                        item.description,
                        item.location,
                        item.url,
                        pinned[item.pinned_tweet_id],
                    ].filter(x=>x).join(' ')
                    return item
                }))
            })
        }))

        // resolve t.co
        const TWITTER_LINK_REGEX = /https:\/\/t\.co\/([\w\d]+)/g
        const hashes = Array
        .from(data.concat([twitterAuth]) // ** include user's links too
            .flatMap(({ description, url }) => [description, url]).join(' ')
            .matchAll(TWITTER_LINK_REGEX))
        .map(match => match[1])
        const { mapping: resolved } = await module.exports.tco.request({
            body: {
                code: twitterAuth.code,
                username: twitter.username,
                hashes,
            }
        })
        // console.debug('FETCHED T.CO', Object.keys(resolved).length)

        // resolve user's own links (to avoid overwriting bio/url with t.co)
        const { description, url } = twitterAuth
        const resolveTCo = str => str.replaceAll(TWITTER_LINK_REGEX, match =>
        resolved[match.replace('https://t.co/', '')].replace(/https?:\/\//, ''))
        module.exports.twitter.set(twitter.username, {
            ...twitterAuth,
            description: resolveTCo(description),
            url: resolveTCo(url),
        })

        const usernameToResolved = {}
        data.forEach((_, i) => {
            const { username, description, url } = data[i]
            const matches = Array
                .from((description + ' ' + url).matchAll(TWITTER_LINK_REGEX))
                .map(match => match[1])

            if (matches.length) {
                const urls = matches.map(match => resolved[match])
                usernameToResolved[username] = urls
                data[i].description += ' ' + urls.join(' ')
            }
        })

        console.debug(`search for Mastodon @s across`, data.length, 'Twitter followers')
        // resolve links asynchronously to avoid blocking server
        const twitterToMastodon = {}
        const promises = data.map(({ name, username, description }, i) => () => new Promise(resolve => setTimeout(() => {
            const MASTODON_AT_REGEX = /[@\p{Emoji}][\w\d_]+@(\.?[\w\d/-]+)+/g
            const atMatches = Array
                .from((name + ' ' + description).matchAll(MASTODON_AT_REGEX))
                .map(match => match[0])
                .filter(x => '@🦣 '.includes(x[0]))

            //                            domains      tld/path?    @name     not another @
            //                            |            |            |         |
            const MASTODON_LINK_REGEX = /(([\w\d-]+\.)+([\w\d-]+\/)+@[\w\d_]+)([^@\w\d_]|$)/g
            const linkMatches =
                Array
                .from((name + ' ' + description).matchAll(MASTODON_LINK_REGEX))
                .map(match => match[1])
                .map(link => {
                    // console.debug(link)
                    const [server, username] = link.split('/@')
                    return `@${username}@${server}`
                })
            const matches = [].concat(atMatches, linkMatches)

            // remove repeat domains
            // (TODO including updates like @user@test.example @user@test.example/web ? *might* remove different ones)
            twitterToMastodon[username] =
                Array.from(new Set(matches)).filter(x => !IGNORE_DOMAINS.has(x.split('@').slice(-1)[0]))
            resolve()
        })))
        while (promises.length) await promises.shift()()
        const n_mastodons = ({ username }) => twitterToMastodon[username].length
        data.sort((a, b) => n_mastodons(b) - n_mastodons(a))
        console.debug('filtered requests to', Object.keys(twitterToMastodon).length, 'followers with proper backlinks')

        // finally, accept requests from Mastodon @s with a correct backlink from Twitter
        const mastodonsToAccept = Object.entries(mastodonToTwitter)
            .filter(([mastodonAt, twitterAt]) => twitterToMastodon[twitterAt]?.includes(mastodonAt))
            .map(([mastodonAt, twitterAt]) => mastodonAt)
        Object.assign(returns, { mastodonsToAccept })
        const idsToAccept = mastodonsToAccept.map(x => m2i[x])
        return { idsToAccept, twitterInfo: data, twitterToMastodon }
    })
    .then(async ({ idsToAccept }) => { // accept those backlinked follower requests
        if (!idsToAccept) return {} // continue skip

        const { code } = mastodonAuth
        await Promise.allSettled(idsToAccept.map(id => {
            return module.exports.mastodon.request({
                body: {
                    code,
                    ...mastodon,
                    method: 'POST',
                    endpoint: `api/v1/follow_requests/${id}/authorize`,
                }
            })
        }))
        console.debug('done accepting requests from existing followers')
    })

    return returns
}

// sync enabled accounts every 24hrs
const backgroundSync = async () => {
    // background sync
    const enabled = Array.from(await C.sync().find({ sync: true }).toArray())
    const enabledTwitterSet = new Set(enabled.map(x => x.twitter))
    const enabledMastodonSet = new Set(enabled.map(x => x.mastodon))
    console.debug('sync', enabled.length, 'account(s)')

    // sync sequentially to avoid blocking server
    while (enabled.length) await debug_prefix(`#${enabled.length}`, () => performSync(enabled.pop()))

    // delete Twitter / Mastodon entries which do not belong to any sync pair
    const toDelete = Array.from(await C.sync().find({ sync: { $ne: true } }).toArray())
        .filter(x => !enabledTwitterSet.has(x.twitter) && !enabledMastodonSet.has(x.mastodon))
        .map(x => {
            const { twitter, mastodon } = x
            const [username, server] = mastodon.split('@').slice(1)
            return {
                twitter: { username: twitter },
                mastodon: { username, server },
            }
        })

    // C.sync().deleteMany({ sync: { $ne: true } })
    // NVM, keep for Twitter <-> Mastodon mapping, and record of how many people used this app
    // eventually need to create a separate namespace for this to avoid looping over the same account each day

    toDelete.forEach(({ twitter, mastodon }) => {
        C.twitter.deleteMany({ username: twitter.username })
        C.mastodon.deleteMany({ username: mastodon.username, server: mastodon.server })
    })

    db.simple.set('follow-sync-last-sync', Date.now())
}
db.queueInit(() => {
    const lastSync = db.simple.get('follow-sync-last-sync')
    const SYNC_INTERVAL = 24 * 60 * 60 * 1000
    setTimeout(() => {
        setInterval(backgroundSync, SYNC_INTERVAL)
    }, Date.now() - lastSync)
})

// db.queueInit(backgroundSync)

const twitter = {
    get: async (username) => await C.twitter().findOne({ username }),
    set: async (username, json) => await C.twitter().updateOne({ username }, { $set: {
        username,
        ...json,
    } }, { upsert: true }),
    request: async (req, res={json:pass}) => {
        const { code, username, method='GET', endpoint, headers=[], query=undefined, form=undefined, json=undefined, body=undefined } = req.body

        // make two attempts - if first fails, try re-authorizing
        const attempt = async (oauth=undefined) => await auth.fetch(
            oauth || (await twitter.get(username)), code,
            'https://' + `api.twitter.com/${endpoint}`.replace('//', '/'), {
                method, headers, query, form, json, body,
            }).then(result => {
                // console.log(json)
                // await M.twitter.set(req.params.username, json)
                res.json(result.body)
                return result
            })

        const oauth = await twitter.get(username)
        if (!oauth) return res.writeHead(400).end()
        try {
            return await attempt(oauth)
        } catch {
            const { code: verify, refresh_token } = oauth
            if (!code || code !== verify) throw new Error(`invalid/expired credentials, please re-authorize`)

            const { body: twitterAuth } = await fetch(`https://api.twitter.com/2/oauth2/token`, {
                method: 'POST',
                form: {
                    refresh_token,
                    grant_type: 'refresh_token',
                    client_id: auth.TWITTER_V2_CLIENT_ID,
                },
            })
            // console.log(twitterAuth)
            await twitter.set(username, pick(twitterAuth, 'username code access_token refresh_token'))
            return await attempt()
        }
    },
    v1: {
        get: async (username) => (await C.twitter().findOne({ username })).v1,
        set: async (username, json) => await C.twitter().updateOne({ username }, { $set: {
            username,
            v1: { ...(await twitter.v1.get(username)), ...json },
        } }, { upsert: true }),
        request: async ({ oauth_token=false, oauth_token_secret='' }, url, options={}) => {
            const { method='GET', query, json, form } = options

            const authorization = {
                oauth_consumer_key: auth.TWITTER_V1_OAUTH_CONSUMER_KEY,
                oauth_nonce: randAlphanum(16),
                oauth_signature_method: 'HMAC-SHA1',
                oauth_timestamp: Math.round(Date.now() / 1000),
                oauth_version: '1.0',
                ...(oauth_token ? { oauth_token } : {})
            }

            const signature_values = {
                method,
                url,
                parameter_string: Object
                    .entries({ ...query, ...json, ...form, ...authorization })
                    .map(x => x.map(encodeURIComponent))
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(x => x.join('='))
                    .join('&')
            }
            // console.debug(signature_values)

            const signature_base_string = [
                signature_values.method.toUpperCase(),
                signature_values.url,
                signature_values.parameter_string,
            ].map(encodeURIComponent).join('&')

            const signing_key = [
                auth.TWITTER_V1_OAUTH_CONSUMER_SECRET,
                oauth_token_secret,
            ].map(encodeURIComponent).join('&')

            const hmac = crypto.createHmac('sha1', signing_key)
            hmac.update(signature_base_string)
            authorization.oauth_signature = hmac.digest('base64')

            options.headers = {
                ...(options.headers || {}),
                Authorization: 'OAuth ' + Object
                    .entries(authorization)
                    .map(x => x.map(encodeURIComponent))
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(x => x.map((x, i) => i ? `"${x}"` : x).join('='))
                    .join(', '),
            }
            // console.debug(oauth_token, oauth_token_secret, options.headers)
            return fetch(url, options)
        }
    },
}
const mastodon = {
    get: async (server, username) => await C.mastodon().findOne({ server, username }),
    set: async (server, username, json) => await C.mastodon().updateOne({ server, username }, { $set: {
        server,
        username,
        ...json,
    } }, { upsert: true }),
    request: async (req, res={json:pass}) => {
        const {
            code, server, username,
            method='GET', endpoint, ms,
            headers=[], query=undefined, form=undefined, json=undefined, body=undefined
        } = req.body
        // console.log(code, server, username, endpoint)
        return await auth.fetch(
            await mastodon.get(server, username), code,
            'https://' + `${server}/${endpoint}`.replace('//', '/'), {
                method,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    ...headers,
                },
                ms, query, form, json, body,
            }).then(result => {
                // console.log(json)
                res.json({ link: result.headers['Link'], data: result.body })
                return result
            })
    },
}

const tco = {
    request: async (req, res={json:pass}) => {
        const { code, username, hashes } = req.body
        auth.verify(await twitter.get(username), code)

        const n = hashes.length
        console.log('resolving', n, 't.co links')
        const start = performance.now()

        // initialize mapping
        const mapping = {}
        hashes.forEach(x => mapping[x] = undefined) // preserve ordering

        // query DB for known hashes
        let found = 0
        Array
            .from(await C.tco().find({ hash: { $in: hashes }}).toArray())
            .forEach(x => {
                mapping[x.hash] = x.url
                found += 1
            })
        console.debug('found', found, 'existing hashes')

        // fetch remaining unknown
        // TODO system cURL instead for performance?
        // const result = await childProcess.execSync(
        //     `echo "${hashes.map(x => `https://t.co/`+x).join(' ')}"` +
        //     `| xargs -P1000 curl -I` +
        //     `| grep -Fi location`).toString()
        // console.log(result)
        // result.split('\n').map((line, i) => mapping[hashes[i]] = line.split(' ')[1])
        // return
        // const query = hashes.join(',')
        const writes = new Set()
        await Promise.allSettled(hashes.filter(x => !mapping[x]).map(async (hash, i) => {
            // const s = await childProcess.exec(
            //     `curl https://t.co/${hash}`,
            //     (e, o, r) => console.debug(e, o, r))
            // console.debug(s.toString())
            const result = await fetch(
                `https://t.co/${hash}`, { method: 'HEAD', redirects: false })
            mapping[hash] = result.headers['location']
            mapping[hash] && writes.add(i)
        }))

        const list = hashes.map(x => mapping[x])
        res.json({ list, mapping })
        console.debug('resolved', n, 't.co links in', Math.round(performance.now() - start), 'ms')

        // async write to DB
        console.debug(range(n)
        .filter(i => writes.has(i))
        .map(i => ({
            hash: hashes[i],
            url: list[i],
        })))
        writes.size && C.tco().insertMany(
            range(n)
            .filter(i => writes.has(i))
            .map(i => ({
                hash: hashes[i],
                url: list[i],
            })), {
                ordered: false,
            })

        return { list, mapping }
    },
}

const sync = {
    enable: async (req, res) => {
        const { twitter, mastodon, code: twitterCode, options } = req.body
        auth.verify(await module.exports.twitter.get(twitter.username), twitterCode)


        const sync = !!(twitter.sync || mastodon.sync)
        console.log('enable auto-sync', sync, twitter, mastodon, options)
        if (twitter.sync !== undefined) {
            await module.exports.twitter.set(twitter.username, { sync: twitter.sync })
        }
        if (mastodon.sync !== undefined) {
            await module.exports.mastodon.set(mastodon.server, mastodon.username, { sync: mastodon.sync })
        }
        res.json({
            twitter: pick(await module.exports.twitter.get(twitter.username), 'sync'),
            mastodon: pick(
                await module.exports.mastodon.get(mastodon.server, mastodon.username),
                'sync'),
        })
        const query = {
            twitter: twitter.username,
            mastodon: `@${mastodon.username}@${mastodon.server}`
        }
        C.sync().updateOne(query, { $set: { ...query, sync, options } }, { upsert: true })
    },
    perform: async (req, res) => {
        const {
            twitter: { username: twitter, code: twitterCode },
            mastodon: { username: M_username, server: M_server },
            options,
        } = req.body
        auth.verify(await module.exports.twitter.get(twitter), twitterCode)
        return await performSync({ twitter, mastodon: `@${M_username}@${M_server}`, options })
    },
}

export {
    C,
    auth,
    twitter,
    mastodon,
    tco,
    sync,
}
const module = {
    exports: {
        C,
        auth,
        twitter,
        mastodon,
        tco,
        sync,
    }
}