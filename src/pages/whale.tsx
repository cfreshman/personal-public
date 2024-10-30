import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useInterval, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S } from 'src/lib/util'

const { named_log, V, maths, rand } = window as any
const NAME = 'whale'
const log = named_log(NAME)

let prev_t
const SPEED = 10
export default () => {

  const emoji = '🐋'

  const [state, set_state] = useS({
    p: V.ne(0, 0),
    v: V.p(rand.f(maths.TAU), SPEED),
  })
  useF(() => prev_t = Date.now())
  useInterval(() => {
    const dt = (Date.now() - prev_t) / 1000
    prev_t = Date.now()

    const towards_center = V.ne(-state.p.x, -state.p.y).sc(1/50)
    const new_state = {
      p: V.ad(state.p, state.v.ad(towards_center).sc(dt)),
      v: V.ad(state.v, V.ne(rand.s(SPEED / 4), rand.s(SPEED / 4))),
    }
    if (new_state.p.ma() > 50) {
      const angle = Math.atan2(new_state.p.y, new_state.p.x)
      new_state.v = V.p(maths.TAU/2 + angle, SPEED)
      new_state.p = new_state.p.ad(new_state.v.sc(dt))
    }
    set_state(new_state)
  }, 15)
  // useF(state, () => log(state))

  usePageSettings({
    expand:true,
  })
  return <Style>
    <InfoBody className='column'>
      <InfoSection labels={[NAME]} className='grow column wide'>
        <div className='grow middle-column wide'>
          <div style={S(`
          width: 400px;
          height: 400px;
          border: 1px solid #000;
          border-radius: 50%;
          background: #9bb1e8;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          `)}>
            <span style={S(`
            height: 0; width: 0; display: flex; align-items: center; justify-content: center;
            position: absolute;
            left: calc(50% + ${state.p.x}%);
            top: calc(50% + ${state.p.y}%);
            font-size: 4em;
            `)}>{emoji}</span>
          </div>
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`