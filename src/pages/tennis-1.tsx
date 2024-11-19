import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles, Loader } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useInline, useInterval, useR, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { dev, S } from 'src/lib/util'
import { store } from 'src/lib/store'

const { webkitSpeechRecognition, webkitSpeechGrammarList, named_log, defer, list } = window as any
const NAME = 'tennis'
const log = named_log(NAME)

let speech, speaking = undefined
// const speech_grammer = new webkitSpeechGrammarList()
// const speech_grammer_rule = `#JSGF V1.0;
// grammar tennis;
// public <score> = <side>-<side> | <side> all | <side> | server advantage | receiver advantage;
// public <side> = love | 15 | 30 | 40 | deuce | game | set | match;
// public <matches> = matches <number>-<number>;
// public <match> = match <number>-<number>;
// public <number> = <numberatom>{1};
// public <numberatom> = zero | one | two | three | four | five | six | seven | nine | ten | eleven | twelve | thirteen | fourteen | fifteen | sixteen | seventeen | eighteen | nineteen | twenty | thirty | forty | fifty | sixty | seventy | eighty | ninety | hundred | thousand | million | billion;`
// speech_grammer.addFromString(speech_grammer_rule, 1)
export default () => {
  const [begin, set_begin] = useS(false)
  const [results, set_results] = store.use('tennis-results', { default:[] })

  const handle = {
    start: () => {
      if (!speech && !speaking) {
        speech = new webkitSpeechRecognition()
        // speech.grammars = speech_grammer
        speech.continuous = false
        speech.lang = 'en-US'
        speech.interimResults = false
        speech.maxAlternatives = 1

        speech.onresult = e => {
          log('result', e)
          const result = list(e.results[e.results.length - 1]).map(x => x.transcript).join(', ').toLowerCase()

          let speak_text
          if (result.startsWith('score') || result.startsWith('point')) {
            set_results([...results, result])
          } else if (result.includes('current score')) {
            const last_score_index = results.findLastIndex(x => x.startsWith('score'))
            const score_and_points = results.slice(last_score_index)
            speak_text = score_and_points.join(', ')
          } else if (result.startsWith('match')) {
            set_results([...results, result])
          } else if (result.startsWith('current match')) {
            const match = results.find(x => x.startsWith('match'))
            speak_text = match
          } else if (result.startsWith('total')) {
            set_results([...results, result])
          } else if (result.startsWith('current total')) {
            const total = results.find(x => x.startsWith('total'))
            speak_text = total
          }

          if (speak_text) {
            log(result, speak_text)
            speech.abort()
            speech = undefined
            if (dev) {
              // api doesn't work on http
            } else {
              defer(() => {
                speaking = new SpeechSynthesisUtterance(speak_text)
                speaking.onend = e => speaking = undefined
                speaking.onerror = e => {
                  log('speech error', e)
                  speaking = undefined
                }
                speechSynthesis.speak(speaking)
              })
            }
          }
        }
        speech.onend = e => speech = undefined
        speech.start()
      }
    }
  }
  useInterval(handle.start, 500)

  usePageSettings({
    professional:true,
  })
  return <Style>
    <InfoBody>
      <InfoSection className='h100 w100 center'>
        {begin ? <>
          <pre className='wide' style={S(`
          text-align: left;
          font-size: .9em;
          `)}><b>commands:</b>{`\nscore|match|total <score>\ncurrent score|match|total`}</pre>
          <div className='spacer' />
          <div className='center-column' style={S(`
          flex-direction: column-reverse;
          `)}>
            {results.slice().reverse().map((r, i) => <div key={i} style={S(`
            ${!i ? 'font-weight: bold;' : ''}
            `)}>{r}</div>)}
          </div>
          {results.length ? null : <div>start speaking</div>}
          <div><Loader color='#fff' /> 🎙️</div>
          <div><button onClick={e => set_results([])}>reset</button></div>
        </> : <>
          <button onClick={e => set_begin(true)} style={S(`
          font-size: 2em;
          `)}>begin</button>
        </>}
      </InfoSection>
    </InfoBody>
  </Style>
}

const common_css = `
input, select {
  height: 1.5em;
  font-size: 1em;
  border: 1px solid currentcolor;
  border-radius: .25em;
  &[type=number] {
    max-width: 5em;
  }
}

ul {
  padding-left: 1em;
}

button {
  color: var(--id-color-text);
  border-radius: 10em;
  border: 1px solid var(--id-color-text);
  box-shadow: 0 1px var(--id-color-text);
  min-width: 2em;
  display: flex; align-items: center; justify-content: center;
  translate: 0 -1px;
  &:not(:disabled) {
    cursor: pointer;
    &:active, &.active {
      translate: 0;
      box-shadow: none;
    }
  }
  &:disabled {
    cursor: default;
    color: #888;
    // background: #ccc;
  }
  min-height: 1.5em;
  padding: 0 .5em;
}

--id-color: #eee;
--id-color-text: #222;
--id-color-text-readable: #eee;
background: var(--id-color) !important;
color: var(--id-color-text) !important;
padding: .5em;
font-family: monospace;
`
const Style = styled(InfoStyles)`
margin: .5em;
width: calc(100% - 1em);
height: calc(100% - 1em);
border: 1px solid #000;
border-radius: .25em;

${common_css}

box-shadow: none !important; /* to undo expand style (bad code) */
`
const PopupStyle = styled(InfoStyles)`
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);
${common_css}
`