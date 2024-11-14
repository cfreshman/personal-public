import { anyFields, consumer, couple, fields, functionOrOther, JSX, key, pass, transform, triplet, truthy } from './types';
// import { useE } from './hooks';

export const dev = location.origin.includes('http://')
export const server = location.port ? origin.replace(/:\d+/, ':5050') : location.host === 'herb.dev' ? location.origin : 'https://freshman.dev'

/**
 * async function
 */
let resolve, reject
export const resolvable = () => Object.assign(new Promise((rs, rj) => [resolve, reject]=[rs, rj]), { resolve, reject })
type deferType = Promise<any> & {
  resolve:consumer<any>,
  reject:consumer<any>,
  handle:number,
  interrupt:transform<[]|[any],unknown>,
}
const _deferF = (timeoutF) => (f=(deferred?:deferType)=>{}, ms=0):deferType => (x => Object.assign(x, {
  handle: timeoutF(async () => x.resolve(typeof f === 'function' ? f(x as deferType) : f), ms),
  interrupt(reason?) {
      clearTimeout(this.handle)
      x.reject(reason)
  },
}))(resolvable())
export const defer = _deferF(setTimeout)
export const interval = _deferF(setInterval)

/*
  Prototype pollution!
*/

type Q = ((doc: HTMLElement, selector?: string)=>HTMLElement) | ((selector: string)=>HTMLElement)
type QQ = ((doc: HTMLElement, selector?: string)=>HTMLElement[]) | ((selector: string)=>HTMLElement[])
declare global {
  interface Promise<T> {
    with(f:(x:T)=>void): Promise<T>
  }
  interface Array<T> {
    at(index: number): T
    remove(item: T): boolean
    includes(searchElement: any, fromIndex?: number): boolean
    smap: <U,>(fn: ((x: T, i: number, a: T[])=>U)|string) => U[]
  }
  interface Object {
    // bound(method: string): any
    serialize<T>(object: T): string
    deserialize<T>(object: string): T
    clone<T>(object: T): T
    load<T>(object: fields<T>, key: key, or?: (key:key)=>T): T

    kvs<T,U>(callback:(k:string,v:T,i:number,o:fields<T>)=>U): U[]
  }
  interface ObjectConstructor {
    hasOwn<T>(o: fields<T>, v: key)
    kvs<T,U>(callback:(k:string,v:T,i:number,o:fields<T>)=>U): U[]
  }
  interface JSON {
    pretty(value): string
    duplicate<T>(value: T): T
  }
  interface Navigator {
    standalone: any
  }
  interface Intl {
    supportedValuesOf: any
  }
  interface Set<T> {
    pop: (set: Set<T>) => T,
    map: <U,>(fn: (x: T, i: number, set: Set<T>)=>U, set?: Set<T>) => Array<U>,
    smap: <U,>(fn: ((x: T, i: number, set: Set<T>)=>U)|string, set?: Set<T>) => Array<U>,
  }
  interface Window {
    Q: Q
    $: Q
    QQ: QQ
    $$: QQ
    on: (
      el: HTMLElement, evts: string,
      func: EventListenerOrEventListenerObject, opts: boolean | AddEventListenerOptions)=>void
  }
}
const pollute = (target, methods) => {
  Object.entries(methods).map(([k, v]) => {
    if (!target[k]) target[k] = v
  })
}

pollute(Promise.prototype, {
  with: function(f) { return this.then(async x => { await f(x); return x }) },
})

export const resolveMappingFunction = <T,U>(fn: ((x: T, i: number, a: T[])=>U)|string) => {
  if (typeof(fn) === 'string') return (x) => eval(`x${fn}`)
  else return fn
}

export function remove(arr, item) {
  return arr.filter(x => x !== item);
}
export function removeFirst<T>(arr: T[], item): boolean {
  const index = arr.indexOf(item)
  if (index > -1) {
    arr.splice(index, 1)
    return true
  }
  return false
}
export function removeFirstInline<T>(arr: T[], item): T[] {
  arr.remove(item)
  return arr
}
export function filterFirst<T>(arr: T[], item): T[] {
  return removeFirstInline(arr.slice(), item)
}
/**
 * end: index from end of array
 */
export const end = (arr: any[], i?: number) => {
  i = i || 1;
  return arr.length >= i && arr.slice(-i)[0];
}
pollute(Array.prototype, {
  remove: function(item) {
    return removeFirst(this, item)
  },
  at: function(index) {
    return this[(index < 0) ? this.length + index : index]
  },
  smap: function(fn, ...x) {
    return this.map(resolveMappingFunction(fn), ...x)
  },
})

pollute(Object, {
  serialize: object => JSON.stringify(object),
  deserialize: object => JSON.parse(object),
  clone: object => object && (
    Object.hasOwn(object as any, 'clone')
    ? (object as { clone }).clone()
    : Object.deserialize(Object.serialize(object))),
  load: (object, key, or?) => {
    if (typeof(object) !== 'object') return object
    let value = object[key]
    if (value === undefined && or) {
      value = object[key] = or(key)
    }
    return value
  },
  kvs: function <T,U>(callback:(k:string,v:T,i:number,e:[string,T][])=>U) {
    return entries<T>(this).map((e, i, a) => callback(e[0], e[1], i, this))
  },
  // eslint-disable-next-line no-prototype-builtins, @typescript-eslint/ban-types
  hasOwn: (object: object, key: key) => object.hasOwnProperty(key),
})

pollute(JSON, {
  pretty: value => JSON.stringify(value, null, 2),
  duplicate: value => JSON.parse(JSON.stringify(value)),
})

/**
 * pop element from set
 */
export const set_pop = <T,>(set: Set<T>): T => {
  if (!set.size) return undefined;

  const item = set.values().next().value;
  set.delete(item);
  return item;
}
/**
 * pop element from set
 */
export const set_map = <T,U>(fn: (x: T, i: number, s: Set<T>)=>U, set: Set<T>): Array<U> => {
  const arr = Array.from<U>({ length: set.size })
  let i = 0
  set.forEach(x => {
    arr[i] = fn(x, i, set)
    i++
  })
  return arr
}
pollute(Set.prototype, {
  pop: function(set=this) { return set_pop(set) },
  map: function(f=pass, set=this) { return set_map(f, set) },
  smap: function(fn, ...x) { return this.map(resolveMappingFunction(fn), ...x) },
})

/**
 * document query sugar
 */
const parseQuery = (
  el_or_selector: HTMLElement | string,
  selector_or_undefined?: string
): [HTMLElement | Document, string] => {
  return (selector_or_undefined === undefined
  ? [document, el_or_selector]
  : [el_or_selector, selector_or_undefined]) as [HTMLElement | Document, string]
}
delete window.Q
export const Q = (el_or_selector, selector_or_undefined?) => {
  const [el, selector] = parseQuery(el_or_selector, selector_or_undefined)
  return el.querySelector(selector) as HTMLElement
}
export const QQ = (el_or_selector, selector_or_undefined?) => {
  const [el, selector] = parseQuery(el_or_selector, selector_or_undefined)
  return Array.from(el.querySelectorAll(selector)) as HTMLElement[]
}
export const on = (el, evts, func, opts=undefined) =>
  evts
  .split(' ')
  .map((evt, i) => {
    el.addEventListener(evt, func, opts)
    return () => el.removeEventListener(evt, func)
  })
export const ons = (el, evts: { [key:string]: consumer<Event> }, opts=undefined) =>
  Object.keys(evts)
  .map(evt => {
    const func = evts[evt]
    el.addEventListener(evt, func, opts)
    return () => el.removeEventListener(evt, func)
  })
pollute(window, { Q, QQ, on, $: Q, $$: QQ })

// https://gist.github.com/TheBrenny/039add509c87a3143b9c077f76aa550b
pollute(String.prototype, {
  // fill matchAll for those missing
  matchAll: function (re: RegExp) {
    const all = []
    let match
    while ((match = re.exec(this)) !== null) all.push(match)
    // @ts-ignore
    return all as IterableIterator<RegExpMatchArray>
  }
})

// this messes with turt_smurts / three.js for some reason
// declare global {
//   interface String {
//     deserialize(object: string): any
//   }
// }
// if (!String.prototype.deserialize) {
//   Object.prototype.deserialize = function () {
//     return JSON.parse(this)
//   }
// }


/*
  End prototype pollution
*/

let devMobile = (x => x && JSON.parse(x))(localStorage.getItem('dev-mobile'))
if (dev) {
  window['toggleMobile'] = () => {
    localStorage.setItem('dev-mobile', JSON.stringify(!devMobile))
    location.reload()
  }
}
export const isMobile = devMobile || /iPhone|iPod|Android|Pixel|Windows Phone/i.test(navigator.userAgent);
export const isWatch = (() => {
  // true if physical screen is small and square-ish
  const physical = {
    width: screen.width / devicePixelRatio,
    height: screen.height / devicePixelRatio,
  }
  console.debug('is watch', physical, Math.abs(1 - (physical.width / physical.height)))
  return physical.width < 400 && Math.abs(1 - (physical.width / physical.height)) > .65
})()
export const isMobileNotWatch = isMobile && !isWatch

export const mobile = isMobile
export const watch = isWatch
export const mobile_not_watch = isMobileNotWatch
export const desktop = !mobile

export const is_mobile = mobile
export const is_watch = watch
export const is_mobile_not_watch = mobile_not_watch
export const is_desktop = desktop

export const insecure = !window['crypto']?.subtle?.digest

export const standalone = window.matchMedia('(display-mode: standalone)').matches
export const browser_tab = !standalone

const alphanum = 'qwertyuiopasdfghjklzxcvbnm1234567890QWERTYUIOPASDFGHJKLZXCVBNM';
export function randAlphanum(n: number, avoid?: string[]) {
  let str;
  do {
    str = ''
    for (let i = 0; i < n; i++) {
      str += alphanum[randi(alphanum.length)];
    }
  } while (avoid?.includes(str))
  return str;
}
window['randAlphanum'] = randAlphanum

export function sample<T>(from: T[]): T {
  return from[randi(from.length)]
}

/*
 * Date functions
 */
export function toMonthDay(date: Date | number) {
  if (typeof(date) === 'number') date = new Date(date)
  return `${date.getMonth() + 1}/${date.getDate()}`
}
export function toYearMonthDay(date: Date | number) {
  if (typeof(date) === 'number') date = new Date(date)
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60 * 1000)).toISOString().slice(0, 10)
}
export function fromYearMonthDay(x: string) {
  return new Date(x + ' 12:00:00')
}
export const offDate = (off: (d: Date)=>void, date?: string | number | Date): Date => {
  const d = date === undefined ? new Date() : new Date(date)
  off(d)
  return d
}
export const timezoneOffset = (tz) => Number(
  new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: "shortOffset",
  })
  .formatToParts(new Date())
  .filter(e => e.type === "timeZoneName")[0].value.replace('GMT', '')||'0')
export const elapsed = (from:number|Date, to:number|Date=Date.now()) => {
  ;[from, to] = [from, to].map(Number)
  return to - from
}
export const duration = ({
  ms=0,
  s=0,
  m=0,
  h=0,
  d=0,
  w=0,
  mo=0,
  y=0,
}={}) => Math.ceil((((((y) * 365 + (mo) * (365/12) + (w) * 7 + d) * 24 + h) * 60 + m) * 60 + s) * 1_000 + ms)
export const offset = (d:number|Date, ms:number) => new Date(Number(d) + ms)

  /**
 * array: Initialize array of length n with index-based function for each i
 */
export const array = <T,>(n: number, func?: (i:number)=>T): T[] =>
  Array.from({ length: n }, (_, i) => func && func(i));

/**
 * randi: Random integer between [0, n)
 */
export const randi = (n: number) => Math.floor(Math.random() * n);

/**
 * randf: Random float between [0, n)
 */
export const randf = (n=1) => Math.random() * n;

/**
 * rands: Random float between [-n, n) + x
 */
export const rands = (n=1, x=0) => x + n * (Math.random() * 2 - 1);

/**
 * dist: euclidean distance
 */
export const dist = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));

/**
* manhat: manhattan distance
*/
export const manhat = (x1: number, y1: number, x2: number, y2: number) =>
 Math.abs(x1 - x2) + Math.abs(y1 - y2);


export const counts = (s: string): { [key: string]: number } => {
  const output = {}
  s.split('').forEach(c => {
    output[c] = 1 + (output[c] ?? 0)
  })
  return output
}
export const countArr = (s: string): [string, number][] =>
  Object.entries(counts(s)).sort((a, b) => b[1] - a[1])
export const percentArr = (s: string): [string, number][] => {
  const c = countArr(s)
  const total = c.reduce((sum, entry) => sum + entry[1], 0)
  c.forEach(entry => {
    entry[1] = entry[1] / total
  })
  return c
}

// split out regex matches, e.g. abcdbce => a bc d bc e
export const tokenize = (string: string, regex: RegExp) => {
  const splits = [0]
  regex = new RegExp(regex, regex.flags.replace('g', '')+'g')
  const matches = Array.from(string.matchAll(regex))
  matches.map(match => splits.push(match.index, match.index + match[0].length))
  splits.push(string.length)
  splits.sort((a, b) => a - b)
  const parts = splits.slice(1).map((s, i) => string.slice(splits[i], s)).filter(s => s)
  // if (parts.length > 1) {
  //   console.debug(str, str.split(regex).filter(part => part))
  //   console.debug(Array.from(str.matchAll(regex)))
  //   console.debug(splits, parts)
  // }
  return parts
}

// transform page/#/hash /#/hash #/hash #hash /hash => hash
export const fromHash = (hash=location.hash) => (hash || '').replace(/^([^#]*#)?\/?/, '')
export const toHash = text => text ? '#/'+text : ''

// transform /page/#/hash page/ => page
export const fromPath = (pathname=location.pathname) => (pathname || '').replace(/\/*(#.*)?$/, '').replace(/^\/*/, '').replace(/\+/g, ' ')
// .replace(/^[^/]/, '/$0')
export const toPath = (pathname, hash='', sep=undefined) => {
  if (pathname instanceof Array) {
    pathname = pathname.flat().join('/').replace(/\/+/g, '/')
  }
  // hash = hash !== false ? fromHash(hash) : fromHash(pathname)
  hash = fromHash(hash)
  const end = hash
    ? sep ? sep + hash : '/' + toHash(hash)
    : ''
  return ('/' + fromPath(pathname) + end).replace(/ /g, '+').replace(/^\/+/, '/')
}

export const toPathHash = path => {
  if (path instanceof Array) {
    path = path.flat().join('/')
  }
  return ('/' + path).replace(/\/+/g, '/').replace(/\/$/, '')
}
// export const toPathHash = (path, sep='/#/') => {
//   if (path instanceof Array) {
//     path = path.flat().join('/')
//   }
//   const end = path.includes('#')
//     ? ('/' + toHash(fromHash(path))).replace('/#/', sep)
//     : ''
//     return ('/' + fromPath(path) + end
//     ).replace(/ /g, '+').replace(/^\/\//, '')
// }


export const plural = (prefix, count, pluralSuffix='s', singularSuffix='') =>
  prefix + (count === 1 ? singularSuffix : pluralSuffix)


// for iterating over list of functions, call each function with list of args
export const invoke = (...args) => f => f(...args)


export const range = (n_or_start:number, end:undefined|number=undefined, step:number=1) => {
  if (end === undefined) {
      end = n_or_start
      n_or_start = 0
  }
  return Array.from({ length: Math.floor((end - n_or_start) / step) }).map((_, i) => n_or_start + i*step)
}

export function group(array, n) {
  let i = 0
  const groups = []
  while (i < array.length) {
      groups.push(array.slice(i, i+n))
      i += n
  }
  console.debug(array, n, groups)
  return groups
}

export const originalSearch = new URLSearchParams(location.search)


/**
 * nice human-readable durations
 *
 * 0m 12s
 * 2m 12s
 * 4h 30m
 * 1d 12h
 * 1w 4d
 * 5mo 8d
 * 2y 5mo
 */
type formatDurationOptions = {
  short?: boolean
}
export const formatDuration = (s: number, options?: formatDurationOptions) => formatDurationMs(s * 1000, options)
export const formatDurationMs = (ms: number, options: formatDurationOptions = {}) => {
    const units = ['s', 'm', 'h', 'd', 'w', 'mo',   'y']
    const limit = [ 60,  60,  24,  7,   5,   12,     1e9]
    const scale = [ 60,  60,  24,  7,   365/7/12, 12, 1]

    // 2.25 => 2 .25*60 => 2 15

    let t = ms / 1000 // start with seconds
    const u_i = scale.findIndex((x, i) => {
        if (t < limit[i]) return true
        else t /= x
    })
    const primary = Math.floor(t)
    const secondary = !options.short && u_i && Math.floor(t%1 * scale[u_i - 1])
    return `${primary}${units[u_i]}` + (secondary ? ` ${secondary}${units[u_i - 1]}` : '')
}
window['formatDuration'] = formatDuration

export const formatPercent = (x, places=0) => `${Math.round(x * 100 * Math.pow(10, places))/Math.pow(10, places)}%`

/**
 * set root CSS vars, returns object of var() strings to reference
 */
const _cssVars = {}
const _cssVarsTag = document.createElement('style');
export const setCssVars = (object: { [key:string]: unknown }, app='') => {
  const vars = Object.entries(object).filter(e => e[0] !== '_')
  const prefix = app ? `--${app}-` : `--`
  vars.map(([k, v]) => {
    if (k[0] !== '_') _cssVars[prefix + k] = v
  })
  _cssVarsTag.textContent = `
  :root {
      ${Object.entries(_cssVars).map(([k, v]) => `${k}: ${v};`).join('\n')}
  }`
  document.body.appendChild(_cssVarsTag)
  console.debug(_cssVarsTag)

  const appVars = {}
  vars.map(([k]) => appVars[k] = `var(${prefix}${k})`)
  return appVars
}
export const getCssVar = (key: string, type='color') => {
  const match = /^var\((--.*)\)$/.exec(key)
  if (match) return _cssVars[match[1]] || (() => {
    const x = node(`<div style="${type}:${key}"></div>`)
    document.body.append(x)
    const v = getComputedStyle(x).getPropertyValue(type)
    x.remove()
    console.debug('GET CSS VAR', x)
    return v
  })()
  else return key
}

/**
 * mix transparent colors
 */
import Color from 'color';
import { parseSubdomain } from './page';
export const layerBackground = (...colors) =>
// colors are passed in bottom to top, but css is top to bottom
// bottom can be color, others must be linear-gradient to mix
// so reverse start of list & append first element
colors.slice(1).reverse().map(x => {
  try {
    const css = getCssVar(x)
    Color(css)
    // const mixable = css//Color(css).hex()
    // console.debug(css, mixable)
    return `linear-gradient(${x} 0 0)`
  } catch {
    return x // existing linear gradient?
  }
}).concat([colors[0]]).join(', ')

/**
 * Simple string hashing (non-cryptographic)
 */
export const hashString = str => {
  return str
    .split('')
    .map((l, i) => l.charCodeAt(0) * (i+1))
    .reduce((a, v) => a + v, 0) % 100_000_000
}

export const squash = (objects: anyFields[]): anyFields => Object.assign({}, ...objects)
export const pick = (object: anyFields, spaceDelimitedKeys: string): anyFields =>
  spaceDelimitedKeys.split(' ').reduce((o, k) => { o[k] = object[k]; return o }, {})
export const unpick = (object: anyFields, spaceDelimitedKeys: string): anyFields => {
  const result = { ...object }
  set(spaceDelimitedKeys).forEach(x => delete result[x])
  return result
}

/**
 * compose & pipe: function composition
 */
export const compose = (first: (...args: unknown[])=>unknown, ...rest: ((arg: unknown)=>unknown)[]) =>
  (...args) => rest.reduce((v, f) => f(v), first(...args))
export const pipe = (value: any, ...funcs: ((any) => any)[]): any => funcs.reduce((result, func) => func(result), value)
export const chain = pipe

export const getPath = () => (location.pathname+location.search+location.hash).replace(/^\/-\/?/, '/')
export const absolutePath = (path=getPath()) => path[0] === '/' ? location.origin + path : path


/**
 * deep object equality
 */
export const equal = (a, b) => {
  if (Array.isArray(a) && Array.isArray(b)) return a.every((x, i) => equal(x, b[i]))
  if (typeof(a) !== 'object' || typeof(b) !== 'object') return a === b
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every(k => Object.hasOwn(b, k) && equal(a[k], b[k]))
}

/**
 * find object key for value
 */
export const keyOf = (object: anyFields, value) => {
  return Object.keys(object).find(k =>
    JSON.stringify(object[k]) === JSON.stringify(value))
}

type matrix = any[][]
export const transposeMat = (matrix: matrix) => range(matrix[0].length).map(c => range(matrix.length).map(r => matrix[r][c]))
export const isMat = (data): data is matrix => Array.isArray(data) && Array.isArray(data[0])

export const isNonArrayObject = (x): x is anyFields => !Array.isArray(x) && typeof(x) === 'object'
export const isString = (x): x is string => typeof(x) === 'string'

export const list = <T,>(data:Iterable<T>|T[]|string=[], sep=' '): T[] => typeof data === 'string' ? data.split(sep) as T[] : Array.from(data) as T[]
export const set = <T,>(data:Iterable<T>|T[]|string=[], sep=' '): Set<T> => new Set(list(data, sep))
export const object = <T,>(data:Iterable<T>|T[]|string=[], sep=' '): {[key:string]:undefined} => Object.fromEntries(list(data, sep).map(x => [x, undefined]))

export const keys = (data:fields<any>|Iterable<any>|any[]|string=[], sep=' '): string[] => isNonArrayObject(data) ? list(Object.keys(data)) : list(data, sep)
export const values = <T extends any,>(data:fields<T>|Iterable<T>|T[]|string=[], sep=' '): T[] => isNonArrayObject(data) ? list(Object.values(data)) : list(data, sep)
export const entries = <T extends any,>(data:fields<T>|Iterable<T>|T[]|string=[], sep=' '): [string,T][] => {
  const vs = values(data, sep)
  return keys(data, sep).map((k,i) => [k, vs[i]])
}
export const from = <T extends any,>(data:fields<T>|Iterable<[string,T]>|[string, T][]|string=[], sep=' '): fields<T> => {
  if (isNonArrayObject(data)) return data as fields<T>
  if (isString(data)) return from(list(data, sep).map(x => [x,x]) as Iterable<couple<string>>) as fields<T>
  return Object.fromEntries((data as [string, T][]).filter(truthy))
}
export const zip = <T extends any,>(...x:T[][]) => Array.from(x[0]).map((_,i) => x.map(y => y[i]??undefined))
export const named = <T extends any,>(keys:Iterable<string>|string=[], values:Iterable<T>|T[]|string=[], sep=' '): fields<T> => {
  return from(zip<any>(list(keys, sep), list(values, sep)) as [string, T][])
}

export const sum = (ar: number[]): number => ar.reduce((sum, x) => sum+x, 0)
export const product = (ar: number[]): number => ar.reduce((product, x) => product*x, 1)
export const bounds = (ar: number[]): triplet<number> => (x => {x.push(x[1]-x[0]);return x as triplet<number>})([Math.min(...ar), Math.max(...ar)])
export const bound = (ar: number[], x: number) => (([min, max]) => Math.max(min, Math.min(x, max)))(bounds(ar))
export const norm = (ar: number[], x: number) => (([min, max]) => (bound(ar, x) - min) / (max - min))(bounds(ar))


/**
 * reverse mapping of values { a: 'b c d', e: 'f' } => { b: a, c: a, d: a, e: f }
 */
type mapping<T extends (key | Iterable<key>)> = fields<T>
export const transposeMap = <T extends key,>(data: mapping<string | Iterable<T>>): mapping<T> => {
  const out = {}
  Object.keys(data).forEach(k => {
    set(data[k]).forEach(x => out[x as key] = k)
  })
  return out
}
export const isMap = (data): data is mapping<key | Iterable<key>> => typeof(data) === 'object' // TODO better type check

export const transpose = <T,>(data: T): T => {
  // TODO remove if this isn't useful
  // but as long as type detection works, transpositions return the same type and can be conceptually grouped
  if (isMat(data)) return transposeMat(data) as unknown as T
  if (isMap(data)) return transposeMap(data as mapping<string | Iterable<any>>) as unknown as T // TODO avoid bad typecast
  throw 'unhandled transposition'
}

type sliceable = string | { length: number, slice: <T>(begin: number, end: number)=>T }
export const commonPrefix = <T extends sliceable>(a: T, b: T): T => {
  const max_len = Math.min(a.length, b.length)
  let end = 0
  while (end < max_len && a[end] === b[end]) end++
  return a.slice(0, end) as T
}

export const strToStyle = str => {
  if (typeof(str) !== 'string') return str
  const filtered = str.split('\n').map(x => x.replace(/(^| )\/\/.*/, '').trim()).join('')
  const colon = []
  let previous = 0
  for (let i = 0; i < filtered.length;) {
    let url = filtered.indexOf('url(', i)
    i = filtered.indexOf(':', i)
    if (url > -1 && i > url) {
      i = filtered.indexOf(':', filtered.indexOf(`)`, url))
    }
    if (i < 0) i = filtered.length
    if (filtered.slice(i - 4, i) === 'data') {
      i += 1
      continue
    } else {
      colon.push(filtered.slice(previous, i))
      i += 1
      previous = i
    }
  }
  if (str.includes('data')) console.debug('STYLE', colon)
  if (colon.length < 2) return {}

  const parts = [colon[0]]
  for (let i = 1; i < colon.length - 1; i++) {
    let j = colon[i].lastIndexOf(';')
    if (j < 0) j = colon[i].length
    parts.push(colon[i].slice(0, j))
    parts.push(colon[i].slice(j + 1))
  }
  parts.push(colon.slice(-1)[0])
  
  const rule = {}
  for (let i = 0; i < parts.length / 2; i++) {
    const j = i * 2
    const key = parts[j].trim()
    const value = parts[j+1].replace('!important', '').replace(/;$/, '').trim()

    let fixed = ''
    for (let i = 0; i < key.length; i++) {
      if (key[i] === '-') {
        i++
        fixed += key[i].toUpperCase()
      } else {
        fixed += key[i]
      }
    }
    rule[fixed] = value
  }
  if (str.includes('data')) console.debug('PARSED STYLES', str, colon, parts, rule)
  return rule
}
export const toStyle = strToStyle
export const S = toStyle
// export const toClass = obj => Object.keys(obj).filter(x => obj[x]).join(' ')
export const toClass = (o) => entries(o).map(([k, v]) => `${k}-${!!v} ${v ? k : ''}`).join(' ')


const container = document.createElement('div')
export const node = (contents: string): HTMLElement => {
  container.innerHTML = contents
  return container.children[0] as HTMLElement
}


if (!(Intl as any).supportedValuesOf) {
  const timeZones = [
    'Europe/Andorra',
    'Asia/Dubai',
    'Asia/Kabul',
    'Europe/Tirane',
    'Asia/Yerevan',
    'Antarctica/Casey',
    'Antarctica/Davis',
    'Antarctica/DumontDUrville',
    'Antarctica/Mawson',
    'Antarctica/Palmer',
    'Antarctica/Rothera',
    'Antarctica/Syowa',
    'Antarctica/Troll',
    'Antarctica/Vostok',
    'America/Argentina/Buenos_Aires',
    'America/Argentina/Cordoba',
    'America/Argentina/Salta',
    'America/Argentina/Jujuy',
    'America/Argentina/Tucuman',
    'America/Argentina/Catamarca',
    'America/Argentina/La_Rioja',
    'America/Argentina/San_Juan',
    'America/Argentina/Mendoza',
    'America/Argentina/San_Luis',
    'America/Argentina/Rio_Gallegos',
    'America/Argentina/Ushuaia',
    'Pacific/Pago_Pago',
    'Europe/Vienna',
    'Australia/Lord_Howe',
    'Antarctica/Macquarie',
    'Australia/Hobart',
    'Australia/Currie',
    'Australia/Melbourne',
    'Australia/Sydney',
    'Australia/Broken_Hill',
    'Australia/Brisbane',
    'Australia/Lindeman',
    'Australia/Adelaide',
    'Australia/Darwin',
    'Australia/Perth',
    'Australia/Eucla',
    'Asia/Baku',
    'America/Barbados',
    'Asia/Dhaka',
    'Europe/Brussels',
    'Europe/Sofia',
    'Atlantic/Bermuda',
    'Asia/Brunei',
    'America/La_Paz',
    'America/Noronha',
    'America/Belem',
    'America/Fortaleza',
    'America/Recife',
    'America/Araguaina',
    'America/Maceio',
    'America/Bahia',
    'America/Sao_Paulo',
    'America/Campo_Grande',
    'America/Cuiaba',
    'America/Santarem',
    'America/Porto_Velho',
    'America/Boa_Vista',
    'America/Manaus',
    'America/Eirunepe',
    'America/Rio_Branco',
    'America/Nassau',
    'Asia/Thimphu',
    'Europe/Minsk',
    'America/Belize',
    'America/St_Johns',
    'America/Halifax',
    'America/Glace_Bay',
    'America/Moncton',
    'America/Goose_Bay',
    'America/Blanc-Sablon',
    'America/Toronto',
    'America/Nipigon',
    'America/Thunder_Bay',
    'America/Iqaluit',
    'America/Pangnirtung',
    'America/Atikokan',
    'America/Winnipeg',
    'America/Rainy_River',
    'America/Resolute',
    'America/Rankin_Inlet',
    'America/Regina',
    'America/Swift_Current',
    'America/Edmonton',
    'America/Cambridge_Bay',
    'America/Yellowknife',
    'America/Inuvik',
    'America/Creston',
    'America/Dawson_Creek',
    'America/Fort_Nelson',
    'America/Vancouver',
    'America/Whitehorse',
    'America/Dawson',
    'Indian/Cocos',
    'Europe/Zurich',
    'Africa/Abidjan',
    'Pacific/Rarotonga',
    'America/Santiago',
    'America/Punta_Arenas',
    'Pacific/Easter',
    'Asia/Shanghai',
    'Asia/Urumqi',
    'America/Bogota',
    'America/Costa_Rica',
    'America/Havana',
    'Atlantic/Cape_Verde',
    'America/Curacao',
    'Indian/Christmas',
    'Asia/Nicosia',
    'Asia/Famagusta',
    'Europe/Prague',
    'Europe/Berlin',
    'Europe/Copenhagen',
    'America/Santo_Domingo',
    'Africa/Algiers',
    'America/Guayaquil',
    'Pacific/Galapagos',
    'Europe/Tallinn',
    'Africa/Cairo',
    'Africa/El_Aaiun',
    'Europe/Madrid',
    'Africa/Ceuta',
    'Atlantic/Canary',
    'Europe/Helsinki',
    'Pacific/Fiji',
    'Atlantic/Stanley',
    'Pacific/Chuuk',
    'Pacific/Pohnpei',
    'Pacific/Kosrae',
    'Atlantic/Faroe',
    'Europe/Paris',
    'Europe/London',
    'Asia/Tbilisi',
    'America/Cayenne',
    'Africa/Accra',
    'Europe/Gibraltar',
    'America/Godthab',
    'America/Danmarkshavn',
    'America/Scoresbysund',
    'America/Thule',
    'Europe/Athens',
    'Atlantic/South_Georgia',
    'America/Guatemala',
    'Pacific/Guam',
    'Africa/Bissau',
    'America/Guyana',
    'Asia/Hong_Kong',
    'America/Tegucigalpa',
    'America/Port-au-Prince',
    'Europe/Budapest',
    'Asia/Jakarta',
    'Asia/Pontianak',
    'Asia/Makassar',
    'Asia/Jayapura',
    'Europe/Dublin',
    'Asia/Jerusalem',
    'Asia/Kolkata',
    'Indian/Chagos',
    'Asia/Baghdad',
    'Asia/Tehran',
    'Atlantic/Reykjavik',
    'Europe/Rome',
    'America/Jamaica',
    'Asia/Amman',
    'Asia/Tokyo',
    'Africa/Nairobi',
    'Asia/Bishkek',
    'Pacific/Tarawa',
    'Pacific/Enderbury',
    'Pacific/Kiritimati',
    'Asia/Pyongyang',
    'Asia/Seoul',
    'Asia/Almaty',
    'Asia/Qyzylorda',
    'Asia/Qostanay',
    'Asia/Aqtobe',
    'Asia/Aqtau',
    'Asia/Atyrau',
    'Asia/Oral',
    'Asia/Beirut',
    'Asia/Colombo',
    'Africa/Monrovia',
    'Europe/Vilnius',
    'Europe/Luxembourg',
    'Europe/Riga',
    'Africa/Tripoli',
    'Africa/Casablanca',
    'Europe/Monaco',
    'Europe/Chisinau',
    'Pacific/Majuro',
    'Pacific/Kwajalein',
    'Asia/Yangon',
    'Asia/Ulaanbaatar',
    'Asia/Hovd',
    'Asia/Choibalsan',
    'Asia/Macau',
    'America/Martinique',
    'Europe/Malta',
    'Indian/Mauritius',
    'Indian/Maldives',
    'America/Mexico_City',
    'America/Cancun',
    'America/Merida',
    'America/Monterrey',
    'America/Matamoros',
    'America/Mazatlan',
    'America/Chihuahua',
    'America/Ojinaga',
    'America/Hermosillo',
    'America/Tijuana',
    'America/Bahia_Banderas',
    'Asia/Kuala_Lumpur',
    'Asia/Kuching',
    'Africa/Maputo',
    'Africa/Windhoek',
    'Pacific/Noumea',
    'Pacific/Norfolk',
    'Africa/Lagos',
    'America/Managua',
    'Europe/Amsterdam',
    'Europe/Oslo',
    'Asia/Kathmandu',
    'Pacific/Nauru',
    'Pacific/Niue',
    'Pacific/Auckland',
    'Pacific/Chatham',
    'America/Panama',
    'America/Lima',
    'Pacific/Tahiti',
    'Pacific/Marquesas',
    'Pacific/Gambier',
    'Pacific/Port_Moresby',
    'Pacific/Bougainville',
    'Asia/Manila',
    'Asia/Karachi',
    'Europe/Warsaw',
    'America/Miquelon',
    'Pacific/Pitcairn',
    'America/Puerto_Rico',
    'Asia/Gaza',
    'Asia/Hebron',
    'Europe/Lisbon',
    'Atlantic/Madeira',
    'Atlantic/Azores',
    'Pacific/Palau',
    'America/Asuncion',
    'Asia/Qatar',
    'Indian/Reunion',
    'Europe/Bucharest',
    'Europe/Belgrade',
    'Europe/Kaliningrad',
    'Europe/Moscow',
    'Europe/Simferopol',
    'Europe/Kirov',
    'Europe/Astrakhan',
    'Europe/Volgograd',
    'Europe/Saratov',
    'Europe/Ulyanovsk',
    'Europe/Samara',
    'Asia/Yekaterinburg',
    'Asia/Omsk',
    'Asia/Novosibirsk',
    'Asia/Barnaul',
    'Asia/Tomsk',
    'Asia/Novokuznetsk',
    'Asia/Krasnoyarsk',
    'Asia/Irkutsk',
    'Asia/Chita',
    'Asia/Yakutsk',
    'Asia/Khandyga',
    'Asia/Vladivostok',
    'Asia/Ust-Nera',
    'Asia/Magadan',
    'Asia/Sakhalin',
    'Asia/Srednekolymsk',
    'Asia/Kamchatka',
    'Asia/Anadyr',
    'Asia/Riyadh',
    'Pacific/Guadalcanal',
    'Indian/Mahe',
    'Africa/Khartoum',
    'Europe/Stockholm',
    'Asia/Singapore',
    'America/Paramaribo',
    'Africa/Juba',
    'Africa/Sao_Tome',
    'America/El_Salvador',
    'Asia/Damascus',
    'America/Grand_Turk',
    'Africa/Ndjamena',
    'Indian/Kerguelen',
    'Asia/Bangkok',
    'Asia/Dushanbe',
    'Pacific/Fakaofo',
    'Asia/Dili',
    'Asia/Ashgabat',
    'Africa/Tunis',
    'Pacific/Tongatapu',
    'Europe/Istanbul',
    'America/Port_of_Spain',
    'Pacific/Funafuti',
    'Asia/Taipei',
    'Europe/Kiev',
    'Europe/Uzhgorod',
    'Europe/Zaporozhye',
    'Pacific/Wake',
    'America/New_York',
    'America/Detroit',
    'America/Kentucky/Louisville',
    'America/Kentucky/Monticello',
    'America/Indiana/Indianapolis',
    'America/Indiana/Vincennes',
    'America/Indiana/Winamac',
    'America/Indiana/Marengo',
    'America/Indiana/Petersburg',
    'America/Indiana/Vevay',
    'America/Chicago',
    'America/Indiana/Tell_City',
    'America/Indiana/Knox',
    'America/Menominee',
    'America/North_Dakota/Center',
    'America/North_Dakota/New_Salem',
    'America/North_Dakota/Beulah',
    'America/Denver',
    'America/Boise',
    'America/Phoenix',
    'America/Los_Angeles',
    'America/Anchorage',
    'America/Juneau',
    'America/Sitka',
    'America/Metlakatla',
    'America/Yakutat',
    'America/Nome',
    'America/Adak',
    'Pacific/Honolulu',
    'America/Montevideo',
    'Asia/Samarkand',
    'Asia/Tashkent',
    'America/Caracas',
    'Asia/Ho_Chi_Minh',
    'Pacific/Efate',
    'Pacific/Wallis',
    'Pacific/Apia',
    'Africa/Johannesburg'
  ]
  ;(Intl as any).supportedValuesOf = (key: string) => {
    if (key.toLowerCase() === 'timezone') return timeZones
    throw 'unsupported'
  }
}

export const named_log = (name) => (...x) => console.debug('['+name+']', ...x)
export const logged_handle = <T,>(handle:T, log=console.debug):T => {
  return from(entries(handle as any).map(([k, v]) => [k, (...x) => {
    log(k, x)
    const result = (v as any)(...x)
    log(k, 'return', result)
    return result
  }] as [string, any])) as T
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


export const eventToRelative = (e, reference) => {
  const rect = reference.getBoundingClientRect()
  console.debug('eventToRelative', rect, reference)
  const absolute = {
    x: e.clientX,
    y: e.clientY,
  }
  const relative = {
    x: absolute.x - rect.x,
    y: absolute.y - rect.y,
  }
  const normalize = ({x,y})=>({
    x: x / (rect.width||1),
    y: y / (rect.height||1),
  })
  const bounded = {
    x: Math.max(0, Math.min(relative.x, rect.width)),
    y: Math.max(0, Math.min(relative.y, rect.height)),
  }
  return {
    ...relative,
    normalized: normalize(relative),
    bounded,
    normalized_bounded: normalize(bounded),
    absolute,
  }
}
