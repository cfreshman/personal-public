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

let rings: paper.Path[][][]
const grid = 1
const levels = 32
const extra = 1 + 2
const width = 4
const points = 180/grid //16;

function init() {
    canvas = document.getElementById('canvas') as HTMLCanvasElement

    paper.setup(canvas)
    resize()

    rings = array(grid, r => array(grid, c =>
        array(levels + extra, i => ringInst(i))))

    ring(0)
}
function ringInst(i) {
    const path = new paper.Path({
        // strokeColor: `hsla(${360 - 360 * i / (levels - 1)}deg, 80%, 80%)`,
        strokeColor: new C({
            hue: 360 - 360 * i / (levels-1),
            saturation: .8,
            lightness: .8,
            alpha: Math.sqrt((i+1) / levels),
        }),
        strokeWidth: width,
        strokeCap: 'round',
        strokeJoin: 'round',
    });

    for (let p = 0; p < points; p++)
        path.add(ppr.view.center);

    return path
}
let iteration = 0, previous = 0
let pointer: paper.Point | false
let down = false
let out = 0, out_i = extra
function ring(timestamp) {
    const dt = timestamp - previous
    if (down || out) {
        out_i += dt/200
        if (out_i >= extra) {
            if (out > 0) out -= 1
            out_i -= 1
        }
        // iteration += dt/16
        iteration += dt/4
    } else {
        iteration += dt/16
    }
    previous = performance.now()
    rings.map((r, r_i) => r.map((c, c_i) => c.map((path, i) => {
        // i  = (i + out_i * levels) + levels
        // levels * 2
        // i  = i + easeOutSine(out_i) * levels - levels
        // if (i > levels) i -= levels*2
        // const o_i = (easeOutSine(out_i) * levels) % 1
        i = i - extra + out_i
        const e_i = (i - levels + 1)/extra
        const iL = levels - 1
        i = iL * Math.sqrt(i/iL)
        path.strokeColor = new C({
            hue: 360 + 360 * ((i/2 + iteration/50)%levels) / (levels-1),
            saturation: .33 + .67 * (1 - i/iL),
            lightness: i > iL
                ? .7 + .3 * e_i
                : .7 + .1*(levels-i)/levels,
            alpha: Math.pow(i > iL
                ? 1 - easeOutSine(e_i)
                : (i+1) / levels, 2),
        })
        const c = new P(r_i * SIZE/grid + SIZE/grid/2, c_i * SIZE/grid + SIZE/grid/2)
        const center = pointer
            // ? pointer.subtract(c).multiply(i/length).add(c)
            // ? pointer.subtract(c).multiply(1 - Math.sqrt(i/levels)).add(c)
            // ? pointer.subtract(c).multiply(1 - Math.sqrt(i/levels/2+.5)).add(c)
            // ? c.subtract(pointer).multiply(1 - Math.sqrt(i/levels*.4+.6)).add(c)
            // ? c.subtract(pointer).multiply(1 - Math.sqrt(i/levels)).add(c)
            // ? c.subtract(pointer).multiply(1 - Math.sqrt(i/levels*.8+.2)).add(c)
            ? c.subtract(pointer).multiply(i > iL
                ? 1 - Math.sqrt(iL/levels*.8+.2)
                : 1 - Math.sqrt(i/levels*.8+.2)
                ).add(c)
            : c
        const dist = c.subtract(center).length
        // const diff = new P(SIZE/grid/2 * (i/levels*.2 + .8), 0)
        // const diff = new P(SIZE/grid/2 * (i/levels*.2 + .8), 0).multiply(Math.pow((dist - SIZE/grid/2)/(SIZE/grid/2), 2))
        // const scale = i > levels-1
        //     ? 1 + Math.pow(o_i, 2)
        //     : i/levels
        const scale = i/levels
        const originalDiff = new P(SIZE/grid/2 * (scale*.2 + .8), 0)
        // const diff = i > iL
        //     ? originalDiff.multiply(i / iL)
        //     : originalDiff
        const diff = originalDiff
            .multiply(Math.pow((dist - SIZE/grid/2)/(SIZE/grid/2), 2))

        // const diff = new P(SIZE/grid/2 * (i/levels*.2 + .8), 0).multiply(pointer ? i/levels/2+.5 : 1)
        // const diff = new P(SIZE/grid/2 * (i/levels*.2 + .8), 0).multiply(pointer ? 1 - Math.sqrt(i/levels)/2+.5 : 1)
        const z0 = new P(0, 0)
        for (let p = 0; p < points; p++) {
            const off = diff.rotate(360 * p/(points-1), z0)
            const lerp = (a, b, p) => a * (1 - p) + b * p
            const perlin3 = (x, y, z) => {
                // x += r_i * 1e5 + c_i * 2e5
                // y += r_i * 1e5 + c_i * 2e5
                const zoom = (levels-i/2)*50;
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
                // if (value > 0) {
                //     height = lerp(seaLevel, maxHeight, Math.sqrt(value));
                // } else {
                //     height = lerp(seaLevel, minHeight, Math.sqrt(-value));
                // }
                return height;
            }
            // const height = noise.perlin3(
            //     1e4 + off.x / (levels-i/2)/25,
            //     1e4 + off.y / (levels-i/2)/25,
            //     1e4 + iteration/10)
            // path.segments[p].point = center.add(off.multiply((height+levels-1)/levels));
            const height = perlin3(off.x, off.y, iteration/67)
            path.segments[p].point = center.add(off.multiply(height/3 + .67 + (i > iL
                ? e_i / levels
                : 0)));
            // path.segments[p].point = center
            //     .add(off)
            //     .add(originalDiff.rotate(off.angle, z0).subtract(off).multiply(height/3 + .67));
            // path.segments[p].point = center.add(off).add(
            //     off.normalize().multiply(height/3 + .67).multiply(SIZE/grid/4))
        }
    })))
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
}

let touches = false
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
    useAnimate(ring)

    const [hint, setHint] = useState(true)
    const move = e => {
        const rect = canvas.getBoundingClientRect();
        pointer = new P(e.clientX - rect.left, e.clientY - rect.top).divide(canvasScale)
        setHint(false)
    }
    const touch = (e : TouchEvent) => {
        const rect = canvas.getBoundingClientRect();
        let one: paper.Point
        Array.from(e.touches).map((t: Touch) => {
            const T = new P(t.clientX - rect.left, t.clientY - rect.top).divide(canvasScale)
            if (!one) one = new P(0, 0)
            one = one.add(T)
        })
        if (one) pointer = one.divide(e.touches.length)
        setHint(false)
    }
    // useEventListener(window, 'pointerdown', () => { out = 1 }, false)
    // useEventListener(window, 'pointermove pointerdown', move, false)
    useEventListener(window, 'mousedown mousemove', move)
    useEventListener(window, 'touchstart touchmove touchend touchcancel', touch)

    useEventListener(window, 'mousedown', () => { down = true })
    useEventListener(window, 'mouseup', () => {
        // console.log('mouseup');
        if (!touches) down = false
    })
    useEventListener(window, 'touchstart', e => {
        // down = e.touches.length > 1
        // console.log(e, e.touches.length)
        touches = true
        down = true
    })
    useEventListener(window, 'touchend touchcancel', e => {
        // down = e.touches.length > 1
        // console.log(e, e.touches.length)
        touches = true
        down = false
    })
    return <Style>
        {/* <div className={`hint hint-${hint}`}>(touch the grid)</div> */}
        <canvas id="canvas"
            height={SIZE} width={SIZE}/>
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

function easeInOutExpo(x: number): number {
    return x === 0
        ? 0
        : x === 1
        ? 1
        : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2
        : (2 - Math.pow(2, -20 * x + 10)) / 2;
}
function easeInOutQuad(x: number): number {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
function easeOutQuad(x: number): number {
    return 1 - (1 - x) * (1 - x);
}
function easeOutSine(x: number): number {
    return Math.sin((x * Math.PI) / 2);
}