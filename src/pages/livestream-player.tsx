import React from 'react'
import styled from 'styled-components'
import { ExternalIcon, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { Dangerous } from 'src/components/individual/Dangerous'
import { openFrame } from 'src/components/Modal'
import { Tabbed, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { asInput, useF, useM, useS } from 'src/lib/hooks'
import { from, list } from 'src/lib/util'
import { store } from 'src/lib/store'
import { JSX, pass } from 'src/lib/types'


export default () => {
  const query = useM(() => from(list(new URLSearchParams(location.search).entries()).map(e => [e[0], JSON.parse(e[1])])))
  const { chat_only=false } = query

  usePageSettings({
    hideLogin: chat_only, hideExpandedControls: chat_only,
    title: chat_only ? 'chat' : undefined,
  })

  const [tab, setTab] = useS(undefined)
  const [input, setInput, bindInput] = asInput(store.local.use('livestream-player-input', { default:'uh_software' }))
  const [path_suffix, setPathSuffix] = usePathState()
  useF(() => setInput(path_suffix || input))
  useF(input, () => setPathSuffix(input))

  const [external, setExternal] = store.local.use('livestream-player-external')
  const [stream, setStream] = store.local.use('livestream-player-stream')
  const [chat, setChat] = store.local.use('livestream-player-chat')
  const handle = {
    input: (input) => {
      setInput(input)
      ;({
        twitch: () => {
          setExternal(`https://www.twitch.tv/uh_software`)
          setStream(`
          <iframe
          src="https://player.twitch.tv/?channel=${input}&parent=${location.host}"
          frameborder="0"
          allowfullscreen="true"
          scrolling="no"
          height="378" width="620">
          </iframe>`)
          setChat(`
          <iframe
          id="chat_embed"
          src="https://www.twitch.tv/embed/${input}/chat?parent=${location.host}"
          style="
          ${chat_only ? `
          position: fixed; top: 0; left: 0; height: 100%; width: 100%;
          `:`
          height: 500px;
          width: 350px;
          `}
          ">
          </iframe>`)
        }
      }[tab.toLowerCase()]||pass)()
    }
  }
  useF(() => handle.input(input))

  const [chat_float, setChatFloat] = useS(undefined)
  
  const chat_control = useM(() => ({
    closed: () => setChatFloat(false)
  }))
  const chat_jsx = chat && <Dangerous html={chat} />
  if (chat_only) return chat_jsx

  const stream_jsx = stream && <Dangerous html={stream} />

  return <Style>
    <InfoBody>
      <Tabbed value={tab} setValue={setTab} options={{
        twitch: <>
          <input {...bindInput} onKeyDown={e => e.key === 'Enter' && handle.input(input)}></input>
        </>,
      }} />
      <InfoSection labels={[
        'video',
        {
          text: <span className='middle-row'>open <ExternalIcon /></span>,
          href: external,
        },
        {
          'request music': () => openFrame({ href: '/-music-queue' }),
        },
      ]}>
        {stream_jsx}
      </InfoSection>
      <InfoSection labels={[
        'chat',
        chat_float ? 'float' : { 
          float: () => {
            openFrame({
              href: `/-livestream-player/${input}?chat_only=true`,
              options: {
                additive: true,
              },
              control: chat_control,
            })
            setChatFloat(true)
          }
        }
      ]}>
        {chat_float ? null : chat_jsx}
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`