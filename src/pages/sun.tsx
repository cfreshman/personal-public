import React from 'react'
import { asInput, asObject, useE, useF, useInterval, useM, useRerender, useSkip } from 'src/lib/hooks'
import { usePageSettings } from 'src/lib/hooks_ext'
import { store } from 'src/lib/store'
import { bounds, formatPercent } from 'src/lib/util'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { meta } from 'src/lib/meta'


const magnitude = (progress) => {
  return Math.pow(1 - (Math.abs(.5 - progress) * 2), 1/3)
}
const RANGE = bounds([0, .5].map(magnitude))

export default () => {
  const { range, duration, datetime } = window as any

  const [state, setState, mergeState] = asObject(store.local.use('sun-state', { default:{
    wake: '6',
    sleep: '8.5',
    t: Date.now(), at: '50',
  } }))
  const { wake, sleep, t, at } = state

  const rerender = useRerender()
  const target = useM(wake, sleep, rerender, () => {
    let ms = Number(datetime.of({ h: wake - sleep }))
    while (ms < Date.now()) ms += duration({ d:1 })
    return ms
  })
  const remaining = duration({ ms: target - Date.now() }) 
  const percent_remaining =  (remaining / duration({ h: (24 - sleep) }) * 100)
  useSkip(useF, state.wake, state.sleep, () => mergeState({
    at: 100 - percent_remaining,
  }))

  const intensity = useM(state, target, remaining, () => {
    if ([wake, sleep, t, at].some(x=>!x)) return 0
    try {
      // const time = new Date().getHours() + new Date().getMinutes()/60
      const remaining = target - Date.now()
      const progress = (target - t) * (at / 100) / remaining
      return magnitude(progress)
    } catch {}
    return 0
  })
  useF(intensity, () => meta.theme_color.set('#'+range(3).map((x, i) => Math.floor(255 * (1.1 - (Math.abs(i - .25) / 4)) * intensity).toString(16)).join('')))
  
  useInterval(() => rerender(), 1_000)

  return <Style>
    <InfoBody>
      <InfoSection labels={[
        {
          element: <input type='text' {...asInput([state.wake, wake => mergeState({wake})])[2]} />
        },
        {
          element: <input type='text' {...asInput([state.sleep, sleep => mergeState({sleep})])[2]} />
        },
        {
          element: <input type='text' {...asInput([state.at, at => mergeState({at})])[2]} />
        },
        { start: () => mergeState({ t: Date.now()}) },
        `sleep at: ${datetime.hms(target)}`,
        `intensity: ${intensity}`,
        `${Math.floor(remaining / 1_000)}s remaining (${Math.ceil(percent_remaining)}%)`,
      ]} />
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`