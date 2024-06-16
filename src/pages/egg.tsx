import React, { useEffect, useState } from 'react';
import * as paper from 'paper'
import { useAnimate, useE, useEventListener, useTimeout } from '../lib/hooks';

import styled from 'styled-components';
import { array } from '../lib/util';
import { noise } from '../lib/noise';
import { usePageSettings } from 'src/lib/hooks_ext';
const ppr = paper
const P = paper.Point
const C = paper.Color
const S = paper.Shape

const SIZE = 512
let canvas: HTMLCanvasElement, canvasScale
let ring: paper.Path[]
let fill: paper.Path

const width = .5
const dist = 1
const points = SIZE/width/Math.pow(2, dist) //16;

function init() {
    canvas = document.getElementById('canvas') as HTMLCanvasElement

    // Create an empty project and a view for the canvas:
    paper.setup(canvas)
    resize()

    const center = new P(SIZE/2, SIZE/2)
    fill = new paper.Path({ fillColor: '#ffe', strokeColor: '#fff1' })
    ring = array(points, i => {
        const radians = (i / points) * Math.PI * 2
        const pX = Math.cos(radians)
        const pY = Math.sin(radians)
        const p = new P(pX, pY)
        const border = SIZE * .4
        const outer = p.multiply(border).add(center)
        const inner = p.multiply(border/4).add(center)
        const path = new paper.Path({
            // strokeColor: dim
            //     ? `hsl(${360 * i / points}deg, 80%, 80%)`
            //     : {
            //         gradient: {
            //             stops: array(Math.min(points, 32), j => `hsl(${360 * j / points}deg, 80%, 80%)`)
            //         },
            //         origin: [0, 0],
            //         destination: [SIZE, 0],
            //     },
            strokeColor: {
                gradient: {
                    // stops: ['#fff0', `hsl(${360 * i / points}deg, 90%, 60%)`]
                    stops: ['#fff0', `hsl(${360 * (.12 + .02*Math.cos(i/points * 2*Math.PI + Math.PI/4))}deg, 90%, 60%)`]
                },
                origin: [inner.x, inner.y],
                destination: [outer.x, outer.y],
            },
            // strokeColor: `hsl(${360 * i / points}deg, 80%, 80%)`,
            strokeWidth: width*8,
            strokeCap: 'round',
            strokeJoin: 'round',
        });

        const start = new P(0, 0)
        for (let i = 0; i < 2; i++) path.add(start);
        fill.add(start)
        return path
    })

    avoid([new P(SIZE*2/3, SIZE/3)])
}

let last
let iteration = 0
function avoid(targets?: paper.Point[]) {
    iteration++
    targets = targets || last
    last = targets
    const center = new P(SIZE/2, SIZE/2)
    const target = targets ? targets[targets.length - 1] : center
    ring?.forEach((path, i) => {

        const radians = (i / points) * Math.PI * 2
        const pX = Math.cos(radians)
        const pY = Math.sin(radians)
        const p = new P(pX, pY)
        const border = SIZE * .4
        const outer = p.multiply(-border).add(center)
        const d = 1 - Math.min(.95, target.getDistance(outer) / SIZE)
        const coeff = .95*Math.pow(d, 3)//1/(1+Math.pow(Math.E, -d))//
        // const coeff = 1/(1+Math.exp(-d))
        const S = path.segments.length - 1

        const lerp = (a, b, p) => a * (1 - p) + b * p
        const perlin3 = (x, y, z) => {
            // x += r_i * 1e5 + c_i * 2e5
            // y += r_i * 1e5 + c_i * 2e5
            const zoom = 500;
            const huge = noise.perlin3(x/zoom/4 - 1e5, y/zoom/4 - 1e5, z - 1e5);
            const large = noise.perlin3(x/zoom*2 + 1e5, y/zoom*2 + 1e5, z + 1e5);
            const medium = noise.perlin3(x/zoom*4 + 2e5, y/zoom*4 + 2e5, z + 2e5)
            const small = noise.perlin3(x/zoom*10 + 3e5, y/zoom*10 + 3e5, z + 3e5);
            const value = Math.pow(huge*0.3 + large*0.5 + medium*0.15 + small*0.05, 3);
            // return value
            let height
            if (value > 0) {
                height = lerp(0, 1, Math.sqrt(value));
            } else {
                height = lerp(0, -1, Math.sqrt(-value));
            }
            return height;
        }
        const height = border * (.9 + .2*perlin3(outer.x, outer.y, iteration/67))

        // path.strokeWidth = (1.15 - coeff) * 4 * width * 2
        path.segments.forEach((segment, s) => {
            segment.point = p
                .multiply(height - (border + (height-border)) * s/S * coeff + SIZE*.08 * (1-s/S) * d)
                .add(center)
        })
        fill.segments[i].point = path.segments[0].point
    })
    paper.view.update();
}

function onMouseMove(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const mouse = new P(e.clientX - rect.left, e.clientY - rect.top).divide(canvasScale)
    avoid([mouse])
}
function onTouchMove(e: TouchEvent): boolean {
    const rect = canvas.getBoundingClientRect();
    const touches = Array.from(e.touches).map((t: Touch) =>
        new P(t.clientX - rect.left, t.clientY - rect.top).divide(canvasScale))
    if (touches.length > 0) avoid(touches)
    return Array.from(e.touches).some((t: Touch) =>
        t.clientX > rect.left && t.clientY > rect.top
        && t.clientX < rect.right && t.clientY < rect.bottom)
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

    avoid()
}

export default () => {
    usePageSettings({
        background: '#000', text_color: '#fff',
    })
    useE(init)
    useE(() => {
        const before = document.body.style.userSelect
        document.body.style.userSelect = 'none'
        return () => {
            document.body.style.userSelect = before
        }
    })
    useEventListener(window, 'resize', resize, false)

    const [hint, setHint] = useState(true)
    const move = e => {
        setHint(false)
    }
    useEventListener(window, 'mousemove mousedown', onMouseMove, false)
    useEventListener(window, 'touchmove touchstart touchend touchcancel', e => {
        if (onTouchMove(e)) setHint(false)
    }, false)

    useAnimate(() => avoid(last))

    return <Style>
        <div className={`hint hint-${hint}`}>(touch the egg)</div>
        <canvas id="canvas"
            height={SIZE} width={SIZE}
            onPointerMove={move}
            onPointerDown={move}/>
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
    background: black;
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