// common.js @ https://freshman.dev/lib/2/common/script.js https://freshman.dev/copyright.js

if (globalThis.is_server === undefined) globalThis.is_server = !globalThis['window']
globalThis['window']=globalThis;window['document']=window['document']||{}
if (!window['common.js']) {
    window['common.js'] = Date.now()
    console.debug(window['common.js'])
    
    // const window = globalThis.window || Object.assign({}, {
    //     XMLHttpRequest: class {open=()=>{};send=()=>{}},
    //     location: {origin:'node'},
    //     document: {querySelector:()=>undefined,querySelectorAll:()=>[]}
    // }, globalThis)

    window.debug = console.debug.bind(console)
    window.named_log = (name, print=console.debug.bind(console)) => (...x) => print(`[${name}]`, ...x)
    const log = named_log('common.js')

    window.xhr = src => {
        log('xhr', src)
        return (x => {
            x.withCredentials = false
            x.open('GET', src, false)
            x.send()
            return x.responseText
        })(new XMLHttpRequest())
    }
    const _dependencies = {}
    window.dependency = src => {
        if (!_dependencies[src]) {
            _dependencies[src] = true
            document.head.append((x => Object.assign(x, { innerHTML:xhr(src) }))(document.createElement('script')))
        }
    }
    if (!is_server) {
        window.dev = (location.port === '3030') ? true : false
        window.server = dev ? location.origin : 'https://freshman.dev'
        dependency(server + '/lib/2/ve/ve.js')
        dependency(server + '/lib/2/se.ts/script.js')
        dependency(server + '/lib/2/css/script.js')
        dependency(server + '/lib/2/store/script.js')
    }

    // window.dependency_import = /* synchronous import with parallelized calls */ (import_definition={
    //     'common': ['/lib/2/common/script.js', []],
    //     '/lib/2/ve/ve.js': ['common'],
    // }, opts={domain='https://freshman.dev'}={}) => {

    //     // 

        

    //     // transform into list of parallelizable sequential import chains
    //     const parallel_import_chains = []

    //     parallel_import_chains.map(x => dependency(new URL(x, opts.domain).toString()))
    // }
    // dependency_import([
    //     '/lib/2/ve/ve.js',
    // ])

    if (!is_server) window.devices = {
        is_mobile: JSON.parse(localStorage.getItem('dev-mobile') || '0') || /iPhone|iPod|Android|Pixel|Windows Phone/i.test(navigator.userAgent),
        toggle_mobile: () => {
            localStorage.setItem('dev-mobile', JSON.stringify(!devices.is_mobile))
            location.reload()
        },
        is_watch: (() => {
            // true if physical screen is small and square-ish
            const physical = {
              width: screen.width / devicePixelRatio,
              height: screen.height / devicePixelRatio,
            }
            return physical.width < 400 && Math.abs(1 - (physical.width / physical.height)) < .5
        })(),
        get is_non_watch_mobile() {return devices.is_mobile && !devices.is_watch}, get is_mobile_not_watch() {return this.is_non_watch_mobile},
        get is_desktop() {return !devices.is_mobile},
    }

    window.pass = x=>x
    window.exists = x=>x!==undefined
    window.truthy = x=>!!x
    window.apply = (f, ...x) => typeof f === 'function' ? f(...x) : f
    window.compose = (...fs) => (...x) => fs.slice(1).reduce((v, fs) => f(v), funcs[0] && funcs[0](...args))
    window.pipe = (value, ...funcs) => compose(...funcs)(value)
    window.fs = (x) => {
        return {
            pipe: (f) => fs(f(x)),
            with(f) { f(x); return this },
            x, value:x,
        }
    }
    window.fnot = (f) => !apply(f)

    Promise.prototype.with = function(f) { return this.then(async x => { await f(x); return x }) }
    window.ActionablePromise = class extends Promise {
        constructor(executor=()=>{}) {
            let resolve, reject
            super((_resolve, _reject) => {
                resolve = _resolve
                reject = _reject
                executor(resolve, reject)
            })
            this.resolve = resolve
            this.reject = reject
        }
    }

    Array.prototype.flatMap = Array.prototype.flatMap || function(f) {
        const results = []
        this.forEach(value => result.push(...f(value)))
        return results
    }

    window.isNonArrayObject = (x) => !Array.isArray(x) && typeof(x) === 'object'
    window.isString = (x) => typeof(x) === 'string'

    window.list = (data=[], seperator=' ') => typeof(data) === 'string' ? data.split(seperator) : Array.from(data)
    window.set = (data=[], seperator=' ') => new Set(list(data, seperator))
    window.lists = {
        of: list,
        remove: (xs, x) => {
            const i = xs.indexOf(x)
            if (i > -1) xs.splice(i, 1)
            return xs
        },
        clear: (xs) => {
            xs.splice(0, xs.length)
            return xs
        },
        joins: (xs, ...separators) => (separators.length === 1 ? xs : xs.map(x => lists.joins(x, ...separators.slice(1)))).join(separators[0]),
        order: (xs, is) => is.map(i => xs[i]),
        first: (xs, n) => xs.slice(0,n),
        last: (xs, n) => xs.slice(n-1),

        first: (...xs) => {
            const result = Array.from({ length: Math.max(...xs.map(x => x.length)) })
            for (let i = 0; i < result.length; i++) {
                result[i] = xs.find(x => truthy(x[i]))[i]
            }
            return result
        },

        group: (xs, n) => {
            const groups = []
            for (let i = 0; i < xs.length; i += n) {
                groups.push(xs.slice(i, Math.min(xs.length, i + n)))
            }
            return groups
        },

        count: (xs, f) => {
            return xs.filter(f).length
        },

        unique: (xs, f=x=>x) => {
            const value_set = set()
            return xs.filter(x => {
                const value = f(x)
                if (value_set.has(value)) return false
                value_set.add(value)
                return true
            })
        },

        find_indicies: (xs, x) => {
            const indicies = []
            for (let i = 0; i < xs.length; i++) {
                if (xs[i] === x) {
                    indicies.push(i)
                }
            }
            return indicies
        },

        maxxing: (xs, f) => {
            if (!xs.length) return undefined
            let max_i = 0, max_value = f(xs[0])
            for (let i = 1; i < xs.length; i++) {
                const value = f(xs[i])
                if (value > max_value) {
                    max_i = i
                    max_value = value
                }
            }
            return xs[max_i]
        },
        minning: (xs, f) => {
            if (!xs.length) return undefined
            let min_i = 0, min_value = f(xs[0])
            for (let i = 1; i < xs.length; i++) {
                const value = f(xs[i])
                if (value < min_value) {
                    min_i = i
                    min_value = value
                }
            }
            return xs[min_i]
        },
        maxxing_list: (xs, f) => {
            if (!xs.length) return []
            let max_is = [0], max_value = f(xs[0])
            for (let i = 1; i < xs.length; i++) {
                const value = f(xs[i])
                const diff = value - max_value
                if (diff > 0) {
                    max_is = [i]
                    max_value = value
                }
                else if (diff === 0) {
                    max_is.push(i)
                }
            }
            return max_is.map(max_i => xs[max_i])
        },
        minning_list: (xs, f) => {
            if (!xs.length) return []
            let min_is = [0], min_value = f(xs[0])
            for (let i = 1; i < xs.length; i++) {
                const value = f(xs[i])
                const diff = value - min_value
                if (diff < 0) {
                    min_is = [i]
                    min_value = value
                }
                else if (diff === 0) {
                    min_is.push(i)
                }
            }
            return min_is.map(min_i => xs[min_i])
        },

        objectable: (data='', seperator=' ') => {
            const _objectable = (x) => {
                x._keys = x._keys ?? x
                // Object.defineProperty(x, 'object', {
                //     get: function() {
                //         if (!this._keys) throw 'objectable(array) required'
                //         return from(zip(this._keys, this))
                //     }
                // })
                return x
            }
            const Objectable = class extends Array {
                constructor(...x) {return _objectable(super(...x))}
                // map(...x) {return _objectable(Object.assign(super.map.apply(this, x), {_keys:this._keys||this}))}
                map(...x) {return Object.assign(super.map.apply(this, x), {_keys:this._keys||this})}
                filter(...x) {return _objectable(super.filter.apply(this, x))}
                slice(...x) {return _objectable(super.slice.apply(this, x))}
                get object() {
                    if (!this._keys) throw 'objectable(array) required'
                    return from(zip(this._keys, this))
                }
            }
            return new Objectable(...list(data, seperator))
        },
        init_object: (xs) => objectable(xs),
        finalize_object: (xs) => {
            const result = xs.object
            if (!xs._keys || !result) throw 'init_object(array) required'
            return result
        }
    }

    window.keys = (data=[], sep=' ') => isNonArrayObject(data) ? list(Object.keys(data)) : list(data, sep)
    window.values = (data=[], sep=' ') => isNonArrayObject(data) ? list(Object.values(data)) : list(data, sep)
    window.entries = (data=[], sep=' ') => {
        const vs = values(data, sep)
        return keys(data, sep).map((k,i) => [k, vs[i]])
    }
    window.from = (data=[], sep=' ') => {
        if (isNonArrayObject(data)) return data
        if (isString(data)) return from(list(data, sep).map(x => [x,x]))
        return Object.fromEntries((data).filter(truthy))
    }
    window.zip = (...x) => Array.from(x[0]).map((_,i) => x.map(y => y[i]??undefined))
    window.named = (keys=[], values=[], sep=' ') => {
        return from(zip(list(keys, sep), list(values, sep)))
    }
    window.counts = (data='', seperator=' ') => list(data, seperator).reduce((counts, x) => {
        counts[x] = 1 + (counts[x] || 0)
        return counts
    }, {})
    window.object = (data='', seperator=' ') => from(
        typeof data !== 'object' || Array.isArray(data) 
        ? list(data, seperator).map(x => [x, true])
        : entries(data))
    window.object_list = (data='', seperator=' ') => {
        const raw = object(data, seperator)
        Object.keys(raw).map((k, i) => raw[i] = raw[k])
        return raw
    }
    window.objects = {
        new: object, of: object,
        keys, values, entries, from, zip, named, counts, object, object_list
    }

    window.sum = (ar) => ar.reduce((a, v) => a + v, 0)
    window.product = (ar) => ar.reduce((a, v) => a * v, 1)
    window.bounds = (ar) => (x => {x.push(x[1]-x[0]);return x})([Math.min(...ar), Math.max(...ar)])
    window.bound = (ar, x) => (([min, max]) => Math.max(min, Math.min(x, max)))(bounds(ar))
    window.norm = (ar, x) => (([min, max]) => (bound(ar, x) - min) / (max - min))(bounds(ar))
    window.maths = window.math = {
        TAU: 2 * Math.PI, PI: Math.PI,
        max: (ar) => Math.max(...ar),
        min: (ar) => Math.min(...ar),
        sum, product,
        lerp: (a, b, p) => {
            p = Math.max(0, Math.min(p, 1))
            return (1 - p) * a + p * b
        },
        round: (x, pr=0) => {
            const round = Math.pow(10, pr)
            return Math.round(x * round) / round
        },
        comparators: {
            modifier: {
                descending: (f) => (...x) => -f(...x),
            },
            numeric: (a, b) => a - b,
            // alphanumeric: (a, b) => {
            //     const 
            // }
        }
    }

    window.elements = {
        inside: (el, { x, y }) => {
            const rect = el.getBoundingClientRect()
            return rect.x <= x && x <= rect.x + rect.width && rect.y <= y && y <= rect.y + rect.height
        },
    }

    window.elapsed = (a, b=Date.now()) => {
        ;[a, b] = [a, b].map(Number)
        return b - a
    }
    window.duration = ({
        ms=0,s=0,m=0,h=0,d=0,w=0,mo=0,y=0,de=0,c=0,mi=0,
        MI=mi||0, C=c||0, DE=de||0, Y=y||0, M=mo||0, W=w||0, D=d||0,
    }={}) => Math.ceil((((((MI*1000 + C*100 + DE*10 + Y) * 365 + (M) * (365/12) + (W) * 7 + D) * 24 + h) * 60 + m) * 60 + s) * 1_000 + ms)
    window.offset = (d, ms) => new Date(Number(d) + ms)
    window.datetime = window.datetimes = {
        elapsed, duration, offset,
        tz: (date=Date.now(), tz=undefined) => {
            if (typeof(date) === 'number') date = new Date(date)
            if (tz === undefined) return date.getTimezoneOffset()
            return new Date(date.getTime() - ((date.getTimezoneOffset() - tz) * 60 * 1000))
        },
        utc: (date=Date.now()) => datetime.tz(date, 0),
        ymd: (date=Date.now()) => {
          if (typeof(date) === 'number') date = new Date(date)
          return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(x => String(x).padStart(2, '0')).join('-')
        },
        yyyymmdd: (...x)=>datetime.ymd(...x),
        input: (date=Date.now()) => new Date(date).toISOString().slice(0, 10),
        hms: (date=Date.now()) => {
            if (typeof(date) === 'number') date = new Date(date)
            return [date.getHours(), date.getMinutes(), date.getSeconds()].map(x => String(x).padStart(2, '0')).join(':')
        },
        ymdhms: (date=Date.now()) => [datetime.ymd(date), datetime.hms(date)].join(' '),
        hm: (date=Date.now()) => {
            return datetime.hms(date).replace(/:\d\d$/, '')
        },
        ymdhm: (date=Date.now()) => [datetime.ymd(date), datetime.hm(date)].join(' '),
        yyyymmddhhmmss: (...x)=>datetime.ymd(...x),
        new: (yyyymmdd=undefined, hhmmss='12:00:00') => yyyymmdd ? new Date(yyyymmdd + ' ' + hhmmss) : new Date(),
        of: ({ Y=undefined, M=undefined, D=undefined, h=0, m=0, s=0, ms=0 }={}) => {
            const d = new Date(`${datetime.ymd(new Date())} 00:00:00`)
            Y !== undefined && d.setFullYear(Y)
            M !== undefined && d.setMonth(M)
            D !== undefined && d.setDate(D)
            h && d.setHours(h)
            m && d.setMinutes(m)
            s && d.setSeconds(s)
            ms && d.setMilliseconds(ms)
            return d
        },
        timer: () => {
            let start = performance.now()
            let last = start
            return {
                start,
                elapsed: () => {
                    const now = performance.now()
                    const elapsed = now - last
                    last = now
                    return elapsed
                },
                total: () => performance.now() - start,
                reset: () => {
                    last = start = performance.now()
                }
            }
        },
        durations: {
            new: duration,
            pretty: (ms) => {
                const sign = ms < 0 ? '-' : ''
                ms = Math.abs(ms)
                const d = Math.floor(ms / duration({ d:1 }))
                const h = Math.floor(ms % duration({ d:1 }) / duration({ h:1 }))
                const m = Math.floor(ms % duration({ h:1 }) / duration({ m:1 }))
                const s = Math.floor(ms % duration({ m:1 }) / duration({ s:1 }))
                if (d >= 1) return `${sign}${d} ${strings.plural(d, 'day', 's')}`
                const format_60 = (x) => x.toString().padStart(2, '0')
                if (h >= 1) return `${sign}${format_60(h)}h:${format_60(m)}m`
                if (m >= 1) return `${sign}${format_60(m)}m:${format_60(s)}s`
                if (s >= 10) return `${sign}${format_60(s)}s`
                return `${maths.round(ms / 1_000, 1)}s`
            },
        },
    }

    window.Q = (l, s) => s ? l.querySelector(s) : document.querySelector(l)
    window.QQ = (l, s) => list(s ? l.querySelectorAll(s) : document.querySelectorAll(l))
    window.on = (l, es, f, o=undefined) => {
        const setEventListener = action => (
            (ls, es) => ls.map(l => es.map(e => l && l[action + 'EventListener'](e, f, o)))
        )(
            [l].flatMap(pass).flatMap(li => typeof(li) === 'string' ? QQ(li) : [li]),
            typeof(es) === 'string' ? es.split(' ') : es
        )
        setEventListener('add')
        return () => setEventListener('remove')
    }
    window.ons = (l, ons) => Object.keys(ons).map(e => on(l, e, ons[e]))
    window.node = (html='<div></div>', assign={}) => Object.assign(html.trim()[0] === '<' ? (x => {
        x.innerHTML = html
        return x.children[0]
    })(document.createElement('div')) : node(`<${html}></${html}>`), assign)
    window.nodes = (html='<div></div>') => (x => {
        x.innerHTML = html
        return list(x.children)
    })(document.createElement('div'))
    window.span = (content='') => node(`<span>${content}</span>`)
    window.div = (content='') => node(`<div>${content}</div>`)
    window.style = (x, css_text) => Object.assign(x.style, Object.fromEntries(css_text.split(/[;\n]/).filter(x=>x).map(l => l.split(':').map(x=>x.trim()))))
    window.svg_node = (tag_or_node, properties) => {
        const svg_node = typeof tag_or_node === 'string' ? document.createElementNS('http://www.w3.org/2000/svg', tag_or_node) : tag_or_node
        svg_node.innerHTML = properties.innerHTML || properties.textContent || svg_node.innerHTML
        entries(properties.on || {}).map(([k, v]) => on(svg_node, k, v))
        entries(properties).map(([k, v]) => svg_node.setAttribute(k, v))
        return svg_node
    }

    window.range = (a,o,e=1) => Array.from({ length: Math.floor((o===undefined?a:o-a)/e) }).map((_, i) => i*e + (o===undefined?0:a))
    window.merge = (...os) => {
        const result = {}
        os.map(o => {
            Object.keys(o||{}).map(k => {
                if (o[k] === undefined) delete result[k]
                else result[k] = (typeof(result[k]) === 'object' && typeof(o[k]) === 'object' && !Array.isArray(o[k])) ? merge(result[k], o[k]) : o[k]
            })
        })
        return result
    }
    window.transmute = (o, O, X=undefined) => {
        // recursively transform object with functions
        const resolved = Object.keys(o).map(k =>
            (typeof(o[k]) === 'object' && !Array.isArray(o[k]))
            ? { [k]: transmute(o[k], O) }
            : X
                ? { [k]: X(o[k]) }
                : O(k, o[k]))
        
        return merge(
            {},
            ...resolved
        )
    }
    window.deletion = (o={}) => transmute(o, (k,v)=> v ? { [k]: undefined } : {})
    window.pick = (object, delimited_keys, delimiter=' ') => list(delimited_keys, delimiter).reduce((o, k) => { o[k] = object[k]; return o }, {})
    window.unpick = (object, delimited_keys, delimiter=' ') => list(delimited_keys, delimiter).reduce((o, k) => { delete o[k]; return o }, {...object})
    window.boolean_num = (boolean, number) => !boolean || typeof boolean === 'number' ? boolean : number
    window.alias = (object, { aliases, abbreviated=false, abbreviation_length=2 }) => fs({}).with(x => keys(object).map(k => {
        []
        .concat(
            list(aliases[k] || k),
            abbreviated
            ? [k.slice(0, boolean_num(abbreviated, abbreviation_length))]
            : [])
        .map(alias => x[alias] = object[alias])
    })).x

    {
        let resolve, reject
        window.resolvable = () => Object.assign(new Promise((rs, rj) => [resolve, reject]=[rs, rj]), { resolve, reject })
    }
    window.defer = (f=()=>{}, ms=1) => (x => Object.assign(x, {
        handle: setTimeout(async () => x.resolve(typeof f === 'function' ? f() : f), ms),
        interrupt(reason) {
            clearTimeout(this.handle)
            x.reject(reason)
        },
    }))(resolvable())
    window.sleep = (ms) => defer(false, ms)
    window.loop = (f=()=>{}, ms=1) => (x => Object.assign(x, {
        handle: setInterval(async () => x.resolve(typeof f === 'function' ? f() : f), ms),
        interrupt(reason) {
            clearTimeout(this.handle)
            x.reject(reason)
        },
    }))(resolvable())

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

        get unambiguous() { return '23456789ABCDEFGHJKMNPQRSTUVWXYZ' },
        get somebiguous() { return string.digits + 'ABCDEFGHJKMNPQRSTUVWXYZ' },
        unsomebiguate(x) { return x.replace(/o/gi, '0').replace(/[il]/gi, '1') },
        
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
        },
    }
    window.strings = Object.assign({}, string, {
        json: {
            parse: JSON.parse,
            stringify: JSON.stringify,
            pretty: (object) => JSON.stringify(object, null, 2),
            equal: (a, b) => JSON.stringify(a) === JSON.stringify(b), eq:(...x)=>strings.json.equal(...x),
            clone: (x) => JSON.parse(JSON.stringify(x)),
        },
        plural: (count, prefix, plural_suffix, singular_suffix='') => {
            return prefix + (count === 1 ? singular_suffix : plural_suffix)
        },
    })
    window.compare = {
        stringify: (...xs) => {
            const stringified = xs.map(JSON.stringify)
            return stringified.slice(1).findIndex(x => x !== stringified[0]) === -1
        },
    }
    window.rank = {
        number: (a, b) => { // (...xs)
            return a - b
        },
        length: (a, b) => { // (...xs)
            return a.length - b.length
        },
        f_numfield: (k) => (a, b) => a[k] - b[k],
    }
    window.rand = merge({
        // () => [0,1)
        // (n) => [0,n)
        // (a, b) => [a,b)
        f: (a=1,o,e=1) => (i => i*e + (o===undefined?0:a))(Math.random() * ((o===undefined?a:o-a)/e)),
        s: (a=1,o,e=1) => (i => i*e + (o===undefined?0:a) - ((o===undefined?a:o-a)/e))(Math.random() * 2 * ((o===undefined?a:o-a)/e)),
        i: (a=2,o,e=1) => Math.floor(rand.f(a,o,e)),
        generate: (n, method, constraint) => {
            let samples = new Array(n)
            do {
                for (let i = 0; i < n; i++) samples[i] = method(i)
            } while (!constraint(...samples))
            return samples
        },
        sample: (ar, n=undefined) => n === undefined ? ar[rand.i(ar.length)] : range(n).map(() => rand.sample(ar)),
        pick: (ar, n=undefined) => n === undefined ? ar.splice(rand.i(ar.length), 1)[0] : range(n).map(() => rand.pick(ar)),
        weighted: (o, n=undefined) => {
            const total = math.sum(Object.values(o))
            let picks
            for (let i = 0; i < n||1; i++) {
                let x = rand.f(total)
                const pick = Object.keys(o).find(k => {
                    x -= o[k]
                    return x <= 0
                })

                if (n === undefined) return pick
                picks = picks || []
                picks.push(pick)
            }
            return picks
        },
        shuffle_order: (n) => range(n.length ?? n).sort(() => rand.s()),
        shuffle: (ar) => ar.sort(() => rand.s()),
        shuffle_and_order: (ar) => {
            const order = rand.shuffle_order(ar.length)
            return {
                shuffle: lists.order(ar, order),
                order,
            }
        }
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
    if (!is_server) window.api = (()  => {
        const AUTH_COOKIE = 'loginAuth'
        const origin = location.origin
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
                        if (user !== undefined) {
                            Object.assign(auth, { user, token })
                            store.set(AUTH_COOKIE, auth)
                        }
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
        const stored_auth = store.get(AUTH_COOKIE)
        if (stored_auth) {
            auth.user = stored_auth.user
            auth.token = stored_auth.token
        }
        return api
    })()
    window.apis = {
        server:window.server, api:window.api,
        toForm: data => {
            return new URLSearchParams(data).toString()
        },
        format: (url, options) => {
            let query = ''
            if (options.query) {
                const url_URL = new URL(url)
                url = url_URL.origin + url_URL.pathname
                options.query = {
                    ...(options.query || {}),
                    ...Object.fromEntries(new URLSearchParams(url_URL.search)),
                }
                query =  '?' + apis.toForm(options.query)
            }
            return encodeURI(url) + query
        },
        external: (url, method='GET', options = {
            query: undefined, headers: undefined, form: undefined, json: undefined, nocors: undefined, target: undefined
        }) => {
            const formatted = apis.format(url, options)
            const headers = options.headers || {}
            if (options.json) headers['Content-Type'] = 'application/json'
            if (options.form) headers['Content-Type'] = 'application/x-www-form-urlencoded'
            const init = {
                mode: options.nocors ? 'no-cors' : undefined,
                method,
                headers: headers,
                body: options.json !== undefined
                ? JSON.stringify(options.json)
                : options.form
                    ? apis.toForm(options.form)
                    : undefined
            }
            console.debug('API EXTERNAL', method, formatted, init)
            if (method === 'OPEN') return Promise.resolve(open(formatted, top !== window ? '_blank' : options.target || '_blank') && undefined)
            return fetch(formatted, init)
            .then(res => {
                if (res.headers.get('Content-Type')?.includes('application/json')) {
                    return res.json().then(data => {
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
        }
    }

    if (!is_server) setTimeout(() => {
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
    window.download_canvas = window.downloadCanvas = async (canvas, download='image.png') => {
        canvas.toBlob(blob => {
            const href = URL.createObjectURL(blob)
            Object.assign(node('<a></a>'), { download, href }).click()
            URL.revokeObjectURL(href)
        }, 'image/png', 1)
    }

    const _canvas_ctx = (img_or_canvas) => {
        let canvas, ctx
        if (img_or_canvas.getContext) {
            canvas = img_or_canvas
            ctx = canvas.getContext('2d')
        } else {
            canvas = node('canvas')
            canvas.height = img_or_canvas.height
            canvas.width = img_or_canvas.width
            ctx = canvas.getContext('2d')
            ctx.drawImage(img_or_canvas, 0, 0)
        }
        return {canvas, ctx}
    }
    window.canvases = {
        download: downloadCanvas,
        data: (img_or_canvas) => {
            const {canvas, ctx} = _canvas_ctx(img_or_canvas)
            const {data:raw_data} = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = M.ne(range(canvas.height).map(r => range(canvas.width).map(c => V.ne(range(3).map(i => raw_data[(r * canvas.width * 4) + (c * 4) + i])))))
            return data
        },
        replace: (img_or_canvas, color_map, tolerance=255 / 4) => {
            const {canvas} = _canvas_ctx(img_or_canvas)
            const data_v = canvases.data(canvas)
            const color_map_v = color_map.map(pair => pair.map(V.ne))

            const {canvas:out_canvas, ctx:out_ctx} = _canvas_ctx(node('canvas'))
            out_canvas.height = canvas.height
            out_canvas.width = canvas.width
            out_ctx.drawImage(img_or_canvas, 0, 0)

            log(data_v, data_v.m, data_v.n, color_map_v)

            color_map_v.map(([from, to]) => {
                out_ctx.fillStyle = `rgb(${to.join(' ')})`
                for (let r = 0; r < data_v.m; r++) {
                    for (let c = 0; c < data_v.n; c++) {
                        if (V.ad(data_v[r][c], from.sc(-1)).ma() < tolerance) {
                            out_ctx.fillRect(c, r, 1, 1)
                        }
                    }
                }
            })
            return out_canvas
        },
        draw: (ctx, data) => {
            data = M.ne(data)
            // const raw_data = ctx.createImageData(data.m, data.n)
            // range(data.m).map(r => range(data.n).map(c => range(3).map(i => raw_data[(r * canvas.width * 4) + (c * 4) + i] = data[r][c][i])))
            // ctx.putImageData(raw_data, 0, 0)
            range(data.m).map(r => range(data.n).map(c => {
                ctx.fillStyle = `rgb(${data[r][c].join(' ')})`
                ctx.fillRect(c, r, 1, 1)
            }))
        },
    }

    const _displayStatus_active = {}
    window.displayStatus = async (element, status, ms=1_500) => {
        clearTimeout((x => x&&(x[0]()||x[1]))(_displayStatus_active[element]))

        const rect = element.getBoundingClientRect()
        const display = element.insertAdjacentElement('afterend', node(`<${element.tagName} class="${element.className}" style="
        ${element.style.cssText}
        min-width: ${rect.width}px;
        min-height: ${rect.height}px;
        ">${status}</${element.tagName}>`))
        element.remove()
        const undo = () => {
            display.insertAdjacentElement('beforebegin', element)
            display.remove()
        }
        
        _displayStatus_active[element] = [undo, setTimeout(() => {
            undo()
            delete _displayStatus_active[element]
        }, ms)]
    }
    window.display_status = displayStatus

    if (!is_server) window.url = {
        replace: (href) => history.replaceState(null, '', href),
        push: (href) => history.pushState(null, '', href),
        query: (query, opts={remove_false=false}={}) => {
            if (typeof query === 'object') {
                const object = Object.fromEntries(new URLSearchParams(query).entries())
                console.debug(opts, object)
                if (opts.remove_false) Object.keys(object).forEach((k) => (!object[k] || !JSON.parse(object[k])) && (delete object[k]))
                query = new URLSearchParams(object)
            }
            url.replace(location.origin + location.pathname + query.toString().replace(/^\??/, '?').replace(/^\?$/, '') + location.hash)
        },
        search: (...x) => url.query(...x),
        hash: (hash) => url.replace(location.origin + location.pathname + location.search + hash),
    }

    window.colors = {
        rgb_to_hex: (r, g, b) => '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join(''),
        hex_to_rgb: (hex) => {
            const is_short = hex.length < 7
            return lists
                .group(lists.of(hex.slice(1, is_short ? 5 : 8), ''), is_short ? 1 : 2)
                .map(x => x.join('')).map(x => is_short ? x+x : x).map(x => parseInt(x, 16))
        },
        hex_invert: (hex) => {
            const [r, g, b] = colors.hex_to_rgb(hex)
            return colors.rgb_to_hex(256 - r, 256 - g, 256 - b)
        },
        hex_readable: (hex) => {
            // const [bg_rgb] = colors.hex_to_rgb(bg)
            // const sum = bg_rgb.reduce((a,v)=>a+v,0)
            // const max = Math.max(...bg_rgb)
            // const weighted = sum // sum/2 + (max * 3)/2
            // const readable_rgb = ((!weighted && weighted !== 0) || weighted > 255 * 1) ? [0, 0, 0] : [255, 255, 255]
            // return colors.rgb_to_hex(...readable_rgb)
            const [R, G, B] = colors.hex_to_rgb(hex).map(x => x / 256)
            const L = Math.sqrt(0.299*Math.pow(R, 2) + 0.587*Math.pow(G, 2) + 0.114*Math.pow(B, 2))
            return L > .5 ? '#000000' : '#ffffff'
        },
        invert: (color) => {
            return colors.hex_invert(colors.to_hex(color))
        },
        readable: (background) => {
            return colors.hex_readable(colors.to_hex(background))
        },
        hex_to_canonical: (hex) => colors.rgb_to_hex(...colors.hex_to_rgb(hex)),
        rgb_to_hsl_object: (r, g, b) => {
            // adapted from https://stackoverflow.com/a/58426404

            // [0,255] -> [0,1]
            r /= 255
            g /= 255
            b /= 255
            const components = [r, g, b]

            // channel min & max
            const c_min = Math.min(...components),
                c_max = Math.max(...components),
                delta = c_max - c_min

            let h = 0, s = 0, l = 0

            // hue angle
            if (delta === 0) { // no difference
                h = 0
            } else if (c_max === r) { // red max
                h = ((g - b) / delta) % 6
            } else if (c_max === g) { // green is max
                h = (b - r) / delta + 2
            } else { // blue is max
                h = (r - g) / delta + 4
            }
            h = Math.round(h * 60)
            
            // make hue angle positive
            if (h < 0) h += 360

            // calculate lightness
            l = (c_max + c_min) / 2

            // calculate saturation
            s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

            return { h:h/360, s, l }
        },
        rgb_to_hsl: (r, g, b) => {
            const { h, s, l } = colors.rgb_to_hsl_object(r, g, b)
            return `hsl(${h} ${+(s * 100).toFixed(1)}% ${+(l * 100).toFixed(1)}%)`
        },
        hsl_object_to_rgb: ({ h, s, l }) => {
            // adapted from https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
            // h, s, and l are in [0, 1]
            // r, g, and b are in [0, 255]
            function hue_to_component(p, q, t) {
                if (t < 0) t += 1
                if (t > 1) t -= 1
                if (t < 1/6) return p + (q - p) * 6 * t
                if (t < 1/2) return q
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
                return p
            }

            let r, g, b
            if (s === 0) {
                r = g = b = l // achromatic
            } else {
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s
                const p = 2 * l - q
                r = hue_to_component(p, q, h + 1/3)
                g = hue_to_component(p, q, h)
                b = hue_to_component(p, q, h - 1/3)
            }

            return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
        },
        gradient_hsl_hex: (hex_start, hex_end, steps) => {
            const start_hsl_obj = colors.rgb_to_hsl_object(...colors.hex_to_rgb(hex_start))
            const end_hsl_obj = colors.rgb_to_hsl_object(...colors.hex_to_rgb(hex_end))
            // log({start_hsl_obj, end_hsl_obj})
            return range(steps).map(i => {
                const p = i / Math.max(2, steps - 1)
                const h = maths.lerp(start_hsl_obj.h, end_hsl_obj.h, p)
                const s = maths.lerp(start_hsl_obj.s, end_hsl_obj.s, p)
                const l = maths.lerp(start_hsl_obj.l, end_hsl_obj.l, p)
                // log({ h, s, l })
                return colors.rgb_to_hex(...colors.hsl_object_to_rgb({ h, s, l }))
            })
        },
        to_hex: (str) => {
            if (str.startsWith('hsl')) {
                let [h, s, l] = /hsl\(([^)]+)\)/.exec(str)[1].split(/[, ]+/g)
                const h_match = /([\d\.]+)(deg)?/.exec(h)
                if (h_match) h = Number(h_match[1]) / 360
                else h = Number(h) 
                const s_match = /([\d\.]+)%/.exec(s)
                if (s_match) s = Number(s_match[1]) / 100
                else s = Number(s) 
                const l_match = /([\d\.]+)%/.exec(l)
                if (l_match) l = Number(l_match[1]) / 100
                else l = Number(l)
                return colors.rgb_to_hex(...colors.hsl_object_to_rgb({ h, s, l }))
            } else if (str.startsWith('rgb'))  {
                return colors.rgb_to_hex(...str.slice(4, -1).split(/[, ]+/g).map(x => Number(x)))
            }
            return str
        },
        random: () => colors.rgb_to_hex(rand.i(256), rand.i(256), rand.i(256)),
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
        // TODO QR code implementation :)
        return `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${text}&choe=UTF-8`
    }
    window.icon = (options={
        color: getComputedStyle(document.documentElement).backgroundColor,
        text: document.title, text_color: getComputedStyle(document.documentElement).color,
        update: false,
    }) => {
        // icon(color) or icon(href) or icon({ color='#000', text, text_color='#fff' }) or icon({ color='#000', x256:(ctx)=>{render} })

        let href
        const DEFAULT_ICON_SIZE = 256
        if (typeof options === 'string') {
            const color = /#.{3,8}/.exec(options)
            if (color) { // color circle
                return icon({ color:false, x256: ctx => {
                    ctx.fillStyle = color
                    ctx.beginPath()
                    ctx.arc(DEFAULT_ICON_SIZE/2, DEFAULT_ICON_SIZE/2, DEFAULT_ICON_SIZE/2 * 11.5/14, 0, Math.PI * 2)
                    ctx.closePath()
                    ctx.fill()
                }})
            } else {
                href = options
                if (!href.includes(':')) href = location.origin + '/' + href.replace(location.origin + '/', '')
            }
        } else {
            if (options.text) options = merge({ text_color: '#fff', [`x${DEFAULT_ICON_SIZE}`]: ctx => {
                ctx.fillStyle = options.text_color || '#fff'
                ctx.textAlign = 'left'
                ctx.textBaseline = 'top'
                ctx.font = '32px monospace'
                ctx.fillText(`${options.text}`, 0, 32, DEFAULT_ICON_SIZE * 7/8)
            } }, options)
            const size = Math.max(...Object.keys(options).map(x => Number(x.slice(1))).filter(truthy))
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            canvas.width = canvas.height = size
            ctx.fillStyle = ctx.strokeStyle = options.color ?? '#000'
            if (ctx.fillStyle) ctx.fillRect(0, 0, size, size)
            options['x'+size](ctx)
            href = canvas.toDataURL()
        }
        
        if (options.update) (Q('head [rel=icon]') || (x => {
            document.head.append(x)
            return x
        })(node(`<link rel=icon />`))).href = href
        return href
    }

    window.components = {
        link_preview: (href) => {
            if (!href) return ''
            const href_display = href.replace(/(https?:\/\/)?(www\.)?/, '')
            const l = node(`<div class="link-preview column">
                <div class="link-preview-preview column wide" style="display:none"></div>
                <a class="link-preview-link" href=${href}>${href_display}</a>
            </div>`)
            const preview = Q(l, '.link-preview-preview')
            api.post('/api/link-preview', { href }).then(({ html })=> {
                if (html) {
                    preview.innerHTML = html
                    preview.style.display = 'unset'
                }
            })
            return l
        },
        modal: (f_close) => {
            html.style.overflow = 'hidden'
            const modal_container = node(`<div class="modal-container" onclick="
            if (event.target === event.currentTarget) {
                event.target.remove()
                html.style.overflow = ''
            }
            " style="
            position: fixed; top: 0; left: 0; height: 100%; width: 100%; background: #0004;
            display: flex; align-items: center; justify-content: center;
            ">
                <div class="modal" style="
                height: max-content;
                width: max-content;
                background: #fff;
                border: 1px solid #000;
                padding: .5em;
                "></div>
            </div>`)
            const modal = Q(modal_container, '.modal')
            const inner = f_close(() => {
                modal_container.remove()
                html.style.overflow = ''
            })
            if (inner.tagName) {
                modal.append(inner)
            } else {
                modal.innerHTML = inner
            }
            document.body.append(modal_container)
        },
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

    // defer(() => [...document.querySelectorAll('[href]')].map(L=>L.href.startsWith(origin)&&(L.href=L.href.replace(/:\d+/,':5050'))))

    window.html = document.documentElement
    window.head = document.head
    defer(() => window.body = document.body)
    
    if (!is_server) html.classList.add(...list('is_mobile is_watch is_non_watch_mobile is_desktop').filter(flag => devices[flag]).map(flag => flag.replace(/^is_/, '')))

    // AI suggestions
    window.debounce = (func, wait) => {
        let timeout
        return (...args) => {
            clearTimeout(timeout)
            timeout = setTimeout(() => func.apply(this, args), wait)
        }
    }
}
