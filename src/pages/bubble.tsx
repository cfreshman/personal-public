import React, { useState } from 'react';
import * as paper from 'paper'
import { useE, useEventListener } from '../lib/hooks';
import styled from 'styled-components';
import { array } from '../lib/util';
const ppr = paper
const P = paper.Point

const SIZE = 512
let canvas: HTMLCanvasElement, canvasScale
let dims: paper.Path[][]

const width = 8
const dist = 1
const points = SIZE/width/Math.pow(2, dist) //16;

function init() {
    canvas = document.getElementById('canvas') as HTMLCanvasElement

    // Create an empty project and a view for the canvas:
    paper.setup(canvas)
    resize()

    // const background = new S.Rectangle({
    //     rectangle: ppr.view.bounds,
    //     fillColor: 'black',
    // });
    // background.fillColor = new C("#6E82D3")

    dims = array(2, dim => array(points, i => {
        const path = new paper.Path({
            // strokeColor: '#201624',
            // strokeColor: 'white',
            // strokeColor: {
            //     gradient: {
            //         stops: [`hsl(${i / points}, .5, .5)`, `hsl(${i / points}, .5, .5)`]
            //     },
            //     origin: [0, 0],
            //     destination: [dim ? 0 : SIZE, dim ? SIZE : 0],
            // },
            // strokeColor: `hsl(${360 * i / points}deg, 80%, 80%)`,
            strokeColor: dim
                ? `hsl(${360 * i / points}deg, 80%, 80%)`
                : {
                    gradient: {
                        stops: array(Math.min(points, 32), j => `hsl(${360 * j / points}deg, 80%, 80%)`)
                        // stops: [`hsl(0deg, 80%, 80%)`, `hsl(180deg, 80%, 80%)`]
                    },
                    origin: [0, 0],
                    destination: [SIZE, 0],
                },
            strokeWidth: width,
            strokeCap: 'round',
            strokeJoin: 'round',
        });

        const start = new P(0, 0)
        for (let i = 0; i < points; i++)
            path.add(start);

        return path
    }))

    avoid([ppr.view.center])
}

let last
function avoid(targets?: paper.Point[]) {
    targets = targets || last
    last = targets
    if (!dims || !targets) return
    dims.forEach((paths, i) => {
        // paths.forEach((path, x) => {
        //     path.segments.forEach((segment, y) => {
        //         const initial = (i
        //             ? new P(
        //                 x / (paths.length - 1),
        //                 y / (path.segments.length - 1))
        //             : new P(
        //                 y / (path.segments.length - 1),
        //                 x / (paths.length - 1))
        //         ).multiply(SIZE)
        //         if (target) {
        //             const diff = initial.subtract(target)
        //             const off = diff.multiply(.1)
        //             // segment.point = initial.add(
        //             //     diff.multiply(
        //             //         Math.min(
        //             //             SIZE/off.multiply(off).length,
        //             //             SIZE/paths.length/2)))
        //             // segment.point = initial.add(
        //             //     diff.multiply(SIZE/off.multiply(off).length / 10))
        //             segment.point = initial.add(
        //                 diff.multiply(Math.pow(SIZE / points / points - diff.length / SIZE, 2)))
        //         } else {
        //             segment.point = initial
        //         }
        //     })
        // })
        paths.forEach((path, major) => {
            path.segments.forEach((segment, minor) => {
                const [x, y] = i ? [major, minor] : [minor, major]
                let pX = x / (paths.length - 1) * SIZE/7*6 + SIZE/14
                let pY = y / (path.segments.length - 1) * SIZE/7*6 + SIZE/14
                for (let t_i = 0; t_i < targets?.length - 1; t_i++) {
                    pX = pX/SIZE * SIZE/7*6 + SIZE/14
                    pY = pY/SIZE * SIZE/7*6 + SIZE/14
                }
                const initial = new P(pX, pY)
                // // const major = i ? initial.x : initial.y
                if (targets) {
                    let total = new P(0, 0)
                    targets.forEach(target => {
                        const diff = initial.subtract(target)
                        const dir = diff.normalize().multiply(points * 6/7)
                        total = total.add(dir)
                    })
                    // segment.point = initial.add(
                    //     diff.multiply(
                    //         Math.min(
                    //             SIZE/off.multiply(off).length,
                    //             SIZE/paths.length/2)))
                    // segment.point = initial.add(
                    //     diff.multiply(SIZE/off.multiply(off).length / 10))
                    segment.point = initial.add(total)
                } else {
                    segment.point = initial
                }
                // const compare = i ? 'x' : 'y'
                // if (target) {
                //     const diff = initial[compare] - target[compare]
                //     initial[compare] += (Math.abs(diff) > 1)
                //         ? SIZE / diff
                //         : SIZE * diff
                //     // const dir = diff.normalize().multiply(points * 2/3)
                //     // segment.point = initial.add(
                //     //     diff.multiply(
                //     //         Math.min(
                //     //             SIZE/off.multiply(off).length,
                //     //             SIZE/paths.length/2)))
                //     // segment.point = initial.add(
                //     //     diff.multiply(SIZE/off.multiply(off).length / 10))
                //     segment.point = initial
                // } else {
                //     segment.point = initial
                // }
            })
            // path.smooth()
        })
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
        // onMouseMove(e)
    }
    // useTimeout(() => {
    //     if (hint === undefined) {
    //         setHint(true)
    //     }
    // }, 3000)
    useEventListener(window, 'mousemove mousedown', onMouseMove, false)
    useEventListener(window, 'touchmove touchstart touchend touchcancel', e => {
        if (onTouchMove(e)) setHint(false)
    }, false)

    return <Style>
        <div className={`hint hint-${hint}`}>(touch the grid)</div>
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