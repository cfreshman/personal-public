import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles, Loader } from '../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useR, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S } from 'src/lib/util'
import { store } from 'src/lib/store'

const { named_log, defer, node } = window as any
const NAME = 'speech'
const log = named_log(NAME)

export default () => {
  const hark_script = useCachedScript('/lib/ext/hark.bundle.js')
  const [start, set_start] = useS(false)
  const [audio_url, set_audio_url] = useS(undefined)
  const [responses, set_responses] = store.use('speech-responses', { default:[] })
  const r_responses = useR()
  useF(responses, () => r_responses.current = responses)
  useF(hark_script, start, () => {
    if (hark_script && start) {
      const { hark } = window as any
      log('hark loaded and user started', hark)

      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const speech = hark(stream)
        const recorder = new MediaRecorder(stream)
        let chunks = [], send_after = Date.now()
        recorder.ondataavailable = e => chunks.push({
          data: e.data,
          t: Date.now()
        })
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
              set_responses([...r_responses.current, response])
            })
          }
          reader.readAsDataURL(audio)
        }
        recorder.start()
        speech.on('speaking', () => {
          send_after = Date.now() - 1_000
        })
        speech.on('stopped_speaking', () => {
          recorder.stop()
          defer(() => {
            recorder.start()
          })
        })
      })
    }
  })

  usePageSettings({
    professional:true,
  })
  return <Style>
    <InfoBody>
      <InfoSection className='h100 w100 center'>
        <button onClick={e => set_responses([])}>reset</button>
        <div className='center-column' style={S(`
        flex-direction: column-reverse;
        height: 0; flex-grow: 1;
        overflow: auto;
        `)}>
          {responses.slice().reverse().map((response, i) => <div key={i} style={S(`
          ${!i ? 'font-weight: bold;' : ''}
          `)}>{response}</div>)}
        </div>
        {start ? <>
          {/* {audio_url ? <audio src={audio_url} controls /> : <Loader color='#fff' />} */}
          <div><Loader color='#fff' /> 🎙️</div>
          <button onClick={e => location.reload()}>stop</button>
        </> : hark_script ? <button style={S(`font-size: 2em`)} onClick={e => {
          set_start(true)
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