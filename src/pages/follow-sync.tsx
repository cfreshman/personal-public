import React, { useState } from 'react';
import styled from 'styled-components';
import { A, InfoBody, InfoCheckbox, InfoGroup, InfoLine, InfoSection, InfoStyles, Loader, Select } from '../components/Info';
import { message } from '../components/Messages';
import { Tooltip } from '../components/Modal';
import api, { auth } from '../lib/api';
import { useExpand, useHideLogin } from '../lib/auth';
import console from '../lib/console';
import { copy } from '../lib/copy';
import { useDomains, useF, useI, useM, useStyle } from '../lib/hooks';
import { usePageSettings, useSubpage } from '../lib/hooks_ext';
import { parsePage } from '../lib/page';
import { store } from '../lib/store';
import { JSX, pass, truthy } from '../lib/types';
import url from '../lib/url';
import { S, group, layerBackground, pick, range, set, squash, strToStyle, toStyle } from '../lib/util';
import { convertLinks, TwitterEmoji } from '../lib/render';
import { meta } from '../lib/meta';
import css from 'src/lib/css';

/**
 * sync follows from twitter to mastodon
 * - authorize with mastodon
 *   - write:follows
 * - authorize with twitter
 *   - read follows
 *   - ? write handle / bio / website
 *   - ? post tweet
 * - add mastodon to twitter profile, any/all of:
 *   - append to handle
 *   - append to bio
 *   - set website
 *   - post tweet
 *   - reply to @freshman_dev tweet
 *   - none - this app will remember twitter-mastodon mapping & use for others
 * - read twitter follows
 * - follow mastodon accounts
 *   - optional - select which accounts to follow (deselect all, search?)
 *
 * TODO
 * - better handling of rate-limited APIs
 *   - request Twitter follows & follow Mastodons in parallel
 *   - background server processes
 * - show total # synced
 * x accept requests from followers
 */

const State = {
  INIT: 0,
  AUTH: 1,
  TOKEN: 2,
  SYNC: 3,
  SELECT: 4,
  END: 5,

  PROFILE_AUTH_TOKEN: 6,
  PROFILE_UPDATE: 9,
  PROFILE_END: 10,

  ACCEPT_AUTH: 2.5, // b/n TOKEN and SYNC
}
const Confirm = {
  NONE: 0,
  MASTODON: 1,
  TWITTER: 2,
  TWITTER_V1: 3,
}

const IGNORE_DOMAINS = set('youtube.com tiktok.com')

export default () => {
  usePageSettings({
    hideLogin: true,
    expand: true,
    domains: ['freshman.dev', 'f3n.co'],
    icon: '/raw/follow-sync/icon.png',
    background: '#fff',
  })
  
  useStyle(auth.expand && `
  #main {
    // background: #6a718d !important;
    // background: #575c82 !important; #f4eee2
  }`)

  // state: INIT <-> AUTH -> TOKEN <-> SYNC -> END
  // state: END -> (PROFILE_AUTH_TOKEN ->) PROFILE_UPDATE -> END
  const [state, setState] = store.use('follow-sync-state', { default: 0 })
  console.debug('STATE', ...Object.entries(State).filter(x => x[1] === state))
  // useStyle([State.SELECT])

  const [options, setOptions] = store.use('follow-sync-options', { default: {
    twitterToMastodon: true,
    mastodonToTwitter: false,
    twitterToCohost: false,
    acceptExisting: false,
  } })
  const syncBetweenTwitterAndMastodon = options.twitterToMastodon || options.mastodonToTwitter

  const server = useM(() => store.persist('follow-sync-mastodon-server', { default: '' }))
  server.use()
  const servers = [server.get()].filter(truthy)

  // handle OAuth return values
  const isAuth = state === State.AUTH
  const subpage = useSubpage()
  const isMastodon = isAuth && subpage.startsWith('mastodon')
  const isTwitter = isAuth && subpage === 'twitter'
  const isTwitterProfile = subpage === 'twitter-profile' && (
    isAuth || [State.TOKEN, State.ACCEPT_AUTH, State.PROFILE_AUTH_TOKEN].includes(state))
  const confirm = useM(subpage, isTwitter, isMastodon, isTwitterProfile, () => {
    const value =
      isTwitter ? Confirm.TWITTER :
      isMastodon ? Confirm.MASTODON :
      isTwitterProfile ? Confirm.TWITTER_V1 :
      Confirm.NONE
    console.debug(subpage, isMastodon, isTwitter, isTwitterProfile, 'CONFIRM', value)
    return value
  })
  const query = new URLSearchParams(location.search)
  const mastodonAuth = useM(() => store.persist('follow-sync-mastodon-auth', { default: {} }))
  const [{ username: mastodon_username, server: mastodon_server }] = mastodonAuth.use()
  useI(mastodonAuth, () => console.debug('MASTODON AUTH', mastodon_username, mastodon_server, mastodonAuth.get()))
  const mastodon = mastodon_username && `${mastodon_username}@${mastodon_server}`
  const mastodons = [mastodon].filter(truthy)
  const mastodon_parts = mastodons.map(x => x.split('@'))
  if (isMastodon && query.has('code')) {
    // TODO handle multiple servers
    mastodonAuth.set({ ...mastodonAuth.get(), code: query.get('code') })
    // setTimeout(() => handle.next())
  }
  const twitterAuth = useM(() => store.persist('follow-sync-twitter-auth', { default: {} }))
  const [{ username: twitter }] = twitterAuth.use()
  if (isTwitter && query.has('code')) {
    twitterAuth.set({ ...twitterAuth.get(), code: query.get('code') })
    // setTimeout(() => handle.next())
  }

  const sync = twitterAuth.get().sync || mastodonAuth.get().sync

  // fetched Twitter follows, progress syncing to Mastodon
  const [syncProgress, setSyncProgress] = useState('')
  const [twitterFollows, setTwitterFollows] = useState([])
  const [twitterToMastodon, setTwitterToMastodon] = useState<{ [key:string]: string[] }>({
    // 'freshman_dev': ['@cyrusfreshman@sigmoid.social'],
  })
  const [followProgress, setFollowProgress] = useState<{
    started?: true,
    fraction?: string,
    accept?: true,
    complete?: true,
    error?: any,
  }>({})
  useF(state, () => setFollowProgress({})) // clear follow progress on state change

  /**
   * FOR OPTIONS
   */
  // TODO some better UI for accept followers progress
  const [mastodonRequests, setMastodonRequests] = useState<{ [key:string]: {
    username: string, id: string, name: string
  } }>({})
  const [twitterToCohost, setTwitterToCohost] = useState<{ [key:string]: string[] }>({})

  /**
   * FOR PROFILE UPDATE (secondary to sync functionality)
   */
  const twitterV1Auth = useM(() => store.persist('follow-sync-twitter-v1-auth', { default: {} }))
  twitterV1Auth.use()
  useI(isTwitterProfile, () => {
    if (isTwitterProfile && query.has('oauth_token') && query.has('oauth_verifier')) {
      const newTwitterProfileAuth = {
        ...twitterV1Auth.get(),
        oauth_token: query.get('oauth_token'),
        oauth_verifier: query.get('oauth_verifier'),
      }
      console.debug('IS TWITTER PROFILE', newTwitterProfileAuth)
      twitterV1Auth.set(newTwitterProfileAuth)
      // setTimeout(() => handle.next())
    }
  })

  useI(isAuth, isTwitterProfile, () => {
    if (subpage) {
      url.replace(location.pathname.replace('/'+subpage, ''))
      setTimeout(() => handle.next())
    }
  })

  // TODO ? compress mastodon
  // usernames & domains are case-insensitive
  // usernames consist of 37 unique characters 0-9a-Z_
  // domains consist of 38 unique characters 0-9a-Z-.
  // limit to 38 total by formatting user_name dom.ain as user-name.dom.ain
  const _compressUser = mastodons[0] ? mastodon_parts[0][0] : 'you'
  const _compressDomain = mastodons[0] ? mastodon_parts[0][1] ?? 'mastodon.example' : 'mastodon.example'
  const _compressMastodon = (_compressUser.replace(/_/g, '-') + '.' + _compressDomain).toLowerCase()
  // const previewMastodonCompressed = useM(_compressMastodon, () => {
  //   console.debug(_compressMastodon, _compressUser, _compressDomain)
  //   const _compressValue = Array.from<string>(_compressMastodon).map(char => {
  //     if (/[0-9]/.test(char)) return char.codePointAt(0) - '0'.codePointAt(0)
  //     if (/[a-z]/.test(char)) return 10 + char.codePointAt(0) - 'a'.codePointAt(0)
  //     if (/-/.test(char)) return 10 + 26
  //     if (/\./.test(char)) return 10 + 26 + 1
  //     throw 'unexpected string for compression'
  //   })
  //   .map((x, i) => {
  //     // naive exponentiation
  //     let result = BigInt(x)
  //     while (i--) result *= BigInt(38)
  //     // console.debug(i, x, result)
  //     return result
  //   })
  //   .reduce((sum, x) => sum + x)

  //   // now convert from this large number to an Uint8Array
  //   let _n = _compressValue
  //   const _arr = []
  //   do {
  //     // _arr.unshift(_n.asUintN(8))
  //     _arr.unshift(Number(BigInt.asUintN(8, _n)))
  //     _n = _n / BigInt(256)
  //   } while (_n)
  //   const previewMastodonCompressed = encode(new Uint8Array(_arr))
  //   console.debug(previewMastodonCompressed, _compressValue, _arr)
  //   return previewMastodonCompressed
  // })


  const previewMastodon = '@' + (mastodons[0] || 'you@mastodon.example')
  const previewMastodonLink = mastodons[0] ? `${mastodon_parts[0][1] ?? 'mastodon.example'}/@${mastodon_parts[0][0]}` : `mastodon.example/@you`
  const previewToolLink = 'nn.fo/sync-mastodon' // f3n.co/sync-mastodon f3n.co/🦣
  const previewToolFullLink = 'freshman.dev/follow-sync' // f3n.co/sync-mastodon f3n.co/🦣
  const previewToolShortLink = `nn.fo/llow`
  const previewToolTinyLink = `nn.fo/M`

  const twitterUpdateOptions = useM(() => ({}))
  useI(previewMastodon, () => Object.assign(twitterUpdateOptions, {
    name: [
      '',
      `- ${previewMastodon}`,
      '🦣',
      `🦣 ${previewMastodon}`,
    ],
    bio: [
      '',
      '\n',
      `- 🦣 ${previewMastodonLink}`,
      `- 🦣 ${previewMastodon}`,
      // `- ${previewToolLink}`,
      `- 🦣 sync follows to Mastodon: ${previewToolShortLink}`,
      `- 🦣 ${previewMastodonLink} sync follows to Mastodon: ${previewToolShortLink}`,
      // `- ${previewMastodon} (sync follows to 🦣 ${previewToolShortLink}`,
      `- 🦣 ${previewMastodon} sync follows to Mastodon: ${previewToolShortLink}`,
      // <JSX key=''>
      //   <TwitterEmoji letter='🦣'/>
      //   &nbsp;sync Twitter follows to Mastodon with&nbsp;
      //   <a href={previewToolHref+'/'+previewMastodon}>
      //     {/* sync.ý.fo/{encode(new TextEncoder().encode(previewMastodon))} */}
      //     {/* ý.fo/{previewMastodon} */}
      //     {/* mastodon.ý.fo/{previewMastodonCompressed} */}
      //     f3n.co/follow-sync/C{previewMastodonCompressed}
      //     {/* {previewToolShortLink}/{previewMastodon} */}
      //   </a>
      // </>,
      // `🦣 nn.fo/llow/@${previewMastodonCompressed}`,
    ],
    bio_emoji: ['', '🦣'],
    bio_mastodon: ['', previewMastodonLink, previewMastodon],
    bio_describe: ['', 'sync follows:', 'sync follows to Mastodon:'],
    bio_tool: ['', previewToolLink, 'sync follows: '+previewToolTinyLink, 'freshman.dev/follow-sync'],
      // 'sync follows: '+previewToolShortLink,
    website: [
      '',
      previewMastodonLink,
      previewToolLink,
    ],
    location: [
      '',
      previewMastodon,
      previewMastodonLink,
    ],
    tweet: [
      '',
      // `follow me (and the rest of your network) on Mastodon: ${previewToolLink}`,
`[automated message]
sync your follows to Mastodon:
🦣 ${previewToolLink}

if you don't have one, you can join from here:
${previewMastodonLink}`,
`[automated message]
🦣 sync your follows to Mastodon: ${previewToolFullLink}

if you don't have one, you can join from here:
${previewMastodonLink}`,
`[automated message]
🦣 sync your follows to Mastodon: ${previewToolFullLink}`,
// if you're not on Mastodon yet, you can join here: ${previewMastodonLink}`,
// if you're not on Mastodon, you can join here: ${previewMastodonLink}
    ],
  }))
  const twitterUpdateOptionsMeta = useM(() => ({
    name: [0, '@', 'emoji', '@ + emoji'],
    // bio: [0, 'link', '@', 'tool', 'link + tool', '@ + tool'],
    // bio: [0, 1],
    bio_emoji: ['no emoji', 'emoji'], // ↳
    bio_mastodon: ['no mastodon', 'link', '@'],
    bio_describe: ['-', 'label', 'describe'],
    bio_tool: ['no tool', 'tool', 'tiny', 'full'], // 'short',
    website: [0, 'mastodon', 'tool'],
    location: [0, '@', 'link'],
    tweet: [0, 'tool + mastodon', 'full + mastodon', 'full'],
  }))
  const _base = { name: 0, bio: 0, bio_emoji: 1, bio_mastodon: 1, bio_describe: 0, bio_tool: 1, website: 0, location: 0, tweet: 0 }
  const twitterUpdatePresets = {
    'emoji-bio-tool': { ..._base, name: 2, bio: 1, bio_tool: 1 },
    'emoji-bio-tweet': { ..._base, name: 2, bio: 1, bio_tool: 0, tweet: 1 },
    // 'name / tool': { ..._base, name: 1, bio: 1, bio_mastodon: 0, bio_tool: 3 },
    'name-tweet': { ..._base, name: 1, tweet: 1 },
    // 'location-tool (if bio full)': { ..._base, location: 1, bio: 1, bio_mastodon: 0 },
  }
  const defaultTwitterUpdatePreset = Object.values(twitterUpdatePresets)[0]
  const [twitterUpdates, setTwitterUpdates] = useM(
    () => store.persist<{
      name, bio, website, location, tweet,
    }>('follow-sync-twitter-updates', { default: defaultTwitterUpdatePreset })
    ).use()
  const isDefaultTwitterUpdatePreset = JSON.stringify(defaultTwitterUpdatePreset) === JSON.stringify(twitterUpdates)

  const [twitterUpdateContents, setTwitterUpdateContents] = useM(
      () => store.persist<{
        bio?, tweet?,
      }>('follow-sync-twitter-update-contents', { default: {} })
      ).use()

  const previewUpdates = useM(twitterUpdates, twitterAuth.get(), () => {
    const previewUpdates = squash(Object.keys(defaultTwitterUpdatePreset).map(k => ({
      [k]: twitterUpdateOptions[k][twitterUpdates[k]]
    })))

    const addedBio = previewUpdates.bio && (previewUpdates.bio + [
      previewUpdates.bio_emoji,
      previewUpdates.bio_mastodon,
      previewUpdates.bio_describe,
      previewUpdates.bio_tool
    ].filter(truthy).join(' '))

    let { name: currentName='', description: currentBio='' } = twitterAuth.get()
    if (addedBio) [ // clear other bio options
      twitterUpdateOptions.bio_emoji,
      twitterUpdateOptions.bio_mastodon,
      // twitterUpdateOptions.bio_describe,
      twitterUpdateOptions.bio_tool,
    ].flatMap(pass).filter(truthy).map(x =>
      currentBio = currentBio.replace('\n'+x, '').replace(' '+x, '').replace(x, ''))
    previewUpdates.bio = twitterUpdateContents.bio || addedBio && (currentBio + addedBio)
    previewUpdates.renderedBio = twitterUpdateContents.bio ? convertLinks(twitterUpdateContents.bio) : <>
      <span style={{ opacity: .4, whiteSpace: 'pre-wrap' }}>{convertLinks(currentBio)}</span>
      {convertLinks(addedBio || '')}
    </>
    if (previewUpdates.name) [
      twitterUpdateOptions.name
    ].flatMap(pass).filter(truthy).map(x => currentName = currentName.replace(' '+x, ''))
    previewUpdates.name = [currentName, previewUpdates.name].filter(truthy).join(' ')
    previewUpdates.tweet = twitterUpdateContents.tweet || previewUpdates.tweet

    console.debug('TWITTER PROFILE UPDATE', previewUpdates)
    return previewUpdates
  })

  const page = ('/' + parsePage()).replace(/\/$/, '')
  const APP_NAME = location.host + page
  const APP_WEBSITE = location.origin + page
  const handle = {
    next: () => {
      switch (state) {
        case State.INIT:
          // register app with Mastodon (Twitter is already registered), then move on to SYNC
          if (!servers[0] && !options.twitterToCohost) {
            (document.body.querySelector(('#input-mastodon')) as any).focus()
            return
          }
          Promise
          .allSettled(
            // TODO multiple servers
            servers.slice(0, 1).map(server => api.external(
              // must register app with each server
              `https://${server}/api/v1/apps`, 'POST', {
                query: {
                  client_name: APP_NAME,
                  redirect_uris: APP_WEBSITE + '/mastodon',
                  scopes: `read:accounts read:search write:follows ${options.acceptExisting ? 'read:follows' : ''}`,
                  website: APP_WEBSITE,
                },
              })
              .then(data => {
                console.debug('MASTODON REGISTER', data)
                mastodonAuth.set(data)
                // TODO handle multiple servers
                // mastodonAuth.set({ [server]: data })
              }))
          )
          .then(() => {
            // open Mastodon OAuth to start
            // TODO multiple servers

            setState(State.AUTH)
            // wait a few seconds
            // setTimeout(() => setState(State.AUTH), 2000)
          })
          break
        case State.AUTH:
          console.debug('here', confirm)
          // present user with oauth permission requests
          // INIT -> Mastodon
          // (TODO multiple Mastodon servers)
          // Mastodon -> Twitter
          // Twitter -> TOKEN (-> SYNC -> SELECT -> END)
          switch (confirm) {
            case Confirm.NONE: // -> Twitter
              url.external(api.format(`https://twitter.com/i/oauth2/authorize`, { query: {
                response_type: 'code',
                client_id: 'YnpoV3lISGV1SDRIZzY3bE1jb3g6MTpjaQ',
                redirect_uri: APP_WEBSITE + '/twitter',
                // redirect_uri: 'https://freshman.dev/follow-sync/twitter',
                // scope: 'follows.read users.read offline.access',
                scope: `tweet.read users.read follows.read offline.access ${options.mastodonToTwitter ? 'follows.write' : ''}`,
                // scope: 'users.read tweet.read offline.access',
                state: 'state',
                code_challenge: 'challenge',
                code_challenge_method: 'plain',
              }}))
              break
            case Confirm.TWITTER: // -> Mastodon
              if (servers[0]) {
                url.external(api.format(`https://${servers[0]}/oauth/authorize`, { query: {
                  response_type: 'code',
                  client_id: mastodonAuth.get().client_id,
                  redirect_uri: APP_WEBSITE + '/mastodon',
                  scope: `read:accounts read:search write:follows ${options.acceptExisting ? 'read:follows' : ''}`,
                }}))
              } else if (syncBetweenTwitterAndMastodon) {
                setState(State.INIT)
              } else {
                setState(State.TOKEN)
              }
              break
            case Confirm.MASTODON: // -> TOKEN
            case Confirm.TWITTER_V1: // -> TOKEN (need to get username first)
              setState(State.TOKEN)
              break
          }
          break
        case State.TOKEN:
          // fetch / verify / refresh app tokens
          {
            console.debug('TWITTER AUTH', twitterAuth.get())
            const { code } = twitterAuth.get()
            Promise
            // request tokens
            .all([
              // mastodon
              ...servers.slice(0, 1).map(server => {
                const { client_id, client_secret, code } = mastodonAuth.get()
                const query = new URLSearchParams({ code, client_id, client_secret })
                return api.get(`follow-sync/oauth/mastodon/${server}?${query.toString()}`)
                .then(data => {
                  console.debug('MASTODON USER', data)
                  mastodonAuth.set({ ...mastodonAuth.get(), ...data }) // the mastodon user
                })
              }),
              // twitter
              api.get(`follow-sync/oauth/twitter?code=${code}`)
              .then(data => {
                console.debug('TWITTER USER', data)
                twitterAuth.set({ ...twitterAuth.get(), ...data }) // the twitter user
              })
            ])
            .then(() => {
              console.debug('ACCEPT EXISTING?', options.acceptExisting)
              if (options.acceptExisting && !twitterV1Auth.get().oauth_token) {
                setState(State.ACCEPT_AUTH)
              } else {
                setState(State.SYNC)
              }
            })
          }
          break
        case State.ACCEPT_AUTH:
          handle.twitterV1(State.SYNC)
          break
        case State.SYNC:
          // attempt some rate-limited things:
          // - read Twitter follows
          // - optional: read Mastodon requests
          // bonus: update UI
          // note: Twitter access_token lasts 2 hours before requiring refresh

          {
            const { username: twitterAt } = twitterAuth.get()
            const { username: M_username, server: M_server } = mastodonAuth.get()
            const mastodonAt = `@${M_username}@${M_server}`
            console.debug('SYNC', twitterAt, mastodonAt)

            setSyncProgress(`fetching Twitter profiles`)
            Promise.resolve()
            // fetch user ID
            .then(async () => { // read Twitter follows
              const { id, code } = twitterAuth.get()

              let response
              do {
                const previous = response?.data ?? []
                try {
                  response = await api.post('follow-sync/twitter', {
                    code,
                    username: twitter,
                    endpoint: `2/users/${id}/following`,
                    query: {
                      max_results: 1000,
                      pagination_token: response?.meta?.next_token,
                      'user.fields': 'description,url,location',
                      'tweet.fields': 'text',
                      expansions: 'pinned_tweet_id',
                    },
                  })
                  console.debug(response)

                  // concat all user fields (TODO finish)
                  // including pinned tweets
                  const pinned = {}
                  response.includes.tweets.map(({ id, text }) => pinned[id] = text)
                  response.data = previous.concat(response.data.map(item => {
                    item.description = [
                      item.description,
                      item.location,
                      // item.url,
                      pinned[item.pinned_tweet_id],
                    ].filter(truthy).join(' ')
                    return item
                  }))

                  // setTwitterFollows(response?.data ?? [])
                  setSyncProgress(`fetching Twitter profiles (#${response.data.length})`)
                } catch {
                  console.debug(response)
                  if (response) delete response.meta
                }
              } while (response?.meta?.next_token)
              return response
            })
            .then(async ({ data }) => { // parse Mastodon @s
              console.debug('TWITTER FOLLOWS', data)
              if (!data) return setState(State.INIT) // authorization has expired TODO request new access token
              data = data.filter(truthy)

              await handle.resolveTwitterLinks(data)
              data.forEach(x => x.searchContent = x.name + ' ' + x.description)

              const twitterToMastodon = {}
              const n_mastodons = ({ username }) => (twitterToMastodon[username] ?? '').length
              if (syncBetweenTwitterAndMastodon) {
                setSyncProgress(`searching for Mastodon @s (0/${data.length})`)
                // nvm // resolve links asynchronously to allow for UI to update
                const MASTODON_AT_REGEX = /[@\p{Emoji}][\w\d_]+@(\.?[\w\d/-]+)+/g
                //                            domains      tld/path?    @name     not another @
                //                            |            |            |         |
                const MASTODON_LINK_REGEX = /(([\w\d-]+\.)+([\w\d-]+\/)+@[\w\d_]+)([^@\w\d_]|$)/g
                data.map(({ username, searchContent }, i) => {
                  // console.debug(
                  //   username,
                  //   name + ' ' + description)
                  // i%50 === 0 && setSyncProgress(`searching for Mastodon @s (${i}/${data.length})`)
                  // match email syntex as well (fairly noisy)
                  // const MASTODON_AT_REGEX = /(^|[@ \p{Emoji}])[\w\d_]+@(\.?[\w\d/-]+)+/g

                  const atMatches = Array
                    .from(searchContent.matchAll(MASTODON_AT_REGEX))
                    .map(match => match[0])
                    .filter(x => '@🦣 '.includes(x[0]))

                  const linkMatches =
                    Array
                    .from(searchContent.matchAll(MASTODON_LINK_REGEX))
                    .map(match => match[1])
                    .map(link => {
                      console.debug(link)
                      const [server, username] = link.split('/@')
                      return `@${username}@${server}`
                    })
                  const matches = [].concat(atMatches, linkMatches)
                  // matches.length && console.debug(
                  //   Array.from((name + ' ' + description).matchAll(MASTODON_LINK_REGEX)),
                  //   atMatches, linkMatches)

                  // remove repeat domains
                  // (TODO including updates like @user@test.example @user@test.example/web ? *might* remove different ones)
                  twitterToMastodon[username] =
                    Array.from(new Set(matches)).filter(x => !IGNORE_DOMAINS.has(x.split('@').slice(-1)[0]))
                })
                // while (promises.length) await promises.shift()()

                console.debug(twitterToMastodon)
                setSyncProgress(`sorting found Mastodon @s`)
                setTwitterFollows(data.sort((a, b) => {
                  return Math.min(1, n_mastodons(b)) - Math.min(1, n_mastodons(a))
                }))
                setTwitterToMastodon(twitterToMastodon)
              }

              if (options.twitterToCohost) {
                setSyncProgress(`searching for cohost.org @s (0/${data.length})`)
                const twitterToCohost = {}
                const COHOST_REGEX = /(cohost.org\/[\w\d_]+)([^@\w\d_]|$)/g
                {
                  data.map(({ username, searchContent }, i) => {
                    // console.debug(
                    //   username,
                    //   name + ' ' + description)
                    i%50 === 0 && setSyncProgress(`searching for cohost.org @s (${i}/${data.length})`)

                    // const COHOST_REGEX = /(cohost.org\/[\w\d_]+)([^@\w\d_]|$)/g
                    const matches =
                      Array
                      .from(searchContent.matchAll(COHOST_REGEX))
                      .map(match => match[1])

                    // remove repeat domains
                    // (TODO including updates like @user@test.example @user@test.example/web ? *might* remove different ones)
                    twitterToCohost[username] = Array.from(new Set(matches))
                  })
                  // while (promises.length) await promises.shift()()
                  setTwitterToCohost(twitterToCohost)
                  const n_cohost = ({ username }) => (twitterToCohost[username] || '').length
                  setTwitterFollows(data.sort((a, b) => {
                    return Math.min(1, n_mastodons(b) + n_cohost(b)) - Math.min(1, n_mastodons(a) + n_cohost(a))
                  }))
                }
              }
            })
            .then(async () => { // read Mastodon reqs, parse Twitter @s, read Twitter fllwrs, parse Mastodon @s
              // find existing followers
              if (!options.acceptExisting) return {} // skip
              return {}

              const { code, username, server } = mastodonAuth.get()

              let results = [], pagination
              do {
                const requestCount = results.length
                console.debug(`fetch Mastodon pending requests`, requestCount + 1, 'up to', requestCount + 1000)
                try {
                  const { link, data: result } = await api.post('follow-sync/mastodon', {
                    code,
                    username, server,
                    endpoint: `api/v1/follow_requests`,
                    headers: pagination && { Link: pagination },
                    query: {
                      limit: 1000, // TODO determine actual value
                    },
                  })
                  // console.debug(headers, result)
                  pagination = link
                  results.push(...result)
                } catch (e) {
                  console.debug(e)
                  pagination = undefined
                }
              } while (pagination)
              console.debug('MASTODON REQUESTS', results)

              // search for Twitter accounts across those Mastodon profiles
              const mastodonToTwitter = {}
              const m2i = {}
              results.forEach(x => {
                // parse Mastodon @ from url
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
                    const [server, username] = x.url.replace(/https?:\/\//, '').split('/@')
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

              const { code, username } = twitterAuth.get()
              const { oauth_token } = twitterV1Auth.get()

              // filter discovered Twitter @s to followers
              const mastodonToTwitterFilter = new Set()
              await Promise.allSettled(group(Object.values(mastodonToTwitter), 100).map(twitters => {
                return api.post('follow-sync/twitter-v1', {
                  username, oauth_token,
                  method: 'GET',
                  endpoint: '1.1/friendships/lookup.json',
                  query: {
                    screen_name: twitters.join(',')
                  },
                }).then(async result => {
                  result.body
                    .filter(x => x.connections.includes('followed_by'))
                    .forEach(x => mastodonToTwitterFilter.add(x.screen_name))
                })
              }))
              console.debug('filtered requests to', mastodonToTwitterFilter.size, 'existing followers')

              // find Mastodon @s per Twitter
              const data = []
              await Promise.allSettled(group(Array.from(mastodonToTwitterFilter), 100).map(usernames => {
                  return api.post('follow-sync/twitter', {
                    code, username,
                    endpoint: `2/users/by`,
                    query: {
                        usernames: usernames.join(','),
                        'user.fields': 'description,url,location',
                        'tweet.fields': 'text',
                        expansions: 'pinned_tweet_id',
                    },
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
              handle.resolveTwitterLinks(data)

              console.debug(`search for Mastodon @s across`, data.length, 'Twitter followers')
              // resolve links asynchronously to avoid blocking server
              const twitterToMastodon = {}
              const promises = data.map(({ name, username, description }, i) => () => new Promise<void>(resolve => setTimeout(() => {
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
              const idsToAccept = Object.entries(mastodonToTwitter)
                  .filter(([mastodonAt, twitterAt]) => twitterToMastodon[twitterAt as any]?.includes(mastodonAt))
                  .map(([mastodonAt, twitterAt]) => m2i[mastodonAt])

              return { idsToAccept, twitterInfo: data, twitterToMastodon }
            })
            // .then(async ({ idsToAccept }) => { // accept those backlinked follower requests
            //     if (!idsToAccept) return {} // continue skip

            //     const { code } = mastodonAuth
            //     await Promise.allSettled(idsToAccept.map(id => {
            //         return module.exports.mastodon.request({
            //             body: {
            //                 code,
            //                 ...mastodon,
            //                 method: 'POST',
            //                 endpoint: `api/v1/follow_requests/${id}/authorize`,
            //             }
            //         })
            //     }))
            //     console.debug('done accepting requests from existing followers')
            // })
            .finally(() => {
              // if (!twitterFollows.length) setTwitterFollows([{}])
              setState(State.SELECT)
            })
          }
          break
        case State.SELECT:
          // follow selected accounts
          {
            // const followAllEl = document.querySelector('#follow-all')
            // followAllEl.textContent = 'FOLLOWING...'
            setFollowProgress({
              started: true,
            })
            Promise.resolve()
            .then(async () => {
              // fetch account IDs (use any of user's Mastodons - TODO spread)
              const { code, server, username } = mastodonAuth.get()
              const to_search = Object.values(twitterToMastodon).flatMap(pass)
              let total = to_search.length
              let curr = 0
              const account_search: any = await Promise.allSettled(to_search.map(follow => {
                console.debug(follow)
                // setFollowProgress({
                //   started: true,
                //   fraction: `${++curr}/${total}`,
                // })
                // followAllEl.textContent = `FOLLOWING ${++curr}/${total}`
                return api
                  .post('follow-sync/mastodon', {
                    method: 'GET',
                    code, server, username,
                    endpoint: `api/v2/search`,
                    ms: 2000,
                    query: {
                      q: follow,
                      resolve: true,
                      limit: 1,
                      type: 'accounts',
                    },
                  })
                  .catch(() => {
                    curr--;
                    total--;
                  })
                  .finally(() => setFollowProgress({
                    started: true,
                    fraction: `${++curr}/${total}`,
                  }))
              }))
              const accounts = account_search
                .map(x => x.data)
                .filter(truthy)
                .map(({ value: { accounts=[] }={}}) => accounts[0])
                .filter(truthy)
              console.debug('ACCOUNTS', accounts)

              // follow each target from each mastodon
              const results = await Promise.allSettled(mastodon_parts.map(([username, server]) => {
                // TODO invert for multiple accounts
                const { code } = mastodonAuth.get()
                return Promise.allSettled(accounts.map(account => api.post(
                  'follow-sync/mastodon', {
                    method: 'POST',
                    code, server, username,
                    endpoint: `api/v1/accounts/${account.id}/follow`,
                  })))
              }))
              console.debug('FOLLOWED', results.map(x => x))
              // followAllEl.textContent = 'FOLLOW ALL - DONE'
              // setTimeout(() => setState(State.END), 1500)

              // also sync from backend to accept followers if enabled
              if (options.acceptExisting) {
                setFollowProgress({
                  accept: true
                })
                await api.post('follow-sync/sync', {
                  twitter: twitterAuth.get(),
                  mastodon: mastodonAuth.get(),
                  options,
                })
              }

              setFollowProgress({
                complete: true
              })
              setState(State.END)
            })
            .catch(e => {
              setFollowProgress({
                error: e.error ?? e.message ?? e.text ?? e
              })
            })
          }
          break
        case State.PROFILE_AUTH_TOKEN:
          handle.twitterV1()
          break
        case State.PROFILE_UPDATE:
          {
            // get profile values, replace with selected updates
            const query: any = {}
            if (twitterUpdates.name) query.name = previewUpdates.name
            if (twitterUpdates.bio) query.description = previewUpdates.bio
            if (twitterUpdates.website) query.url = previewUpdates.website
            if (twitterUpdates.location) query.location = previewUpdates.location
            console.debug(query.description)

            const handleErrors = result => {
              if (result.errors) {
                result.errors.map(x => message.trigger('[TWITTER] '+x.message))
                if (result.errors.some(x => [32, 89].includes(x.code))) {
                  twitterV1Auth.set({})
                  message.trigger(`<a href="http://twitter.com/intent/tweet?text=${encodeURIComponent(previewUpdates.tweet)}">click here to send a tweet instead</a>`)
                }
                setState(State.END)
              }
              return result.errors
            }
            const { oauth_token } = twitterV1Auth.get()
            console.debug('UPDATE TWITTER', query)
            api.post('follow-sync/twitter-v1', {
              username: twitter, oauth_token,
              method: 'POST',
              endpoint: '1.1/account/update_profile.json',
              query,
            }).then(async data => {
              console.debug('TWITTER PROFILE UPDATED', data)
              if (handleErrors(data)) return

              if (previewUpdates.tweet) await api.post('follow-sync/twitter-v1', {
                username: twitter, oauth_token,
                method: 'POST',
                endpoint: '1.1/statuses/update.json',
                query: { status: previewUpdates.tweet },
              }).then(data => {
                console.debug('TWITTER PROFILE TWEETED', data)
                handleErrors(data)
              })

              setState(State.PROFILE_END)
            })
          }
          break
      }
    },
    twitterV1: async (next=State.PROFILE_UPDATE) => {
      /* Twitter v1 oauth for profile update
      1) POST oauth/request_token form:{ oauth_callback oauth_consumer_key }
      => json:{ oauth_token oauth_token_secret oauth_callback_confirmed }
      2) send user to https://api.twitter.com/oauth/authorize?oauth_token=<>
      => ?oauth_token=<>&oauth_verifier=<>
      4) POST oauth/access_token form:{ oauth_consumer_key oauth_token oauth_verifier }
      => json:{ oauth_token oauth_token_secret }
      5) done - use as form:{ oauth_consumer_key oauth_token }
      */
      console.debug(twitterAuth.get())
      const { username } = twitterAuth.get()
      const { oauth_token, oauth_verifier } = twitterV1Auth.get()
      console.debug('PROFILE_AUTH_TOKEN', twitterV1Auth.get())
      // return
      if (!(oauth_token || oauth_verifier)) {
        // fetch request token, then send to Twitter oauth prompt
        api.post('follow-sync/oauth/twitter-v1', { username }).then(data => {
          console.debug('TWITTER PROFILE REQUEST', data)
          const { oauth_token } = data
          twitterV1Auth.set({ ...twitterV1Auth.get(), oauth_token })
          url.external(api.format(`https://api.twitter.com/oauth/authorize`, { query: { oauth_token } }))
        })
      } else {
        // fetch access token, then EDIT
        api.post('follow-sync/oauth/twitter-v1', {
          username, oauth_token, oauth_verifier
        }).then(data => {
          console.debug('TWITTER PROFILE ACCESS', data)
          const { oauth_token } = data
          twitterV1Auth.set({ ...twitterV1Auth.get(), oauth_token })
          setState(next)
        })
      }
    },
    resolveTwitterLinks: async (profiles=[]) => {
      // first, we need to expand any shortened t.co URLs (thanks Twitter)
      // just append to end of description
      // (also - expand user's own links here ** )
      const TWITTER_LINK_REGEX = /https:\/\/t\.co\/([\w\d]+)/g
      const hashes = Array
        .from(profiles.concat([twitterAuth.get()]) // ** include user's links too
          .flatMap(({ description, url }) => [description, url]).join(' ')
          .matchAll(TWITTER_LINK_REGEX))
        .map(match => match[1])

      setSyncProgress(`resolving ${hashes.length} t.co links`)
      const start = Date.now()
      console.debug('RESOLVE', hashes)
      const resolved = store.get('follow-sync-resolved-tco') || {}
      // const { mapping: resolved } = await api.post('follow-sync/tco', {
      //   code: twitterAuth.get().code,
      //   username: twitter,
      //   hashes,
      // })
      // await Promise.allSettled(hashes.filter(x => !resolved[x]).map(async hash => {
      //   try {
      //     const result = await fetch(`https://t.co/`+hash).then(res => res.text())
      //     resolved[hash] = /URL=([^"]*)/.exec(result)[1]
      //   } catch {
      //     // pass
      //   }
      // }))
      const unknown = hashes.filter(x => !resolved[x])
      await Promise.allSettled([
        hashes
        // unknown.slice(0, unknown.length/2)
        .map(async hash => {
          try {
            const result = await fetch(`https://t.co/`+hash).then(res => res.text())
            resolved[hash] = /URL=([^"]*)/.exec(result)[1]
          } catch {
            // pass
          }
        }),
        // api.post('follow-sync/tco', {
        //   code: twitterAuth.get().code,
        //   username: twitter,
        //   // hashes,
        //   hashes: unknown.slice(unknown.length/2),
        // }).then(({ mapping }) => Object.assign(resolved, mapping))
      ])
      store.set('follow-sync-resolved-tco', resolved)
      console.debug('FETCHED T.CO', resolved, 'in', Date.now() - start, 'ms')

      // resolve user's own links (to avoid overwriting bio/url with t.co)
      const { description, url } = twitterAuth.get()
      console.debug('REPLACE', description, url)
      const resolveTCo = str => str.replaceAll(TWITTER_LINK_REGEX, match =>
        (resolved[match.replace('https://t.co/', '')] || '').replace(/https?:\/\//, ''))
      twitterAuth.set({
        ...twitterAuth.get(),
        description: resolveTCo(description),
        url: resolveTCo(url),
      })
      console.debug('RESOLVED OWN LINKS', resolved)

      const usernameToResolved = {}
      profiles.forEach((_, i) => {
        const { username, description, url } = profiles[i]
        const matches = Array
          .from((description + ' ' + url).matchAll(TWITTER_LINK_REGEX))
          .map(match => match[1])

        if (matches.length) {
          const urls = matches.map(match => resolved[match])
          usernameToResolved[username] = urls
          profiles[i].links = urls
          profiles[i].description += ' ' + urls.join(' ')
        }
      })
      console.debug('RESOLVED T.CO', usernameToResolved)
      return usernameToResolved
    },
    refreshTwitterProfile: async () => {
      // fetch latest twitter profile info given previous authentication
      const { username, code } = twitterAuth.get()
      const { data } = await api.post('follow-sync/twitter', {
        code, username,
        endpoint: `2/users/me`,
        query: {
          'user.fields': 'description,url',
        },
      })
      console.debug('REFRESH TWITTER', data)
      twitterAuth.set({
        ...twitterAuth.get(),
        ...data,
      })

      await handle.resolveTwitterLinks()
    },
  }
  useF(() => {
    if (state === State.AUTH && !subpage) setState(State.INIT) // return to INIT if auth cancelled
    // if (state === State.END) setState(State.INIT)
    // if (state === State.END) setState(State.SYNC)
    if (state === State.SELECT) setState(State.SYNC)
  })
  useF(state, () => {
    console.debug(confirm)
    if (state === State.AUTH) {
      if (!server) setState(State.INIT)
      else if (confirm === Confirm.NONE) handle.next()
    }
    if (state === State.TOKEN) handle.next()
    if (state === State.ACCEPT_AUTH) handle.next()
    if (state === State.SYNC) handle.next()
    if (state === State.SELECT && !twitterFollows.length) setState(State.SYNC)
    if (state === State.PROFILE_AUTH_TOKEN && !isTwitterProfile) handle.next()
    if (state === State.PROFILE_UPDATE) handle.next()
    // if (state === State.SELECT) handle.next()
  })
  useF(state, () => {
    if (state === State.END) {
      handle.refreshTwitterProfile()
    }
  })
  useI(state, () => {
    if (state === State.INIT) {
      twitterAuth.set({})
      mastodonAuth.set({})
      twitterV1Auth.set({})
    }
  })

  const [loadingUpdate, setLoadingUpdate] = useState(false)
  const [confirmUpdate, setConfirmUpdate] = useState(false)
  useF(twitterUpdates, () => setConfirmUpdate(false))
  const twitterPreview = <p id='twitter-preview' style={strToStyle(`
  // min-height: ${previewUpdates.tweet ? 22 : 8}em;
  ${confirmUpdate ? 'background: var(--accent_8);' : ''}
  `)}>
    {previewUpdates.name
    ? <div className='line' style={strToStyle(`font-weight: bold`)}>
      {/* <span className='placeholder'>YOUR NAME</span>&nbsp; */}
      <TwitterEmoji word={previewUpdates.name} />
    </div>
    : ''}
    {previewUpdates.renderedBio
    // ? <div style={strToStyle(`font-size: .8em; word-break: all`)}>
    //   {/* <span className='placeholder'>YOUR BIO</span>&nbsp; */}
    //   {previewUpdates.renderedBio}
    // </div>
    ? <div style={strToStyle(`
    // background: #fff;
    // padding: 1em;
    white-space: pre-line;

    // padding: 1em .5em;
    // border: 1px solid #0002;
    font-size: .8em;

    // background: #fff3;
    // box-shadow: 0 0 0 1px #0002;
    // border-radius: 1px;
    `)} id='bio-edit' contentEditable={state < State.PROFILE_END} onBlurCapture={e => {
      let node = e.target as any
      while (node.id !== 'bio-edit') node = node.parentNode
      console.debug('BIO EDIT', node.textContent)
      setTwitterUpdateContents({ ...twitterUpdateContents, bio: node.textContent })

      // console.debug(twitterUpdateOptions.tweet[twitterUpdates.tweet], (e.target as any).textContent)
      // twitterUpdateOptions.tweet[twitterUpdates.tweet] = (e.target as any).textContent

      // previewUpdates.renderedBio = <>
      //   <span style={{ opacity: .4, whiteSpace: 'pre-wrap' }}>{convertLinks(currentBio)}</span>
      //   {convertLinks(addedBio || '')}
      // </>
      // console.debug(twitterUpdateOptions.bio[1], (e.target as any).textContent)
      // twitterUpdateOptions.tweet[1] = (e.target as any).textContent
    }}>
      {/* {convertLinks(previewUpdates.bio)} */}
      {previewUpdates.renderedBio}
    </div>
    : ''}
    {previewUpdates.location || previewUpdates.website
    ? <div className='line'>
      {previewUpdates.location
      ?
      <div className='line' style={strToStyle(`font-size: .8em`)}>
        <span dangerouslySetInnerHTML={{ __html: `
        <svg viewBox="0 0 24 24" aria-hidden="true" style="
        fill: currentColor;
        width: 1em;
        "><g><path d="M12 7c-1.93 0-3.5 1.57-3.5 3.5S10.07 14 12 14s3.5-1.57 3.5-3.5S13.93 7 12 7zm0 5c-.827 0-1.5-.673-1.5-1.5S11.173 9 12 9s1.5.673 1.5 1.5S12.827 12 12 12zm0-10c-4.687 0-8.5 3.813-8.5 8.5 0 5.967 7.621 11.116 7.945 11.332l.555.37.555-.37c.324-.216 7.945-5.365 7.945-11.332C20.5 5.813 16.687 2 12 2zm0 17.77c-1.665-1.241-6.5-5.196-6.5-9.27C5.5 6.916 8.416 4 12 4s6.5 2.916 6.5 6.5c0 4.073-4.835 8.028-6.5 9.27z"></path></g></svg>` }} />&nbsp;
        {convertLinks(previewUpdates.location)}&nbsp;
      </div>
      : ''}
      {previewUpdates.website
      ?
      <div className='line' style={strToStyle(`font-size: .8em`)}>
        <span dangerouslySetInnerHTML={{ __html: `
        <svg viewBox="0 0 24 24" aria-hidden="true" style="
        fill: currentColor;
        width: 1em;
        "><g><path d="M18.36 5.64c-1.95-1.96-5.11-1.96-7.07 0L9.88 7.05 8.46 5.64l1.42-1.42c2.73-2.73 7.16-2.73 9.9 0 2.73 2.74 2.73 7.17 0 9.9l-1.42 1.42-1.41-1.42 1.41-1.41c1.96-1.96 1.96-5.12 0-7.07zm-2.12 3.53l-7.07 7.07-1.41-1.41 7.07-7.07 1.41 1.41zm-12.02.71l1.42-1.42 1.41 1.42-1.41 1.41c-1.96 1.96-1.96 5.12 0 7.07 1.95 1.96 5.11 1.96 7.07 0l1.41-1.41 1.42 1.41-1.42 1.42c-2.73 2.73-7.16 2.73-9.9 0-2.73-2.74-2.73-7.17 0-9.9z"></path></g></svg>` }} />&nbsp;
        {convertLinks(previewUpdates.website)}
      </div>
      : ''}
    </div>
    :''}

    {previewUpdates.tweet
    ? <div>
      <br/>
      <div>new tweet <span style={toStyle(`opacity: .5;font-size:.85em`)}>(editable)</span></div>
      <div style={strToStyle(`
      // background: #fff;
      padding: 1em;
      white-space: pre-line;

      padding: 1em .5em;
      // border: 1px solid #0002;
      font-size: .8em;

      background: #fff3;
      // box-shadow: 0 0 0 1px #0002;
      border-radius: 1px;
      border: 1px solid #0006;
      `)} id='tweet-edit' contentEditable={state < State.PROFILE_END} onBlur={e => {
        let node = e.target as any
        while (node.id !== 'tweet-edit') node = node.parentNode
        console.debug('TWEET EDIT', node.textContent)
        setTwitterUpdateContents({ ...twitterUpdateContents, tweet: node.textContent })
      }}>
        {convertLinks(previewUpdates.tweet)}
      </div>
    </div>
    : ''}
  </p>
  const updateTwitterContent = <>
    {
    !true ? '' :
    <div style={strToStyle(`
    border-left: 1px solid black;
    padding-left: 1em;
    `)}>
    <InfoSection label='↪ OPTIONS'>
    <p className='option-list'>
      <InfoCheckbox label='name' value={twitterUpdates.name}
      onChange={e => setTwitterUpdates({
        ...twitterUpdates,
        name: e.target.checked ? twitterUpdates._name || 1 : 0,
      })}>
        {twitterUpdates.name || 1
        ? <>
          <Select
          options={range(twitterUpdateOptions.name.length).slice(1)}
          value={(twitterUpdates.name || twitterUpdates._name) ?? 1}
          display={i => twitterUpdateOptionsMeta.name[i]}
          onChange={e => setTwitterUpdates({
            ...twitterUpdates,
            name: Number(e.target.value),
            _name: Number(e.target.value),
          })} />
        </>
        :''}
      </InfoCheckbox>
      <InfoCheckbox label='bio' value={!!twitterUpdates.bio}
      disabled={!!twitterUpdateContents.bio}
      onChange={e => setTwitterUpdates({
        ...twitterUpdates,
        bio: e.target.checked ? twitterUpdates._bio || 1 : 0,
      })}>
        {twitterUpdates.bio || 1
        ? <>
          <Select
            options={range(twitterUpdateOptionsMeta.bio_emoji.length)}
            value={twitterUpdates.bio_emoji}
            display={i => twitterUpdateOptionsMeta.bio_emoji[i]}
            onChange={e => setTwitterUpdates({
              ...twitterUpdates,
              bio_emoji: Number(e.target.value),
              bio: 1,
            })} />
          &nbsp;+&nbsp;
          <Select
            options={range(twitterUpdateOptionsMeta.bio_mastodon.length)}
            value={twitterUpdates.bio_mastodon}
            display={i => twitterUpdateOptionsMeta.bio_mastodon[i]}
            onChange={e => setTwitterUpdates({
              ...twitterUpdates,
              bio_mastodon: Number(e.target.value),
              bio: 1,
            })} />
          &nbsp;+&nbsp;
          <Select
            options={range(twitterUpdateOptionsMeta.bio_tool.length)}
            value={twitterUpdates.bio_tool}
            display={i => twitterUpdateOptionsMeta.bio_tool[i]}
            onChange={e => setTwitterUpdates({
              ...twitterUpdates,
              bio_tool: Number(e.target.value),
              bio: 1,
            })} />
        </>
        :''}
      </InfoCheckbox>
      <InfoCheckbox label='location' value={twitterUpdates.location}
      onChange={e => setTwitterUpdates({
        ...twitterUpdates,
        location: e.target.checked ? twitterUpdates._location || 1 : 0,
      })}>
        {twitterUpdates.location || 1
        ? <>
          <Select
          options={range(twitterUpdateOptions.location.length).slice(1)}
          value={(twitterUpdates.location || twitterUpdates._location) ?? 1}
          display={i => twitterUpdateOptionsMeta.location[i]}
          onChange={e => setTwitterUpdates({
            ...twitterUpdates,
            location: Number(e.target.value),
            _location: Number(e.target.value),
          })} />
        </>
        :''}
      </InfoCheckbox>
      <InfoCheckbox label='website' value={twitterUpdates.website}
      onChange={e => setTwitterUpdates({
        ...twitterUpdates,
        website: e.target.checked ? twitterUpdates._website || 1 : 0,
      })}>
        {twitterUpdates.website || 1
        ? <>
          <Select
          options={range(twitterUpdateOptions.website.length).slice(1)}
          value={(twitterUpdates.website || twitterUpdates._website) ??  1}
          display={i => twitterUpdateOptionsMeta.website[i]}
          onChange={e => setTwitterUpdates({
            ...twitterUpdates,
            website: Number(e.target.value),
            _website: Number(e.target.value),
          })} />
        </>
        :''}
      </InfoCheckbox>
      <InfoCheckbox label='tweet' value={twitterUpdates.tweet}
      disabled={!!twitterUpdateContents.tweet}
      onChange={e => setTwitterUpdates({
        ...twitterUpdates,
        tweet: e.target.checked ? 1 : 0,
      })}>
        {twitterUpdates.tweet || 1
        ? <>
          <Select
          options={range(twitterUpdateOptions.tweet.length).slice(1)}
          value={(twitterUpdates.tweet || twitterUpdates._tweet) ??  1}
          display={i => twitterUpdateOptionsMeta.tweet[i]}
          onChange={e => setTwitterUpdates({
            ...twitterUpdates,
            tweet: Number(e.target.value),
            _tweet: Number(e.target.value),
          })} />
        </>
        :''}
      </InfoCheckbox>
    </p>
    </InfoSection>
    <InfoSection label='↪ PRESETS'>
    <p className='option-list'>
      {Object.entries(twitterUpdatePresets).map(([name, setting], i) =>
      <div key={i} style={toStyle(`display: flex; align-items: flex-start;`)}>
        <span className='action' onClick={e => {
          setTwitterUpdateContents({})
          setTwitterUpdates(setting)
        }}>{name}</span>{i === 0 && !isDefaultTwitterUpdatePreset ? <span className='placeholder'>&nbsp;← reset</span> : ''}
      </div>
      )}
    </p>
    </InfoSection>
    {/* {isDefaultTwitterUpdates
    ? ''
    :
    <span className='action' onClick={e => {
      setTwitterUpdates(defaultTwitterUpdates)
    }}>default (emoji/bio)</span>}
    <span className='action' onClick={e => {
      setTwitterUpdates(defaultTwitterUpdates)
    }}>name/tool/tweet</span> */}
    </div>}

    {twitterPreview}
  </>

  let content, isEnd
  switch (state) {
    case State.INIT:
      content = <>
        server:
        <input type='text' id='input-mastodon' className='action long'
        // placeholder='@you@mastodon.example @alt@other.example'
        // value={mastodons.filter(truthy).length ? '@'+mastodons.join(' @') : ''} onChange={e => {
        //   profiles.set({ ...profiles.get(), mastodon: e.target.value.split(' ').map(x => {
        //     return x.replace(/^@?(.)/, '@$1').replace(/^@+$/, '')
        //   }).join(' ') })
        // }} TODO ? multiple mastodons
        placeholder='mastodon.example'
        value={server.get()} onChange={e => {
          server.set(e.target.value)
        }}
        onKeyDown={e => e.key === 'Enter' && handle.next()} />
        <InfoCheckbox value={options.twitterToMastodon} onChange={e => {
          setOptions({
            ...options,
            twitterToMastodon: !options.twitterToMastodon,
            mastodonToTwitter: options.mastodonToTwitter || (options.twitterToCohost ? false : options.twitterToMastodon),
          })
        }}>Twitter → {server.get() || 'Mastodon'}</InfoCheckbox>
        <InfoCheckbox value={options.mastodonToTwitter} onChange={e => {
          setOptions({
            ...options,
            mastodonToTwitter: !options.mastodonToTwitter,
            twitterToMastodon: options.twitterToMastodon || (options.twitterToCohost ? false : options.mastodonToTwitter),
          })
        }}>{server.get() || 'Mastodon'} → Twitter</InfoCheckbox>
        <div style={toStyle(`font-size:.8em`)}>This will store <Tooltip of={
          `- username, server, id\n- credentials you authorize\n- sync status`
          }>info for synchronization</Tooltip> (for {'<'} 24h if sync not enabled) and your Twitter-Mastodon pairing for others:&nbsp;
        </div>
        <span className='bold-btn button action main' onClick={handle.next}>AUTHORIZE</span>
        <br/>
        <br/><br/>
        <InfoSection label='HOW IT WORKS'>
          <p className='section-description'>
            Follow Mastodon @s like <code>@user@server.example</code> and <code>server.example/@user</code> across your Twitter follows' names/bios/urls/locations/pins
            <br/><br/>
            You'll be able to review the @s found before following
            <br/><br/>
            Sync once or daily - automatically
          </p>
        </InfoSection>
        <InfoSection label='OTHER'>
          <div style={toStyle(`
          display: flex;
          flex-wrap: wrap;
          `)}>
            <InfoCheckbox value={options.acceptExisting} onChange={e => {
              setOptions({
                ...options,
                acceptExisting: !options.acceptExisting,
              })
            }}>accept requests from followers</InfoCheckbox>
            &nbsp;
            <Tooltip of={
  `requests on Mastodon will be accepted if the account links to a Twitter @ which
  1) already follows you
  2) links back to that Mastodon @`}>(?)</Tooltip>
          </div>
          <InfoCheckbox value={options.twitterToCohost} onChange={e => {
            setOptions({
              ...options,
              twitterToCohost: !options.twitterToCohost,
            })
          }}>find cohost.org<a style={{textDecoration:'none'}}>/@name</a></InfoCheckbox>
        </InfoSection>
        {'' && <InfoSection label='TODO'>
          <p className='section-description'>
            {/* <div>- auto-follow</div> */}
            <div>- support for {'>'} 15k Twitter follows</div>
            {/* <div>- support for multiple Mastodons</div> */}
            {/* <div>- auto-follow @s added later</div> */}
            {/* <div>- sync unfollows</div> */}
            {/* <div>- sync Mastodon → Twitter</div> */}
            {/* <div>- support for other sites (cohost?)</div> */}
            {/* <div>- search for Mastodon @s in recent tweets</div> */}
            {/* <div>- (empty)</div> */}
            <div>- <a href='/contact'>something else? (or report an issue)</a></div>
          </p>
        </InfoSection>}
        {
        '' &&
        <InfoSection label='SHARE (TAP TO COPY)'>
          <p className='section-description'>
            {[
              // '🦣 nn.fo/sync-mastodon',
              // '🦣 nn.fo/llow',
              // '🦣 nn.fo/M',
              '🦣 freshman.dev/follow-sync',
              '🦣 sync to Mastodon: nn.fo/M',
            ].map(link => <div key={link} onClick={e => {
              const L = (e as any).target
              const html = L.innerHTML
              copy(
                L.textContent.replace(/\(.*\)/, '').trim(),
                L)
            }} style={strToStyle(`
              padding: 0.5em;
              border-radius: 0.5em;
              margin-bottom: .5em;
              min-height: 3em;
              display: flex;
              white-space: pre;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              background: ${layerBackground('var(--background)', '#fff8')} fixed;
              border: 1px solid black;
            `)}>
              <TwitterEmoji word={link}/>
              {/* &nbsp;<span style={{ opacity: .5, pointerEvents: 'none' }}>(tap to copy)</span> */}
            </div>)}
          </p>
        </InfoSection>}
      </>
      break
    case State.AUTH:
      content = <>
        <p>
          <Loader/> requesting permissions
        </p>

        <span className='bold-btn button action inactive' onClick={() => setState(State.INIT)}>START OVER</span>
      </>
      break
    case State.TOKEN:
    case State.ACCEPT_AUTH:
      content = <>
        <p>
          <Loader/> authorizing
        </p>

        <div className='bold-btn button action inactive' onClick={() => setState(State.INIT)}>START OVER</div>
        {/* <span className='bold-btn button action' onClick={() => setState(State.AUTH)}>↻ MASTODON</span> <span className='bold-btn button action' onClick={() => {
          url.push(`/follow-sync/mastodon?code=${mastodonAuth.get().code}`)
          setState(State.AUTH)
        }}>↻ TWITTER</span> */}
      </>
      break
    case State.SYNC:
      content = <>
        <p>
          <Loader /> {syncProgress}
          {/* <Loader/> syncing follows (0/{twitterFollows.length || '?'}) */}
          {/* <Loader/> reading follows */}
        </p>

        <div className='bold-btn button action inactive' onClick={() => setState(State.INIT)}>START OVER</div>
        {/* <span className='bold-btn button action' onClick={() => setState(State.AUTH)}>↻ MASTODON</span> <span className='bold-btn button action' onClick={() => {
          url.push(`/follow-sync/mastodon?code=${mastodonAuth.get().code}`)
          setState(State.AUTH)
        }}>↻ TWITTER</span> */}
      </>
      break
    case State.SELECT:
    case State.END:
      isEnd = state === State.END
      content = <>
        <p>
          {isEnd
          // ? convertLinks(`done! ${previewMastodonLink}`)
          ? <div>{convertLinks('done - view at \n'+previewMastodonLink+'/following \n(except those pending approval)')}</div>
          // : `found ${Object.values(twitterToMastodon).flatMap(x => x).length} potential @s across ${twitterFollows.length} profiles`}
          : servers[0]
            ? <div>found {Object.values(twitterToMastodon).flatMap(x=>x).length} Mastodon @s</div>
            :''}
          {/* {!isEnd && options.acceptExisting
          ? <div>
            found {8} existing followers to accept (<Tooltip of={'test'}>view</Tooltip>)
          </div>
          :''} */}
          {/* {isEnd ? 'followed' : 'found'} {Object.values(twitterToMastodon).flatMap(x => x).length} potential @s across {twitterFollows.length} profiles */}
          {/* follow Mastodon accounts
          <div>(from Twitter names / bios)</div> */}
          {/* <div style={{ opacity: .3 }}>(WIP: from recent tweets)</div> */}
          {!isEnd && options.twitterToCohost
          // ? convertLinks(`done! ${previewMastodonLink}`)
          ? <div>
            {/* {`found ${Object.values(twitterToCohost).flatMap(x=>x).length} cohost.org @s (unable to sync – open all)`} */}
            <div>
              found {Object.values(twitterToCohost).flatMap(x=>x).length} cohost.org @s (unable to sync* – <a onClick={e => {
                const cohostLinks = Object.values(twitterToCohost).flatMap(x=>x)
                cohostLinks.map(link => {
                  window.open('https://'+link, '_blank', `popup,width=500,height=500,left=${e.screenX - 250},top=${e.screenY - 250}`)
                  // return {
                  //   display: link,
                  //   // link: 'https://' + parts[1] + '/@' + parts[0],
                  //   link: `https://${link}`,
                  // }
                })
                if (cohostLinks.length) window.open('https://cohost.org', '_blank', `popup,width=500,height=500,left=${e.screenX - 250},top=${e.screenY - 250}`)
              }}>open all</a>)
            </div>
            <div style={{ fontSize: '.8em', opacity: .5 }}>*that would require entering your cohost.org password here</div>
          </div>
          // : `found ${Object.values(twitterToMastodon).flatMap(x => x).length} potential @s across ${twitterFollows.length} profiles`}
          :''}
        </p>

        {followProgress.error
        ? <p>{followProgress.error}</p>
        :''}

        <InfoGroup>
          {/* <div id='bold-btn' className='button action' onClick={() => setState(State.END)}>DONE</div> */}
          <div className='bold-btn button action inactive' onClick={() => setState(State.INIT)}>START OVER</div>

          {/* {state === State.END
          ? <>
            <div className='bold-btn button action inactive' onClick={() => setState(State.SELECT)}>BACK</div>
            {updateTwitterContent}
          </>
          : <div className='bold-btn button action' onClick={() => setState(State.END)}>DONE</div>} */}

          {state === State.END
          ? <div className='bold-btn button action inactive' onClick={() => setState(State.SELECT)}>BACK</div>
          : ''}

          {/* <div className='bold-btn button action'
          onClick={() => {
            console.debug(twitterAuth.get())
            api.post('/follow-sync/auto', {
              ...twitterAuth.get(),
              sync: !twitterAuth.get().sync, twitter: { username: twitter }, mastodon: { username: mastodon_username, server: mastodon_server }
            }).then(data => {
              console.debug('SYNC', data)
              twitterAuth.set({ ...twitterAuth.get(), ...data })
              handle.next() // follow all now too
            })
          }}
          >ENABLE AUTO-SYNC</div> */}
          {
          isEnd || !syncBetweenTwitterAndMastodon ? '' :
          <div id='follow-all' className={`bold-btn button action ${
            followProgress.complete || state === State.END
            ? 'inactive'
            : ''
          }`} onClick={() => {
            handle.next()
            // twitterFollows.map(({ username }) => {
            //   twitterToMastodon[username].map(at => {
            //     const [account, server] = at.split('@').slice(1)
            //     window.open(`https://${servers[0]}/authorize_interaction?uri=${encodeURIComponent(`https://${server}/users/${account}`)}`, '_blank', 'popup,innerWidth=500,innerHeight=500')
            //   })
            // })
          }}>{
            followProgress.accept
            ? <>
              <Loader /> ACCEPTING REQUESTS
            </>
            : followProgress.complete || state === State.END
            ? `FOLLOWED ${followProgress.fraction ?? 'ALL'}`
            : followProgress.fraction
            ? <>
              <Loader /> FOLLOWING {followProgress.fraction}
            </>
            : followProgress.started
            ? <>
              <Loader /> FOLLOWING...
            </>
            : 'SYNC ONCE'
            // state === State.SELECT
            // ?
            //   followProgress.complete
            //   ? 'FOLLOW - DONE'
            //   : followProgress.fraction
            //   ? <>
            //     <Loader /> FOLLOWING {followProgress.fraction}
            //   </>
            //   : followProgress.started
            //   ? <>
            //     <Loader /> FOLLOWING...
            //   </>
            //   : 'FOLLOW ALL'
            // : 'FOLLOWED!'
          }</div>}
          {
          !syncBetweenTwitterAndMastodon || Object.values(followProgress).some(truthy) ? '' :
          <div className={'bold-btn button action ' + (isEnd ? '' : 'main') + (isEnd && sync ? 'inactive' : '')}
            onClick={() => {
              console.debug(twitterAuth.get())
              const enabled = {
                twitter: options.twitterToMastodon,
                mastodon: options.mastodonToTwitter,
              }
              api.post('/follow-sync/auto', {
                ...twitterAuth.get(),
                twitter: { username: twitter, sync: sync ? false : enabled.twitter },
                mastodon: { username: mastodon_username, server: mastodon_server, sync: sync ? false : enabled.mastodon },
                options,
              }).then(data => {
                console.debug('SYNC', data)
                twitterAuth.set({ ...twitterAuth.get(), ...data.twitter })
                mastodonAuth.set({ ...mastodonAuth.get(), ...data.mastodon })
                if (state === State.SELECT && (data.twitter.sync || data.mastodon.sync)) handle.next() // sync all now too
              })
            }}
            >{sync ? 'DISABLE' : 'ENABLE'} DAILY SYNC</div>
          }
        </InfoGroup>

        <div className='btn-row'>
          {
          !isEnd ? '' :
          !confirmUpdate
          ?
          <div className='bold-btn button action main'
          onClick={() => {
            setLoadingUpdate(true)
            handle.refreshTwitterProfile().then(() => {
              setConfirmUpdate(true)
              setLoadingUpdate(false)
            })
          }}
          >{loadingUpdate ? <><Loader />&nbsp;</> : ''}UPDATE YOUR TWITTER</div>
          : <>
            <div className='bold-btn button action'
              onClick={() => setConfirmUpdate(false)}
              >CANCEL</div>
            <div className='bold-btn button action'
              onClick={() => {
                setState(twitterV1Auth.get().oauth_token ? State.PROFILE_UPDATE : State.PROFILE_AUTH_TOKEN)
                // setState(State.PROFILE_AUTH_TOKEN)
                setConfirmUpdate(false)
              }}
              >CONFIRM CHANGES</div>
          </>}

          {isEnd
          ? ''
          : <div className='bold-btn button action' onClick={() => setState(State.END)}>DONE</div>}
        {/* <div className='bold-btn button action'
        onClick={() => setState(twitterV1Auth.get().oauth_token ? State.PROFILE_UPDATE : State.PROFILE_AUTH_TOKEN)}
        >UPDATE YOUR TWITTER</div> */}
        </div>

          {isEnd
          ? updateTwitterContent
          : ''}

          {/* {updateTwitterContent} */}
          {/* {state === State.END
          ? updateTwitterContent
          : <div className='bold-btn button action' onClick={() => setState(State.END)}>UPDATE YOUR TWITTER</div>} */}
          {/* {state === State.END
          ? updateTwitterContent
          : <div className='bold-btn button action' onClick={() => setState(State.END)}>DONE</div>} */}

        <br/><br/>
        {twitterFollows.length && !isEnd
        ?
        <p>
          {twitterFollows.map(({ id, name, username }) => {
            const cohostsForTwitter = twitterToCohost[username] ? twitterToCohost[username].map(link => {
              return {
                display: link,
                // link: 'https://' + parts[1] + '/@' + parts[0],
                link: `https://${link}`,
              }
            }) : []
            const mastodonsForTwitter = twitterToMastodon[username] ? twitterToMastodon[username].map(at => {
              const [account, server] = at.split('@').slice(1)
              return {
                display: at,
                // link: 'https://' + parts[1] + '/@' + parts[0],
                link: `https://${servers[0]}/authorize_interaction?uri=${encodeURIComponent(`https://${server}/users/${account}`)}`,
              }
            }) : []
            const linksPerTwitter = [].concat(cohostsForTwitter, mastodonsForTwitter)
            if (!linksPerTwitter.length) return ''
            // const emojified = ['']
            // name.split('').map(letter => {
            //   if (/\p{Emoji}/u.test(letter)) {
            //     // return letter.charCodeAt(0).toString(16)
            //     emojified.push(`
            //     <img alt="${letter}" draggable="false" src="https://abs-0.twimg.com/emoji/v2/svg/${letter.charCodeAt(0).toString(16)}.svg" />`, '')
            //   } else {
            //     emojified[emojified.length-1] += letter
            //   }
            // })
            return <div key={id}>
              <span className='twitter-name' style={strToStyle(`
              display: inline-flex;
              align-items: flex-start;
              `)}>
                <TwitterEmoji word={name} />
                {/* {emojified.map(x => x.length > 1
                  ? <span style={{ display: flex }} dangerouslySetInnerHTML={{ __html: x }} />
                  : x)} */}
              </span> <a href={'https://twitter.com/'+username} style={{ opacity: .3 }}>@{username}</a>&nbsp;
              {linksPerTwitter.length > 1 ? <br/> : ''}
              {linksPerTwitter.map(({ display, link }) =>
                <a key={display} href={link} className='bold-btn button action' target='_blank' rel='noreferrer' onClick={e => {
                  e.stopPropagation()
                  e.preventDefault()
                  window.open(link, '_blank', `popup,width=500,height=500,left=${e.screenX - 250},top=${e.screenY - 250}`)
                }}>{display}</a>
                // <a key={display} href={link} className='bold-btn button action' target='_blank' rel='noreferrer' onClick={(e: any) => {
                //   if (e.target.tagName === 'A') {
                //     e.stopPropagation()
                //     e.preventDefault()
                //     window.open(link, '_blank', `popup,width=500,height=500,left=${e.screenX - 250},top=${e.screenY - 250}`)
                //   }
                // }}><Checkbox initial={true} onChange={e => {
                //   console.debug(display)
                // }} />{display}</a>
              )}
            </div>
          })}
        </p>
        : ''}
      </>
      break
    // case State.END:
      content = <>
        <p>
          done!
        </p>

        <div className='bold-btn button action' onClick={() => setState(State.INIT)}>START OVER</div>
      </>
      break
    case State.PROFILE_AUTH_TOKEN:
    case State.PROFILE_UPDATE:
    case State.PROFILE_END:
      content = <>
        <p>
          {state === State.PROFILE_END
          ? convertLinks(`done - view update at twitter.com/${twitter}`)
          : <>
            <Loader/> {state === State.PROFILE_AUTH_TOKEN
              ? 'requesting permissions to update profile'
              : 'updating profile'}
          </>}
        </p>

        <span className='bold-btn button action inactive' onClick={() => {
          twitterV1Auth.set({})
          setState(State.END)
        }}>BACK</span>
        <br/><br/>
        {state === State.PROFILE_END ?
        <InfoSection labels={['results']} style={toStyle(`white-space: pre-wrap`)}>
          <div className='section-description'>
          1) your follows have been synced according to your preferences:<br/>
          {(() => {
            const t = twitterAuth.get()
            const m = mastodonAuth.get()
            const result = {
              sync: t.sync || m.sync,
              twitterToMastodon: t.sync,
              mastodonToTwitter: m.sync,
              acceptExisting: options.acceptExisting, // could tchnclly copy others like this too
            }
            return <>
            &nbsp;&nbsp;&nbsp;{result.sync ? '✅ daily sync enabled' : 'daily sync ⛔ disabled'} (Twitter {!sync ? '→×←' : !m.sync ? '→' : !t.sync ? '←' : '←→'} Mastodon)<br/>
            &nbsp;&nbsp;&nbsp;{result.sync ? '✅ accept existing followers' : '⛔ do not accept existing followers'}<br/>
            </>
          })()}<br/>
          2) your Twitter has been updated:<br/>
          <div style={toStyle(`margin: 0 2.25em;`)}>{twitterPreview}</div>
          </div>
        </InfoSection>
        :''}
      </>
      break
  }

  useStyle(`
  :root {
    --accent: #ffe1ae;
    --accent_8: #ffe1ae88;
  }`)
  return <Style>
    <InfoBody>
      <b id='title'>{
        state === State.INIT
        ? 'sync follows b/n Twitter and Mastodon (not sure if this works now)'
        : state <= State.END
        ? 'sync follows b/n Twitter and Mastodon'
        : 'share your Mastodon on Twitter'
      }</b><br/>
      {content}
      {/* <div className='spacer' /> */}
      <InfoLine style={toStyle(`
      position: absolute;
      bottom: .5em;
      width: calc(100% - 2rem);
      margin: 0;
      padding-top: 0;
      `)}>
        <div className='section-description'>
          {/* by <img src='/icon.png' style={{ width: '1em' }} /> freshman.dev <br/> */}
          by <a href='https://twitter.com/freshman_dev'>
            @freshman_dev
          </a> (<a
          href={`https://twitter.com/messages/compose?recipient_id=1351728698614042626&text=${
            encodeURIComponent(`follow-sync: `)
            }`}>
            DM
          </a>) {state >= State.END ? <>(<A href="/coffee">buy me a coffee</A>)</> : ''}
          {/* {state >= State.END ? <>(<a href="/coffee" onClickCapture={e => {
            e.stopPropagation()
            e.preventDefault()
            url.push('/coffee')
          }}>buy me a coffee</a>)</> : ''} */}
          {/* - <a href='/contact'>report an issue</a> */}
          {/* - by <a href='https://twitter.com/freshman_dev'>@freshman_dev</a><br/> */}
          {/* - use at your own risk <br/> */}
          {/* - <a href='/contact'>report an issue</a> <br/> */}
          {/* - thoroughly pleased? <a href={`http://twitter.com/intent/tweet?text=${
            encodeURIComponent(
`[automated message]

use this website to follow everyone on Mastodon:\n🦣 ${previewToolLink}

if you don't have one yet, you can join from here:\n${mastodons[0] ? previewMastodonLink : 'mastodon.online'}`)
          }`}>tweet</a>, buy me a {convertLinks('/coffee')} */}
        </div>
      </InfoLine>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
// background: #514f5a;
// color: white;
.body {
  position: relative;
}
a, a:not([href]):not([class]) {
  text-decoration: underline;
  color: inherit;
  &:hover {
    color: inherit;
    text-decoration: none;
  }
}
code {
  // color: #ff5c5c;
  color: inherit;
  // background: var(--accent_8);
  // padding: 0.1em; margin: -0.1em;
  // negative margin doesn't work
  // position: relative; top: -0.1px;
  font-weight: bold;
}
.action:not(input) {
  // background: #fff4;
  // color: inherit;
}

#title {
  // font-weight: bold;
  // text-decoration: wavy underline;
  // // text-underline-offset: 0.5em;
  // margin-top: .5em;
  // margin-bottom: 1em;
  // text-transform: uppercase;
}
b {
  // font-weight: normal;
  // text-decoration: wavy underline;
  // text-transform: uppercase;
  // display: block;
  // margin-bottom: .3em;
}
.label {
  // opacity: 1 !important;
  // font-size: 1em !important;
  // text-decoration: wavy underline;
  // text-transform: uppercase;
  // text-underline-offset: 0.15em;
  // background: none !important;
  // padding: 0 !important;
}
p {
  // font-family: system-ui;
}

.option-list {
  > div {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }
}

.bold-btn.bold-btn.bold-btn.bold-btn.bold-btn {
  font-size: 1em !important;
  background: var(--accent) !important;
  color: #000 !important;
  text-decoration: none;
  border: 1px solid #000 !important;

  &:visited, &.inactive { background: #cfa8a8 !important }
  &.main {
    font-size: 1.5em !important;
    order: 100;
    width: 100%;
    margin: 0;
    ${css.mixin.center_column};
  }
}
.btn-row {
  display: flex;
  flex-wrap: wrap;
}
div.bold-btn { margin-top: .5em; }

.section-description {
  white-space: pre-wrap;
  font-size: .9em;
}

#link-to-tool {
  & > div {
    // display: flex;
    // align-items: flex-start;

    // & > :first-child {
    //   margin-right: 1em;
    // }
  }
}

.preview {
  display: inline-block;
  opacity: .5;
  font-size: .8em;
  white-space: pre-line;
  // border-left: 1px solid #0006;
  padding-left: .5em;
  // margin-left: .25em;
  // &::before { content: '"' }
  // &::after { content: '"' }

  display: flex;
  align-items: center;
  margin-bottom: .25rem;
}

.placeholder {
  // opacity: .3;
  // padding: 0 .3em;
  // background: #fff8;
  // &::before { content: '<' }
  // &::after { content: '>' }
  // font-style: italic;

  // padding: 0 0.15em;
  // background: #fff;
  // border-radius: 0.15em;
  // color: #0005;
  color: #0008;
  font-style: italic;
}

#twitter-preview {
  // width: fit-content;
  background: #fff2;
  background: #8881;
  // margin: 0 -0.5em 0.5em -0.5em;
  // margin: -.5em -.5em .5em -.5em;
  padding: .7em .5em;
  border-radius: 0.25em;
  border: 1px solid #8881;

  background: #f001;
  border-color: var(--accent);

  background: none;
  border-color: #000;

  // max-width: 40rem;
  // font-size: min(1em, 3.35vw);
}
.badges .button {
  // border-radius: 0.25em;
  // border: 1px solid #8881;
  // background: #f001;
  // border-color: var(--accent);

  // font-size: 1em;
  line-height: 1.3em;
  margin-bottom: .1em;
  background: var(--accent) !important;
  color: black !important;
  text-decoration: none;
  border-radius: 0.2em;
  text-transform: uppercase;
  font-size: .8em;
}

.line {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
}


.preview {
  display: none;
}
.option-list {
  // display: flex;
  flex-wrap: wrap;
}
div:last-child > .option-list {
  margin-bottom: 0;
}

.hint {
  opacity: .6;
  font-size: .9em;
}
`



  // const updateTwitterContent = <><InfoSection labels={[
  //   'OPTIONS',
  //   // isDefaultTwitterUpdates ? '' : {
  //   //   text: 'reset',
  //   //   func: () => setTwitterUpdates({
  //   //     name: 1, bio: 3, website: 1, tweet: 0
  //   //   }),
  //   // },
  //   ]}>
  //   <div className='line'>
  //     <InfoCheckbox label='update twitter profile' value={updateTwitter}
  //       onChange={e => setUpdateTwitter(!updateTwitter)} />
  //     {/* (<a onClick={e => setTwitterUpdates({
  //       name: 1, bio: 3, website: 1, tweet: 0
  //     })}>reset to defaults</a>) */}
  //     {/* <a onClick={e => setTwitterUpdates({
  //       name: 1, bio: 3, website: 1, tweet: 0
  //     })}>reset</a> */}
  //     {!updateTwitter
  //     ?
  //     <span style={strToStyle(`
  //     opacity: .4;
  //     font-size: .9em;
  //     padding: .05em 0;
  //     `)}>&nbsp;- customizable</span>
  //     : isDefaultTwitterUpdates
  //     ? ''
  //     :
  //     <span className='action' onClick={e => {
  //       setTwitterUpdates(defaultTwitterUpdates)
  //       // toggle to reset checkboxes
  //       setUpdateTwitter(false)
  //       setTimeout(() => setUpdateTwitter(true))
  //     }}>reset</span>
  //     }
  //   </div>
  //   {/* </InfoSection> */}
  //   {/* <b>share your Mastodon</b> */}
  //   {!updateTwitter ? '' : <div style={strToStyle(updateTwitter ? `
  //   border-left: 1px solid black;
  //   padding-left: 1em;
  //   ` : `
  //   display: none;
  //   `)}>
  //   <InfoSection label='↪ WITH YOUR MASTODON'>
  //   <p className='option-list'>
  //     <div>
  //       <InfoCheckbox label='name' value={twitterUpdates.name === 1}
  //       group='profile-mastodon-name'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         name: e.target.checked ? 1 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.name[1]}</span>
  //     </div>
  //     <div>
  //       <InfoCheckbox label='name emoji' value={twitterUpdates.name === 2}
  //        group='profile-mastodon-name'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         name: e.target.checked ? 2 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.name[2]}</span>
  //     </div>
  //     <div>
  //       <InfoCheckbox label='bio' value={twitterUpdates.bio === 1}
  //       group='profile-mastodon-bio'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         bio: e.target.checked ? 1 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.bio[1]}</span>
  //     </div>
  //     <div>
  //       <InfoCheckbox label='bio @' value={twitterUpdates.bio === 2}
  //       group='profile-mastodon-bio'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         bio: e.target.checked ? 2 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.bio[2]}</span>
  //     </div>
  //     <div>
  //       <InfoCheckbox label='website' value={twitterUpdates.website === 1}
  //        group='profile-mastodon-website'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         website: e.target.checked ? 1 : 0,
  //       })} /> <span className='preview'>
  //         <a href={previewMastodonHref}>{twitterUpdateOptions.website[1]}</a>
  //       </span>
  //     </div>
  //   </p>
  //   </InfoSection>
  //   {/* <b>link to this tool */}
  //     {/* (as
  //     <InfoCheckbox group='twt-export-link' label='freshman.dev/follow-sync' value={true} onChange={e => {}} />
  //     <InfoCheckbox group='twt-export-link' label='freshman.dev/follow-on-mastodon' value={true} onChange={e => {}} />
  //     <InfoCheckbox group='twt-export-link' label='f3n.co/follow-on-mastodon' value={false} onChange={e => {}} />
  //     ) */}
  //   {/* </b> */}
  //   <InfoSection label='↪ WITH THIS TOOL'>
  //   <p id='link-to-tool' className='option-list'>
  //     <div>
  //       <InfoCheckbox label='bio' value={twitterUpdates.bio === 3} group='profile-mastodon-bio'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         bio: e.target.checked ? 3 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.bio[3]}</span>
  //     </div>
  //     <div>
  //       <InfoCheckbox label='website' value={twitterUpdates.website === 2}
  //        group='profile-mastodon-website'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         website: e.target.checked ? 2 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.website[2]}</span>
  //     </div>
  //     <div>
  //       <InfoCheckbox label='tweet' value={twitterUpdates.tweet === 1}
  //        group='profile-mastodon-tweet'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         tweet: e.target.checked ? 1 : 0,
  //       })} />
  //       {/* <span className='preview'>{twitterUpdateOptions.tweet[1]}</span> */}
  //     </div>
  //   </p>
  //   </InfoSection></div>}
  //   <p id='twitter-preview'>
  //     {previewUpdates.name
  //     ? <div className='line'><span className='placeholder'>DISPLAY NAME</span>&nbsp;{previewUpdates.name}</div>
  //     : ''}
  //     {previewUpdates.bio
  //     ? <div className='line'><span className='placeholder'>YOUR BIO</span>&nbsp;{previewUpdates.bio}</div>
  //     : ''}
  //     {previewUpdates.website
  //     ?
  //     <div className='line'>
  //       <span dangerouslySetInnerHTML={{ __html: `
  //       <svg viewBox="0 0 24 24" aria-hidden="true" style="
  //       fill: currentColor;
  //       width: 1em;
  //       "><g><path d="M18.36 5.64c-1.95-1.96-5.11-1.96-7.07 0L9.88 7.05 8.46 5.64l1.42-1.42c2.73-2.73 7.16-2.73 9.9 0 2.73 2.74 2.73 7.17 0 9.9l-1.42 1.42-1.41-1.42 1.41-1.41c1.96-1.96 1.96-5.12 0-7.07zm-2.12 3.53l-7.07 7.07-1.41-1.41 7.07-7.07 1.41 1.41zm-12.02.71l1.42-1.42 1.41 1.42-1.41 1.41c-1.96 1.96-1.96 5.12 0 7.07 1.95 1.96 5.11 1.96 7.07 0l1.41-1.41 1.42 1.41-1.42 1.42c-2.73 2.73-7.16 2.73-9.9 0-2.73-2.74-2.73-7.17 0-9.9z"></path></g></svg>` }} />&nbsp;
  //       <a href={'https://'+previewUpdates.website}>{previewUpdates.website}</a>
  //     </div>
  //     : ''}
  //     {previewUpdates.tweet
  //     ? <div>
  //       <br/>
  //       <div>new tweet</div>
  //       <div style={strToStyle(`
  //       background: #fff;
  //       border: #000;
  //       padding: 1em;
  //       white-space: pre-line;
  //       `)} contentEditable onBlur={e => {
  //         console.debug(twitterUpdateOptions.tweet[1], (e.target as any).textContent)
  //         twitterUpdateOptions.tweet[1] = (e.target as any).textContent
  //       }}>
  //         {convertLinks(previewUpdates.tweet)}
  //       </div>
  //     </div>
  //     : ''}
  //   </p>
  // </InfoSection></>

  // const options = <>
  //   <InfoSection label='↪ MASTODON'>
  //   <p className='option-list'>
  //     <div>
  //       <InfoCheckbox label='name' value={twitterUpdates.name === 1}
  //       group='profile-mastodon-name'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         name: e.target.checked ? 1 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.name[1]}</span>
  //     </div>
  //     <div>
  //       <InfoCheckbox label='emoji' value={twitterUpdates.name === 2}
  //        group='profile-mastodon-name'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         name: e.target.checked ? 2 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.name[2]}</span>
  //     </div>
  //     <div>
  //       <InfoCheckbox label='name + emoji' value={twitterUpdates.name === 3}
  //        group='profile-mastodon-name'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         name: e.target.checked ? 3 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.name[3]}</span>
  //     </div>
  //     <br style={strToStyle(`content:""; flex-basis:100%`)} />
  //     <div>
  //       <InfoCheckbox label='bio' value={twitterUpdates.bio === 1}
  //       group='profile-mastodon-bio'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         bio: e.target.checked ? 1 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.bio[1]}</span>
  //     </div>
  //     <div>
  //       <InfoCheckbox label='bio @' value={twitterUpdates.bio === 2}
  //       group='profile-mastodon-bio'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         bio: e.target.checked ? 2 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.bio[2]}</span>
  //     </div>
  //     <br style={strToStyle(`content:""; flex-basis:100%`)} />
  //     <div>
  //       <InfoCheckbox label='website' value={twitterUpdates.website === 1}
  //        group='profile-mastodon-website'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         website: e.target.checked ? 1 : 0,
  //       })} /> <span className='preview'>
  //         <a href={previewMastodonHref}>{twitterUpdateOptions.website[1]}</a>
  //       </span>
  //     </div>
  //   </p>
  //   </InfoSection>
  //   {/* <b>link to this tool */}
  //     {/* (as
  //     <InfoCheckbox group='twt-export-link' label='freshman.dev/follow-sync' value={true} onChange={e => {}} />
  //     <InfoCheckbox group='twt-export-link' label='freshman.dev/follow-on-mastodon' value={true} onChange={e => {}} />
  //     <InfoCheckbox group='twt-export-link' label='f3n.co/follow-on-mastodon' value={false} onChange={e => {}} />
  //     ) */}
  //   {/* </b> */}
  //   <InfoSection label='↪ THIS TOOL'>
  //   <p id='link-to-tool' className='option-list'>
  //     <div>
  //       <InfoCheckbox label='bio tool' value={twitterUpdates.bio === 3} group='profile-mastodon-bio'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         bio: e.target.checked ? 3 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.bio[3]}</span>
  //     </div>
  //     <div>
  //       <InfoCheckbox label='bio both' value={twitterUpdates.bio === 4} group='profile-mastodon-bio'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         bio: e.target.checked ? 4 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.bio[4]}</span>
  //     </div>
  //     <div>
  //       <InfoCheckbox label='website tool' value={twitterUpdates.website === 2}
  //        group='profile-mastodon-website'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         website: e.target.checked ? 2 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.website[2]}</span>
  //     </div>
  //     <div>
  //       <InfoCheckbox label='tweet' value={twitterUpdates.tweet === 1}
  //        group='profile-mastodon-tweet'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         tweet: e.target.checked ? 1 : 0,
  //       })} />
  //     </div>
  //   </p>
  //   </InfoSection>
  //   {/* <InfoSection label='↪ BOTH'>
  //   <p className='option-list'>
  //     <div>
  //       <InfoCheckbox label='bio' value={twitterUpdates.bio === 4} group='profile-mastodon-bio'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         bio: e.target.checked ? 4 : 0,
  //       })} /> <span className='preview'>{twitterUpdateOptions.bio[4]}</span>
  //     </div>
  //     <div>
  //       <InfoCheckbox label='tweet' value={twitterUpdates.tweet === 1}
  //        group='profile-mastodon-tweet'
  //       onChange={e => setTwitterUpdates({
  //         ...twitterUpdates,
  //         tweet: e.target.checked ? 1 : 0,
  //       })} />
  //       <span className='preview'>{twitterUpdateOptions.tweet[1]}</span>
  //     </div>
  //   </p>
  //   </InfoSection> */}
  // </>
