import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles, Select } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useE, useF, useInline, useM, useS, useSkip } from 'src/lib/hooks'
import api from 'src/lib/api'
import url from 'src/lib/url'
import { meta } from 'src/lib/meta'
import { S, dev } from 'src/lib/util'
import { store } from 'src/lib/store'

const { named_log, defer, copy, display_status, strings, values } = window as any
const log = named_log('twitter')

const is_fullscreen = window.matchMedia('(display-mode: fullscreen)').matches
const is_standalone = window.matchMedia('(display-mode: standalone)').matches
const is_minimal_ui = window.matchMedia('(display-mode: minimal-ui)').matches

const OPTIONS = {
  THREADS: 'threads',
  BSKY: 'bluesky',
  X: 'x',
}
const COOKIES = {
  OPTION: 'twitter-option-2',
  VISITED: 'twitter-visited-2',
}
const OPTION_TO_URL = {
  [OPTIONS.THREADS]: 'https://threads.net',
  [OPTIONS.BSKY]: 'https://bsky.app',
  [OPTIONS.X]: 'https://x.com',
}
const DEFAULT_OPTION = OPTIONS.BSKY

store.cookie.clear(COOKIES.VISITED)
store.cookie.clear(COOKIES.OPTION)

const redirect_option = new URLSearchParams(location.search).get('') || store.get(COOKIES.OPTION)
const start_url = location.href
const do_url_shuffle = start_url !== location.origin + `/twitter?=${redirect_option}`

export default () => {
  const [option, set_option] = usePathState()
  const redirect = !option && store.get(COOKIES.OPTION) && store.get(COOKIES.VISITED)
  useInline(() => {
    if (redirect) {
      // alert(redirect_option)
      location.href = OPTION_TO_URL[redirect_option]
    }
  })
  useF(option, () => {
    if (do_url_shuffle) {
      store.clear(COOKIES.VISITED)
      store.set(COOKIES.OPTION, option)
      location.href = `/twitter?=${option}`
    } else if (!redirect && !values(OPTIONS).includes(option)) {
      set_option(store.get(COOKIES.OPTION) || DEFAULT_OPTION)
    }
  })
  const icon = useM(option, () => {
    return {
      [OPTIONS.THREADS]: '/raw/twitter/icon.png',
      [OPTIONS.BSKY]: '/raw/twitter/bsky-twitter.png',
      [OPTIONS.X]: '/raw/twitter/x-twitter.png',
    }[option || redirect_option || store.get(COOKIES.OPTION)] || '/raw/twitter/twitter.png'
  })
  useE(option, () => {
    if (do_url_shuffle) return
    if (option) {
      store.set(COOKIES.VISITED, true)
      store.set(COOKIES.OPTION, option)
      // set_option('')
      meta.icon.set(icon)
      meta.title.set('twitter')
      const existing_manifest = meta.manifest.get()
      const new_manifest = {
        id: 'twitter',
        name: 'twitter',
        display: 'fullscreen',
        start_url: location.origin + `/twitter?=${option}`,
        theme_color: '#1DA1F2',
        icons: [{
          src: location.origin + icon,
          sizes: '256x256',
          type: 'image/png',
        }],
      }
      log('set manifest', {existing_manifest, new_manifest})
      meta.manifest.set(new_manifest)
      meta.manifest_lock.locked = true
      const W = window as any
      W._pause_replace_manifest = true
      log('twitter manifest', meta.manifest.get())

      if (start_url !== new_manifest.start_url) {
        store.clear(COOKIES.VISITED)
        location.href = new_manifest.start_url
      }

      return () => {
        meta.manifest.set(existing_manifest)
        meta.manifest_lock.locked = false
        W._pause_replace_manifest = false
      }
    }
  })
  const [install] = meta.install.use()

  usePageSettings({
    professional: true,
  })
  return <Style>
    <InfoBody className='column' style={S(`position: relative`)}>
      {redirect ? <>
        <div className='cover center'>
          <img src={icon} style={S(`
          height: 10em;
          width: 10em;
          `)} />
        </div>
      </> : <>
        <InfoSection className='column gap' style={S(`
        border: 1px solid #000;
        border-radius: .25em;
        padding: .5em;
        
        align-items: center;
        `)}>
          <div>add a Twitter blue <InfoBadges labels={[
            <Select value={option} options={values(OPTIONS)} setter={set_option} /> as any,
          ]} />  icon to your home screen</div>
          {/* <div><b>reload to redirect to Threads first time after install</b></div> */}
          <HalfLine />
          <a onClick={e => install?.prompt()}>
            <img src={icon} style={S(`
            height: 10em;
            width: 10em;
            `)} />
          </a>
          <HalfLine />
          <InfoBadges labels={[
            install && { install: () => install.prompt() },
            { share: e => {
              copy(location.href),
              display_status(e.target, `copied!`)
              navigator.share({ url: location.href })
            } }
          ]} />
        </InfoSection>
        <InfoSection labels={[
          'debug',
          // dev && { 'clear cookie': () => {
          //   localStorage.setItem(COOKIES.VISITED, '')
          //   localStorage.setItem(COOKIES.OPTION, '')
          // } },
        ]}>
          <div>{strings.json.pretty({is_fullscreen, is_standalone, is_minimal_ui, 'navigator.standalone':navigator.standalone??null})}</div>
        </InfoSection>
        <div className='spacer' />
        <InfoSection label='more'>
          <div>- read <A bold tab='/about' /> this website</div>
          <div>- <A bold tab='/contact' /> me</div>
          <div>- donate a <A bold tab='/coffee' /></div>
        </InfoSection>
      </>}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
`