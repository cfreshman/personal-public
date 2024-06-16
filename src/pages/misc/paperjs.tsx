// copy of Paper.js demo

import React, { useEffect } from 'react';
import * as paper from 'paper'
import { useAnimate, useE, useEventListener } from '../../lib/hooks';

import styled from 'styled-components';
const P = paper.Point

const SIZE = 512
let canvas: HTMLCanvasElement, canvasScale
let path

// The number of points in the path:
const points = 16;

// The distance between the points:
const length = 32;

function init() {
    canvas = document.getElementById('canvas') as HTMLCanvasElement

    // Create an empty project and a view for the canvas:
    paper.setup(canvas)
    resize()

    path = new paper.Path({
        strokeColor: '#201624',
        strokeWidth: 20,
        strokeCap: 'round'
    });

    const start = paper.view.center.divide(new P(10, 1));
    for (let i = 0; i < points; i++)
        path.add(start.add(new P(i * length, 0)));

    // Draw the view now:
    // paper.view.draw();
    paper.view.update()
}

function event2Pos(e: PointerEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    return new P(e.clientX - rect.left, e.clientY - rect.top).divide(canvasScale)
}

function onMouseMove(e) {
	path.firstSegment.point = event2Pos(e)
	for (let i = 0; i < points - 1; i++) {
		const segment: paper.Segment = path.segments[i];
		const nextSegment: paper.Segment = segment.next;
		const vector: paper.Point = segment.point.subtract(nextSegment.point);
		vector.length = length;
		nextSegment.point = segment.point.subtract(vector);
	}
	path.smooth({ type: 'continuous' });
    paper.view.update();
}

function onMouseDown(event) {
	path.fullySelected = true;
	path.strokeColor = '#20162488';
}

function onMouseUp(event) {
	path.fullySelected = false;
	path.strokeColor = '#201624';
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
    // useEventListener(window, 'resize', resize, false);

    return <Style>
        <canvas id="canvas"
            height={SIZE} width={SIZE}
            onPointerMove={e => onMouseMove(e)}
            onPointerDown={e => onMouseDown(e)}
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