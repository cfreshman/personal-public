import React, { useEffect, useState } from 'react';
import * as paper from 'paper'
import { useAnimate, useE, useEventListener, useTimeout } from '../../lib/hooks';

import styled from 'styled-components';
import { array, randf, randi, rands } from '../../lib/util';
import { noise } from '../../lib/noise';
const P = paper.Point

const SIZE = 1024
let canvas: HTMLCanvasElement, canvasScale

class Top {
    group: paper.Group
    constructor(pos: paper.Point, rootRadius: number, scale: number) {
        // let size = rands(10, 15)
        let size = rootRadius * 1.5
        let curr = pos.add(new P(0, -rootRadius))
        let h = 113 * rands(.1, 1), s = 65 * rands(.1, 1), l = 30 * rands(.1, 1)
        const fronds = []
        const tilt = 0 // rands(Math.PI / 36)
        const rotates = [rands(Math.PI / 36) + tilt]
        rotates.push(rotates[0] - randf(Math.PI / 36) - Math.PI/36)
        rotates.push(rotates[0] + randf(Math.PI / 36) + Math.PI/36)
        const stalks = Array.from({ length: 3 }).map(() => {
            let rotate = rotates.pop() ?? rands(Math.PI / 18) + tilt
            let angle = rotate / 2
            // let length = size * rands(.5, 1)
            let length = size * rands(.25, 1.5)
            let stalk = curr.add(new P(angle * rootRadius * 2, 0))
            let thick = size/3 * scale
            return new paper.Path({
                segments: [stalk, ...Array.from({ length: 5 }).map((_, i) => {
                    stalk = stalk.add(new P(Math.sin(angle) * length, Math.cos(angle) * -length))
                    // length *= .8
                    length *= rands(.1, .9)
                    if (i > 0) {
                        angle += rotate
                    } else {
                        length *= rands(.2, .8)
                    }

                    if (i < 4) {
                        let frond = stalk
                        let flength = Math.sqrt(length/(i+3)) * 3
                        // let flength = size/3
                        let fangle = angle + Math.PI/4
                        fronds.push(new paper.Path({
                            segments: [frond, ...Array.from({ length: 6 - i }).map((_, j) => {
                                frond = frond.add(new P(-Math.cos(fangle) * flength, Math.sin(-fangle) * flength))
                                flength *= .9
                                fangle -= Math.abs(rotate)

                                if (j < 6 - i - 1) {
                                    let fflength = Math.sqrt(length/(i+3)) * ((6-i-j)/(6-i))
                                    let ffangle = fangle + Math.PI/4
                                    let ffrond = frond.add(new P(
                                        -Math.cos(ffangle) * thick/4, Math.sin(-ffangle) * thick/4))
                                    fronds.push(new paper.Path({
                                        segments: [ffrond, ...Array.from({ length: 4 }).map(() => {
                                            ffrond = ffrond.add(new P(-Math.cos(ffangle) * fflength, Math.sin(-ffangle) * fflength))
                                            fflength *= .9

                                            return ffrond
                                        })],
                                        strokeColor: `hsla(${h}deg ${s}% ${l * rands(.1, 1)}% .8)`,
                                        strokeWidth: thick,
                                        strokeCap: 'round',
                                    }))
                                }

                                return frond
                            })],
                            strokeColor: `hsl(${h}deg ${s}% ${l}%)`,
                            strokeWidth: thick/4,
                        }))

                        flength = Math.sqrt(length/(i+3)) * 3
                        fangle = angle - Math.PI/4
                        frond = stalk.add(new P(
                            Math.cos(fangle) * thick/8, Math.sin(fangle) * thick/8))
                        fronds.push(new paper.Path({
                            segments: [frond, ...Array.from({ length: 6 - i }).map((_, j) => {
                                frond = frond.add(new P(Math.cos(fangle) * flength, Math.sin(fangle) * flength))
                                flength *= .9
                                fangle += Math.abs(rotate)

                                if (j < 6 - i - 1) {
                                    let fflength = Math.sqrt(length/(i+3)) * ((6-i-j)/(6-i))
                                    let ffangle = fangle - Math.PI/4
                                    let ffrond = frond.add(new P(
                                        Math.cos(ffangle) * thick/4, Math.sin(ffangle) * thick/4))
                                    fronds.push(new paper.Path({
                                        segments: [ffrond, ...Array.from({ length: 4 }).map(() => {
                                            ffrond = ffrond.add(new P(Math.cos(ffangle) * fflength, Math.sin(ffangle) * fflength))
                                            fflength *= .9

                                            return ffrond
                                        })],
                                        strokeColor: `hsla(${h}deg ${s}% ${l * rands(.1, 1)}% .8)`,
                                        strokeWidth: thick,
                                        strokeCap: 'round',
                                    }))
                                }

                                return frond
                            })],
                            strokeColor: `hsl(${h}deg ${s}% ${l}%)`,
                            strokeWidth: thick/4,
                        }))
                    }

                    return stalk
                })],
                strokeColor: `hsl(${h}deg ${s}% ${l}%)`,
                strokeWidth: thick/4,
            })
        })
        this.group = new paper.Group([
            ...stalks,
            ...fronds,
        ])
    }
}
class Root {
    radius: number
    group: paper.Group
    constructor(pos: paper.Point, scale: number) {
        let radius = rands(5, 10)
        this.radius = radius
        let size = radius, offset = new P(0, 0), curr = pos
        let h = 22 * rands(.3, 1), s = 91 * rands(.1, 1), l = 56 * rands(.1, 1)
        const pairs: paper.Point[][] = []
        let segments: paper.Point[] = []
        Array.from({ length: 100 }).map((_, i) => {
            if (size < 2) return
            const pair = [curr.add(new P(-size, 0)), curr.add(new P(size, 0))]
            pairs.push(pair)
            segments = [pair[0], ...segments, pair[1]]
            if (i > 0) {
                size *= randf(.25) + .75
                offset = new P(randf(size/2) - size/4, randf(size/2) - size/4)
            } else {
                size *= randf(.1) + .9
                offset = new P(randf(size/4) - size/8, randf(size/2) - size/4)
            }
            curr = curr.add(new P(0, size)).add(offset)
        })
        segments.push(curr)
        const tipLight = rands(10, 15)
        const parts = new paper.Group({ insert: false })
        const path = new paper.Path({
            segments,
            // fillColor: `hsl(${h}deg ${s}% ${l}%)`,
            fillColor: {
                gradient: {
                    stops: [
                        `hsl(${h}deg ${s}% ${l}%)`,
                        `hsl(${h}deg ${s}% ${l + tipLight}%)`
                    ]
                },
                origin: pos,
                destination: curr,
            },
            // strokeWidth: 3,
            // strokeColor: {
            //     gradient: {
            //         stops: [
            //             `hsl(${h}deg ${s}% ${l*.9}%)`,
            //             `hsl(${h}deg ${s}% ${l*.9 + tipLight}%)`
            //         ]
            //     },
            //     origin: pos,
            //     destination: curr,
            //     // origin: from,
            //     // destination: to
            // },
            strokeWidth: 2,
            // strokeWidth: 2 * radius/15 * 2,
            strokeColor: {
                gradient: {
                    stops: [
                        `hsl(${h}deg ${s}% ${l}%)`,
                        `hsl(${h}deg ${s}% ${l + tipLight}%)`
                    ]
                },
                origin: pos,
                destination: curr,
                // origin: from,
                // destination: to
            },
            closed: true,
            parent: parts,
        }).unite(new paper.Path.Circle({
            center: pos,
            radius,
            parent: parts,
            fillColor: `hsl(${h}deg ${s}% ${l}%)`,
        }).intersect(new paper.Path.Rectangle({
            point: pos.add(new P(-radius, -radius)),
            size: [radius * 2, radius + .5],
            parent: parts,
        })))
        const face = 6 * radius/15
        this.group = new paper.Group([
            path,
            // new paper.Path.Circle({
            //     center: pos.add(new P(-face * .5, radius/2)),
            //     radius: 1,
            //     fillColor: 'black',
            // }),
            // new paper.Path.Circle({
            //     center: pos.add(new P(face * .5, radius/2)),
            //     radius: 1,
            //     fillColor: 'black',
            // }),
            // new paper.Path.Circle({
            //     center: pos.add(new P(0, radius/2 + face * .6)),
            //     radius: face,
            //     parent: parts,
            //     fillColor: 'black',
            // }).intersect(new paper.Path.Rectangle({
            //     point: pos.add(new P(-face, radius/2 + face * .6)),
            //     size: [face*2, face],
            //     parent: parts,
            // })),
            ...pairs.slice(1).map((pair, i) => {
                if (i%2) pair.reverse()
                const lerp = rands(.4, .4)
                const from = pair[0]
                const to = pair[0].multiply(1 - lerp).add(pair[1].multiply(lerp))
                return new paper.Path.Line({
                    from, to,
                    // strokeWidth: rands(1, 2),
                    // strokeWidth: ((curr.y - pair[0].y) / (curr.y - pos.y) * 2 + 1) * radius/15 * 2,
                    strokeWidth: ((curr.y - pair[0].y) / (curr.y - pos.y) * 2 + 1),
                    // strokeCap: 'round',
                    // strokeColor: `#000${randi(3) + 2}`,
                    // strokeColor: `#000${randi(2) + 1}`,
                    // strokeColor: `hsl(${h}deg ${s}% ${l - 10}%)`,
                    strokeColor: {
                        gradient: {
                            stops: [
                                `hsl(${h}deg ${s}% ${l * .8}%)`,
                                `hsl(${h}deg ${s}% ${(l + tipLight) * .8}%)`
                            ]
                        },
                        origin: pos,
                        destination: curr,
                        // origin: from,
                        // destination: to
                    },
                    parent: parts,
                    // strokeColor: {
                    //     gradient: {
                    //         stops: [`#000${randi(3) + 2}`, '#0000']
                    //     },
                    //     origin: from,
                    //     destination: to
                    // }
                })
            }),
        ])
    }
}

class Carrot {
    pos: paper.Point
    top: Top
    root: Root

    constructor(pos: paper.Point, scale: number) {
        this.pos = pos
        this.root = new Root(pos, scale)
        this.top = new Top(pos, this.root.radius, scale)
        new paper.Group({
            position: pos,
            children: [this.root.group, this.top.group],
            matrix: new paper.Matrix().scale(scale, pos),
        })
    }
}

function init() {
    canvas = document.getElementById('canvas') as HTMLCanvasElement

    // Create an empty project and a view for the canvas:
    paper.setup(canvas)
    resize()

    const center = new P(SIZE/2, SIZE/2)
    const ground = SIZE*3/5
    // Array.from({ length: 167 }).forEach(() => {
    //     new Carrot(new P(randi(SIZE), ground))
    // })
    new paper.Path.Rectangle({
        from: [0, 0],
        to: [SIZE, ground],
        fillColor: '#fff',
    })
    new paper.Path.Rectangle({
        from: [0, 0],
        to: [SIZE, ground],
        // fillColor: '#88ccff',
        fillColor: {
            gradient: {
                stops: [
                    '#88ccff',
                    '#88ccff88'
                ]
            },
            origin: [0, 0],
            destination: [0, ground],
            // origin: from,
            // destination: to
        },
    })
    // new paper.Path.Circle({
    //     center: [SIZE/2, ground],
    //     radius: SIZE*2/9,
    //     fillColor: '#fff1',
    // })
    new paper.Path.Circle({
        center: [SIZE/2, ground],
        radius: SIZE*2/5,
        fillColor: '#fff2',
    })
    // new paper.Path.Circle({
    //     center: [SIZE/2, ground],
    //     radius: SIZE*2/3,
    //     fillColor: '#fff2',
    // })
    new paper.Path.Rectangle({
        from: [0, SIZE],
        to: [SIZE, ground],
        fillColor: '#3b2222',
    })
    const parts = new paper.Group({ insert: false })
    const clip = new paper.Path.Rectangle({
        from: [0, SIZE],
        to: [SIZE, ground],
        fillColor: '#000',
        parent: parts,
    })
    Array.from({ length: 10 }).map(() => {
        new paper.Group([new paper.Path.Circle({
            center: [randi(SIZE), randi(SIZE - ground) + ground],
            radius: rands(SIZE/8, SIZE/8),
            fillColor: '#322',
            parent: parts,
        }).intersect(new paper.Path.Rectangle({
            from: [0, SIZE],
            to: [SIZE, ground],
            parent: parts,
        }))])
    })
    Array.from({ length: 30 }).map(() => {
        new paper.Group([new paper.Path.Circle({
            center: [randi(SIZE), randi(SIZE - ground) + ground],
            radius: rands(SIZE/64, SIZE/64),
            fillColor: '#403030',
            parent: parts,
        }).intersect(new paper.Path.Rectangle({
            from: [0, SIZE],
            to: [SIZE, ground],
            parent: parts,
        }))])
    })
    // new paper.Path.Rectangle({
    //     from: [20, 20],
    //     to: [60, 60],
    //     fillColor: '#ffff00'
    // });
    let pos = new P(0, ground)
    while (pos.x < SIZE) {
        let scale = Math.pow(randf() + .5, 2)
        let spacing = scale * rands(.25, 1.25)
        pos = pos.add(new P(spacing * 15, 0))
        const carrot = new Carrot(pos, scale)
        pos = pos.add(new P(spacing * 15, 0))
    }
    // Array.from({ length: 11 }).forEach(() => {
    //     new Carrot(new P(randi(SIZE), ground))
    // })
}

function onMouseMove(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const mouse = new P(e.clientX - rect.left, e.clientY - rect.top).divide(canvasScale)
    // avoid([mouse])
}
function onTouchMove(e: TouchEvent): boolean {
    const rect = canvas.getBoundingClientRect();
    const touches = Array.from(e.touches).map((t: Touch) =>
        new P(t.clientX - rect.left, t.clientY - rect.top).divide(canvasScale))
    // if (touches.length > 0) avoid(touches)
    return Array.from(e.touches).some((t: Touch) =>
        t.clientX > rect.left && t.clientY > rect.top
        && t.clientX < rect.right && t.clientY < rect.bottom)
}

function resize() {
    const style = window.getComputedStyle(canvas.parentElement);
    const containerWidth = Number(style.width.slice(0, -2));
    const containerHeight = Number(style.height.slice(0, -2));

    // canvasScale = Math.min(containerWidth / SIZE, containerHeight / SIZE);
    canvasScale = containerHeight / SIZE * 3/2
    canvas.style.width = `${canvasScale * SIZE}px`;
    canvas.style.height = `${canvasScale * SIZE}px`;
    canvas.width = SIZE;
    canvas.height = SIZE;

    paper.view.update()
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
    }
    useEventListener(window, 'mousemove mousedown', onMouseMove, false)
    useEventListener(window, 'touchmove touchstart touchend touchcancel', e => {
        if (onTouchMove(e)) setHint(false)
    }, false)

    // useAnimate(() => avoid(last))

    return <Style>
        {/* <div className={`hint hint-${hint}`}>(touch the egg)</div> */}
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