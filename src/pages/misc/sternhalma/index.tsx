import React, { useState } from 'react';
import styled from 'styled-components';
import { useR } from '../../../lib/hooks';
import { useAuth } from '../../../lib/hooks_ext';

enum Player { none=-1, p1=0, p2=1, p3=2, p4=3, p5=4, p6=5 }
const Color = {
    none: '#ffffff66',
    hover: '#00000044',
    red: 'red',
    blue: 'blue',
    green: 'green',
    purple: 'purple',
    black: 'black',
    white: 'white',
}

const Dirs = [
    [ 1,  0],
    [-1,  0],
    [-1,  1],
    [ 1, -1],
    [ 0,  1],
    [ 0, -1],
]
class Hole {
    index: [number, number]
    pos?: [number, number]
    player?: Player
    goal?: Player

    constructor(props: Hole) {
        Object.assign(this, props)
    }

    static hash(hole: Hole): string {
        return hole.index.join(',')
    }
    static adj(board: { [key:string]: Hole }, hole: Hole): Hole[] {
        // console.log(board)
        let holes = Dirs.map(p => board[Hole.hash({ index: [p[0] + hole.index[0], p[1] + hole.index[1]] })]).filter(h => h)
        // console.log(holes)
        return holes
    }
    static moves(board: { [key:string]: Hole }, hole: Hole): Hole[] {
        let { index, player } = hole
        let moves = []
        Dirs.forEach(dir => {
            let adj = board[Hole.hash({ index: [dir[0] + index[0], dir[1] + index[1]] })]
            if (!adj) return

            if (adj.player === Player.none) {
                moves.push(adj)
            } else {
                let jump = board[Hole.hash({ index: [dir[0] + adj.index[0], dir[1] + adj.index[1]] })]
                if (jump && jump.player === Player.none) {
                    moves.push(jump)
                    jump.player = player
                    moves.push(...Hole.jumps(board, jump))
                    jump.player = Player.none
                }
            }
        })
        return moves
    }
    static jumps(board: { [key:string]: Hole }, hole: Hole): Hole[] {
        let { index, player } = hole
        let jumps = []
        Dirs.forEach(dir => {
            let adj = board[Hole.hash({ index: [dir[0] + index[0], dir[1] + index[1]] })]
            if (!adj) return
            if (adj.player !== Player.none) {
                let jump = board[Hole.hash({ index: [dir[0] + adj.index[0], dir[1] + adj.index[1]] })]
                if (jump && jump.player === Player.none) {
                    jumps.push(jump)
                    jump.player = player
                    jumps.push(...Hole.jumps(board, jump))
                    jump.player = Player.none
                }
            }
        })
        return jumps
    }
}
class Save {
    board: { [key:string]: Hole }
    turn: number
    state: number
    colors: string[]
    n: number
    player: number

    constructor(n: number) {
        this.board = {}
        this.colors = [Color.red, Color.blue]
        this.colors[-1] = Color.none
        this.n = n
        this.player = Player.p1
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                let hole = new Hole({
                    index: [i, j],
                    pos: [i - j, (j + i - 8)/.58],
                    player: Player.none,
                })

                if (4 < j + i - 8) {
                    hole.player = Player.p1
                    hole.goal = Player.p2
                }
                if (j + i - 8 < -4) {
                    hole.player = Player.p2
                    hole.goal = Player.p1
                }

                this.board[Hole.hash(hole)] = hole
                // if (-5 < i - j && i - j < 5) {

                // }
            }
        }
    }
}

const BoardEl = ({save}: {
    save: Save,
}) => {
    const svgRef = useR()
    const [p, setP] = useState([])
    const [hovered, setHovered] = useState(undefined)
    const [moves, setMoves] = useState(undefined)
    const [selected, setSelected] = useState(undefined)

    const handle = {
        move: (x, y) => {
            let rect = svgRef.current.getBoundingClientRect();
            let mid = [
              rect.width / 2 + rect.left,
              rect.height / 2 + rect.top
            ];
            let pX = x - mid[0]
            let pY = y - mid[1]

            let width, height
            let aspect = rect.width / rect.height
            if (aspect < 1) {
                width = 18;
                height = width / aspect
            } else {
                height = 30;
                width = height * aspect;
            }

            let p = [(width / rect.width) * pX, (height / rect.height) * pY]
            // console.log(p)
            setP(p)
        },
        select: hole => {
            let canMove = hole.player === save.player
            if (selected) {
                handle.unselect(hole)
            } else if (canMove) {
                setSelected(hole)
                setMoves(Hole.moves(save.board, hole))
                setHovered(undefined)
            }
        },
        unselect: hole => {
            if (selected) {
                if (moves.includes(hole)) {
                    save.board[Hole.hash(hole)].player = selected.player
                    save.board[Hole.hash(selected)].player = Player.none
                    save.player = (save.player + 1) % save.n
                }
                setSelected(undefined)
                setMoves(undefined)
            }
        },
    }

    return (
        <svg ref={svgRef} id="board" viewBox="-9 -15 18 30" xmlns="http://www.w3.org/2000/svg"
            onPointerMove={e => handle.move(e.clientX, e.clientY)}
            onTouchMove={e => handle.move(e.touches[0].clientX, e.touches[0].clientY)}
            >
        {Object.values(save.board).map((hole, i) => {
            let isSelected = selected && Hole.hash(selected) === Hole.hash(hole)
            let pos = hole.pos
            let canMove = hole.player === save.player
            return (
            <circle cx={pos[0]} cy={pos[1]} r={.72}
                style={{
                    fill: isSelected ? Color.none : save.colors[hole.player]
                }}
                onPointerEnter={e => {
                    if (!hovered && canMove) {
                        if (selected) {
                            if (isSelected || moves.includes(hole)) {
                                setHovered(hole)
                            }
                        } else {
                            setHovered(hole)
                        }
                        if (!selected) {
                            setMoves(Hole.moves(save.board, hole))
                        }
                    }
                }}
                onPointerLeave={e => {
                    setHovered(false)
                    if (!selected) {
                        setMoves(false)
                    }
                }}
                onPointerDown={e => handle.select(hole)}
                onPointerUp={e => handle.unselect(hole)}
                key={i}/>
            )

        })}
        {!moves ? '' : moves.map((hole, i) =>
            <circle cx={hole.pos[0]} cy={hole.pos[1]} r={.36} style={{
                fill: Color.hover,
                pointerEvents: 'none',
            }} key={i}/>)}
        {!selected ? '' : (() => {
            let pos = hovered ? hovered.pos : p
            return <circle cx={pos[0]} cy={pos[1]} r={.72} style={{
                fill: save.colors[selected.player],
                pointerEvents: 'none',
            }}/>
        })()}
    </svg>
    )
}

export default () => {
    const auth = useAuth();
    const [save, setSave] = useState(new Save(2))

    const handle = {

    }

    return <Style>
        <BoardEl save={save} />
    </Style>
}

const Style = styled.div`
    width: 100%; height: 100%;
    display: flex;

    #board {
        width: 100%; height: 100%;
    }
`
