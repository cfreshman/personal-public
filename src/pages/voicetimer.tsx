import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles, Loader } from '../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useInterval, useM, useR, useRerender, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'
import { tone } from 'src/lib/audio'
import { Modal } from 'src/components/Modal'

const { named_log, datetimes, defer, truthy } = window as any
const NAME = 'voicetimer'
const log = named_log(NAME)

type timer = {
  name: string,
  duration: number,
  t: number,
}

const Timer = ({ timer, alarm, edit }: { timer:timer, alarm, edit }) => {
  const { name, duration, t } = timer
  const [alarmed, set_alarmed] = useS(false)
  const rerender = useRerender()
  useInterval(() => {
    rerender()
    if (!alarmed && t + duration < Date.now()) {
      set_alarmed(true)
      alarm()
      edit(undefined)
    }
  }, 500)
  
  const [do_edit, set_do_edit] = useS(false)

  return <button className='timer large center-row spaced' onClick={e => set_do_edit(true)}>
    {do_edit ? <Modal outerClose={() => set_do_edit(false)}><PopupStyle><InfoBody>
      <InfoSection labels={[
        timer.name,
        { delete: () => {
          edit(undefined)
        } },
        { reset: () => {
          edit({
            ...timer,
            t: Date.now(),
          })
        } },
      ]}>
        <InfoSection labels={[
          'name',
          <input value={name} onChange={e => edit({
            ...timer,
            name: e.target.value,
          })} />,
        ]} />
        <InfoSection labels={[
          'duration',
          <input value={duration} onChange={e => edit({
            ...timer,
            duration: e.target.value,
          })} />,
        ]} />
      </InfoSection>
    </InfoBody></PopupStyle></Modal> : null}
    <div className='timer-name'>{name}</div>
    <div className='timer-count'>{datetimes.durations.pretty(Math.max(0, Math.floor(((t + duration) - Date.now()) / 1000) * 1000))}</div>
  </button>
}

let stream, speech, recorder, speaking
export default () => {
  const hark_script = useCachedScript('/lib/ext/hark.bundle.js')
  const [start, set_start] = useS(false)
  const [raw, set_raw] = store.use('voicetimer-raw', { default:[] })
  const r_raw = useR()
  useF(raw, () => r_raw.current = raw)
  
  const [timers, set_timers] = store.use('voicetimer-timers', { default:[] })
  const r_timers = useR()
  useF(timers, () => r_timers.current = timers)

  useF(hark_script, start, () => {
    if (!hark_script) return
    if (start) {
      const { hark } = window as any
      log('hark loaded and user started', hark)

      navigator.mediaDevices.getUserMedia({ audio: true }).then(_stream => {
        stream = _stream
        speech = hark(stream)
        recorder = new MediaRecorder(stream)
        let chunks = [], send_after = Date.now()
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
          send_after = Date.now()
          const audio = new File([audio_blob], 'audio.mp3')
          const reader = new FileReader()
          const t = Date.now()
          reader.onload = e => {
            const base64 = (reader.result as string).split(',')[1]
            api.post('/companion/speech', {
              audio: base64,
            }).then(async ({ response }) => {
              log('response', response)
              const new_item = {
                response,
                t,
                timers: undefined,
              }
              set_raw([...r_raw.current, new_item])
              stream && recorder.start()

              // parse response with LLM
              const { response:raw_timers, json } = await api.post('/ai/openai-llm', { prompt: 
`i am running an app called "voicetimer" which allows a user to use their voice to set timers. i just received the following from the speech-to-text service: """
${response}
"""

please return a JSON object containing a field "timers" which is a list of objects with "name" and "duration" fields, where "name" is what the user wanted to call the timer or the duration in a nice SHORT format, and "duration" is a number of milliseconds for the timer
MAKE SURE THE MILLISECONDS ARE PRECISELY WHAT THE USER REQUESTED, e.g. "two minute timer" should return 1_000 * 60 * 2 = 120_000. not 20 minutes or 20 seconds or 2 seconds, 2 MINUTES
if no timers were requested, just return "{ "timers": [] }"
do not respond with anything else

IGNORE A TIMER IF IT ENDS IN "COMPLETE" - that is the end of a timer being spoken by the device
remember, only return valid JSON` } )
              
              log('raw_timers', raw_timers, json)
              try {
                const { timers } = json
                log('timers', timers)
                new_item.timers = timers
                set_raw(r_raw.current.slice())
                set_timers([...r_timers.current, ...timers.map(({ name, duration }) => {
                  const timer = {
                    name,
                    duration,
                    t: Date.now(),
                  }
                  return timer
                })])
              } catch (e) {
                log('unable to parse timers', e)
              }

            })
          }
          reader.readAsDataURL(audio)
        }
        recorder.start()
        speech.on('speaking', () => {
          send_after = Date.now() - 1_000
        })
        speech.on('stopped_speaking', () => {
          if (speaking) return
          recorder.stop()
        })
      })
    } else {
      recorder.stop()
      speech.stop()
      stream.getTracks().forEach(track => track.stop())
      stream = undefined
    }
  })
  
  const handle = {
    speak: (text) => {
      speaking = new SpeechSynthesisUtterance(text)
      const on_end = () => {
        defer(() => {
          speaking = undefined
        })
      }
      speaking.onend = on_end
      speaking.onerror = e => {
        log('speech error', e)
        on_end()
      }
      speechSynthesis.speak(speaking)
    }
  }

  usePageSettings({
    professional:true,
  })
  return <Style>
    <InfoBody>
      <InfoSection labels={[
        NAME,
        { reset: () => set_raw([]) },
      ]} className='h100 w100'>
        <div className='grow wide center-column spaced'>
          <div className='w100 center-column' style={S(`
          flex-direction: column-reverse;
          height: 0; flex-grow: 1;
          overflow: auto;
          `)}>
            {raw.slice().reverse().map(x => <div key={x.t}>{x.response}</div>)}
          </div>
          {start ? <>
            <div><Loader color='#fff' /> 🎙️</div>
            <button className='large' onClick={() => set_start(false)}>stop</button>
          </> : <>
            <button className='large' onClick={() => set_start(true)}>start</button>
          </>}
          <div className='w100 center-row wrap gap'>
            {timers.map(timer => <Timer key={timer.t} timer={timer} alarm={() => {
              handle.speak(`${timer.name} complete`)
            }} edit={new_timer => {
              set_timers(timers.map(x => x === timer ? new_timer : x).filter(truthy))
            }} />)}
          </div>
        </div>
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
  background: var(--id-color-text-readable);
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

.large {
  font-size: 1.5em;
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
height: max-content; width: max-content;
min-height: 256px; min-width: 256px;
max-width: min(50em + 4em, 100% - 2em);
max-height: min(80vh + 4em, 100% - 2em);
background: var(--id-color) !important;
color: var(--id-color-text) !important;
padding: 0;
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);

${common_css}
`