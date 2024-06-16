// replace url & header without reloading page

import React, { Fragment } from "react"
import { useHistory } from 'react-router-dom'
import { openFrame } from "../components/Modal"
import console from "./console"
import { useF } from "./hooks"
import page, { parseLogicalPath, parseSubpath } from "./page"
import { trigger } from "./trigger"
import { action, supplier } from "./types"
import { getPath, isMobile } from "./util"


const historyFuncs: any = {
    push: history.pushState.bind(history),
    replace: history.replaceState.bind(history),
}

let _isReactRouterHistory = false
const _undo: [string, supplier<boolean>][] = []
const _base = path => parseSubpath(path.replace(/^\/?(-?)\/?/g, '/')) // parse subpath
const _clean = path => parseSubpath(path.replace(/^\/?(-?)\/?/g, '/$1')) // parse subpath but preserve '-'
let _reactRouterHistory = {
    replace: path => historyFuncs.replace(0, 0, path),
    push: path => historyFuncs.push(0, 0, path),
}
const _to = (push, path, silent=false) => {
    const args: [any, string, string] = [null, '', _clean(path)]
    silent && console.debug('SILENT', args)
    silent
    ? historyFuncs.replace(...args)
    : push
        ? history.pushState(...args)
        : history.replaceState(...args)
}

const url = Object.assign(trigger.value(getPath(), { name: 'url' }), {
    replace: path => _to(false, path),
    push: path => _to(true, path),
    to: (isPush, path) => _to(isPush, path),
    silent: path => _to(false, path, true),
    external: path => window.open(path, '_self'),
    popup: (path, rect=undefined) => isMobile ? url.new(path) : window.open(path, '_blank', rect ? `propup,width=${rect.width},height=${rect.height},left=${rect.left},top=${rect.top}` : `popup`),
    new: path => window.open(path, '_blank'),

    frame: path => openFrame({ href: path }),

    // back: (n=1): action => {
    //     // pop N url changes but return action to return to current href
    //     const currHref = location.href
    //     let anyPush = false
    //     while (n && _undo.length) anyPush = _undo.pop()[1]()
    //     return () => url.to(anyPush && false, currHref)
    // },
    // last: (n=1, base?): string => {
    //     const item = _undo.at(-n)
    //     return item ? parseLogicalPath(item[0]) : base || '/search'
    // },

    // hook into react-router-dom so updates here are reflected in router (it ignores events otherwise)
    // this is an element (rather than just a hook) so it can live under the Router
    GlobalHistoryHook: () => {
        const history = useHistory()
        useF(() => _reactRouterHistory = history)
        return <></>
    }
})
url.add((newValue, oldValue) => {
    console.trace('URL', oldValue, '=>', newValue), true
})

// dispatch events on push/replace
// modified from stackoverflow.com/questions/6390341#52809105
// I'll probably keep using the manual triggers I've defined, but this is an alternative
const interceptHashChangeOrPath = (path) => {
    const prev = getPath()
    const prevNonHash = prev.replace(/\/?#.*/, '')
    const pathNonHash = path.replace(/\/?#.*/, '')
    console.debug(prevNonHash, pathNonHash, prevNonHash === pathNonHash)
    if (path[0] === '#' || prevNonHash === pathNonHash) {
        // intercept path change and just set hash instead
        location.hash = path.replace(pathNonHash, '').replace(/^\//, '')
        return false
    } else return prev
}
history.pushState = function(...args) {
    console.debug('PUSH', ...args)
    const path = args[2]
    page.load(path).then(() => {
        const prev = interceptHashChangeOrPath(path)
        if (prev === false) return

        historyFuncs.push.apply(this, args)
        if (!_isReactRouterHistory) {
            _isReactRouterHistory = true
            _reactRouterHistory.push(path)
            _isReactRouterHistory = false
            window.dispatchEvent(new Event('pushstate'))
            window.dispatchEvent(new Event('locationchange'))
            // _undo.push([prev, () => { history.back(); return true }])
            url.set(getPath())
        }
    })
}
history.replaceState = function(...args) {
    _isReactRouterHistory || console.debug('REPLACE', ...args)
    const path = args[2]
    page.load(path).then(() => {
        const prev = interceptHashChangeOrPath(path)
        console.debug(prev)
        if (prev === false) return

        historyFuncs.replace.apply(this, args)
        if (!_isReactRouterHistory) {
            _isReactRouterHistory = true
            _reactRouterHistory.replace(path)
            _isReactRouterHistory = false
            window.dispatchEvent(new Event('replacestate'))
            window.dispatchEvent(new Event('locationchange'))
            // _undo.push([prev, () => {
            //     historyFuncs.replace.apply(this, [0, 0, prev])
            //     return false
            // }])
            console.debug('REPLACE SET', prev, path)
            url.set(getPath())
        }
    })
}
window.addEventListener('popstate', e => {
    // special handling of back button to ensure Router & url util are handled correctly
    const path = getPath()
    console.debug('URL POPSTATE', path, e)
    page.load(path).then(() => {
        historyFuncs.replace.call(this, null, '', path)
        window.dispatchEvent(new Event('locationchange'))
        url.set(getPath())
    })
})
// window.addEventListener('hashchange', () => url.set(getPath()))

window['_url'] = url

export default url
