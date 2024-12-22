import punycode from 'punycode/';
import { useState } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { useE, useF, useInterval, useM, useS, useStyle } from '../../lib/hooks';
import { usePageSettings, useSubdomain } from '../../lib/hooks_ext';
import { meta } from '../../lib/meta';
import { parsePage, parseSubpath } from '../../lib/page';
import { JSX } from '../../lib/types';
import url from '../../lib/url';
import { S, dev, is_mobile_not_watch, isWatch, is_mobile, list, toStyle, set, mobile } from '../../lib/util';
import { A, HalfLine, Help } from '../Info';
import { Contact } from './old/Contact';
import { store } from 'src/lib/store';
import { Dangerous } from '../individual/Dangerous';
import { About } from './About';
import { TRACK_PLAYER_COOKIE, create_track_show, get_current_track, get_tracks, track_ids, track_lists, track_play } from 'src/lib/track_player';
import api, { auth } from 'src/lib/api';
import { logout, openLogin } from 'src/lib/auth';
import { Scroller } from '../Scroller';
// import { Highlights } from './Highlights';
import { List } from './List';
import { Highlights } from './Highlights';

const { named_log, Q, icon, rand, devices, xhr, css, js_html } = window as any
const log = named_log('Base')
if (location.href === 'https://cyrusfre.sh') location.href = 'https://cyrusfre.sh/man'
if (location.href === 'https://cfre.sh') location.href = 'https://cfre.sh/man'
if (location.href === 'https://matchbox.zip') location.href = 'https://raw.tu.fo/matchbox'

export const Base = () => {
  const [{user:viewer}] = auth.use()
  
  const [originalBase, setOriginalBase] = useState(false)
  const monstera = useM(() => location.href.includes('monstera'))
  const man = useM(() => location.host === 'cyrusfre.sh')

  const [_more, setMore] = store.local.use('base-more')
  // const more = true || _more || !['', 'home'].includes(parsePage())
  const more = true
  // useF(more, () => setMore(more)) // override initial _more with more
  usePageSettings({
    professional: true,
    ...(!more ? {
      background: '#fff',
    } : {
      ...(monstera ? {
        background: '#fed', text_color: '#000',
      } : {}),
    }),
  })

  // const theme_song = useM(() => devices.is_desktop && rand.sample(get_tracks(track_lists.THEME)))
  // useF(theme_song, _ => theme_song && track_play([theme_song.id], {do_shuffle:true}))
  // useF('theme', theme_song, log)
  useF(_ => is_mobile || track_play(track_lists.THEME, {do_first_shuffle:true}))
  const [theme_song] = store.use(TRACK_PLAYER_COOKIE.STATE, { default: {}, as: state => state.off || state.paused ? undefined : get_current_track() })
  useF('theme', theme_song, log)

  // meta.title.use({ value: 'Cyrus Freshman' })
  useStyle(`
  #footer {
    display: none;
  }
  .message-list {
    margin-top: 3.25em !important;
  }
  `)
  useStyle(!more ? `
  html, html > body, #root {
    height: 100%; width: 100%; margin: 0; padding: 0;
    background: #fff; color: #000;
    display: flex; align-items: flex-start; justify-content: flex-start;
    ${is_mobile ? `
    align-items: flex-end; justify-content: flex-end; text-align: right;
    `:''}
  }
  #root {
    padding: 1em 2em;
  }
  a {
    color: #388eff;
  }
  ` : `
  :root {
    --light: rgb(244, 241, 232);
    --light-d: rgb(232, 228, 218);
    --dark: rgb(12, 12, 12);
    --dark-l: rgb(16, 16, 16);
    /* --background: black; */
    /* --background: #f6f3ed; */
    --background: #eeebe6;

    --background: #fffefe;
    --background: var(--id-color) !important;
  }
  @font-face {
      font-family: Duospace;
      src: url("fonts/iA/iAWriterDuospace-Regular.woff2") format("woff2");
  }
  @font-face {
      font-family: Duospace;
      font-weight: bold;
      src: url("fonts/iA/iAWriterDuospace-Bold.woff2") format("woff2");
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    font-size: min(4.2vw, 22px);
    font-size: min(4.8vw, 24px);
    margin: 0;
    height: 100%;
    background: var(--background) fixed !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* font-family: 'Lato', sans-serif; */
    /* font-family: 'Courier New', monospace;
    text-shadow: 0.01em 0.01em 0 white; */
    font-family: 'Duospace', monospace;
  }
  #root {
    overflow-y: auto;
  }

  #box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    width: 22rem;
    max-width: 100vw;
    // margin: 1rem 0;
    border: .1rem solid var(--light);
    padding: 1rem;

    width: 24em;
    padding: 1.5em;

    background: #222;
    /* background: #131125; */
    // border-radius: 2px;
    color: var(--light);
    position: relative;
    border-radius: .5em;

    border-radius: .25em;
    // border: .5px solid #222;
    // border: 1px solid #8883;
    border: 0;
    color: #222;
    background: none;

    border-radius: 1em;
    padding: 1.5em 1em;
  }

  * {
    margin: 0;
    padding: 0;
  }
  #box {
    font-size: 14px !important;
    font-size: min(14px, 2vh) !important;
  }
  #box#box :is(input, textarea), #box#box :is(input, textarea)::placeholder {
    font-size: max(1em, 16px) !important;
  }
  html, body, #home, #box, #box > *, #box :is(span, p, a), #title, #title * {
    color: #000 !important;
    border-width: 2px;
    font-weight: bold;
  }
  #box-inner {
    background: #000 !important;
  }
  #box-inner, #box-inner :is(span, a, p), #box-inner#box-inner :is(textarea, input), #box-inner#box-inner :is(textarea, input)::placeholder {
    color: var(--background) !important;
    border-color: currentcolor !important;
    border-width: 2px !important;
    // margin: 0 -2px !important;
    font-weight: bold;
    opacity: 1 !important;
    outline: 0;
  }
  #box-inner-home > :is(span, a, p) {
    text-wrap: nowrap;
  }
  // #box-inner,#box-inner#box-inner :is(textarea, input), #box-inner#box-inner :is(textarea, input)::placeholder {
  //   font-size: 1em;
  // }
  #box-inner#box-inner :is(textarea, input), #box-inner#box-inner :is(textarea, input)::placeholder {
    // color: #000 !important;
    // background: var(--background) !important;
    color: var(--background) !important;
    background: #000 !important;
    text-align: unset;
  }
  #box-inner#box-inner :is(textarea, input)::placeholder {
    padding: 0;
  }

  #title h1 {
    font-weight: bold !important;
  }
  #box {
    padding: 0 .67em !important;
  }
  #box-inner {
    // filter: invert(1);
    border: 0 !important;
    border-radius: 0 !important;
  }
  #tabs > *:hover {
    // background: #fff !important;
    // color: #000 !important;
  }

  a:not(.project-item):not(.project-item) {
    color: #222;
  }
  a.project-item:hover :first-child a {
    //color: white !important;
    // background: #fff !important;
  }
  a.project-item:hover :not(a) {
    // color: #222;
  }
  .project-item:not(.list):not(.space):hover > :first-child a, .hRHSwl .project-item:not(.list):not(.space):active > :first-child a, .hRHSwl .project-item:not(.list):not(.space):focus > :first-child a {
    background: #000 !important;
    color: var(--background) !important;
  }

  #box > * {
    width: 100%;
    flex: 0 0 auto;
  }

  #title {
    margin: 0;
    padding: 0;
    text-align: left;
    position: relative;
    // margin-bottom: 1rem;
  }
  #title > img {
    border-radius: 50%;
    box-shadow: 1px 2px 4px #00000020;

    position: absolute;
    right: 0;
    height: 100%;
    width: auto;
    min-width: 4.4rem; min-height: 4.4rem; /* fill space when loading */
    /* background: var(--background) fixed, linear-gradient(#fff 0 0); */
    color: black;
    font-size: .7em;

    max-width: 4.4rem; max-height: 4.4rem;
  }
  #title > h1 {
    margin: 0;
    // font-size: 1.125rem;
    font-size: 1em;
    /* font-family: 'Courier New', monospace; */
  }
  #title > h1 > span {
    opacity: .25;
    /* font-family: 'Duospace', monospace; */
  }
  #title > p {
    margin: 0;
    // font-size: 0.8rem;
    font-size: .8em !important;
  }

  a:not(.project-item) {
    color: var(--light);
    // text-decoration: underline;
    border-bottom: 1px solid currentColor;
    // box-shadow: inset 0 -1px currentColor;
    // box-shadow: inset 0 -.05em #222, inset 0 -.15em currentColor;
    // box-shadow: inset 0 -.1em currentColor, inset 0 -.2em #fff4;
    text-decoration: none !important;
  }
  a a {
    border-bottom: none !important;
  }

  #box a:not(.project-item, .tab):is(:hover, :active) {
    // text-decoration: none !important;
    // border-color: transparent !important;

    // color: var(--background) !important;
    // background: #000 !important;
    // // background: linear-gradient(180deg, transparent 2px, #000 2px) !important;
    // border-color: #000 !important;
  }
  #box-inner a:not(.project-item):is(:hover, :active) {
    &, * {
      // text-decoration: none !important;
      // border-color: transparent !important;
      // box-shadow: none;

      color: #000 !important;
      background: var(--background) !important;
      // // background: var(--background) !important; background-clip: border-box;
      // // background: linear-gradient(180deg, transparent 2px, var(--background) 2px) !important;
      border-color: var(--background) !important;
      border-radius: 0 !important;

      // background: #222 !important;
      // border-color: transparent;
      // background-clip: border-box;
    }
  }


  #tabs {
    display: flex;
    gap: .5em;
  }
  #box .tab {
    background: none;
    display: inline-block;
    position: relative;
    z-index: 100;

    // bottom: 2px;
    // bottom: 0;
    z-index: 100 !important;

    // margin-top: -1px !important;
    // margin-bottom: -1px !important;
    border: 2px solid transparent !important;
    margin-top: -1px !important;
    margin-bottom: -2px !important;
    border-left: 0 !important;
    border-right: 0 !important;
    // font-weight: normal !important;

    // margin-top: -1px !important; 
    // margin-bottom: -1px !important;
    // border: 2px solid var(--background) !important;
    // border: 2px solid transparent !important;
    // border-left: 0 !important;
    // border-right: 0 !important;
    // font-weight: normal !important;

    // color: var(--background) !important;
    // background: #000 !important

    // border: 0 !important;
    // margin: 0 !important;
    // position: unset !important;
    // background: #000 !important;
  }
  #box .tab:hover {
    // font-weight: bold !important;
  }
  #box .tab:is(.open) {
    // border: 0 !important;
    // margin: 0 !important;
    // position: unset !important;

    font-weight: bold !important;

    // background: #222 !important;
    // box-shadow: calc(.15rem - 1px) calc(.15rem - 1px) darkseagreen;
    // z-index: 0 !important;

    background: var(--background) !important;

    // color: var(--background) !important;
    // background: #000 !important;

    // background: transparent !important;
    // color: #000 !important;

    // border: 2px solid var(--background) !important;
    // border-left: 0 !important; border-right: 0 !important;

    // border: 2px solid transparent !important;
    // border-left: 0 !important; border-right: 0 !important;

    // background: #000 !important; background-clip: border-box;
    // color: var(--background) !important;

    background: none !important;
    border-color: var(--background) !important;
    border-top: 0 !important;
  }
  #tabs {
    // width: 100%;
    // display: flex;
    // justify-content: space-between;
  }
  #tabs:hover .tab:not(:hover) {
    // color: #222 !important;
    // background: none !important;
    // box-shadow: none !important;
  }

  .content {
    margin: -6px 0 0 !important;
  }
  .content, .contact, .send:not(:hover), .confirmation {
    background: #fff1 !important;
    color: var(--light) !important;

    margin-left: -6px !important;
    margin-right: -6px !important;
  }
  .send:not(:hover) {
    background: none !important;
  }

  #footer {
    font-size: .5em;
  }

  ${is_mobile_not_watch ? `
  #home {
    margin: 0;
    margin-bottom: 1.5em;
    height: 100%;
    width: 100%;
    display: flex;
  }
  #box {
    flex-grow: 1;
    margin: 1px;
    max-width: calc(100% - 2px);
    border-color: transparent;
    justify-content: flex-start;
    // padding: 1rem;

    margin: 0;
    max-width: 100%;
    justify-content: end;
    // padding: 2rem .75rem;
  }
  #box-inner-container {
    // flex-grow: 1;
    // margin-bottom: 2em;

    flex-grow: 1;
    // flex-direction: column-reverse !important;
    margin: 0 !important;
  }
  #box-inner {
    // justify-content: flex-start !important;
    background: #fff1;
    // margin-bottom: .5rem !important;
    // margin-bottom: -.5rem !important;

    display: block !important;
    padding-top: 0 !important;
  }
  #box-inner-home {
    align-items: flex-start !important; justify-content: flex-start !important;
    padding: 0 !important;
    gap: .125em;
  }
  #box-inner a {
    text-decoration: none !important;
  }
  #box .tab:not(:is(.open)) {
    font-weight: normal;
  }
  #box .tab:is(.open) {
    border-top: 2px solid var(--background) !important;
    border-bottom: 0 !important;
    padding-top: 2px;
  }

  #home {
    background: linear-gradient(0deg, #0000 50%, #000 50%);
  }
  html, body, #home, #box, #box > *, #box :is(span, p, a), #title, #title * {
    color: var(--id-color) !important;
  }
  #tabs :is(html, body, #home, #box, #box > *, #box :is(span, p, a), #title, #title *) {
    color: #000 !important;
  }

  #user-controls {
    margin-top: 1em;
    margin-bottom: -1em;
    &, :is(span, p, a) {
      color: var(--id-color-text) !important;
    }
  }

  #box-inner#box-inner {
    display: flex !important;
    overflow: auto !important;
    min-height: max-content;
    justify-content: unset !important;
    height: 0; flex-grow: 1;

    padding-bottom: 0 !important;
    margin: 0 calc(2px - 0.67rem) !important;

    // width: 100% !important;
    width: calc(100vw + 2px) !important; /* so bad */
    left: 0 !important;
    margin: 0 !important; margin-left: calc(2px - .67rem) !important;
    height: 0; flex-grow: 1;
    overflow: hidden !important;
  }
  #box-inner#box-inner::after {
    content: "hidden";
    visibility: hidden;
    height: 1em;
  }
  ` : `
  #box-inner {
    max-height: calc(100vh - 15em);
  }
  `}

  #box-inner {
    overflow: auto;
    justify-content: unset !important;
    white-space: pre;
  }
  #box-inner :is(span, div) {
    // text-wrap: nowrap;
    width: 100%;
    text-align: left;
  }

  /* accent decoration */
  ${(() => {
    const accentTarget = '#box-inner' // is_mobile_not_watch ? '#box-inner' : '#box'
    return `
    ${accentTarget} {
      z-index: 1;
      position: relative;
      // box-shadow: 0 0 0 .5px darkseagreen, 0 0 0 2px #8fbc8f88;
      box-shadow: 0 0 0 .5px darkseagreen, 0 0 0 1.5px #8fbc8f44;
    }
    ${accentTarget}::after, ${accentTarget}::before {
      z-index: -1;
      content: "";
      position: absolute;
      height: 100%; width: 100%;
      border-radius: inherit;
    }
    ${accentTarget}::after {
      left: 0; top: 0;
      background: white;
      border-bottom: inherit;
      border-right: inherit;
    }
    ${accentTarget}::before {
      left: .325rem; top: .325rem;
      // background: darkseagreen;

      left: .15rem; top: .15rem;
    }`
  })}

  #contact-container, #contact-container textarea {
    flex-grow: 1;
  }
  #contact-container * {
    text-shadow: none !important;
  }
  #contact-container :is(textarea, input) {
    // color: #222 !important;
    color: black !important;
    border-color: #eee;
    outline-color: #222 !important;
    background: #eee !important;
    // background: #f8f8f8 !important;
    border-radius: 2px;
    // background: #ebeff3 !important;

    border: 1px solid currentColor !important;
    background: #222 !important;
    color: #fff !important;
    border-radius: .25em;

    background: #fff !important;
    color: #000 !important;
    font-size: 1em !important;
    border-radius: 0 !important;

    border-color: #000c !important;
    // border-radius: .5em !important;
    border-radius: 2px !important;
    border-radius: 0 !important;

    &:is(textarea), &::placeholder {
      font-weight: normal !important;
    }
  }
  #contact-container :is(textarea, input)::placeholder {
    // opacity: .25;
    opacity: 1;
  }
  #contact-container a {
    align-self: flex-end;
    border-radius: 0;
    font-size: 1.25em;
    text-transform: uppercase;
  }
  #contact-container .content, .contact {
    overflow: hidden;
  }
  #contact-container {
    gap: 0 !important;
    > :not(:first-child) {
      border-top: 0 !important;
    }
  }
  #contact-container .content {
    // border-radius: .5rem;
    // border-bottom-left-radius: 0; border-bottom-right-radius: 0;
  }
  #contact-container .contact {
    // border-radius: .5rem;
    // border-top-left-radius: 0; border-top-right-radius: 0;

    // border-bottom-right-radius: 0;
  }
  .send-new {
    margin-top: .5em;
    cursor: pointer;
  }

  ${isWatch ? `
  #title :not(:first-child), #box-inner-container { display:none!important }
  #watch-display {
    display: flex !important;
  }
  ` : ''}

  ${monstera ? `
  #root {
    background: url(raw/monstera.png);
    background-size: contain;
    image-rendering: pixelated;
  }` : ''}

  a {
    text-decoration: none;
  }

  :root {
    ${css.mixin.solarize}
  }

  :root, body, #root {
    filter: none !important;
    background: none !important;
  }
  :root {
    --rotate-color: #fff0b0;
    animation: id-color-keyframes 3s infinite linear;
    
    --id-color: var(--rotate-color) !important;
    background: var(--id-color) !important;
  }
  :root.ouch {
    animation-duration: .15s;
  }
  @keyframes id-color-keyframes {
    0% { --rotate-color: #fff0b0; }
    33% { --rotate-color: #d2ffbb }
    67% { --rotate-color: #ffd0bf }
    100% { --rotate-color: #fff0b0 }
  }

  `)

  useE(() => {
    // TODO better
    const manifest = (def={}) => 
    (x => { document.head.append(x); return x })
    (
        (x => Object.assign(x, { rel: 'manifest' }, def))
        (Q('head [rel=manifest]') || document.createElement('link'))
    )
    const generate_manifest = async () => {
      const name = location.href.replace(location.protocol + '//', '').replace(/\/$/, '')
      const theme_color = Q('[name=theme_color]')?.content || getComputedStyle(document.documentElement).backgroundColor || getComputedStyle(document.body).backgroundColor || '#fdfcfa'
      const text_color = getComputedStyle(document.documentElement).color || getComputedStyle(document.body).color || '#111'
      const generated_icon = icon({ color:theme_color, text:name, text_color, update:true })
      
      return {
        name, short_name: '/home',
        display: `standalone`,
        start_url: location.href,
        theme_color, background_color: text_color,
        orientation: 'portrait',
        icons: [{
          src: generated_icon,
          sizes: `256x256`,
          type: `image/png`,
        }],
        shortcuts: [{
          name: '/home',
          url: '/',
          description: 'home',
        }, {
          name: '/tally',
          url: '/tally',
          description: 'habit tracker',
        }, {
          name: '/search',
          url: '/search',
          description: 'search projects',
        }],
        file_handlers: [{
          action: '/html-resume',
          accept: {
            'text/plain': ['.html-resume'],
            'application/json': ['.html-resume.json', '.json'],
          },
        }]
      }
    }
    const _replace_manifest = async () => {
        const new_manifest = await generate_manifest()
        icon(new_manifest.icons[0].src)
        manifest({
          href: URL.createObjectURL(new Blob([JSON.stringify(new_manifest)], { type: 'application/json' })),
        })
    }
    const timeout = setInterval(_replace_manifest, 250)
    return () => clearTimeout(timeout)
  })
  const subdomain = useSubdomain()
  const page = (x => 'contents contact about tldr list thanks log'.includes(x) ? x : 'home')(parseSubpath().replace('/', '') || subdomain)
  useF(page, () => page === 'home' && monstera && !location.href.includes('monstera') && url.silent('/monstera'))
  useF(page, () => page === 'home' && man && !location.href.includes('/man') && url.silent('/man'))
  console.debug('HOME', page, parseSubpath(), subdomain)
  meta.title.use({ value: page === 'home' ? location.host+location.pathname : `/${page || 'home'}` })
  const isMain = useM(() => set('freshman.dev freshman.dev').has(location.host)) // || dev
  const pathHack = {
    'cyrusfre.sh': 'man',
    'tr.ink': 'et',
  }
  const hackToPath = Object.fromEntries(Object.entries(pathHack).map(e => [e[1], e[0]+'/'+e[1]]))
  console.debug('PATH HACK', location.pathname, hackToPath[location.host])

  const tabs = 
  <div id='tabs' style={toStyle(``)}>{[
    subdomain ? 'home' :'',
    // 'contents',
    // 'tldr',
    'about',
    // 'thanks',
    // 'log',
    'contact'
  ].map(x => <A key={x}
    className={`tab ${x === page || (!page && 'home' === x) ? 'open' : ''}`}
    href={'/'+x}
    style={toStyle(`
    // text-transform: uppercase;
    // text-transform: lowercase;
    // text-shadow: .167px 0 #000, 0 .33px #000;
    margin-right: .75em;

    background: none;
    color: #222;

    ${x === page || (!page && 'home' === x) ? ''&&`
    // box-shadow: 0 5px white;
    background: var(--background);
    // background: #222;
    // color: #fff;

    // box-shadow: calc(.15rem - 1px) calc(.15rem - 1px) darkseagreen;
    // z-index: 0;

    background: none !important;
    border-color: var(--background) !important;
    ` : `
    `}
    text-decoration: none;
    border-color: transparent;

    min-width: 1.5em;
    `)}
    >
    /{x||'home'}
  </A>)}</div>

  const [hot, set_hot] = useS(undefined)
  useF(viewer, async () => {
    const { item:new_hot } = await api.get('hot/cyrus')
    set_hot(new_hot)
    log({new_hot})
  })
  
  const hot_percent = (value) => `${Math.round(value / hot.total * 100)}%`

  return !more ? <div style={S(`
  font-family: monospace;
  font-size: min(1em, 2vh);
  `)}>
     <div style={S(`
    text-transform: uppercase;
    `)}>Cyrus W Freshman</div>
    things to do
    <ol>
      <li>se.ts (but JavaScript)</li>
      {/* <li>machine code natively executed JavaScript minification</li> */}
      <li>graphql for minified JavaScript imports</li>
      {/* <li>mw-aui: modular Weather.app-esque ui</li> */}
    </ol>
    <div>
      <A href='/resume'>rèsumè</A> - <a onClick={() => setMore(true)}>personal site</a> - <span><A href='https://twitter.com/__freshman'>@__freshman</A>/Twitter</span>
    </div>
    {/* <a href="/resume-CyrusFreshman.pdf">rèsumè</a> */}
  </div> : 0 ? null : (
    <div id='home'>
      <div id='box'>
        <br/>
        <div id="title">
          <div className='row nowrap' style={S(`
          overflow: visible;
          width: max-content;
          `)}>
            <span style={S(`
            text-transform: uppercase;
            text-transform: lowercase;
            `)}>Cyrus W Freshman</span>
            &nbsp;
            {1 || !hot || !devices.is_mobile ? null : hot.hotted ? <>
              <span>{hot_percent(hot.hot)} hot / <a onClick={async e => {
                const { item:new_hot } = await api.get(`hot/cyrus/hot/un`)
                set_hot(new_hot)
              }}>unhot</a></span>
            </> : hot.notted ? <>
              <span><a onClick={async e => {
                const { item:new_hot } = await api.get(`hot/cyrus/not/un`)
                set_hot(new_hot)
              }}>unnot</a> / {hot_percent(hot.not)} not</span>
            </> : hot.vote ? <>
              <span>{Math.round(hot.hot/hot.total*100)}% <a onClick={async e => {
                const { item:new_hot } = await api.get(`hot/cyrus/hot`)
                set_hot(new_hot)
              }}>hot</a> / {Math.round(hot.not/hot.total*100)}% <a onClick={async e => {
                const { item:new_hot } = await api.get(`hot/cyrus/not`)
                set_hot(new_hot)
              }}>not</a></span>
            </> : <>
              <span>{Math.round(hot.hot/hot.total*100)}% hot {Math.round(hot.not/hot.total*100)}% not (<A href='/new'>vote</A>)</span>
            </>}
          </div>
          <div className='row nowrap' style={S(`
          overflow: visible;
          width: max-content;
          `)}>
            <a href="/resume">rèsumè</a>
            &nbsp;
            {/* <a onClick={() => {
              setMore(false)
              url.replace('/home')
            }}>landing</a>
            &nbsp; */}
            <a onClick={e => {
              const classes = document.documentElement.classList
              classes.toggle('ouch')
              e.currentTarget.textContent = classes.contains('ouch') ? 'nvm :/' : 'ouch'
            }}>ouch</a>
            &nbsp;
            {is_mobile ? null : theme_song?.flavor ? <a onClick={e => create_track_show()()}>{theme_song.flavor}</a> : <a onClick={e => create_track_show()()}>open music</a>}
            {is_mobile_not_watch ? <div><br/><br/></div> : null}
          </div>
          {/* {is_mobile ? null : <div className='row nowrap' style={S(`
          overflow: visible;
          width: max-content;
          `)}>
            <span>FRESHMAN.DEV LLC,</span>
            &nbsp;
            <A tab href='https://en.wikipedia.org/wiki/Providence,_Rhode_Island'>Providence RI</A>
          </div>} */}
          {/* <div style={S(`
          position: absolute; top: 100%; left: 0;
          position: fixed; top:unset;right:unset; bottom: 0; left: 0; margin: 1em;
          `)}>
            <a onClick={() => setMore(false)}><br/>landing</a>
          </div> */}
        </div>
        {/* <br/> */}
        <HalfLine />

        {isMain || dev || 1 ? null && <>
          <div className='row pre' style={S(`align-items:center`)}>
            Spotify hire me (<Help>
              gotta add 'move to top of queue'
              {/* <br/>and playlist radio on mobile */}
            </Help>)
          </div>
          <HalfLine />
        </> : <>
          <div>
            you're viewing from <a href={location.href}>{hackToPath[location.host] || punycode.toUnicode(location.host)}</a>, {location.host === 'cyrusfre.sh' || true ? <>see others: <A href='/domains'>/domains</A></> : <>the main URL is <a href='https://freshman.dev'>freshman.dev</a></>}
          </div>
          <HalfLine />
        </>}

        <p id='box-inner-container' style={toStyle(`
        display: flex;
        align-items: center;
        justify-content: center;
        // font-size: 0.75rem;
        // font-size: .9rem;
        margin: .25rem;;
        margin-top: 1rem;
        min-height: 9rem;

        align-items: flex-start;
        justify-content: flex-start;
        flex-direction: column;
        `)}>
          {is_mobile ? null : tabs}
          <div id='box-inner' className='invert-scrollbar' style={toStyle(`
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          border: 1px solid white;
          border-radius: 2px;
          border-radius: .5em;
          border-radius: .25em;
          border-radius: .5em;

          flex-direction: column;
          align-items: stretch;
          padding: 1em .67em;
          padding: 1em;
          // font-size: 1em;
          // font-size: .9em;

          border: 2px solid var(--light);
          // margin: -1px -.5rem;
          // width: calc(100% + 2 * (.67rem - 2px));
          // margin: -1px calc(-0.67rem + 2px);
          padding: 0.67rem calc(0.67rem - 2px);
          width: calc(100% + 4em);
          position: relative;
          left: -2em;

          flex-grow: 1;

          // font-size: 0.67rem;

          color: #222;
          border-radius: 4px;
          border-radius: 0;
          border-radius: 3px;

          background: #fff;
          // border: 1px solid #0003 !important;
          border: 1px solid #222 !important;
          // box-shadow: 0 0 0 1.5px #8881, 0 0 0 2.5px #88888808;

          // font-size: ${{
            // contact: '.95em',
            // contents: '1.1em',
            // contents: 'max(1.1em, 14px)',
            contents: 'max(.95em, 11px)',
          }[page] ?? 'max(1em, 12px)'};
          // padding: 1em;
          `)}>
            <Switch>
              <Redirect exact path='/projects' to='/contents'/>
              {/* <Redirect exact path='/about' to='/home'/> */}

              <Route exact path={'/(|home|man|et|monstera)'}><Highlights /></Route>
              <Route exact path='/thanks'><List /></Route>
              <Route exact path='/about'><About /></Route>
              <Route exact path='/contact'>
                {/* <div style={toStyle(`font-size: .775em;margin-bottom:1em`)}>
                  <span>Connect through the links above</span> <span>or message me here:</span>
                </div> */}
                <Contact newStyles />
              </Route>
            </Switch>
          </div>
          {is_mobile ? tabs : null}
        </p>

        <p id='watch-display' style={{display:'none', flexDirection:'column'}}>
          best viewed on something else.
          <br/><br/>
          <div style={toStyle(`
          display: flex;
          gap: .5em;
          flex-wrap: wrap;
          `)}>
            {/* <a href="/-terrain">terrain</a> <a href="/-pixelworld">pixelworld</a> <a href="/-slime-ants">slime-ants</a> <a href="/-dots-and-boxes">dots and boxes</a> <a href="/-egg">egg</a> */}
            {[
              ...list('egg,terrain', ',').map(x => <a key={x} href={"/-"+x.replace(' ', '-')}>{x}</a>),
              ...list('cafe cards shrimp shroom slime-ants trinket').map(x => <a key={x} href={"/raw/simple/"+x+".html"}>{x}</a>),
              ...list('pixelworld,tube,bubble', ',').map(x => <a key={x} href={"/-"+x.replace(' ', '-')}>{x}</a>),
              ...list('search', ',').map(x => <a key={x} href={"/-"+x.replace(' ', '-')}>{x}</a>),
            ]}
          </div>
        </p>

        <div id='user-controls' className="row end" style={S(mobile ? '' : `width: calc(100% - 4px + 1.34rem);`)}>
          {/* &nbsp; */}
          {viewer ? <>
            <span>
              {/* hi {viewer}! */}
              hi <A href={`/u/${viewer}`}>{viewer}</A>!
            </span>
            &nbsp;
            <a onClick={e => {
              logout()
            }}>log out</a>
          </> : <>
            {/* <a onClick={e => {
              openLogin() // fix for base (no header dropdown)
            }}>log in</a> */}
          </>}
        </div>
      </div>
    </div>
  )
}
