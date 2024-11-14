import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter as Router, Route, Switch, useHistory, Redirect } from 'react-router-dom'
import styled from 'styled-components'
// import { Base } from './components/base/Base'
import { Base } from './components/base-alt/Base'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Loader } from './components/Info'
import { Main } from './components/Main'
import { Messages } from './components/Messages'
import './index.css'
import api, { auth } from './lib/api'
import './lib/conditions'
import { Conditions } from './lib/conditions'
import './lib/console'
import { asToggle, cleanTimeout, ContentL, InputL, useEventListener, useF, useI, useM, useR, useRerender, useStyle, useTimeout } from './lib/hooks'
import { useAuth, usePage, useSubdomain } from './lib/hooks_ext'
import { meta } from './lib/meta'
import { useNotify } from './lib/notify'
import page, { parseLogicalPath, parsePage, parseSubdomain, parseSubpath } from './lib/page'
import './lib/rand'
import { useConnectToSocketIo } from './lib/socket'
import { store } from './lib/store'
import { trigger, TriggerValue } from './lib/trigger'
import { apply, JSX, truthy } from './lib/types'
import url from './lib/url'
import './lib/util'
import { dev, getPath, isMobile, node, on, Q, set, toYearMonthDay } from './lib/util'
import * as serviceWorker from './serviceWorkerRegistration'
import { openFloat, openFrame } from './components/Modal'
import { copy } from './lib/copy'
import css from './lib/css'
import { Dropdown } from './components/individual/Dropdown'
import { GlobalTrackPlayer, track_play } from './lib/track_player'
import { GoogleOAuthProvider } from '@react-oauth/google';

const { devices, QQ } = window as any
if (location.pathname.length > 1 && location.pathname.endsWith('/')) location.href = location.href.replace(location.pathname, location.pathname.slice(0, -1))

const HOME = location.pathname.endsWith('/man') && !location.pathname.startsWith('/man') ? 'man' : 'home'
if (HOME === 'man') location.pathname = location.pathname.replace('/man', '')

// HACK to remove error iframe in dev environment :)
if (dev) {
  // setTimeout(() => {
  //   QQ('iframe').at(-1)?.remove()
  // }, 500)
  setInterval(() => {
    QQ('iframe').find(x => x.style.zIndex == 2147483647)?.remove()
  }, 100)
}


let install_prompt
!window.navigator?.standalone && addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  install_prompt = e
})


const LAST_VISIT_KEY = 'lastVisit'
const useGlobalUtils = () => {
  useNotify(useHistory())
  useConnectToSocketIo()

  // report domain for email notifications
  const auth = useAuth()
  useF(auth.user, () => {
    if (auth.user) {
      api.post('/notify/domain', { domain: location.host })
    }
  })
  // useEventListener(window, 'beforeinstallprompt', e => console.log('PROMPT', e))

  // simple page view stats, counting once per user per day
  // if (subdomain) subdomain += '/'
  useF(() => {
    const lastVisit = store.session.get(LAST_VISIT_KEY)
    const today = toYearMonthDay(new Date())
    if (lastVisit !== today) {
      store.session.set(LAST_VISIT_KEY, today)
      api.post('/counter/batch/site', {
        tick: true,
        keys: [
          [],
          [today],
          [parseLogicalPath().replace(/^\/(.)/, '$1')],
          ['subdomain', parseSubdomain() || 'none'],
          ['domain', location.host],
        ].map(parts => ['views'].concat(parts).filter(truthy).map(encodeURIComponent).join('+'))
      })
    } else {
      console.debug('REPEAT VISIT')
    }
  })

  useEventListener(window, 'keydown', e => {
    if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
      url.push('/search')
    }
  })

  // useEventListener(window, 'contextmenu', e => {
  //   const context_menu_label = node(`
  //   <div style="position:relative;height:0;width:0">
  //     ${false ? `
  //     <img id="context-menu-label-icon" src="${meta.icon.value}" style="
  //       font-size: 12px;
  //       position: absolute;
  //       right: calc(100% + .25em);
  //       bottom: calc(100% + .75em + .25em);
  //       height: calc(1.5em + 2px); margin: -.25em; margin-right: 0;
  //       border-radius: 2px;
  //     "/>`:''}
  //     <style>
  //       #context-menu-label {
  //         position: absolute;
  //         bottom: 0; left: 0; margin: calc(.25em + 2px + 4px) 1.5px;

  //         line-height: 1;
  //         font-size: 12px;
  //         display: flex;
  //         gap: .25em;
  //         user-select: none;
  //         border-radius: .67em;
  //       }
  //       #context-menu-label > * {
  //         padding: .25em .5em;
  //         background: #111e; color: #fff;
  //         border-radius: 0;
  //         box-shadow: 0 0 .5em #0002, 0 0 0 .25px #fff;
  //         cursor: pointer;
  //         text-decoration: none;
  //         font-weight: bold;
  //         width: max-content;
  //         ${css.mixin.center_row};
  //         gap: 2px;
  //         border: 0;
  //       }
  //       #context-menu-label > :first-child {
  //         border-top-left-radius: .5em;
  //         border-bottom-left-radius: .5em;
  //       }
  //       #context-menu-label > :last-child {
  //         border-top-right-radius: .5em;
  //         border-bottom-right-radius: .5em;
  //       }
  //     </style>
  //     <div id=context-menu-label>
  //       <div id=context-menu-label-share>
  //         ${
  //           // (x=>!x||x==='home'?undefined:'/'+x)(parsePage()) || location.host
  //           location.href.replace(location.origin, '')
  //         }
  //       </div>
  //       ${false ? `<a id=context-menu-label-share>
  //         share
  //       </a>`:''}
  //       ${install_prompt ? `
  //       <a id=context-menu-label-install>
  //         install
  //       </a>
  //       `:''}
  //     </div>
  //   </div>`)
  //   on(
  //     Q(context_menu_label, '#context-menu-label-share'),
  //     'click',
  //     e => copy(location.href, e.target))
  //   install_prompt && on(
  //     Q(context_menu_label, '#context-menu-label-install'),
  //     'click',
  //     async e => {
  //       install_prompt.prompt()
  //       const { outcome } = await install_prompt.userChoice
  //       if (outcome === 'accepted') install_prompt = undefined
  //     })
  //   ReactDOM.createPortal(<Dropdown>
  //     test
  //   </Dropdown>, context_menu_label)

  //   const _close = openFloat(
  //     // node(`
  //     // <div style="
  //     // background: red;
  //     // line-height: 1;
  //     // font-size: 12px;
  //     // padding: .25em .5em;
  //     // // background: #fff8; color: #000;
  //     // color: #fff; background: #000d;
  //     // border-radius: .5em;
  //     // border: 1px solid #0006;
  //     // box-shadow: 0 0 .5em #0002;
  //     // ">
  //     //  ${location.pathname === '/' ? location.host : location.pathname}
  //     // </div>`),
  //     context_menu_label,
  //     {
  //       x: e.clientX,
  //       y: e.clientY,
  //     },
  //   )
  //   const close = e => {
  //     if (context_menu_label.contains(e.target)) return
  //     _close()
  //     ons.map(apply)
  //   }
  //   const ons = on(window, 'click contextmenu pointerdown', close)
  //   url.once(() => close)
  // })
}


const subdomain = parseSubdomain()
const bases = [subdomain ? HOME : '', HOME, 'tldr', 'list', 'thanks', 'log', 'projects', 'contents', 'about', 'contact', 'man', 'monstera']
if (subdomain && bases.includes(subdomain)) bases.push('') // if subdomain is a base, send '' to base

const preserved = set('man et')
const App = () => {
  useI(() => console.debug('App init'))
  
  useGlobalUtils()
  const loading = useM(() => trigger.value(true, { name: 'loading' }))
  const rerender = useRerender()
  useF(() => url.add(path => {

    // redirect from /<subdomain>/* to /*
    // (react-router Redirect doesn't preserve rest / hash)
    // if (path !== parseSubpath(path) && !preserved.has(path)) url.replace('/:' + getPath())
    console.debug('TOP LEVEL', path, path !== parseSubpath(path) && !preserved.has(path))

  }, true))
  useHistory()
  const contents = useM(loading.get(), () => <Contents {...{ loading }} />) // only re-render on loading state change
  return <>
    <Router>
      <Messages />
      <url.GlobalHistoryHook />
      <Conditions />
      <GlobalTrackPlayer />
      <Switch>
        <Route exact path={'/-'} render={() => <Redirect to='/' />}/>,
        <Route exact path={`/(${bases.join('|')})`} component={Base} />
        <Route path='*'>
          <LoadIcon {...{ loading }} />
          {contents}
        </Route>
      </Switch>
    </Router>
    <Footer />
  </>
}

const Contents = ({ loading }: { loading: TriggerValue<boolean | number> }) => {
  useI(() => console.debug('Contents init'))
  
  const loaded = useM(() => () => {
    const load = () => {
      const loadingValue = loading.get()
      if (typeof(loadingValue) === 'number') {
        loading.set(true)
        setTimeout(load, (loadingValue + 0) - performance.now()) // show icon for >= .5s
      } else if (loadingValue) {
        loading.set(false)
        console.debug('LOADED')
      }
    }
    load()
  })

  useStyle(`
  .mobile #index {
    margin: 0 !important;
    height: 100% !important;
    width: 100% !important;
  }
  .mobile #inner-index {
    border: 0 !important;
  }`)

  // wrap header to prevent re-rendering of Main content on page expand toggle
  const WrappedHeader = () => {
    const subdomain = useSubdomain()
    const page = usePage()
    const initialExpand = useR()
    // useI(page, () => initialExpand.current = subdomain === page || location.pathname[1] === '-')
    // useI(() => initialExpand.current = subdomain === page || location.pathname[1] === '-')
    // useI(() => location.pathname[1] === '-')
    useI(() => initialExpand.current = location.pathname[1] === '-')
    
    let [{ expand }] = auth.use()
    useI(expand, () => console.debug('expand value', expand))
    const setExpand = value => auth.set({ ...auth.get(), expand: value })
    if (expand === undefined) {
      expand = initialExpand.current || false
      setExpand(expand)
    }
    let toggleExpand = asToggle([expand, setExpand])[1]
    useF(expand, () => setTimeout(() => window.dispatchEvent(new Event('resize'))))

    // useF(() => {
    //   setTimeout(() => {
    //     auth.set({ ...auth.get(), expand })
    //   }, 500)
    // })

    // exclude certain pages (eg wordbase has own fullscreen option) from page expand
    // const page = usePage()
    // if (set('wordbase').has(page)) {
    //   expand = false
    //   toggleExpand = false
    // }

    useF(expand, () => {
      const index = document.querySelector('#index')
      index.classList.remove('expand-true', 'expand-false')
      index.classList.add(`expand-${expand}`)
    })

    // expand page based on url: page.domain.tld or domain.tld/-page
    useI(expand, () => {
      console.debug('expand update 2', expand)
      // const subdomain = parseSubdomain()
      // const page = parsePage()
      // console.debug('EXPAND?', subdomain === page || location.pathname[1] === '-' || initialExpand.current, initialExpand.current, subdomain, page)
      // if (initialExpand) setExpand(true)
      if (initialExpand.current) {
        initialExpand.current = false
        setExpand(true)
      }
    })

    // prefix page with '-' to expand
    // sneaky history.replaceState instead of url.replace
    // url.replace is meant to propagate changes across the app, but this is the one (?) case where we don't want that
    useI(expand, () => {
      const prefixed = getPath().replace(/^\/?-?\/?/, expand ? '/-' : '/')
      console.debug('expand prefix', expand, getPath(), prefixed)
      url.silent(prefixed)
    })

    useEventListener(window, 'keydown', e => e.key === 'Escape' && toggleExpand && toggleExpand())

    // const query = new URLSearchParams(location.search)
    // useF(() => query.get('X') === '1' && setExpand(true))
    // useF(expand, () => {
    //   if (expand) query.set('X', '1')
    //   else query.delete('X')
    //   const queryString = query.toString()
    //   url.replace(location.pathname + (queryString ? '?'+queryString : '') + location.hash)
    // })
    useStyle(expand ? `
    #inner-index {
      // height: 0 !important;
      // width: 0 !important;
      overflow: visible !important;
    }
    #header, #header #name {
      visibility: hidden;
    }
    #header #toggle-expand {
      visibility: visible;
    }
    // #header .user > *, #header .user > * > :not(#name) {
    //   visibility: visible;
    // }
    #header :is(#profile-menu, .dropdown, .dropdown *) {
      visibility: visible !important;
      pointer-events: all !important;
    }
    #main {
      position: fixed;
      top: 0; left: 0;
      height: 100%;
      background: #f8f8f8;
      background: #f6f3ed;
      // background: #f0e7d5;
      // background: #ebebeb;
      // background: #121212;
    }
    #footer {
      // width: 100%;
      padding: .1rem .2rem !important;
      text-align: center;
      margin-right: 4.5em;
      margin-bottom: .5em;
    }
    ` : ``)

    return <Header />
  }

  // only re-render on truthiness change
  const [loadingBool] = loading.as(x => !!x)
  return <Style id='index' className={`
  ${navigator.standalone ? 'standalone' : ''}
  loading-${loadingBool}`}>

      <div id="inner-index">
        <WrappedHeader />
        <Main {...{ loaded }} />
      </div>
  </Style>
}

// const defaultIcon = origin+'/icon.png'
const defaultIcon = '#000'
const LoadIcon = ({ loading }: { loading: TriggerValue<boolean | number> }) => {
  // if loading, 1) block view 2) display icon 3) hide on load
  const pageId = usePage()
  const storedIconKey = `page-icon-${pageId}`
  const [storedIcon, setStoredIcon] = store.use(storedIconKey)
  const [loadIcon, setLoadIcon] = useState(storedIcon)
  useF(loadIcon, () => setStoredIcon(loadIcon))

  const heavyWait = useR(0)
  page.heavy.use(() => {
    console.debug('HEAVY URL', storedIconKey)
    // add at least 1s of wait
    // heavyWait.current = Date.now() + 1000

    if (!loading.get()) {
      loading.set(true)
      meta.icon.set(store.get(storedIconKey) ?? defaultIcon)
      // block immediately to avoid waiting until after significant page load
      ref.current.classList.remove('block-false')
      ref.current.classList.add('block-true')
    }
  })
  // const [block] = loading.as(x => !!x)
  // const _block = loading.as(x => !!x)[0] // && pageId === 'wordbase' // UNCOMMENT TO ONLY SHOW ICON FOR WORDBASE
  const [block, setBlock] = useState(true)
  useF(() => loading.add(x => setTimeout(() => setBlock(!!x), 250), true))
  meta.icon.use((href, old) => {
    console.debug('icon trigger', old, '=>', href, `(displayed: ${loadIcon})`)
    if (href) {
      const updateIcon = () => {
        if (heavyWait.current > Date.now())
          return setTimeout(updateIcon, heavyWait.current - Date.now())

        // override icon with loading image for certain apps
        const href = {
          'pico-repo': '/raw/pico-repo/icon.png',
        }[pageId] || meta.icon.get()
        if (href !== loadIcon) {
          console.debug('icon set', href)
          if (loading.get()) loading.set(performance.now())
        }
        setLoadIcon(href)
      }

      // write unique immediately (& others once block is gone)
      // write first default after 250ms, ignore others
      // write others after 5s to avoid rapid changes
      return cleanTimeout(updateIcon,
        (href !== defaultIcon && (!loadIcon || loadIcon === defaultIcon)) || !block
        ? 0
        : (href === defaultIcon && (!loadIcon || loadIcon === defaultIcon))
        ? 250
        : 5_000)
    }
  })

  const ref = useR<ContentL>()
  const descRef = useR<InputL>()
  const [path] = page.loadTriggerValue.use()
  // useF(block, () => {
  //   if (block) {
  //     descRef.current.style.visibility = 'hidden'
  //   }
  // })
  const app = path.split('/').slice(0, 2).join('/')
  const name = {
    // '/dinder': 'Dinder',
    // '/crowdmeal': 'Crowdmeal',
  }[app] || app
  return <LoadIconStyle ref={ref} className={`centering block-${!!block}`}>
    <img src={loadIcon} onLoad={() => {
      descRef.current.style.visibility = 'visible'
    }} style={{
      borderRadius: ['pico-repo'].includes(pageId) ? '2px' : undefined,
      backgroundSize: 'cover',
    }} />
    <span id='load-text' ref={descRef}><Loader color={'white'} />&nbsp;&nbsp;loading {name}</span>
  </LoadIconStyle>
}

const LoadIconStyle = styled.div`
position: absolute;
width: 100%;
height: 100%;
left: 0;
top: 0;
background: black;
z-index: 9999;
&.block-false {
  opacity: 0;
  z-index: -1;
  animation: .2s block-fade;
  @keyframes block-fade {
    // 0% { filter: brightness(0) }
    0% {
      opacity: 1;
      z-index: 9999;
      // filter: brightness(0);
    }
    100% {
      z-index: 9999;
    }
  }
  > * {
    opacity: 0;
    animation: .1s block-inner-fade;
    @keyframes block-inner-fade {
      0% { opacity: 1 }
    }
  }
}

#load-text {
  max-width: calc(100% - 1em);
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
}

img {
  height: max(15vw, 15vh);
  position: absolute;
  image-rendering: pixelated;
  border-radius: max(1vw, 1vh);

  // animation: pulse 2s ease-in-out infinite;
  @keyframes pulse {
    50% {
      // height: max(16vw, 16vh);
      height: max(15.5vw, 15.5vh);
    }
  }
}
span {
  position: relative;
  top: calc(max(8vw, 8vh) + 16px + 4px);
  font-family: monospace;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

&.loading-false {
  // span {
  //   animation: hide .2s linear;
  //   @keyframes hide {
  //     0% {
  //       opacity: 1;
  //     }
  //   }
  //   opacity: 0;
  // }
  // img {
  //   animation: blowout .5s cubic-bezier(0.8, 0.01, 0.82, 0.18);
  //   @keyframes blowout {
  //     0% {
  //       opacity: 1;
  //       height: max(15vw, 15vh);
  //     }
  //     100% {
  //       visibility: visible;
  //     }
  //   }

  //   // position: absolute;
  //   // height: 1000%;
  //   // opacity: 0;
  //   // z-index: 100100100;
  //   visibility: hidden;
  // }

  // animation: blowout-o .5s cubic-bezier(0.8, 0.01, 0.82, 0.18);
  // @keyframes blowout-o {
  //   0% {
  //     // background: #0000;
  //   }
  // }
  // // background: #ffff;
}
`

const Style = styled.div`
${css.common.base}
  // background: #13112522
  // background: #13112544
  // background: #131125
  // background: #ffffff44;
  // background: #131125;

  width: calc(100% - .2rem - var(--bottom-margin));
  height: calc(100% - .2rem - var(--bottom-margin));
  margin: .2rem .2rem var(--bottom-margin) .2rem;
  position: relative;
  border-radius: .2rem;
  z-index: 1;

  display: flex;
  justify-content: center;
  align-items: center;
  &.expand-true #inner-index {
    background: linear-gradient(#0001 0 0) var(--id-color) !important;
  }
  &.expand-true #inner-index #main {
    // background: linear-gradient(#fff5 0 0) var(--id-color) !important;
    background: none;
    > * {
      box-shadow: 0 0 0 .25em var(--id-color);
    }
  }
  #inner-index {
    width: 100%; height: 100%;
    // min-width: max-content;
    min-width: min(100%, 59.7vh);
    min-width: min(100%, max(min(100%,59.7vh), 500px));
    ${isMobile ? '' : 'width: max-content;'}
    display: flex;
    flex-direction: column;
    border: 1px solid black;
    border: 1px solid #0003;
    box-shadow: 0 0 0 1.5px #8881, 0 0 0 2.5px #88888808;
    border-radius: inherit;
    overflow: hidden;
    position: relative;

    
    border-radius: 0;
    box-shadow: none !important;
    box-shadow: 0 0 4px 1px #8881 !important;
    border: 1px solid var(--id-color-text) !important;
    border: 1px solid #8886 !important;
    background: var(--id-color);
    color: var(--id-color);
    color: var(--id-color-text);
    // font-size: 14px;
    opacity: 1;
    border: none;

    // border: 1px solid #fff !important;
    border: none !important;
    // ${isMobile ? '' : 'border-radius: .25em !important;'}
  }
  #inner-index #main > :has(> .body) {
    max-width: 50rem;
  }

  a {
    color: inherit;
  }
  #inner-index :is(#header > *, #main, #main > :not(:has(.modal)), #main > * > .body):not(.scroller) {
    background: inherit;
    color: inherit;
    opacity: inherit;
  }
  #main > * > .body {
    padding: .25rem;
  }
  .search {
    padding: .25rem;
    input {
      background: var(--id-color-text) !important;;
      color: var(--id-color) !important;
      border-radius: 0 !important;
      font-size: 1em;
      &::placeholder {
        color: var(--id-color);
        text-transform: uppercase;
      }
    }
  }
  #inner-index .info a {
    color: inherit;
  }
  #inner-index .info a:is(.button, .action) {
    color: var(--id-color-text-readable) !important;
  }
  #inner-index :is(.button, .action) a, #inner-index a:is(.button, .action) {
    color: var(--id-color);
  }
  #root, #inner-index, .info, #inner-index #main#main .info {
    background: var(--id-color);
    color: var(--id-color-text);
  }
  .modal-main .info.info .body {
    background: transparent !important;
  }
  .dropdown-label:hover a {
    text-decoration: underline;
  }
  #header {
    font-size: 1rem !important;
  }
  #header#header .dropdown {
    color: var(--id-color-text-readable) !important;
    background: var(--id-color-text) !important;
    border: 0 !important;
    // border: 1px solid var(--id-color-text) !important;
    padding: .125em 0 !important;
  }
  #header#header .dropdown > * {
    // color: var(--id-color-text) !important;
    // background: var(--id-color-text-readable) !important;
  }
  #header#header .dropdown > .info {
    color: var(--id-color-text) !important;
    
    background: var(--id-color-text) !important;
    color: var(--id-color-text-readable) !important;

    .hydrated-switch {
      filter: invert(1);
    }
  }
  #header#header .dropdown > .item > input {
    background: var(--id-color-text) !important;

    background: var(--id-color-text-readable) !important;
    color: var(--id-color-text) !important;
    &::placeholder {
      color: inherit !important;
    }
  }
  .hide-on-hover:hover, *:hover > .hide-on-parent-hover {
    visibility: hidden !important;
  }
  .half-on-hover:hover, *:hover > .half-on-parent-hover {
    // opacity: .67;
  }
  .conditions-container {
    border: 0 !important;
  }
  .info.info, .dropdown {
    --info-background: var(--id-color);
    font-family: inherit;
    .body {
      // background: var(--info-background) !important;
      // color: var(--id-color-text) !important;
    }

    * {
      scroll-margin: 2px !important;
    }
    .section {
      // gap: 0;
      gap: 2px !important;
    }
    .badges {
      margin-bottom: 0 !important;
      font-size: .8em;
    }
    .section > .badges:first-child {
      margin-bottom: calc(.25em - 2px) !important;
    }
    .badges > * {
      font-size: 1em;
      border-radius: 0;
      border: 0;
      opacity: 1;
      position: unset;
      min-width: 1.5em;

      text-transform: uppercase;
      font-weight: bold;
      &.label {
        color: var(--id-color-text);
        background: none; backdrop-filter: invert(1) opacity(0.25);
        // background: none; backdrop-filter: invert(1) opacity(0.15);
        // background: none; backdrop-filter: invert(1) saturate(0) opacity(0.5) brightness(10) contrast(10);
        // background: none; backdrop-filter: invert(1) saturate(0) opacity(0.25) brightness(10) contrast(10);
        // background: none; backdrop-filter: saturate(.5) brightness(2) opacity(0.25);
        // color: var(--id-color-text-readable) !important;
        text-transform: uppercase;
      }
      &.button {
        color: var(--info-background);
        background: var(--id-color-text);
      }
      &.action {
        max-height: 100%;
        align-self: stretch;
        .select {
        }
      }
    }
    input:not([type=checkbox], [type=radio], .wwl-attach *, .console *),
    > textarea:not(.wwl-attach *),
    *:is(.body, .section) > textarea:not(.wwl-attach *),
    label.select:not(.wwl-attach *),
    .action:not(.wwl-attach *) {
      background: var(--id-color-text);
      color: #fff; /* var(--info-background) !important; */
      color: var(--id-color-text-readable);
      border: 0;
      border-radius: 0;
      font-size: ${devices.is_mobile ? `max(1em, 16px)` : `1em`};
      margin: 0;
      &::placeholder {
        color: inherit;
        color: var(--id-color);
      }
      &.action {
        font-weight: bold;
        background: var(--id-color-text);
        color: var(--id-color-text-readable);
        display: flex; gap: calc(.25em * 1.85); align-items: center;
        input:is([type=checkbox], [type=checkbox]) {
          margin: 0;
          margin-right: .5em;
        }
        input, .select {
          // height: auto;
          // max-height: calc(100% - .5em) !important;
          background: var(--info-background);
          color: var(--id-color-text) !important;
          background: var(--id-color-text-readable) !important;
          border: 2px solid currentcolor;
          border: 0 !important;
          margin: 0 -2px !important;
          margin: 0 !important;
          // height: -webkit-fill-available !important; 
          margin: 2px -2px !important;
          border: 2px solid var(--id-color-text) !important;
          &:is(input, .select) + :is(input, .select) {
            // margin-left: -4px;
          }
        }
        .select {
          // margin: 0 -4px !important;
          border-color: transparent;
          // margin: 0 !important;
          background-clip: border-box !important;
        }
      }
      &::-webkit-calendar-picker-indicator {
        background-color: #fff !important;
      }
    }
    input:not(.info-checkbox[type=checkbox], .info-checkbox[type=radio], .wwl-attach *, .console *), textarea:not(.wwl-attach *) {
      font-weight: normal !important;
      padding: 0.125em 0.25em;
      // width: fit-content;
    }
    input:is(.info-checkbox[type=checkbox], .info-checkbox[type=radio]):not(.wwl-attach *) {
      // -webkit-appearance: none !important;
      // background: var(--info-background) !important;
      // background: #fff !important;
      // position: relative;
      // border-radius: 2px !important;
      // border-color: #000;
      // // height: 100% !important;
      // // width: 1em !important;
      // // height: -webkit-fill-available !important;
      // // height: calc(100% - .5em) !important;
      // height: 1em !important;
      // width: 1em !important;
      // margin: 0 !important;
      // padding: 0 !important;
      // cursor: pointer;
      // background-clip: padding-box;
      // &:checked {
      //   // content: "x";
      //   // display: inline-block;

      //   // border: .25em solid #fff !important;
      //   // border-width: .25em 1px !important;
      //   // border-width: .25em !important;
      //   // background: inherit !important;

      //   // border: 0 !important;
      //   // // background: #000 !important;
      //   // border: calc(.25em * .67) solid #fff !important;
      //   // // mix-blend-mode: difference;
      //   // background: var(--id-color-text) !important;
      //   // border-color: var(--id-color) !important;

      //   // // border-color: var(--id-color-text) !important;
      //   // // background: transparent !important;
      //   // // border-width: .33em !important;

      //   // background: var(--id-color-text) !important;
      //   // border: 1px solid transparent !important; background-clip: padding-box;

      //   // --checked-fill-percent: calc(100% * 7/8);
      //   // background: linear-gradient(90deg, var(--id-color-text) var(--checked-fill-percent), transparent var(--checked-fill-percent)) !important;
      //   background: var(--id-color-text) !important;
      // }
      // &:not(:checked) {
      //   // background: #fff;
      //   // background: var(--id-color) !important;
      //   // background: var(--id-color-text-readable) !important;
      //   // border: 1px solid #91887f !important;

      //   // border: 0 !important;
      //   // border-radius: 0 !important;
        
      //   // // background: var(--id-color-text) !important;
      //   // border: 1px solid transparent !important; background-clip: padding-box;

      //   // border-color: var(--id-color-text) !important;
      //   // background: transparent !important;
      //   // // border-width: .33em !important;

      //   // --checked-fill-percent: calc(100% * 1/8);
      //   // background: linear-gradient(90deg, var(--id-color-text) var(--checked-fill-percent), transparent var(--checked-fill-percent)) !important;
      // }
      // border: 0 !important;
      // border-radius: 0 !important;
      // &[type=radio] {
      //   border-radius: 1e6px !important;
      // }
      
      // border: 1px solid var(--id-color-text) !important;
      // margin: 1px !important;
    }
    .action input:is([type=checkbox], [type=radio]):not(.wwl-attach *) {
      height: 1em !important;
      width: calc(.25em) !important;
      width: 1em !important;
      --action-margin: calc(-.25em - .67px);
      --action-margin: 0;
      --action-margin: .25em;
      --action-margin: .125em;
      background: var(--id-color-text-readable) !important;
      &:not([type=radio]):first-child, &:last-child:not(:first-child) {
        // &:first-child {
        //   margin-left: var(--action-margin) !important;
        //   border-left: 0 !important;
        //   // border-right: 0 !important;
        //   border-top-right-radius: 1em !important;
        //   border-bottom-right-radius: 1em !important;
        // }
        // &:last-child:not(:first-child) {
        //   margin-right: var(--action-margin) !important;
        //   border-right: 0 !important;
        //   // border-left: 0 !important;
        //   border-top-left-radius: 1em !important;
        //   border-bottom-left-radius: 1em !important;
        // }
        width: calc(.25em + .67 * .25em + .5em) !important;
      }
      &:checked {
        background: inherit !important;
        border-color: var(--id-color-text-readable) !important;
        // border-color: var(--id-color) !important;
        // border-color: var(--id-color-text-readable) !important;
        // background-color: var(--id-color-text-readable) !important;
        color: transparent !important;
      }
      &:not(:checked) {
        // background: inherit !important;
        // border-color: var(--id-color-text-readable) !important;
        background: var(--id-color-text-readable) !important;
        border-color: var(--id-color-text-readable) !important;
      }
    }
    input:is([type=date]):not(.wwl-attach *) {
      background: var(--info-background);
      color: var(--id-color-text);
      border: 2px solid currentcolor;
    }
  }
  #inner-index {
    border-radius: 2px;
    overflow: hidden;

    border-radius: 8px;
    border-radius: 0px;
    overflow: hidden;
  }
  #inner-index .dropdown input:not([type=checkbox], [type=radio]) {
    // background: var(--info-background);
    // color: var(--id-color-text);
    // border: 2px solid currentcolor;
    color: var(--id-color) !important;
    padding: 0 .25em;
    font-weight: bold;
    &::placeholder {
      opacity: 1;
      text-transform: uppercase;
    }
  }
  #header {
    font-weight: bold;
    padding: .25rem !important;
    background: transparent !important;
    color: var(--id-color-text);
    text-transform: uppercase;
    line-height: 1;
    #crumbs, .expand-false.user.dropdown-container {
      position: relative;
      // bottom: -1px;
    }
    .nav > *:not(#projects), .user, .user > .dropdown-label {
      color: var(--id-color-text) !important;
      mix-blend-mode: unset !important;
    }
    .user * {
      // color: var(--id-color-text) !important;
      mix-blend-mode: unset !important;
    }
    .dropdown, .expand-true .dropdown-label {
      --item-padding: .25rem;
      border-radius: 0;
      background: var(--id-color) !important;
      color: var(--id-color-text) !important;
      // background: var(--id-color-text) !important;
      // color: var(--id-color) !important;
      hr { border-width:1px; margin:2px }
      border: 0; box-shadow: none;
    }
    .expand-false .dropdown {
      border: 1px solid currentcolor;
      // margin-left: calc(-.25rem - 1px) !important; margin-right: calc(-.25rem - 1px) !important;
    }
    .expand-false.dropdown-container {
      .dropdown {
        top: calc(100% + .25em);
        border-radius: 1px !important;
      }
      &.user {
        .dropdown {
          top: calc(100% - 1px + .25em);
        }
      }
    }
    .expand-true .dropdown-label:active {
      color: var(--id-color-text) !important;
      background: var(--id-color) !important;
      filter: none;
    }
    #home {
      border-radius: 0;
      // border: 1px solid var(--id-color-text);
      // background-color: var(--id-color-text);

      // border: 0 !important;
    }
  }

  &::before {
    position: absolute;
    content: "";
    width: 100%;
    height: 100%;
    background: inherit;
    border-radius: inherit;
    z-index: -1;
  }
  &::after {
    position: absolute;
    top: -0.3rem; left: -0.3rem;
    content: "";
    // width: 100vw;
    // height: 100vh;
    width: calc(100% + 1.4rem);
    height: calc(100% + 1.4rem);
    background: var(--background) fixed;
    z-index: -2;

    background: #000 !important;
  }
  &.loading-true {
    // background: linear-gradient(15deg,#609e98,#e2d291) fixed;
    #main { visibility: hidden !important }
    // background: black;
    > * {
      // visibility: hidden;
    }
  }
  // &.loading-false #main {
  //   // background: black;
  //   animation: .2s keep-black;
  //   @keyframes keep-black {
  //     0% { background: black; }
  //     to { background: black; }
  //   }
  // }
  // &.loading-false #main > * {
  //   animation: .3s appear;
  //   @keyframes appear {
  //     0% { filter: brightness(0) }
  //     // 0% { opacity: 0; background: transparent; }
  //     // to { opacity: 1; }
  //   }
  // }
  // &.loading-false #main {
  //   animation: .3s appear;
  //   @keyframes appear {
  //     // 0% { filter: brightness(0) }
  //     0% {
  //       opacity: 0;
  //       // filter: brightness(0);
  //     }
  //   }
  // }

  &.shrink, .shrink {
    // transition: width 2s !important;
    // margin-left: auto;
    // margin-right: auto;
    &::after {
      border-radius: inherit;
    }
  }

  // @media (max-width: 30.01rem) {
  @media (max-aspect-ratio: 1/1) {
    width: calc(100% - 0.4rem);
    height: calc(100% - 0.4rem);
    margin: 0.2rem;
    margin-bottom: var(--bottom-margin);
    // &.standalone {
    //   margin-top: 0.9rem;
    //   height: calc(100% - 4rem);
    //   &::after {
    //     top: -.9rem;
    //     height: calc(100% + 10rem);
    //   }
    // }
    &.standalone {
      height: calc(100% - 4.2rem);
    }
  }
`


// ReactDOM.render(<ErrorBoundary><App /></ErrorBoundary>, document.getElementById('root'))
// ReactDOM.render(<ErrorBoundary><App /></ErrorBoundary>, document.getElementById('root'))
ReactDOM.render(
<GoogleOAuthProvider clientId="1033547890894-k2liippvrka0q7j9vf5g7d26k050iu7m.apps.googleusercontent.com">
  {/* <React.StrictMode> */}
      <App />
  {/* </React.StrictMode> */}
</GoogleOAuthProvider>, document.getElementById('root'))
// serviceWorker.unregister()
// serviceWorker.register() // register() to enable https://bit.ly/CRA-PWA
// window['reloadServiceWorker'] = () => {
//   serviceWorker.unregister()
//   location.reload()
// }
// serviceWorker.unregister()