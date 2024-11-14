import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useEventListener, useF, useInput, useR, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { store } from 'src/lib/store'
import { useRoom } from 'src/lib/socket'
import { S } from 'src/lib/util'
import url from 'src/lib/url'

const { named_log, on, V, M, A, list, set, range, pass, maths, Q, node, strings, copy, display_status, rand } = window as any
const NAME = 'chess'
const log = named_log(NAME)

// #region tile definitions
const DIM = V.ne(8, 8)
const PIECES = list(`♟♞♝♜♛♚♔♕♖♗♘♙`, '')
const SPAWN = [
  '♜♞♝♛♚♝♞♜',
  '♟♟♟♟♟♟♟♟',
  '        ',
  '        ',
  '        ',
  '        ',
  '♙♙♙♙♙♙♙♙',
  '♖♘♗♕♔♗♘♖',
]
const BLACK = set(PIECES.slice(0, PIECES.length / 2))
const WHITE = set(PIECES.slice(PIECES.length / 2))
const Tile = {
  new: (r, c, piece=SPAWN[r][c]) => {
    return {
      v: V.ne(c, r),
      piece,
      owner: !piece.trim() ? -1 : WHITE.has(piece) ? 0 : 1,
      moved: false,
      black: Boolean((r + c) % 2),
    }
  },
  eq: (a, b) => a === b || (a && b && V.eq(a.v, b.v)),
  index: (ar, x) => ar.findIndex(y => Tile.eq(x, y)),
  in: (ar, x) => Tile.index(ar, x) > -1,
  adj: (a, b=undefined) => 
    b 
    ? !Tile.eq(a, b) && V.l2(a.v, b.v) < Math.sqrt(2) * 1.1 
    : range(8).map(i => ({v:V.ne(V.ad(a.v, V.p(i/8 * A.TAU)).map(Math.round))})),
  cardinal: (a, b=undefined) => 
    b 
    ? !Tile.eq(a, b) && V.l1(a.v, b.v) === 1
    : range(4).map(i => ({v:V.ne(V.ad(a.v, V.p(i/4 * A.TAU)).map(Math.round))})),  
  owned: (t, owner) => t.owner === owner%2,

  at: (B, t, ...x) => {
    const actual = B[t.v[1]] && B[t.v[1]][t.v[0]]
    return actual ? Object.assign(actual, ...x) : { v:t.v, piece:'' }
  },
  flat: (B) => B.flatMap(pass),
}
// #endregion

// #region chess definitions
const PIECE_SETS = list(PIECES).slice(0, PIECES.length / 2).map((x, i) => set([x, PIECES.at(-1 - i)]))
const Chess = {
  owned: (board, owner) => {
    return Tile.flat(board).filter(x => x.owner === owner)
  },
  pawns: (board, x) => {
    // add en passant
    const angle = (x.owner === 0 ? 3 : 1) * (1 / 4 * maths.TAU)
    const basis = V.ne(V.p(angle, 1).map(Math.round))
    const left = V.ne(basis.ad(V.p(angle + maths.TAU / 4, 1)).map(Math.round))
    const right = V.ne(basis.ad(V.p(angle - maths.TAU / 4, 1)).map(Math.round))
    const forward = V.ne(basis.ad(V.p(angle, 1)).map(Math.round))
    const en_left = V.ne(V.p(angle + maths.TAU / 4, 1).map(Math.round))
    const en_right = V.ne(V.p(angle - maths.TAU / 4, 1).map(Math.round))

    let tiles = []
    const v_x = V.ne(x.v)
    ;[basis, forward].some((offset, i) => {
      const v = v_x.ad(offset)
      const is_white = x.owner === 0
      const t = { v, en_passant: i === 1, promotion: (v.y === (is_white ? 0 : 7)) && (is_white ? '♕' : '♛' ) }
      const actual = Tile.at(board, t)
      if (actual?.owner === -1 && (i < 1 || x.moved === false)) {
        tiles.push(t)
      } else return true
    })
    ;[left, right].some(offset => {
      const v = v_x.ad(offset)
      const t = { v }
      const actual = Tile.at(board, t)
      if (actual?.owner !== -1 && actual?.owner !== x.owner) {
        tiles.push(t)
      }
    })
    ;[en_left, en_right].some(offset => {
      const v = v_x.ad(offset)
      const t = { v }
      const actual = Tile.at(board, t)
      if (actual?.owner !== -1 && actual?.owner !== x.owner && actual.en_passant) {
        tiles.push({ v:v_x.ad(basis, offset), capture:{v} })
      }
    })
    log({tiles})
    return tiles
  },
  ls: (board, x, move=7) => {
    let tiles = []
    const v_x = V.ne(x.v)
    range(4).map(i => {
      const angle = (i / 4) * maths.TAU
      const basis = V.p(angle, 2)
      const left = V.ne(basis.ad(V.p(angle + maths.TAU / 4, 1)).map(Math.round))
      const right = V.ne(basis.ad(V.p(angle - maths.TAU / 4, 1)).map(Math.round))
      ;[left, right].map(offset => {
        const v = v_x.ad(offset)
        const t = { v }
        const actual = Tile.at(board, t)
        if (actual?.owner !== x.owner) {
            tiles.push(t)
        }
      })
    })
    return tiles
  },
  diagonals: (board, x, move=7) => {
    let tiles = []
    const v_x = V.ne(x.v)
    range(4).map(i => {
      const direction = V.ne(V.p((i / 4) * maths.TAU + maths.TAU / 8, Math.sqrt(2)).map(Math.round))
      range(move).some(j => {
        const t = { v:V.ad(v_x, direction.sc(j + 1)) }
        const actual = Tile.at(board, t)
        // log(t, actual)
        if (actual?.owner === x.owner) return true
        tiles.push(t)
        if (!actual || actual.piece.trim()) return true
      })
    })
    return tiles
  },
  straights: (board, x, move=7) => {
    // const id = x.v.st()
    // if (Chess._straights[id]) return Chess._straights[id]

    let tiles = []
    const v_x = V.ne(x.v)
    range(4).map(i => {
      const direction = V.ne(V.p((i / 4) * maths.TAU, 1).map(Math.round))
      range(move).some(j => {
        const t = { v:V.ad(v_x, direction.sc(j + 1)) }
        const actual = Tile.at(board, t)
        if (actual?.owner === x.owner) return true
        tiles.push(t)
        if (!actual || actual.piece.trim()) return true
      })
    })
    return tiles
  }, _straights: {},
  castles: (board, x) => {
    let inputs
    if (x.owner === 1) {
      inputs = [
        [V.ne(4, 0), V.ne(0, 0), range(3).map(i => V.ne(1 + i, 0)), V.ne(2, 0), V.ne(3, 0)],
        [V.ne(4, 0), V.ne(7, 0), range(2).map(i => V.ne(5 + i, 0)), V.ne(6, 0), V.ne(5, 0)]
      ]
    } else {
      inputs = [
        [V.ne(4, 7), V.ne(0, 7), range(3).map(i => V.ne(1 + i, 7)), V.ne(2, 7), V.ne(3, 7)],
        [V.ne(4, 7), V.ne(7, 7), range(2).map(i => V.ne(5 + i, 7)), V.ne(6, 7), V.ne(5, 7)]
      ]
    }

    let tiles = []
    const v_x = V.ne(x.v)
    inputs.map(([king, rook, clear, move, rook_move]) => {
      const actual_king = Tile.at(board, { v:king })
      const actual_rook = Tile.at(board, { v:rook })
      const actual_clear = clear.map(v => Tile.at(board, { v }))
      if (actual_king.moved || actual_rook.moved) return
      if (actual_clear.some(x => x.piece.trim())) return
      const actual_rook_move = Tile.at(board, { v:rook_move })
      tiles.push({ v:move, castle: [actual_rook, actual_rook_move] })
    })
    return tiles
  },
  moves: (x, board) => {
    // return Tile.adj(x)
    let moves
    if (PIECE_SETS[0].has(x.piece)) {
      moves = Chess.pawns(board, x)
    } else if (PIECE_SETS[1].has(x.piece)) {
      moves = Chess.ls(board, x)
    } else if (PIECE_SETS[2].has(x.piece)) {
      moves = Chess.diagonals(board, x)
    } else if (PIECE_SETS[3].has(x.piece)) {
      moves = Chess.straights(board, x)
    } else if (PIECE_SETS[4].has(x.piece)) {
      moves = [].concat(Chess.diagonals(board, x), Chess.straights(board, x))
    } else if (PIECE_SETS[5].has(x.piece)) {
      // add castling
      moves = [].concat(Chess.diagonals(board, x, 1), Chess.straights(board, x, 1), Chess.castles(board, x))
    } else {
      moves = [] // Tile.adj(x)
    }
    return moves.map(move => ({ ...Tile.at(board, move), ...move })).filter(x => x.piece)
  },
  valid: (play, board) => {
    if (play.length !== 2) return false
    const [start, end] = play
    return Chess.moves(start, board).map(x => V.st(x.v)).includes(V.st(end.v))
  },
  checks: (board, owner) => {
    const pieces = Chess.owned(board, owner)
    const moves = pieces.flatMap(piece => Chess.moves(piece, board).map(move => Tile.at(board, move)).filter(x => x.piece))
    const checks = moves.filter(move => {
      return move && PIECE_SETS[5].has(move.piece) && move.owner !== owner
    })
    return checks
  },
  winner: (state) => state.status > -1 ? state.status : undefined,
}
// #endregions

// #region state
const util = {
  _spellcheck: true,
  // _spellcheck: false,
  // word: (str) => (util._spellcheck ? dict.words[str] : str.length) && !state.plays.some(play => str === play.map(t => t.piece).join('')),
  valid: (play, board) => {
      if (play.length !== 2) return false

      const start = play[0]
      const end = play[1]
      return Chess.moves(start, board).map(x => V.st(x.v)).includes(V.st(end.v))
      // if (PIECE_SETS[0].has(start.piece)) {
      //     return V.ad(V.ne(start.v), V.ne(V.p(maths.TAU / 2 * (state.turn % 2)))).ad(V.ne(end.v).sc(-1)).ma() == 0;
      // }

      // if (PIECE_SETS[6].has(start.piece)) {
      //     const direction = V.ad(V.ne(start.v).sc(-1), V.ne(end.v)).bo(1, Math.sqrt(2))
      //     const DISTS = [1, Math.sqrt(2)]
      //     const spaces = range(8).map(i => {
      //         const direction = V.p((i / 8) * maths.TAU, DISTS[i%2])
      //         return 
      //     })
      // }

      return play.length === 2
  },
  
}
// #endregion

let down = false
export default () => {
  useEventListener(window, 'pointerup', () => down = false)

  const [last_room, set_last_room] = store.use('chess-last_room', { default:undefined })
  const [room, set_room] = usePathState()
  const [state, set_state] = store.use('chess-state', { defaulter:() => ({
    board: M.ne(range(13).map(r => range(10).map(c => Tile.new(r, c, '')))),
    players: [],
    turn: -1,
    status: -1,
    selected: [],
    checks: [],
    plays: [],
    chat: [],
  }) })
  const assign_state = (new_fields) => {
    const new_state = { ...state, ...new_fields }
    set_state(new_state)
    api.post(`/chess/state/${room}`, { state:new_state })
  }
  useRoom({
    room: `chess:${room}`,
    on: {
      [`chess:${room}:update`]: (new_state) => set_state(new_state),
    },
  })
  useF(room, async () => {
    if (room) {
      set_last_room(room)
      const { state:new_state } = await api.get(`/chess/state/${room}`)
      log({ room, new_state })
      if (new_state) {
        set_state(new_state)
      } else {
        handle.generate()
      }
    } else {
      set_room(last_room || rand.unambiguous(6))
      // handle.generate()
    }
  })

  const render = {
    board: (state, board=Q('#board')) => {
      board.innerHTML = ''

      const selected = state.selected
      const owned = Tile.flat(state.board).filter(x => x.owner === state.turn % 2)
      let selectable
      if (!selected.length) {
        selectable = owned
      } else {
        const last = selected.at(-1)
        selectable = [].concat(Chess.moves(last, state.board), selected)
      }
      const selectable_set = set(selectable.map(x => V.st(x.v)))

      const display_board = strings.json.clone(state.board)
      let highlighted
      if (selected.length === 1) {
        highlighted = selectable
      } else if (selected.length > 1) {
        const start = selected.at(0)
        const end = selected.at(-1)
        highlighted = [end]
        display_board[start.v[1]][start.v[0]].piece = ' '
        display_board[end.v[1]][end.v[0]].piece = start.piece
        if (end.castle) {
          const [rook, rook_move] = end.castle
          display_board[rook_move.v[1]][rook_move.v[0]].piece = rook.piece
          display_board[rook.v[1]][rook.v[0]].piece = ' '
        }
        if (end.capture) {
          const capture = end.capture
          display_board[capture.v[1]][capture.v[0]].piece = ' '
        }
        if (end.promotion) {
          display_board[end.v[1]][end.v[0]].piece = end.promotion
        }
      } else {
        highlighted = []
      }
      const highlighted_set = set(highlighted.map(x => V.st(x.v)))

      const check_set = set(state.checks.map(x => V.st(x.v)))

      display_board.map((row, r_i) => {
        const row_l = node(`<div class="row"></div>`)
        row.map((tile, c_i) => {
          const id = V.st(tile.v)
          const data_tile = `data-tile="${id}"`
          const player = state.players[tile.owner]
          
          const tile_l = node(`<span class="${`tile p${tile.owner} selectable-${selectable_set.has(id)} highlighted-${highlighted_set.has(id) || check_set.has(id)}`}" ${data_tile} style="
          background: ${tile.black ? state.color : '#fff'};
          ${Tile.in(state.selected, tile)
            ?
            `
            filter: invert(1);  
            `
            : tile.bomb 
            ? `
            background: #000; color: #fff;
            `
            :''}
          ">${tile.piece}</span>`)

          on(tile_l, 'pointerdown', () => {
            handle.select(state, tile)
            down = tile
          })
          on(tile_l, 'pointerenter', () => {
            if (down && !Tile.eq(down, tile)) handle.select(tile, true)
          })

          row_l.append(tile_l)
        })
        board.append(row_l)
      })
    },
    ui: (state, ui=Q('#ui')) => {
      const winner = Chess.winner(state)
      const gameover = winner !== undefined

      let buttons
      const buttons_shown = {
        play: !gameover && Chess.valid(state.selected, state.board),
        new_game: gameover,
        rotate: undefined,
      }
      buttons_shown.rotate = state.selected.length === 0 && state.turn < 2 && !(buttons_shown.play || buttons_shown.new_game)
      const selected = state.selected.map(x => x.piece).join('')
      let rotate = 0
      Object.entries({
        ...(selected ? { 
          cancel: () => {
            handle.unselect(state)
          }
        } : {}),
        'play': buttons_shown.play ? () => handle.play(state) : null,
        'new game': buttons_shown.new_game ? () => handle.generate() : null,
        // 'rotate': buttons_shown.rotate ? () => {
        //   document.head.append(node(`
        //   <style>
        //     .tile {
        //     rotate: ${rotate = rotate + 90}deg;
        //     transition: rotate .33s;
        //     }
        //   </style>
        //   `))
        // } : null,
      }).filter(e=>e[1]).map(([k, v]) => {
        const button = node(`
        <button>${k}</button>
        `)
        button.onclick = v
        if (!buttons) buttons = node(`<div id="buttons" class="row gap"></div>`)
        buttons.append(button)
      })
      buttons?.append(node('br'))

      const status = node(`<div id="status" class="row gap"></div>`)
      if (state.status > -1) {
        status.textContent = `${['white', 'black'][state.status]} has won`
      } else if (0&&selected) {
        status.textContent = selected.toUpperCase()
      } else if (state.turn) {
        status.textContent = `${['white', 'black'][(state.turn + 1) % 2]} moved ${state.plays.at(-1).map(x => x.piece).join('').toUpperCase().trim()}`
      } else {
        status.textContent = 'white is making a move'
      }

      ui.innerHTML = ''
      ;[
        buttons,
        status,
      ].map(x => x && ui.append(x))
    },
    all: (state) => {
      const root = Q('#chess-root')
      root.innerHTML = ''
      const board = node(`<div id="board"></div>`)
      const ui = node(`<div id="ui" class="column gap"></div>`)
      ;[board, ui].map(x => root.append(x))
      render.board(state, board)
      render.ui(state, ui)
    }
  }  

  const handle = {
    generate: () => {
      assign_state({
        board: M.ne(range(DIM.y).map(r => range(DIM.x).map(c => Tile.new(r, c)))),
        color: `hsl(${rand.i(360)}deg 100% 80%)`,
        players: range(2).map(i => ({
          i, class:`p${i+1}`,
          base: (1 - i) * (DIM.y - 1),
        })),
        turn: 0,
        status: -1,
        selected: [],
        checks: [],
        plays: [],
        chat: [],
      })
    },
    select: (state, tile, selected=undefined) => {
      if (V.ou(tile.v, V.ne(0, 0), V.ad(DIM, V.as(DIM, -1)))) return
      if (state.status > -1) return

      const curr = state.selected
      let next
      selected = selected ?? !Tile.in(curr, tile)
      const actual = M.el(state.board, tile.v[1], tile.v[0])

      const last = curr.slice(-1)[0]
      if (Tile.in(curr, tile)) {
        if (!selected && curr.length === 1) next = []
        else {
          next = curr.slice(0, Tile.index(curr, tile))
          if (selected || !Tile.eq(tile, last)) next.push(actual)
        }
      } else if (curr.length) {
        const move = selected && Chess.moves(last, state.board).find(x => V.eq(x.v, tile.v))
        if (move) {
          next = curr.concat([{ ...actual, ...move }])
        }
        else next = curr
      } else {
        next = selected && Tile.owned(actual, state.turn) ? [actual] : []
      }

      assign_state({ selected: next })
      render.ui(state)
    },
    unselect: (state) => {
      assign_state({ selected: [] })
      render.board(state)
      render.ui(state)
    },
    play: (state, tiles=state.selected) => {
      if (!Chess.valid(tiles, state.board)) return
      
      const { board, players, turn, plays } = state
      Tile.flat(board).map(x => delete x.en_passant)
      const start = tiles.at(0)
      const end = tiles.at(-1)
      tiles = strings.json.clone(tiles)
      const clearPiece = (tile) => {
        const actual_tile = Tile.at(board, tile)
        Object.assign(actual_tile, tile, { piece: ' ', owner: -1, moved: false })
      }
      const movePiece = (from, to) => {
        log(to)
        const actual_to = Tile.at(board, to)
        const actual_from = Tile.at(board, from)
        Object.assign(actual_to, to, actual_from, { black: to.black, v: to.v, moved: true })
        clearPiece(from)
      }
      const promotePiece = (tile) => {
        const actual_tile = Tile.at(board, tile)
        Object.assign(actual_tile, { piece: tile.promotion })
      }
      movePiece(start, end)
      if (end.castle) {
        const [rook, rook_move] = end.castle
        movePiece(rook, rook_move)
      }
      if (end.capture) {
        clearPiece(end.capture)
      }
      if (end.promotion) {
        promotePiece(end)
      }
      const checks = Chess.checks(board, turn % 2)
      const mates = Chess.checks(board, (turn + 1) % 2)
      // log({checks, mates})

      const word = tiles.map(x => x.piece).join('')
      assign_state({
        board,
        turn: turn + 1,
        status: mates.length ? (turn + 1) % 2 : -1,
        plays: plays.concat([tiles]),
        selected: [],
        checks,
        chat: state.chat.concat([{
          text: word.toUpperCase(),
          style: `
          font-size: 2em;
          line-height: 1;
          `,
        }])
      })
      log('new state', state)
    },
    next: (state) => {
      if (Chess.winner(state) !== undefined) handle.generate()
      else handle.play(state.selected)
    },
  }

  useF(state, () => render.all(state))

  const [edit_room, set_edit_room, fill_edit_room] = useInput('')
  useF(room, () => set_edit_room(room))
  const different_room = room && room !== edit_room

  return <Style>
    <InfoBody>
      <InfoSection labels={[
        NAME,
        {
          text: <input style={S(`
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          width: 6em;
          `)} {...fill_edit_room} maxLength={6} />
        },
        !different_room && { 'copy room url': e => {
          copy(location.href)
          display_status(e.target, 'copied!')
          navigator.share({
            url: location.href,
          })
        } },
        // { 'new game': () => set_room('') },
        !different_room && { text:'new game', href:`/chess/${rand.unambiguous(6)}`, tab:true },
        different_room && { cancel: () => set_edit_room(room) },
        different_room && { join: () => url.push(`/chess/${edit_room}`) },
      ]}>
        <div id='chess-root' className='column' />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

#chess-root {
  font-family: monospace;
  user-select: none;
  gap: .25em;
}

#board {
  background: #000;
  padding: 1px;
  display: flex; flex-direction: column; gap: 1px; align-items: center;
}
#board .row {
  display: flex; flex-direction: row; gap: 1px;
}
#board .row .tile {
  background: #fff;
  font-size: 3em;
  height: 1em; width: 1em;
  display: flex; align-items: center; justify-content: center;
  font-family: monospace;
  box-sizing: border-box;
  overflow: hidden;
}

#board .row .tile.highlighted-true {
  filter: invert(1);
  cursor: pointer;
}

#ui {
  align-self: stretch;
}
#status {
  width: 100%;
  border: 1px dashed currentcolor;
  // border-radius: .25rem;
  padding: .25rem;
  font-size: .8em;

  // border: 1px solid currentcolor;
  // background: #fff8;
  min-width: 200px;
  min-height: 100px;
}

@media (pointer: fine) {
  #board .row .tile.selectable-true:hover {
    filter: invert(1);
    cursor: pointer;
  }
}


input, select {
  height: 1.5em;
  font-size: 1em;
  border: 1px solid currentcolor;
  border-radius: .25em;
  &[type=number] {
    max-width: 5em;
  }
}

ul {
  padding-left: 1em;
}

button {
  color: var(--id-color-text);
  border-radius: 10em;
  border: 1px solid var(--id-color-text);
  box-shadow: 0 1px var(--id-color-text);
  min-width: 2em;
  display: flex; align-items: center; justify-content: center;
  translate: 0 -1px;
  &:not(:disabled) {
    cursor: pointer;
    &:active {
      translate: 0;
      box-shadow: none;
    }
  }
  &:disabled {
    cursor: default;
    color: #888;
    // background: #ccc;
  }
  &.on {
    background: var(--id-color-text);
    color: var(--id-color-text-readable);
    translate: 0;
    box-shadow: none;
  }
  line-height: 1.3em;
}
`