import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { useF, useR, useS, useStyle } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S } from 'src/lib/util'
import { useCachedScript } from 'src/lib/hooks_ext'
import { useRoom } from 'src/lib/socket'

const { named_log, rand, node, colors, maths, defer, range } = window as any
const NAME = 'overlay'
const log = named_log(NAME)

const audio_sound_new_message = new Audio('/raw/audio/effects/message.mp3')
function sound_new_message() {
  audio_sound_new_message.play()
}

export default () => {
  const [last_actions, set_last_actions] = useS([])
  const [face, set_face] = useS(undefined)

  const r = useR()

  const handle = {
    parse: (data) => {
      const { face, last_actions } = data
      set_last_actions(last_actions)
      set_face(face)
    },
    load: async () => {
      const { data } = await api.get('/overlay')
      handle.parse(data)
    },
    firework: () => {
      const outer = r.current
      const rect = outer.getBoundingClientRect()
      const { width, height } = rect
      const x = width/2 + rand.s(width / 5)
      const angle = -Math.PI/2 + rand.s(Math.PI / 6)
      const distance = height/2 + rand.s(height/3)
      const final_x = x + Math.cos(angle) * distance
      const final_y = height + Math.sin(angle) * distance
      // const y = height*1/3 + rand.s(height / 4)
      const size = 5
      const color = 'white'
      const duration = 1_000
      const el = node('div')
      el.style.cssText = `
      position: absolute;
      top: ${final_y}px;
      left: ${final_x}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      z-index: 9999;
      `
      outer.appendChild(el)
      const keyframes = [
        { top: `${height}px`, left: `${x}px` },
        { top: `${final_y}px`, left: `${final_x}px` },
      ]
      el.animate(keyframes, {
        duration,
        iterations: 1,
        easing: 'ease-out',
      })
      defer(() => {
        el.remove()
        defer(() => {
          // explode firework
          const count = rand.i(3, 1000)
          const explode_radius = rand.i(50, 400)
          const color = `hsl(${rand.i(0, 360)}, 100%, 60%)`
          const duration = explode_radius * 8
          const size = 5
          for (let i = 0; i < count; i++) {
            const el = node('div')
            el.style.cssText = `
            position: absolute;
            top: ${final_y}px;
            left: ${final_x}px;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            z-index: 9999;
            `
            outer.appendChild(el)
            
            const explode_direction = rand.f(0, maths.TAU)
            const explode_distance = Math.sqrt(rand.s(explode_radius * explode_radius))
            const explode_x = final_x + Math.cos(explode_direction) * explode_distance
            const explode_y = final_y + Math.sin(explode_direction) * explode_distance
            
            el.animate([
              { top: `${final_y}px`, left: `${final_x}px` },
              { top: `${explode_y}px`, left: `${explode_x}px` },
            ], {
              duration,
              iterations: 1,
              easing: 'ease-out',
            })
            defer(() => el.remove(), duration * .9)
          }
        })
      }, duration * .85)
    },
  }
  useRoom({
    room: 'overlay',
    on: {
      'overlay:update': (data) => {
        log('update', data)
        handle.parse(data)
      },
      'overlay:command': (command, args) => {
        log('command', command, args)
        if (command === 'firework') {
          handle.firework()
        }
      },
      'overlay:sound': () => {
        log('sound')
        sound_new_message()
      },
    }
  })
  useF(handle.load)
  // useF(handle.firework)

  useStyle(`
  :root, body {
    background: transparent !important;
    color: #000 !important;

    --id-color: #000;
    --id-color-text: #fff;
    --id-color-text-readable: #000;
  }
  body {
    background: url(icon.png) no-repeat center center fixed !important;
    background-size: cover !important
  }
  `)
  return <Style>
    <InfoBody style={S(`
    position: relative;
    margin: .5em;
    `)}>
      <div className='side middle-row wrap gap' style={S(`
      left: 0;
      background: #ff4444;

      font-size: .5em;
      `)}>
        {range(1_000).map(x => <span>{`>:)`}</span>)}
      </div>
      <div className='side middle-row wrap gap' style={S(`
      right: 0;
      background: #4444ff;
      height: calc(100% - calc(240px * var(--scale) + 3px));

      font-size: .5em;
      `)}>
        {range(1_000).map(x => <span>{`:O`}</span>)}
      </div>
      <div className='stream-center' style={S(`
      right: 0;
      clip-path: polygon(0 0, 100% 0, 100% calc(100% - 280px), calc(100% - 245px) calc(100% - 280px), calc(100% - 245px) 100%, 0 100%);
      `)}>
        <div ref={r} className='h100 w100' style={S(`position: relative`)} />
      </div>
      <InfoSection labels={['commands']} className='overlay' style={S(`
      position: absolute;
      top: 0; left: 0;
      width: fit-content;
      `)}>
        <table id='command-table'>
          {Object.entries({
            ping: 'pong',
            'face <face>': 'set face',
            firework: '',
          }).map(([command, description]) => <tr key={command}>
            <td><b onClick={e => {
              handle[command] && handle[command]()
            }}>!{command}</b></td>
            <td>{description}</td>
          </tr>)}
        </table>
      </InfoSection>
      <InfoSection labels={['events']} className='overlay column' style={S(`
      position: absolute;
      top: 0; right: 0;
      width: 30em;
      `)}>
        {last_actions.map((action, i) => <div key={i}>{action}</div>)}
      </InfoSection>
      <InfoSection labels={['my face']} className='overlay column' style={S(`
      position: fixed;
      bottom: 0; right: 0;
      width: calc(325px * var(--scale));
      height: calc(240px * var(--scale));

      background: transparent;
      `)}>
        <div className='grow wide center' style={S('font-size: 2em')}>{face}</div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
--scale: 1.15;

background: transparent;
.overlay {
  background: #000000f8;
  color: #fff;
  border: 1px solid currentcolor;
  box-shadow: 0 2px currentcolor;
  padding: .5em;
  z-index: 1;

  .badges .label {
    opacity: 1;
    background: transparent;
    backdrop-filter: invert(1) opacity(.25);
  }
}

.side {
  position: fixed;
  top: 0;
  height: 100%;
  width: calc(128px - 5px);
  background: green;
  overflow: hidden;
  z-index: 0;
}
.stream-center {
  position: fixed;
  top: 0;
  height: 100%;
  width: calc(100% - 128px * 2);
  left: 128px;
  overflow: hidden;
  z-index: 0;
  // box-shadow: 0 0 2px #0008;
  // box-shadow: inset 0 1px 0 rgba(255,255,255,.6), 0 22px 70px 4px rgba(0,0,0,0.56), 0 0 0 1px rgba(0, 0, 0, 0.3);
}

#command-table {
  td:not(:last-child) {
    padding-right: .67em;
  }
}
`