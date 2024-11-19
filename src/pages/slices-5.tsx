import React from 'react'
import styled from 'styled-components'
import { ColorPicker, InfoBadges, InfoBody, InfoSection, InfoSelect, InfoStyles, Select } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useE, useEventListener, useF, useR, useRerender, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import * as T from 'three'
import { S } from 'src/lib/util'
import { store } from 'src/lib/store'

const { named_log, Q, on, range, rand, colors, maths, devices, canvases } = window as any
const NAME = 'slices-2'
const log = named_log(NAME)

const SIZE = 10, WIDTH = SIZE, HEIGHT = SIZE * 1.5
const ORTHO = true

let scene, camera, renderer, container
const do_resize = () => {
  renderer.setSize(0, 0)
  const outer = container.parentElement.getBoundingClientRect()
  const container_aspect = WIDTH / HEIGHT
  const width = Math.min(outer.width, outer.height * container_aspect)
  container.style.width = `${width}px`
  container.style.height = `${width / container_aspect}px`

  const rect = container.getBoundingClientRect()
  if (ORTHO) {
    // fit WIDTH HEIGHT inside actual rect.width rect.height
    const aspect = rect.width / rect.height * (HEIGHT / WIDTH)
    if (aspect < 1) {
      // height larger, keep width at WIDTH / 2 and adjust height
      camera.left = WIDTH / -2
      camera.right = WIDTH / 2
      camera.top = HEIGHT / 2 / aspect
      camera.bottom = HEIGHT / -2 / aspect
    } else {
      camera.left = WIDTH / -2 * aspect
      camera.right = WIDTH / 2 * aspect
      camera.top = HEIGHT / 2
      camera.bottom = HEIGHT / -2
    }
  } else {
    camera.aspect = rect.width / rect.height * (WIDTH / HEIGHT)
  }
  camera.updateProjectionMatrix()
  renderer.setSize(rect.width, rect.height)
}

const SHAPES = {
  SQUARE: 'square',
  CIRCLE: 'circle',
  TRIANGLE: 'triangle',
  HEXAGON: 'hexagon',
  STAR: 'star',
  RING: 'ring',
  // CROSS: 'cross',
  HEART: 'heart',
}

export default () => {
  const r = useR()

  let [shape, set_shape] = usePathState()
  shape = shape || SHAPES.SQUARE

  const [start_color, set_start_color] = store.use('slices-5-start-color', { default:undefined })
  const [end_color, set_end_color] = store.use('slices-5-end-color', { default:undefined })
  const [color_long, set_color_long] = store.use('slices-5-color-long', { default:false })

  const [back_color, set_back_color] = store.use('slices-5-back-color', { default:'#eeebe6' })

  const reroll = useRerender()
  const r_colors = useR()
  useF(() => {
    scene = new T.Scene()
    if (ORTHO) {
      camera = new T.OrthographicCamera(0, 0, 0, 0, 1, 1000)
      camera.position.x = camera.position.z = SIZE
      camera.position.y = SIZE
      camera.lookAt(0, 0, 0)
    } else {
      camera = new T.PerspectiveCamera(1.5, 1, 0.1, SIZE * 100)
      camera.position.x = camera.position.z = SIZE * 5
      camera.position.y = SIZE * 50
      camera.lookAt(0, 0, 0)
    }
    renderer = new T.WebGLRenderer({ preserveDrawingBuffer:true, antialias:true })
    container = r.current
    container.appendChild(renderer.domElement)
    do_resize()
  })
  useF(back_color, () => {
    scene.background = new T.Color(back_color)
  })
  useE(shape, reroll, start_color, end_color, color_long, () => {
    if (!start_color || !end_color) {
      const hue = rand.i(360)
      set_start_color(colors.to_hex(`hsl(${hue}, 100%, 50%)`))
      set_end_color(colors.to_hex(`hsl(${(hue + (rand.i(2) ? 45 : -45) + 360) % 360}, 100%, 50%)`))
      return
    }
    const cleanups = []

    // create shape alphamap
    const construct_shape_alphamap = (shape) => {
      const canvas = document.createElement('canvas')
      const SZ = 1024
      canvas.width = canvas.height = SZ
      const HF = SZ / 2
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = 'black'
      ctx.fillRect(0, 0, SZ, SZ)
      ctx.strokeStyle = ctx.fillStyle = 'green'
      // ctx.strokeRect(0, 0, SZ, SZ)
      switch (shape) {
        case SHAPES.SQUARE:
          ctx.fillRect(0, 0, SZ, SZ)
          break
        case SHAPES.CIRCLE:
          {
            ctx.beginPath()
            const r = HF * 7/8
            ctx.ellipse(r, r, r, r, 0, 0, Math.PI * 2)
            ctx.fill()
          }
          break
        case SHAPES.TRIANGLE:
          {
            ctx.beginPath()
            // largest equilateral triangle possible around center
            // take a circle of radius 64 and place a point at each TAU/3
            const x = HF, y = HF
            const r = HF
            const a = Math.PI * 2 / 3
            ctx.moveTo(x + r * Math.cos(0), y + r * Math.sin(0))
            ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a))
            ctx.lineTo(x + r * Math.cos(a * 2), y + r * Math.sin(a * 2))
            ctx.fill()
          }
          break
        case SHAPES.STAR:
          {
            ctx.beginPath()
            // largest perfect star possible centered on HF, HF
            // take a circle of radius HF and place a point at each TAU/5 interspersed with radius HF/2
            const x = HF, y = HF
            const r = HF
            const r2 = HF/2
            const a = Math.PI * 2 / 5
            for (let i = 0; i < 5; i++) {
              const angle = a * i
              const angle2 = angle + a / 2
              ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle))
              ctx.lineTo(x + r2 * Math.cos(angle2), y + r2 * Math.sin(angle2))
            }
            ctx.fill()
          }
          break
        case SHAPES.RING:
          {
            ctx.beginPath()
            const r = HF * 7/8, inside = HF * 3/8
            ctx.ellipse(r, r, r, r, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = 'black'
            ctx.beginPath()
            ctx.ellipse(r, r, inside, inside, 0, 0, Math.PI * 2)
            ctx.fill()
          }
          break
        case SHAPES.HEXAGON:
          {
            ctx.beginPath()
            // largest hexagon possible centered on HF, HF
            // take a circle of radius 64 and place a point at each TAU/6
            const x = HF, y = HF
            const r = HF
            const a = Math.PI * 2 / 6
            for (let i = 0; i < 6; i++) {
              const angle = a * i
              ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle))
            }
            ctx.fill()
          }
          break
        case SHAPES.CROSS:
          {
            ctx.beginPath()
            // largest cross possible centered on HF, HF
            const width = HF / 2
            ctx.fillRect(HF - width / 2, 0, width, SZ)
            ctx.fillRect(0, HF - width / 2, SZ, width)
            ctx.fill()
          }
          break
        case SHAPES.HEART:
          {
            ctx.beginPath()
            // draw square with two circles on adjacent sides
            const r = SZ / 3
            ctx.fillRect(0, 0, r*2, r*2)
            ctx.ellipse(r, 2*r, r, r, 0, 0, maths.TAU)
            ctx.ellipse(2*r, r, r, r, 0, 0, maths.TAU)
            ctx.fill()
          }
          break
      }
      return new T.CanvasTexture(canvas)
    }
    const shape_alphamap = construct_shape_alphamap(shape)

    // if (!r_colors.current) {
    //   const start = rand.f(360)
    //   const color_dir = rand.i(2) ? 1 : -1
    //   r_colors.current = { start, color_dir }
    // }
    // const { start, color_dir } = r_colors.current

    const N_SLICES = 20
    const rotate_dir = 1 // rand.i(2) ? 1 : -1
    let rotate_length = Math.PI / 2
    let rotate_start = 0
    if (shape === SHAPES.CIRCLE) {
      rotate_length = Math.PI * 2
    } else if (shape === SHAPES.TRIANGLE) {
      rotate_length = Math.PI * 2 / 3
    } else if (shape === SHAPES.STAR) {
      rotate_length = Math.PI * 2 / 5
    } else if (shape === SHAPES.RING) {
      rotate_length = Math.PI * 2
    } else if (shape === SHAPES.HEXAGON) {
      rotate_length = Math.PI * 2 / 6
    } else if (shape === SHAPES.HEART) {
      rotate_length = Math.PI
      rotate_start = -Math.PI / 2
    }

    const start_hsl_obj = colors.rgb_to_hsl_object(...colors.hex_to_rgb(start_color))
    const end_hsl_obj = colors.rgb_to_hsl_object(...colors.hex_to_rgb(end_color))
    // find closest angle between start and end hue
    let a = end_hsl_obj.h - start_hsl_obj.h
    if (a < -.5) a += 1
    if (a > .5) a -= 1
    if (color_long) {
      a = a < 0 ? a + 1 : a - 1
    }
    const gradient = range(N_SLICES).map(i => {
      const p = i / Math.max(2, N_SLICES - 1)
      const h = (start_hsl_obj.h + a * p + 1) % 1
      const s = maths.lerp(start_hsl_obj.s, end_hsl_obj.s, p)
      const l = maths.lerp(start_hsl_obj.l, end_hsl_obj.l, p)
      return new T.Color(colors.rgb_to_hex(...colors.hsl_object_to_rgb({ h, s, l })))
    })
    
    const slices = range(N_SLICES).map(i => {
      const SLICE_SIZE = 7
      const SLICE_HALF = SLICE_SIZE / 2
      // const color = new T.Color(`hsl(${((start + color_dir * i * 45 / (N_SLICES - 1)) + 360) % 360}, 100%, 50%)`)
      const color = gradient[i]
      const geometry = new T.PlaneGeometry(SLICE_SIZE, SLICE_SIZE)
      // lay geometry flat on xz plane
      geometry.rotateX(Math.PI / 2)
      const material = new T.MeshBasicMaterial({
        color, side: T.DoubleSide, transparent: true, opacity: .5,
        alphaMap: shape_alphamap,
        })
      const slice = new T.Mesh(geometry, material)
      slice.position.y = (i - N_SLICES / 2) / (N_SLICES - 1) * SLICE_SIZE * 1.5
      slice.rotation.y = rotate_start + rotate_dir * rotate_length * (i / (N_SLICES - 1))
      scene.add(slice)
      cleanups.push(() => scene.remove(slice))
      return slice
    })

    function loop() {
      handle_animate = requestAnimationFrame(loop)
      slices.forEach(slice => {
        slice.rotation.y += 0.01
      })
      renderer.render(scene, camera)
    }
    let handle_animate = requestAnimationFrame(loop)
    cleanups.push(() => cancelAnimationFrame(handle_animate))

    return cleanups
  })

  const [a] = auth.use()
  useEventListener(window, 'resize', do_resize)
  useF(a.expand, do_resize)

  useStyle(`
  #slices-2 {
    --id-color: ${back_color} !important;
    --id-color-text: ${colors.readable(back_color)} !important;
    --id-color-text-readable: ${colors.readable(colors.readable(back_color))} !important;
  }
  `)
  usePageSettings({
    background: '#fff',
    expand: true,
  })
  const shape_controls = [
    <Select value={shape} onChange={e => set_shape(e.target.value)} options={Object.values(SHAPES)} /> as any,
  ]
  const color_controls = [
    { 'random color': () => {
      set_start_color(undefined)
      set_end_color(undefined)
      reroll()
    } },
    <ColorPicker value={start_color||'#fff'} setValue={set_start_color} /> as any,
    <ColorPicker value={end_color||'#fff'} setValue={set_end_color} /> as any,
    { [color_long ? 'long' : 'short']: () => set_color_long(!color_long) },
  ]
  const back_controls = [
    <ColorPicker value={back_color||'#fff'} setValue={set_back_color} /> as any,
    { 'reset back': () => set_back_color('#eeebe6') },
  ]
  return <Style id='slices-2'>
    <InfoBody style={S(`
      padding: 0;
      overflow: hidden;
      position: relative;
      `)}>
      <div className='w100 h100 center'>
        <div ref={r} />
      </div>
      <div className='cover column gap'>
        {devices.is_mobile ? <>
          <InfoBadges labels={shape_controls} style={S(`font-size:1.33em`)} />
          <InfoBadges labels={color_controls} />
          <InfoBadges labels={back_controls} />
        </> : <>
          <InfoBadges labels={[
            ...shape_controls,
            ...color_controls,
            ...back_controls,
          ]} />
        </>}
        <div className='spacer' />
        <InfoBadges labels={[
          { 'save': () => {
            canvases.download(Q('#slices-2 canvas'), 'slices.png')
          } },
        ]} style={S(`font-size: 1.33em`)} />
      </div>
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

--id-color: #eeebe6;
--id-color-text: #222;
--id-color-text-readable: #fff;
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