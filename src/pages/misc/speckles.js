import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAnimate, useEventListener, useR } from '../../lib/hooks';

import { useSocket } from '../../lib/socket';

// canvas version - best perf, fuzzy circles

const tau = 2 * Math.PI
const baseRadius = 5
const UNSCALE = 2;

class Dot {
  hsl
  constructor(pos, hue, scale) {
    let r = (n) => Math.random() * n - (n/2)
    this.pos = [pos[0] + r(10), pos[1] + r(10)]
    this.hue = hue + r(.1)
    this.l = .5
    this.scale = scale + r(.1) + .05
  }
  update() {
    this.scale += .015
    this.hue = (this.hue + .005) % 1
    this.l += .002

    return this.scale < .1 || this.l > 1;
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.fillStyle = `hsl(${this.hue * 360}, ${(.9 + .2*this.l) * 100}%, ${this.l * 100}%)`
    ctx.arc(this.pos[0], this.pos[1], this.scale * baseRadius, 0, tau);
    ctx.fill();
  }
}

let canvas, ctx, scale
function init() {
  canvas = document.querySelector('canvas')
  ctx = canvas.getContext('2d')
  resize()
}
function resize() {
  let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
  let aspect = bounds.width / bounds.height;
  let width, height
  if (aspect < 1) {
    width = 1024;
    height = width / aspect
  } else {
    height = 1024;
    width = height * aspect;
  }

  canvas.width = width;
  canvas.height = height;
  scale = UNSCALE * canvas.width / bounds.width
}

let p = [undefined];
let t = 0
let dot_timer = 0
let dots = []
let socket, doEmit = false
let dotsToAdd = []

let prev_t
function animate(timestamp) {
  if (!prev_t) {
    prev_t = timestamp
    return
  }
  const dt = timestamp - prev_t
  prev_t = timestamp

  dots = dots.filter(d => !d.update())

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
    doEmit && socket && socket.emit('speckle:dot', dotArgs)
    dot_timer = 7000
    dot_timer = 100
  }
  dotsToAdd.forEach(args => dots.push(new Dot(...args)))
  dotsToAdd = []

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.translate(canvas.width/2, canvas.height/2)
  ctx.scale(scale, -scale)
  dots.forEach(dot => {
    dot.draw(ctx)
  })
  ctx.scale(1/scale, -1/scale)
  ctx.translate(-canvas.width/2, -canvas.height/2)
}

export default () => {
  const canvasRef = useR()
  useEffect(() => init(), []);
  useAnimate(animate);
  useEventListener(window, 'resize', resize, false);
  const [online, setOnline] = useState([])

  socket = useSocket({
    room: 'speckle',
    on: {
      "speckle:dot": data => {
        dotsToAdd.push(data)
      },
      "speckle:online": data => {
        setOnline(data)
        doEmit = data.length > 1
      },
    }
  })

  const handleMove = (x, y) => {
    let rect = canvasRef.current.getBoundingClientRect();
    let mid = [
      rect.width / 2 + rect.left,
      rect.height / 2 + rect.top
    ];
    let pX = x - mid[0]
    let pY = y - mid[1]

    p[0] = pX / UNSCALE;
    p[1] = -pY / UNSCALE;
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
  canvas {
    width: 100%;
    height: 100%;
  }
`