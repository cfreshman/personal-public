import React, { useEffect, useState } from 'react';
import * as paper from 'paper'
import { useAnimate, useE, useEventListener, useTimeout } from '../lib/hooks';

import styled from 'styled-components';
import { array, randf, randi, rands } from '../lib/util';
import { noise } from '../lib/noise';
import { PaperScope } from 'paper/dist/paper-core';
const P = paper.Point

const SIZE = 1024
let canvas: HTMLCanvasElement, canvasScale

let carrots: Carrot[] = []

function strokeToSolid({ segments, strokeColor, strokeWidth, strokeCap }: {
    segments: paper.Point[], strokeColor: any, strokeWidth: any, strokeCap?: string
}): paper.PathItem {
    return new paper.Path({ segments, strokeColor, strokeWidth, strokeCap })
    const parts = new paper.Group({ insert: false })
    const radius = strokeWidth / 2
    const fillColor = strokeColor
    const round = strokeCap === 'round'
    let line: paper.PathItem = new paper.Path.Circle({
        center: segments[0],
        radius: round ? radius : 0,
        fillColor,
    })
    for (let i = 1; i < segments.length; i++) {
        let a = segments[i-1], b = segments[i]
        let angle = b.subtract(a).angle
        let distance = a.getDistance(b)
        line = line.unite(new paper.Path.Rectangle({
            from: a.add(new P(0, -radius)),
            to: a.add(new P(distance, radius)),
            matrix: new paper.Matrix().rotate(angle, a),
            parent: parts,
        }))
        if (round || i < segments.length - 1) {
            line = line.unite(new paper.Path.Circle({
                center: b,
                radius,
                fillColor,
                parent: parts,
            }))
        }
    }
    return line
}

class Stalk {
    constructor(
        curr: paper.Point,
        scale: number, size: number, rootRadius: number, rotate: number,
        h: number, s: number, l: number) {

        let angle = rotate / 2
        // let length = size * rands(.5, 1)
        let length = size * rands(.25, 1.5)
        let stalk = curr.add(new P(angle * rootRadius * 2, 0))
        // let thick = size/3 * scale
        let thick = size/2
        let fronds = []
        return new paper.Group([strokeToSolid({
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
                    fronds.push(strokeToSolid({
                        segments: [frond, ...Array.from({ length: 6 - i }).map((_, j) => {
                            frond = frond.add(new P(-Math.cos(fangle) * flength, Math.sin(-fangle) * flength))
                            flength *= .9
                            fangle -= Math.abs(rotate)

                            if (j < 6 - i - 1) {
                                let fflength = Math.sqrt(length/(i+3)) * ((6-i-j)/(6-i))
                                let ffangle = fangle + Math.PI/4
                                let ffrond = frond.add(new P(
                                    -Math.cos(ffangle) * thick/4, Math.sin(-ffangle) * thick/4))
                                fronds.push(strokeToSolid({
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
                    fronds.push(strokeToSolid({
                        segments: [frond, ...Array.from({ length: 6 - i }).map((_, j) => {
                            frond = frond.add(new P(Math.cos(fangle) * flength, Math.sin(fangle) * flength))
                            flength *= .9
                            fangle += Math.abs(rotate)

                            if (j < 6 - i - 1) {
                                let fflength = Math.sqrt(length/(i+3)) * ((6-i-j)/(6-i))
                                let ffangle = fangle - Math.PI/4
                                let ffrond = frond.add(new P(
                                    Math.cos(ffangle) * thick/4, Math.sin(ffangle) * thick/4))
                                fronds.push(strokeToSolid({
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
        }), ...fronds])
    }
}

class Top {
    group: paper.Group
    constructor(pos: paper.Point, rootRadius: number, scale: number) {
        // let size = rands(10, 15)
        let size = rootRadius * 1.5
        let curr = pos.add(new P(0, -rootRadius))
        let h = 113 * rands(.1, 1), s = 65 * rands(.1, 1), l = 30 * rands(.1, 1)
        const tilt = 0 // rands(Math.PI / 36)
        const rotates = [rands(Math.PI / 36) + tilt]
        rotates.push(rotates[0] - randf(Math.PI / 36) - Math.PI/36)
        rotates.push(rotates[0] + randf(Math.PI / 36) + Math.PI/36)
        const stalks = Array.from({ length: 3 }).map(() => {
            let rotate = rotates.pop() ?? rands(Math.PI / 18) + tilt
            return new Stalk(curr, scale, size, rootRadius, rotate, h, s, l)
        })
        this.group = new paper.Group([
            ...stalks,
        ])
    }
}
class Root {
    radius: number
    group: paper.Group
    base: paper.Group
    top: paper.Item

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
        const bottom = new paper.Path({
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
            strokeWidth: 2,
            strokeColor: {
                gradient: {
                    stops: [
                        `hsl(${h}deg ${s}% ${l}%)`,
                        `hsl(${h}deg ${s}% ${l + tipLight}%)`
                    ]
                },
                origin: pos,
                destination: curr,
            },
            closed: true,
        })
        const top = new paper.Path.Circle({
            center: pos,
            radius,
            fillColor: `hsl(${h}deg ${s}% ${l}%)`,
            parent: parts,
        }).intersect(new paper.Path.Rectangle({
            point: pos.add(new P(-radius, -radius)),
            size: [radius * 2, radius + .5],
            parent: parts,
        }))
        this.top = top
        const path = bottom.unite(top)
        const lines = pairs.slice(1).map((pair, i) => {
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
        })
        this.base = new paper.Group([
            bottom,
            ...lines,
        ])
        this.group = new paper.Group([
            top,
            path,
            this.base,
        ])
    }
}

class Carrot {
    pos: paper.Point
    scale: number
    top: Top
    root: Root
    group: paper.Group
    hole?: paper.PathItem
    growth: number
    harvest: number

    constructor(pos: paper.Point, scale: number) {
        this.pos = pos
        this.scale = scale
        this.root = new Root(pos, scale)
        this.top = new Top(pos, this.root.radius, scale)
        this.group = new paper.Group({
            position: pos,
            children: [this.root.group, this.top.group],
            matrix: new paper.Matrix().scale(scale, pos),
            applyMatrix: false,
        })
        this.growth = randf(4) + 1
        // this.group.scale(scale)
    }
}

function init() {
    canvas = document.getElementById('canvas') as HTMLCanvasElement

    // Create an empty project and a view for the canvas:
    paper.setup(canvas)
    resize()

    const ground = SIZE*3/5
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
        parent: parts,
    })
    Array.from({ length: 10 }).map(() => {
        new paper.Group([new paper.Path.Circle({
            center: [randi(SIZE), randi(SIZE - ground) + ground],
            radius: rands(SIZE/8, SIZE/8),
            fillColor: '#322',
            parent: parts,
        }).intersect(clip)])
    })
    Array.from({ length: 30 }).map(() => {
        new paper.Group([new paper.Path.Circle({
            center: [randi(SIZE), randi(SIZE - ground) + ground],
            radius: rands(SIZE/64, SIZE/64),
            fillColor: '#403030',
            parent: parts,
        }).intersect(clip)])
    })
    let pos = new P(0, ground)
    while (pos.x < SIZE) {
        let scale = Math.pow(randf() + .5, 2)
        let spacing = scale * rands(.25, 1.25)
        pos = pos.add(new P(spacing * 15, 0))
        const carrot = new Carrot(pos, scale)
        pos = pos.add(new P(spacing * 15, 0))
        carrots.push(carrot)
    }
    // Array.from({ length: 11 }).forEach(() => {
    //     new Carrot(new P(randi(SIZE), ground))
    // })

}
let last_t = performance.now()
function animate(t) {
    const dt = Math.min(1000, t - last_t)
    last_t = t

    // check collisions
    for (let i = 0; i < carrots.length; i++) {
        const curr = carrots[i], left = carrots[i-1], right = carrots[i+1]
        if (curr.harvest) continue
        if (left && !left.harvest && curr.pos.getDistance(left.pos) <
            curr.root.radius * curr.scale + left.root.radius * left.scale) {

            if (left.scale < curr.scale) {
                left.harvest = -1
            } else {
                curr.harvest = -1
            }
        } else if (right && !right.harvest && curr.pos.getDistance(right.pos) <
            curr.root.radius * curr.scale + right.root.radius * right.scale) {

            if (right.scale < curr.scale) {
                right.harvest = -1
            } else {
                curr.harvest = -1
            }
        }
    }

    carrots = carrots.map((carrot, i) => {
        // carrot.group.scale(1 + .01 * Math.cos(.1 * dt))
        const harvestTime = 5000 * carrot.scale
        if (carrot.harvest > harvestTime) {
            carrot.group.remove()
            let prev = carrots[i-1], left = 0
            if (prev) {
                left = prev.pos.x + (prev.harvest ? 0 : prev.root.radius * prev.scale)
            }
            let next = carrots[i+1], right = SIZE
            if (next) {
                right = next.pos.x - (next.harvest ? 0 : next.root.radius * next.scale)
            }
            if (right > left) {
                carrot = new Carrot(
                    new P(randf(right - left) + left, carrot.pos.y), Math.pow(.5, 2))
            }
        } else if (carrot.harvest > 0) {
            carrot.harvest += dt
            // carrot.top.group.opacity = 1 - carrot.harvest / 5000
            // carrot.root.group.opacity = 1 - carrot.harvest / 5000
            // carrot.group.children.forEach(child => {
            //     child.opacity = 1 - carrot.harvest / 5000
            // })
            // carrot.group.opacity = 1 - carrot.harvest / 5000
            const setOpacity = (item) => {
                if (!item.visible) return
                // if (item.hasChildren()) {
                if (item.clipped !== undefined) {
                    item.children.forEach(setOpacity)
                } else {
                    item.opacity = Math.max(0, 500 - carrot.harvest) / 500
                }
            }
            // // setOpacity(carrot.group)
            setOpacity(carrot.top.group)
            setOpacity(carrot.root.top)
            // carrot.top.group.opacity = Math.max(0, 5000 - carrot.harvest) / 5000
            // carrot.root.top.opacity = Math.max(0, 500 - carrot.harvest) / 500
            // carrot.root.base.visible = false
            // carrot.group.opacity = 1 - carrot.harvest / 5000
            carrot.hole.opacity = Math.max(0, harvestTime - carrot.harvest) / harvestTime
        } else if (carrot.harvest < 0 || carrot.scale > Math.pow(1.5, 2) * 1.25) {
            carrot.harvest = dt
            carrot.group.removeChildren()
            carrot.group.addChild(carrot.top.group)
            carrot.group.addChild(carrot.root.top)
            // carrot.root.base.visible = false
            carrot.hole = new paper.Path.Rectangle({
                from: [0, SIZE*3/5],
                to: [SIZE, SIZE],
                fillColor: '#151010',
                // strokeColor: '#201515',
                // strokeWidth: 2,
                parent: new paper.Group({ insert: false }),
            }).intersect(carrot.root.base.children[0] as paper.PathItem)
            paper.project.activeLayer.addChild(new paper.Group({
                position: carrot.group.position,
                children: [carrot.hole],
                matrix: carrot.group.matrix,
                applyMatrix: false,
            }))
            // carrot.hole = new paper.Path.Rectangle({
            //     from: [0, SIZE*3/5],
            //     to: [SIZE, SIZE],
            //     fillColor: '#201515',
            //     // strokeColor: '#201515',
            //     // strokeWidth: 2,
            //     parent: new paper.Group({ insert: false }),
            // }).intersect(carrot.root.base.children[0] as paper.PathItem)
            // // carrot.group.removeChildren()
            // // carrot.group.addChild(carrot.hole)
            // // carrot.hole.bringToFront()
            // paper.project.activeLayer.addChild(new paper.Group({
            //     position: carrot.group.position,
            //     children: [carrot.hole],
            //     matrix: carrot.group.matrix,
            //     applyMatrix: false,
            // }))
        } else {
            // carrot.scale *= 1 + .00001 * dt
            carrot.scale += .00001 * dt * carrot.growth
            carrot.group.matrix.set(
                new paper.Matrix().scale(carrot.scale, carrot.pos))
        }
        return carrot
    })

    carrots.forEach(carrot => {
        if (!carrot.harvest) {
            carrot.group.bringToFront()
        }
    })
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
    useAnimate(animate)

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