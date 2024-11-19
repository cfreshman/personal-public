import React from 'react'
import styled from 'styled-components'
import { ColorPicker, InfoBadges, InfoBody, InfoSection, InfoSelect, InfoStyles, Select } from '../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useE, useEventListener, useF, useR, useRerender, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import * as T from 'three'
import { S } from 'src/lib/util'
import { store } from 'src/lib/store'

const { named_log, Q, on, range, rand, colors, maths, devices, canvases } = window as any
const NAME = 'slices-5'
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

export default () => {
  const noise_script = useCachedScript('/lib/noise.js')
  const r = useR()

  const [seed, set_seed] = store.use('slices-5-seed', { default:rand.i(1_000_000_000) })

  const [start_color, set_start_color] = store.use('slices-5-start-color', { default:undefined })
  const [end_color, set_end_color] = store.use('slices-5-end-color', { default:undefined })
  const [color_long, set_color_long] = store.use('slices-5-color-long', { default:false })

  const [back_color, set_back_color] = store.use('slices-5-back-color', { default:'#eeebe6' })

  useF(seed, start_color, end_color, color_long, back_color, () => log('vars', { seed, start_color, end_color, color_long, back_color }))

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
  useE(noise_script, reroll, start_color, end_color, color_long, () => {
    if (!start_color || !end_color) {
      const hue = rand.i(360)
      set_start_color(colors.to_hex(`hsl(${hue}, 100%, 50%)`))
      set_end_color(colors.to_hex(`hsl(${(hue + (rand.i(2) ? 45 : -45) + 360) % 360}, 100%, 50%)`))
      return
    }
    if (!noise_script) return
    const { noise } = window as any

    const cleanups = []

    function get_border_radius(x, y, z=0) {
      const angle = Math.atan2(y, x)
      const a_x = Math.cos(angle)
      const a_y = Math.sin(angle)
      return (
        noise.simplex3(a_x / 32 + 10_000_000 + seed, a_y / 32 + 10_000_000 + seed, z / 32) + 
        .5 * noise.simplex3(a_x / 8 + 20_000_000 + seed, a_y / 8 + 20_000_000 + seed, z / 8) + 
        .25 * noise.simplex3(a_x / 2 + 30_000_000 + seed, a_y / 2 + 30_000_000 + seed, z / 2) + 
        .1 * noise.simplex3(a_x * 2 + 40_000_000 + seed, a_y * 2 + 40_000_000 + seed, z * 2)
      ) * .5 + 1
    }

    const size = 64
    const chunk_size = 3
    function get_height(x, y) {
      const zoom = size / chunk_size
      const huge = noise.simplex2(x / zoom / 4 - 10000 + seed, y / zoom / 4 - 10000 + seed)
      const large = noise.simplex2(x / zoom * 2 + 10000 + seed, y / zoom * 2 + 10000 + seed)
      const medium = noise.simplex2(x / zoom * 4 + 20000 + seed, y / zoom * 4 + 20000 + seed)
      const small = noise.simplex2(x / zoom * 10 + 30000 + seed, y / zoom * 10 + 30000 + seed)
      let value = huge * 0.3 + large * 0.5 + medium * 0.15 + small * 0.05
      const radius = get_border_radius(x, y) * size / 2
      const dist = Math.sqrt(x * x + y * y)
      const falloff = 2 - 2 * (dist / radius)
      // value is in [-1, 1], convert to [0, 1] to apply falloff then convert back
      value = ((value + 1) / 2 * falloff) * 2 - 1
      return value
    }

    const N_SLICES = 30
    const rotate_dir = 1 // rand.i(2) ? 1 : -1
    let rotate_length = Math.PI / 2
    let rotate_start = 0

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
    
    range(N_SLICES).map(i => {
      const SLICE_SIZE = 7
      const SLICE_HALF = SLICE_SIZE / 2
      // const color = new T.Color(`hsl(${((start + color_dir * i * 45 / (N_SLICES - 1)) + 360) % 360}, 100%, 50%)`)
      const color = gradient[i]
      {
        const geometry = new T.PlaneGeometry(SLICE_SIZE, SLICE_SIZE)
        // lay geometry flat on xz plane
        geometry.rotateX(Math.PI / 2)

        const shape_alphamap = (() => {
          const canvas = document.createElement('canvas')
          const SZ = 256
          canvas.width = canvas.height = SZ
          const ctx = canvas.getContext('2d')
          // create height shapes by taking all over height threshold
          for (let x = 0; x < SZ; x++) {
            for (let y = 0; y < SZ; y++) {
              const height = get_height(x*size/SZ - size/2, y*size/SZ - size/2) + 1 - 1 * (i / (N_SLICES - 1))
              ctx.fillStyle = height > 0 ? 'white' : 'black'
              ctx.fillRect(x, y, 1, 1)
            }
          }
          return new T.CanvasTexture(canvas)
        })()

        const material = new T.MeshBasicMaterial({
          color, side: T.DoubleSide, transparent: true, opacity: .5,
          alphaMap: shape_alphamap,
         })
        const slice = new T.Mesh(geometry, material)
        slice.position.y = (i - N_SLICES / 2) / (N_SLICES - 1) * SLICE_SIZE * 1.5
        // slice.rotation.y = rotate_start + rotate_dir * rotate_length * (i / (N_SLICES - 1))
        scene.add(slice)
        cleanups.push(() => scene.remove(slice))
      }
    })

    function loop() {
      handle_animate = requestAnimationFrame(loop)
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
    { 'random shape': () => {
      set_seed(rand.i(1_000_000_000))
      reroll()
    } },
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