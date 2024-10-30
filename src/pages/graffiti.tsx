import React from 'react'
import styled from 'styled-components'
import { ColorPicker, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useEventListener, useF, useInterval, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'
import { useRoom } from 'src/lib/socket'

const { named_log, values, colors, Q, node, V, range, defer, canvases } = window as any
const NAME = 'graffiti-2'
const log = named_log(NAME)

const SIZE = 512
const COLORS = {
  black: '#000000',
  blue: '#285ff4',
  green: '#65c467',
  yellow: '#f8ce46',
  red: '#ec4d3e',
  choice1: '#ffffff',
  choice2: '#ffffff',
  choice3: '#ffffff',
}
const BRUSHES = {
  TINY: 8,
  SMALL: 16,
  MEDIUM: 32,
  LARGE: 64,
}

const combined_canvas = (() => {
  const canvas = node('canvas')
  canvas.width = canvas.height = SIZE
  return canvas
})()
const combined ={
  canvas: combined_canvas,
  ctx: combined_canvas.getContext('2d'),
}

const ColorDot = ({ color, value, on_click }) => {
  const active = value === color
  return <button 
  className={`${active?'active':''}`}
  style={S(`background:${color}; color:${colors.readable(color)}; height:3em; width:3em`)}
  onClick={on_click}>
    {active ? <b>X</b> : ''}
  </button>
}
const SizeDot = ({ size, value, on_click }) => {
  const active = value === size
  return <button className={`${active?'active':''}`} style={S(`height:3em; width:3em`)} onClick={on_click}>{active ? <b>X</b> : size}</button>
}

let over, down, backing, backing_img, dirty = false, touches
const create_dataurl_image = (dataurl) => {
  const img = new Image()
  img.src = dataurl
  return img
}
export default () => {

  const [a, set_auth] = auth.use()
  const [id='', set_id] = usePathState()

  const [colors, set_colors] = store.use('graffiti-colors', { default:values(COLORS) })

  const [color, set_color] = store.use('graffiti-color', { default:COLORS.black })
  const [size, set_size] = store.use('graffiti-size', { default:BRUSHES.MEDIUM })
  const [mode, set_mode] = store.use('graffiti-mode', { default:'draw' })

  const [scale, set_scale] = useS(1)

  const handle = {
    reset: () => {
      const canvas = Q('#canvas')
      canvas.width = canvas.width
    },
    back: (data) => {
      backing = data
      backing_img = create_dataurl_image(backing.image)
      backing_img.onload = () => {
        const canvas = Q('#canvas')
        canvas.style['background-image'] = `url(${backing.image})`
      }
    },
    send: async (download=false) => {
      if (!dirty) return

      const send_data_and_reset = (canvas) => {
        if (download) {
          const white_canvas = node('canvas')
          white_canvas.width = white_canvas.height = SIZE
          const white_ctx = white_canvas.getContext('2d')
          white_ctx.fillStyle = '#fff'
          white_ctx.fillRect(0, 0, SIZE, SIZE)
          white_ctx.drawImage(canvas, 0, 0)
          canvases.download(white_canvas, `graffiti${id?`-${id}`:''}.png`)
        } else {
          const data = { id, image: canvas.toDataURL() }
          socket.emit('graffiti-2:set', id, data.image)
          handle.back(data)
          handle.reset()
        }
      }

      if (backing && backing.image) {
        await new Promise<void>(resolve => {
          combined.ctx.clearRect(0, 0, SIZE, SIZE)
          const backing_img = new Image()
          backing_img.onload = async () => {
            combined.ctx.drawImage(backing_img, 0, 0)
            combined.ctx.drawImage(Q('#canvas'), 0, 0)
            send_data_and_reset(combined.canvas)
            resolve()
          }
          backing_img.src = backing.image
        })
      } else {
        send_data_and_reset(Q('#canvas'))
      }
    },
    receive: async (data) => {
      backing = data
      await handle.send()
    },

    resize: () => {
      const canvas = Q('#canvas')
      const outer = canvas.parentElement.getBoundingClientRect()
      const inner_size = Math.min(outer.width * .95, outer.height * .9)
      canvas.style.width = `${inner_size}px`
      canvas.style.height = `${inner_size}px`
      set_scale(inner_size / canvas.width)
    },
    move: (e) => {
      if (!down) return
      if (touches?.length > 1) return

      const canvas = Q('#canvas')
      const ctx = canvas.getContext('2d')
      
      const curr = V.ne(e.clientX, e.clientY)
      const rect = canvas.getBoundingClientRect()
      const o = V.ne(rect.x, rect.y).sc(-1)
      const a = down.ad(o).sc(1/scale)
      const b = curr.ad(o).sc(1/scale).ad(V.ne(.001, .001)) // add .001 to still draw equal points
      down = curr

      ctx.imageSmoothingEnabled = false
      ctx.lineWidth = size
      ctx.strokeStyle = color
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()

      dirty = true
    },
    down: (e) => {
      down = V.ne(e.clientX, e.clientY)
      handle.move(e)
    },
    up: (e) => {
      handle.move(e)
      down = undefined
      handle.send()
    },
  }
  useF(a.expand, () => {
    handle.resize()
    range(5).map(i => defer(handle.resize, i * 100))
  })
  useEventListener(window, 'resize', handle.resize)

  useEventListener(window, 'mousedown', handle.down)
  useEventListener(window, 'pointermove', handle.move)
  useEventListener(window, 'pointerup', handle.up)

  useEventListener(window, 'touchstart', e => {
    touches = e.touches
    if (touches.length > 1) down = undefined
    else if (touches.length === 1) {
      const touch = touches[0]
      down = V.ne(touch.clientX, touch.clientY)
    }
  })
  useEventListener(window, 'touchend', e => {
    down = undefined
    defer(() => {
      touches = e.touches
    })
  })

  const socket = useRoom({
    room: `graffiti-2:${id}`,
    on: {
      [`graffiti-2:${id}:update`]: (data) => {
        log('update', data)
        handle.back(data)
      },
    },
    connect: socket => socket.emit(`graffiti-2:get`, id),
  })
  useF(id, () => {
    if (socket) {
      backing = undefined
      handle.reset()
      socket.emit('graffiti-2:get', id)
    }
  })
  useEventListener(window, 'focus', () => {
    socket && socket.emit(`graffiti-2:get`, id)
  })

  // useInterval(async () => {
  //   if (dirty) {
  //     await handle.send()
  //     dirty = false
  //   }
  // }, 1_000)

  return <Style id='graffiti' className='column' style={S(`max-width:100vh`)}>
    <div className='row wide'>
      <b>graffiti</b>
      &nbsp;
      <i>{id ? `${id}'s wall` : 'please be nice'}</i>
      <div className='spacer' />
      <button onClick={() => handle.send(true)}>download</button>
      </div>
    <div id='canvas-container' className='wide grow middle-row'>
      <canvas id='canvas' height={SIZE} width={SIZE} onPointerMove={e => {
        over?.remove()
        over = node(`<div style="
        position: absolute;
        top: ${e.clientY}px;
        left: ${e.clientX}px;
        font-size: ${size * scale}px;
        height: 1em; width: 1em; translate: -.5em -.5em;
        border-radius: 50%;
        background: ${color};
        z-index: 100;
        pointer-events: none;
        "></div>`)
        document.body.appendChild(over)
      }} onPointerOut={e => over?.remove() } />
    </div>
    <div id='controls-container' className='middle-row wide'>
      <div className='middle-column gap'>
        <div id='palette' className='row gap'>{colors.map(x => <ColorDot {...{ color:x, value:color, on_click:()=>set_color(x) }} />)}</div>
        <div id='picker-and-size' className='middle-row wide gap' style={S(`
        justify-content: space-between;
        `)}>
          <div id='picker' className='row gap'>
            <button onClick={e => {
              const picker = Q(e.target, 'input') || e.target
              picker.click()
            }} style={S(`background:${color}; height:3em`)}><ColorPicker {...{ value:color, setValue: (new_color) => {
              const curr_index = colors.indexOf(color)
              const new_colors = colors.slice()
              new_colors[curr_index] = new_color
              set_colors(new_colors)
              set_color(new_color)
            } }} /></button>
            <button style={S(`height:3em`)} onClick={e => {
              const curr_index = colors.indexOf(color)
              const new_colors = colors.slice()
              new_colors[curr_index] = values(COLORS)[curr_index]
              set_colors(new_colors)
              set_color(new_colors[curr_index])
            }}>reset</button>
          </div>
          <div id='size' className='row gap'>{values(BRUSHES).map(x => <SizeDot {...{ size:x, value:size, on_click:()=>set_size(x) }} />)}</div>
        </div>
      </div>
    </div>
  </Style>
}

const common_css = `
#canvas-container {
  background: #0002;
  #canvas {
    box-shadow: 0 2px currentcolor;
    border: 1px solid currentcolor;
    background-color: #ffffff; background-clip: content-box;
    background-size: cover;
    // touch-action: none;
    touch-action: pinch-zoom;
    image-rendering: pixelated;
    user-select: none;
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

button {
  color: var(--id-color-text);
  border-radius: 10em;
  border: 1px solid var(--id-color-text);
  box-shadow: 0 1px var(--id-color-text);
  min-width: 2em;
  display: flex; align-items: center; justify-content: center;
  translate: 0 -2px;
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
  &.on {
    background: var(--id-color-text);
    color: var(--id-color-text-readable);
    translate: 0;
    box-shadow: none;
  }
  line-height: 1.3em;
}

--id-color: #eee;
--id-color-text: #222;
--id-color-text-readable: #eee;
background: var(--id-color) !important;
color: var(--id-color-text) !important;
padding: .5em;
font-size: .8em;
font-family: monospace;
`
const Style = styled.div`
width: 100%;
margin: .5em;
border: 1px solid #000;
border-radius: .25em;

${common_css}

box-shadow: none !important; /* to undo expand style (bad code) */
`
const PopupStyle = styled.div`
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);
${common_css}
`