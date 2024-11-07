import express from 'express';
import { J, U, isDevelopment, HttpError, basedir, staticPath, P, pick, set, remove, unpick, hash, OP, merge, defer, transmute, deletion, request_parser, truthy, named_log } from '../../util';

import path, { parse } from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import nodeHtmlToImage from 'node-html-to-image';
import db from '../../db';
import profile, { requireProfile } from '../profile'
import io from '../../io';
import { fetch } from '../../util'
import { execSync } from 'node:child_process';

const R = express.Router()

R.get('/ip', async (rq, rs) => rs.send(rq.ip))


R.post('/html', async (rq, rs) => {
  try {
    const { body } = await fetch(rq.body.url||rq.body.href)
    return rs.send(body)
  } catch {
    return rs.status(500).json({ error: 'unable to fetch' })
  }
})
const link_preview_object = async (_href) => {
  const log = named_log('link-preview-object')
  let href = _href.replace(/^(https?:\/\/)?/, 'https://')
  
  // special cases
  let overrides = {}
  const spotify_track_match = /(https:\/\/open.spotify.com\/track\/[^?]+)\?si/.exec(href)
  if (spotify_track_match) {
    href = spotify_track_match[1]
  }
  const spotify_playlist_match = /(https:\/\/open.spotify.com\/playlist\/[^?]+)\?si/.exec(href)
  if (spotify_playlist_match) {
    href = spotify_playlist_match[1]
  }
  const netflix_match = /http:\/\/www.netflix.com\/title\//.exec(href)

  try {
    let start_ms = performance.now()
    // const html = execSync(`curl -L "${href}"`)
    const { body:html } = await fetch(href)
    log(`href ${href.replace(/^(https?:\/\/)?/, '')} fetched in ${performance.now() - start_ms} ms`)

    const icon = [
      /"avatarThumb":"(?<value>[^"]+)"/,
      /<meta[^>]+name="?twitter:image"?[^>]* content=(?<value>((?:['"])[^'"]*(?:['"])))[ >/]/,
      /<meta[^>]+name="?twitter:image"?[^>]* content=(?<value>([^ ]+))[ >/]/,
      /<meta[^>]+property="og:image"[^>]* content=(?<value>((?:['"])[^'"]*(?:['"])))[ >/]/,
      /<meta[^>]+property="og:image"[^>]* content=(?<value>([^ ]+))[ >/]/,
      /<link[^>]+rel="?icon"?[^>]* href=(?<value>((?:['"])[^'"]*(?:['"])))[ >/]/,
      /<link[^>]+rel="?icon"?[^>]* href=(?<value>([^ ]+))[ >/]/,
      /<link[^>]+rel="?apple-touch-icon"?[^>]* href=(?<value>((?:['"])[^'"]*(?:['"])))[ >/]/,
      /<link[^>]+rel="?apple-touch-icon"?[^>]* href=(?<value>([^ ]+))[ >/]/,
      /<img[^>]* src=(?:['"])(?<value>[^'"]*)(?:['"])/,
      /<img[^>]* src=(?<value>[^ >]+)/,
    ].reduce((done,x)=>done||x.exec(html),0)
    const title = [
      // /<meta[^>]+property="?og:title"?[^>]* content=(?<value>((?:['"])[^'"]*(?:['"])))[ >/]/,
      // /<meta[^>]+property="?og:title"?[^>]* content=(?<value>([^ ]+))[ >/]/,
      // /<meta[^>]+name="?twitter:title"?[^>]* content=(?<value>((?:['"])[^'"]*(?:['"])))[ >/]/,
      // /<meta[^>]+name="?twitter:title"?[^>]* content=(?<value>([^ ]+))[ >/]/,
      // /<meta[^>]+property="?og:description"?[^>]* content=(?<value>((?:['"])[^'"]*(?:['"])))[ >/]/,
      // /<meta[^>]+property="?og:description"?[^>]* content=(?<value>([^ ]+))[ >/]/,
      // /"shareMeta":{"title":"[^"]+","desc":"(?<value>[^"]+)"/,
      /"shareMeta":{"title":"(?<value>[^"]+)"/,
      /<title[^>]*>(?<value>[^<]*)<\/title>/,
    ].reduce((done,x)=>done||x.exec(html),0)
    const description = [
      /<meta[^>]+property="?og:description"?[^>]* content=(?<value>((?:['"])[^'"]*(?:['"])))[ >/]/,
      /<meta[^>]+property="?og:description"?[^>]* content=(?<value>([^ ]+))[ >/]/,
      /<meta[^>]+name="?twitter:description"?[^>]* content=(?<value>((?:['"])[^'"]*(?:['"])))[ >/]/,
      /<meta[^>]+name="?twitter:description"?[^>]+=* content=(?<value>([^ ]+))[ >/]/,
      /<meta[^>]+name="?description"?[^>]* content=(?<value>((?:['"])[^'"]*(?:['"])))[ >/]/,
      /<meta[^>]+name="?description"?[^>]* content=(?<value>([^ ]+))[ >/]/,
    ].reduce((done,x)=>done||x.exec(html),0)

    // if (href.includes('instagram')) log({title})

    let parsed_icon = (/.+\.(jpg|png)$/.exec(href)||[])[0] || icon?.groups.value || ''
    // log({parsed_icon})
    const parenthesied = /"([^"]*)"/.exec(parsed_icon)
    if (parenthesied) {
      parsed_icon = parenthesied[1]
    }
    if (/^\//.test(parsed_icon)) {
      const url = new URL(href)
      parsed_icon = url.origin + parsed_icon
    }

    const parsed_title = (title||{})[1] || _href
    const out_of_date_error = false && /update/i.test(parsed_title)
    const login_error = /login/i.test(parsed_title)
    const not_found_error = /not found/i.test(parsed_title)
    const bad_gateway = /bad gateway/i.test(parsed_title)
    const cloudflare = /cloudflare/i.test(parsed_title)
    const timeout = /time[---]?out/i.test(parsed_title)
    const any_error = [
      out_of_date_error,
      login_error,
      not_found_error,
      bad_gateway,
      cloudflare,
      timeout,
      /error/i.test(parsed_title),
      /just a moment.../i.test(parsed_title)
    ].find(truthy)

    // if (netflix_match) {
    //   const netflix_icon = /"url": "([^"]+nflxso.net[^"]+)"/.exec(html)
    //   overrides.icon = netflix_icon
    // }

    const og_title = ([
      /<meta[^>]+property="?og:title"?[^>]* content="(?<value>[^"]*)"/,
      /<meta[^>]+property="?og:title"?[^>]* content='(?<value>[^']*)'/,
      /<meta[^>]+property="?og:title"?[^>]* content=(?<value>[^ ]*)/,
    ].reduce((done,x)=>done||x.exec(html),0)||{})[1]||undefined

    const og_description = ([
      /<meta[^>]+property="?og:description"?[^>]* content="(?<value>[^"]*)"/,
      /<meta[^>]+property="?og:description"?[^>]* content='(?<value>[^']*)'/,
      /<meta[^>]+property="?og:description"?[^>]* content=(?<value>[^ ]*)/,
    ].reduce((done,x)=>done||x.exec(html),0)||{})[1]||undefined

    const domain = new URL(href, 'https://freshman.dev').hostname.split('.').slice(-2).join('.')
    const domain_title = og_title ? (!og_title.match(/\([^)]+\)$/)) ? `${og_title} (${domain})` : og_title : ''

    return {
      title: (overrides.title || domain_title || (any_error 
        ? _href 
        : parsed_title))
        .replace(/&#064;/g, '@')
        .replace(/&amp;/g, '&')
        .replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
        .replace(/&bull;/g, '•').replace(/&#x2022;/g, '•')
        .replace(/&lrm;/g, ''),
      description: overrides.description || og_description || (description?.groups.value||''),
      icon: (overrides.icon || parsed_icon)
        .replace(/&#064;/g, '@')
        .replace(/&amp;/g, '&')
        .replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
        .replace(/&bull;/g, '•').replace(/&#x2022;/g, '•')
        .replace(/&lrm;/g, '')
        .replace(/\\u002F/g, '/'),
      og_title,
      og_description,
    }
  } catch (e) {
    console.error(e)
    return {
      title:'', description:'', icon:'', og_title:'', og_description:''
    }
  }
}
export const create_link_object = link_preview_object
R.post('/title', async (rq, rs) => {
  let { url, href } = rq.body
  href = url || href
  console.debug('TITLE', href)
  try {
    const lpo = await link_preview_object(href)
    rs.send(lpo.title)
  } catch {
    rs.send(href)
  }
})
R.post('/icon', async (rq, rs) => {
  let { url, href } = rq.body
  href = url || href
  console.debug('ICON', href)
  try {
    const lpo = await link_preview_object(href)
    rs.send(lpo.icon)
  } catch {
    rs.send(href)
  }
})
R.post('/link-preview-object', async (rq, rs) => {
  let { url, href } = rq.body
  href = url || href
  console.debug('LPO', href)
  try {
    const lpo = await link_preview_object(href)
    rs.send(lpo)
  } catch {
    rs.send(href)
  }
})
export const create_link_preview = async (href) => {
  const lpo = await link_preview_object(href)

  let preview_HTML = ''
  if (lpo.icon) {
    preview_HTML += `<img src=${lpo.icon} />`
  }

  let label
  if (lpo.description) {
    if (lpo.title) label = `(${lpo.title}) ${lpo.description}`
    else label = lpo.description
  } else if (lpo.title) {
    label = lpo.title
  } else {
    label = href
  }

  if (label) {
    preview_HTML += `<div>${label}</div>`
  }

  return preview_HTML
}
R.post('/link-preview', async(rq, rs) => { const log = named_log('link-preview')
  const { href:_href } = request_parser.parse(rq)
  const href = _href.replace(/^(https?:\/\/)?/, 'https://')
})

const _file_name = /[^.]+\.[^.]+$/
R.get(['/stream/:name?', '/stream'], async (rq, rs) => {
  const name = (P(rq, 'name') || 'stream').replaceAll('../', '')
  const dir_name = name.startsWith('git-') ? '/srv/git/'+name.split('-')[1] : path.join(staticPath,  'raw/' + name + '/items')
  const dir = fs.readdirSync(dir_name, { recursive:true })
  // console.debug('STREAM', dir)
  rs.json(dir.reverse().filter(x => _file_name.test(x)).map(x => encodeURI(x)))
})

// common-state: for simple shared states between clients
// (uses MongoDB update operators)
const common_state = db.of({ default: 'common-state' }).default
const common_state_prefixes = set('session- fishbowl-')
let pollers = {}
R.all('/common-state', async (req, res) => {
  const id = P(req, 'id')
  const version = P(req, 'version')
  let state = await common_state().findOne({ id }) || {
    id,
    version: 0,
  }
  // if (version && version !== state.version) throw 'unexpected'
  
  const update = JSON.parse(P(req, 'update') || '0')
  console.debug(req.body)
  if (update) {
    const _pollers = pollers[id] || []
    delete pollers[id]
    console.debug('[COMMON-STATE] update', update, _pollers)
    if (![...common_state_prefixes].some(x => id.startsWith(x))) throw 'unexpected' // attempt to limit usage TODO trie
    if ((JSON.stringify(state) + JSON.stringify(update)).length > 10_000) throw 'unexpected' // set a low bound for this
    // state = await common_state().findOneAndUpdate({ id }, [update, { $set: pick(state, 'id version') }, { $inc: { version:1 } }], { upsert: true })
    // TODO make these operations atomic
    await common_state().updateOne({ id }, update, { upsert: true })
    const new_state = await common_state().findOne({ id })
    if (JSON.stringify(state) !== JSON.stringify(new_state)) {
      state = Object.assign(new_state, { version: state.version + 1 })
      common_state().updateOne({ id }, { $set: { version: state.version } })
    }
    _pollers.map(x => x(state))
  }

  let _returned = false
  const _return = state => {
    if (!_returned) {
      _returned = true
      remove(pollers[id] || [], _return)
      res.json(unpick(state, '_id'))
    }
  }
  const poll = JSON.parse(P(req, 'poll') || '0')
  if (poll) {
    console.debug('[COMMON-STATE] poll', id, poll)
    pollers[id] = pollers[id] || []
    pollers[id].push(_return)
    setTimeout(() => _return(state), poll === true ? 30_000 : poll)
  } else {
    _return(state)
  }
})

export const ipToId = (ip) => hash(ip)
R.get('/id', async (rq, rs) => {
  // return unique ID per IP
  rs.send(ipToId(rq.ip))
})
const userId = rq => hash(rq.user || rq.ip)
R.get('/user_id', async (rq, rs) => {
  // return unique ID per IP/user
  rs.send(userId(rq))
})
R.get('/user_id_color', async (rq, rs) => {
  if (rq.user) {
    const profile = await requireProfile(rq)
    if (profile.settings.theme) return rs.send(profile.settings.theme)
  }
  rs.send(`hsl(${parseInt(userId(rq), 16) % 365}deg 100% 80%)`)
})
R.get('/user_id_color_hue', async (rq, rs) => {
  if (rq.user) {
    const profile = await requireProfile(rq)
    if (profile.settings.theme) return rs.send(profile.settings.theme)
  }
  rs.send(String(parseInt(userId(rq), 16) % 365))
})

db.queueInit(() => {
  const log = isDevelopment() ? console.debug : ()=>{}
  const api = {
    prefixes: set('session fishbowl sync spot uh bugs follows charts play run websiteblock htmlresume'),
    cache: {},
    db: db.of({ default: 'states' }).default(),
    on: {},
  }

  // setInterval(() => log('polling', transmute(api.on, (k,v)=>({[k]:v.length}))), 1_000)
  R.post('/state', J(async (rq, rs) => {
    try {
    let { id, state, update, delete:_delete, poll=0 } = OP(rq)
    if (id && !api.prefixes.has(id.split('-')[0])) throw 'unexpected'

    const is_update = !!(state || update || _delete)
    log({ id, is_update, ons: api.on[id]?.length, poll, state, update, delete:_delete })
    state = state||api.cache[id]||unpick(await api.db.findOne({id}),'_id')||{version:0}
    if (JSON.stringify({state, update}).length > 5_000) throw 'unexpected'
    if (is_update) {
      log(state = merge(state, update || {}, deletion(_delete), { version: (state.version||0) + 1 }))
      // if (id.startsWith('fishbowl')) console.debug(id, state)
      api.db.replaceOne({ id }, state, { upsert: true })
      if (api.on[id]) {
        const ons = api.on[id]
        defer(() => ons.map(f=>f(state)))
        delete api.on[id]
      }
      // io.emit(`state:${id}`, state)
    }
    api.cache[id] = state

    if (poll && !is_update) {
      log('poll', api.on[id]?.length, id)
      let resolved = false
      return new Promise(_resolve => {
        const resolve = x => {
          if (resolved) return
          resolved = true
          log('polled', id)
          _resolve(x)
        }
        ;(api.on[id] = api.on[id] || []).push(resolve)
        defer(() => {
          api.on[id] = remove(api.on[id] || [], resolve)
          resolve(false)
        }, poll === true ? 5_000 : poll)
      })
    } else {
      log('return', id)
      return state
    }  
    } catch (e) {
      console.error(e)
      throw e
    }
  }))
})

let blank = `%BODY%`
let blanks = {
  mastodonIntentBlank: {
    value: undefined,
    replace: [
      ['%TITLE%', 'Mastodon Redirect'],
      ['%ICON%', '/icon.png'],
      ['%BODY%', '%DYNAMIC%%STATIC%'],
      ['%STATIC%', `
<a id="open-button" href='' class='button' onclick="redirect(event)">
  <svg xmlns="http://www.w3.org/2000/svg" height="1.4em" width="1.4em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M11.19 12.195c2.016-.24 3.77-1.475 3.99-2.603.348-1.778.32-4.339.32-4.339 0-3.47-2.286-4.488-2.286-4.488C12.062.238 10.083.017 8.027 0h-.05C5.92.017 3.942.238 2.79.765c0 0-2.285 1.017-2.285 4.488l-.002.662c-.004.64-.007 1.35.011 2.091.083 3.394.626 6.74 3.78 7.57 1.454.383 2.703.463 3.709.408 1.823-.1 2.847-.647 2.847-.647l-.06-1.317s-1.303.41-2.767.36c-1.45-.05-2.98-.156-3.215-1.928a3.614 3.614 0 0 1-.033-.496s1.424.346 3.228.428c1.103.05 2.137-.064 3.188-.189zm1.613-2.47H11.13v-4.08c0-.859-.364-1.295-1.091-1.295-.804 0-1.207.517-1.207 1.541v2.233H7.168V5.89c0-1.024-.403-1.541-1.207-1.541-.727 0-1.091.436-1.091 1.296v4.079H3.197V5.522c0-.859.22-1.541.66-2.046.456-.505 1.052-.764 1.793-.764.856 0 1.504.328 1.933.983L8 4.39l.417-.695c.429-.655 1.077-.983 1.934-.983.74 0 1.336.259 1.791.764.442.505.661 1.187.661 2.046v4.203z"/>
    <!-- https://icons.getbootstrap.com/icons/mastodon -->
    <!-- The MIT License (MIT)

    Copyright (c) 2019-2021 The Bootstrap Authors

    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. -->
  </svg>
  &nbsp;&nbsp;
  <span id='open-text'>Open mastodon.example</span>
</a>
</form>

<style>
  html, body {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    align-items: center;
    justify-content: center;

    background: white;
    color: black;

    font-family: system-ui, sans-serif;
    font-size: 14px;
    text-align: center;
  }
  * { 
    text-align: inherit;
    user-select: none;
  }

  #container {
    width: calc(100% - 1.5em);
    max-width: 400px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
  }
  #container > * {
    margin-bottom: 1em;
  }

  .button, input {
    position: relative;
    width: auto;
    display: inline-block;
    box-sizing: border-box;
    border: 2px;
    border-radius: 4px;
    padding: .4em 1em;
    overflow: hidden;
    white-space: nowrap;
    font-size: 1.25em;
    line-height: 1.5;
    font-family: inherit;
    letter-spacing: 0;
    text-decoration: none;
    text-overflow: ellipsis;
  }

  .button {
    align-self: flex-end;
    width: fit-content;
    display: inline-flex;
    align-items: center;
    background: #6d6eff;
    color: #fff;
    font-family: system-ui, sans-serif;
    font-weight: 500;
    cursor: pointer;
    user-select: none;
  }
  .button.secondary {
    padding: 7px 14px;
    background: #eee;
    color: #0008;
    font-weight: normal;
  }
  .button input { margin: 0 }
  .button input:not(:last-child) { margin-right: .5em }

  input { background: #0001 }
  input::placeholder { opacity: .6 }
  input:focus-visible { background: none; outline: #000c auto 1px }
  input:focus-visible::placeholder { opacity: .3 }

  label.full {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    justify-items: stretch;
    font-weight: bold;
  }
  label.full > span {
    display: block;
    align-self: flex-start;
    margin: 1em 0;
    position: relative;
    left: -.5em;
  }
</style>

<div style="
user-select: none;
display: flex;
flex-direction: column;
align-items: center;

position: fixed; 
top: -4px;
border-radius: 4px;
padding: 0.4em 1em;
padding-top: calc(0.4em + 4px);

color: #000;
">
  <span>Unofficial Mastodon intent redirect</span>
  <label
  style="
  user-select: none;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding-top: .25em;
  ">
    &nbsp;<input id="server-save-input" type="checkbox" style="margin:0;cursor:pointer;margin-right:.4em;font-size:1em;" onchange="
      if (event.target.checked) localStorage.setItem('server', server)
      else localStorage.removeItem('server')
      // event.target.parentElement.querySelector('#cookie-notice').style.display = event.target.checked ? 'none' : ''
    " />Remember&nbsp;<span id="server-save-server">server</span><span id="cookie-notice">&nbsp;(accept cookie)</span>&nbsp;
  </label>
</div>

<div style="
z-index: 123456;
position: fixed;
bottom: 0; right: 0;
color: #fff6;
text-shadow: 1px 1px #0008;
font-size: 0.8rem;
padding: .5rem;
pointer-events: none;
line-height: 1;
">
  by <a href='https://freshman.dev' style="position:relative;color:inherit;pointer-events:all">
    FRESHMAN.DEV
  </a>
</div>

<script>
  const serverInput = document.querySelector('#server-input')
  const openButton = document.querySelector('#open-button')
  const openText = document.querySelector('#open-text')
  const serverSave = document.querySelector('#server-save-input')
  const serverSaveServer = document.querySelector('#server-save-server')
  const renderServer = server => {
    openText.textContent = 'Open ' + server
    openButton.href = 'http://' + server + REQUEST
    if (server === TARGET_SERVER) {
      serverSave.parentNode.style.display = 'none'
      serverSaveServer.textContent = 'server'
    } else {
      // serverSave.parentNode.style.display = serverSave.checked ? 'none' : 'flex'
      serverSave.parentNode.style.display = 'flex'
      serverSaveServer.textContent = server
    }
  }

  let server = localStorage.getItem('server')
  if (server) {
    serverInput.value = server
    serverSave.checked = true
  } else server = TARGET_SERVER
  renderServer(server)

  serverInput.focus()
  const handleServerInputChange = e => {
    setTimeout(() => {
      const match = /^(@?[^@ ]+@)?([^@ ]+\\.[^@. ]{2,}$)/.exec(e.target.value)
      console.debug(match)
      server = match ? match[2] : TARGET_SERVER
      renderServer(server)
    })
  }
  serverInput.addEventListener('keydown', handleServerInputChange)
  serverInput.addEventListener('keyup', handleServerInputChange)

  function redirect(e) {
    e.preventDefault()
    e.stopPropagation()
    if (serverSave.checked) localStorage.setItem('server', server)
    window.open(openButton.href, '_self')
  }
</script>`],
    ],
  }
}
const renderBlanks = () => Object.values(blanks).map(x => {
  x.value = blank
  x.replace.map(([search, replacement]) => x.value = x.value.replace(search, replacement))
})
renderBlanks()

fs.readFile(path.join(basedir(), 'routes/base/blank.html'), (err, data) => {
  blank = data?.toString()
  renderBlanks()
})

R.get('/mastodon-intent-auth/:intent', async (req, res) => {
  if (!blank) return res.sendStatus(500)

  // intercepted mastodon.freshman.dev /share or /authorize_follow intent
  const { intent='share' } = req.params
  const query = new URLSearchParams(req.query)
  query.delete('resolve')

  // parse Host header
  // we may receive multiple host headers:
  /*
  'Host',
  'freshman.dev',
  ...
  'Connection',
  'upgrade',
  'Host',
  'mastodon.freshman.dev',
  */
  // express doesn't parse the second host
  let server, i = 0
  while (i < req.rawHeaders.length) {
    if (req.rawHeaders[i] === 'Host') server = req.rawHeaders[++i]
    i++
  }
  if (server === 'localhost:5000') server = 'mastodon.freshman.dev'

  const { text='' } = req.query
  const at = decodeURIComponent(text).split(' ')[0]
  const match = /^(@?([^@ ]+)@)?([^@ ]+.[^@ ]+$)/.exec(at)
  if (match) server = match[3]

  console.debug('[MASTODON-INTENT-AUTH]', server, text, at, intent)
  res.send(blanks.mastodonIntentBlank.value.replace('%DYNAMIC%', `
<script>
  const TARGET_SERVER = '${server}'
  const REQUEST = '/${intent}?${query.toString() || 'visibility=private&text=@cyrus@mastodon.freshman.dev%20'}'
</script>

<form id="container" onsubmit="redirect(event)">
<label id="server" class="full" for="server-input">
  <div style="
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 1em;">
    <span>Enter your Mastodon server</span>
  </div>
  <input
  id="server-input"
  type="text"
  placeholder="${server}">
</label>
`)).end()
})
R.get('/mastodon-dm', async (req, res) => {
    let {
        mastodon='',
        icon=true, text=undefined, on=false,
        href:returnHref=undefined, button:returnButton=undefined, image:returnImage=false,
    } = req.query
    returnHref = returnHref !== false && Object.hasOwn(req.query, 'href')
    returnButton = returnButton !== false && Object.hasOwn(req.query, 'button')
    returnImage = returnImage !== false && Object.hasOwn(req.query, 'image')

    const match = /^@([^@ ]+)@([^@ ]+.([^@ ]+)+$)/.exec(mastodon)
    let user, server, href, button
    if (match) {
        [user, server] = match.slice(1)
        href = `https://${server}/share?text=${mastodon}%20&visibility=direct`
        text = text || `Message ${mastodon}` + (on ? ' on Mastodon' : '')
        button = `
        <a href=${href} target='_blank' rel='noreferrer' className='mastodon-dm-button' style='
        background-color: #6d6eff;
        border: 10px;
        border-radius: 4px;
        box-sizing: border-box;
        color: #000;
        cursor: pointer;
        display: inline-block;
        font-family: inherit;
        font-size: 15px;
        font-weight: 500;
        letter-spacing: 0;
        line-height: 22px;
        overflow: hidden;
        padding: 7px 18px;
        position: relative;
        text-align: center;
        text-decoration: none;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: auto;

        color: white;
        font-family: system-ui, sans-serif;
        display: inline-flex;
        align-items: center;
        user-select: none;
        '>
            ${icon
            ?
            `
            <svg xmlns="http://www.w3.org/2000/svg" height="22px" width="22px" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.19 12.195c2.016-.24 3.77-1.475 3.99-2.603.348-1.778.32-4.339.32-4.339 0-3.47-2.286-4.488-2.286-4.488C12.062.238 10.083.017 8.027 0h-.05C5.92.017 3.942.238 2.79.765c0 0-2.285 1.017-2.285 4.488l-.002.662c-.004.64-.007 1.35.011 2.091.083 3.394.626 6.74 3.78 7.57 1.454.383 2.703.463 3.709.408 1.823-.1 2.847-.647 2.847-.647l-.06-1.317s-1.303.41-2.767.36c-1.45-.05-2.98-.156-3.215-1.928a3.614 3.614 0 0 1-.033-.496s1.424.346 3.228.428c1.103.05 2.137-.064 3.188-.189zm1.613-2.47H11.13v-4.08c0-.859-.364-1.295-1.091-1.295-.804 0-1.207.517-1.207 1.541v2.233H7.168V5.89c0-1.024-.403-1.541-1.207-1.541-.727 0-1.091.436-1.091 1.296v4.079H3.197V5.522c0-.859.22-1.541.66-2.046.456-.505 1.052-.764 1.793-.764.856 0 1.504.328 1.933.983L8 4.39l.417-.695c.429-.655 1.077-.983 1.934-.983.74 0 1.336.259 1.791.764.442.505.661 1.187.661 2.046v4.203z"/>
                <!-- https://icons.getbootstrap.com/icons/mastodon -->
                <!--
                The MIT License (MIT)

                Copyright (c) 2019-2021 The Bootstrap Authors

                Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

                The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

                THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                -->
            </svg>
            ${text.trim() ? `&nbsp;&nbsp;` : ''}
            `
            :''}
            ${text ? text.trim() : 'Message me'}
        </a>`

        if (returnButton) return res.send(button)
        if (returnHref) return res.send(href)
        if (returnImage) return nodeHtmlToImage({
            html: button,
            transparent: true,
            selector: 'a',
        }).then(image => {
            res.writeHead(200, { 'Content-Type': 'image/png' })
            res.end(image, 'binary')
        })
        return res.json({
            href,
            button,
        })
    } else {
        J(() => {
            throw HttpError(400, 'Query with valid Mastodon @ like ?mastodon=@user@server.example')
        })(req, res)
    }
})

export default {
  routes: R,
}
