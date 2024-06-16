import React, { Fragment, useState } from 'react';
import styled from 'styled-components';
import { copy } from '../../lib/copy';
import { useE, useEventListener, useF, useR } from '../../lib/hooks';
import { useHashState } from '../../lib/hooks_ext';
import { meta } from '../../lib/meta';
import { useSocket } from '../../lib/socket';
import { store } from '../../lib/store';
import { randAlphanum } from '../../lib/util';
import { ILine, Save } from './board';
import { theme } from './common';

const isMobile = /iPhone|iPod|Android/i.test(navigator.userAgent);

const PAD = 1

// function pos(abs: {clientX: number, clientY: number}): IPos {
//     const board: HTMLElement = document.querySelector('#board');
//     const rect = board.getBoundingClientRect();
//     const containerRect = board.parentElement.getBoundingClientRect();
//     const scale = Math.min(containerRect.width, containerRect.height) / (SIZE + PAD*2);
//     const off = PAD
//     return new Pos(
//         Math.max(0, Math.min(SIZE,
//             Math.round((abs.clientY - rect.top)/scale - off))),
//         Math.max(0, Math.min(SIZE,
//             Math.round((abs.clientX - rect.left)/scale - off))),)
// }
// function onPointerMove(e) {
//     const point = pos(e)
// }

export const DnbGame = () => {
    const [size, setSize] = useState(5)
    const [players, setPlayers] = useState(2)
    const [save, setSave] = useState(Save.new(size, players))

    // const [hover, setHover]: [ILine, any] = useState(undefined)
    const lineRef = useR()
    const [hints, setHints] = useState(store.get('dnb-hints') ?? true)
    useF(hints, () => store.set('dnb-hints', hints))

    const handle = {
        resize: () => {
            const board: HTMLElement = document.querySelector('#board');
            board.style.width = '0px'
            board.style.height = '0px'
            const containerRect = board.parentElement.getBoundingClientRect();

            const size = Math.min(containerRect.width, containerRect.height);
            board.style.width = size + 'px';
            board.style.height = size + 'px';
        },
        hover: (line: ILine) => {
            // setHover(line)
        },
        down: (line?: ILine) => {
            // if (!line) line = hover
            hints && setHints(false)
            if (line) {
                if (!line.drawn) {
                    // setHover(undefined)
                    handle.save(save.play(line))
                }
            }
        },
        save: (newSave: Save) => {
            setSave(newSave)
            socket?.emit('dnb:play', hash, newSave.serialize())
        }
    }
    useF(handle.resize)
    useEventListener(window, 'resize', handle.resize, false)

    useF(size, players, () => handle.save(Save.new(size, players)))

    const socket = useSocket({
        on: {
            'dnb:play': play => {
                setSave(Save.deserialize(play))
            },
            'connect': () => socket?.emit('dnb:hash', hash),
        }
    })

    // const [hash, setHash] = useState(window.location.hash?.slice(1) || randAlphanum(7))
    const [hash, setHash] = useHashState({
        empty: randAlphanum(7),
        sep: '/#',
        push: false,
    })
    useF(socket, hash, () => socket?.emit('dnb:hash', hash))

    const slash = location.href.includes('dots-and-boxes')
            ? '/dots-and-boxes'
            : '/dnb'
    useE(slash, () => meta.manifest.set({
        name: slash,
        display: `standalone`,
        start_url: `${window.origin}${slash}`,
    }))

    useF(save, () => {
        if (save.progress.slice(1).reduce((a,b)=>a+b, 0) === save.progress[0]) {
            socket?.emit('dnb:end', hash)
            setConfirm({})
        } else {
            setConfirm(false)
        }
        setPlayers(save.progress.length - 1)
    })

    const player = save.player()
    const isOver = save.progress.slice(1).reduce((a,b)=>a+b, 0) === save.progress[0]
    const [copied, setCopied] = useState(false)
    const [confirm, setConfirm]: any[] = useState(false)
    // const strokeWidth = .1 * (size / 5)
    const strokeWidth = .2
    return <Style>
        <div className={`ui hint-${hints}`}>
            <div className='settings'>
                {confirm ? <>
                    <div className={`confirm`} onClick={() => {
                        const { newSize=size, newPlayers=players } = confirm
                        setConfirm(false)
                        setSize(newSize)
                        setPlayers(newPlayers)
                    }}>
                        new game?
                    </div>
                    <div className={`confirm`} onClick={() => {
                        setConfirm(false)
                    }}>
                        cancel
                    </div>
                </> : <>
                <div className={`size`} onClick={() => {
                    const newSize = isOver
                        ? size
                        : (size+1 - 3)%6 + 3
                    if (save.turn === 0) {
                        setSize(newSize)
                    } else {
                        setConfirm({ newSize })
                    }
                }}>
                    {size}x{size}
                </div>
                <div className={`players`} onClick={() => {
                    const newPlayers = isOver
                        ? players
                        : (players+1 - 2)%(theme.p.length-1) + 2
                    if (save.turn === 0) {
                        setPlayers(newPlayers)
                    } else {
                        setConfirm({ newPlayers })
                    }
                }}>
                    {players} players
                </div>
                </>}
            </div>
            {/* <div className={`players active-${save.turn > 0}`} onClick={() => {
                if (confirm || save.turn === 0) {
                    const newPlayers = isOver
                        ? players
                        : (players+1 - 2)%(theme.p.length-1) + 2
                    setConfirm(false)
                    setPlayers(newPlayers)
                    handle.save(Save.new(size, newPlayers))
                } else {
                    setConfirm(true)
                }
            }}>
                {confirm ? 'new game?' : `${players} players`}
            </div> */}
            {save.progress.slice(1).map((score, p) =>
            <div key={p}
            className={`score p${p+1} player-${isOver || player === p+1}`}>
                {score}
            </div>)}
            {/* <div className={`score p1 player-${isOver || player === Player.p1}`}>
                {save.progress[1]}
            </div>
            <div className={`score`}>
                {save.progress[0] - save.progress[1] - save.progress[2]}
            </div>
            <div className={`score p2 player-${isOver || !isP1}`}>
                {save.progress[2]}
            </div> */}

            <div className={`room`} onClick={e => {
                copy(location.href, e.target)
                setConfirm(false)
                setHints(false)
            }}>
                #{hash}
            </div>
            {/* <div className={`new-game`} onClick={() => {
                setHash(randAlphanum(7))
                setSave(Save.new())
            }}>
                new game
            </div> */}
        </div>
        {/* <canvas id="canvas" height={SIZE} width={SIZE}
            onPointerMove={onPointerMove}/> */}
        <div className="board-container">
        <svg id="board" viewBox={`-.5 -.5 ${save.board.size} ${save.board.size}`}>
            {save.board.dots.flat().map((dot, i) => {
                const c = [dot.col, dot.row]
                return <line key={i}
                    x1={`${c[0]}`} y1={`${c[1]}`}
                    x2={`${c[0]}`} y2={`${c[1]}`}
                    stroke={theme.dots} strokeWidth={strokeWidth}
                    strokeLinecap='round'/>
                // return <circle key={i}
                // className="dot"
                // cx={dot.col} cy={dot.row} r={r}
                // stroke="black" strokeWidth={strokeWidth} fill="transparent" />
            })}
            {save.board.boxes.flat().map((box, i) => {
                const c = [box.col + .5, box.row + .5]
                const off = .2
                const stroke = ['', ...theme.p][box.owner]
                // const stroke = box.owner
                //     ? (box.owner === Player.p1
                //         ? theme.p1
                //         : theme.p2)
                //     : ''
                return box.owner ? <g key={i}>
                    <line
                        x1={`${c[0] - off}`} y1={`${c[1] - off}`}
                        x2={`${c[0] + off}`} y2={`${c[1] + off}`}
                        stroke={stroke} strokeWidth={strokeWidth}
                        strokeLinecap='round'/>
                    <line
                        x1={`${c[0] - off}`} y1={`${c[1] + off}`}
                        x2={`${c[0] + off}`} y2={`${c[1] - off}`}
                        stroke={stroke} strokeWidth={strokeWidth}
                        strokeLinecap='round'/>
                </g> : ''
            })}
            {save.board.lines
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((line, i) => {
                const stroke = ['#0000', ...theme.p][line.drawn]
                // const stroke = line.drawn
                    // ? (line.drawn === Player.p1
                    //     ? theme.p1
                    //     : theme.p2)
                    // : (hover
                    //     && Pos.eq(line.back, hover.back)
                    //     && Pos.eq(line.front, hover.front))
                    // // ? '#0002'
                    // ? (save.player() === Player.p1
                    //     ? `${theme.p1}22`
                    //     : `${theme.p2}22`)
                    // : '#0000'
                const c = [
                    (line.back.col + line.front.col)/2,
                    (line.back.row + line.front.row)/2,]
                return <g key={i} className={`line-group drawn-${line.drawn} p${player}`}>
                    <line className='line'
                        x1={line.back.col} y1={line.back.row}
                        x2={line.front.col} y2={line.front.row}
                        stroke={stroke} strokeWidth={strokeWidth}
                        strokeLinecap='round'/>
                    {/* <polygon
                        onPointerDown={() => handle.down(line)}
                        points={`${line.back.col},${line.back.row}`
                        + (line.right
                            ? ` ${line.right.col + .5},${line.right.row + .5}`
                            : ` ${line.back.col},${line.back.row}`)
                        + ` ${line.front.col},${line.front.row}`
                        + (line.left
                            ? ` ${line.left.col + .5},${line.left.row + .5}`
                            : ` ${line.back.col},${line.back.row}`)}
                        // opacity="0"
                        fill='transparent'
                        stroke='black' strokeWidth=".1"
                        strokeLinecap='round'/> */}
                    <polygon
                        onPointerDown={() => handle.down(line)}
                        points={`${c[0]+.5},${c[1]}`
                        + ` ${c[0]},${c[1]+.5}`
                        + ` ${c[0]-.5},${c[1]}`
                        + ` ${c[0]},${c[1]-.5}`}
                        // opacity="0"
                        fill='transparent'
                        // stroke='black' strokeWidth=".1"
                        strokeLinecap='round'/>
                </g>
            })}
        </svg>
        </div>
    </Style>
}

const Style = styled.div`
height: 100%;
width: 100%;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
background: black;
background: #eee;
background: white;
background: #f8f8f8;
background: ${theme.back};
font-family: Quicksand, sans-serif;

.ui {
    min-height: 6.5rem;
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    padding: .5rem;
    justify-content: center;
    // background: white;
    // background: #eee;
    background: #f8f8f8;
    // background: #00000008;
    text-shadow: none;

    .score {
        height: 3rem;
        width: 3rem;
        font-size: 1.5rem;
        border-radius: .25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: black;
        // color: #fff8;
        margin: 0 .5rem;
        background: #fff;
    }
    ${theme.p.map((color, i) => `
    .score.p${i+1} {
        color: ${color};
        &.player-true {
            color: white;
            background: ${color};
        }
    }
    `)}

    position: relative;
    .room, .settings {
        position: absolute;
        top: .5rem;
    }
    .room, .settings > * {
        color: black;
        background: #0001;
        padding: .2rem .4rem;
        border-radius: .2rem;
        cursor: pointer;
        user-select: none;
        margin-right: .5rem;
    }
    .room {
        // margin-left: 12rem;
        // right: .5rem;
        right: 0;
    }
    .settings {
        // margin-right: 12rem;
        left: .5rem;
        display: flex;
    }
    // .room, .players {
    //     color: black;
    //     background: #0001;
    //     padding: .2rem .4rem;
    //     border-radius: .2rem;
    //     position: absolute;
    //     // right: .5rem;
    //     cursor: pointer;
    //     // font-family: 'Roboto Mono', monospace;
    //     user-select: none;
    //     top: .5rem;
    // }
    // .room {
    //     // margin-left: 12rem;
    //     right: .5rem;
    // }
    // .players {
    //     // margin-right: 12rem;
    //     left: .5rem;
    // }
}
.ui.hint-true {
    .settings::after, .room::after {
        position: absolute;
        font-size: .7rem;
        color: #0006;
        // width: fit-content;
        width: 10rem;
        pointer-events: none;
    }
    .settings::after {
        left: 100%; top: 0;
        content: "← tap to change";
    }
    .room::after {
        right: calc(100% + .5rem); bottom: 0;
        content: "tap to copy →";
        text-align: right;
    }
}
.board-container {
    flex-grow: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

#board {
    background: white;
    background: ${theme.back};
    // background: #f8f8f8;
}

.drawn-0:hover {
    // stroke: black;
    // stroke: #0002;
}

.line-group.drawn-0 {
    cursor: pointer;
}
${isMobile ? '' : theme.p.map((color, i) => `
.line-group.drawn-0.p${i+1}:hover .line {
    stroke: ${color}22;
}
`)}
`