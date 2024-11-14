import React, { Suspense, useState } from 'react';
import styled from 'styled-components';
import { auth, useExpand, useExpandPlacement, useHideLogin } from '../lib/auth';
import { cleanTimeout, useE, useEventListener, useF, useI, useInterval, useM, useR, useStyle, useTimeout, renderFunction } from '../lib/hooks';
import { defaultIcon, meta } from '../lib/meta';
import page, { parseLogicalPath, parseParts, parseSubdomain } from '../lib/page';
import url from '../lib/url';
import { dev, merge, on, server, set, toStyle } from '../lib/util';
import { projects } from '../lib/projects';

import { ErrorBoundary } from './ErrorBoundary';
import { JSX, pass } from '../lib/types';
import { Loader } from './Info';
import { setBackground, usePageSettings, useTransparentHeader } from '../lib/hooks_ext';
import { setOuterWidth, useShrink } from '../lib/shrink';

const { named_log } = window
const log = named_log('Contents')

const Fallback = styled.div`
    width: 100%;
    // color: var(--light);
    // background: #131125;
`

const IFrameStyle = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    &.loading {
        // background: #131125;
    }
    & iframe {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
    }
`

export const Loading = ({ ms }) => {
    const [show, setShow] = useState(false);
    useTimeout(() => setShow(true), ms || 500);
    return (
        <Fallback className="centering seamless loading">
            {show ? <Loader invert /> : ''}
        </Fallback>);
}
export const Missing = ({ loaded }) => {
    loaded && loaded()
    return <Fallback className="centering seamless">
        {page.loading()
        ?
        <>
            {/* <Loader /> */}
            loading
        </>
        :
        <p>?</p>
        // <p style={toStyle(`
        // // mix-blend-mode: difference;
        // color: #000;
        // `)}>
        //     nothing to see here
        //     <br/><br/>
        //     [ <a onClick={e => history.back()}>back</a> ]
        // </p>
        }
    </Fallback>;
}

const nonProjects = set('home about projects contents')
const staticProjects = set('paths')
const ignore_embedded = set('chess')
const failedImport = set()
export const Page = ({ loaded, override }) => {
    // actual page loading is handled inline with url changes (see url.tsx, page.tsx)
    // then we import the same page here for display

    const [path] = page.loadTriggerValue.use()
    // useF(path, () => alert(path))
    // useE(path, () => meta.title.set(parseLogicalPath()))

    const [subdomainSubpage, setSubdomainSubpage] = useState(false)
    useF(path, () => setSubdomainSubpage(false))

    // parse page ID (file/folder name)
    const id = useM(path, override, subdomainSubpage, () => {
        console.debug('PARSE ID', path, override, subdomainSubpage)

        if (override) return override
        const parts = parseParts(2, path.replace(/#.*/, ''))
        console.debug('PARSE ID', location.href, path, subdomainSubpage, parts, parseSubdomain(), parts[0]?.replace(parseSubdomain(), ''))
        return (
            parts[0] === 'misc' ? parts.join('/') : 
            subdomainSubpage && parts[0] === parseSubdomain() ? parts[1] : 
            parts[0] ?? '')
    })
    useE(id, () => {
        console.debug('PAGE ID', id, path)
        projects[id] && meta.description.set(projects[id][1])
        // meta.icon.set()
        meta.title.set(parseSubdomain() === id ? id+'.' : '/'+id)
    })

    // use embedded page if it exists
    const [embedded] = meta.embedded.use()
    useI(embedded, id, () => console.debug('page id and embedded', id, embedded))
    useF(id, async () => {
        meta.embedded.set(null)

        // check if this is an /ly route
        if (id) {
            const rs_ly = await fetch(`/api/ly/${id}`).then(x => x.json())
            log(rs_ly)
            if (rs_ly && rs_ly.ly) {
                const { hash, links } = rs_ly.ly
                if (hash === id && links.length === 1) {
                    // open(links[0], '_self')
                    history.replaceState(null, '', links[0])
                    return
                }
            }
        }

        // check to see if this ID matches an embedded project
        if (id && !ignore_embedded.has(id)) {
            const embedded_options = [
                `/raw/${id}/index.html`,
                `/raw/simple/${id}.html`,
                `/raw/1/${id}.html`,
                `/raw${location.pathname}/index.html`,
                `/raw/simple${location.pathname}.html`,
                `/raw/1${location.pathname}.html`,
            ]
            const embedded = await Promise
            .any(
                embedded_options.map(async path => {
                    console.debug(path)
                    try {
                        return [path, !(await fetch(path).then(res => res.ok && res.text()).catch()).includes('-- DEFAULT --')]
                    } catch (e) {
                        return new Promise(r=>setTimeout(() => r([path, false]), 1_000))
                    }
                }))
            .then(found => found[1] && found[0])
            embedded && meta.embedded.set(embedded)
        }
    })
    useF('EMBEDDED VALUE', embedded)

    // OR import file
    const pageSignalledLoad = useR(false)
    const cached = useM(() => ({}))
    const nonProject = !id || nonProjects.has(id)
    const LazyPage = useM(id, embedded, () => {
        return !embedded && !nonProject && !staticProjects.has(id) && !failedImport.has(id) && React.lazy(() => import('../pages/'+id).catch(() => {
            console.debug('import failed', id)
            failedImport.add(id)
        }))
    })
    useF(id, () => {
        if (cached[id]) loaded()
        else {
            pageSignalledLoad.current = false
            cached[id] = true
        }
    })

    const subdomain = useM(parseSubdomain)
    const Fallback = useM(id, embedded, subdomainSubpage, () => () => {
        console.debug('RENDER FALLBACK', subdomainSubpage)
        if (!subdomainSubpage) setSubdomainSubpage(true)
        // subdomain // redirect fallbacks to index for subdomains
        // ? <Redirect to={'/'} />
        // :
        // override?.includes('misc') // try misc/<id> before showing missing
        // ? <Page {...{ loaded, override: 'misc/'+id }} />
        // :
        return embedded === null
        ? <Loading />
        : <Missing {...{ loaded }} />
    })

    return (
    embedded
    ? <Embedded name={id} loaded={loaded} />
    : <Suspense key={id} fallback={<Loading />}>
        <ErrorBoundary key={id} fallback={<Fallback />}>
            {
            !nonProject && LazyPage
            ? <LazyPage signalLoad={() => {
                pageSignalledLoad.current = true
                return loaded
            }} />
            :''}
            {renderFunction(() => cleanTimeout(() => {
                // see 'signalLoad' above: if child doesn't signal
                //   that it has a load sequence, we'll load it here
                if (!pageSignalledLoad.current) loaded()
            }, 10))}
        </ErrorBoundary>
    </Suspense>)
}

const embeddedExpandLogin = set('snakes snackman befruited scores')
const embeddedExpand = set('browser-compute-bank cards stream befruited snackman pixelworld')
const embeddedExpandPlacement = {
    'browser-compute-bank': 'top-right'
}
const embeddedHeaderBorder = set('browser-compute-bank')
const embeddedTransparentHeader = set('terrain')
const raw_uses = {
    'three.js': set('terrain'),
    'openlayers.js': set('paths'),
    'noise': set('terrain'),
    'socket.io': set('cards'),
}
const settings_mixin = {
    
}
export const Embedded = ({ name, loaded: outerLoaded }) => {
    const [{ expand }] = auth.use()
    useStyle(embeddedHeaderBorder.has(name) ? `
    #inner-index {
        width: 100% !important;
    }
    #header {
        border-bottom: 1px solid currentColor;
    }
    ` :'')
    useF(name, () => console.debug('embedded uses', Object.entries(raw_uses).filter(([k, v]) => v.has(name))))
    usePageSettings({
        transparentHeader: embeddedTransparentHeader.has(name),
        // expand: embeddedExpand.has(name),
        expandPlacement: embeddedExpandPlacement[name],
        hideLogin: expand && !embeddedExpandLogin.has(name),
        ...(embeddedTransparentHeader.has(name)
        ? {background: '#000', text_color: '#fff'}
        : {background: '#fff', text_color: '#000'}),
        ...merge(settings_mixin[name]||{}, {
            uses: merge({
                'socket.io': false,
                'mongodb': false,
            }, ...Object.entries(raw_uses).filter(([k, v]) => v.has(name)).map(([k, v]) => ({ [k]:true })))
        }),
    })
    useF(name, () => embeddedExpand.has(name) && auth.set({...auth.get(), expand:true }))

    const [base] = meta.embedded.use()
    const [src, setSrc] = useState()
    const [loaded, setLoaded] = useState(false)
    const ifr = useR()
    useI(base, src, loaded, () => console.debug('embedded update', {name, base, src, loaded}))

    const handle = {
        hash: (hash) => setSrc(base + hash),
        load: () => {
            console.debug('IFRAME LOADED')
            setLoaded(true)
            outerLoaded()
        },
    }

    // focus & set src to start
    useF(base, () => {
        ifr.current.focus()
        handle.hash(window.location.hash)
    })
    // send hash updates down
    useEventListener(window, 'hashchange', () => handle.hash(window.location.hash))

    // bring hash, title, & icon updates up
    const [title, setTitle] = useState(`/${name}`)
    useF(title, () => document.title = title)
    useInterval(() => {
        let loc = window.location
        let ifrLoc = ifr.current?.contentWindow.window.location
        if (!ifrLoc) return
        if (ifrLoc.hostname && !ifrLoc.pathname.startsWith('/raw')) {
            if (ifrLoc.origin === loc.origin) {
                let newEnd = ifrLoc.href.replace(ifrLoc.origin, '')
                url.replace(newEnd)
            } else {
                window.location.assign(ifrLoc.href)
            }
        } else {
            if (title !== ifr.current.contentWindow.window.document.title) {
                setTitle(ifr.current.contentWindow.window.document.title)
            }
            if (window.location.hash !== ifrLoc.hash) {
                console.debug('embedded hash', location.hash, ifrLoc.hash)
                window.location.hash = ifrLoc.hash
                // url.replace(ifrLoc.hash)
            }
        }
    }, 500)
    const [iconHref] = meta.icon.use()
    const shrink = useShrink()
    useE(loaded, () => {
        console.debug('EMBEDDED STYLING')
        const embedded = ifr.current.contentWindow.window

        const referenceLabel = embedded.document.querySelector('#reference-label')
        if (referenceLabel) referenceLabel.style.display = 'none'

        let icon = embedded.document.querySelector('head link[rel=icon]')
        let iconHref = icon.getAttribute('href') || {
            'cards': `
            <div>
                cards
            </div>
            `,
        }[name]
        if (/^[^.\/]+\.[^.\/]+$/.test(iconHref)) iconHref = base.replace(/[^.\/]+\.html$/, iconHref)
        console.debug('EMBEDDED ICON', name, iconHref, icon.href, icon)

        const background = [
            embedded.getComputedStyle(embedded.document.body.parentElement).backgroundColor,
            embedded.getComputedStyle(embedded.document.body).backgroundColor,
            'white',
        ].find(x => x !== 'rgba(0, 0, 0, 0)')
        console.debug('EMBEDDED BACKGROUND', background)

        // ifr.current.style.minWidth = (embedded.document.body.clientWidth)+'px'
        // console.debug('EMBEDDED WIDTH', embedded.document.body.clientWidth)

        // embedded.document.body.style.maxWidth = (ifr.current.getBoundingClientRect().width)+'px'
        // console.debug('EMBEDDED WIDTH', embedded.document.body.clientWidth)
        
        // setOuterWidth(Q('#inner-index'), embedded.document.body.scrollWidth)
        // ifr.current.style.minWidth = (embedded.document.body.scrollWidth)+'px'
        if (embedded.getComputedStyle(embedded.document.body).overflowX !== 'hidden') {
            Q('#main').style.minWidth = (embedded.document.body.scrollWidth)+'px'
            console.debug('EMBEDDED WIDTH', embedded.document.body.clientWidth)
        }

        return [
            // iconHref && meta.icon.set(iconHref),
            meta.icon.set(iconHref || defaultIcon),
            background && setBackground(background, true),
        ]
    })
    const [hash, setHash] = useState(location.hash)
    useEventListener(window, 'hashchange', e => setHash(location.hash))
    useE(name, title, iconHref, () => meta.manifest.set({
        name: title,
        display: `standalone`,
        start_url: name ? `${origin}/${name}` : origin,
        icons: 
            iconHref 
            ? [{
                src: `${origin}/${iconHref}`,
                type: `image/png`
            }] 
            : undefined,
    }))
    useE(name, () => meta.description.set((projects[name] || [0, ''])[1]))

    return (
        <IFrameStyle className={loaded ? '' : 'loading'} id='embedded'>
            {loaded ? '' : <Loading />}
            <iframe id="embedded" ref={ifr}
                title={name} src={src}
                onLoad={handle.load}
                onError={() => console.debug('IFRAME ERROR')} />
        </IFrameStyle>
    )
}
