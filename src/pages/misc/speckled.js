import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import * as THREE from 'three';
import { useAnimate, useEventListener, useR } from '../../lib/hooks';

import { useSocket } from '../../lib/socket';
const V3 = THREE.Vector3;

// three.js version - worst perf

let SCALE = 256;
let WIDTH = SCALE,
  HEIGHT = SCALE,
  frustumSize = SCALE;
let camera, scene, renderer;

class Dot {
  constructor(pos, hue, scale) {
    let r = (n) => Math.random() * n - (n/2)
    this.pos = [pos[0] + r(10), pos[1] + r(10)]
    this.hue = hue + r(.1)
    this.l = .5
    this.scale = scale + r(.1) + .05

    this.mesh = new THREE.Mesh(
      new THREE.CircleGeometry(5 * this.scale, 16)
        .translate(...this.pos, 0),
      new THREE.MeshBasicMaterial({
        color: `white`
      })
    )
    this.mesh.material.color.setHSL(this.hue, .9, this.l)
    scene.add(this.mesh)
  }
  update() {
    this.scale += .015
    // this.scale += .2
    // this.scale *= 1.05;
    // this.l = this.l + .5*(1 - 1/Math.max(1, this.scale))/100;
    // if (this.scale < 1.01) {
    //   this.scale += .015
    // } else {
    //   this.scale *= 1.05;
    // }
    this.hue = (this.hue + .005) % 1
    this.l += .002
    this.mesh.geometry.dispose()
    this.mesh.geometry = new THREE.CircleGeometry(5 * this.scale, 16)
      .translate(...this.pos, 0)
    this.mesh.material.color.setHSL(this.hue, (.9 + .2*this.l), this.l)

    return this.scale < .1 || this.l > 1;
  }
  clear() {
    scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}

function init() {
  renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#canvas'),
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
  renderer.setSize(bounds.width, bounds.height);

  camera = new THREE.OrthographicCamera(-WIDTH/2, WIDTH/2, HEIGHT/2, -HEIGHT/2, 1, 1000)
  camera.position.z = 500
  scene = new THREE.Scene();

  onWindowResize();

  return () => {
    renderer.dispose();
    scene.dispose();
    camera = null;
    scene = null;
    renderer = null;
  }
}

let p = [undefined];
let t = 0
let dot_timer = 0
let dots = []
let socket
let dotsToAdd = []

let prev_t
function animate(timestamp) {
  if (!prev_t) {
    prev_t = timestamp
    return
  }
  const dt = timestamp - prev_t
  prev_t = timestamp

  dots = dots.filter(d => {
    if (d.update()) {
      d.clear()
      return false
    }
    return true
  })

  t += dt
  dot_timer -= dt

  let doDot = dot_timer < 0
  if (dots.length) {
    let p2 = dots.slice(-1)[0].pos
    let dist = Math.sqrt(
      Math.pow(p2[0] - p[0], 2) +
      Math.pow(p2[1] - p[1], 2))
    if (dist > 5) {
      doDot = true
    }
  } else {
    doDot = true;
  }
  if (p[0] !== undefined && doDot) {
    let dotArgs = [p.slice(), (Date.now() / 10000)%1, .1]
    dots.push(new Dot(...dotArgs))
    socket && socket.emit('speckle:dot', dotArgs)
    dot_timer = 7000
    dot_timer = 100
  }
  dotsToAdd.forEach(args => dots.push(new Dot(...args)))
  dotsToAdd = []

  renderer.render(scene, camera);
}

function onWindowResize() {
  let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
  // camera.aspect = bounds.width / bounds.height;
  let aspect = bounds.width / bounds.height;
  if (aspect < 1) {
    camera.left   = - frustumSize / 2;
    camera.right  =   frustumSize / 2;
    camera.top    =   frustumSize / aspect / 2;
    camera.bottom = - frustumSize / aspect / 2;
  } else {
    camera.left   = - aspect * frustumSize / 2;
    camera.right  =   aspect * frustumSize / 2;
    camera.top    =   frustumSize / 2;
    camera.bottom = - frustumSize / 2;
  }
  camera.updateProjectionMatrix();
  renderer.setSize(bounds.width, bounds.height);
}

export default () => {
  const canvasRef = useR()
  useEffect(() => init(), []);
  useAnimate(animate);
  useEventListener(window, 'resize', onWindowResize, false);
  const [online, setOnline] = useState([])

  socket = useSocket({
    room: 'speckle',
    on: {
      "speckle:dot": data => {
        dotsToAdd.push(data)
      },
      "speckle:online": data => {
        setOnline(data)
      },
    },
  })

  const handleMove = (x, y) => {
    let rect = canvasRef.current.getBoundingClientRect();
    let mid = [
      rect.width / 2 + rect.left,
      rect.height / 2 + rect.top
    ];
    let pX = x - mid[0]
    let pY = y - mid[1]

    var vec = new THREE.Vector3(); // create once and reuse
    var pos = new THREE.Vector3(); // create once and reuse
    // vec.set(
    //     ( x / window.innerWidth ) * 2 - 1,
    //     - ( y / window.innerHeight ) * 2 + 1,
    //     0.5 );
    vec.set(
      ( (x - rect.left) / rect.width ) * 2 - 1,
      - ( (y - rect.top) / rect.height ) * 2 + 1,
      0.5 );
    vec.unproject( camera );
    vec.sub( camera.position ).normalize();
    var distance = - camera.position.z / vec.z;
    pos.copy( camera.position ).add( vec.multiplyScalar( distance ) );

    p[0] = 1.5 * pos.x
    p[1] = 1.5 * pos.y
  }
  const handleClear = () => {
    p[0] = undefined
    p[1] = undefined
  }

  return <Style>
    {online.length < 2 ? '' :
    <div id="online">
      <div>online:</div>
      {online.map((user, i) => <Link key={i} to={`/u/${user}`}>{user}</Link>)}
    </div>}
    <div id="canvasContainer"
      style={{ height: '100%', width: '100%', background: 'white' }}>
      <canvas id="canvas" ref={canvasRef}
        onPointerMove={e => handleMove(e.clientX, e.clientY)}
        onTouchMove={e => handleMove(
          e.touches[0].clientX, e.touches[0].clientY)}
        onPointerOut={handleClear}
        onTouchEnd={handleClear}/>
    </div>
  </Style>
}

const Style = styled.div`
  height: 100%;
  width: 100%;
  position: relative;

  #online {
    position: absolute;
    left: .5rem;
    top: .3rem;
    display: flex;
    flex-direction: column;
    color: black;
    pointer-events: none;
    a {
      pointer-events: all;
      color: black;
      &:hover { text-decoration: underline; }
    }
  }
`