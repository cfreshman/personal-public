import React, { useEffect } from 'react';
import * as paper from 'paper'
import { useAnimate, useE, useEventListener } from '../../lib/hooks';

import styled from 'styled-components';
import { array } from '../../lib/util';
const ppr = paper
const P = paper.Point
const C = paper.Color
const S = paper.Shape

const SIZE = 512
let canvas: HTMLCanvasElement, canvasScale
let paths: paper.Path[]

// The number of points in the path:
const points = 16 //16;

// The distance between the points:
const length = SIZE / 16 // SIZE/2 / points //32;

function init() {
    canvas = document.getElementById('canvas') as HTMLCanvasElement

    // Create an empty project and a view for the canvas:
    paper.setup(canvas)
    resize()

    const background = new S.Rectangle(ppr.view.bounds);
    background.fillColor = new C("#6E82D3")

    const bedrock = new S.Rectangle(
        ppr.view.bounds.bottomLeft,
        ppr.view.bounds.bottomRight.add(new P(0, -ppr.view.bounds.height / 8)));
    bedrock.fillColor = new C("#E6BF97")

    const ground = new S.Rectangle(
        bedrock.bounds.topLeft,
        bedrock.bounds.topRight.add(new P(0, -ppr.view.bounds.height / 8)));
    ground.fillColor = new C("#E6CD97")

    const sky = new S.Rectangle(
        ground.bounds.topLeft,
        ground.bounds.topRight.add(new P(0, -ppr.view.bounds.height / 4)));
    sky.fillColor = new C("#6E72D3")


    const pathCount = 32
    paths = array(pathCount, i => {
        const path = new paper.Path({
            // strokeColor: '#201624',
            strokeColor: 'white',
            strokeWidth: 4,
            strokeCap: 'round',
            strokeJoin: 'round',
        });

        const start = new P((i + 1) * SIZE/(pathCount + 1), ground.bounds.top)
        for (let i = 0; i < points; i++)
            path.add(start.add(new P(0, -i * length)));

        return path
    })

    // ground.bringToFront()

    // Draw the view now:
    // paper.view.draw();
    paper.view.update()
}

function event2Pos(e: PointerEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    return new P(e.clientX - rect.left, e.clientY - rect.top).divide(canvasScale)
}

function onMouseMove(e) {
    if (!paths) return
    const target = event2Pos(e)
    paths.forEach(path => {
        const start = path.firstSegment.point.clone()
        if (target.y > start.y) target.y = 2 * start.y - target.y
        for (let j = 0; j < 3; j++) {
            path.lastSegment.point = target.clone()
            for (let segment = path.lastSegment; segment.previous; segment = segment.previous) {
                const vector: paper.Point = segment.point.subtract(segment.previous.point);
                vector.length = length;
                segment.previous.point = segment.point.subtract(vector);
            }
            path.firstSegment.point = start.clone()
            for (let segment = path.firstSegment; segment.next; segment = segment.next) {
                const vector: paper.Point = segment.point.subtract(segment.next.point);
                vector.length = length;
                segment.next.point = segment.point.subtract(vector);
            }
        }
    })
    paper.view.update();
}

function onMouseDown(e) {
	// path.fullySelected = true;
	// path.strokeColor = new C('#20162488');
}

function onMouseUp(e) {
	// path.fullySelected = false;
	// path.strokeColor = new C('#201624');
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

export default () => {
    useE(init)
    useEventListener(window, 'resize', resize, false);

    return <Style>
        <canvas id="canvas"
            height={SIZE} width={SIZE}
            onPointerMove={e => onMouseMove(e)}
            onPointerDown={e => onMouseMove(e)}
            onPointerUp={e => onMouseUp(e)}/>
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

canvas {
    background: #f2eee3; // white
}
`