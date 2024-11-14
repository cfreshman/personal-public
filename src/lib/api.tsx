import { sha256 } from './encrypt'
import { addStyle } from './hooks'
import { message } from './message'
import { store } from './store'
import { trigger } from './trigger'
import { JSX, fields, printable } from './types'
import { defer, dev, interval, pick, server } from './util'


const { named_log, set } = window as any
const log = named_log('api')

const host = server

const AUTH_COOKIE = 'loginAuth'
const storedAuth = store.get(AUTH_COOKIE)
const auth = trigger.implicit<{
    user?:string, token?:string, dropdown?:boolean|'signup'|'email', hidden?:boolean, basic?:boolean, expand?:boolean, popup?:boolean|string, conditions?:{ cn?:any, pptc?:any, is_21?:any }
}>(storedAuth ?? {})
auth.add(value => (value.user || value.conditions?.cn || storedAuth) && store.set(AUTH_COOKIE, pick(value, 'user token conditions')))

let connection_error_instances = {}
type request = (path, body?, extra?: { ms?: number, headers?: any }) => Promise<any>
const api = window['api'] = {
    host,
    ...(Object.fromEntries([
        { service: 'get', method: 'GET', options: false },
        { service: 'post', method: 'POST', options: true },
        { service: 'put', method: 'PUT', options: true },
        { service: 'patch', method: 'PATCH', options: true },
        { service: 'delete', method: 'DELETE', options: false },
    
        // CRUD naming
        { service: 'create', method: 'POST', options: true },
        { service: 'read', method: 'GET', options: false },
        { service: 'update', method: 'PUT', options: true },
        // delete

        { service: 'open', method: 'OPEN', options: false }, // open get in new tab
    ].map(({ service, method, options }) => [service, (path, body={}, extra: { ms?: number, headers?: any }={ headers: [] }) => {
        // console.debug(path, auth.user)
        if (options) {
            extra.headers = {
                'Content-Type': 'application/json',
                ...extra.headers,
            }
        } else extra = body
        if (body.form) {
            extra.headers['Content-Type'] = 'application/x-www-form-urlencoded'
            body = body.form
        }

        const req: any = {
            method,
            headers: {
                'X-Freshman-Auth-User': auth.get().user,
                'X-Freshman-Auth-Token': auth.get().token,
                ...extra.headers,
            },
        }
        if (options) {
            req.body = extra.headers['Content-Type'] === 'application/json'
                ? JSON.stringify(body)
                : body
        }

        if (extra.ms) {
            const controller = new AbortController()
            setTimeout(() => controller.abort(), extra.ms)
            req.signal = controller.signal
        }

        // const url = `${host}/api${path.replace(/^\/*api\/*/, '/')}`
        const url = host + '/api' + path.replace(/^\/api/, '').replace(/^\/*/, '/')
        console.debug('API', auth.user, method, url,
            // JSON.pretty(req.headers),
            // req.body
            )
        if (method === 'OPEN') return Promise.resolve(open(url, '_blank') &&  undefined)
        const url_origin = new URL(url).origin
        return new Promise((resolve, reject) => {
            fetch(url, req)
                .then(async res => {
                    if (req.headers['Content-Type']?.includes('application/zip')) {
                        return resolve(res)
                    }
                    if (res.headers.get('Content-Type')?.includes('application/octet-stream')) {
                        return res.text().then(data => resolve(data))
                    }
                    // if (!res.headers.get('Content-Type').includes('application/json')) {
                    //     throw await res.text()
                    // }
                    let json, text = await res.text()
                    try {
                        json = JSON.parse(text)
                    } catch {}

                    delete connection_error_instances[url_origin]
                    return json ? Promise.resolve(json).then(data => {
                        // if (typeof data === 'object') {
                        //     data.rror = data.rror || data.error || data
                        // }
                        if (data.error) {
                            console.debug('api error', data)
                            reject(data)
                        } else if (res.ok) {
                            if (data.user && data.token) {
                                // setAuth(data.user, data.token)
                                auth.set({
                                    ...auth.get(),
                                    ...pick(data, 'user token conditions')
                                })
                            }
                            resolve(data)
                        } else {
                            const msg = `server error, failed ${service} ${path}: ${data.message}`
                            console.debug(msg)
                            reject(msg)
                        }
                    }) : resolve(text)
                })
                .catch(err => {
                    console.error(err)
                    const msg = 'connection error: ' + (err.message ?? err)
                    
                    if (!connection_error_instances[url_origin]) {
                        connection_error_instances[url_origin] = true
                        message.trigger({
                            text: <>
                                ◡̈<br/>
                                It looks like you're having connection issues.<br/>
                                Try waiting 30s, then maybe message me <a
                                href={`https://twitter.com/messages/compose?recipient_id=1794362902888992768&text=${encodeURIComponent(location.href)}`}
                                >@__freshman</a>/Twitter <a
                                href='mailto:cyrus@freshman.dev'
                                >cyrus@freshman.dev</a>/email
                            </>,
                            id: 'connection_error',
                            delete: 'connection_error',
                            ms: 30_000,
                        })
                        interval(control => {
                            api.get('/ip').then(ip => {
                                control.interrupt()
                                message.trigger({
                                    text: <>
                                        reconnected ◡̈
                                    </>,
                                    id: 'reconnected',
                                    delete: 'connection_error reconnected',
                                    ms: 1_500,
                                })
                            })
                        }, 1_000)
                    }
                    
                    // MessageUtil.post({
                    //     text: 'warning: server offline – you might want to message me twitter.com/__freshman',
                    //     id: 'offline',
                    //     delete: 'offline online',
                    // })
                    reject(msg)
                })
        })
    }])) as {
        get:request, post:request, put:request, patch:request, delete:request, create:request, read:request, update:request, open:request
    }),
    login: (user, pass) => signin('/login', user, pass),
    token: (user, token) => signin('/login/token', user, undefined, token),
    signup: async (user, pass, options) => {
        // fetch list of 10000 most common passwords
        if (!dev) {
            const common_passwords_string = await api.external(`/raw/auth/password-10000.txt`).then(r=>r.text())
            const common_passwords_set = set(common_passwords_string, '\n')
            if (common_passwords_set.has(pass)) {
                throw 'password too common'
            }
        }
        return signin('/login/signup', user, pass, undefined, options)
    },
    logout: () => setAuth('', ''),
    format: (url, options: { query? } = {}) => {
        let query = ''
        if (options.query) {
            query = '?' + toForm(options.query)
        }
        return encodeURI(url) + query
    },
    external: (url, method='GET', options: { query?, headers?, form?, json?, nocors?: boolean, target?:string } = {}) => {
        const formatted = api.format(url, options)
        const headers = options.headers || {}
        if (options.json) headers['Content-Type'] = 'application/json'
        if (options.form) headers['Content-Type'] = 'application/x-www-form-urlencoded'
        const init = {
            mode: options.nocors ? 'no-cors' as RequestMode : undefined,
            method,
            headers: headers,
            body: options.json !== undefined
            ? JSON.stringify(options.json)
            : options.form
                ? toForm(options.form)
                : undefined
        }
        console.debug('API EXTERNAL', method, formatted, init)
        if (method === 'OPEN') return Promise.resolve(open(formatted, top !== window ? '_blank' : options.target || '_blank') && undefined)
        return fetch(formatted, init)
        .then(res => {
            if (res.headers.get('Content-Type')?.includes('application/json')) {
                return res.json().then(data => {
                    // data.rror = data.rror || data.error || data
                    if (data.error) {
                        console.debug('api error:', data)
                        throw data
                    } else if (res.ok) {
                        return data
                    } else {
                        console.debug('server error:', data)
                        throw data
                    }
                })
            } else return res
        })
    },
}

// auth-related functions
const verify = (user, token) => api.post('/login/verify', { user, token, tz: -new Date().getTimezoneOffset()/60 })
const setAuth = (user, token, dropdown?) => auth.set({ ...auth, user, token, dropdown, ...(user ? {} : { conditions: undefined }) })
auth.add((value, prev) => {
    console.debug('AUTH', value.user, prev)
    value.user && verify(value.user, value.token).then(res => res.ok || api.logout())
    // if (value.user !== prev?.value.user) defer(() => auth.set({...auth.get(), dropdown:false}), 100)
}, true)
const signin = (path, user, pass, token=undefined, options=undefined) => sha256(pass).then(hash => api.post(path, {
    user,
    pass: hash,
    token,
    info: {
        href: location.href,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    options,
}).then(response => {
    log('signin', response)
    const new_auth = { ...auth.get(), ...response, dropdown:false }
    auth.set(new_auth)
    return new_auth
}))

const toForm = (data: fields<printable>) => {
    return Object.entries(data).map(e => encodeURIComponent(e[0]) + '=' + encodeURIComponent(e[1])).join('&')
}

// api.get('user_id_color').then(id_color => addStyle(`
// :root {
//   --id-color: ${id_color};
// }
// `))

export { auth }
export default api
if (dev) window['api'] = api
