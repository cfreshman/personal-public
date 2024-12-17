import React from 'react'
import styled from 'styled-components'
import { ColorPicker, HalfLine, InfoBadges, InfoBody, InfoButton, InfoCheckbox, InfoSection, InfoSelect, InfoSlider, InfoStyles, Multiline, Select } from '../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useEventListener, useF, useM, useR, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { S } from 'src/lib/util'
import { store } from 'src/lib/store'
import { Modal } from 'src/components/Modal'

const { named_log, values, from, node, rand, defer, Q, QQ, canvases, V, colors, strings, range, devices, pick } = window as any
const NAME = 'square'
const log = named_log(NAME)
const bound = (x, min, max) => Math.min(max, Math.max(min, x))

const evt_stop = (e) => {
  e.preventDefault()
  e.stopPropagation()
}

const TYPE = {
  IMAGE: 'image',
  TEXT: 'text',
  DRAW: 'draw',
}
const TYPES = values(TYPE)
const type_to_display = (type) => ({
  [TYPE.IMAGE]: 'image/shape',
}[type] || type)
const gen_id = () => rand.alphanum(12)

const FONTS = {
  DUOSPACE: 'duospace',
  ARIAL: 'arial',
  TNR: 'times new roman',
  CURSIVE: 'cursive',
  FANTASY: 'fantasy',
  ROBOTO_MONO: 'roboto-mono',
  HIGHWAY_GOTHIC: 'highway-gothic',
  QUICKSAND: 'quicksand',
  SEVEN_SEGMENT_DISPLAY: 'seven-segment-display',
  PIXEL: 'pixel',
  BUBBLE: 'super-frog',
  PACIFICO: 'pacifico',
  HAND: 'hand',
}
const font_to_actual = (key) => ({
}[key] || key)
const ALIGN = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
}

const DRAW = (() => {
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
  const MODES = {
    DRAW: 'draw',
    ERASE: 'erase',
  }
  return { SIZE, COLORS, BRUSHES, MODES }
})()
const ColorDot = ({ color, active, on_click }) => {
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
let draw_down, draw_over, draw_touches

let _l, _data, down, resize, crop_ne, crop_sw

const text_id_to_resize = {}

export default () => {
  useCachedScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js')

  const [a] = auth.use()
  // const [id, set_id] = usePathState()

  const [slot_i, set_slot_i] = store.use('collage-slot', { default:0 })

  const [entities, set_entities] = store.use('collager-entities', { default:[] }) as [{
    id: string,
    type: 'image' | 'text' | 'draw',
    data: any,
  }[], any]
  // useF(entities, () => log({ entities }))
  useF(entities, () => {
    if (entities.some(x => !x)) {
      set_entities(entities.filter(x => x))
    }
  })
  const types = useM(entities, () => {
    return from(TYPES.map(type => [type, entities.filter(x => x && x.type === type)]))
  })
  // useF(types, () => log({ types }))

  const [selected, set_selected] = useS(undefined)
  const entity = useM(selected, () => {
    const actual_entity = entities.find(x => x.id === selected)
    return actual_entity && {...actual_entity}
  })
  useF(entity, () => log({ entity }))

  const [color, set_color] = store.use('collager-color', { default:'#fff' })

  const [draw_colors, set_draw_colors] = store.use('collager-draw-colors', { default:values(DRAW.COLORS) })
  const [draw_color_i, set_draw_color_i] = store.use('collager-draw-color-i', { default:0 })
  const [draw_size, set_draw_size] = store.use('collager-draw-size', { default:DRAW.BRUSHES.SMALL })
  const [draw_mode, set_draw_mode] = useS(DRAW.MODES.DRAW)
  const [draw_scale, set_draw_scale] = useS(1)
  const is_draw = entity && entity.type === TYPE.DRAW

  const [crop, set_crop] = useS(false)
  const [crop_new, set_crop_new] = useS(undefined)
  const [crop_new_move, set_crop_new_move] = useS(undefined)
  useF(crop_new, () => set_crop_new_move(strings.json.clone(crop_new)))
  const r_crop = useR()

  const resize_wait = useR()
  useEventListener(window, 'resize', () => {
    resize_wait.current?.interrupt()
    resize_wait.current = defer(() => {
      set_entities(entities.slice())
      handle.draw.resize()
    }, 100)
  })

  useEventListener(window, 'pointermove', e => {
    const l = _l, data = _data
    if (down) {
      evt_stop(e)
      const rect = r.current.getBoundingClientRect()
      const [dx, dy] = [(e.clientX - down[0]) / rect.width, (e.clientY - down[1]) / rect.height]
      l.style.left = `${(data.x + dx) * 100}%`
      l.style.top = `${(data.y + dy) * 100}%`
    }
    if (resize) {
      evt_stop(e)
      const rect = r.current.getBoundingClientRect()
      const [dx, dy] = [(e.clientX - resize[0]) / rect.width, (e.clientY - resize[1]) / rect.height]
      l.style.top = `${(data.y + dy) * 100}%`
      l.style.width = `${(data.w + dx) * 100}%`
      l.style.height = `${(data.h - dy) * 100}%`
    }
    if (crop_ne) {
      evt_stop(e)
      const rect = r_crop.current.getBoundingClientRect()
      let {x, w, y, h} = crop_new
      let { clientX:ex, clientY:ey } = e
      if (rect.x <= ex && ex <= rect.x + rect.width) {
        const dx = (ex - crop_ne[0]) / rect.width
        w = bound(crop_new.w + dx, 0, 1)
      } else if (ex < rect.x) {
        w = 0
      } else if (rect.x + rect.width < ex) {
        w = 1 - crop_new.x
      }
      if (rect.y <= ey && ey <= rect.y + rect.height) {
        const dy = (ey - crop_ne[1]) / rect.height
        h = bound(crop_new.h - dy, 0, 1)
        y = bound(crop_new.y + dy, 0, crop_new.y + crop_new.h)
      } else if (ey < rect.y) {
        h = crop_new.y + crop_new.h
        y = 0
      } else if (rect.y + rect.height < ey) {
        h = 0
        y = crop_new.y + crop_new.h
      }
      set_crop_new_move({ x, y, w, h })
    }
    if (crop_sw) {
      evt_stop(e)
      const rect = r_crop.current.getBoundingClientRect()
      let {x, w, y, h} = crop_new
      let { clientX:ex, clientY:ey } = e
      if (rect.x <= ex && ex <= rect.x + rect.width) {
        const dx = (ex - crop_sw[0]) / rect.width
        w = bound(crop_new.w - dx, 0, 1)
        x = bound(crop_new.x + dx, 0, crop_new.x + crop_new.w)
      } else if (ex < rect.x) {
        w = crop_new.x + crop_new.w
        x = 0
      } else if (rect.x + rect.width < ex) {
        w = 0
        x = crop_new.x + crop_new.w
      }
      if (rect.y <= ey && ey <= rect.y + rect.height) {
        const dy = (ey - crop_sw[1]) / rect.height
        h = bound(crop_new.h + dy, 0, 1)
      } else if (ey < rect.y) {
        h = 0
      } else if (rect.y + rect.height < ey) {
        h = 1 - crop_new.y
      }
      set_crop_new_move({ x, y, w, h })
    }
  })
  useEventListener(window, 'pointerup pointercancel click', e => {
    const l = _l, data = _data
    let do_change
    if (down) {
      evt_stop(e)
      const rect = r.current.getBoundingClientRect()
      const [dx, dy] = [(e.clientX - down[0]) / rect.width, (e.clientY - down[1]) / rect.height]
      data.x += dx
      data.y += dy
      down = undefined
      do_change = true
    }
    if (resize) {
      evt_stop(e)
      const rect = r.current.getBoundingClientRect()
      const [dx, dy] = [(e.clientX - resize[0]) / rect.width, (e.clientY - resize[1]) / rect.height]
      data.y += dy
      data.w += dx
      data.h -= dy
      if (data.w < 0) {
        data.x += data.w
        data.w = -data.w
      }
      if (data.h < 0) {
        data.y += data.h
        data.h = -data.h
      }
      resize = undefined
      do_change = true
    }
    if (crop_ne) {
      evt_stop(e)
      set_crop_new(crop_new_move)
      crop_ne = undefined
      do_change = true
    }
    if (crop_sw) {
      evt_stop(e)
      set_crop_new(crop_new_move)
      crop_sw = undefined
      do_change = true
    }

    do_change && set_entities([...entities])
  })

  const handle = {
    save_slot: () => {
      try {
        store.set(`collager-slot-${slot_i}`, { entities, color })
      } catch (e) {
        alert('ran out of browser storage')
      }
    },
    load_slot: () => {
      const { entities, color } = store.get(`collager-slot-${slot_i}`) || { entities:[], color:'#fff' }
      set_entities(entities)
      set_color(color)
    },
    add_image_src: (src, color=undefined) => {
      // add an image scaled down to 512px max dim
      log('add image', { src })
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = e => {
        const canvas = node('canvas')
        const aspect = img.width / img.height
        if (img.width > 512 || img.height > 512) {
          if (img.width > img.height) {
            canvas.width = 512
            canvas.height = canvas.width / aspect
          } else {
            canvas.height = 512
            canvas.width = canvas.height * aspect
          }
        } else {
          canvas.width = img.width
          canvas.height = img.height
        }
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height)

        const w = Math.min(.8, .5 * aspect)
        const h = w / aspect
        const data = { src:canvas.toDataURL(), x: .1, y: .1, w, h, color }
        const id = gen_id()
        set_entities([...entities, { id, type: TYPE.IMAGE, data }])
        set_selected(id)
      }
      img.onerror = (e:any) => {
        log(e)
        alert('unable to read - if in Google Images, open image in new tab before dragging')
      }
      img.src = src
    },
    read_image_file: (file) => {
      const reader = new FileReader()
      reader.onload = async e => {
        handle.add_image_src(reader.result)
      }
      reader.readAsDataURL(file)
    },
    read_image_src: (src) => {
      log('read image', { src })

      // allow drop from google images
      if (src.startsWith('https://www.google.com/imgres?')) {
        const search = new URLSearchParams(src)
        src = search.get('imgurl')
        log('google image', { src })
      }

      handle.add_image_src(src)
    },
    set_data: (setting) => {
      if (entity) {
        Object.assign(entity.data, setting)
        set_entities([...entities])
      }
    },
    move_to_front: (id) => {
      if (entities.at(-1).id !== id) {
        const entity = entities.find(x => x.id === id)
        set_entities([...entities.filter(x => x !== entity), entity])
      }
    },
    move_to_back: (id) => {
      if (entities.at(0).id !== id) {
        const entity = entities.find(x => x.id === id)
        set_entities([entity, ...entities.filter(x => x !== entity)])
      }
    },

    draw: {
      resize: () => {
        const canvas = Q(r.current, '.draw-canvas')
        if (canvas) {
          const rect = r.current.getBoundingClientRect()
          set_draw_scale(Math.min(rect.width, rect.height) / DRAW.SIZE)
        }
      },
      move: (e) => {
        if (!draw_down) return
        if (draw_touches?.length > 1) return

        const canvas = Q(r.current, '.draw-canvas')
        const ctx = canvas.getContext('2d')
        
        const curr = V.ne(e.clientX, e.clientY)
        const rect = canvas.getBoundingClientRect()
        const o = V.ne(rect.x, rect.y).sc(-1)
        const a = draw_down.ad(o).sc(1/draw_scale)
        const b = curr.ad(o).sc(1/draw_scale).ad(V.ne(.001, .001)) // add .001 to still draw equal points
        draw_down = curr

        // use addition mode for eraser
        ctx.globalCompositeOperation = draw_mode === DRAW.MODES.ERASE ? 'destination-out' : 'source-over'
        ctx.imageSmoothingEnabled = false
        ctx.lineWidth = draw_size
        ctx.strokeStyle = draw_colors[draw_color_i]
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      },
      down: (e) => {
        draw_down = V.ne(e.clientX, e.clientY)
        handle.draw.move(e)
      },
      up: (e) => {
        if (draw_down) {
          handle.draw.move(e)
          draw_down = undefined
          handle.draw.save()
        }
      },
      save: () => {
        const canvas = Q(r.current, '.draw-canvas')
        if (canvas) {
          const canvas_entity = entities.find(x => x.type === TYPE.DRAW)
          canvas_entity.data.src = canvas.toDataURL()
          set_entities(entities.slice())
        }
      }
    },
  }

  useF(a.expand, () => handle.draw.resize())

  useEventListener(window, 'pointermove', e => {
    if (is_draw) {
      handle.draw.move(e)
    }
  })
  useEventListener(window, 'pointerup', e => {
    if (is_draw) {
      handle.draw.up(e)
    }
  })
  useEventListener(window, 'touchend', e => {
    draw_down = undefined
    defer(() => {
      draw_touches = e.touches
    })
  })
  useF(is_draw, () => {
    draw_down = undefined
    draw_touches = undefined
  })

  const r_crop_container = useR()
  const r_crop_container_dim = useR()
  useF(entities, entity, () => {
    if (entity?.type === TYPE.IMAGE) {
      r_crop_container_dim.current = undefined
      const img = new Image()
      img.onload = e => {
        log(img.width, img.height)
        const max = Math.max(img.width, img.height)
        const h = img.height / max
        const w = img.width / max
        log({ h, w })
        if (r_crop_container.current) {
          r_crop_container.current.style.height = `calc(7min * ${h})`
          r_crop_container.current.style.width = `calc(7min * ${w})`
        }
        r_crop_container_dim.current = { h, w }
      }
      img.src = entity.data.src
    }
  })

  const [show_grid, set_show_grid] = store.use('collager-show-grid', { default:false })
  const color_oppo_back = useM(color, () => color === 'transparent' ? '#000000': colors.readable(color))

  const r = useR()
  usePageSettings({
    professional:true,
  })
  useStyle(`
  #square {
    --sq-handle-radius: ${devices.is_mobile ? '20px' : '10px'};
    --sq-handle-size: calc(var(--sq-handle-radius) * 2);
  }
  `)
  return <Style id='square' onDrop={async e => {
    e.preventDefault()
    const item = e.dataTransfer.items[0]
    const data = e.dataTransfer.getData('URL')
    log('drop', item.type, item.kind, { data })
    if (item.type === 'text/uri-list') {
      handle.read_image_src(data)
    } else {
      handle.read_image_file(e.dataTransfer.items[0].getAsFile())
    }
  }} onDragOver={e => e.preventDefault()}>
    {crop ? <Modal target='#square' style={`
    background: #0004;
    `}><InfoStyles style={S(`
    // height: 90vmin;
    // width: 90vmin;
    height: fit-content;
    width: fit-content;
    border: 1px solid currentcolor;
    box-shadow: 0 2px currentcolor;
    `)}><InfoBody>
      <InfoSection labels={['crop']} className='column'>
        <div ref={r_crop_container} style={S(`
        overflow: hidden;
        padding: 1em;
        border: 1px solid currentcolor;
        `)}>
          <div ref={r_crop} style={S(`
          position: relative;
          overflow: visible;
          display: flex;
          `)}>
            {entity ? <img src={entity.data.src} style={S(`
            max-height: 100%;
            max-width: 100%;
            image-rendering: pixelated;
            `)} /> : null}
            {crop_new_move ? <>
            <svg className='cover' xmlns="http://www.w3.org/2000/svg" style={S(`
            pointer-events: none;
            `)}>
              <defs>
                <mask id="mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="#fff3"/>
                  <rect id="mask-rect" x={`${crop_new_move.x * 100}%`} y={`${crop_new_move.y * 100}%`} width={`${crop_new_move.w * 100}%`} height={`${crop_new_move.h * 100}%`} fill="#000" stroke="#fff" />
                </mask>
              </defs>
              <rect x="0" y="0" width="100%" height="100%" fill="#000" mask="url(#mask)"/>
            </svg>
            {[
              [crop_new_move.x, crop_new_move.y + crop_new_move.h],
              [crop_new_move.x + crop_new_move.w, crop_new_move.y],
            ].map((p, i) => {
              const [x, y] = p
              return <div key={i} id={`crop-${i ? 'ne' : 'sw'}`} className='control' style={S(`
              position: absolute;
              height: var(--sq-handle-size); width: var(--sq-handle-size); border-radius: 50%;
              left: calc(${x * 100}% - var(--sq-handle-radius)); top: calc(${y * 100}% - var(--sq-handle-radius));
              background: #fff; border: 1px solid #000;
              cursor: move;
              z-index: 1;
              `)} onPointerDown={e => {
                evt_stop(e)
                defer(() => {
                  if (i === 0) {
                    crop_sw = [e.clientX, e.clientY]
                  } else {
                    crop_ne = [e.clientX, e.clientY]
                  }
                })
              }} />
            })}
            </> : null}
          </div>
        </div>
        <div className='center-row wide between'>
          <InfoBadges labels={[
            { 'cancel': () => set_crop(false) },,
          ]} />
          <InfoBadges labels={[
            { 'crop': () => {
              // handle change in crops to entity x y w h
              const crop_old = entity.data.crop
              const old_crop_w = crop_old.w
              const old_crop_h = crop_old.h
              const new_crop_w = crop_new.w
              const new_crop_h = crop_new.h
              entity.data.w *= new_crop_w / old_crop_w
              entity.data.h *= new_crop_h / old_crop_h

              entity.data.crop = crop_new
              set_entities(entities.slice())
              set_crop(false)
            } },,
          ]} />
        </div>
      </InfoSection>
    </InfoBody></InfoStyles></Modal> : null}
    <InfoBody className='column'>
      <InfoSection labels={[
        a.expand && NAME,
      ]} className='column w100'>
        <div className='buttons-green row gap w100 wrap'>
          {selected ? <>
              <button onClick={e => {
                const entity = entities.find(x => x.id === selected)
                set_entities([...entities.filter(x => x.id !== selected), entity])
              }}>front</button>
              <button onClick={e => {
                const entity = entities.find(x => x.id === selected)
                set_entities([entity, ...entities.filter(x => x.id !== selected)])
              }}>back</button>
            {is_draw ? <>
              <button onClick={e => {
                set_draw_mode(draw_mode === DRAW.MODES.ERASE ? DRAW.MODES.DRAW : DRAW.MODES.ERASE)
              }}>{draw_mode === DRAW.MODES.ERASE ? DRAW.MODES.DRAW : DRAW.MODES.ERASE}</button>
            </> : <>
              <button onClick={e => {
                const copy = strings.json.clone(entity)
                copy.id = gen_id()
                copy.data.x += .05
                copy.data.y += .05
                set_entities([...entities, copy])
              }}>copy</button>
            </>}
            {/* <div>or</div> */}
            <button onClick={e => set_selected(undefined)}>{devices.is_mobile ? 'desel' : 'deselect'}</button>
            {/* <div>or</div> */}
            <button onClick={e => {
              set_entities(entities.filter(x => x.id !== selected))
              set_selected(undefined)
            }}>delete</button>
          </> : <>
            <button onClick={e => {
              // ask user to upload image
              const input = node(`<input type="file" accept="image/*,.heic" />`)
              input.onchange = async e => {
                const file = input.files[0]
                if (file) {
                  handle.read_image_file(file)
                }
              }
              input.click()
            }}>image</button>
            <button onClick={e => {
              const canvas = node('canvas')
              canvas.width = canvas.height = 1
              // const ctx = canvas.getContext('2d')
              // ctx.fillStyle = draw_colors[draw_color_i] || DRAW.COLORS.blue
              // ctx.fillRect(0, 0, 1, 1)
              handle.add_image_src(canvas.toDataURL(), draw_colors[draw_color_i] || DRAW.COLORS.blue)
            }}>shape</button>
            <button onClick={e => {
              // ask user to enter text
              const text = prompt('Enter text')
              if (text) {
                const h = .15
                const w = Math.min(.9, .05*text.length)
                const data = { text, x:.5-w/2, y:.5-h/2, w, h, color:colors.readable(color) }
                const id = gen_id()
                set_entities([...entities, { id, type: TYPE.TEXT, data }])
                set_selected(id)
              }
            }}>text</button>
            <button onClick={e => {
              // we only create one canvas
              // select the existing one or create an entity if it doesn't exist
              const draw_entity = entities.find(x => x.type === TYPE.DRAW)
              if (draw_entity) {
                set_selected(draw_entity.id)
              } else {
                const id = gen_id()
                set_entities([...entities, { id, type: TYPE.DRAW, data: { src:undefined } }])
                set_selected(id)
              }
            }}>draw</button>
          </>}
        </div>
        <div ref={r} id='collager-frame' style={S(`        
        box-shadow: 0 0 0 1px #000;
        margin: 1px;
        aspect-ratio: 1/1;
        width: calc(100% - 2px);
        max-height: 70vh; max-width: 70vh;
        ${color ? `background: ${color};` : ''}
        position: relative;
        overflow: hidden;
        `)}
        onPointerDown={e => {
          if (!is_draw) {
            set_selected(undefined)
          }
        }}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            evt_stop(e)
            set_selected(undefined)
            ;(document.activeElement as any).blur()
          }
        }}>
          {entities.map(({ id, type, data }) => {
            const l_id = `e-${id}`
            let l
            defer(() => { l = document.getElementById(l_id) })
            if (type === TYPE.IMAGE) {
              return <div key={id} id={`e-${id}`} tabIndex={0} style={S(`
              position: absolute;
              top: ${data.y * 100}%;
              left: ${data.x * 100}%;
              height: ${data.h * 100}%;
              width: ${data.w * 100}%;
              cursor: move;
              ${data.angle ? `transform: rotate(${data.angle}deg);` : ''}
              `)} onPointerDown={e => {
                evt_stop(e)
                set_selected(id)
                // handle.move_to_front(id)
                l.focus()
                defer(() => down = [e.clientX, e.clientY], _l = l, _data = data)
              }} onClick={e => {
                evt_stop(e)
                defer(() => down = undefined)
              }}>
                {/* present image with corner control point for resizing */}
                <div className='img-container' style={S(`
                height: 100%; width: 100%;
                overflow: ${crop && selected === id ? 'visibile' : 'hidden'};
                display: flex; align-items: center; justify-content: center;
                position: relative;
                `)}>
                  <img src={data.src} style={S(`
                  height:100%;
                  width:100%;
                  ${data.crop ? `
                  position: absolute;
                  width: ${100/data.crop.w}%;
                  height: ${100/data.crop.h}%;
                  top: ${-100*data.crop.y/data.crop.h}%;
                  left: ${-100*data.crop.x/data.crop.w}%;
                  ` : ''}
                  position: absolute;
                  image-rendering: pixelated;
                  ${data.shadow ? `box-shadow: ${data.shadow_x??0}px ${data.shadow_y??2}px 0 ${data.shadow_grow??0}px ${data.shadow_color??'#000'};` : ''}
                  ${data.oval ? 'border-radius: 50%;' : ''}
                  ${data.border ? `border: ${data.border_width??1}px solid ${data.border_color??'#000'};` : ''}
                  ${data.color ? `background: ${data.color};` : ''}
                  ${data.opacity ? `opacity: ${data.opacity};` : ''}
                  `)} />
                </div>
                {selected === id ? <div style={S(`
                height: 100%; width: 100%;
                position: absolute; top: 0; left: 0;
                box-shadow: 0 0 0 1px #fff, 0 0 0 2px #000;
                `)} /> : null}
                <div className='control' style={S(`
                position: absolute;
                height: var(--sq-handle-size); width: var(--sq-handle-size); border-radius: 50%;
                top: calc(-1 * var(--sq-handle-radius)); right: calc(-1 * var(--sq-handle-radius));
                background: #fff; border: 1px solid #000;
                cursor: ne-resize;
                z-index: 1;
                ${selected === id && (!data.angle || data.angle % 360 == 0) ? '' : 'display: none;'}
                `)} onPointerDown={e => {
                  evt_stop(e)
                  set_selected(id)
                  // handle.move_to_front(id)
                  defer(() => resize = [e.clientX, e.clientY], _l = l, _data = data)
                }} />
              </div>
            } else if (type === TYPE.TEXT) {
              const resize_text = () => {
                if (!data.text) return
                // resize text to fit container
                const transform_save = l.style.transform
                l.style.transform = ''
                const rect = l.getBoundingClientRect()
                const text = Q(l, '.text')
                let size = 1
                const f_up = () => text.style.fontSize = `${size}px`
                f_up()
                while (text.clientHeight < rect.height) {
                  size += 1
                  f_up()
                }
                while (text.clientHeight > rect.height) {
                  size -= .1
                  f_up()
                }
                l.style.transform = transform_save
              }
              defer(resize_text)
              text_id_to_resize[id] = resize_text
              return <div key={id} id={`e-${id}`} tabIndex={0} style={S(`
              position: absolute;
              top: ${data.y * 100}%;
              left: ${data.x * 100}%;
              height: ${data.h * 100}%;
              width: ${data.w * 100}%;
              cursor: move;
              display: flex; align-items: center; justify-content: center;
              ${data.angle ? `transform: rotate(${data.angle}deg);` : ''}
              ${selected === id ? 'box-shadow: 0 0 0 1px #fff, 0 0 0 2px #000;' : ''}
              `)} onPointerDown={e => {
                evt_stop(e)
                set_selected(id)
                // handle.move_to_front(id)
                l.focus()
                defer(() => down = [e.clientX, e.clientY], _l = l, _data = data)
              }} onClick={e => {
                evt_stop(e)
                defer(() => down = undefined)
              }} onPointerMove={e => {
                if (resize && _l === l) {
                  defer(resize_text)
                }
              }}>
                {/* present text with corner control points for resizing */}
                <span className='text' style={S(`
                max-width: 100%; word-wrap: break-word;
                color: ${data.color};
                background: ${data.background || 'transparent'};
                font-size: 1px;
                font-family: ${data.font || FONTS.DUOSPACE};
                text-align: ${data.align || ALIGN.LEFT};
                line-height: 1.1;
                white-space: pre-wrap;
                ${data.bold ? 'font-weight: bold;' : ''}
                ${data.italic ? 'font-style: italic;' : ''}
                ${data.shadow ? `text-shadow: ${data.shadow_x??0}px ${data.shadow_y??2}px ${data.shadow_color??'#000'};` : ''}
                ${data.opacity ? `opacity: ${data.opacity};` : ''}
                `)}>
                  {data.text}
                </span>
                <div className='control' style={S(`
                position: absolute;
                height: var(--sq-handle-size); width: var(--sq-handle-size); border-radius: 50%;
                top: calc(-1 * var(--sq-handle-radius)); right: calc(-1 * var(--sq-handle-radius));
                background: #fff; border: 1px solid #000;
                cursor: ne-resize;
                z-index: 1;
                ${selected === id && (!data.angle || data.angle % 360 == 0) ? '' : 'display: none;'}
                `)} onPointerDown={e => {
                  evt_stop(e)
                  set_selected(id)
                  // handle.move_to_front(id)
                  defer(() => resize = [e.clientX, e.clientY], _l = l, _data = data)
                }} />
              </div>
            } else if (type === TYPE.DRAW) {
              defer(() => {
                // draw saved src to canvas
                handle.draw.resize()
                if (!data.src) return
                const ctx  = l.getContext('2d')
                const img = new Image()
                img.onload = e => {
                  l.width = img.width
                  l.height = img.height
                  ctx.drawImage(img, 0, 0)
                }
                img.src = data.src
              })
              return <canvas key={id} id={`e-${id}`} className='draw-canvas' height={DRAW.SIZE} width={DRAW.SIZE} onPointerMove={e => {
                draw_over?.remove()
                draw_over = node(`<div style="
                position: absolute;
                top: ${e.clientY}px;
                left: ${e.clientX}px;
                font-size: ${draw_size * draw_scale}px;
                height: 1em; width: 1em; translate: -.5em -.5em;
                border-radius: 50%;
                background: ${colors[color]};
                z-index: 100;
                pointer-events: none;
                "></div>`)
                document.body.appendChild(draw_over)
              }} onPointerOut={e => draw_over?.remove()} style={S(`
              position: absolute;
              height: 100%;
              width: 100%;
              top: 0;
              left: 0;
              image-rendering: pixelated;
              // z-index: 1;
              ${is_draw ? '' : 'pointer-events: none;'}
              `)} onMouseDown={e => {
                handle.draw.down(e)
              }} onTouchStart={e => {
                draw_touches = e.touches
                if (draw_touches.length > 1) draw_down = undefined
                else if (draw_touches.length === 1) {
                  const touch = draw_touches[0]
                  draw_down = V.ne(touch.clientX, touch.clientY)
                }
              }} />
            }
          })}
          {show_grid ? <>
            {[
              [6, `1px solid ${color_oppo_back}33`],
              [3, `1px solid ${color_oppo_back}`],
            ].map(([n, border]) => 
              <table style={S(`
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                pointer-events: none;
                `)}>
                  <tbody>
                    {range(n).map(y => <tr key={y}>
                      {range(n).map(x => <td key={x} style={S(`
                      border: ${border};
                      `)} />)}
                    </tr>)}
                  </tbody>
                </table>)}
          </> : null}
        </div>
        <div className='column gap wide'>
          {entity ? <>
            {entity.type === TYPE.IMAGE || entity.type === TYPE.TEXT ? <>
            <div>
              {type_to_display(entity.type)} selected
            </div>
            </> : null}
            {entity.type === TYPE.TEXT ? <>
              <div className='center-row wide'>
                {/* <input type='text' value={entity.data.text} onChange={e => {
                  entity.data.text = e.target.value
                  set_entities([...entities])
                }} /> */}
                <Multiline value={entity.data.text} setValue={text => handle.set_data({ text })} style={S(`
                max-height: 5em;
                `)}/>
              </div>
              <div className='center-row wide gap'>
                color:
                <InfoButton onClick={e => Q(e.target, 'input').click()}><ColorPicker value={entity.data.color || '#000'} setValue={value => {
                  entity.data.color = value
                  set_entities([...entities])
                }} /></InfoButton>
                <InfoButton onClick={() => {
                  entity.data.color = colors.random()
                  if (entity.data.background) {
                    entity.data.background = colors.readable(entity.data.color)
                  }
                  set_entities([...entities])
                }}>random</InfoButton>
                <InfoCheckbox label='back' value={!!entity.data.background} setter={value => handle.set_data({ background: value ? colors.readable(entity.data.color || '#000') : undefined })} />
                {entity.data.background ? <>
                  <InfoButton onClick={e => Q(e.target, 'input').click()}><ColorPicker value={entity.data.background} setValue={value => {
                    entity.data.background = value
                    set_entities([...entities])
                  }} /></InfoButton>
                </> : null}
              </div>
              <div className='center-row wide gap wrap'>
                font:
                <Select value={entity.data.font || FONTS.DUOSPACE} setter={value => {
                  entity.data.font = value
                  set_entities([...entities])
                  setTimeout(() => text_id_to_resize[entity.id]?.(), 100)
                }} options={values(FONTS)} />
                <InfoCheckbox label='bold' value={entity.data.bold || false} setter={bold => handle.set_data({ bold })} />
                <InfoCheckbox label='italic' value={entity.data.italic || false} setter={italic => handle.set_data({ italic })} />
                <Select value={entity.data.align || ALIGN.LEFT} setter={align => handle.set_data({ align })} options={values(ALIGN)} />
              </div>
            </> : null}
            {entity.type === TYPE.IMAGE ? <>
              <div className='center-row wide gap'>
                <InfoCheckbox label='oval' value={entity.data.oval || false} setter={oval => handle.set_data({ oval })} />
                color:
                <InfoButton onClick={e => Q(e.target, 'input').click()}><ColorPicker value={entity.data.color || '#000'} setValue={value => {
                  entity.data.color = value
                  set_entities([...entities])
                }} /></InfoButton>
                <InfoButton onClick={() => handle.set_data({ color:colors.random() })}>random</InfoButton>
              </div>
              <div className='center-row wide gap'>
                <InfoCheckbox label='border' value={entity.data.border || false} setter={border => handle.set_data({ border })} />
                {entity.data.border ? <>
                  <InfoButton onClick={e => Q(e.target, 'input').click()}><ColorPicker value={entity.data.border_color || '#000'} setValue={value => {
                    entity.data.border_color = value
                    set_entities([...entities])
                  }} /></InfoButton>
                  <InfoSlider value={entity.data.border_width || 1} setValue={value => {
                    entity.data.border_width = value
                    set_entities([...entities])
                  }} range={[1, 10]} snap={1} style={S(`flex-shrink:1`)} />
                </> : null}
              </div>
            </> : null}
            {entity.type === TYPE.IMAGE || entity.type === TYPE.TEXT ? <>
              <div className='center-row wide gap'>
                <label>angle:</label>
                <InfoSlider value={entity.data.angle||0} setValue={angle => handle.set_data({ angle})} range={[-180, 180]} snap={5} style={S(`flex-shrink:1`)} />
                <label>opacity:</label>
                <InfoSlider value={entity.data.opacity||1} setValue={opacity => handle.set_data({ opacity})} range={[.1, 1]} snap={.1} style={S(`flex-shrink:1`)} />
              </div>
              <div className='center-row wide gap'>
                <InfoCheckbox label='shadow' value={entity.data.shadow||false} setter={shadow => {
                  let shadow_color = entity.data.shadow_color
                  if (shadow && !shadow_color) {
                    shadow_color = colors.readable(entity.data.color || '#000')
                  }
                  handle.set_data({ shadow, shadow_color })
                }} />
                {entity.data.shadow ? <>
                  <InfoButton onClick={e => Q(e.target, 'input').click()}><ColorPicker value={entity.data.shadow_color ?? '#000'} setValue={value => {
                    entity.data.shadow_color = value
                    set_entities([...entities])
                  }} /></InfoButton>
                  <label>depth:</label>
                  <InfoSlider value={entity.data.shadow_x ?? 0} setValue={value => {
                    entity.data.shadow_x = value
                    set_entities([...entities])
                  }} range={[-10, 10]} snap={1} style={S(`flex-shrink:1`)} />
                  <InfoSlider value={entity.data.shadow_y ?? 2} setValue={value => {
                    entity.data.shadow_y = value
                    set_entities([...entities])
                  }} range={[-10, 10]} snap={1} style={S(`flex-shrink:1`)} />
                </> : null}
              </div>
            </> : null}
            {entity.type === TYPE.IMAGE ? <>
              <div className='center-row wide gap'>
                <InfoButton onClick={e => {
                  set_crop(true)
                  if (!entity.data.crop) {
                    entity.data.crop = { x:0, y:0, w:1, h:1 }
                    set_entities(entities.slice())
                  }
                  set_crop_new(strings.json.clone(entity.data.crop))
                }}>crop</InfoButton>
                <InfoButton onClick={() => {
                  Object.assign(entity.data, {
                    x: 0, y: 0, w: 1, h: 1,
                  })
                  set_entities([...entities])
                }}>fit to square</InfoButton>
                <InfoButton onClick={() => {
                  Object.assign(entity.data, {
                    x: .5 - entity.data.w/2, y: .5 - entity.data.h/2
                  })
                  set_entities([...entities])
                }}>center</InfoButton>
              </div>
            </> : null}
            {entity.type === TYPE.DRAW ? <>
              <div id='controls-container' className='middle-row wide'>
                <div className='middle-column gap'>
                  {draw_mode === DRAW.MODES.ERASE ? 'erasing' : <div id='palette' className='row gap'>{draw_colors.map((x, i) => <ColorDot {...{ color:x, active:draw_color_i===i, on_click:()=>set_draw_color_i(i) }} />)}</div>}
                  <div id='picker-and-size' className='middle-row wide gap' style={S(`
                  justify-content: space-between;
                  `)}>
                    {draw_mode === DRAW.MODES.ERASE ? null : <>
                      <div id='picker' className='row gap'>
                        <button onClick={e => {
                          const picker = Q(e.target, 'input') || e.target
                          picker.click()
                        }} style={S(`background:${draw_colors[draw_color_i]}; height:3em`)}><ColorPicker {...{ value:draw_colors[draw_color_i], setValue: (new_color) => {
                          const curr_index = draw_color_i
                          const new_colors = draw_colors.slice()
                          new_colors[curr_index] = new_color
                          set_draw_colors(new_colors)
                        } }} /></button>
                        <button style={S(`height:3em`)} onClick={e => {
                          const curr_index = draw_color_i
                          const new_colors = draw_colors.slice()
                          new_colors[curr_index] = values(DRAW.COLORS)[curr_index]
                          set_draw_colors(new_colors)
                        }}>reset</button>
                      </div>
                    </>}
                    <div id='size' className='row gap'>{values(DRAW.BRUSHES).map(x => <SizeDot {...{ size:x, value:draw_size, on_click:()=>set_draw_size(x) }} />)}</div>
                  </div>
                </div>
              </div>
            </> : null}
            <HalfLine />
          </> : <>
            <div className='center-row wide gap'>
              {color !== 'transparent' ? <>
                <InfoButton onClick={e => Q(e.target, 'input').click()}><ColorPicker value={color || '#000'} setValue={set_color} /></InfoButton>
                <InfoButton onClick={() => set_color(colors.random())}>random</InfoButton>
                <InfoButton onClick={() => set_color('transparent')}>remove background</InfoButton>
              </> : <>
                <InfoButton onClick={() => set_color('#fff')}>add background</InfoButton>
              </>}
              <InfoButton onClick={e => set_show_grid(!show_grid)}>{show_grid ? 'hide' : 'show'} grid</InfoButton>
            </div>
            <HalfLine />
          </>}
        </div>
        <div className='center-row gap buttons-green'>
          {/* <button onClick={e => {
            handle.save_slot()
          }}>save →</button>
          <Select options={range(5)} display={i => `slot ${i+1}`} value={slot_i} setter={set_slot_i} />
          <button onClick={e => {
            handle.load_slot()
          }}>→ load</button> */}
          <button onClick={e => {
            const { html2canvas } = window as any
            // const style_save = pick(r.current.style, 'width height max-width max-height')
            // r.current.style.width = '1024px'
            // r.current.style.height = '1024px'
            // set_selected(undefined)
            // set_entities(entities.slice())
            // defer(() => {
            //   html2canvas(r.current).then(canvas => {
            //     Object.assign(r.current.style, style_save)
            //     canvases.download(canvas, 'square.png')
            //     set_selected(selected)
            //     set_entities(entities.slice())
            //   })
            // }, 100)
            set_selected(undefined)
            set_show_grid(false)
            defer(() => {
              html2canvas(r.current, {
                backgroundColor: null,
              }).then(canvas => {
                // there are white 1px lines on the sides - resize to a smaller canvas
                if (true) {
                  const broken_canvas = canvas
                  canvas = document.createElement('canvas')
                  canvas.width = broken_canvas.width - 2
                  canvas.height = broken_canvas.height - 2
                  const ctx = canvas.getContext('2d')
                  ctx.drawImage(broken_canvas, 1, 1, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
                }
                canvases.download(canvas, 'square.png')
                set_selected(selected)
                set_show_grid(show_grid)
              })
            }, 100)
          }}>download</button>
          <div>or</div>
          {/* allow user to import/export square state */}
          <button onClick={e => {
            const json = JSON.stringify({ entities, color })
            const blob = new Blob([json], { type:'application/json' })
            const url = URL.createObjectURL(blob)
            const a = node(`<a href="${url}" download="art.sq.json"></a>`)
            a.click()
          }}>export</button>
          <button onClick={e => {
            const input = node(`<input type="file" accept=".json" />`)
            input.onchange = e => {
              const file = input.files[0]
              const reader = new FileReader()
              reader.onload = e => {
                const json = reader.result as string
                const { entities, color } = JSON.parse(json)
                set_entities(entities)
                set_color(color)
                set_selected(undefined)
              }
              reader.readAsText(file)
            }
            input.click()
          }}>import</button>
          <div>or</div>
          <button onClick={e => {
            set_entities([])
            set_selected(undefined)
          }}>clear</button>
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const common_css = `
input:is([type=text], [type=number]), select, textarea {
  border: 1px solid currentcolor;
  &:not(textarea) {
    min-height: 1.5em;
    height: 1.5em;
  }
  &[type=number] {
    max-width: 5em;
  }
}
input:is([type=text], [type=number]), textarea {
  font-size: max(16px, 1em);
  background: var(--id-color-text);
  color: var(--id-color-text-readable);
  border-radius: 0;
  border-radius: .25em;
  padding: 0 .25em;
}
label.select.select.select.select.select, *:is(button, label).action.action.action.action.action {
  font-size: 1em;
  min-height: 1.5em;
  padding: 0 .25em;
  background: var(--id-color-text);
  color: var(--id-color-text-readable);
  &.select {
    &::after {
      content: " ⌄";
      font-family: monospace;
      white-space: pre;
      pointer-events: none;
      translate: 0 -.25em;
    }
    select {
      font-family: inherit;
      border: 0;
      option {
        padding: 0;
      }
    }
  }
}

ul {
  padding-left: 1em;
}

button {
  color: var(--id-color-text);
  background: var(--id-color-text-readable);
  &:is(.buttons-green *) {
    background: #f8fff8;
    // background: #fffeee;
    background: #fff;
  }
  // &:is(.buttons-blue *) {
  //   color: var(--id-color-text-readable);
  //   background: var(--id-color-text);
  // }
  border-radius: 10em;
  border: 1px solid currentcolor;
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
  line-height: 1.3em;
}

* {
  flex-shrink: 0;
}

--id-color: #eee;
--id-color-text: #222;
--id-color-text-readable: #f8fff8;
background: var(--id-color) !important;
color: var(--id-color-text) !important;
padding: .25em;
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
touch-action: none;
user-select: none;
overflow: auto;

#collager-frame {
  > * {
    outline: none;
  }
}

`
const PopupStyle = styled(InfoStyles)`
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);
${common_css}
`