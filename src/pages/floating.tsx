import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useE, useEventListener, useF, useR, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { S } from 'src/lib/util'

import * as T from 'three'
import Delaunator from 'delaunator'

const { named_log, on, range, rand } = window as any
const NAME = 'template'
const log = named_log(NAME)

const SIZE = 10, WIDTH = SIZE, HEIGHT = SIZE

class Point {
  position
  velocity
  constructor(position, velocity) {
    this.position = position;
    this.velocity = velocity;
  }

  update() {
    this.position.add(this.velocity);
    if (this.position.length() > SIZE/2) {
      this.velocity.reflect(this.position.clone().normalize().negate())
    }
  }
}

let scene, camera, renderer, container
const do_resize = () => {
  renderer.setSize(0, 0)
  const rect = container.getBoundingClientRect()
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
  camera.updateProjectionMatrix()
  renderer.setSize(rect.width, rect.height)
}

export default () => {
  const r = useR()
  useE(() => {
    const cleanups = []

    scene = new T.Scene()
    camera = new T.OrthographicCamera(0, 0, 0, 0, 1, 1000)
    camera.position.z = 100
    renderer = new T.WebGLRenderer({ alpha:true, antialias:true })
    container = r.current
    container.appendChild(renderer.domElement)
    do_resize()

    // boundary circle
    scene.add(new T.Mesh(new T.CircleGeometry(SIZE/2, 32), new T.MeshBasicMaterial({ color: 0x000000 })))

    const points = []
    for (var i = 0; i < 32; i++) {
      let x, y
      do {
        x = rand.s(SIZE)
        y = rand.s(SIZE)
      } while (x*x + y*y > Math.pow(SIZE/2, 2))
      points.push(new Point(new T.Vector3(x, y, 0), new T.Vector3(rand.s(SIZE/1000), rand.s(SIZE/1000), 0)))
    }
    
    const construct_delaunay_geometry = (points) => {
      const delaunay = Delaunator.from(points, p => p.position.x, p => p.position.y)
      const geometry = new T.BufferGeometry()
      const vertices = []
      for (let i = 0; i < delaunay.triangles.length; i++) {
        vertices.push(points[delaunay.triangles[i]].position.x, points[delaunay.triangles[i]].position.y, 0)
      }
      geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
      const indices = []
      for (let i = 0; i < vertices.length/3; i++) {
        indices.push(i)
      }
      geometry.setIndex(indices)
      return geometry
    }

    const mesh = new T.Mesh(construct_delaunay_geometry(points), new T.MeshBasicMaterial({ color: 0xffffff, wireframe: true }))
    scene.add(mesh)

    function loop() {
      handle_animate = requestAnimationFrame(loop)

      points.forEach(p => p.update())
      mesh.geometry.dispose()
      mesh.geometry = construct_delaunay_geometry(points)

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
      <div ref={r} className='w100 h100' />
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