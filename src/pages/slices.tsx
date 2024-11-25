import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useE, useEventListener, useF, useR, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import * as T from 'three'
import { S } from 'src/lib/util'

const { named_log, on, range, rand } = window as any
const NAME = 'template'
const log = named_log(NAME)

const SIZE = 10, WIDTH = SIZE, HEIGHT = SIZE * 1.5
const ORTHO = true

let scene, camera, renderer, container
const do_resize = () => {
  const outer = container.parentElement.getBoundingClientRect()
  const container_aspect = WIDTH / HEIGHT
  const width = Math.min(outer.width, outer.height * container_aspect)
  container.style.width = `${width}px`
  container.style.height = `${width / container_aspect}px`

  renderer.setSize(0, 0)
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
  const r = useR()
  useE(() => {
    const cleanups = []

    scene = new T.Scene()
    if (ORTHO) {
      camera = new T.OrthographicCamera(0, 0, 0, 0, 1, 1000)
      camera.position.x = camera.position.z = SIZE
      camera.position.y = SIZE
      camera.lookAt(0, 0, 0)
    } else {
      camera = new T.PerspectiveCamera(5, 1, 0.1, SIZE * 100)
      camera.position.x = camera.position.z = SIZE * 10
      camera.position.y = SIZE * 50
      camera.lookAt(0, 0, 0)
    }
    renderer = new T.WebGLRenderer({ alpha:true })
    container = r.current
    container.appendChild(renderer.domElement)
    do_resize()

    const N_SLICES = 20
    const start = rand.f(360)
    const color_dir = rand.i(2) ? 1 : -1
    const rotate_dir = 1 // rand.i(2) ? 1 : -1
    const borders = 0 // 1 // rand.i(2) ? 1 : 0
    log('vars', { start, color_dir, rotate_dir, borders })
    range(N_SLICES).map(i => {
      const SLICE_SIZE = 7
      const SLICE_HALF = SLICE_SIZE / 2
      const color = new T.Color(`hsl(${((start + color_dir * i * 45 / (N_SLICES - 1)) + 360) % 360}, 100%, 50%)`)
      {
        const geometry = new T.PlaneGeometry(SLICE_SIZE, SLICE_SIZE)
        // lay geometry flat on xz plane
        geometry.rotateX(Math.PI / 2)
        const material = new T.MeshBasicMaterial({ color, side: T.DoubleSide, transparent: true, opacity: borders ? .33 : .33 })
        const slice = new T.Mesh(geometry, material)
        slice.position.y = (i - N_SLICES / 2) / (N_SLICES - 1) * SLICE_SIZE * 1.5
        slice.rotation.y = rotate_dir * Math.PI / 2 * (i / (N_SLICES - 1))
        scene.add(slice)
      }
      if (borders) {
        const points = [];
        points.push(new T.Vector3(-SLICE_HALF, 0, -SLICE_HALF))
        points.push(new T.Vector3(SLICE_HALF, 0, -SLICE_HALF))
        points.push(new T.Vector3(SLICE_HALF, 0, SLICE_HALF))
        points.push(new T.Vector3(-SLICE_HALF, 0, SLICE_HALF))
        points.push(new T.Vector3(-SLICE_HALF, 0, -SLICE_HALF))
        const geometry = new T.BufferGeometry().setFromPoints( points )
        const material = new T.LineBasicMaterial({
          color,
          linewidth: 1,
          linecap:'round',
          linejoin: 'round',
        })
        const border = new T.Line(geometry, material)
        border.position.y = (i - N_SLICES / 2) / (N_SLICES - 1) * SLICE_SIZE * 1.5
        border.rotation.y = rotate_dir * Math.PI / 2 * (i / (N_SLICES - 1))
        scene.add(border)
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

  usePageSettings({
    background: '#fff',
    expand: true,
  })
  return <Style>
    <InfoBody style={S(`padding: 0; overflow: hidden`)}>
      <div className='w100 h100 center'>
        <div ref={r} />
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