import * as paper from 'paper'
import React from 'react'
import { useAnimate, useE, useEventListener, useF } from '../lib/hooks'

import styled from 'styled-components'
import { array, randf, randi, rands } from '../lib/util'
const P = paper.Point

const SIZE = 512
let canvas: HTMLCanvasElement, canvasScale
let balls: Ball[]

class Ball {
  scoopRadius: number
  center: number
  pos: paper.Point
  vel: paper.Point
  ballRadius: number
  color: paper.Color
  startHeight: number
  startOffset: number
  geometry: paper.Item
  flash: paper.Path
  toLeft: boolean
  dropped: boolean
  scoop: paper.Path

  constructor(radius: number, height: number, start: number, color: string) {
    this.scoopRadius = radius
    this.ballRadius = this.scoopRadius / 4
    this.toLeft = !!randi(2)
    this.center = start + (this.toLeft ? 1 : -1) * (this.scoopRadius - this.ballRadius)
    this.startHeight = height // this.scoopRadius + (SIZE * .8 - this.scoopRadius)
    this.color = new paper.Color(color)
    this.pos = new P(start, this.startHeight)
    this.vel = new P(0, 0)
    this.dropped = false

    this.geometry = new paper.Path.Circle({
        center: [0, 0],
        radius: this.ballRadius,
        fillColor: this.color,
        // strokeColor: '#0001',
        // strokeWidth: 2,
        opacity: .9,
    })
    // this.geometry = new paper.Group({
    //     position: new P(this.pos.x, SIZE - this.pos.y),
    //     children: [
    //         new paper.Path.Circle({
    //             center: [0, 0],
    //             radius: this.ballRadius,
    //             fillColor: this.color,
    //             strokeColor: '#fff2',
    //             strokeWidth: 2,
    //         }),
    //         // new paper.Path.Circle({
    //         //     center: [0, -this.ballRadius/8],
    //         //     radius: this.ballRadius * .9,
    //         //     fillColor: '#fff1',
    //         //     // fillColor: (c => { c = c.clone(); c.lightness *= 1.1; return c })(this.color),
    //         // }),
    //     ],
    // })

    this.scoop = new paper.Path.Arc({
        from: [this.center + this.scoopRadius, SIZE - this.scoopRadius - 1],
        through: [this.center, SIZE - 1],
        to: [this.center - this.scoopRadius, SIZE - this.scoopRadius - 1],
        // strokeColor: this.color,
        strokeColor: {
            gradient: {
                stops: [
                    (c => { c = c.clone(); c.alpha = .5; return c })(this.color),
                    this.color,
                ]
            },
            origin: [this.center, SIZE - this.scoopRadius],
            destination: [this.center, SIZE],
        },
        strokeWidth: 1,
        opacity: .5,
    })
    this.scoop.visible = false
  }

  public update(dt) {
    // this.pos = this.pos.add(this.vel.multiply(dt))
    const accel = new P(0, -9.8 * 10)
    if (this.pos.y < this.scoopRadius) {
        this.scoop.visible = true
        // this.pos.x = this.center + (this.scoopRadius - this.ballRadius) * (this.toLeft ? -1 : 1) * Math.acos(this.pos.y / (this.scoopRadius - this.ballRadius))
        // this.pos.x = this.center + (this.scoopRadius - this.ballRadius) * (this.toLeft ? -1 : 1) * (this.pos.y / (this.scoopRadius - this.ballRadius))

        const focus = new P(this.center, this.scoopRadius)
        const offset = this.pos
            .subtract(focus)
            // .multiply(1 - (this.ballRadius / this.scoopRadius))
        offset.length = this.scoopRadius - this.ballRadius
        const diff = this.pos.subtract(focus).subtract(offset)
        this.pos = focus
            .add(offset)
            .add(diff.rotate(90 * (this.toLeft ? 1 : -1), new P(0, 0)))
        const slope = offset.angle + 90 + (this.toLeft ? 0 : 180)

        // const slope = Math.sin((Math.PI/2) * ((this.pos.y - this.ballRadius) / (this.scoopRadius - this.ballRadius)))

        // this.pos.x = this.center + (this.scoopRadius - this.ballRadius) * (this.toLeft ? -1 : 1) * Math.sin((Math.PI/2) * ((this.pos.y - this.ballRadius) / (this.scoopRadius - this.ballRadius)))

        // const focus = new P(this.center, this.scoopRadius)
        // const offset = this.pos
        //     .subtract(focus)
        //     // .multiply(1 - (this.ballRadius / this.scoopRadius))
        // offset.length = this.scoopRadius - this.ballRadius
        // this.pos = focus.add(offset)

        // const offset = new P((this.scoopRadius - this.ballRadius) * (this.toLeft ? -1 : 1), 0).rotate(Math.sin((Math.PI/2) * ((this.pos.y - this.ballRadius) / (this.scoopRadius - this.ballRadius))), new P(0, 0))
        // this.pos = new P(this.center, this.scoopRadius).add(offset)
        this.vel = this.vel.add(accel.multiply(dt))
        // this.vel.angle = (Math.PI/2) * (this.pos.y / (this.scoopRadius - this.ballRadius))
        if (this.pos.y < this.ballRadius) {
            // this.vel = this.vel.multiply(-.95).subtract(Math.min(this.vel.length, 1))
            // this.vel = this.vel.multiply(-1)
            this.pos.y = this.ballRadius
            // this.toLeft = !this.toLeft
        } else {
            const toMax = this.startHeight - this.pos.y
            if (toMax > 0) {
                const length = Math.sqrt(2 * accel.length * toMax)
                this.vel = new P(length, 0).rotate(
                    slope,
                    new P(0, 0))
            }
            // this.vel.rotate(this.vel.angle - slope, new P(0, 0))
        }
        this.dropped = true
    // if (this.pos.y < this.ballRadius) {
    //     this.vel = this.vel.multiply(-1)
        // const offset = this.pos
        //     .subtract(new P(this.center, this.scoopRadius))
        //     .multiply(1 - (this.ballRadius/2 / this.scoopRadius))
        // this.vel = new P(this.vel.length, 0).rotate(-offset.angle, new P(0, 0))
    } else {
        this.scoop.visible = false
        this.vel = this.vel.add(accel.multiply(dt))
        this.vel.x = 0

        const toMax = Math.max(0, this.startHeight - this.pos.y)
        if (this.vel.y > 0) {
            this.vel.y = Math.sqrt(2 * accel.length * toMax)
        }

        // if (this.vel.y > 0 && toMax > Math.pow(this.vel.y, 2)/(2*accel.length)) {
        //     this.vel.y = Math.sqrt(2 * accel.length * toMax)
        // }
    }
    this.pos = this.pos.add(this.vel.multiply(dt))
    this.geometry.position = new P(this.pos.x, SIZE - this.pos.y)
    if (this.flash) {
        this.flash.scale(1 + .018 * dt * 700)
        this.flash.opacity *= 1 - .01 * dt * 700

        if (this.flash.opacity < .01) {
            this.flash.remove()
            this.flash = undefined
        }
    }
    if (this.vel.length < 25) {
        if (this.vel.length < 5 && !this.flash && this.dropped) {
            this.toLeft = this.pos.x < this.center
            // this.toLeft = !this.toLeft
            this.flash = new paper.Path.Circle({
                center: this.geometry.position,
                radius: this.ballRadius*2/3 + 5,
                // radius: this.ballRadius,
                fillColor: '#fff',
                opacity: .2,
            })
            // this.geometry.bringToFront()
            // this.flash = true
            // this.geometry.fillColor = new paper.Color('#fffe')

            this.geometry.fillColor = this.color.clone()
            this.geometry.fillColor.lightness = .85
        }
    } else {
        if (this.flash) {
            // this.flash = false
            // this.geometry.fillColor = this.color
            // // this.geometry.matrix.set(new paper.Matrix().scale(1))
            // this.geometry.scale(1/1.5)
            // this.geometry.radius = this.ballRadius * 2
        }
        if (this.geometry.fillColor !== this.color) {
            this.geometry.fillColor = this.color
            // this.geometry.scale(1/1.5)
        }
    }
    this.geometry.bringToFront()
  }
}

function init() {
    canvas = document.getElementById('canvas') as HTMLCanvasElement

    // Create an empty project and a view for the canvas:
    paper.setup(canvas)
    resize()

    const background = new paper.Path.Rectangle({
        rectangle: paper.view.bounds,
        fillColor: 'black',
    })
    // const ground = new paper.Path.Rectangle({
    //     from: [0, SIZE - 4],
    //     to: [SIZE, SIZE],
    //     fillColor: 'white',
    // })

    // new paper.Path.Rectangle({
    //     from: [SIZE/4, SIZE/4],
    //     to: [SIZE*3/4, SIZE*3/4],
    //     fillColor: 'red',
    // })

    // new paper.Path.Circle({
    //     center: [SIZE/2, SIZE/2],
    //     radius: SIZE/6,
    //     fillColor: 'blue',
    //     strokeColor: 'blue'
    // })
    // paper.project.activeLayer.addChild(circle)

    balls = array(20, i => {
        const basis = i === 0 ? 1 : randf()
        return new Ball(
            Math.pow(basis, 3) * SIZE/3 + 10,
            SIZE/2 + (SIZE/2 * (1 - basis)),
            // SIZE/2,
            randf(SIZE),
            `hsl(${
                // Math.min(243, Math.pow(basis, 3) * 243 + rands(30))
                Math.min(240, 50 + Math.pow(basis, 3) * 190 + rands(30))
            }deg ${
                75 - 25 * Math.pow(basis, 3)
            }% ${
                75 - 25 * Math.pow(basis, 3)
            }%)`)
    })
    // balls.sort((a, b) => b.ballRadius - a.ballRadius)

    paper.view.update()
}
function touch(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const p = new P(e.clientX - rect.left, e.clientY - rect.top).divide(canvasScale)
    p.y = SIZE - p.y

    let basis = randf()
    if (p.y > SIZE/2) {
        basis = 1 - (p.y - SIZE/2) / (SIZE/2)
    }
    balls.push(new Ball(
        Math.pow(basis, 3) * SIZE/3 + 10,
        SIZE/2 + (SIZE/2 * (1 - basis)),
        p.x,
        `hsl(${
            // Math.min(243, Math.pow(basis, 3) * 243 + rands(30))
            Math.min(243, 50 + Math.pow(basis, 3) * 193 + rands(30))
        }deg ${
            75 - 20 * Math.pow(basis, 3)
        }% ${
            75 - 20 * Math.pow(basis, 3)
        }%)`))

    paper.view.update()
}

let last_t = performance.now()
function animate(t) {
    const dt = Math.min(1, (t - last_t)/1000)
    last_t = t

    balls.forEach(ball => ball.update(dt))
    paper.view.update()
}

function resize() {
    const style = window.getComputedStyle(canvas.parentElement);
    const containerWidth = Number(style.width.slice(0, -2));
    const containerHeight = Number(style.height.slice(0, -2));

    canvasScale = Math.min(containerWidth / SIZE, containerHeight / SIZE);
    canvas.style.width = `${canvasScale * SIZE}px`;
    canvas.style.height = `${canvasScale * SIZE}px`;
    canvas.width = SIZE;
    canvas.height = SIZE;

    paper.view.update()
}

export default () => {
    useF(init)
    useE(() => {
        const before = document.body.style.userSelect
        document.body.style.userSelect = 'none'
        return () => {
            document.body.style.userSelect = before
        }
    })
    useEventListener(window, 'resize', resize, false)
    useEventListener(window, 'pointerdown', touch, false)
    useAnimate(animate)

    return <Style>
        <canvas id="canvas"
            height={SIZE} width={SIZE} />
    </Style>
}

const Style = styled.div`
height: 100%;
width: 100%;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
background: #201624; // black
background: white;
background: black;
touch-action: none;
user-select: none;

canvas {
    background: #f2eee3; // white
    // background: black;
}

position: relative;
.hint {
    position: absolute;
    top: 2rem;
    color: white;
    background: black;
    transition: .5s;
    &.hint-false {
        opacity: 0;
        top: 1rem;
    }
}
`