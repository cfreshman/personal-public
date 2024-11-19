import 'react'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'
import styled from 'styled-components'
import { A, HalfLine, InfoBody, InfoSection, InfoStyles, Loader, Markdown, Multiline } from '../components/Info'
import api, { auth } from '../lib/api'
import { asInput, useEventListener, useF, useInline, useR, useS, useSkip } from '../lib/hooks'
import { usePageSettings } from '../lib/hooks_ext'
import { convertLinks } from 'src/lib/render'
import { openLogin } from 'src/lib/auth'

const { named_log, Q, defer, sleep, range, rand, devices, truthy, datetimes } = window as any
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
    scroll_to_bottom: () => {
      // defer(() => {
      //   Q('#llm .llm-history-0')?.scrollIntoView({ block: 'center' })
      //   Q('#index').scrollIntoView({ block: 'end' })
      // })
    },
    load: async () => {
      if (a.user) {
        const { history } = await api.get('/companion/llm')
        set_history(history)
      } else {
        set_history(local_history)
      }
      if (!history) {
        handle.scroll_to_bottom()
      }
    },
    send: () => {
      if (!prompt || loading) return
      set_prompt('')
      set_loading(true)
      set_sent(prompt)
      set_response(undefined)
      set_error(undefined)
      // set_selected(0)
      handle.scroll_to_bottom()
      defer(() => set_prompt('')) // idk
      api.post('/companion/llm', { prompt, prefix:new Date().toLocaleString() }).then(({ response, history:cloud_history }) => {
        set_response(response)
        set_sent(undefined)
        if (cloud_history) {
          set_history(cloud_history)
          // set_selected(cloud_history.length - 1)
        } else {
          // set_history([...history, { prompt, response }])
          set_history([{ prompt, response }])
          set_selected(1)
        }
        handle.scroll_to_bottom()
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

  const [selected, set_selected] = useS(-1)

  usePageSettings({
    // professional: true,
    expand: !devices.is_mobile,
  })
  return <Style id='llm' className='tall wide'>
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
              !a.user && { prompt:'', response:-1 },
            ].filter(truthy)).reverse().map(({ prompt, response }, i) =>
            <div key={i} id={`llm-history-${i}`} className='column wide gap' style={S(`
            // border: 1px solid currentcolor;
            padding: .5em;
            border-radius: .5em;
            background: var(--id-color-text-readable);
            cursor: pointer;
            // box-shadow: 0 1px currentcolor;
            // margin-bottom: 1px;
            border: none;
            border-bottom: 1px solid currentcolor;
            `)} onClick={(e: any) => {
              set_selected(selected === i ? -1 : i)
              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}>
              {prompt ? <div title={prompt} className='wide' style={S(`
              text-align: left;
              overflow-wrap: anywhere;
              padding: .25em;
              border-radius: .25em;
              background: var(--id-color-text);
              color: var(--id-color-text-readable);

              border-radius: 0; margin: 0 -.5em; padding: .25em .5em; width: calc(100% + 1em); margin-top: -.5em;
              border-top-left-radius: inherit; border-top-right-radius: inherit;

              ${selected === i ? `
              white-space: pre-wrap;
              ` : `
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              `}
              `)}>{prompt}</div> : null}
              {/* <HalfLine /> */}
              <div style={S(`
              white-space: pre-wrap;
              // font-family: system-ui, roboto, sans-serif;
              font-size: .9em;
              text-align: left;
              `)}>{response === -1 ? <>
                <a onClick={e => {
                  openLogin()
                }}>sign in</a> for an LLM with memory
              </> : response === undefined ? <Loader color='#fff' /> : <Markdown text={response} className='markdown' />}</div>
            </div>)}
          </div>
          {error ? <div className='center-row'>{error.error || error.message || error}</div> : null}
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
            text-align: left;
            background: var(--id-color-text);
            color: var(--id-color-text-readable);
            border: none;
            max-height: 50vh;
            `)} />
            <div className='center-row wide spaced between'>
              {a.user ? <button onClick={async e => {
                const yes = confirm('Are you sure you want to reset the LLM memory?')
                if (yes) {
                  set_loading(true)
                  set_history([])
                  await api.delete('/companion/llm')
                  set_loading(false)
                }
              }}>reset</button> : null}
              <div className='spacer' />
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

const Style = styled(InfoStyles)`&#llm {
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

.markdown {
  height: fit-content;
  display: flex; flex-direction: column; gap: .33em;
  * {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    margin: 0;
  }
  > *:last-child {
    margin-bottom: 0;
  }
  ul, ol {
    padding-left: 2em;
    margin: -.5em 0 !important;
    li {
      margin: -.5em 0;
      padding: 0;
    }
  }
}
}`
