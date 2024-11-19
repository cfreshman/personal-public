import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles, Loader } from '../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useR, useS, useSkip } from 'src/lib/hooks'
import api from 'src/lib/api'
import { dev, S } from 'src/lib/util'
import { store } from 'src/lib/store'

const { named_log, defer, node, truthy } = window as any
const NAME = 'tennis'
const log = named_log(NAME)

speechSynthesis.getVoices()

let speaking = undefined, chunks
export default () => {
  const hark_script = useCachedScript('/lib/ext/hark.bundle.js')
  const [start, set_start] = useS(false)
  const [audio_url, set_audio_url] = useS(undefined)
  const [responses, set_responses] = store.use('tennis-2-responses', { default:[] })
  const [scores, set_scores] = store.use('tennis-2-scores', { default:[] })
  const [summary, set_summary] = store.use('tennis-2-summary', { default:'' })
  const [data, set_data] = store.use('tennis-2-data', { default:{ total:null, match:null } })
  const [raw_view, set_raw_view] = store.use('tennis-2-raw-view', { default:false })
  const r_responses = useR()
  useF(responses, () => r_responses.current = responses)
  const handle = {
    track: () => {
      if (hark_script) {
        const { hark } = window as any
        log('hark loaded and user started', hark)
  
        speechSynthesis.speak(new SpeechSynthesisUtterance('begin'))
  
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          const speech = hark(stream)
          const recorder = new MediaRecorder(stream)
          chunks = []
          let send_after = Date.now()
          recorder.ondataavailable = e => {
            if (speaking) return
            chunks.push({
              data: e.data,
              t: Date.now()
            })
          }
          recorder.onstop = () => {
            const speech_chunks = chunks.filter(x => x.t >= send_after).map(x => x.data)
            const audio_blob = new Blob(speech_chunks, { type: 'audio/mpeg-3' })
            chunks = []
            const audio_url = URL.createObjectURL(audio_blob)
            set_audio_url(audio_url)
            // node(`<a download="audio.wav" href=${audio_url}></a>`).click()
            const audio = new File([audio_blob], 'audio.mp3')
            const reader = new FileReader()
            reader.onload = e => {
              const base64 = (reader.result as string).split(',')[1]
              console.log(base64)
              api.post('/companion/speech', {
                audio: base64,
              }).then(({ response }) => {
                log('response', response)
                response = response.toLowerCase().replaceAll(/\[ ?(pause|silence) ?\]/g, '').replaceAll('\n', ' ').trim().split(/ +/g).join(' ')
                log('cleaned response', response)
                const responses = r_responses.current
                let speak_text
                if (response.startsWith('current score')) speak_text = summary
                else if (response.startsWith('current match')) speak_text = data.match || 'none'
                if (response.startsWith('current total')) speak_text = data.total || 'none'
                else if (response.startsWith('total')) set_responses([response])
                else if (response.startsWith('reset')) set_responses([])
                else set_responses([...responses, response])
                // if (response.startsWith('score') || response.startsWith('point')) {
                //   set_responses([...responses, response])
                // } else if (response.includes('current score')) {
                //   const match = responses.find(x => x.startsWith('match'))
                //   speak_text = match.replace('score ', '')
                // } else if (response.startsWith('match')) {
                //   set_responses([...responses, response])
                // } else if (response.startsWith('current match')) {
                //   const match = responses.find(x => x.startsWith('match'))
                //   speak_text = match.replace('match ', '')
                // } else if (response.startsWith('total')) {
                //   set_responses([...responses, response])
                // } else if (response.startsWith('current total')) {
                //   const total = responses.find(x => x.startsWith('total'))
                //   speak_text = total.replace('total ', '')
                // }
  
                if (speak_text) {
                  log('speak', response, speak_text, { dev })
                  speaking = new SpeechSynthesisUtterance(speak_text)
                  const on_end = () => {
                    chunks = []
                    defer(() => {
                      speaking = undefined
                    }, 500)
                  }
                  speaking.onend = on_end
                  speaking.onerror = e => {
                    log('speech error', e)
                    on_end()
                  }
                  speechSynthesis.speak(speaking)
                }
              })
            }
            reader.readAsDataURL(audio)
          }
          recorder.start()
          speech.on('speaking', () => {
            send_after = Date.now() - 250
          })
          speech.on('stopped_speaking', () => {
            if (speaking) return
            recorder.stop()
            defer(() => {
              recorder.start()
            })
          })
        })
      }
    },
    summarize: async () => {
      if (!responses.length) {
        set_summary('')
        return
      }

      log('responses:', responses.join('\n'))
      const { response } = await api.post('/tennis/json', { responses })
      log('response:', response)
      const { total, match, sequence, speak } = response
      log('sequence:', sequence)
      const game = sequence.split(', ').at(-1)
      const scores = game.split(/ ?-> ?/g).map(x => x.startsWith('game') ? `[${x}]` : x)
      set_scores(scores)
      const summary = scores.at(-1).trim()
      set_summary(summary)
      set_data({ total, match })

      if (speak) {
        log('speak', response, speak, { dev })
        speaking = new SpeechSynthesisUtterance(speak)
        const on_end = () => {
          chunks = []
          defer(() => {
            speaking = undefined
          }, 500)
        }
        speaking.onend = on_end
        speaking.onerror = e => {
          log('speech error', e)
          on_end()
        }
        speechSynthesis.speak(speaking)
      }
    },
    summarize_2: async () => {
      if (!responses.length) {
        set_summary('')
        return
      }
      const prompt = 
`i am tracking my tennis match score using a speech-to-text tool. i have a list of captured audio responses and i need you to parse them into a game score sequence

an example sequence is "love-love -> 15-love -> 15-all -> 15-30 -> 15-40 -> game receiver"
another is "love-love -> 15-love -> 30-love -> 40-love -> game server"
another is "love-love -> 15-love -> 30-love -> 30-15 -> 30-30 -> 30-40 -> deuce -> advantage in -> deuce -> advantage out -> game receiver"

game score sequences start at love-love, are written on a single line, and have these state transitions:
"""
love-love -> 15-love, love-15
15-love -> 30-love, 15-all
30-love -> 40-love, 30-15
40-love -> game server, 40-15
love-15 -> 15-all, love-30
love-30 -> 15-30, love-40
love-40 -> 15-40, game receiver
15-all -> 30-15, 15-30
30-15 -> 40-15, 30-all
40-15 -> game server, 40-30
15-30 -> 30-all, 15-40
15-40 -> 30-40, game receiver
30-all -> 40-30, 30-40
40-30 -> game server, deuce
30-40 -> deuce, game receiver
deuce -> advantage in, advantage out
advantage in -> game server, deuce
advantage out -> deuce, game receiver
"""

here are the responses so far, from first to last. not all of them are scores: """
${responses.map((x, i, a) => `${i === a.length-1 ? 'last - most important - ' : ''}${i+1}) ${x}`).join('\n\n')}
"""

RETURN THE CURRENT SCORE, NOTHING ELSE, NO OTHER WORDS`
      log('summarize', { prompt})
      const { response:fixed } = await api.post('/companion/llm', { prompt, temporary:true })
      log('fixed', fixed)
//       const final_prompt =
// `what is the current tennis score based on this list (return nothing else): ${fixed}`
//       const { response } = await api.post('/companion/llm', { prompt:final_prompt, temporary:true })
      const response = fixed.split(',').at(-1).trim() // idk why but this gives the best performance
      log('response', response)
      set_summary(response)
    },
    summarize_1: async () => {
      if (!responses.length) {
        set_summary('')
        return
      }
//       const prompt = 
// `i am tracking my tennis match score using a speech-to-text tool
// i say "score" to record the current game score, "match" to record the current match score, "total" to record the current total score

// possible game scores: """
// 15-love
// 15-all
// 15-30
// 15-40
// 30-love
// 30-15
// 30-all
// 30-40
// 40-love
// 40-15
// 40-30
// deuce
// adv in
// adv out
// deuce 2
// deuce 3
// duece <x>
// """

// please translate the history of captured responses into JUST ONE current score from the list of possible game scores for the game. return ONLY the score, nothing else

// here are the responses so far, from first to last: """
// ${responses.map((x, i, a) => `${i === a.length-1 ? 'last - most important - ' : ''}${i+1}) ${x}`).join('\n\n')}
// """

// it is very important to be correct becuase we are using this in our active match. "scoredeuce" is "deuce"
// `
//       const prompt = 
// `i am tracking my tennis match score using a speech-to-text tool
// i say "score <score>" to record the current game score, "match <score>" for match (multiple games), "total <score>" for total (multiple matches)
// here are the responses so far, from first to last: """
// ${responses.map((x, i, a) => `${i === a.length-1 ? 'last - most important - ' : ''}${i+1}) ${x}`).join('\n\n')}
// """

// NOW RETURN ONE OF THE FOLLOWING GAME SCORES FOR THE CURRENT GAME, NOTHING ELSE
// they are given in the format "<server score>-<receiver score> -> <score if server wins>, <score if receiver wins>"
// """
// love-love -> 15-love, love-15
// 15-love -> 30-love, 15-all
// 30-love -> 40-love, 30-15
// 40-love -> game server, 40-15
// love-15 -> 15-all, love-30
// love-30 -> 15-30, love-40
// love-40 -> 15-40, game receiver
// 15-all -> 30-15, 15-30
// 30-15 -> 40-15, 30-all
// 40-15 -> game server, 40-30
// 15-30 -> 30-all, 15-40
// 15-40 -> 30-40, game receiver
// 30-all -> 40-30, 30-40
// 40-30 -> game server, deuce
// 30-40 -> deuce, game receiver
// deuce -> adv server, adv receiver
// adv server -> game server, deuce
// adv receiver -> deuce, game receiver
// """
// AGAIN, RETURN ONLY THE SCORE, NOTHING ELSE
// if the last response was confusing, use the previous one as a clue for what the score *can* be`
      const prompt = 
`i am tracking my tennis match score using a speech-to-text tool
here are the responses so far, from first to last: """
${responses.map((x, i, a) => `${i === a.length-1 ? 'last - most important - ' : ''}${i+1}) ${x}`).join('\n\n')}
"""

NOW RETURN ONE OF THE FOLLOWING GAME SCORES FOR THE CURRENT GAME, NOTHING ELSE
they are given in the format "<score> -> <score if server wins>, <score if receiver wins>"
ONLY THE PART BEFORE THE ARROW IS THE SCORE
"""
love-love -> 15-love, love-15
15-love -> 30-love, 15-all
30-love -> 40-love, 30-15
40-love -> game server, 40-15
love-15 -> 15-all, love-30
love-30 -> 15-30, love-40
love-40 -> 15-40, game receiver
15-all -> 30-15, 15-30
30-15 -> 40-15, 30-all
40-15 -> game server, 40-30
15-30 -> 30-all, 15-40
15-40 -> 30-40, game receiver
30-all -> 40-30, 30-40
40-30 -> game server, deuce
30-40 -> deuce, game receiver
deuce -> adv in, adv out
adv in -> game server, deuce
adv out -> deuce, game receiver
"""
AGAIN, RETURN ONLY THE SCORE, NOTHING ELSE
if the last response was confusing, use the previous one as a clue for what the score *can* be`
      log('summarize', { prompt})
      const { response } = await api.post('/companion/llm', { prompt, temporary:true })
      
      set_summary(response)
    },
  }

  useSkip(useF, responses, handle.summarize)
  // useF(handle.summarize)

  const viewed = raw_view ? responses : scores

  usePageSettings({
    professional:true,
  })
  return <Style>
    <InfoBody>
      <InfoSection className='h100 w100 center'>
        <div className='row wide between'>
          <pre style={S(`
          text-align: left;
          font-size: .9em;
          `)}><b>voice commands:</b>{`\nscore|match|total <score>\ncurrent score|match|total`}</pre>
          <div className='column gap' style={S('align-items: flex-end')}>
            <button onClick={e => {
              set_responses([])
              set_scores([])
              set_data({ total:null, match:null })
            }}>reset</button>
            <button onClick={e => {
              speechSynthesis.speak(new SpeechSynthesisUtterance('voice test'))
            }}>voice test</button>
            <button onClick={e => {
              set_raw_view(!raw_view)
            }}>{raw_view ? 'view cleaned' : 'view raw'}</button>
          </div>
        </div>
        <div className='center-column' style={S(`
        flex-direction: column-reverse;
        height: 0; flex-grow: 1;
        overflow: auto;
        `)}>
          {viewed.filter(truthy).slice().reverse().map((response, i) => <div key={i} style={S(`
          ${!i ? 'font-weight: bold;' : ''}
          `)}>{response}</div>)}
        </div>
        <div className='row spaced'>
          {data.total ? <div style={S(``)}><b>total: {data.total}</b></div> : null}
          {data.match ? <div style={S(``)}><b>match: {data.match}</b></div> : null}
        </div>
        {summary ? <div style={S(`white-space:pre; font-size:3em; overflow: hidden; text-overflow: ellipses`)}><b>{summary}</b></div> : null}
        {/* {summary ? <div style={S(``)}><b>{summary}</b></div> : null} */}
        {start ? <>
          {/* {audio_url ? <audio src={audio_url} controls /> : <Loader color='#fff' />} */}
          <div><Loader color='#fff' /> 🎙️</div>
          <button onClick={e => location.reload()}>stop</button>
        </> : hark_script ? <button style={S(`font-size: 2em`)} onClick={e => {
          set_start(true)
          handle.track()
        }}>start</button> : null}
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
  padding: 0 .67em;
}

.section.h100 {
  margin: 0;
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