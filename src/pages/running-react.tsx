import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useS, useStyle } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S } from 'src/lib/util'

const { named_log, duration, datetimes } = window as any
const NAME = 'running'
const log = named_log(NAME)

export default () => {
  const [miles, set_miles] = useS(1.15)
  const [time, set_time] = useS(duration({ m:10, s:24, ms:300 }))
  const [pace, set_pace] = useS(0)
  const pace_index = Math.round(Math.max(-1, Math.min(1, pace))) + 1
  useStyle(pace, `
  :root {
    --id-color: #eeebe6 !important;
    --id-color-text: #000 !important
    --id-color-text-readable: #fff !important;
    --id-color-label: #0002 !important;
  }
  #running .body {
    background: ${['#ff8888', '#8888ff', '#88ff88'][pace_index]} !important;
  }
  `)
  usePageSettings()
  return <Style id="running">
    <InfoBody className='column'>
      <InfoSection labels={[NAME]} className='grow'>
        {[
          `you're behind pace`,
          `you're on pace - good job!`,
          `you're ahead of pace - good job!`,
        ][pace_index]}
        <div className='middle-column wide grow'>
          <div style={S(`
          font-size: 6em
          `)}><b>{miles.toFixed(2)}mi</b></div>
          <div style={S(`
          font-size: 4em
          `)}>{datetimes.durations.pretty(time)}</div>
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.body {
  margin: .25em;
  width: calc(100% - .5em);
  height: calc(100% - .5em);
  --id-color: #eee;
  --id-color-text: #000;
  --id-color-text-readable: #fff;
  --id-color-label: #0002;
  background: var(--id-color) !important;
  color: var(--id-color-text) !important;
  border: 1px solid currentcolor !important;
}
`