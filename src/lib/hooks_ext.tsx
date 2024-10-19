import React, { Component, lazy, Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import api from './api';
import { auth, expandPlacement, useBasicDropdown, useExpand, useExpandPlacement, useHideExpandedControls, useHideLogin, usePopup } from './auth';
import { addStyle, useCached, useDomains, useE, useEventListener, useF, useHideFooter, useM, useR, useRerender, useS, useScript, useStyle, useTimeout } from './hooks';
import { meta } from './meta';
import { parseLogicalPath, parsePage, parseSubdomain, parseSubpage, parseSubpath } from './page';
import { store } from './store';
import url from './url';
import user from './user';
import { dev, duration, fromHash, fromPath, getCssVar, keys, toPath, unpick } from './util';
import { hex, hexToHsl, readable_text } from './color';
import { InfoSection } from 'src/components/Info';
import { props } from './types';

const { colors } = window as any


export const useStored = (key, initial=undefined) => {
    const [value, setValue] = useState(store.get(key) ?? initial)
    useE(key, () => store.add(key, setValue))
    return [value, newValue => store.set(key, newValue)]
}

// keeping for simplicity / backwards compatability
export const useAuth = () => {
    const [value] = auth.use()
    return value
}

export const useProject = () => {
    const subdomain = `/${useSubdomain()}`
    const [path] = usePathState({
        prefix: '',
        readonly: true,
    })
    const project = useM(path,
        () => decodeURIComponent(path || subdomain).split('/').filter(p => p && p !== 'projects')[0])

    return project
}

export const setBackground = (background:string, embedded=false) => {
    const [h, s, l] = hexToHsl(hex(getCssVar(background)))
    console.debug('set background', {background, hex:hex(background), hsl:{h,s,l}})
    return addStyle(background ? background.includes('linear-gradient') ? `
    :root {
        --id-color: ${background};
    }
    ` : `
    :root {
        --set-background: "${background}";
        --id-color-h: ${h}deg;
        --id-color-s: ${s}%;
        --id-color-l: ${l}%;
        --id-color-d: ${l < 40 ? 0 : 100}%;
    }
    `:'')
    // return addStyle(background ? `
    // #header, #main, #header .dropdown, .expand-true #toggle-expand, .expand-true #profile-menu {
    //     background: ${background} !important;
    // }
    // #main > * {
    //     background: transparent;
    // }
    // #header {
    //     z-index: 100100100;
    //     // ${embedded ? 'padding:0.125em;':''}
    // }
    // #header :not(img, :has(img)) {
    //     // color: #fff;
    //     // mix-blend-mode: difference;
    //     // background: transparent;
    // }
    // #header div#home {
    //     background: #fff !important;
    //     mix-blend-mode: difference;
    //     border: .25em solid #000 !important;
    //     border-radius: 50% !important;
    //     margin-right: 0 !important;
    // }
    // #home::before, #home::after {
    //     display: none;
    // }
    // ` : '')
}
export const useBackground = (background) => {
    useE(background, () => [
        setBackground(background),
        // meta.theme_color.set(background),
    ])
}
let prev_text_color_revert
export const setTextColor = (text_color) => {
    if (prev_text_color_revert) prev_text_color_revert()
    prev_text_color_revert = addStyle(text_color ? `
    :root {
        --id-color-text: ${text_color};
        --id-color-text-readable: ${colors.hex_readable(hex(text_color))};
    }
    `:'')
    return prev_text_color_revert
}
export const useTextColor = (text_color) => {
    useE(text_color, () => setTextColor(text_color))
}

export const useTransparentHeader = (use=true, invert=false) => {
    const [{ expand }] = auth.use()
    console.debug('transparent header', { use, invert, expand }, use && !expand)
    useStyle(use && !expand ? `
    #header {
        background: transparent;
        // pointer-events: none;
        z-index: unset !important;
        position: relative;
    }
    #header::after {
        position: absolute;
        top: -4px;
        left: 0;
        height: calc(100% + 4px + 3px) !important;
        width: 100%;
        box-sizing: border-box;
        content: "";
        display: block;
        z-index: 1;
        backdrop-filter: contrast(0.67) blur(2px) brightness(0.67);
        border-bottom: 1px dashed var(--id-color-text-readable);

        backdrop-filter: blur(4px);
        border-bottom: 1px dashed var(--id-color-text);
    }
    #header .user, #header .user *, #header .nav * {
        z-index: 2;
        // pointer-events: all;
    }
    #header .dropdown {
        background: white;
        // position: relative;
        border: 1px solid currentColor;
        overflow: hidden;
    }
    #header#header .dropdown, #header * {
    }
    #main {
        margin-top: -2em;
    }
    .nav > *:not(#projects), #header .user, #header .user .dropdown-label {
        mix-blend-mode: difference !important;
        color: #fff !important;
    }
    #home {
        position: relative;
    }
    #home::after {
        content: "";
        position: absolute; top: 0; left: 0; height: 100%; width: 100%; border-radius: inherit;
        background: #fff;
    }
    ` : '')
}

export const useCheckin = (page:string|boolean=true) => {
    const [auth_object] = auth.use()
    const project = useProject()

    useF(
        auth_object.user, page, project,
        () => {
            const checkin = page === true ? project : page
            if (checkin) {
                auth_object.user && page && api.post(`profile/checkin/${checkin}`.replace(/\/+/, '/')).then(() => user.profile.refresh())
            }
        })
}
export const usePageSettings = ({ checkin, background, text_color, professional, hideLogin, hideExpandedControls, hideFooter, basicDropdown, expand, expandPlacement, domains, title, icon, expandStyle, transparentHeader, invertHeader, popup, uses }: {
    checkin?: string | boolean,
    background?: string, text_color?: string, professional?: boolean,
    hideLogin?: boolean, hideExpandedControls?: boolean,
    hideFooter?: boolean,
    basicDropdown?: boolean,
    expand?: boolean,
    expandPlacement?: expandPlacement,
    domains?: string[],
    title?: string,
    icon?: string,
    expandStyle?: string,
    transparentHeader?: boolean, invertHeader?: boolean,
    popup?: string | boolean,
    uses?: typeof meta.uses.value,
}={}) => {
    useCheckin(checkin)
    const [{ user:viewer }] = auth.use()
    const used_background = background ?? ((professional || !viewer) && '#eeebe6')
    useBackground(used_background)
    // useE(background, () => (x => x && meta.theme_color.set(x) && (() => meta.theme_color.set(`var(--id-color)`)))(used_background))
    // useE(background, () => (x => x && meta.theme_color.set(x) && (() => meta.theme_color.set(`var(--id-color)`)))(background ?? ((professional || !auth_user) && '#eeebe6')))
    useTextColor(text_color)
    useHideLogin(hideLogin ?? false)
    useHideExpandedControls(hideExpandedControls)
    useHideFooter(hideFooter ?? false)
    useBasicDropdown(basicDropdown ?? false)
    useExpand(expand ?? undefined)
    useExpandPlacement(expandPlacement)
    useDomains(domains)
    useE(title, () => title && meta.title.set(title))
    useE(icon, () => icon && meta.icon.set(icon))
    useTransparentHeader(transparentHeader ?? false, invertHeader ?? false)
    usePopup(popup ?? false)
    useE(() => uses && meta.uses.set(uses))

    const [{ expand:pageExpand }] = auth.use()
    useStyle(pageExpand, pageExpand ? expandStyle ?? '' : '')

    // rerender ~1s after page load apparently (to fix transparent header not showing correctly)
    useF(() => {
        if (transparentHeader) {
            setTimeout(() => {
                const _auth = auth.get()
                auth.set({ ..._auth, expand:!_auth.expand })
                auth.set({ ..._auth })
            })
        }
    })
}

export const useSubdomain = () => parseSubdomain() // not an actual hook, won't change
export const useSubpath = (pathname=undefined) => url.as(() => parseSubpath(pathname))[0]
export const useLogicalPath = (pathname=undefined) => url.as(() => parseLogicalPath(pathname))[0]
export const usePage = (pathname=undefined) => url.as(() => parsePage(pathname))[0]
export const useSubpage = (pathname=undefined) => url.as(() => parseSubpage(pathname))[0]

export const useSublocation = () => {
    const location = useLocation()
    const subdomain = useSubdomain()

    const update = location => Object.assign({}, location, {
        pathname: `${subdomain}${location.pathname}`
    })
    const [value, setValue] = useState(update(location))
    useF(location, () => setValue(update(location)))

    return value;
}

export const useSub = () => {
    return useSublocation().pathname.replace(/\/$/, '')
}

// export const usePath = (isPush, ...props) => {
//     const func = props.pop()
//     useF(...props, () => url
//         window.history[(isPush ? 'push' : 'replace')+'State'](0, '', func()))
// }
export const useHash = ({ sep=undefined, push=false }, ...props) => {
    const func = props.pop()
    useF(...props, () => url.to(push, toPath(location.pathname, func(), sep)))
}
export const useHashState = ({
    empty='',
    sep=undefined,
    push=false,
    from=h=>h,
    to=v=>v,
    readonly=false,
}={}) => {
    const _from = () => from(fromHash()) || empty
    const [value, setValue] = useState(_from())
    const initialized = useR(false)
    useF(value, () => {
        readonly || url.to(initialized.current && push, toPath(location.pathname, to(value), sep))
        initialized.current = true
    })
    useEventListener(window, 'hashchange', e => setValue(_from()))
    url.use(() => setValue(_from()))
    return [value, newValue => {
        if (readonly) throw 'this hash state is readonly'
        setValue(newValue)
    }]
}

export const usePathState = ({
    prefix=undefined,
    empty='',
    push=false,
    from=h=>h,
    to=v=>v,
    readonly=false,
    sep=undefined,
}={}) => {
    // if undefined, use first slash as page
    prefix = fromPath(prefix ?? parseLogicalPath().split('/').filter(p=>p)[0])
    const _from = (path=fromPath(parseLogicalPath())) => (
        fromPath(path).startsWith(prefix)
        ? from(fromPath(path.replace(prefix, ''))) || empty
        : undefined)

    const [value, setValue] = useState(_from())
    const initialized = useR(false)
    useF(value, () => {
        readonly || url.to(initialized.current && push, toPath([prefix, to(value)], location.hash, sep))
        initialized.current = true
    })
    url.use(() => {
        const value = _from()
        if (value !== undefined) setValue(value)
    })
    return [value, newValue => {
        if (readonly) throw 'this path state is readonly'
        setValue(newValue)
    }]
}

export const usePathHashState = ({
    prefix=undefined,
    push=false,
    from=(p, h)=>[p, h],
    to=([p, h])=>[p, h],
    readonly=false,
    sep=undefined,
}:{
    prefix?: string,
    push?: boolean,
    from?: (p:string, h:string)=>any,
    to?: (v:any)=>[any, any],
    readonly?: boolean,
    sep?: string,
}={}) => {
    // if undefined, use first slash as page
    prefix = fromPath(prefix ?? parseLogicalPath().split('/').filter(p=>p)[0])
    const _from = (path=fromPath(parseLogicalPath()), hash=fromHash()) =>
        fromPath(path).startsWith(prefix)
        ? from(fromPath(path.replace(prefix, '')), fromHash(hash))
        : undefined

    const [value, setValue]: any[] = useState(_from())
    const initialized = useR(false)
    useF(value, () => {
        if (!readonly) {
            const [path, hash] = to(value)
            url.to(initialized.current && push, toPath([prefix, path], hash, sep))
        }
        initialized.current = true
    })
    // useEventListener(window, 'hashchange', e => readonly || setValue(_from()))
    url.use(() => {
        const value = _from()
        if (value !== undefined) setValue(value)
    })
    return [value, newValue => {
        if (readonly) throw 'this hash state is readonly'
        setValue(newValue)
    }]
}






export const useTypedPathState = <T,>({
    from, to,
    prefix=undefined,
    empty='',
    push=false,
    readonly=false,
    sep=undefined,
}:{
    from: (path:string)=>T,
    to: (value:T)=>string,
    prefix?, empty?, push?, readonly?, sep?
}):[T,(T)=>void] => {
    // if undefined, use first slash as page
    prefix = fromPath(prefix ?? parseLogicalPath().split('/').filter(p=>p)[0])
    useF('PATH STATE PREFIX', prefix, fromPath(parseLogicalPath()), console.debug)
    const _from = (path=fromPath(parseLogicalPath())) => (
        fromPath(path).startsWith(prefix)
        ? from(fromPath(path.replace(prefix, ''))) || empty
        : undefined)

    const [value, setValue] = useState(useM(_from))
    const initialized = useR(false)
    useF(JSON.stringify(value), () => {
        readonly || url.to(
            initialized.current && push,
            toPath([prefix, to(value)], location.hash, sep))
        initialized.current = true
    })
    url.use(() => {
        const value = _from()
        console.debug('URL SET', value)
        if (value !== undefined) setValue(value)
    })
    return [value, newValue => {
        if (readonly) throw 'this path state is readonly'
        setValue(newValue)
    }]
}
export const useTypedPathHashState = <T,>({
    from, to,
    prefix=undefined,
    empty='',
    push=false,
    readonly=false,
    sep=undefined,
}:{
    from: (path:string, hash:string)=>T,
    to: (value:T)=>[string, string],
    empty?: string,
    prefix?: string,
    push?: boolean,
    readonly?: boolean,
    sep?: string,
}):[T,(T)=>void] => {
    // if undefined, use first slash as page
    prefix = fromPath(prefix ?? parseLogicalPath().split('/').filter(p=>p)[0])
    const _from = (path=fromPath(parseLogicalPath()), hash=fromHash()) =>
        fromPath(path).startsWith(prefix)
        ? from(fromPath(path.replace(prefix, '')), fromHash(hash))
        : undefined

    const [value, setValue] = useState(_from())
    const initialized = useR(false)
    useF(value, () => {
        if (!readonly) {
            const [path, hash] = to(value)
            url.to(initialized.current && push, toPath([prefix, path], hash, sep))
        }
        initialized.current = true
    })
    url.use(() => {
        const value = _from()
        if (value !== undefined) setValue(value)
    })
    return [value, newValue => {
        if (readonly) throw 'this hash state is readonly'
        setValue(newValue)
    }]
}


export const useSupporter = () => {
    const [{ user }] = auth.use()
    const [cost]: any = useCached('cost/month', () => api.get('cost/month'))
    return cost?.supporters?.includes(user)
}


export const useTabbed = (options:{[key:string]:any}, initial:string=keys(options)[0], props:{[key:string]:any}={labels:[]}) => {
    const [tab, setTab] = useS(initial)
    const display =
    <InfoSection {...unpick(props, 'options initial')} labels={keys(options).map(k => tab === k ? k : {
        [k]: () => setTab(k),
    }).concat(props.labels)}>
        {options[tab]}
    </InfoSection>

    return [tab, setTab, display]
}
export const setTabbed = ({
    options,
    value=keys(options)[0], initial=value,
    labels=[],
    setValue,
    subpath=true,
    ...props
}: props&{
    options:{[key:string]:any},
    initial?:string,
    subpath?:boolean,
}) => {
    const [tab, setTab, display] = useTabbed(options, value ?? initial, {labels,...props}) as [string,any,any]
    if (useM(() => subpath)) {
        const prefix = useM(() => typeof(subpath) === 'string' ? subpath : parsePage())
        const [_tab, _setTab] = usePathState({
            prefix,
            to: () => tab === initial ? '' : tab,
            from: x => x || initial,
            sep: '#',
        })
        useF(() => setTab(_tab))
        useF(value, setTab)
        useF(tab, _setTab)
        useF(tab, setValue)
    }
    return [tab, setTab, display] as [string, any, JSX.Element]
}
export const Tabbed = ({
    options,
    value=keys(options)[0], initial=value,
    labels=[],
    setValue,
    subpath=true,
    ...props
}: props&{
    options:{[key:string]:any},
    initial?:string,
    subpath?:boolean,
}) => {
    return setTabbed({ options, value, labels, setValue, subpath, ...props })[2]
}



export const useCachedScript = (src, on_load=undefined) => {
    const [{script=undefined,expire=0}={}, cacheScript] = store.local.use(`use-cached-script-${encodeURIComponent(src)}`)
    const [loaded, setLoaded] = useS(false)
    useF(script, expire, () => 
        (!script || (dev && !loaded) || expire < Date.now())
        && fetch(src).then(r=>r.text()).then(script => {
            setLoaded(true)
            cacheScript({ script, expire: Date.now() + duration({ d: 1 }) })
        }))
    useScript(script, true)
    useF(script, () => script && on_load && on_load())
    return script
}



export const useSave = (handler) => {
    useEventListener(window, 'keydown', e => {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handler()
      }
    })
}
