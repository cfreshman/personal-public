import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useE, useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import url from 'src/lib/url'
import { meta } from 'src/lib/meta'
import { S, dev } from 'src/lib/util'

const { named_log, defer, copy, display_status, strings } = window as any
const log = named_log('twitter')

const is_fullscreen = window.matchMedia('(display-mode: fullscreen)').matches
const is_standalone = window.matchMedia('(display-mode: standalone)').matches
const is_minimal_ui = window.matchMedia('(display-mode: minimal-ui)').matches

const COOKIES = {
  VISITED: 'twitter-visited',
}

export default () => {
  const [option, set_option] = usePathState()
  useF(() => {
    log({option, is_standalone})
    if (!option && localStorage.getItem(COOKIES.VISITED)) {
      location.href = `https://threads.net`
    } else {
      localStorage.setItem(COOKIES.VISITED, 'true')
      set_option('')
      meta.icon.set('/raw/twitter/icon.png')
      meta.title.set('twitter')
      const timeout = setInterval(() => {
        const existing_manifest = meta.manifest.get()
        const new_manifest = {
          name: 'twitter',
          display: 'fullscreen',
          start_url: '/twitter',
          theme_color: '#1DA1F2',
          icons: [{
            src: '/raw/twitter/icon.svg',
            sizes: 'any',
          }, {
            src: '/raw/twitter/icon.png',
            sizes: '256x256',
            type: 'image/png',
          }],
        }
        log('set manifest', {existing_manifest, new_manifest})
        meta.manifest.set(new_manifest)
      }, 500)
      return () => clearTimeout(timeout)
    }
  })
  const [install] = meta.install.use()

  usePageSettings({
    professional: true,
  })
  return <Style>
    <InfoBody className='column'>
      <InfoSection className='column gap' style={S(`
      border: 1px solid #000;
      border-radius: .25em;
      padding: .5em;
      
      align-items: center;
      `)}>
        <div>add this website to your home screen for a Twitter blue Threads icon</div>
        <div><b>reload to redirect to Threads first time after install</b></div>
        <HalfLine />
        <a onClick={e => install?.prompt()}>
          <img src='/raw/twitter/icon.png' style={S(`
          height: 10em;
          width: 10em;
          `)} />
        </a>
        <HalfLine />
        <InfoBadges labels={[
          install && { install: () => install.prompt() },
          { share: e => {
            copy(location.origin + '/twitter/install'),
            display_status(e.target, `copied!`)
          } }
        ]} />
      </InfoSection>
      <InfoSection labels={[
        'debug',
        dev && { 'clear cookie': () => {
          localStorage.setItem(COOKIES.VISITED, '')
        } },
      ]}>
        <div>{strings.json.pretty({is_fullscreen, is_standalone, is_minimal_ui, 'navigator.standalone':navigator.standalone??null})}</div>
      </InfoSection>
      <div className='spacer' />
      <InfoSection label='more'>
        <div>- read <A bold tab='/about' /> this website</div>
        <div>- <A bold tab='/contact' /> me</div>
        <div>- donate a <A bold tab='/coffee' /></div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
`