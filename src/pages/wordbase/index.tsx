// todo simplified html
import Color from 'color';
import React, { useState } from 'react';
import { Feedback } from '../../components/Info';
import { JSX } from '../../lib/types';
import styled from 'styled-components';
import { Modal, openFeedback } from '../../components/Modal';
import api, { auth } from '../../lib/api';
import console from '../../lib/console';
import { useE, useEventListener, useF, useM, useR, useStyle } from '../../lib/hooks';
import { usePageSettings, useSubpath, useTypedPathHashState } from '../../lib/hooks_ext';
import { meta } from '../../lib/meta';
import { useNotifyFilter } from '../../lib/notify';
import { useShrink } from '../../lib/shrink';
import { useSocket } from '../../lib/socket';
import user from '../../lib/user';
import { dev, getCssVar, layerBackground, object, transposeMat } from '../../lib/util';
import { theme, themes } from './common';
import { WordbaseCompete } from './compete';
import { local } from './data';
import { setLang } from './dict';
import './fonts.css';
import { WordbaseGame } from './game';
import { WordbaseMenu } from './menu';
import { Info } from './save';
import { WordbaseStats } from './stats';

const isSmooth = !/mobi/i.test(navigator.userAgent);
let smoothScrollFrame

if (/\/-?X$/.test(location.pathname)) location.href = location.origin + location.pathname.replace(/\/-?X$/, '')
if (/wordbase\.app/.test(location.origin)) location.href = 'https://freshman.dev/wordbase' + location.pathname.replace(/\/-/, '/') + location.search + location.hash

// const extractId = (): { id: string | false, stats: string | boolean } => {
//   const href = window.location.href
//   let id: string | false = false, stats: string | boolean = false
//   if (/#?\/?stats/.test(href)) {
//     stats = (/#?\/?stats\/(.+)/.exec(href) || ['',true])[1]
//   } else {
//     id = window.location.hash.slice(1) || false
//   }
//   // console.debug('EXTRACT', href, id, stats)
//   return { id, stats }
// }
// if (/replay\/.+/.test(location.pathname) && !location.hash) {
//   location.hash = /replay\/(.+)/.exec(location.pathname)[0]
// }
const extractParts = (path=location.pathname, hash=location.hash.slice(1)): { id: string, stats: string, compete: boolean, replay: string } => {
  const parts = path.split('/').filter(x => x && x !== 'wordbase')
  const search = new URLSearchParams(location.search)
  let id, stats, compete, replay
  if (parts[0] === 'stats') {
    stats = parts[1] || hash
  } else if (parts[0] === 'replay') {
    replay = (x => x ? Number(x) : true)(search.get('turn'))
    id = parts[1] || hash
  } else if (parts[0] === 'compete') {
    compete = true
  } else if (parts[0] === 'new') {
    id = 'new/' + (parts[1] || hash)
  } else {
    id = parts[0] || hash
  }
  // console.debug('WORDBASE extract parts', parts, hash, { id, stats, compete, replay })
  return { id, stats, compete, replay }
}

let initial = true
const html = document.body.parentElement
const body = document.body
const before = [html.style.fontSize, body.style.fontSize]
let actualLastOpen = ''

let _loaded = false
export default ({ signalLoad }: {
  signalLoad?
}) => {
  theme.use(x => meta.theme_color.set(getCssVar(theme.tile)))
  usePageSettings({
    background: getCssVar(theme.tile), text_color: getCssVar(theme.bomb),
    checkin: 'wordbase',
    uses: object('scrabble socket.io'),
  })
  
  let parts, _setPath
  ;[parts, _setPath] = useTypedPathHashState<{ id, stats, compete, replay }>({
    prefix: 'wordbase',
    from: (path, hash) => {
      const _parts = extractParts(path, hash)
      if (parts?.id && _parts.stats) _parts.id = parts.id
      return _parts
    },
    to: ({ id, stats, compete, replay }) => {
      console.debug('WORDBASE set path', { id, stats, compete, replay })
      return [
        stats ? `stats${stats === true ? '' : '/'+stats}` :
        replay ? `replay/${id}${typeof replay === 'number' ? `?turn=${replay < 0 ? info.turn : replay}` : ''}` :
        id && id !== 'unloaded' ? id :
        compete ? 'compete' :
        '', '']
    },
    push: true,
  })
  useF(JSON.pretty(parts), console.debug)

  const [loading, _setLoading] = useState(true)
  const loaded = useM(() => {
    const outerLoaded = signalLoad()
    if (_loaded) outerLoaded()
    let toLoad = 2 // wait for menu & (game | stats)
    return (open) => {
      if (open && extractParts().id) {
        setGameClosed(false)
      }
      toLoad--
      if (!toLoad) {
        setTimeout(() => {
          outerLoaded()
          _loaded = true
        }, 250)
        _setLoading(false)
      }
    }
  })

  const ref = useR()
  const [{ user:viewer }] = auth.use()
  const [infoList, setList] = useState<Info[]>(undefined)
  const [gameClosed, setGameClosed] = useState(!(parts.id || parts.stats))
  const [info, setInfo] = useState(parts.id
    ? Object.assign(Info.empty(parts.id), { turn: 0 })
    : undefined)
  const [reload, setReload] = useState(undefined)
  const [stats, setStats] = useState<string | boolean>(parts.stats)
  const [lastOpen, setLastOpen] = useState(undefined)
  const [dual, setDual] = useState(document.body.clientWidth > 1.25 * document.body.clientHeight)
  const [skipAnim, setSkipAnim] = useState(!!(parts.id || parts.stats))

  const [settings] = user.settings.use()
  useF(settings.wordbase.language, () => setLang(settings.wordbase.language))
  useF(
    (!gameClosed && info?.settings?.options?.theme) || settings.wordbase.theme,
    newTheme => theme.set(themes[newTheme]))
    useF(
      'WORDBASE new theme',
      (!gameClosed && info?.settings?.options?.theme) || settings.wordbase.theme, loading, info)

  // NVM just do word check locally
  // useF(settings?.wordbase.language, () => {
  //   if (settings?.wordbase.language === 'danish') {
  //     message.trigger({
  //       text: 'NOTICE'
  //     })
  //   }
  // })

  const [filter, setFilter] = useState<string>(undefined)

  const _shrink = useShrink()
  // const shrink = () => dual && ref.current?.firstChild && _shrink(ref.current?.firstChild)
  // const shrink = () =>
  //   dual && ref.current?.firstChild && _shrink(
  //     gameClosed ? ref.current?.firstChild.clientWidth : ref.current?.firstChild)

  const shrink = () => ref.current && _shrink(ref.current)
  // const shrink = () => ref.current?.firstChild && _shrink(
  //   gameClosed
  //   ? ref.current?.firstChild.clientWidth
  //   : dual
  //   ? ref.current?.firstChild // show both for dual
  //   : ref.current?.lastChild.clientWidth)
  // const shrink = ()=>{}

  const subpath = useSubpath('/wordbase')
  const [modal, _setModal]: any[] = useState(false)
  const modalHistory = useR([])
  const setModal = x => {
    switch (x) {
      case 'feedback':
        x = false
        openFeedback({ title: '' })
        break
      case 'back':
        modalHistory.current.pop()
        x = modalHistory.current.pop()
        break
    }
    if (x && JSON.stringify(x.props) !== JSON.stringify(modal.props)) modalHistory.current.push(x)
    else modalHistory.current = []
    _setModal(x)
  }
  const modalRef = useR(modal)
  useF(modal, () => {
    console.debug('MODAL', modal, modalHistory)
    modalRef.current = modal
    if (!loading && !modal && !dual && parts.stats) {
      if (!gameClosed) open(info?.id, false, parts.compete, parts.replay)
      else open(false, false, parts.compete, parts.replay)
    }
  })
  const currStats = stats
  const open = (
    id: string | false,
    stats?: string | boolean,
    compete?: string | boolean,
    replay?: number | boolean): string | false => {

    if (id === 'unloaded') id = false
    if (id || (stats === true && stats === currStats)) stats = false
    if (stats === undefined) stats = parts?.stats
    if (stats === true) stats = viewer || true
    if (id === undefined) id = parts?.id

    // if (stats) id = false

    // const href = window.location.href
    // if (stats === undefined && /stats/.test(href)) {
    //     stats = (/#stats\/(.*)/.exec(href) || ['',viewer])[1]
    //     id = false
    // }
    // if (stats && window['toggle'].on) throw 'error'
    // console.debug('OPEN', id, stats, viewer)

    console.debug('WORDBASE REPLAY', { id, stats, replay })

    compete = compete || (compete === undefined && !!/compete\/?(.*)/.exec(window.location.href))
    console.debug('WORDBASE COMPETE', { id, stats, compete })
    
    // if (compete) {
    //   url.push('/wordbase/compete')
    //   setGameClosed(false)
    //   setLastOpen('compete')
    //   setInfo(undefined)
    //   setStats(false)
    //   setTimeout(resizeAndScroll)
    //   return
    // } // return early, render compete seperately

    _setPath({ id, stats, replay, compete })

    // const pathend = (stats ? `stats${stats === true ? '' : `#${stats}`}` : '')
    //     + (id ? `#${id}` : '')

    // url.to(
    //   (stats && lastOpen !== 'stats') || (id && !actualLastOpen),
    //   toPath(
    //     `${subpath}${replay ? '/replay' : ''}`,
    //     stats
    //       ? (`stats${stats === true ? '' : `/${stats}`}`)
    //       : (id ? id : ''),
    //     stats ? '/#/' : '/#'))
    // const urlPush = id && !actualLastOpen
    // const urlPath = toPath(
    //   [subpath, (id && replay ? 'replay' : '') + location.search],
    //   stats
    //     ? (`stats${stats === true ? '' : `/${stats}`}`)
    //     : (id ? id : ''),
    //   id && replay ? '#' : stats ? '/#/' : '/#')
    // console.debug('WORDBASE PATH', urlPush, urlPath)
    // url.to(urlPush, urlPath)

    if (compete) {
      setGameClosed(false)
      setLastOpen('compete')
      setInfo(undefined)
      setStats(false)
      setTimeout(resizeAndScroll)
    } else if (stats) {
      console.debug('OPEN STATS', stats)
      // console.debug(modal, dual, (gameClosed || ![info?.p1, info?.p2].includes(stats)))
      if (viewer && !modalRef.current && dual && (gameClosed || ![info?.p1, info?.p2].includes(stats))) {
        const assign = () => {
          // clearShrink()
          setTimeout(shrink)
          setGameClosed(false)
          setLastOpen('stats')
          setInfo(undefined)
          setStats(stats)
          // setSave(undefined)
          // setTimeout(() => setLoading(false), 0)
        }
        assign()
        // if (dual && lastOpen !== 'stats') {
        //   setGameClosed(true)
        //   setSkipAnim(false)
        //   setTimeout(assign, 300)
        // } else assign()
      } else {
        // load in popup instead without changing other state
        const others = !gameClosed && info && info.id !== local.info.id ? [info.p1, info.p2] : []
        setModal(<WordbaseStats {...{ user:stats, popup:true, open, loaded, others, setFilter }} />)
        setStats(false)
        setGameClosed(!id)
        // setTimeout(() => setLoading(false), 0)
      }
    } else if (id) {
      // if (actualLastOpen === id && opened) return
      // clearShrink()
      setTimeout(shrink)
      setLastOpen(id)
      actualLastOpen = id
      const loadInfo = id === local.info.id ? local.info : infoList?.find(x => x.id === id) || Info.empty(id)
      setInfo(loadInfo)
      if ((loadInfo.id === local.info.id && info?.id === loadInfo.id) || (loadInfo.id === info?.id && !replay)) {
        // special case, make sure game re-loads new local data
        // setInfo(undefined)
        // setTimeout(() => setInfo(loadInfo))
        setReload({ id: loadInfo.id })
      }
      setStats(stats)
      // if (id === local.info.id) {
      //   // setReload(Object.assign({}, info))
      //   setGameClosed(true)
      // }
      setGameClosed(false)
      // setGameClosed(true)
      // setTimeout(() => {
      //   setGameClosed(false)
      // }, 100)
      setTimeout(resizeAndScroll)
      // setGameClosed(true)
      // const start = Date.now()
      // fetchGame(id).then(({info, save}) => {
      //   if (info.id !== actualLastOpen && !/new\/.+/.test(actualLastOpen)) return
      //   if (info) {
      //     const assign = () => {
      //       // setSave(save)
      //       setInfo(info)
      //       setGameClosed(false)
      //     }
      //     if (dual) {
      //       // setGameClosed(true)
      //       // setGameClosed(false)
      //       setSkipAnim(false)
      //       setTimeout(assign, 300 - (Date.now() - start))
      //     } else assign()
      //   }
      // }).catch(console.debug)
    } else {
      setGameClosed(true)
      setSkipAnim(false)
      setStats(stats)
      // setTimeout(() => setLoading(false), 0)
      // setTimeout(loaded)
      setModal(false)

      // clear local after game has closed (but not before to prevent showing an empty board)
      if (info?.id === local.id) setTimeout(() => setInfo(undefined), transitionMs * 3)
      // if (info?.id) setTimeout(() => setInfo(undefined), transitionMs * 5)
    }

    return id
  }
  useF(...Object.values(parts), () => open(parts.id, parts.stats, parts.compete, parts.replay))

  useF(() => {
    const id = parts.id
    if (id) {
      setSkipAnim(true)
      info.id = id
      // save.board = undefined
      // setInfo(Info.empty(id))
      // setSave(Save.empty())
      setGameClosed(false)
    } else if (parts.stats) {
      setSkipAnim(true)
      setGameClosed(false)
    } else {
      setSkipAnim(false)
    }
  });
  useE(() => meta.description.set('clone of Wordbase (discontinued word game)'))
  useE(() => meta.icon.set('/raw/wordbase/favicon.png'))
  theme.use(newTheme => {
    // console.debug('THEME SET', newTheme)
    // replace icon colors with theme
    const img = document.createElement('img')
    img.onload = () => {
      meta.icon.set({
        x256: (ctx256, canvas256) => {
          const canvas = document.createElement('canvas')
          canvas.height = canvas.width = img.width
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)

          const data = ctx.getImageData(0, 0, img.width, img.width)
          const c2i = (x, y) => (x + y*data.width)*4
          const getPixel = (x, y) => {
            const i = c2i(x, y)
            return Array.from(data.data.slice(i, i+4))
          }
          const setPixel = (x, y, color) => {
            const i = c2i(x, y)
            const rgb = color.rgb().array()
            rgb.map((x, j) => data.data[i + j] = x)
          }
          const isColor = (x, y, color, threshold=0) => {
            const pixel = getPixel(x, y)
            const rgb = color.rgb().array().concat([255])
            return pixel.every((x, i) => Math.abs(x - rgb[i]) <= threshold)
          }
          const replaceColors = (pairs: [Color, Color][]) => {
            for (let x = 0; x < data.width; x++) {
              for (let y = 0; y < data.height; y++) {
                pairs.forEach(([a, b]) => {
                  if (isColor(x, y, a)) {
                    setPixel(x, y, b)
                  }
                })
              }
            }
          }

          const colorMap = [
            ['#4bdbff', newTheme.icon?.blue || newTheme.blue],
            ['#ff9900', newTheme.icon?.orange || newTheme.orange],
            ['#ffffff', newTheme.icon?.tile || newTheme.tile],
            ['#fefefe', newTheme.icon?.eyes || newTheme.icon?.tile || newTheme.tile],
          ].map(x => x.map(y => Color(getCssVar(y)))) as [Color, Color][]
          replaceColors(colorMap)
          ctx.putImageData(data, 0, 0)

          console.debug('WB THEMED ICON', transposeMat(colorMap).map(x => x.map(c => c.hex()).join(' / ')).join(' => '), canvas.toDataURL())

          ctx256.drawImage(
            canvas,
            0, 0, canvas.width, canvas.height, 
            0, 0, canvas256.width, canvas256.height)
        },
      })
    }
    img.src = '/raw/wordbase/favicon.png'
    // return () => delete img.onload
  })

  const name = !gameClosed && info ? `${info.p1||'blue'} vs ${info.p2||'orange'} (wordbase)` : '/wordbase' // origin.includes('wordbase') || dev ? `wordbase.app` : '/wordbase'
  meta.title.use({ value: name })
  meta.icon.use(href => meta.manifest.set({
    name,
    display: `standalone`,
    start_url: `${window.origin}${subpath}`,
    icons: /^data:image/.test(href as string) ? [{
      src: href,
      sizes: `256x256`,
      type: `image/png`,
    }] : [{
      src: `${window.origin}/raw/wordbase/favicon.png`,
      sizes: `32x32`,
      type: `image/png`,
    }, {
      src: `${window.origin}/raw/wordbase/favicon256.png`,
      sizes: `256x256`,
      type: `image/png`,
    }, {
      src: `${window.origin}/raw/wordbase/favicon512.png`,
      sizes: `512x512`,
      type: `image/png`,
    }],
  }))
  useF(info, () => {
    // update infoList from current info
    if (info && infoList) {
      const toUpdate = infoList.find(i => i.id === info.id)
      console.debug('UPDATE', toUpdate)
      if (toUpdate) {
        Object.assign(toUpdate, info)
        setList(infoList.slice())
      } else if (info.id === local.info.id) {
        setList([info].concat(infoList))
      }
    }
  })

  // reload on wordbase:update, focus, and notify:msg
  useSocket({
    // room: 'wordbase',
    on: {
      'wordbase:update': newInfo => {
        console.debug('wordbase:update', newInfo)
        setReload(newInfo)
      }
    }
  })
  // useEventListener(window, 'focus', () => !gameClosed && info && setReload({ id: info.id }))
  useEventListener(window, 'focus', e => {
    if (e.target === e.currentTarget) {
      !gameClosed && info && setReload({ id: info.id })
    }
  })
  useNotifyFilter((app, text) => {
    const match = text.match(/\/wordbase#(\w+)/)
    if (match) {
      const id = match[1]
      console.debug('WORDBASE FILTER', id)
      // if (gameClosed || id === info.id)
      if (!gameClosed && id === info?.id) {
        setReload({ id })
        return true
      } else if (gameClosed) {
        setReload({ id })
      }
    }
    return false
  })
  // local.use(() => setReload(Object.assign({}, local.info)))

  function scroll(L: HTMLElement, left) {
    if (!L?.children) return
    // if (left > 0) return Array.from(L.children).at(-1).scrollIntoView({ behavior: 'smooth' })
    // else {
    //   Array.from(L.children).at(-1).scrollIntoView({})
    //   L.children[0].scrollIntoView({ behavior: 'smooth' })
    //   return
    // }
    const children = Array.from(L.children) as HTMLElement[]
    children.forEach(x => x.style.transition = `left ${skipAnim ? 0 : transitionMs}ms`)
    if (left > 0) {
      // L.style.left = '100%'
      children.forEach(x => x.style.left = `calc(-100% - ${dual ? dualDividerWidth : dividerWidth})`)
    } else {
      // L.style.left = '0'
      children.forEach(x => x.style.left = '0')
    }
    return

    if (true || isSmooth || skipAnim) {
      L.scrollLeft = left
      // console.debug('SCROLL 1', skipAnim, L.scrollLeft)
      setTimeout(() => {
        setSkipAnim(false)
        L.scrollLeft = left
        // console.debug('SCROLL 2', skipAnim, L.scrollLeft)
        setTimeout(() => {
          L.scrollLeft = left
          // console.debug('SCROLL 3', skipAnim, L.scrollLeft)
        })
      })
      return
    }

    cancelAnimationFrame(smoothScrollFrame)
    const curr = L.scrollLeft
    if (curr === left) return
    const delta = left - curr
    const start = Date.now()
    const ms = 50
    function doScroll() {
      const elapsed = Date.now() - start
      if (elapsed > ms) {
        L.scrollLeft = left
      } else {
        L.scrollLeft = curr + (elapsed / ms) * delta
        smoothScrollFrame = requestAnimationFrame(doScroll)
      }
    }
    smoothScrollFrame = requestAnimationFrame(doScroll)
  }

  function resizeAndScroll() {
    console.debug('WORDBASE resize and scroll')
    const L = ref.current as HTMLElement
    if (!L) return
    const body = document.body
    if (dual) {
      // const menu = L.children[0]
      // if (menu.clientWidth < menu.clientHeight * .42) {
      // // if (L.scrollWidth > L.clientWidth) {
      //     setDual(false)
      // }
      if (body.clientWidth < 1.25 * body.clientHeight) {
        setDual(false)
        scroll(L, 0)
      }
    } else {
      // if (L.parentElement.clientHeight * 1.3 < L.parentElement.clientWidth) {
      //     setDual(true)
      // } else {
      //     scroll(L, gameClosed
      //         ? 0
      //         : L.clientWidth + 1)
      // }

      if (body.clientWidth > 1.25 * body.clientHeight) {
        setDual(true)
        scroll(L, 0)
      } else {
        scroll(L, gameClosed
          ? -L.scrollWidth
          : L.scrollWidth + 1)
      }
      // scroll(ref, gameClosed
      //     ? 0
      //     : ref.clientWidth + 1)
    }
    // setTimeout(shrink)
  }
  useEventListener(window, 'resize deviceorientation', resizeAndScroll)
  useF(gameClosed, dual, viewer, info, reload, () => {
    resizeAndScroll()
    setTimeout(resizeAndScroll, 100)
  })
  // useF(gameClosed, dual, () => setTimeout(shrink))
  useF(gameClosed, dual, shrink)

  // do this immediately before rendering
  if (initial) {
    const fontSize = 'max(8px, min(min(2vh, 3.6vw), 22px))'
    html.style.fontSize = fontSize
    body.style.fontSize = fontSize
    initial = false
  }
  useE(() => {
    return () => {
      html.style.fontSize = before[0]
      body.style.fontSize = before[0]
      initial = true
    }
  })
  useF(lastOpen, () => actualLastOpen = lastOpen)

  const fullscreen = viewer && settings.wordbase.full
  useF(fullscreen, () => fullscreen && auth.set({ ...auth.get(), expand: false }))
  theme.use()
  useStyle(viewer && fullscreen
    ? `
    #inner-index {
      visibility: hidden;
    }
    .wordbase {
      visibility: visible;
    }
    ` : `
    #index::after {
      background: ${theme.background} !important;
    }
    #main {
      // background: transparent !important;
      // background: #222 !important;
      // ${auth.expand ? `background: #222 !important;` : ''}
    }
    .wordbase {
      background: #fff;
    }
    #header {
      border-bottom: 1px solid ;
      background: ${theme.tile};
      color: ${theme.bomb};
    }
    #header #home {
      border: 1px solid black !important;
      border-radius: 15%;
      overflow: hidden;
    }
    #header #crumbs a {
      ${theme.backing ? `color: ${theme.bomb};` : ''}
    }

    .stand-in:has(.wordbase-game) {
      margin: .5em;
    }
    .dual-true .wordbase-game {
      overflow: hidden;
      border-radius: .3em;
    }
    `)
  useStyle(theme._theme.css)

  const compete = !!/compete\/?(.*)/.exec(location.href)
  useF(compete, () => compete && open(false, false, true))
  const content = compete || lastOpen === 'compete'
    ? <WordbaseCompete {...{ open, popup: modal, loaded }} />
    : stats || lastOpen === 'stats'
    ? <WordbaseStats {...{ auth, user: stats, open, popup: modal, loaded, setFilter }} />
    : // info || lastOpen ?
    <WordbaseGame {...{ open, info, reload, setInfo, dual, gameClosed, setModal, loaded }} />
    //: <WordbaseCompete {...{ open, popup: modal, loaded }} /> // TODO better solution
  return <Style ref={ref} className={`wordbase closed-${gameClosed && !stats} dual-${dual} anim-${!skipAnim} user-${!!viewer} full-${fullscreen} loading-${loading} wb-dark-${theme.dark}`}>
    <WordbaseMenu {...{ menuClosed: !gameClosed, open, infoList, reload, setList, setModal, loaded, filter, setFilter }} />
    {dual && !lastOpen ? '' : <div className='divider'></div>}
    {dual
    ? <div className='stand-in'>
      {content}
    </div>
    : content}

    {/* {modal ? <><Modal full={settings.wordbase.full}><ModalStyle
    onClick={() => setModal(false)}>
      MODAL
    <div className='modal-main' onClick={e => e.stopPropagation()}>
      <div className='info'>
        <div className='content'>
          {modal}
        </div>
        <div className={`controls control-group controls-2`}>
          <div className='control feedback' onClick={() => setModal('feedback')}>send feedback</div>
          <div className='control-group'>
            {modalHistory.current.length > 1
            ? <div className='control' onClick={() => {
              modalHistory.current.pop()
              setModal(modalHistory.current.pop())
            }}>back</div>
            : ''}
            <div className='control' onClick={() => setModal(false)}>close</div>
          </div>
        </div>
      </div>
    </div>
    </ModalStyle></Modal>
    </> : null} */}
    {modal ? <Modal><ModalStyle onClick={() => setModal(false)}>
      <div className='modal-main' onClick={e => e.stopPropagation()}>
        <div className='info'>
          <div className='content'>
            {modal}
          </div>
          <div className={`controls control-group controls-2`}>
            <div className='control feedback' onClick={() => setModal('feedback')}>send feedback</div>
            <div className='control-group'>
              {modalHistory.current.length > 1
              ? <div className='control' onClick={() => {
                modalHistory.current.pop()
                setModal(modalHistory.current.pop())
              }}>back</div>
              : ''}
              <div className='control' onClick={() => setModal(false)}>close</div>
            </div>
          </div>
        </div>
      </div>
    </ModalStyle></Modal> : null}
  </Style>
  // return (
  //     info
  //     ? <Wordbase {...{ open, info, setInfo, save, setSave }} />
  //     : <WordbaseMenu {...{ open, infoList, setList }} />
  // );
}

const transitionMs = 300
const dividerWidth = '.5px'
const dualDividerWidth = '2rem'
const CommonStyles = styled.div`
font-family: Ubuntu, sans-serif;
`
const Style = styled(CommonStyles)`
&.loading {
  visibility: hidden;
}

> * {
  overflow: hidden;
}

height: 100%;

&.dual-false {
  width: 100%;
  max-width: 77vh;
  overflow-x: hidden;
  &.anim-true { ${isSmooth ? 'scroll-behavior: smooth;' : ''} }
  display: flex;

  > * {
    height: 100%;
    min-width: 100%;
    // transition: .2s;
    position: relative;
  }
  .divider {
    background: transparent;
    min-width: ${dividerWidth};
  }
}

&.dual-true {
  background: ${theme.tile};
  max-width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: left;
  > * { flex-shrink: 0; margin: 0 }
  *:is(.wordbase-menu, .stand-in, .wordbase-game, .wordbase-stats) {
    min-width: 59.7vh;
    max-width: 59.7vh;
  }
  &.closed-true {
    max-width: 59.7vh;
    .stand-in {
      visibility: hidden;
      animation: close ${transitionMs}ms;
      @keyframes close {
        from { visibility: visible }
        to { visibility: visible }
      }
    }
  }
  .divider {
    // background: var(--wb-bomb);
    background: black;
  }
  &.full-true {
    border: 0;
    justify-content: center;
    .wordbase-menu, .wordbase-game, .wordbase-stats {
      border: 1px solid black;
      border-top: 0; border-bottom: 0;
    }
    .wordbase-menu {
      margin: 0 ${dualDividerWidth};
      z-index: 9999;
    }
    .divider {
      display: none;
    }
    .stand-in {
      max-width: 60vh;
      transition: left ${transitionMs}ms, min-width ${transitionMs}ms;
      position: relative;
      left: 0;
    }
    &.closed-true {
      .stand-in {
        left: calc(-59.7vh - ${dualDividerWidth});
        width: 0; min-width: 0;
      }
    }
    &.closed-false {
      .stand-in {
        animation: open ${transitionMs}ms;
        @keyframes open {
          from {
            left: calc(-59.7vh - ${dualDividerWidth});
            width: 0; min-width: 0;
          }
        }
      }
    }
  }
  &.full-false {
    .divider {
      width: 1px;
    }
  }
  ${true && `
  .wordbase-menu, .wordbase-game {
    background: ${layerBackground(theme.background, theme.dual_feed)};
  }
  `}
  .wordbase-menu {
    .game-list .top:first-child::after {
      background: ${layerBackground(theme.background, theme.dual_feed)};
    }
  }
}

&.full-true.user-true {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  max-width: 100%;
  background: ${theme.background};
  border: 0;
  // .wordbase-menu { border: 1px solid black; border-top: 0; border-bottom: 0 }
  // padding: 0 calc(36vw - 50vh);
  // &.closed-false { justify-content: space-around }
}

.button {
  border-radius: 4px !important;
}
`

export const ModalStyle = styled(CommonStyles)`
height: 100%; width: 100%;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
background: #fff8;
background: #0004;
background: var(--wb-bomb_5);
font-family: Ubuntu;
text-shadow: none;
// border-radius: 0.2rem;
border-radius: inherit;

// position: relative;
position: fixed;
top: 0; left: 0;

overflow: hidden;

.modal-main {
  z-index: 2;
  white-space: pre-wrap;
  // height: 50%;
  width: calc(100% - 1rem);
  max-width: 32rem;
  max-width: 39rem;
  max-width: max-content;
  max-height: calc(100% - 2rem);
  background: ${theme.tile};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0.2rem;
  // border: .2rem solid #131125;

  white-space: pre-wrap;

  // animation: .2s appear; // cubic-bezier(0.34, 1.56, 0.64, 1);
  // @keyframes appear {
  //     from { transform: scale(0); }
  //     to { transform: scale(1); }
  // }

  .info {
    max-height: 100%;
    display: flex;
    flex-direction: column;
    // padding: 1rem;
    padding: .67rem;

    padding: 0.25em;
    background: transparent;

    // background: var(--dark);
    // background: rgb(45, 45, 45);
    // background: black;
    // background: #131125;
    // background: ${theme.bomb === '#000000' ? '#131125' : theme.bomb};
    // background: ${layerBackground(theme.bomb, '#fff1')};
    color: ${theme.tile};
    .content {
      flex-shrink: 1;
      overflow: auto;
      // color: black;
      // background: ${theme.tile};
      // padding: .3rem;
      // border-radius: .3rem;
      // min-height: 12rem;

      // color: black;
      // background: white;
      // color: ${theme.bomb};
      // background: ${theme.tile};

      // padding: 0.5rem 0.7rem;
      /* border-radius: 0.3rem; */
      // min-height: 24rem;
      // min-height: 18rem;
      > .body {
        padding: 0.5rem 0.7rem;
        overflow-y: auto;

        > p:first-child {
          margin-bottom: 0.5rem;
          text-decoration: underline;
          font-size: 1.2rem;
        }
      }
      ul {
        list-style-type: none;
        padding: 0;
        li {
          font-size: 1rem;
          margin-bottom: 0.3rem;
          // opacity: .7;
          white-space: pre-wrap;
        }
      }
      .control {
        cursor: pointer; user-select: none;
        background: black;
        // background: #000d;
        // border-bottom: 1px solid black;
        // background-clip: padding-box;
        color: white;
        text-shadow: none;
        font-size: 1.2rem;
        // margin: 0 .5rem;
        margin
        // border-radius: .3rem;
        border-radius: 2px !important;
        padding: 0 .3rem;
        display: inline-block;

        &.disabled {
          opacity: .3;
          pointer-events: none;
        }
      }
    }
    .controls {
      margin-top: 1rem;
      display: flex;
      flex-direction: row;
      // justify-content: flex-end;
      justify-content: space-between;
    }

    .control-group {
      display: inline-flex;
      align-items: center;
      > * {
        &:not(:last-child) {
          margin-right: .33em;
        }
      }
    }
  }

  .body {
    // hacky for now, track down all UI elements we need to style
    padding: 0;
    padding-bottom: inherit;
    * {
      color: inherit;
    }
    & {
      .label, .button, .action {
        border-radius: .15em !important;
      }
      &, .label, .select {
        background: ${theme.tile};
        color: ${theme.bomb};
      }
      .label {
        // opacity: 1 !important;
        // background: ${theme.bomb_1} !important;
        background: ${theme.bomb_1} !important;
        color: ${theme.bomb} !important;
      }
      .button {
        // border-color: ${theme.bomb} !important;
        background: ${theme.bomb} !important;
        color: ${theme.tile} !important;
      }
      .action {
        // background: ${theme.bomb_1} !important;
        background: ${theme.bomb} !important;
        color: ${theme.tile} !important;
      }
      .entry-line a, .entry.link {
        color: ${theme.bomb};
      }
    }

    height: 100%;

    .control {
      color: ${theme.tile} !important;
      background: ${theme.bomb} !important;
      text-shadow: none;
      &.inverse { color: ${theme.bomb}; background: ${theme.tile}; border: solid 2px ${theme.bomb}; }
      padding: 0 .3rem;
      min-width: 1.5rem;
      width: fit-content;
      border-radius: .3rem;
      cursor: pointer;
      user-select: none;
      display: inline-flex; justify-content: center;
      text-decoration: none;
    }
  }
}

.control:not(.content *) {
  cursor: pointer; user-select: none;
  background: ${theme.bomb};
  // border-bottom: 1px solid #fffd;
  // background-clip: padding-box;
  // &:active { border-bottom: 0; border-top: 1px solid transparent; }
  color: ${theme.tile};
  font-size: 1.25rem;
  padding: 0 .3rem;
  border-radius: .3rem;
  // text-transform: uppercase;
  &.feedback {
    font-size: 1rem;
    background: transparent;
    border: 0;
    // color: #fff5;
    color: ${theme.bomb_1};
    text-transform: uppercase;
    margin-right: 2em !important;
  }
}


:has(.body.feedback) .control.feedback {
  visibility: hidden;
}
:has(.body.feedback) .controls {
  display: none;
}
.modal-main .body {
  // padding: .25em !important;
}
`
