import React, { useState } from 'react'
import api, { auth } from '../lib/api'
import { uF, useCached, useF, useI, useInput, useM, useR, useSkip } from '../lib/hooks'
import { useSocket } from '../lib/socket'
import { store } from '../lib/store'
import { JSX, fs, pass, pipe, truthy } from '../lib/types'
import { formatDuration, merge, named_log, range, squash } from '../lib/util'
import styled from 'styled-components'
import { Checkbox, HalfLine, InfoBadges, InfoBody, InfoButton, InfoCheckbox, InfoLabel, InfoLine, InfoSection, InfoSelect, InfoStyles, Loader, Select } from '../components/Info'
import { tone } from '../lib/audio'


const log = named_log('timer')

const Sound = {
  NONE: ({ volume=10 }={}) => ({ ms: 0, play: ()=>{} }),
  BEEP: ({ volume=10 }={}) => ({ ms: 150, play: () => tone(440, volume === 11 ? 2 : volume/10, 100).start()}),
}

export default () => {
  const saved = useM(() => Object.assign({
    duration: '00:45',
    soundInterval: 1,
    soundLabel: 'BEEP',
    soundParameters: {
      volume: 1,
    },
    everyMinute: true,
    last30Seconds: true,
    history: [],
  }, store.get('timer-save')))
  useF('TIMER SAVED', saved, console.debug)

  const [duration, _setDuration, durationFill] = useInput(saved.duration)
  const setDuration = x => _setDuration(x.replace(/:(\d(:|$))/g, ':0\$1'))
  const [soundInterval, setSoundInterval, soundIntervalFill] = useInput(saved.soundInterval)

  const [active, setActive] = useState(false)
  const [paused, setPaused] = useState(false)
  useF(active, () => setPaused(false))

  const [soundLabel, setSoundLabel] = useState(saved.soundLabel)
  const [soundParameters, setSoundParameters] = useState(saved.soundParameters)
  const sound = useR()
  sound.current = Sound[soundLabel](soundParameters)
  useF(sound.current, log)
  useSkip(useF, soundLabel, soundParameters, () => sound.current.play())

  const [everyMinute, setEveryMinute] = useState(saved.everyMinute)
  const [last30Seconds, setLast30Seconds] = useState(saved.last30Seconds)

  const [history, setHistory] = useState<{
    seconds:number
  }[]>(saved.history)

  useF(duration, soundInterval, soundParameters, everyMinute, last30Seconds, history, () => store.set('timer-save', { 
    duration, soundInterval, soundLabel, soundParameters, everyMinute, last30Seconds, history
  }))

  const timeout = useR()
  const last = useR(duration)
  const play = useR(pass)
  const done = useR(pass)
  const handle = {
    secondsToDuration: seconds => {
      let m = Math.floor(seconds / 60)
      let s = Math.min(seconds, 60)
      return m ? `${Math.floor(m / 60)}:${m % 60}` : `00:00:${s}`
    },
    durationToSeconds: duration => {
      const [H, M, S] = duration.split(':').map(Number).concat([0])
      const seconds = (H * 60 + M) * 60 + S
      return seconds
    },
    start: (seconds=undefined, original=undefined) => {
      if (!seconds) {
        last.current = duration
        seconds = handle.durationToSeconds(duration)
      }
      original = original || seconds
      const end = Date.now() + seconds * 1000
      let m = Math.floor(seconds / 60)
      let s = Math.min(seconds, 60)
      console.debug(duration, seconds, m, s, `${Math.floor(m / 60)}:${m % 60}`)
      const _tick = () => {
        let beeps = 0

        if (m > 0) {
          if (everyMinute && m % soundInterval === 0) {
            beeps = m % (5 * soundInterval) === 0 && m * 60 + s !== original ? 2 : 1
          }
          m -= 1
        } else if (s > 0) {
          if (last30Seconds && s < 30) {
            beeps = s <= 3 ? 3 : s <= 10 ? 2 : 1
          }
          s -= 1
        }

        if (m || s > 0) {
          setDuration(handle.secondsToDuration(m * 60 + s))

          const waitMs = end - ((m > 0 ? m*60 : s) * 1000) - Date.now()
          timeout.current = setTimeout(_tick, waitMs)
          const remainingAtNext = m * 60 + s
          play.current = () => handle.start(remainingAtNext, original)
          done.current = () => {
            const timedDuration = original - remainingAtNext + 1
            console.debug('TIMER: ADD TO HISTORY', timedDuration, history)
            setHistory([ ...history, { seconds: timedDuration } ])
          }
        } else {
          beeps = 1500 / sound.current.ms
          setDuration(handle.secondsToDuration(original))
          play.current = pass
          setActive(false)
          done.current()
          done.current = pass
          new Notification(`/timer`, {
            body: `${last.current} timer complete`,
            tag: '/timer',
          })
          open(
            `https://raw.freshman.dev/render#${encodeURIComponent(`${formatDuration(original)} timer done`)}`, '_blank', 
            `popup,innerWidth=700,innerHeight=100,right=50,top=50`)
        }

        range(Math.ceil(beeps))
        .map(i => setTimeout(() => sound.current.play(), i * sound.current.ms))
      }
      _tick()
      setPaused(false)
      setActive(true)
      new Notification(`/timer`, {
        body: `${last.current} timer started`,
        tag: '/timer',
      })
      // sound.current.play()
    },
    pause: () => {
      clearTimeout(timeout.current)
      setPaused(true)
    },
    play: () => play.current(),
    reset: () => {
      handle.pause()
      done.current()
      setDuration(last.current)
      setActive(false)
    },
  }

  return <Style id='timer'>
    <InfoBody>
      <InfoSection>
        <input id='timer-display'
        type='text' pattern="[0-9]{1,2}:[0-9]{1,2}(:[0-9]{1,2})?" 
        onInput={e => setActive(false)}
        onKeyDown={e => {
          console.debug(active, paused)
          if (e.key === 'Enter') {
            setTimeout(() => {
              const formatted_duration = duration.replace(/^(\d+)$/, ':\$1')

              active
              ? paused ? handle.play() : handle.pause()
              : handle.start(handle.durationToSeconds(formatted_duration))

              setDuration(formatted_duration)
            })
          }
        }}
        {...durationFill} 
        style={{ width:'6em' }} />
        <div id='timer-settings' className='inline-group' style={{display:'flex'}}>
          {active
          ? <InfoButton className='action' onClick={handle.reset}>reset</InfoButton>
          : <InfoButton onClick={() => handle.start()}>start</InfoButton>
          }
          {active
          ? paused
            ? <InfoButton onClick={handle.play}>play</InfoButton>
            : <InfoButton onClick={handle.pause}>pause</InfoButton>
          : ''}
          <InfoSelect value={soundLabel} options={Object.keys(Sound)} onChange={e => setSoundLabel(e.target.value)} />
          {soundLabel === 'NONE' ? null :
          <InfoSelect value={soundParameters.volume} options={range(1, soundParameters.volume >= 10 ? 12 : 11).reverse()} setter={volume => setSoundParameters(merge(soundParameters, { volume }))} />}
        </div>
        {/* <InfoCheckbox label='every minute' value={everyMinute} setter={setEveryMinute} /> */}
        <InfoCheckbox value={everyMinute} setter={setEveryMinute}>every <input type='number' {...soundIntervalFill} min={0} style={{width:'3em'}} /> minute{soundInterval === 1 ? '' : 's'}</InfoCheckbox>
        <InfoCheckbox value={last30Seconds} setter={setLast30Seconds}>last 30 seconds</InfoCheckbox>
      </InfoSection>
      {history.length
      ? <>
        <br/><br/>
        <InfoSection labels={[
          'history',
          `${formatDuration(history.reduce((a,v)=> a + v.seconds, 0))} total`,
          { clear: () => setHistory([]) },
        ]}>
          {history.slice().reverse().map(x =>
          <div>
            <InfoBadges labels={[
              { [formatDuration(x.seconds)]: () => handle.start(x.seconds) },
              { 'remove': () => setHistory(history.filter(y => y !== x)) },
            ]} />
          </div>)}
        </InfoSection>
      </>
      :''}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
&#timer {
  // input, select, .select {
  //   border-color: black;
  //   color: black;
  // }
  // button, .button, .action {
  //   background: black;
  //   color: white;
  //   margin-left: 0;
  // }

  #timer-display {
    font-size: 1.33em !important;
  }
  #timer-settings {
    font-size: 1.33em !important;
  }
}
`