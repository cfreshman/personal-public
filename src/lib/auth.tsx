import React from 'react'
import { closePopups, openPopup } from '../components/Modal';
import api, { auth } from './api';
import { addStyle, useE, useI, useR, useStyle } from './hooks';
import { store } from './store';

const _openLogin = (dropdown:true|'signup'|'email'=true) => {
    auth.set(Object.assign({}, auth.get(), { dropdown }))
    closePopups()
}
window['openLogin'] = _openLogin
export const openLogin = (dropdown:true|'signup'|'email'=true) => (window as any).openLogin(dropdown)

export const useHideLogin = (hidden=true) => {
    useE(() => {
        auth.set({ ...auth.get(), hidden })
        return () => auth.set({ ...auth.get(), hidden: false })
    })
}

export const useHideExpandedControls = (hidden=undefined) => {
    useHideLogin(hidden??false)
    useStyle(hidden ? `
    #header .nav > .dropdown-container {
        display: none !important;
    }
    ` : '')
}

export type expandPlacement = 'top-left'|'top-right'|'bottom-left'|'bottom-right'
let _removeExpandPlacement
const setExpandPlacement = window['setExpandPlacement'] = (corner: expandPlacement='bottom-right') => {
    if (_removeExpandPlacement) _removeExpandPlacement()
    _removeExpandPlacement = addStyle(`
    #toggle-expand.expand-true {
        top: unset !important;
        bottom: unset !important;
        left: unset !important;
        right: unset !important;
        ${corner.includes('top') ? 'top' : 'bottom'}: 0.4rem !important;
        ${corner.includes('left') ? 'left' : 'right'}: 0.4rem !important;
    }`)
    return _removeExpandPlacement
}
export const useExpandPlacement = (corner: expandPlacement) => useE(setExpandPlacement(corner))

export const useBasicDropdown = (basic=true) => {
    useI(() => auth.set({ ...auth.get(), basic }))
    auth.use(value => {
        if (basic !== value.basic) {
            auth.set({ ...value, basic })
            setTimeout(() => auth.set({ ...value, basic })) // hack
        }
    })
    useE(() => () => auth.set({ ...auth.get(), basic: false }))
}

// open a page in expanded view on first page load e.g. /follow-sync
// TODO repeat until user exits fullscreen
export const useExpand = (expand=location.pathname.startsWith('/-')||window!==top?true:false) => {
    const expanded = store.local.get('auth-expanded', x => undefined)
    useE(() => {
        console.debug('EXPAND?', expanded)
        if (expand !== expanded) {
            store.local.set('auth-expanded', true)
            const value = { ...auth.get() }
            auth.set({ ...value, expand })
            return () => auth.set(value)
        }
    })
}

export const usePopup = (popup:boolean|string=true) => {
    useE(popup, () => auth.set({ ...auth.get(), popup }))
    // useI(() => auth.set({ ...auth.get(), popup }))
    // auth.use(value => {
    //     if (popup !== value.basic) {
    //         auth.set({ ...value, popup })
    //         // setTimeout(() => auth.set({ ...value, popup })) // hack
    //     }
    // })
    // useE(() => () => auth.set({ ...auth.get(), popup: false }))
}

// re-export api auth value
const { signup, login, token, logout } = api
export {
    auth, signup, login, token, logout
}
