import React, { useState, Fragment } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import api from '../../lib/api'
import { useF, useEventListener, useInterval } from '../../lib/hooks'
import { useAuth } from '../../lib/hooks_ext'
import { InfoStyles} from '../../components/Info'
import { array, randi } from '../../lib/util';
import { getScore, addScore } from '../../lib/scores';
import './fonts.css';

const BASE_SIZE = 8
const DIM = {
  ROWS: 0,
  COLS: 0,
  BOMBS: 0,
}
const setDims = (level=1) => {
  const size = [0, 9, 17, 25][level] // BASE_SIZE * level + 1
  DIM.ROWS = size
  DIM.COLS = size
  DIM.BOMBS = [0, 10, 42, 99][level] // Math.round(size * size / 8)
}
setDims(3)

const level2Name = (level) => ['', 'easy', 'medium', 'hard'][level]

export interface IPos {
  row: number,
  col: number,
}
export class Pos implements IPos {
  row: number; col: number;

  constructor(row: number, col: number) { Object.assign(this, {row, col}); }
  static new = (props: IPos): Pos => new Pos(props.row, props.col)
  static from = (coord: number[]): Pos => new Pos(coord[1], coord[0]);
  static eq = (a: IPos, b: IPos) => (a && b && a.row === b.row && a.col === b.col);
  static add = (a: IPos, b: IPos) => new Pos(a.row + b.row, a.col + b.col);
}

export interface ITile extends IPos {
  shown: boolean,
  count: number,
  flagged: number,
  canClear: boolean,
  isBomb: boolean,
  isFlag: boolean,
}

class Tile extends Pos implements ITile {
  shown: boolean
  count: number
  flagged: number
  canClear: boolean
  isBomb: boolean
  isFlag: boolean
  constructor(row: number, col: number, shown: boolean, count: number, isBomb: boolean, isFlag: boolean) {
    super(row, col)
    this.shown = shown
    this.count = count
    this.flagged = 0
    this.canClear = false
    this.isBomb = isBomb
    this.isFlag = isFlag

  }
  static new(pos: Pos) {
    return new Tile(pos.row, pos.col,
      false,
      0,
      false, // assign bombs after first dig
      // Math.random() < .1, // 10% bombs
      false)
  }
}

class Board {
  board: ITile[][]
  bombs: number
  status: number

  constructor(rows: ITile[][], bombs, status=0) {
      this.board = rows
      this.bombs = bombs
      this.status = status
  }
  static new(level) {
    setDims(level)
    const rows = array(DIM.ROWS, row => array(DIM.COLS, col => {
      return Tile.new({ row, col })
    }));
    return new Board(rows, DIM.BOMBS);
  }
  plant(avoid: Tile) {
    let setBomb
    const avoidAll = [avoid, ...this.adj(avoid)]
    for (let i = 0; i < DIM.BOMBS; i++) {
      do {
        setBomb = this.get({ row: randi(DIM.ROWS), col: randi(DIM.COLS) })
      } while (setBomb.isBomb || avoidAll.some(tile => Pos.eq(tile, setBomb)))
      setBomb.isBomb = true
    }

    this.bombs = this.tiles().filter(t => t.isBomb).length - this.tiles().filter(t => t.isFlag).length

    this.do(tile => {
      tile.count = this.adj(tile).reduce((count, t) => count + (t.isBomb ? 1 : 0), 0)
    })
  }

  get(pos_or_row: (IPos | number), col?: number): ITile {
      const pos = (col === undefined) ? pos_or_row as IPos : { row: pos_or_row as number, col };
      return this.board[pos.row] ? this.board[pos.row][pos.col] : undefined;
  }

  do(func: (tile: ITile, r_i?: number, c_i?: number) => any): any[][] {
      return this.board.map((row, r_i) => row.map((tile, c_i) => func(tile, r_i, c_i)));
  }
  rows(func: (row: ITile[], r_i?: number) => any): any[][] {
      return this.board.map((row, r_i) => func(row, r_i));
  }
  tiles = () => this.board.flat();

  clone(): Board {
      return new Board(this.board, this.bombs, this.status);
  }

  adj(pos: IPos): ITile[] {
      const tiles: ITile[] = [];
      for (let i = -1; i < 2; i++) {
          for (let j = -1; j < 2; j++) {
              if (i === 0 && j === 0) continue;
              tiles.push(this.get({
                  row: pos.row + i,
                  col: pos.col + j
              }));
          }
      }
      return tiles.filter(t => t);
  }
  bfs(pos: IPos): ITile[] {
      const base = this.get(pos)
      if (base.isBomb) {
        return [base]
      }

      // expand while frontier has no adjacent bombs
      const frontier = [base]
      if (base.shown) {
        const flagged = this.adj(base).filter(t => t.isFlag)
        if (flagged.length !== base.count) {
          return []
        }
        const wrong = this.adj(base).filter(t => t.isBomb && !t.isFlag)
        if (wrong.length) {
          return this.adj(base).filter(t => !t.isFlag)
        }
      } else if (base.count) {
        return [base]
      }

      const visible: Set<Tile> = new Set([base])
      while (frontier.length) {
          this.adj(frontier.pop())
              .filter(tile => {
                if (visible.has(tile) || tile.isBomb) return false

                visible.add(tile);
                return tile.count === 0
              })
              .forEach(tile => {
                frontier.push(tile);
              });
      }

      return Array.from(visible);
  }

  isGameover(): boolean {
    return this.status !== 0
  }
}

const FLAG_MS = 150
const pointers = []
const TileElem = ({tile, outer}: {tile: Tile, outer: any}) => {
  const handle = {
    up: e => {
      if (Object.keys(pointers).length > 1) return
      const pointer = pointers[e.pointerId]
      if (pointer) {
        delete pointers[e.pointerId]
        if (Pos.eq(tile, pointer.tile)) {
          if (Date.now() - pointer.ms > FLAG_MS) {
            outer.flag(tile)
          } else {
            outer.dig(tile)
          }
        }
      }
    },
  }
  return <div className={["tile",
    tile.shown ? 'shown' : '',
    tile.isBomb ? 'bomb' : '',
    tile.isFlag ? 'flag' : '',
    // tile.count && tile.count === tile.flagged ? 'flagged' : '',
    // tile.canClear ? 'clear' : '',
    `c${tile.count}`
    ].join(' ')}
    // onClick={e => {
    //   outer.dig(tile)
    // }}>
    onPointerDown={e => {
      pointers[e.pointerId] = { tile, ms: Date.now() }
      setTimeout(() => handle.up(e), FLAG_MS * 1.1)
      // outer.dig(tile)
    }}
    onPointerUp={e => { handle.up(e) }}
    onPointerCancel={e => { delete pointers[e.pointerId] }}
    onPointerLeave={e => { delete pointers[e.pointerId] }}
    onContextMenuCapture={e => {
      outer.flag(tile)
      e.preventDefault()
      Object.keys(pointers).forEach(key => delete pointers[key])
    }}>

    {tile.isFlag ? '⚑' :
     tile.isBomb ? '×' : // ✖
     tile.count}
  </div>
}

let tilePx = 8;
const RowElem = ({row, outer}: {row: Tile[], outer: any}) => {
  return <div className="tile-row" style={{height: `${tilePx}px`}}>
    {row.map((t, i) => <TileElem key={i} tile={t} outer={outer} />)}
  </div>
}

const BoardElem = ({board, outer}: {board: Board, outer: any}) => {
  const handle = {
    resize: () => {
      const board: HTMLElement = document.querySelector('.board')
      const containerRect = board.parentElement.getBoundingClientRect()

      const ratio = DIM.ROWS / DIM.COLS
      const width = Math.min(containerRect.width, containerRect.height / ratio)
      board.style.width = width + 'px'
      board.style.height = width * ratio + 'px'
      tilePx = width / DIM.COLS
    }
  }

  useF(handle.resize)
  useEventListener(window, 'resize', handle.resize)

  return <div className="board-container">
    <div className="board">
      {board.rows((row, i) => <RowElem key={i} row={row} outer={outer} />)}
    </div>
  </div>
}

export default () => {
  const auth = useAuth();
  const [board, setBoard] = useState<Board>(undefined)
  const [start, setStart] = useState(0)
  const [timer, setTimer] = useState(0)
  const [level, setLevel] = useState(1)
  const [scores, setScores] = useState(undefined)
  const [revealTimeout, setRevealTimeout] = useState(undefined)

  const handle = {
    new: (level: number) => {
      if (revealTimeout) {
        clearTimeout(revealTimeout)
        setRevealTimeout(undefined)
      }
      setStart(0)
      setTimer(0)
      setLevel(level)
      setBoard(Board.new(level))
    },
    reload: () => {
      setBoard(board.clone())
    },
    dig: (tile: Tile) => {
      if (board.isGameover()) return

      if (!start) {
        // assign set number of bombs
        board.plant(tile);
        setStart(Date.now())
      }

      if (tile.isFlag) {
        handle.flag(tile)
      } else {
        // console.log('dig', tile)
        const bombs = board.bfs(tile).filter(t => {
          t.shown = true
          // handle.adjustClear(board, t)
          return t.isBomb
        })
        // handle.adjustClear(board, tile)
        if (bombs.length) {
          setRevealTimeout(setTimeout(() => {
            board.do(tile => {
              if (tile.isBomb || tile.isFlag) {
                tile.shown = true
              }
            })
            handle.reload()
          }, 1000));
          console.debug('game over')
          board.status = -1
        } else if (board.tiles().every(tile => tile.isBomb !== tile.shown)) {
          const final = Math.round((Date.now() - start) / 100) / 10
          board.status = final
          console.debug('game won')
          addScore(`minesweeper+${level2Name(level)}`, final, false).then(data => {
            // console.log(data)
            setScores(data)
          })
        }
      }

      handle.reload()
    },
    flag: (tile: Tile) => {
      if (board.isGameover()) return

      if (!start) {
        handle.dig(tile)
        return
      }

      if (!tile.shown) {
        tile.isFlag = !tile.isFlag;
        board.bombs += tile.isFlag ? -1 : 1;
        // board.adj(tile).forEach(adj => {
        //   adj.flagged += 1
        //   handle.adjustClear(board, adj)
        // })
      }
      handle.reload()
    },
    // adjustClear: (board: Board, around: Tile) => {
    //   const hidden = board.adj(around).filter(t => !t.shown)
    //   around.canClear = around.count && around.count === around.flagged && around.flagged < hidden.length
    // }
  }

  useF(() => {
    // init for largest size first to fix resizing issue
    handle.new(3)
    setTimeout(() => handle.new(1))
  })
  useF(auth.user, () => {
    auth.user && api.post('profile/checkin/minesweep')
  })
  useInterval(() => {
    if (start && !board.isGameover()) {
      setTimer(Date.now() - start)
    }
  }, 10)
  useEventListener(window, 'keydown', e => {
    if (e.key === 'r') handle.new(level)
  })

  useF(level, () => {
    getScore(`minesweeper+${level2Name(level)}`).then(data => {
      setScores(data)
    })
  })

  const record = scores ? scores.global.scores[0] : false
  const personal = scores ? scores.user.scores[0] : false
  return <Styles>
    <div className={`body l${level}`}>
    {board ? <>
      <div className="header">
        <div className="bombs">
            {board.bombs}
        </div>
        <div className={`status
          ${board.isGameover() ? 'over' : ''}
          ${board.status < 0 ? 'loss' : ''}
          ${board.status > 0 ? 'win' : ''}`}
          onClick={() => handle.new(level)}>
          <div className="target">
            {board.status === 0
            ? ':)'
            : board.status < 0
            ? ':/'
            : ':D'}
          </div>
        </div>
        <div className="timer">
          {board.status > 0
          ? board.status
          : board.status < 0
          ? Math.round(timer / 100) / 10
          : Math.round(timer / 1000)}s
        </div>
      </div>
      <BoardElem board={board} outer={handle} />
      <div className="footer">
        <div className="scores">
          {/* your best: {personal ? `${personal.score}s` : 'none'} */}

          {/* <Link to={`/records/minesweep+${level2Name(level)}`}>your best</Link>: {personal ? `${personal.score}s` : 'none'}
          <br />
          <Link to={`/records/minesweep+${level2Name(level)}`}>global</Link>: {record
          ? <span>{record.score}s (<Link to={`/u/${record.user}`}>{record.user}</Link>)</span> //`${record.score}s (${record.user})`
          : 'none'} */}

          {/* <Link to={`/records/minesweep+${level2Name(level)}`}>your best: {personal ? `${personal.score}s` : 'none'}</Link>
          <br />
          {record
          ? <span>
            <Link to={`/records/minesweep+${level2Name(level)}`}>global: {record.score}s</Link>{' '}
            (<Link to={`/u/${record.user}`}>{record.user}</Link>)
          </span>
          : 'global: none'} */}

          <Link className='hidden' to={`/records/minesweeper+${level2Name(level)}`}>
            <span className='ul'>your best</span>: {personal ? `${personal.score}s` : 'none'}
          </Link>
          <br />
          {record
          ? <span>
            <Link className='hidden' to={`/records/minesweeper+${level2Name(level)}`}>
              <span className='ul'>global</span>: {record.score}s
            </Link>{' '}
            (<Link className='hidden' to={`/u/${record.user}`}>{record.user}</Link>)
          </span>
          : 'global: none'}
        </div>
        <div className="level">
          {[1, 2, 3].map(l => <div key={l} className={l === level ? 'selected' : ''} onClick={e => {
            handle.new(l)
          }}>
            {level2Name(l)}
          </div>)}
        </div>
      </div>
    </> : ''}
    </div>
  </Styles>
}

const Styles = styled(InfoStyles)`
height: 100%;
width: 100%;
background: #201624;
display: flex;
flex-direction: row;
justify-content: center;
align-content: center;
// padding: 1rem;

a, a:hover {
  color: inherit;
}
a, .ul {
  text-decoration: underline;
  cursor: pointer;
}
a.hidden {
  text-decoration: none;
}
a:hover, a:hover * {
  text-decoration: none !important;
  background: white !important;
  color: black !important;
}

.body {
  height: 100%;
  width: 100%;
  max-width: 30rem;
  display: flex;
  flex-direction: column;
}

.body.l1 .tile {
  font-size: 1.35rem;
  &.flag, &.bomb { font-size: 2rem; }
}
.body.l2 .tile {
  font-size: 1rem;
  &.flag, &.bomb { font-size: 1.5rem; }
}
.body.l3 .tile {
  font-size: .8rem;
  &.flag, &.bomb { font-size: 1rem; }
}

.footer {
  color: white;
  font-size: .8rem;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: .5rem;
  .scores {
    white-space: pre;
  }
  .level {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    > * {
      margin-right: .5rem;
      cursor: pointer;
      &:hover, &.selected {
        background: white;
        color: black;
      }
    }
  }
}

.header {
  margin-bottom: .5rem;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  color: white;
  position: relative;
  .loss {
    color: red;
  }
  .win {
    color: #57bb8a;
  }
  > .status {
    position: absolute;
    width: 100%;
    height: 100%;
    text-align: center;
    .target {
      cursor: pointer;
      width: fit-content;
      margin: auto;
      padding: 0 .25rem;
      background: #fff1;
      border-radius: .25rem;
    }
    .target:hover, &.over .target {
      padding: 0 2rem 0 .25rem;
    }
    .target:hover::after, &.over .target::after {
      position: absolute;
      top: 0;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      content: "↻";
      color: white;
      margin-left: 2rem;
      opacity: .5;
      line-height: max(1rem, 20px);
      font-size: max(1rem, 20px);
    }
  }
  .bombs, .timer {
    background: #fff1;
    padding: 0 .25rem;
    border-radius: .25rem;
    min-width: 2.5rem;
    text-align: center;
  }
}

.board-container {
  width: 100%;
  flex-grow: 1;
  margin: 0 auto;
}

.board {
  font-family: 'Rubik', sans-serif;
  display: flex;
  flex-direction: column;
  border: 1px solid #fff2;
  box-sizing: content-box;
  // border: 4px solid #fff2;
  // box-sizing: content-box;

  // border-bottom: 4px solid #2a2a2a;
  // border-right: 4px solid #2a2a2a;
}

.tile-row {
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  // flex-shrink: 1;
  // height: 1px;
  line-height: 0;
}

.tile {
  width: 16px;
  height: 100%;
  flex-grow: 1;
  border: 1px solid black;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  text-shadow: none;
  user-select: none;

  background: black;
  border-color: #111;
  border-width: 1px;
  color: transparent;

  // border-left: 4px solid #444;
  // border-top: 4px solid #444;
  // background: #222;
  // border-bottom: 4px solid black;
  // border-right: 4px solid black;

  background: #080808;
  border: .2rem solid #ffffff08;
  border-bottom-color: black;
  border-right-color: black;

  // &:hover:not(.shown) {
  //   background: #181818;
  // }

  &.shown {
    // &.clear:hover {
    //   filter: brightness(1.15);
    //   cursor: pointer;
    // }
    // cursor: default;

    &:not(.flag) {
      // border-width: 1px;
      // background: white;
      // font-size: .8rem;
      background: #111;
      // background: white;
      // border-color: #0002;
      border-color: #161616;

      background: #222;
      border-color: #2a2a2a;

      // border-left: 4px solid #2a2a2a;
      // border-top: 4px solid #2a2a2a;
      // background: #222;
      // border-bottom: none;//4px solid #2a2a2a;
      // border-right: none;//4px solid #2a2a2a;

      background: #222c;
      border-width: 1px;
      border-color: #0001;
    }

    &.c0 {
      color: transparent;
      text-shadow: none;
      cursor: default;
      // border-color: transparent;
      // background: white;
    }
    &.c1 { color: #57bb8a; }
    &.c2 { color: #9ace6a; }
    &.c3 { color: #ffcf02; }
    &.c4 { color: #ff9f02; }
    &.c5 { color: #ff6f31; }
    color: #ff6f31;
    // &.c1 { background: #57bb8a; }
    // &.c2 { background: #9ace6a; }
    // &.c3 { background: #ffcf02; }
    // &.c4 { background: #ff9f02; }
    // &.c5 { background: #ff6f31; }

    position: relative;
    &.bomb {
      // background: black;
      // border-color: #111;
      color: #e04444;
      background: #111;
      border-color: #111;
      // &:not(.flag)::after {
      //   content: "";
      //   width: 70%;
      //   height: 70%;
      //   border: 2px solid #e04444;
      //   position: absolute;
      //   border-radius: 50%;
      // }
      // background: #181818;
      // border: .2rem solid #ffffff02;
      // border-top-color: #0001;
      // border-left-color: #0001;
    }
    &.flag:not(.bomb) {
      // background: black;
      // border-color: #111;
      color: white;
      &::after {
        display: none;
      }
      // &::after {
      //   content: "";
      //   width: 70%;
      //   height: 70%;
      //   border: 2px solid white;
      //   position: absolute;
      //   border-radius: 50%;
      // }
    }
  }

  &.flag {
    color: #e04444; //#f22e2e;
    font-size: 2rem;
  }
}
`