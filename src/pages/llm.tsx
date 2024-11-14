import 'react'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'
import styled from 'styled-components'
import { A, HalfLine, InfoBody, InfoSection, InfoStyles, Loader, Multiline } from '../components/Info'
import api, { auth } from '../lib/api'
import { asInput, useEventListener, useF, useR, useS, useSkip } from '../lib/hooks'
import { usePageSettings } from '../lib/hooks_ext'
import { convertLinks } from 'src/lib/render'
import { openLogin } from 'src/lib/auth'

const { named_log, Q, defer, sleep, range, rand, devices, truthy } = window as any
const log = named_log('list-picker')

export default () => {
  const [a] = auth.use()

  const [prompt, set_prompt, fill_prompt] = asInput(store.use('llm-prompt', { default:'' }))
  const [history, set_history] = store.use('llm-history', { default:[] })

  const [loading, set_loading] = useS(false)
  const [sent, set_sent] = useS(undefined)
  const [response, set_response] = store.use('llm-response', { default:undefined })
  const [error, set_error] = useS(undefined)

  const [local_history, set_local_history] = store.use('llm-local-history', { default:[] })

  const handle = {
    load: async () => {
      if (a.user) {
        const { history } = await api.get('/companion/prompt')
        set_history(history)
      } else {
        set_history(local_history)
      }
    },
    send: () => {
      if (!prompt || loading) return
      set_prompt('')
      set_loading(true)
      set_sent(prompt)
      set_response(undefined)
      set_error(undefined)
      api.post('/companion/prompt', { prompt }).then(({ response, history:cloud_history }) => {
        set_response(response)
        set_sent(undefined)
        if (cloud_history) {
          set_history(cloud_history)
        } else {
          // set_history([...history, { prompt, response }])
          set_history([{ prompt, response }])
        }
      }).catch(e => {
        set_error(e.error || e)
        set_prompt(prompt)
      }).finally(() => {
        set_loading(false)
      })
    }
  }
  useF(a.user, handle.load)
  useEventListener(window, 'focus', handle.load)

  useF(prompt, response, () => set_error(undefined))
  useF(history, () => {
    if (!a.user) set_local_history(history.slice())
  })

  const r = useR()
  useF(loading, () => {
    if (loading) r.current.blur()
    else r.current.focus()
  })

  usePageSettings({
    // professional: true,
    expand: !devices.is_mobile,
  })
  return <Style id='rephrase' className='tall wide'>
    <InfoBody className='column'>
      <InfoSection labels={[
      ]} className='column h100 w100 spaced'>
        <div className='center-column wide grow spaced'>
          <div className='center-column grow wide' style={S(`
            height: 0; flex-grow: 1; overflow: auto;
            flex-direction: column-reverse;
            gap: .25em;
            `)}>
            {history.concat([
              loading && sent && { prompt:sent, response:undefined },
              !a.user && { prompt:-1, response:'' },
            ].filter(truthy)).reverse().map(({ prompt, response }, i) =>
            <div key={i} className='center-column wide' style={S(`
            border: 1px solid currentcolor;
            padding: .25em;
            border-radius: .25em;
            background: var(--id-color-text-readable);
            `)}>
              <div title={prompt} style={S(`
              max-width: 100%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              `)}><b>{prompt === -1 ? <>
                <a onClick={e => {
                  openLogin()
                }}>sign in</a> for an LLM with memory
              </> : prompt}</b></div>
              {/* <HalfLine /> */}
              <div style={S(`
              white-space: pre-wrap;
              // font-family: system-ui, roboto, sans-serif;
              font-size: .9em;
              `)}>{response === undefined ? <Loader color='#fff' /> : convertLinks(response)}</div>
            </div>)}
          </div>
          {error ? <div className='center-row'>{error}</div> : null}
          <div className='center-column wide spaced' style={S(`
          ${loading ? `
          pointer-events: none;
          opacity: .5;  
          ` : ''}
          `)}>
            <Multiline ref={r} 
            value={prompt} setValue={set_prompt}
            placeholder='your LLM query'
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handle.send()
              }
            }}
            style={S(`
            text-align: center;
            background: var(--id-color-text);
            color: var(--id-color-text-readable);
            border: none;
            `)} />
            <div className='center-row spaced'>
              {a.user ? <button style={S(`font-size: 1.5em`)} onClick={async e => {
                const yes = confirm('Are you sure you want to reset the LLM memory?')
                if (yes) {
                  set_loading(true)
                  set_history([])
                  await api.delete('/companion/prompt')
                  set_loading(false)
                }
              }}>reset</button> : null}
              {/* <button disabled={!history.length} style={S(`font-size: 1.5em`)} onClick={e => set_history([])}>clear history</button> */}
              <button disabled={!prompt} style={S(`font-size: 1.5em`)} onClick={e => handle.send()}>generate</button>
            </div>
          </div>
          <HalfLine />
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`&#rephrase {
button {
  background: var(--id-color-text-readable) !important;
  color: var(--id-color-text) !important;
  height: 1.5em;
  border: 1px solid currentcolor;
  border-radius: 10em;
  padding: 0 .5em;
  box-shadow: 0 2px currentcolor;
  translate: 0 -2px;
  cursor: pointer;
  user-select: none;

  &:active, &.active {
    translate: 0;
    box-shadow: none;
  }

  &:disabled {
    opacity: .5;
    pointer-events: none;
  }
}

input, textarea {
  border-radius: .25em !important;
  padding: .33em .67em !important;
  color: var(--id-color-text-readable) !important;

  &::placeholder {
    color: var(--id-color);
  }
}
}`
