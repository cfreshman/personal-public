import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAnimate, useEventListener, useR } from '../lib/hooks';

import { useSocket } from '../lib/socket';

// svg version - clean circles, 2nd best perf

const tau = 2 * Math.PI
const baseRadius = 5
const UNSCALE = 2;
const REUNSCALE = 3

class Dot {
  hsl
  constructor(pos, hue, scale) {
    let r = (n) => Math.random() * n - (n/2)
    this.pos = [pos[0] + r(10), pos[1] + r(10)]
    this.hue = hue + r(.1)
    this.l = .2
    this.scale = scale + r(.1) + .05
  }
  update() {
    this.scale += .015
    this.hue = (this.hue + .005) % 1
    this.l += .002

    return this.scale < .1 || this.l > 1;
  }
  draw(el) {
    el = el || document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    el.setAttributeNS(null, 'cx', scale * this.pos[0])
    el.setAttributeNS(null, 'cy', scale * -this.pos[1])
    el.setAttributeNS(null, 'r', scale * this.scale * baseRadius)
    // el.setAttributeNS(null, 'style', `fill: hsl(${this.hue * 360}, ${(.9 + .2*this.l) * 100}%, ${this.l * 100}%);`)
    el.setAttributeNS(null, 'style', `fill: hsl(${this.hue * 360}, 0%, ${this.l * 100}%);`)
    return el
  }
}

let canvas, ctx, scale
function init() {
  canvas = document.querySelector('#canvas')
  // ctx = canvas.getContext('2d')
  resize()
}
function resize() {
  let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
  let aspect = bounds.width / bounds.height;
  let width, height
  if (aspect < 1) {
    width = 150;
    height = width / aspect
  } else {
    height = 150;
    width = height * aspect;
  }

  // canvas.width = width;
  // canvas.height = height;
  canvas.setAttribute('viewBox', `${-width/2} ${-height/2} ${width} ${height}`)
  scale = UNSCALE * width / bounds.width
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
    doEmit && socket?.emit('speckle:dot', dotArgs)
    dot_timer = 7000
    dot_timer = 100
  }
  dotsToAdd.forEach(args => dots.push(new Dot(...args)))
  dotsToAdd = []

  let circles = document.querySelectorAll('#canvas circle')
  circles.forEach((el, i) => {
    if (i < dots.length) {
      dots[i].draw(el)
    } else {
      canvas.removeChild(el)
    }
  })
  if (dots.length > circles.length) {
    dots.slice(circles.length).forEach(dot => canvas.appendChild(dot.draw()))
  }
  // canvas.innerHtml = dots.map(dot => dot.draw())
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
    <div id="canvasContainer" style={{ height: '100%', width: '100%', background: 'white' }}>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
        id="canvas" ref={canvasRef}
        onPointerMove={e => handleMove(e.clientX, e.clientY)}
        onTouchMove={e => handleMove(
          e.touches[0].clientX, e.touches[0].clientY)}
        onMouseLeave={handleClear}
        onPointerLeave={handleClear}>
      </svg>
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
    user-select: none;
    a {
      pointer-events: all;
      color: black;
      &:hover { text-decoration: underline; }
    }
  }
  #canvas {
    width: 100%;
    height: 100%;
    user-select: none;
  }
`