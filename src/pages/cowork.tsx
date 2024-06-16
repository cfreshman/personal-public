import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useR, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { useRoom, useSocket } from 'src/lib/socket'
import { openFrame, openPopup } from 'src/components/Modal'
import { desktop, mobile, S } from 'src/lib/util'
import url from 'src/lib/url'
import { openLogin } from 'src/lib/auth'

const { named_log } = window as any
const NAME = 'cowork'
const log = named_log(NAME)

const open_popup = (closer) => {
  openPopup(close => <InfoStyles>
    <InfoBody>
      {closer(close)}
    </InfoBody>
  </InfoStyles>, `
  height: max-content;
  width: max-content;
  background: #000 !important;
  padding: 0;
  `)
}

export default () => {
  const [{user:viewer}] = auth.use()

  const login_timeout = useR()
  useF(viewer, () => {
    clearTimeout(login_timeout.current)
    if (!viewer) {
      login_timeout.current = setTimeout(() => {
        // openLogin()
      }, 1_000)
    }
  })

  const [content_url, set_content_url] = useS('/sitechat')

  const [online, set_online] = useS([])
  useSocket({
    room: 'cowork',
    on: {
      'cowork:online': (online) => {
        log('online', online)
        set_online(online)
      }
    },
    connect: socket => {
      socket.emit('cowork:online')
    },
  })

  useStyle(`
  #inner-index {
    width: 100vw !important;
  }
  `)
  usePageSettings({
    professional: true,
    expand: true,
    expandPlacement: 'top-right',
  })
  return <Style id='cowork'>
    <InfoBody className='column'>
      <InfoSection labels={[
        'coworking dashboard',
        // mobile && 'intended for desktop',
      ]} />
      {desktop ? <>
      <div id='cowork-outer-container' className='cowork-container row grow'>
        <div id='cowork-left' className='cowork-container column'>
          <div id='cowork-background-music'>
            <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?si=orfGJ4MAQpQB1Vk3" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
          </div>
          <div id='cowork-online'>
            <InfoSection labels={[
              'online',
            ]}>
              {online.map(user => {
                return <InfoBadges labels={[{ text:user, func:() => {
                  open_popup(close => {
                    const open_obj = (href) => ({
                      href,
                      func: e => {
                        if (!e.metaKey) {
                          e.preventDefault()
                          close()
                          // set_content_url(href)
                          // openFrame({ href:href.replace(/^\//, '/-')+'?hide-freshman-ui' })
                          url.push(href)
                        }
                      },
                    })
                    return <>
                      <InfoSection labels={[
                        user,
                      ]}>
                        <InfoBadges labels={[
                          // { text:'VIEW PROFILE', href:`/@${user}`, func:close }
                          { text:'view profile', ...open_obj(`/u/${user}`) }
                        ]} />
                        <InfoBadges labels={[
                          { text:'open chat', ...open_obj(`/chat/${user}`) }
                        ]} />
                        {viewer === user ? null : <InfoBadges labels={[
                          { text:'ADD ON GREETER', ...open_obj(`/greeter/${viewer}/met/${user}`) }
                        ]} />}
                      </InfoSection>
                    </>
                  })
                } }]} />
              })}
            </InfoSection>
          </div>
        </div>
        <div id='cowork-right'>
          {/* <Uglychat /> */}
          <div id='cowork-content-selector'>
            <InfoBadges labels={[
              'open:',
              { 'sitechat': () => set_content_url('/sitechat'), label: content_url === '/sitechat' },
              { 'wordbase': () => set_content_url('/wordbase'), label: content_url === '/wordbase' },
              { 'lettercomb': () => set_content_url('/lettercomb'), label: content_url === '/lettercomb' },
              { 'letterpress': () => set_content_url('/letterpress'), label: content_url === '/letterpress' },
            ]} />
          </div>
          <div id='cowork-content'>
            <iframe src={`${content_url.replace(/^\//, '/-')}?hide-freshman-ui`} style={S(`
            width: 100%;
            height: 100%;
            `)} onLoad={e => {
              log('loaded', (e.target as HTMLIFrameElement).contentWindow.window)
              const inner = (e.target as HTMLIFrameElement).contentWindow.window
              inner['openLogin'] = openLogin
            }} />
          </div>
        </div>
      </div>
      </> : <>
      <div id='cowork-outer-container' className='cowork-container column grow'>
        <div id='cowork-background-music'>
          <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?si=orfGJ4MAQpQB1Vk3" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
        <div id='cowork-online'>
          <InfoBadges labels={[
            'online',
            ...online.map(user => ({
              text:user, func:() => {
                open_popup(close => {
                  const open_obj = (href) => ({
                    href,
                    func: e => {
                      if (!e.metaKey) {
                        e.preventDefault()
                        close()
                        // set_content_url(href)
                        // openFrame({ href:href.replace(/^\//, '/-')+'?hide-freshman-ui' })
                        url.push(href)
                      }
                    },
                  })
                  return <>
                    <InfoSection labels={[
                      user,
                    ]}>
                      <InfoBadges labels={[
                        // { text:'VIEW PROFILE', href:`/@${user}`, func:close }
                        { text:'view profile', ...open_obj(`/u/${user}`) }
                      ]} />
                      <InfoBadges labels={[
                        { text:'open chat', ...open_obj(`/chat/${user}`) }
                      ]} />
                      {viewer === user ? null : <InfoBadges labels={[
                        { text:'ADD ON GREETER', ...open_obj(`/greeter/${viewer}/met/${user}`) }
                      ]} />}
                    </InfoSection>
                  </>
                })
              }
            }))
          ]} />
        </div>
        <div id='cowork-content'>
          <iframe src={`${content_url.replace(/^\//, '/-')}?hide-freshman-ui`} style={S(`
          width: 100%;
          height: 100%;
          `)} onLoad={e => {
            log('loaded', (e.target as HTMLIFrameElement).contentWindow.window)
            const inner = (e.target as HTMLIFrameElement).contentWindow.window
            inner['openLogin'] = openLogin
          }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" />
        </div>
      </div>
      </>}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`&#cowork{
  max-width: unset !important;

  .body {
    height: 100%;
  }
  
  #cowork-outer-container {
    border: 1px solid var(--id-color-text);
  }

  .cowork-container {
    height: 100%; width: 100%;
    gap: 1px;
    background: var(--id-color-text);
    & > :not(.cowork-container) {
      background: var(--id-color);
      padding: .25em;
    }
    &.row > * {
      height: 100%;
    }
    &.column > * {
      width: 100%;
    }
  }
  ${desktop ? `
  #cowork-left {
    width: 0; flex-grow: 1;
    #cowork-background-music {
      aspect-ratio: 560/315;
      width: 100% !important;
      iframe {
        height: 100% !important;
        width: 100% !important;
      }
    }
    #cowork-online {
      flex-grow: 1;
    }
  }
  #cowork-right {
    width: 0; flex-grow: 2;
    display: flex; flex-direction: column;
    gap: .25em;
    #cowork-content {
      flex-grow: 1;
      border: 1px solid #8883;
      background: #8883;
      background-clip: content-box;
    }
  }
  ` : `
  #cowork-background-music {
    padding: 0;
    aspect-ratio: 560/315;
    width: 100% !important;
    iframe {
      height: 100% !important;
      width: 100% !important;
    }
  }
  #cowork-online {
    flex-grow: 0;
    max-height: 20%;
  }
  #cowork-content {
    padding: 0;
    flex-grow: 2;
  }
  `}
}`