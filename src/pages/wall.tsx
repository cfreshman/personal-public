import React, { useState } from 'react';
import styled from 'styled-components';
import { JSX, fields } from '../lib/types';
import { useAnimate, useEventListener, useF, useR } from '../lib/hooks';
import { useSocket } from '../lib/socket';
import { usePageSettings } from 'src/lib/hooks_ext';
import { InfoBody, InfoSection, InfoStyles } from 'src/components/Info';

let canvas: HTMLCanvasElement, canvasScale
let ctx: CanvasRenderingContext2D

type V2 = [number, number]

function event2Pos(e: PointerEvent): V2 {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top]
        .map(x => Math.floor(x/canvasScale)) as V2
}

const SIZE = 24
function resize() {
    canvas = document.querySelector('#canvas')
    ctx = canvas.getContext('2d')
    const style = window.getComputedStyle(canvas.parentElement);
    const containerWidth = Number(style.width.slice(0, -2));
    const containerHeight = Number(style.height.slice(0, -2));

    canvasScale = Math.min(containerWidth / SIZE, containerHeight / SIZE);
    canvas.style.width = `${canvasScale * SIZE}px`;
    canvas.style.height = `${canvasScale * SIZE}px`;
    canvas.width = SIZE;
    canvas.height = SIZE;
}

function eq(a, b) {
    return a && b && a[0] === b[0] && a[1] === b[1]
}
function p2c(a, s) {
    const [x, y] = a.map(x => x/SIZE)
    // return `hsl(${x * 256}, ${s + 20 * y}%, ${60 + 15 - 30 * y}%)`
    // return `hsl(${x * 256}, ${s}%, ${60 + 10 - 20 * y}%)`
    return `hsl(${x * 256}, ${s}%, ${60}%)`
}
function p2co(a, s) {
    const [x, y] = a.map(x => 1 - x/SIZE)
    return `hsl(${128 + x * 256}, ${s + 20 * y}%, ${60 + 15 - 30 * y}%)`
}

const drawState: fields<unknown> = { comments: {} }
function draw() {
    const { hover, pos } = drawState
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (hover) {
        // ctx.globalAlpha = .5
        // ctx.fillStyle = p2c(hover, 80)
        // ctx.fillRect(hover[0], hover[1], 1, 1)
        // ctx.globalAlpha = 1
        ctx.fillStyle = '#00f4'
        ctx.fillRect(hover[0], hover[1], 1, 1)
    }
    if (pos) {
        // ctx.globalAlpha = .75
        ctx.fillStyle = '#000'
        // ctx.fillStyle = p2c(pos, 100)
        ctx.fillStyle = '#00fa'
        // ctx.fillStyle = p2co(pos, 80)
        ctx.fillRect(pos[0], pos[1], 1, 1)
    }
    Object.keys(drawState.comments).map(key => {
        const keyPos = key.split(',').map(Number)
        if (eq(keyPos, pos) || eq(keyPos, hover)) return
        // const keyComment = drawState.comments[key]
        ctx.fillStyle = p2c(keyPos, 80)
        ctx.fillStyle = '#000e'
        ctx.fillRect(keyPos[0], keyPos[1], 1, 1)
    })
    // array(SIZE, r => array(SIZE, c => {
    //     const keyPos = [r, c]
    //     if (eq(keyPos, pos) || eq(keyPos, hover)) return
    //     // const keyComment = drawState.comments[key]
    //     // ctx.fillStyle = '#000e'
    //     ctx.fillStyle = p2c(keyPos, 80)
    //     ctx.fillRect(keyPos[0], keyPos[1], 1, 1)
    // }))
}

const commentLength = 99
const commentLines = 5
export default () => {
    usePageSettings({
        background: '#fff',
        checkin: 'wall',
    })
    useF(resize)
    useEventListener(window, 'resize', resize, false);
    useAnimate(draw)

    const [trigger, setTrigger] = useState({})
    const socket = useSocket({
        room: 'wall',
        on: {
            'wall:all': msgs => {
                // console.log('wall:all', msgs)
                msgs.forEach(({pos, msg},) => {
                    drawState.comments[pos] = msg
                })
            },
            'wall:msg': (pKey, msg) => {
                // console.log('wall:msg', pos?.join(','), pKey, msg)
                drawState.comments[pKey] = msg
                setTrigger({})
                // if (pos && pos.join(',') === pKey) {
                //     setComment(msg)
                // }
            },
            'wall:get': (pKey, msg) => {
                // console.log('wall:get', pKey, msg)
                drawState.comments[pKey] = msg
                setTrigger({})
                // if (pos && pos.join(',') === pKey) {
                //     setComment(msg)
                // }
            },
        },
    })

    const [pos, setPos] = useState(undefined)
    const [comment, setComment] = useState('')
    const handle = {
        pos: () => {
            if (eq(drawState.hover, drawState.pos)) {
                drawState.hover = undefined
            }
        },
        hover: e => {
            drawState.hover = event2Pos(e)
            handle.pos()
        },
        select: e => {
            const keyPos = event2Pos(e)
            drawState.pos = keyPos
            handle.pos()
            setPos(keyPos);
            setComment(drawState.comments[keyPos.join(',')] || '')
            setTimeout(() => commentRef.current?.focus())
            socket?.emit('wall:get', keyPos.join(','))
        },
        edit: e => {
            if (pos) {
                const msg = commentRef.current.value
                    .replace(/\n{3,}/g, '\n\n')
                    .split('\n')
                    .slice(0, commentLines)
                    .join('\n')
                    .slice(0, commentLength)
                const cKey = pos.join(',')
                if (msg) drawState.comments[cKey] = msg
                else delete drawState.comments[cKey]
                socket?.emit('wall:msg', cKey, msg)
                setComment(msg)
            }
        }
    }

    useF(trigger, () => {
        setComment(drawState.comments[pos?.join(',')] || '')
    })

    const commentRef = useR()
    return <Style>
        <InfoBody>
            <InfoSection>
                <textarea
                ref={commentRef} id="comment"
                rows={commentLines} spellCheck='false'
                placeholder={pos ? "add a message" : "select a pixel"}
                readOnly={!pos}
                value={comment} onChange={handle.edit}/>
                <div id="comment-length">{comment ? <>{comment.length}/{commentLength}</> : <>&nbsp;</>}</div>
                <div id="canvas-container">
                    <canvas id="canvas"
                    height={SIZE} width={SIZE}
                    onMouseMove={handle.hover}
                    onPointerDown={handle.select}
                    onPointerUp={handle.select}/>
                </div>
            </InfoSection>
        </InfoBody>
        {/* <input ref={commentRef} id="comment" type="text" placeholder="add comment"
            value={comment} onChange={handle.edit}/> */}
    </Style>
}

const Style = styled(InfoStyles)`

.body, .section {
    display: flex;
    flex-grow: 1;
    align-items: flex-start;
}

#canvas-container {
    width: 100%;
    flex-grow: 1; flex-shrink: 1;
    
    display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start;
    padding: 0;

    canvas {
        background: #f2eee3; // white
        background: white;
        image-rendering: pixelated;
        border: 1px solid black;
    }
}
`