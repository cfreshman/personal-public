// common.js @ https://freshman.dev/lib/2/ https://freshman.dev/copyright.js
{
    window.named_log = (name) => (...x) => console.debug(`[${name}]`, ...x)
    Object.defineProperties(window, {
        c: {
            get: () => console.clear()
        },
    })

    window.pass = x=>x
    window.exists = x=>x!==undefined
    window.truthy = x=>!!x
    window.apply = (f, ...x) => typeof f === 'function' ? f(...x) : f
    window.compose = (...fs) => (...x) => fs.slice(1).reduce((v, fs) => f(v), funcs[0] && funcs[0](...args))
    window.pipe = (value, ...funcs) => compose(...funcs)(value)
    window.fs = (value) => {
        return {
            pipe: (f) => fs(f(value)),
            with(f) { f(value); return this },
            value,
        }
    }
    window.fnot = (f) => !apply(f)

    window.list = (data=undefined, seperator=' ') => typeof(data) === 'string' ? data.split(seperator) : Array.from(data)
    window.set = (data=undefined, seperator=' ') => new Set(list(data, seperator))
    window.object = (data=undefined, seperator=' ') => Object.fromEntries(list(data, seperator).map(x => [x, undefined]))

    window.Q = (l, s) => s ? l.querySelector(s) : document.querySelector(l)
    window.QQ = (l, s) => list(s ? l.querySelectorAll(s) : document.querySelectorAll(l))
    window.on = (l, es, f, o=undefined) => (
        (ls, es) => ls.map(l => es.map(e => l.addEventListener(e, f, o)))
        )(
            [l].flatMap(pass).flatMap(li => typeof(li) === 'string' ? QQ(li) : [li]),
            typeof(es) === 'string' ? es.split(' ') : es
        )
    window.node = (html='<div></div>') => (x => {
        x.innerHTML = html
        return x.children[0]
    })(document.createElement('div'))

    window.range = (a,o,e=1) => Array.from({ length: Math.floor((o===undefined?a:o-a)/e) }).map((_, i) => i*e + (o===undefined?0:a))
    window.merge = (...os) => {
        const result = {}
        os.map(o => {
            Object.keys(o).map(k => {
                if (o[k] === undefined) delete result[k]
                else result[k] = (typeof(result[k]) === 'object' && typeof(o[k]) === 'object' && !Array.isArray(o[k])) ? merge(result[k], o[k]) : o[k]
            })
        })
        return result
    }
    window.transmute = (o, O, X=undefined) => merge({}, ...Object.keys(o).map(k => (typeof(o[k]) === 'object' && !Array.isArray(o[k])) ? { [k]: transmute(o[k], f) } : X ? { [k]: X(o[k]) } : O(k, o[k])))
    window.deletion = (o={}) => transmute(o, (k,v)=> v ? { [k]: undefined } : {})

    window.defer = (f=()=>{}, ms=0) => {
        let resolve, reject
        const p = new Promise((rs, rj) => { resolve = rs, reject = rj})
        setTimeout(async () => resolve(typeof f === 'function' ? f() : f), ms)
        return Object.assign(p, {
            interrupt: reject => rj(reject),
        })
    }
    window.sleep = (ms) => defer(false, ms)

    window.string = {
        digits: range(10).join(''),
        lower: range(26).map(i => String.fromCharCode(i + 'a'.charCodeAt(0))).join(''),
        get upper() { return string.lower.toUpperCase() },

        get lowerhex() { return string.digits + string.lower.slice(0, 6) },
        get upperhex() { return string.digits + string.upper.slice(0, 6) },
        get lowernum() { return string.lower + string.digits },
        get uppernum() { return string.upper + string.digits },

        get alpha() { return string.lower },
        get alphanum() { return string.alpha + string.digits },
        get hex() { return string.digits + string.alpha.slice(0, 6) },
        
        get anycase() { return string.lower + string.upper },
        get anycasenum() { return string.anycase + string.digits },
        get base62() { return string.digits + string.anycase },

        prefix(...x) {
            if (x.length === 1) return x[0]
            if (x.length === 2) {
                for (let i = 0;; i++) {
                    if (x[0][i] !== x[1][i]) return x[0].slice(0, i)
                    if (i === x[0].length || i === x[1].length) return x[0]
                }
            }
            return x.reduce((p,x)=>string.prefix(p, x))
        }
    }
    window.rand = merge({
        i: (a,o,e=1) => (i => i*e + (o===undefined?0:a))(Math.floor(Math.random() * ((o===undefined?a:o-a)/e))),
        sample: (ar) => ar[rand.i(ar.length)],
    }, transmute(string, false, x => (n=1) => range(n).map(i => rand.sample(x)).join('')), {
        hex: (n) => Math.floor(Math.random() * Math.pow(16, n)).toString(16).padStart(n, '0'),
    })
    window.base62 = x => {
        x = (typeof x === 'number') ? BigInt(x) : [...new Uint8Array(new TextEncoder().encode(x.toString()))].reverse().reduce(([power, sum],x)=>{
            sum += BigInt(x) * power
            power *= 62n
            return [power, sum]
        }, [1n, 0n])[1]
        for (let s = '';; x = x / 62n) { s = string.base62[x % 62n] + s; if (x < 62n) return s }
    }
    window.sha256 = async (str) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(x => [...new Uint8Array(x)].map(b=>b.toString(16).padStart(2, '0')).join(''))
    window.id = async (str) => location.port ? base62(str.slice(str.length/2) + str.slice(0, str.length/2)) : sha256(str)

    window.auth = { user:false, token:undefined }
    window.api = (()  => {
        const origin = location.origin.replace(/:\d+/, ':5050')
        const api = {
            get:    {},
            post:   { body: true },
            put:    { body: true },
            delete: {},

            catch: ()=>{},
        }
        const _request = (url, req) => 
            fetch(url, req)
            .then(async res => ({
                'application/json': () => res.json().then(data => {
                    if (data.error) {
                        console.debug('api error', data.error)
                        throw data
                    } else if (res.ok) {
                        console.debug('ok', url, data)
                        const { user, token } = data
                        if (user !== undefined) Object.assign(auth, { user, token })
                        return data
                    } else {
                        data.error = `failed ${service} ${path}: ${data.message}`
                        console.debug('server error', data.error)
                        throw data
                    }
                }),
            }[(res.headers.get('Content-Type') || 'application/json').split(';')[0]] || (()=>res))())
            .catch(e => {
                const error = e.error ?? e.message ?? e
                console.debug('connection error', error)
                
                if (api.catch) api.catch({ error, url })
                else throw { error }
            })
            .finally(_=>console.debug(url, req))
        Object.entries(api).map(([service, { method=service.toUpperCase(), body:has_body=false }]) => api[service] = (url, body={}, options={}) => {
            if (!has_body) options = body
            const controller = new AbortController()
            options.ms && setTimeout(() => controller.abort(), options.ms || 61_000)
            return _request(origin + url.replace(/^\/*/, '/'), {
                method,
                headers: {
                    'Content-Type': has_body ? 'application/json' : undefined,
                    'X-Freshman-Auth-User': auth.user,
                    'X-Freshman-Auth-Token': auth.token,
                },
                signal: controller.signal,
                body: has_body ? JSON.stringify(body) : undefined,
            })
        })
        return api
    })()

    setTimeout(() => {
        QQ('textarea.resize').map(t => {
            t.resize = () => {
                const _temp = node('<div></div>')
                _temp.style.whiteSpace = t.style.whiteSpace = 'pre-wrap'
                _temp.style.wordBreak = t.style.wordBreak = 'break-word'

                // TODO don't
                t.parentElement.style.width = (t.parentElement.parentElement.getBoundingClientRect().width - (t.parentElement.getBoundingClientRect().x - t.parentElement.parentElement.getBoundingClientRect().x))+'px'
                t.style.width = '-webkit-fill-available'
                const rect = t.getBoundingClientRect()
                const { fontFamily, fontSize, lineHeight, padding, border, boxSizing, wordBreak } = getComputedStyle(t)
                Object.assign(_temp.style, {
                    width: rect.width+'px',
                    fontFamily, fontSize, lineHeight, padding, border, boxSizing, wordBreak
                })
                
                // TODO don't
                _temp.textContent = (t.value || ' ') + '-'.repeat(complete.textContent.length)

                document.body.append(_temp)
                t.style.height = _temp.getBoundingClientRect().height+'px'
                t.parentElement.style.width = rect.width+'px'
                _temp.remove()
            }
            t.resize()
        })
        on('textarea.resize', 'input', e => e.target.resize())
    })

    window.copy = async (text) => navigator.clipboard.writeText(text)
    window.download = async (text, name='download.txt') => {
        const href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
        const element = node(`<a download="${name}" href=${href}></a>`)
        element.click()
        return element
    }
    window.tone = (pitch, volume, ms) =>
        fs(
            new OscillatorNode(actx, { frequency: pitch })
        )
        .with(x=>x
            .connect(new GainNode(actx, { gain: volume }))
            .connect(actx.destination)
        )
        .then(x => merge(x, {
            _start: x.start.bind(x),
            start: (...a) => {
                x._start(...a)
                setTimeout(() => x.stop(), ms)
            },
        }))
        .value
    window.qr = (text, size=128) => {
        // TODO QR code implementation
        return `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${text}&choe=UTF-8`
    }

    // [WIP] (please ignore)
    // const _fetch = window.fetch
    // window.unproto = (url) => {
    //     const proto = new URL(url).protocol
    //     console.debug('unproto', {proto,url})
    //     const special_case = {
    //         // TODO better, bad rate limits
    //         'github-tree:': (proto_url) => {
    //             const url = proto_url.replace('github-tree://', '')
    //             const path = new URL(url).search.slice(1)
    //             const prefix = url.split('/git/')[0]
    //             const tree_url = `${prefix}/git/trees/HEAD?recursive=${path.split('/').length}`
    //             return _fetch(tree_url).then(r => r.json()).then(o => {
    //                 console.debug(o)
    //                 return `${prefix}/HEAD/${item.path}`
    //             }).catch(e => {
    //                 console.error(e)
    //                 return url
    //             })
    //         },
    //     }[proto]
        
    //     return special_case ? special_case(url) : url
    // }
    // window.fetch = (url, ...x) => {
    //     const proto = new URL(url).protocol
    //     const special_case = {
    //         // TODO better, bad rate limits
    //         'github-tree:': (url) => _fetch(url.replace('github-tree://', '')).then(r => r.json()).then(o => {
    //             const { content, encoding } = o
    //             return {
    //                 text: () => content
    //                 // text: () => atob(content),
    //             } // TODO other encodings?
    //         }).catch(e => {
    //             console.error(e)
    //             return {
    //                 text: () => url,
    //             }
    //         }),
    //     }[proto]

    //     console.debug('fetch', {url, special_case})
    //     return special_case ? special_case(url, ...x) : _fetch(url, ...x)
    // }

    defer(() => [...document.querySelectorAll('[href]')].map(L=>L.href.startsWith(origin)&&(L.href=L.href.replace(/:\d+/,':5050'))))
}
