import React, { useState } from 'react'
import * as paper from 'paper'
import { useE, useEventListener } from '../lib/hooks'

import styled from 'styled-components'
import { isMobile } from '../lib/util'
const P = paper.Point
const C = paper.Color

const SIZE = isMobile ? 512 : 2048
let canvas: HTMLCanvasElement, canvasScale
let path: paper.Path
let hand: paper.Shape.Circle
let base: paper.Shape.Circle

// The number of points in the path:
const points = 16 //16

// The distance between the points:
const length = SIZE/2 / points //32

// is the start fixed
let pin = undefined

function init() {
    canvas = document.getElementById('canvas') as HTMLCanvasElement

    paper.setup(canvas)
    resize()

    const start = paper.view.center
    path = new paper.Path({
        strokeColor: '#201624',
        strokeWidth: 4,
        strokeCap: 'round',
        strokeJoin: 'round',
    })
    for (let i = 0; i < points; i++) path.add(start.add(new P(i * length, 0)))

    hand = new paper.Shape.Circle({
        center: path.lastSegment.point,
        radius: 8,
        // fillColor: '#201624',
        strokeColor: '#201624',
        strokeWidth: 4,
    })
    base = new paper.Shape.Circle({
        center: path.firstSegment.point,
        radius: 8,
        fillColor: '#201624',
        strokeColor: '#201624',
        strokeWidth: 4,
    })

    paper.view.update()
    pin = base.position
}

function event2Pos(e: PointerEvent) {
    const rect = document.querySelector('canvas').getBoundingClientRect()
    return new P(e.clientX - rect.left, e.clientY - rect.top).divide(canvasScale)
}

function onMove(e) {
    if (!path) return
    const target = event2Pos(e)
    // const target = path.firstSegment.point.multiply(2).subtract(event2Pos(e))
    for (let j = 0; j < 3; j++) {
        path.lastSegment.point = target
        for (let segment = path.lastSegment; segment.previous; segment = segment.previous) {
            const vector: paper.Point = segment.point.subtract(segment.previous.point)
            vector.length = length
            segment.previous.point = segment.point.subtract(vector)
        }
        if (pin) {
            path.firstSegment.point = pin
            for (let segment = path.firstSegment; segment.next; segment = segment.next) {
                const vector: paper.Point = segment.point.subtract(segment.next.point)
                vector.length = length
                segment.next.point = segment.point.subtract(vector)
            }
        }
    }
    hand.position = path.lastSegment.point
    paper.view.update()
}
function onDown(e) {
	path.fullySelected = true
	path.strokeColor = new C('#20162488')
    if (pin) {
        pin = undefined
    } else {
        pin = base.position = path.firstSegment.point.clone()
    }
    base.visible = !!pin
    onMove(e)
}
function onUp(e) {
	path.fullySelected = false
	path.strokeColor = new C('#201624')
}

function resize() {
    const style = window.getComputedStyle(canvas.parentElement)
    const containerWidth = Number(style.width.slice(0, -2))
    const containerHeight = Number(style.height.slice(0, -2))

    canvasScale = Math.min(containerWidth / SIZE, containerHeight / SIZE)
    canvas.style.width = `${canvasScale * SIZE}px`
    canvas.style.height = `${canvasScale * SIZE}px`
    canvas.width = SIZE
    canvas.height = SIZE
}

export default () => {
    const [hint, setHint] = useState(true)

    useE(init)
    useEventListener(window, 'resize', resize, false)

    // interactions
    useEventListener(window, 'pointermove', onMove)
    useEventListener(window, 'pointerdown', e => {
        onDown(e)
        setHint(false)
    })
    useEventListener(window, 'pointerup', onUp)

    return <Style>
        <div className={`hint hint-${hint}`}>(tap to unfix)</div>
        <canvas id="canvas" height={SIZE} width={SIZE}/>
    </Style>
}

const Style = styled.div`
height: 100%;
width: 100%;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
background: black; //#191624;

position: relative;
.hint {
    position: absolute;
    top: 2rem;
    color: white;
    background: black;
    transition: .5s;
    pointer-events: none;
    &.hint-false {
        opacity: 0;
        top: 1rem;
    }
}

canvas {
    background: #f2eee3; // white
}
`