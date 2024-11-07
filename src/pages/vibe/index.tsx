import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from '../../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useE, useEventListener, useF, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { S } from 'src/lib/util'
import { meta } from 'src/lib/meta'
import Map from './pages/map'
import { ACCENT, BACK, PopupStyle, Style, TEXT } from './style'
import { Modal } from 'src/components/Modal'
import New from './modals/new'
import Post from './modals/post'
import { MODALS, PAGES } from './common'
import { store } from 'src/lib/store'
import Feed from './pages/feed'
import User from './pages/user'
import { openLogin } from 'src/lib/auth'
import { a_get_geo } from './func/general'

const { named_log, truthy, node, range, rand, devices, Q, values } = window as any
const NAME = 'vibe'
const log = named_log(NAME)

const page_set = [].concat(values(PAGES), values(MODALS))

export default () => {
  const [a] = auth.use()
  const [[page='', id=undefined], set_path] = usePathState({
    from: (path) => {
      const [page, id] = path.split('/')
      if (!page_set.includes(page)) return [PAGES.MAP, page === 'map' ? id : page]
      return [page, id]
    },
    to: ([page, id]) => [page !== 'map' && page, id].filter(truthy).join('/'),
  })
  const [preserve_view, set_preserve_view] = useS(!id)

  const [modal, set_modal] = useS(undefined)
  
  const [zip, set_zip] = store.use('vibe-zip', { default:'02904' })
  const [posts, set_posts] = useS(undefined)
  const [post_id, set_post_id] = useS(undefined)

  useF(page, id, () => {
    if (page === MODALS.POST && id) {
      set_modal(MODALS.POST)
      set_post_id(id)
    }
  })
  useF(modal, post_id, () => {
    if (!modal && post_id) {
      if (page === MODALS.POST) set_path([])
      set_post_id(undefined)
    } else if (modal === MODALS.POST && post_id) {
      set_path([MODALS.POST, post_id])
    }
  })

  const handle = {
    data: {
      a, page, id, preserve_view, modal, zip, posts, post_id,
    },
    set_path, set_preserve_view, set_modal, set_zip, set_post_id,
    load_posts: async () => {
      // get users location
      const geo = await a_get_geo()
      const { post_list } = await api.post('/vibe/posts/get', geo)
      log({post_list})
      set_posts(post_list)

      // // MOCKED - actually load using zipcode
      // // get users location
      // const [lng, lat] = await new Promise<any>(resolve => {
      //   navigator.geolocation.getCurrentPosition(position => {
      //     resolve([position.coords.longitude, position.coords.latitude])
      //   })
      // })
      // // spawn posts around user
      // const posts = range(100).map(() => {
      //   const id = rand.alphanum(12)
      //   const images = range(1 + rand.i(5)).map(() => `https://picsum.photos/seed/${rand.alphanum(12)}/200/200`)
      //   return {
      //     id,
      //     name: `post-${id}`,
      //     lat: lat + rand.s(.1),
      //     long: lng + rand.s(.1),
      //     images,
      //     n: images.length,
      //   }
      // })
      // set_posts(posts)
    },
    replace_post: (new_post) => {
      set_posts(posts.map(post => post.id === new_post.id ? new_post : post))
    },
    delete_post: async (post) => {
      const { id } = post
      await api.post('/vibe/post/delete', { id })
      set_posts(posts.filter(post => post.id !== id))
    },
    add_post: (post) => {
      set_posts([post, ...posts])
    },
  }

  useF(zip, handle.load_posts)

  // useF(async () => {
  //   const geo = await a_get_geo()
  //   if (geo.fake) {
  //     alert('you must enable location services to post')
  //   }
  // })

  const resize = () => {
    const nav = Q('#vibe-nav')
    // resize nav element font-size so it fits on one line
    nav.style['flex-wrap'] = 'nowrap'
    let size = 1
    const resize = () => nav.style['font-size'] = `${size}px`
    nav.style['width'] = '100%'
    resize()
    const target = nav.clientWidth
    nav.style['width'] = 'fit-content'
    const MAX_FONT_PX = 30
    while (nav.clientWidth <= target && size <= MAX_FONT_PX) {
      size += 1
      resize()
    }
    while (nav.clientWidth > target) {
      size -= .1
      resize()
    }
  }
  useF(resize)
  useEventListener(window, 'resize', resize)
  useE(() => {
    const theme_meta = node(`<meta name="theme-color" content="${TEXT}">`)
    document.head.insertAdjacentElement('afterbegin', theme_meta)
    return () => theme_meta.remove()
  })
  useStyle(`
  :root {
    --id-color-accent: ${ACCENT};
  }
  #header {
    // border-bottom: 1px solid currentcolor;
  }
  #inner-index#inner-index {
    // ${devices.is_mobile ? '' : 'border: 1px solid var(--id-color-accent) !important;'}
    ${a.expand ? `
    background: linear-gradient(#0004 0 0) var(--id-color) !important;
    ` : ''}
  }
  #inner-index#inner-index, #main > :first-child {
    background: url(/raw/vibe/bg.jpg) fixed !important;
    background-size: cover !important;
    background-position: center !important;
    image-rendering: pixelated !important;
  }
  #main {
      background: none !important;
  }

  #index::after {
    background: #000 !important;
    background: url(/raw/vibe/bg.jpg) fixed !important;
    background-size: cover !important;
    background-position: center !important;
    image-rendering: pixelated !important;
    opacity: .1;
  }
  #inner-index#inner-index {
    ${devices.is_mobile ? '' : `
    border: 1px solid ${ACCENT}66 !important;
    // box-shadow: 0 0 8px ${ACCENT}88 !important;
    `}
  }
  `)
  usePageSettings({
    // background: '#222', text_color: '#ddd',
    background: BACK, text_color: TEXT,
    uses: {
      'OpenLayers': ['https://openlayers.org/','https://github.com/openlayers/openlayers'],
    },
    icon: '/raw/vibe/icon-2.png',
  })
  return <Style id='vibe'>
    {modal ? <Modal outerClose={() => {
      if (page === MODALS.POST) {
        handle.set_preserve_view(true)
        handle.set_path(['', id])
      }
      handle.set_modal(undefined)
    }} style={`
    background: linear-gradient(${BACK}66 0 0) ${ACCENT}66 !important;
    `}><PopupStyle id='vibe-popup'><InfoBody>
      {modal === MODALS.NEW ? <New {...{ handle }} />
      : modal === MODALS.POST ? <Post {...{ handle }} />
      : null}
    </InfoBody></PopupStyle></Modal> : null}
    <InfoBody className='column w100 h100'>
      <div className='wide tall column'>
        {page === PAGES.MAP || page === MODALS.POST ? <Map {...{ id, handle }} />
        : page === PAGES.FEED ? <Feed {...{ handle }} />
        : page === PAGES.SEARCH ? <>
          <div className='wide tall center'><div className='accented'>coming soon 🔎</div></div>
        </>
        : page === PAGES.USER ? <User {...{ handle }} />
        : null}
      </div>
      <InfoBadges labels={[
        { 'map 🗺️': () => set_path([]) },
        { 'feed 🏞️': () => set_path(['feed']) },
        // { 'search 🔎': () => set_path(['search']) },
        a.user && { 'you 🧑‍🚀': () => set_path(['user']) },
        { 'new 📸': () => {
          if (a.user) {
            set_modal(MODALS.NEW)
          } else {
            openLogin()
          }
        }}
      ]} id='vibe-nav' />
    </InfoBody>
  </Style>
}