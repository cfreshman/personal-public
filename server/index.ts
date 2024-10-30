import './utils/script'

import express from 'express';
import path from 'path';
import fs from 'fs';
import events from 'events'
import cors from 'cors';
import { exec } from 'child_process'

import { domains, replace } from './domains'
import db from './db';
import routes, { ios } from './routes'
import ioR, * as ioModule from './io'
import login from './routes/login';
import { J, E, isProduction, require, basedir, staticPath, pick, isDevelopment, set, convertLinks, merge, requireUser, randi, unpick, truthy, defer, named_log } from './util';
import { siteChat } from './routes/chat/model';
import './ai'

import redirect_ly from './routes/ly/redirect'
import redirect_gitly from './routes/gitly/redirect'

import * as http from 'http'
import * as socket_io from 'socket.io'

import { getUserInfo as getWordbaseInfo, STAT } from './routes/wordbase/model'

import simple from './routes/simple'
import greeter from './routes/greeter'
import capitals from './routes/capitals'
import letterpress from './routes/letterpress'
import quadbase from './routes/quadbase'
import multipals from './routes/multipals'
import collector from './routes/collector'

import './routes/login/deleter'

// set('trace debug log warn error').forEach(method => window.console[method] = () => {})
const log = named_log('index')

const app:any = express()
const port = isDevelopment() ? 5050 : 5000
const server = http.createServer(app)
const io = new socket_io.Server(server as any, {
    cors: {
        origin: true,
        methods: ["GET", "POST"]
    }
})
events.EventEmitter.defaultMaxListeners = 100
ioModule.set(io)
ioR.set(io)

// connect to DB & start server
const connect = (retry=false) => db.connect('mongodb://localhost/site', err => {
    if (err) {
        // attempt to start DB & retry connection
        if (retry) {
            console.log('Attempt to restart DB')
            server.close()
            exec(
                'yarn db-down',
                () => exec('yarn db-up &', { timeout: 1000 }, () => connect(false)))
        } else {
            console.error('Error connecting to DB')
            console.error(err)
        }
    } else {
        try {
            server.listen(port, '::', () => {
                console.log(`DB connected, app started on port ${port}`)
                ioR.model.clearIo() // clear persisted sockets, now invalid due to server restart
                configure()
            })
        } catch (e) {
            console.error(e)
        }
    }
})
try {
    connect(true)
} catch (e) {
    console.error('INIT ERROR', e)
    console.error(e.stack)
}
import process from 'node:process';
import { randAlphanum } from './rand';
import key from './routes/key';
import profile from './routes/profile';
// import picoRepo from './routes/pico-repo';
import wordbase from './routes/wordbase';
import redirect from './routes/ly/redirect';
import { ipToId } from './routes/base';
import { supporter } from './routes/cost/model';
import txt from './routes/txt';
import { get_friend_link } from './routes/profile/model';
import { get_sponsors } from './routes/donoboard';
// console.log(randAlphanum(16))
process.on('uncaughtException', e => {
    console.error('uncaughtException', e);
});
process.on('unhandledRejection', e => {
    console.error('unhandledRejection', e);
});
// process.on('SIGTERM', e => server.close());

let goodbye = false
;[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`]
.forEach(sig => {
    process.on(sig, e => {
        if (!goodbye) {
            goodbye = true
            io.emit('message', {
                // text: 'warning: server offline – you might want to message me <a href="https://twitter.com/freshman_dev">@freshman_dev</a>/twitter',
                // text: 'warning: server restart. please wait one minute',
                // text: 'warning: server restart. please wait one minute. possible reasons: /weeklog (view when back online)',
                // text: 'server restart, 1 minute wait.\nwhy @ x.com/freshman_log',
                text: 'server restart, 1 minute wait',
                id: 'offline',
                delete: 'offline online',
                delay: 0,
            })
            console.log('\ngoodbye')
            server.close()
            setTimeout(() => {
                db.close(() => process.exit(0))
            }, 1_000)
        }
    })
})

/*
 * ONLY RUN AFTER DB CONNECTION - this prevents issues with model DB access on init
 */
function configure() {

app.use(cors())
app.set('trust proxy', true)

// allow for timing requests
app.use((req, res, next) => {
    req.start = performance.now()
    req.id = randAlphanum(7)
    req.log = (...args) => console.log(req.id, ...args)
    // console.debug('forwarded', req.headers['x-forwarded-for'])
    next()
})

// forward /api/O requests to actual path
app.use((rq, rs, nx) => {
    if (rq.url.startsWith('/api/O')) {
        const { 'x-o-path':path, 'x-o-method':method='GET' } = rq.headers
        console.debug(rq.url, rq.method, {method,path})
        rq.url = path
        rq.method = method
    }
    nx()
})

// parse JSON & form requests
const defaultParseSettings = {
    extended: true,
    limit: '1000mb',
}
app.use(express.json(defaultParseSettings));
app.use(express.urlencoded(defaultParseSettings))
app.use(express.text(defaultParseSettings))
app.use(express.raw({
    ...defaultParseSettings,
    type: '*/*',
}))

/**
 * CUSTOM RESPONSES
 */
// redirect domain-level apps, e.g. /wordbase/page => /page
app.get('/wordbase/replay/:id', (req, res) =>
    wordbase.model.resultTwitterHTML(res, req.params.id))
app.get('/*', async (req, res, next) => {
    Object.entries(domains).concat([['test', 'test.example']]).some(([name, domain]) => {
        if (req.url.match(new RegExp(`^/${name}/.+`, 'i'))) {
            req.domain_app = name
            req.url = req.url.replace(new RegExp(`${name}/?`, 'i'), '')
            req.origin = domain
            // console.debug('forward app routes for', domain, name, req.url, req.domain_app)
            next()
            return true
        }
    }) || next()
})

let streamDefaults, streamTemplates, streamIndex
app.get(['/-?stream', '/-?raw/stream'], async (req, res) => {
    let html = streamIndex = streamIndex || fs.readFileSync(path.join(staticPath, 'raw/stream/index.html')).toString()
    const [_, search] = /\?(.+)/.exec(req.url) || ['', '']
    const query = new URLSearchParams(search)
    let item = query.get('')?.split('?')[0]
    if (!item) {
        // const dir = fs.readdirSync(path.join(staticPath, 'raw/stream/items'))
        // item = dir[0]
    }
    console.debug('STREAM', req.url, item)
    if (item) {
        if (!streamDefaults) {
            streamDefaults = {}
            streamTemplates = {}
            recurseTemplate(indexRegex, streamDefaults, streamTemplates, html)
            // console.debug(streamDefaults, streamTemplates)
        }
        let item_href = `/raw/stream/items/${item}`
        let item_html = fs.readFileSync(path.join(staticPath,  item_href)).toString()
        const redirect_match = /<script>location.href='(?<href>.+)'<\/script>/.exec(item_html)
        // console.debug(redirect_match)
        if (redirect_match?.groups) {
            console.debug(path.join(staticPath, redirect_match?.groups?.href))
            item_href = redirect_match.groups.href
            item_html = fs.readFileSync(path.join(staticPath, item_href, 'index.html')).toString()
        }

        const title_match = /<title>(?<value>[^<]*)<\/title>/.exec(item_html) as any
        const description_match = /<meta name=description content="(?<value>[^"]*)"/.exec(item_html) as any
        // console.debug({title_match,description_match})
        let title
        if (title_match && description_match) title = `(${title_match.groups.value}) ${description_match.groups.value}`
        else if (title_match || description_match) title = (title_match || description_match).groups.value
        else {
            const body_match = /<body(?:[^>]*)>(?<value>[^<]*)<\/body>/.exec(item_html) as any
            if (body_match) title = body_match.groups.value
            else {
                let url
                try {
                    url = new URL(item)
                } catch {}
                title = url?.search.slice(2) || item
            }
        }

        const img_match = /<img src=(?<value>([^ ]+)|(['"][^'"]['"])) /.exec(item_html)
        // console.debug({...img_match?.groups}, item_html)
        const img_local_url = img_match?.groups?.value.replace(/"/g, '') || ''
        const icon = img_local_url 
        ? img_local_url.startsWith('http') ? img_local_url : `https://freshman.dev${item_href}/${img_local_url}`
        : ''
        const replacements = { title, icon, og: {title,icon}, twitter: {card: 'summary_large_image', image: icon} }
        // console.debug('STREAM ITEM', item, replacements)
        html = replaceTemplate(html, replacements, indexRegex, streamDefaults, streamTemplates)
    }
    res.send(html)
})

// ly, gitly, txt
app.use(['/ly', '/\\.*', '/:*', '/-*', '/git:'], redirect_ly.routes)
app.use('/gitly', redirect_gitly.routes)
// app.use(['/t-*'], async (rq, rs, nx) => {
//     console.debug('t-', pick(rq, 'originalUrl'))
//     try {
//         const { txt:entry } = await txt.get(rq.user, rq.originalUrl.replace(/^\/?t-/, ''))
//         console.debug(entry)
//         // rs.send(entry.value)
//         // rs.send(entry.value)
//         rs.send(`<!DOCTYPE html><html><head><meta charset=utf-8><script src=/copyright.js></script><meta data-hydrate data-style /><title>${entry.hash}</title></head><body>
// ${entry.value}
// </body></html>`)
//     } catch {
//         nx()
//     }
// })
// END CUSTOM RESPONSES

// user auth
let last = ''
let repeats = 0
const ignore_repeats = set('/state')
app.use(async (req, res, next) => {
    req.user = login.preAuth(req)
    if (!req.user) {
        req.user = (await key.getApiAuth(req)) || (await login.auth(req))
    }
    const query = [req.method, req.url, req.user].join(' ')
    if (last === query && !ignore_repeats.has(req.path)) {
        repeats += 1
    } else {
        repeats = 0
        last = query
    }
    // console.log(`auth in ${Math.round((performance.now() - req.start) * 100)/100}ms`)
    repeats > 50 ? E('repeated request') : next()
})

// log timestamped url requests
const silence = new Set([
    'POST /api/cityhall/',
    'POST /api/cityhall/lapse',
    'GET /apple-touch-icon-precomposed.png',
    'GET /favicon.ico',
    'GET /apple-touch-icon.png',
    'POST /state',
    'GET /api/ip',
    'GET /api/user_id_color',
])
let last_requestor = ''
app.use((req, res, next) => {
    if (!silence.has(req.method + ' ' + req.originalUrl)) {
        const now = new Date()
        req.true_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        const requestor = `${req.user} ${req.hostname} ${req.true_ip}`
        if (requestor !== last_requestor) {
            last_requestor = requestor
            console.log(' '.repeat(String(now.getTime()).length), requestor)
        }
        console.log(
            String(now.getTime()),
            now.toLocaleString('en-US', {
                timeZone: 'America/New_York',
                dateStyle: 'short',
                timeStyle: 'medium',
                hour12: false,
            }).replace(',', ''),
            // '>'+req.true_ip.slice(-8),
            req.true_ip,
            req.id,
            req.method, req.originalUrl,
            // req.user ? req.user : `false ${req.ip}`,
            );
        // if (req.originalUrl === '/api/follow-sync/twitter') {
        //     console.debug(req.query, req.body)
        // }
    }
    next();
});
// socket io
app.use((req, res, next) => {
    req.io = io;
    next();
});

// api routes
// console.debug('routes', routes)
Object
.entries<any>(routes)
.map(([path, index]) => app.use('/api/'+path, index.routes))

// simple
app.use(simple.routes)
ios.push(simple.io)

const online = {}
const backOnline = Date.now()
const echoIgnores = {
    'cards': set('cursor c init i'),
}
const echoSaves = {
    'cards': {
        on: set('reset r'),
        ignore: set('cursor c uncursor u'),
        history: [],
        complete: ['C'],
    },
}
db.queueInit(async () => {
    const echoSaveHistory = await db.simple.get('echo-saves') // { [key]: history }
    console.debug('loaded echo history', Object.assign(echoSaves, merge(echoSaves, echoSaveHistory || {})))
    db.queueClose(async () => {
        const echoSaveHistory = Object.fromEntries(Object.entries(echoSaves).map(([k, v]) => [k, pick(v, 'history')]))
        await db.simple.set('echo-saves', echoSaveHistory)
    })
})
io.on('connection', socket => {
    // notify server status after successful db query
    defer(async () => {
        let changed:string = ''
        try {
            const changes_path = path.join(staticPath, 'changes.txt')
            changed = fs.readFileSync(changes_path).toString()
            fs.rmSync(changes_path, { force:true })
        } catch {}
        await db.simple.get('no-data') // wait for actual return from DB
        socket.emit('message', {
            // text: `server back online. x.com/freshman_log${changed ? `\nreload if on: ${changed}` : ''}`,
            text: `server back online${changed ? `\nreload if on: ${changed}` : ''}`,
            ms: 3000,
            require: 'offline', delete: 'offline',
        })
    })

    // if (Date.now() - backOnline < 60_000) {
        
    //     // socket.emit('message', {
    //     //     text: `<a href="#" onclick="window.reloadServiceWorker()">reload for latest update</a>`,
    //     //     id: 'sw'
    //     // })
    // }
    const info: { user?:string } = {}
    socket.use((x, next) => {
        ioModule.middleware(socket, info, ...x)
        next()
    })
    function logout() {
        if (info.user) {
            socket.leave(`user:${info.user}`)
            console.log('[IO:logout]', info)
            ioR.model.removeIo(info.user, socket.id)
            online[info.user] -= 1
            if (online[info.user] <= 0) delete online[info.user]
        }
        delete online[socket.id]
    }
    socket.on('login', auth => {
        login.authIo(auth).then(async user => {
            logout()
            info.user = user
            if (user) {
                ioR.model.addIo(user, socket.id)
                console.log('[IO:login]', info)
                online[user] = 1 + (online[user] ?? 0)
                socket.join(`user:${user}`)

                // login messages
                const _profile = await profile._get(user)
                const day_ms = 24 * 60 * 60 * 1000

                // RIHub CD course - MEET WITH ME
                if (Date.now() - _profile.t > 7 * day_ms) {
                    // if been on site for a week
                    // popup({
                    //     // text: `read the new /about page! I need 8334 users to donate $1/mo to continue working on this website full-time`,
                    //     text: `/MEET WITH ME! (15m)\nim looking to interview ~12 users`,
                    //     id: 'sponsor-rihub-interview-2',
                    //     once: true,
                    //     ms: 60_000,
                    // })
                }

                // donation messages
                if (Date.now() - _profile.t > 28 * day_ms) {
                    // after a moon cycle
                    !(await supporter(user)) && popup({
                        text: `if u were going to buy a coffee today, buy me one too! /coffee`,
                        id: 'sponsor-mooncycle',
                        once: true,
                        ms: 60_000,
                    })
                }

                {
                    // once per year
                    const years = Math.floor((Date.now() - _profile.t) / (365 * day_ms))
                    if (years) {
                        popup({
                            text: `if u were going to buy a coffee today, buy me one too! /coffee`,
                            id: `sponsor-year-${years}`,
                            delete: 'sponsor-mooncycle',
                            once: true,
                            ms: 60_000,
                        })
                        popup({
                            text: `you joined ${years} year${years===1?'':'s'} ago!`,
                            id: `year-${years}`,
                            once: true,
                            ms: 60_000,
                        })
                    }
                }

            } else {
                online[socket.id] = 1
            }
            socket.emit('login:done')
        });
    })
    socket.on('disconnect', auth => logout())
    socket.on('debug', (...data) => {
        console.log('[IO:debug]', ...data)
    })
    socket.on('join', room => {
        console.log('[IO:join]', room)
        socket.join(room)
    })
    socket.on('echo', (room, ...rest) => {
        const echoRoom = `echo:${room}`
        console.log('[IO:echo]', room, rest)
        socket.join(echoRoom)

        if (!echoIgnores[room]?.has(rest[0])) console.log('[IO:echo]', echoRoom, !echoIgnores[room]?.has('data-'+rest[0]) ? JSON.stringify(rest) : undefined)
        if (rest.length) io.to(echoRoom).emit(echoRoom, ...rest)
    })
    socket.on('emit', async (room, ...rest) => {
        const echoRoom = `emit:${room}`
        socket.join(echoRoom)

        const action = rest[0]
        if (!echoIgnores[room]?.has(action)) console.log('[IO:emit]', echoRoom, !echoIgnores[room]?.has('data-'+action) ? JSON.stringify(rest) : undefined)
        if (rest.length) socket.to(echoRoom).emit(echoRoom, ...rest)

        const [room_type, _user] = room.split('-')
        const user = await login.exists(_user) && _user
        const save = echoSaves[room_type]
        if (!echoSaves[room] && user) echoSaves[room] = { history: [] } // save per-user history
        if (save && save.ignore && !save.ignore.has(action)) {
            if (save.on.has(action)) echoSaves[room].history = []
            // console.debug('emit history', echoRoom, action, save.on.has(action), save)
            if (action) echoSaves[room].history.push(rest)
            else echoSaves[room].history.concat(save.complete).map(x => io.to(echoRoom).emit(echoRoom, ...x))
        }
    })

    const popup = msg => {
        // siteChat(info.user, {
        //     text: msg.text,
        //     meta: {
        //         read: true,
        //     }
        // })
        setTimeout(() => socket.emit('message', msg), 0)
    }
    socket.on('wordbase:join', async () => {
        if (info.user) {
            // popup({
            //     text: `Join this weekend's tournament: /wordbase/compete (online game → competitive)`,
            //     id: 'wordbase-compete-0',
            //     // once: false,
            //     once: true,
            //     ms: 30_000,
            //     to: '/wordbase/compete',
            // })
        }
    })
    socket.on('wordbase:alerts', async () => {
        if (info.user) {
            // login messages
            // popup({
            //     text: `Vote for upcoming features on Discord: discord.gg/zfwH35vQ`,
            //     id: 'discord-feature-vote',
            //     once: true,
            //     ms: 30_000,
            // })
            const wordbaseProfile = await getWordbaseInfo(info.user)
            const wordbaseStats = wordbaseProfile?.gameProfile?.stats
            if (wordbaseStats && wordbaseStats[STAT.GAMES_PLAYED] > 1) {
                // popup({
                //     text: `Try out a new theme! <a href="/wordbase?settings.wordbase.theme=bananagrams">Bananagrams</a>`,
                //     id: 'wb-theme-bananagrams',
                //     once: true,
                //     ms: 30_000,
                // })
                // popup({
                //     text: `Try out a new theme! <a href="/wordbase?settings.wordbase.theme=forest">Forest</a>`,
                //     id: 'wb-theme-forest',
                //     once: true,
                //     ms: 30_000,
                // })
                // popup({
                //     text: `Do you use Discord? Join the server: wordbase.app/discord`,
                //     id: 'discord',
                //     once: true,
                //     ms: 30_000,
                // })
            }
        }
    })
    // console.log('[IO] socket connected', socket.handshake.headers.host)

    ios.forEach(x => x(io, socket, info))
});
app.get('/api(/o|/online)', J(async _ => Object.keys(online) ))
app.get('(/api|)/ping', (_, rs) => rs.send('pong') )

// production build
// can read static index.html once - change if this ever gets re-generated dynamically
console.debug('env', process.env.NODE_ENV)
const indexRaw:string = fs.readFileSync(path.join(staticPath, 'index.html')).toString()
const indexRegex = {
    title: /<title>([^<]*)<\/title>/,
    icon: /<link rel="icon" href=("([^"]*)")>/,
    apple_icon: /<link rel="apple-touch-icon-precomposed" href=("([^"]*)")>/,
    description: /<meta name="description" content=("([^"]*)")>/,
    keywords: /<meta name="keywords" content=("([^"]*)")>/,
    manifest: /<link rel="manifest" href=("([^"]*)")>/,
    og: {
        image: /<meta property="og:image" content=("([^"]*)")>/,
        title: /<meta property="og:title" content=("([^"]*)")>/,
        description: /<meta property="og:description" content=("([^"]*)")>/,
    },
    twitter: {
        card: /<meta name="twitter:card" content=("([^"]*)")>/,
        url: /<meta name="twitter:url" content=("([^"]*)")>/,
        site: /<meta name="twitter:site" content=("([^"]*)")>/,
        creator: /<meta name="twitter:creator" content=("([^"]*)")>/,
        title: /<meta name="twitter:title" content=("([^"]*)")>/,
        image: /<meta name="twitter:image" content=("([^"]*)")>/,
        description: /<meta name="twitter:description" content=("([^"]*)")>/,
    },
    id_color: /--id-color: ((.+));/,
}
const altRegexes = {
    icon: ['apple_icon', 'og.image', 'twitter.image'],
    title: ['og.title', 'twitter.title'],
    description: ['og.description', 'twitter.description'],
    url: ['twitter.url', 'twitter.site'],
    twitter_url: ['twitter.url', 'twitter.site'],
}
const indexDefaults:any = {}
const indexTemplates:any = {}
const recurseTemplate = (regexes, found, assign, raw=indexRaw) => {
    Object.keys(regexes).forEach(key => {
        const regex = regexes[key]
        if (regex.test) {
            const match = raw?.match(regex) || []
            const value = found[key] = match[0]
            if (value) {
                // match[1] either ("<match>") or ("") or (<match>) or ()
                // match[2] either (<match>) or () or undefined
                // if match[2] truthy or undefined, replace (match[2] || match[1]) with replacement
                // else, replace match[1] with centered replacement
                // console.debug(match[0], match[1], match[2])
                const center = Math.floor(match[1].length / 2)
                assign[key] = replacement => match[2] !== ''
                ? value.replace(match[2] || match[1], replacement)
                : value.replace(
                    match[1],
                    match[1].slice(0, center) + replacement + match[1].slice(center))
            }
        } else {
            const value = found[key] = {}
            assign[key] = {}
            recurseTemplate(regex, value, assign[key], raw)
        }
    })
}
recurseTemplate(indexRegex, indexDefaults, indexTemplates)
// console.log(indexDefaults, indexTemplates)
const replaceTemplate = (str, replace,
    regexes=indexRegex, defaults=indexDefaults, templates=indexTemplates) => {
    // console.debug('REPLACE', regexes, replace)
    Object.entries(altRegexes).map(([k, v]) => {
        // console.debug(k, v, replace[k])
        if (replace[k]) {
            v.map(x => {
                let a = replace, b = regexes, c = defaults, d = templates
                // console.debug(a, b, c, d)
                const keys = x.split('.')
                while (keys.length) {
                    a = a && a[keys[0]]
                    b = b && b[keys[0]]
                    c = c && c[keys[0]]
                    d = d && d[keys[0]]
                    keys.shift()
                }
                // console.debug(a, b, c, d)
                if (!a && b?.test && c && d) {
                    str = str.replace(c, d(replace[k]))
                }
            })
        }
    })
    Object.keys(replace).map(k => {
        const regex = regexes[k]
        if (!(defaults[k] && templates[k] && replace[k])) {
            // pass
        } else if (regex?.test) {
            // console.log(k, defaults[k], templates[k])
            str = str.replace(defaults[k], templates[k](replace[k]))
        } else if (regex) {
            str = replaceTemplate(
                str, Object.assign({}, replace, replace[k], { [k]: false }),
                regex, defaults[k], templates[k])
        }
    })
    return str
}

app.use(async (req, res, next) => {
    // return pre-gzipped files
    if (req.headers['accept-encoding']?.includes('gzip')) {
        if (fs.existsSync(path.join(staticPath, req.url + '.gz'))) {
            console.log('returning gzipped version of', req.url)
            req.url += '.gz'
            res.set('Content-Encoding', 'gzip')
        }
    }
    next()
})

app.use(async (req, res, next) => {
    // log('FILE?', req.url)
    const url_path = path.join(staticPath, req.url.replaceAll('../', ''))
    // log('FILE', url_path, fs.existsSync(url_path))
    if (fs.existsSync(url_path)) {
        res.sendFile(url_path)
    } else {
        next()
    }
})
app.use('', express.static(staticPath))

// if nothing matched, try ly
app.use('', redirect_ly.forceRoutes)

// if nothing else, return index with meta info (title) based on request
app.get('/*', async (req, res, next) => {
    // console.debug('base', req.url)
    if (req.url.match('^/api(|(/.*))$')) return next()

    // res.sendFile(path.join(basedir, '..', 'build', 'index.html'))
    // NVM - fill meta info for preview (e.g. text messages)

    const page = (req.domain_app || req.url.split('/').filter(x => x)[0] || req.hostname).replace(/^-/, '')
    const id_color = `hsl(${parseInt(ipToId(req.ip), 16) % 365}deg 100% 80%)`
    let replacements = {}
    try {
        const encodedPage = decodeURIComponent((req.domain_app || '') + req.url)
            .replace(/^\/-\/?/, '/')
            .replace(/\/$/, '')
        // console.debug(encodedPage)
        replacements = {
            title: {
                '/man': 'cyrusfre.sh/man',
                '/i': 'beef-su.sh/i',
                '/et': 'tr.ink/et',
            }[req.url] || encodedPage,
            url: (req.origin || 'freshman.dev') + req.url,
            // id_color,
            ...(replace[page] || {}),
        }
        // console.debug(replacements)
    } catch (e) {
        console.error(e)
    }
    // console.debug(replacements)

    if(0)0
    // else if (page === 'pico-repo') {
    //     const app = req.url.split('/').filter(x => x && !['pico-repo', 'view', 'browse', 'saved', 'share'].some(y => y.includes(x)))[0]
    //     if (app) {
    //         try {
    //             const { entry } = await picoRepo.get(false, app)
    //             console.debug('[PICO-REPO] app:', app, entry)
    //             if (entry && (entry['icon'] || entry['images']?.length)) {
    //                 replacements['title'] = entry['name']
    //                 const icon = entry['icon'] || (entry['images']||[])[0]
    //                 if (icon) replacements['icon'] = icon
    //                 replacements['description'] = entry['short'] || entry['url']
    //             }
    //         } catch {} // pass
    //     }
    // }
    else if (page === 'wordbase') {
        const id = req.url.split('/').filter(x => x && !['wordbase', 'replay'].some(y => y.includes(x)))[0]
        console.debug('[WORDBASE] id:', id)
        if (id) {
            if (id === 'new') {
                const hash = req.url.split('new/')[1]
                const {user:challenge_user} = await wordbase.model.get_challenge_user(hash)
                if (challenge_user) {
                    Object.assign(replacements, {
                        title: `challenge ${challenge_user} at wordbase!`,
                    })
                }
            } else {
                try {
                    const { info } = await wordbase.model.getInfo('cyrus', id)
                    console.debug(pick(info, 'p1 p2'))
                    if (info) {
                        Object.assign(replacements, {
                            title: `${info.p1 || 'invite'} vs ${info.p2 || 'invite'}`,
                            // ...(info.img ? { icon: info.img } : {}),
                        })
                    }
                } catch (e) {
                    console.debug(e)
                } // pass
            }
        }
    }
    else if (page === 'greeter') {
        const url_search_str = req.url.split('/greeter')[1]
        const meeting = url_search_str.includes('/met')
        const greeting = url_search_str.includes('/greet')
        const calendar = url_search_str.includes('/calendar')
        const quiz = url_search_str.includes('/quiz')
        const summary = url_search_str.includes('/summary')
        const hangout = url_search_str.includes('/hangout')
        const ai = url_search_str.includes('/ai')
        const users = url_search_str.split('/').filter(x => x && !['greeter', 'met', 'greet', 'calendar', 'quiz', 'about', 'summary', 'hangout'].some(y => y.includes(x)))
        console.debug('[greeter] url parsed:', { meeting, greeting, calendar, quiz, hangout }, users)
        if (ai) {
            Object.assign(replacements, {
                title: `GREETER-AI (things to do next)`,
            })
        } else if (greeting) {
            Object.assign(replacements, {
                title: `greet u/${users[0]}`,
            })
        } else if (meeting && users.length === 2) {
            const { item } = await greeter.model.get_meet('site', ...users)
            console.debug('[greeter]', item.icon_url)
            Object.assign(replacements, {
                title: `when ${users[0]} and ${users[1]} met`,
                ...(item.icon_url ? { icon: item.icon_url } : {}),
            })
        } else if (meeting && users.length === 1) {
            Object.assign(replacements, {
                title: `meet u/${users[0]}`,
            })
        } else if (calendar && users.length === 1) {
            Object.assign(replacements, {
                title: `${users[0]}'s calendar`,
            })
        } else if (quiz && users.length === 2) {
            Object.assign(replacements, {
                title: `${users[0]} & ${users[1]}'s quiz`,
            })
        } else if (summary && users.length === 1) {
            Object.assign(replacements, {
                title: `${users[0]}'s summary`,
            })
        } else if (hangout) {
            if (users.length > 0) {
                const { item } = await greeter.model.get_hangout('site', users[0])
                Object.assign(replacements, {
                    title: item.title ? `${item.title} (hangout)` : item.location ? `hangout at ${item.location}` : 'hangout',
                    ...(item.icon_url ? { icon: item.icon_url } : {}),
                })
            } else {
                Object.assign(replacements, {
                    title: 'new hangout',
                })
            }
        }
    }
    else if (page === 'u' || page === 'profile') {
        const url_search_str = req.url.split(page === 'u' ? '/u' : '/profile')[1]
        const user = url_search_str.split('/').filter(x => x && !([]as string[]).some(y => y.includes(x))).find(truthy) || req.user
        console.debug('[u] url parsed:', { user }, req.url)
        if (user) {
            const profile_item = await profile.model._get(user)
            Object.assign(replacements, {
                title: `u/${user}'s profile on freshman.dev`,
                ...(profile_item.icon_url?{icon:profile_item.icon_url}:{}),
            })
        }
    }
    else if (page === 'invite') {
        const invite = req.url.split('/invite/')[1]?.split('/')[0]
        console.debug('[parser:invite]', { invite })
        const { user, profile } = await get_friend_link('site', invite)
        if (user) {
            Object.assign(replacements, {
                title: `friend ${user} on freshman.dev!`,
                ...(profile.icon_url?{icon:profile.icon_url}:{}),
            })
        }
    }
    else if (page === 'chat') {
        const url_search_str = req.url.split('/chat')[1]
        const user = url_search_str.split('/').filter(x => x && !([]as string[]).some(y => y.includes(x))).find(truthy) || req.user
        console.debug('[chat] url parsed:', {}, user)
        if (user) {
            const profile_item = await profile.model._get(user)
            Object.assign(replacements, {
                title: `chat with ${user}`,
                ...(profile_item.icon_url?{icon:profile_item.icon_url}:{}),
            })
        }
    }
    else if (page === 'capitals' || page === 'lettercomb') {
        const url_search_str = req.url.split(page === 'capitals' ? '/capitals' : '/lettercomb')[1]
        const parts = url_search_str.split('/').filter(truthy)
        const stats = parts[0] === 'stats' && parts.length === 2
        const challenge = parts[0] === 'new' && parts.length === 2
        const game = !stats && parts.length === 1
        const menu = parts.length === 0
        const id = game && parts[0]
        const page_id = (stats || challenge) && parts[1]
        console.debug('[capitals] url parsed:', { menu, game, id, stats, challenge, page_id })
        // if (menu) {
        //     Object.assign(replacements, {
        //         title: `capitals`,
        //     })
        // } else if (game) {
        //     if (id === 'local') {
        //         Object.assign(replacements, {
        //             title: `local capitals game`,
        //         })
        //     } else {
        //         const info = await capitals.model._info(id)||{}
        //         const users = capitals.model.user_ids(info)
        //         const n_users = users.length
        //         const name = [0, 0, 'capitals', 'tripitals', 0, 0, 'hexitals'][n_users]
        //         Object.assign(replacements, {
        //             title: `${n_users > 2?'vs ':''}${users.map(x => x || 'invite').join(n_users > 2 ? ' ':' vs ')} (${name})`,
        //         })
        //     }
        // } else if (stats) {
        //     Object.assign(replacements, {
        //         title: `u/${page_id}'s capitals stats`,
        //     })
        // } else if (challenge) {
        //     const { user } = await capitals.model.get_challenge_user('site', page_id)
        //     if (user) {
        //         Object.assign(replacements, {
        //             title: `challenge ${user} at capitals!`,
        //         })
        //     }
        // }
        if (menu) {
            Object.assign(replacements, {
                title: `lettercomb`,
            })
        } else if (game) {
            if (id === 'local') {
                Object.assign(replacements, {
                    title: `local lettercomb game`,
                })
            } else {
                const info = await capitals.model._info(id)||{}
                const users = capitals.model.user_ids(info)
                const n_users = users.length
                const name = [0, 0, 'lettercomb', 'tripitals', 0, 0, 'hexitals'][n_users]
                Object.assign(replacements, {
                    title: `${n_users > 2?'vs ':''}${users.map(x => x || 'invite').join(n_users > 2 ? ' ':' vs ')} (${name})`,
                })
            }
        } else if (stats) {
            Object.assign(replacements, {
                title: `u/${page_id}'s lettercomb stats`,
            })
        } else if (challenge) {
            const { user } = await capitals.model.get_challenge_user('site', page_id)
            if (user) {
                Object.assign(replacements, {
                    title: `challenge ${user} at lettercomb!`,
                })
            }
        }
    }
    else if (page === 'letterpress') {
        const url_search_str = req.url.split('/letterpress')[1]
        const parts = url_search_str.split('/').filter(truthy)
        const stats = parts[0] === 'stats' && parts.length === 2
        const challenge = parts[0] === 'new' && parts.length === 2
        const game = !stats && parts.length === 1
        const menu = parts.length === 0
        const id = game && parts[0]
        const page_id = (stats || challenge) && parts[1]
        console.debug('[letterpress] url parsed:', { menu, game, id, stats, challenge, page_id })
        if (menu) {
            Object.assign(replacements, {
                title: `letterpress`,
            })
        } else if (game) {
            if (id === 'local') {
                Object.assign(replacements, {
                    title: `local letterpress game`,
                })
            } else {
                const info = await letterpress.model._info(id)||{}
                const users = letterpress.model.user_ids(info)
                const name = [0, 0, 0, 'triplepress'][users.length] || 'letterpress'
                console.log('[letterpress]', {users,name})
                Object.assign(replacements, {
                    title: `${users.length > 2?'vs ':''}${users.map(user => user || 'invite').join(users.length > 2?' ':' vs ')} (${name})`,
                    ...(name === 'triplepress' ? { icon:'https://freshman.dev/raw/letterpress/triplepress.png' } : {}),
                })
            }
        } else if (stats) {
            Object.assign(replacements, {
                title: `u/${page_id}'s letterpress stats`,
            })
        } else if (challenge) {
            const { user } = await letterpress.model.get_challenge_user('site', page_id)
            if (user) {
                Object.assign(replacements, {
                    title: `challenge ${user} at letterpress!`,
                })
            }
        }
    }
    else if (page === 'quadbase') {
        const url_search_str = req.url.split('/quadbase')[1]
        const parts = url_search_str.split('/').filter(truthy)
        const stats = parts[0] === 'stats' && parts.length === 2
        const game = !stats && parts.length === 1
        const menu = parts.length === 0
        const id = game && parts[0]
        const user = stats && parts[1]
        console.debug('[quadbase] url parsed:', { menu, game, id, stats, user })
        if (menu) {
            Object.assign(replacements, {
                title: `quadbase`,
            })
        } else if (game) {
            if (id === 'local') {
                Object.assign(replacements, {
                    title: `local quadbase game`,
                })
            } else {
                const info = await quadbase.model._info(id)||{}
                Object.assign(replacements, {
                    title: `vs ${[info.p0,info.p1,info.p2,info.p3].map(x=>x||'invite').join(' ')} (quadbase)`,
                })
            }
        } else if (stats) {
            Object.assign(replacements, {
                title: `u/${user}'s quadbase stats`,
            })
        }
    }
    // else if (page === 'multipals') {
    //     const url_search_str = req.url.split('/multipals')[1]
    //     const parts = url_search_str.split('/').filter(truthy)
    //     const stats = parts[0] === 'stats' && parts.length === 2
    //     const game = !stats && parts.length === 1
    //     const menu = parts.length === 0
    //     const id = game && parts[0]
    //     const user = stats && parts[1]
    //     console.debug('[multipals] url parsed:', { menu, game, id, stats, user })
    //     if (menu) {
    //         Object.assign(replacements, {
    //             title: `multipals`,
    //         })
    //     } else if (game) {
    //         if (id === 'local') {
    //             Object.assign(replacements, {
    //                 title: `local multipals game`,
    //             })
    //         } else {
    //             const info = await multipals.model._info(id)||{}
    //             Object.assign(replacements, {
    //                 title: `${'p5' in info ? 'hexitals' : 'tripitals'} game #${id}`,
    //             })
    //         }
    //     } else if (stats) {
    //         Object.assign(replacements, {
    //             title: `u/${user}'s multipals stats`,
    //         })
    //     }
    // }
    else if (page === 'link-timer') {
        console.debug('[link-timer] url parsed:', {})
    }
    else if (page === 'donoboard') {
        const sponsors = get_sponsors().filter(x => x.name !== 'cyrus') as any
        let max_sponsor = sponsors[0]
        sponsors.slice(1).map(sponsor => {
            if (sponsor.slots > max_sponsor.slots) max_sponsor = sponsor
        })
        console.debug('[donoboard] url parsed:', req.url, { max_sponsor })
        Object.assign(replacements, {
            title: `/donoboard with ${max_sponsor.u ? `u/${max_sponsor.u}` : max_sponsor.name} in the lead`,
        })
    }
    else if (page === 'collector') {
        const url_search_str = req.url.split('/collector')[1]
        const [user, id] = url_search_str.split('/').filter(x => x)
        console.debug('[collector] url parsed:', url_search_str, user, id)
        if (user && id) {
            const { item } = await collector.model.get(user, id)
            // console.debug('[collector] item fetched', item)
            Object.assign(replacements, {
                title: `'${item.name}' by ${user}`,
            })
        }
    }
    else if (page === 'wordle') {
        if (req.url.includes('leaderboard')) {
            Object.assign(replacements, {
                title: 'Wordle solver leaderboard',
            })
        }
    }
    else if (page === 'light') {
        Object.assign(replacements, {
            title: '/light'+req.url.split('light').slice(1).join('light')
        })
    }
    else if (page === 'stream-pledge') {
        Object.assign(replacements, {
            title: '/stream-pledge'+req.url.split('stream-pledge').slice(1).join('stream-pledge')
        })

        const user = req.url.split('/stream-pledge')[1].replace('/', '')
        if (user) {
            Object.assign(replacements, {
                description: `pledge to watch ${user}'s new stream!`,
            })
        }
    }

    let html = indexRaw
    if (replacements) html = replaceTemplate(html, replacements)
    req.log('return', page, html.length)
    res.send(html)
});

// log errors
app.use((err, req, res, next) => {
    const now = new Date()
    console.error(
        String(now.getTime()),
        now.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            dateStyle: 'short',
            timeStyle: 'medium',
            hour12: false,
        }).replace(',', ''), err);
    next(err);
});

// run one-time script on deploy
let runjs:any = false
try {
    runjs = fs.readFileSync('server/run.js').toString().split('\n')
        .map(x => x.trim())
        .filter(x => x && x.slice(0,2) !== '//')
        .join('\n')
} catch { /* pass */ }
if (runjs) {
    db.queueInit(() => {
        console.log('run one-time startup script')
        require('./run')
        if (isProduction()) {
            console.log('clear one-time startup script')
            fs.writeFileSync('server/run-prev.js', runjs)
            fs.writeFileSync('server/run.js', '')
        }
    })
} else {
    console.log('one-time startup script is empty')
}

}