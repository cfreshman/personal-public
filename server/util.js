import path from 'node:path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import express from 'express';
import db from './db';
import { ObjectId } from 'mongodb';

export const named_log = (name) => (...x) => console.log(`[${name}]`, ...x)

const polyfill = (target, methods) => {
    Object.entries(methods).map(([k, v]) => {
        if (!target[k]) target[k] = v
    })
}
polyfill(Object, {
    hasOwn: (object, key) => object.hasOwnProperty(key),
    clone: object => object && (
      Object.hasOwn(object, 'clone')
      ? object.clone()
      : Object.deserialize(Object.serialize(object))),
})

export const basedir = () => path.dirname(fileURLToPath(import.meta.url))
export const staticFolder = process.env.NODE_ENV === 'development' ? 'public' : 'build'
export const staticPath = path.join(basedir(), '../' + staticFolder)
export const require = createRequire(import.meta.url)

export function stringifyEquals(a, b) {
    return JSON.stringify(a) === JSON.stringify(b)
}

export function update(target, source) {
    for (let prop in source) {
        if (prop in target) {
            target[prop] = source[prop];
        }
    }
}
export function fill(target, source) {
    for (let prop in source) {
        if (target[prop] === undefined) {
            target[prop] = source[prop]
        }
    }
}
export function validate(value, reason, validator=truthy) {
    if (!validator(value)) throw reason
    return value
}

export const merge = (...os) => {
    const result = {}
    os.map(o => {
        Object.keys(o).map(k => {
            if (o[k] === undefined) delete result[k]
            else result[k] = (typeof(result[k]) === 'object' && typeof(o[k]) === 'object' && !Array.isArray(o[k])) ? merge(result[k], o[k]) : o[k]
        })
    })
    return result
}
export const transmute = (o, f) => {
    return Object.assign({}, ...Object.keys(o).map(k => (typeof(o[k]) === 'object' && !Array.isArray(o[k])) ? { [k]: transmute(o[k], f) } : f(k, o[k])))
}
export const deletion = (o={}) => transmute(o, (k,v)=> v ? { [k]: undefined } : {})

export function squash(objList) {
    return Object.assign({}, ...objList);
}
export function pick(obj, spaceDelimitedProps) {
    if (Array.isArray(obj)) return obj.map(x => pick(x, spaceDelimitedProps))
    if (typeof(obj) === 'string') return x => pick(x, obj)
    return spaceDelimitedProps.split(' ').reduce((a, v) => {
        if (Object.hasOwn(obj, v)) a[v] = obj[v]
        return a
    }, {})
}
export function unpick(obj, spaceDelimitedProps) {
    if (Array.isArray(obj)) return obj.map(x => unpick(x, spaceDelimitedProps))
    const unpicked = { ...obj }
    spaceDelimitedProps.split(' ').map(prop => delete unpicked[prop])
    return unpicked
}
export function entryMap(obj, func) {
    return squash(Object.entries(obj).map(e => ({ [e[0]]: func(e[1]) }) ))
}
export function remove(arr, item) {
    return arr.filter(x => x !== item);
    // let copy = arr.slice();
    // let index = copy.indexOf(item);
    // if (index > -1) copy.splice(index, 1);
    // return copy;
}
export function range(n_or_start, end=undefined, step=1) {
    if (end === undefined) {
        end = n_or_start
        n_or_start = 0
    }
    return Array.from({ length: Math.floor((end - n_or_start) / step) }).map((_, i) => n_or_start + i*step)
}
export function group(array, n) {
    let i = 0
    let groups = []
    while (i < array.length) {
        groups.push(array.slice(i, i+n))
        i += n
    }
    return groups
}
export const exists = x => x !== undefined

export const sleep = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))

export const hash = str => crypto.createHmac('sha256', 'freshman.dev').update(str).digest('hex')

/**
 * randi: Random integer between [0, n)
 */
export const randi = (n) => Math.floor(Math.random() * n);
export const sample = (arr) => arr[randi(arr.length)]

/**
* randAlphanum: Random string of alphanumeric characters of length n
*/
const alphanum = 'qwertyuiopasdfghjklzxcvbnm1234567890QWERTYUIOPASDFGHJKLZXCVBNM';
export function randAlphanum(n, avoid=undefined) {
  let str;
  do {
    str = ''
    for (let i = 0; i < n; i++) {
      str += alphanum[randi(alphanum.length)];
    }
  } while (avoid?.includes(str))
  return str;
}


export function genGetAll(name) {
    return async () => db.collection(name).find().toArray();
}

export function genGet(name) {
    return async (id) => db.collection(name).findOne({ _id: ObjectId(id) });
}

export function genRemove(name) {
    return async (id) => db.collection(name).deleteOne({ _id: ObjectId(id) });
}

const _handle = (err, res) => {
    const t =
        new Date().toISOString().replace(/[^-]+-(.+):[^:]+$/, '$1').replace('T', ' ')
    console.error('[ERROR]', t, err)
    // process.env.NODE_ENV === 'development'
    //     ? console.error('[ERROR]', t, err)
    //     : console.error('[ERROR]', t, err.status, err.message ?? err)
    if (!err.status) err = HttpError(500, err.message ?? err)
    res.status(err.status).json({ error: err.message })
}
export function jsonRes(func) {
    return (req, res) => {
        try {
            func(req, res)
                .then(pass)
                .then(data => {
                    // console.log(data)
                    try {
                        const query = Object.fromEntries(new URLSearchParams(req.query))
                        if (query.resolve) req.resolve = query.resolve.split(',')
                        if (req.resolve?.length) {
                            const queried = {}
                            while (req.resolve?.length) {
                                const query = req.resolve.shift()
                                let from = data
                                const parts = query.split('.')
                                while (parts.length) from = from[parts.shift()]
                                queried[query] = from
                            }
                            data = queried
                        }
                    } catch {} // bad query, return entire object
                    res.json(data)
                })
                .catch(e => _handle(e, res))
        } catch (e) {
            _handle(e, res)
        }
    }
}
export const J = jsonRes
export function errorRes(error, res=undefined) {
    if (res) {
        try {
            throw error
        } catch (e) {
            _handle(e, res)
        }
    } else {
        return (req, res) => {
            try {
                throw error
            } catch (e) {
                _handle(e, res)
            }
        }
    }
}
export const E = errorRes

export function requireUser(rq) {
    if (!rq.user) throw 'user not signed in';
    return rq.user
}
export const U = requireUser

export function parseParam(rq, param) {
    if (param.includes(' ')) {
        param = param.split(' ')
        let result
        while (result === undefined && param.length) {
            result = result ?? parseParam(rq, param.shift())
        }
        return result
    } else {
        return (
            Object.hasOwn(rq.params, param) 
            ? rq.params[param] 
            : Object.hasOwn(rq.query, param) 
            ? rq.query[param]
            : Object.hasOwn(rq.body, param)
            ? rq.body[param]
            : undefined
        )
    }
}
export const P = parseParam
export class request_parser {
    static parse(rq, params=undefined) {
        const param_list = params === undefined ? [rq.params, rq.query, rq.body].map(Object.keys).flatMap(pass) : list(params)
        return Object.fromEntries(param_list.map(x => [x, parseParam(rq, x)]))
    }
}
export const rqp = request_parser
export const OP = request_parser.parse

export function genModelRoutes(model, routes) {
    if (routes === undefined) routes = express.Router();

    // route configs
    [{
        method: 'get', path: '/',
        modelFunc: req => (model.getAll || genGetAll(model.name))()
    }, {
        method: 'get', path: '/:id',
        modelFunc: req => (model.get || genGet(model.name))(req.params.id)
    }, {
        method: 'post', path: '/',
        modelFunc: req => model.create(req.body)
    }, {
        method: 'put', path: '/:id',
        modelFunc: req => model.update(req.params.id, req.body)
    }, {
        method: 'delete', path: '/:id',
        modelFunc: req => (model.remove || genRemove(model.name))(req.params.id)
    }].forEach(config => {
        routes[config.method](config.path, jsonRes(config.modelFunc));
    });

    return routes;
}

export function HttpError(status, message) {
    const error = new Error(message)
    error.status = status
    return error
}


import https from 'https';
import _followRedirects from 'follow-redirects';
const { https: httpsRedirect } = _followRedirects;
import qs from 'querystring';
let n_fetches = 0
export const fetch = (url, options={
    redirects: true, method: 'GET', headers: {}, ms: undefined,
    query: undefined, json: undefined, form: undefined, body: undefined
}) => {
    return new Promise((resolve, reject) => {
        const fetch_id = n_fetches++
        let { method='GET', headers={} } = options
        if (options.query) url += '?'+qs.stringify(squash(Object.entries(options.query).map(([k, v]) => v !== undefined ? { [k]: v } : {})))
        const contentType =
            options.form ? 'application/x-www-form-urlencoded' :
            options.json ? 'application/json' :
            undefined
        // if (contentType) headers['Content-Type'] = contentType
        headers = {
            // 'Accept': '*/*',
            // 'User-Agent': 'PostmanRuntime/7.26.10',
            ...(contentType ? { 'Content-Type': contentType } : {}),
            // 'User-Agent': 'Mozilla/5.0',
            'User-Agent': /* gross */ url.includes('instagram') ? 'PostmanRuntime/7.36.3' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            // 'User-Agent': 'PostmanRuntime/7.36.3',
            'Accept': '*/*',
            // 'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            ...headers,
        }
        console.log(method, `(${fetch_id})`, url,
            // JSON.stringify(headers, 0, 2)
            )
        try {
            const auth_req = (options.redirects ? httpsRedirect : https).request(url, {
                method,
                ...(options.ms ? { timeout: options.ms } : {}),
                headers,
                // mode: 'no-cors', followRedirects: true,
            }, auth_res => {
                console.log(`STATUS (${fetch_id})`, auth_res.statusCode)
                // console.log('HEADERS:', auth_res.headers)
                // if (auth_res.statusCode !== 200) console.log('HEADERS:', auth_res.headers)
                const chunks = []
                auth_res.on('data', x => chunks.push(x))
                auth_res.on('end', () => {
                    let body = Buffer.concat(chunks).toString()
                    try {
                        body = auth_res.headers['content-type']?.includes('application/json')
                            ? JSON.parse(body)
                            : body
                        if (auth_res.statusCode !== 200) body && console.log('=>', body)
                        // console.log('BODY:', body)
                        resolve(Object.assign(auth_res, {
                            headers: auth_res.headers,
                            body,
                        }))
                    } catch (e) {
                        // console.debug(body)
                        reject(e)
                    }
                })
            })
            auth_req.on('error', e => {
                // console.error(`ERROR (${fetch_id})`, e.message)
                console.error(`ERROR (${fetch_id})`, e.message.slice(0, 30))
                reject(e)
            })
            let body = options.body
            if (options.json) body = JSON.stringify(options.json)
            if (options.form) body = qs.stringify(options.form)
            if (body) auth_req.write(body)
            auth_req.end()
            // console.log(body)
        } catch (e) {
            console.error(`ERROR (${fetch_id})`, e.message.slice(0, 30))
            reject(e)
        }
    })
}

/**
 * utils for set-like objects
 */
export const setSplit = (str, sep=' ') => new Set(str?.split(sep))
export const set = data => {
    if (typeof data === 'string') return setSplit(data)
    return new Set(data)
}

export const list = (data, sep=' ') => {
    if (typeof data === 'string') return data.split(sep)
    return new Array(data)
}


// export const isDevelopment = () => process.env.NODE_ENV !== 'production'
// export const isProduction = () => process.env.NODE_ENV === 'production'
export const isProduction = () => basedir().includes('/var/www/')
export const isDevelopment = () => !isProduction()
export const truthy = x=>x
export const pass = x=>x
export const apply = f=>f()
export const resolve = x => typeof x === 'function' ? apply(x) : pass(x)
export const defer = (f=()=>{}, ms=0) => new Promise(r => setTimeout(_=> r(f && f()), ms))
export const debug = name => (...args) => globalThis.console.debug(`[${name.toUpperCase()}]${this?.LOG ?? ''}`, ...args)
export const debug_prefix = async (prefix, func) => {
    if (this) {
        const prev = this.LOG
        this.LOG = [prev ?? '', prefix].join(' ')
    }
    await func()
    if (this) this.LOG = prev
}



export function toYearMonthDay(date) {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60 * 1000)).toISOString().slice(0, 10)
}

// split out regex matches, e.g. abcdbce => a bc d bc e
export const tokenize = (string, regex) => {
    const splits = [0]
    regex = new RegExp(regex, regex.flags.replace('g', '')+'g')
    const matches = Array.from(string.matchAll(regex))
    matches.map(match => splits.push(match.index, match.index + match[0].length))
    splits.push(string.length)
    splits.sort((a, b) => a - b)
    const parts = splits.slice(1).map((s, i) => string.slice(splits[i], s)).filter(s => s)
    return parts
}


const linkRegex =
  /(^|[^.\w\d\-_:/?=&%#@+\n])((?:https?:\/\/)?(?:(?:(?:[\w\d-]+\.)+\w{1,}|localhost)(?:[\w\d\-_:/?=&%#@+.]{1,}))|(?:\d{1,3}\.){3}\d+)(\.(?:! ))?/im
const internalLinkRegex =
  /(^|[^.\w\d\-_:/?=&%#@+\n])([/?](?:[\w\d\-_:/?=&%#@+.]{1,}[\w\d\-_:/?=&%#@+.]{1,}))(\.(?:! ))?/im
const OrRegExp = (a, b) => {
  return new RegExp('(?:' + a.source + ')|(?:' + b.source + ')', [...new Set(a.flags + b.flags)].join(''))
}
const totalLinkRegex = OrRegExp(linkRegex, internalLinkRegex)
export const extractLinks = x => Array.from(x.matchAll(totalLinkRegex)).map(x => x[2])
const _convertPart = (part, i, html=false) => {
    const matches = [linkRegex.exec(part), internalLinkRegex.exec(part)]
    const m_i = matches.findIndex(truthy)
    const match = matches[m_i]
    const id = randAlphanum(16)
    const href = !match ? part : ((m_i === 1 ? '' : 'http://') + match[2]).replace(/^http:\/\/http/, 'http')
    return `<div id='render-${id}'><script>
    {
        console.debug('render ${id}')
        const _temp = document.createElement('div')
        _temp.innerHTML = \`<span style="white-space:pre-wrap"></span>\`
        const contents = _temp.children[0]
        ${match
        ?
        `
        contents.innerHTML = \`${match[1]??''}<a></a>${match[3]??''}\`
        const a = contents.querySelector('a')
        a.textContent = decodeURIComponent("${encodeURIComponent(match[2].trim())}")
        a.href = decodeURIComponent("${encodeURIComponent(href)}")`
        :
        `
        contents.textContent = decodeURIComponent("${encodeURIComponent(part)}")`}
        document.getElementById('render-${id}').outerHTML = contents.outerHTML
    }
    </script></div>`
}
export const convertLinks = str => {
    if (!str) return ''
    if (typeof(str) === 'object') return str
    // determine indices to split links into separate parts
    const parts = tokenize(str, totalLinkRegex)
    return parts.map((part, i) => _convertPart(part, i)).join('')
}
