import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { useCachedScript, usePathState } from 'src/lib/hooks_ext'
import { useEventListener, useF, useR, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S } from 'src/lib/util'
import { store } from 'src/lib/store'

const { named_log, devices, node, maths, canvases, Q, V, range, colors, defer } = window as any
const NAME = 'you'
const log = named_log(NAME)

let cams
let down
const SIZES = ['small', 'medium', 'large']
const size_to_px = (size) => ({ small:8, medium:16, large:32 }[size])
const MODES = ['draw', 'erase']
export default () => {
  useCachedScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js')

  const [size, set_size] = store.use('you-size', { default:'medium' })
  const [mode, set_mode] = store.use('you-mode', { default:'draw' })
  const [color, set_color] = store.use('you-color', { default:'#000000' })

  const [n_cams, set_n_cams] = useS(0)
  const [i_cam, set_i_cam] = store.use('you-cam', { default:0 })

  const ref = useR()
  const precheck = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video:true, audio:false })
    } catch {
      alert('unable to get camera')
    }
  }
  const init = async () => {
    await precheck()
    let streams
    if (devices.is_mobile) {
      streams = await Promise.all([
        // navigator.mediaDevices.getUserMedia({
        //   video: {
        //     facingMode: { ideal: 'environment' },
        //   },
        // }),
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: 'user' },
          },
        })
      ])
    } else {
      const input_devices = await navigator.mediaDevices.enumerateDevices()
      const video_inputs = input_devices.filter(x => x.kind === 'videoinput')
      log({ video_inputs })
      streams = await Promise.all(video_inputs.map(x => navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: x.deviceId },
        },
      })))
    }
    streams = streams.filter(x => x)
    log(streams)
    cams = streams.map(x => {
      const video_node = node(`<video webkit-playsinline playsinline muted style="
      width: 100%;
      "></video>`)
      video_node.srcObject = x
      return video_node
    })
    log(cams)
    set_n_cams(cams.length)
    set_i_cam(0)
  }
  useF(init)
  // useEventListener(window, 'focus', precheck)

  const load_saved = async () => {
    const canvas = Q('#you canvas')
    const ctx = canvas.getContext('2d')

    const video_rect = Q('#you video').getBoundingClientRect()
    canvas.height = video_rect.height
    canvas.width = video_rect.width
    
    await new Promise<void>(resolve => {
      const saved_canvas_url = store.get('you-save')
      log({saved_canvas_url})
      if (saved_canvas_url) {
        const img = node('img')
        img.onload = e => {
          ctx.drawImage(img, 0, 0)
          resolve()
        }
        img.onerror = e => resolve()
        img.src = saved_canvas_url
      } else {
        resolve()
      }
    })
  }

  useF(n_cams, i_cam, () => {
    Q('#you video')?.remove()
    if (n_cams) {
      ref.current.append(cams[i_cam])
      cams[i_cam].play()
      ;[100, 200, 400, 800].map(x => setTimeout(load_saved, x))
    }
  })

  const handle = {
    down: (e) => {
      down = V.ne(e.clientX, e.clientY)
    },
    up: async (e) => {
      await handle.move(e)
      down = undefined
    },
    move: async (e) => {
      if (!down) return
      
      const canvas = Q('#you canvas')
      const ctx = canvas.getContext('2d')

      const video_rect = Q('#you video').getBoundingClientRect()
      if (Math.abs(canvas.width - video_rect.width) > 1 || Math.abs(canvas.height - video_rect.height) > 1) {
        canvas.height = video_rect.height
        canvas.width = video_rect.width
        await load_saved()
      }
      
      const curr = V.ne(e.clientX, e.clientY)
      const rect = canvas.getBoundingClientRect()
      const o = V.ne(rect.x, rect.y).sc(-1)
      let a = down.ad(o)
      let b = curr.ad(o)
      down = curr

      // because video is flipped, actually subtract x from canvas right
      // a.x = rect.width - a.x
      // b.x = rect.width - b.x

      ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over'
      ctx.lineWidth = size_to_px(size)
      ctx.strokeStyle = color
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()

      store.set('you-save', canvas.toDataURL())
    },
  }
  useEventListener(window, 'pointerup', handle.up)
  useEventListener(window, 'pointermove', handle.move)

  return <Style id='you'>
    <InfoBody>
      <InfoSection labels={[
        NAME,
        n_cams > 1 && {
          'next cam': () => set_i_cam((i_cam + 1) % n_cams)
        },
        { 'take photo': async () => {
          const element = Q('#you #video-container')
          const { html2canvas } = window as any
          await html2canvas(element).then(canvas => {
            canvases.download(canvas, 'me.png')
            // const canvas_flip = node('canvas')
            // canvas_flip.height = canvas.height
            // canvas_flip.width = canvas.width
            // canvas_flip.style.height = '10em'
            // const ctx = canvas_flip.getContext('2d')
            // ctx.translate(canvas.width, 0)
            // ctx.scale(-1, 1)
            // ctx.drawImage(canvas, 0, 0)
            // canvases.download(canvas_flip, 'me.png')
          })
        } },
      ]}>
        <div className='column gap wide tall' style={S('gap:.5em')}>
          <div id='video-container-container' className='row wide'>
            <div id='video-container' ref={ref}>
              {/* <div style={S(`
              position: absolute;
              top: 0;
              left: 0;
              z-index: 0;
              margin: 1px;
              `)}>
                <button className='nice-button' onClick={init}>enable camera</button>
              </div> */}
              <canvas id='video-canvas' onPointerDown={handle.down} />
            </div>
          </div>
          {/* <div className='column' style={S(`gap:.25em;`)}> */}
            <div style={S(`
            font-size: 2em;
            `)}>
              <button className='nice-button' onClick={async () => {
                const element = Q('#you #video-container')
                const { html2canvas } = window as any
                await html2canvas(element).then(canvas => {
                  canvases.download(canvas, 'me.png')
                })
              }}>take photo</button>
            </div>
            <div className='row gap'>
              {SIZES.map(option => <button className={`nice-button ${size === option ? 'on' : ''}`} onClick={e => set_size(option)}>{option}</button>)}
            </div>
            <div className='row gap'>
              {MODES.map(option => <button className={`nice-button ${mode === option ? 'on' : ''}`} onClick={e => set_mode(option)}>{option}</button>)}
              <button className='nice-button' onClick={e => {
                const canvas = Q('#you canvas')
                canvas.width = canvas.width
              }}>clear</button>
            </div>
            <div className='row gap'>
              <button className='nice-button' onClick={e => {
                Q('#you-input-color').click()
              }} style={S(`
              background: ${color};
              color: ${colors.hex_readable(color)};
              position: relative;
              `)}>
                <input id='you-input-color' type='color' style={S(`
                position: absolute;
                left: 0;
                opacity: 0;
                pointer-events: none;
                `)} value={color} onInput={e => {
                  set_color(e.currentTarget.value)
                }} onChange={e => {
                  set_color(e.currentTarget.value)
                }} />
                color
              </button>
              <button className='nice-button' onClick={e => set_color(undefined)}>reset</button>
            </div>
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
#video-container-container {
  min-height: 4em;
  position: relative;

  &::before {
    content: "loading...";
    position: absolute;
    top: 0;
    left: 0;
  }

  #video-container {
    width: 0;
    flex-grow: 1;
    // border: 1px solid currentcolor;
    // box-shadow: 0 2px currentcolor;
    display: flex;
    user-select: none;
    
    // scale: -1 1;
    video {
      // filter: brightness(1.1) contrast(0.75) saturate(0.95);
      /* from https://baseline.is/tools/css-photo-filters/ */
      // filter: brightness(105%)  grayscale(100%) hue-rotate(0deg) invert(0%) opacity(100%) saturate(100%) sepia(50%);
    }

    position: relative;
    #video-canvas {
      position: absolute; top: 0; left: 0; height: 100%; width: 100%;
      z-index: 2;
      touch-action: none;
    }
  }
}


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

.nice-button {
  color: var(--id-color-text);
  background: var(--id-color);
  border-radius: 10em;
  border: 1px solid var(--id-color-text);
  box-shadow: 0 1px var(--id-color-text);
  min-width: 2em;
  display: flex; align-items: center; justify-content: center;
  translate: 0 -1px;
  &:not(:disabled) {
    cursor: pointer;
    &:active {
      translate: 0;
      box-shadow: none;
    }
  }
  &:disabled {
    cursor: default;
    color: #888;
    // background: #ccc;
  }
  &.on {
    background: var(--id-color-text);
    color: var(--id-color);
    translate: 0;
    box-shadow: none;
  }
  line-height: 1.3em;
}
`