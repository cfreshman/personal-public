import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBody, InfoSection, InfoStyles, Reorderable } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useEventListener, useF, useInline, useInterval, useM, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { is_valid_word, load_lang, rand_alpha } from 'src/lib/dict'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'
import { useModals } from 'src/lib/modals'

const { named_log, Q, V, set } = window as any
const NAME = 'capture'
const log = named_log(NAME)

const debug = {
  anyspell: true,
}

// const W = 10, H = 14
// const W = 4, H = 4
const W = 8, H = 10
const construct_board = (loaded=true) => {
  const board = []
  for (let i = 0; i < H; i++) {
    const row = []
    for (let j = 0; j < W; j++) {
      row.push({
        rc: V.ne(i, j),
        owner: -1,
        letter: loaded ? rand_alpha() : ' ',
      })
    }
    board.push(row)
  }
  return board
}

const fetch_state = async (id, curr_state=undefined) => {
  let state
  if (!id) {
    state = store.get('capture-state')
  } else {
    const data = await api.post(`/kv`, { key: `capture-state-${id}` })
    log('loaded data', data)
    state = data?.item?.value
  }
  
  if (state) {
    // hydrate board
    state.board.forEach((row, i) => {
      row.forEach((cell, j) => {
        cell.rc = V.ne(i, j)
      })
    })
  } else {
    state = {
      board: construct_board(false),
      turn: 0,
      played: {},
    }
  }

  return state
}
const update_state = async (id, state) => {
  if (!id) {
    store.set('capture-state', state)
  } else {
    await api.post(`/kv`, { key: `capture-state-${id}`, value: state })
  }
}

let empty_board = construct_board(false)
let empty_state = {
  board: empty_board,
  turn: 0,
  played: {},
}

export default () => {
  const [a] = auth.use()
  const [id, set_id] = usePathState()
  const modals = useModals()

  const [state, _set_state] = id ? useS(empty_state) : store.use('capture-state', { default: empty_state })
  const save_state = (ob) => {
    let new_state = { ...state, ...ob }
    _set_state(new_state)
    update_state(id, new_state)
  }

  const { board, turn, played } = state
  useInline(() => {
    // hydrate board
    board.forEach((row, i) => {
      row.forEach((cell, j) => {
        cell.rc = V.ne(i, j)
      })
    })
  })
  const [selected, set_selected] = useS([])
  const owner = turn % 2

  let [lang_loaded, set_lang_loaded] = useS(false)
  useF(async () => {
    await load_lang()
    set_lang_loaded(true)
  })
  useF(lang_loaded, () => {
    if (lang_loaded) {
      let do_boardgen = board[0][0].letter === ' '
      if (do_boardgen) save_state({ board:construct_board() })
    }
  })

  const handle = {
    load: async () => {
      const new_state = await fetch_state(id, state)
      if (new_state) _set_state(new_state)
    },
    select: (rc) => {
      const s = [...selected]
      const i = s.findIndex(({ rc:orc }) => orc.x === rc.x && orc.y === rc.y)
      if (i > -1) s.splice(i, 1)
      else s.push({
        rc,
        cell: board[rc.x][rc.y],
      })
      set_selected(s)
    },
    play: () => {
      const word = selected.map(({ cell }) => cell.letter).join('')
      if (!debug.anyspell && !is_valid_word(word)) return alert('not a word')
      if (played[word]) return alert('already played')
      
      selected.forEach(({ rc }) => {
        board[rc.x][rc.y].owner = owner
      })
      
      // detect surrounded tiles
      const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]
      ;[1 - owner, owner].map(capturing => {
        let explored = set()
        for (let i = 0; i < H; i++) {
          for (let j = 0; j < W; j++) {
            const cell = board[i][j]
            if (cell.owner !== capturing) continue
            log(capturing, cell.owner)
            if (explored.has(cell.rc.st())) continue
            const region = []
            const outer = set()
            const frontier = [cell]
            while (frontier.length) {
              const curr = frontier.pop()
              if (explored.has(curr.rc.st())) continue
              explored.add(curr.rc.st())
              region.push(curr)
              dirs.forEach(([dr, dc]) => {
                const r = curr.rc.x + dr, c = curr.rc.y + dc
                if (r < 0 || r >= H || c < 0 || c >= W) {
                  outer.add(-1)
                  return
                }
                const cell = board[r][c]
                if (cell.owner === curr.owner) frontier.push(cell)
                else outer.add(cell.owner)
              })
            }
            const owner = [...outer][0]
            log('region', region, outer, owner)
            if (outer.size === 1 && owner > -1) {
              region.forEach(cell => cell.owner = owner)
            }
          }
        }
      })

      // const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]
      // const explored = set()
      // for (let i = 0; i < H; i++) {
      //   for (let j = 0; j < W; j++) {
      //     const cell = board[i][j]
      //     if (explored.has(cell.rc.st())) continue
      //     const region = []
      //     let touches_outside = false
      //     const frontier = [cell]
      //     while (frontier.length) {
      //       const curr = frontier.pop()
      //       if (explored.has(curr.rc.st())) continue
      //       explored.add(curr.rc.st())
      //       region.push(curr)
      //       dirs.forEach(([dr, dc]) => {
      //         const r = curr.rc.x + dr, c = curr.rc.y + dc
      //         if (r < 0 || r >= H || c < 0 || c >= W) {
      //           touches_outside = true
      //           return
      //         }
      //         const cell = board[r][c]
      //         if (cell.owner !== owner) frontier.push(cell)
      //       })
      //     }
      //     if (!touches_outside) {
      //       region.forEach(cell => cell.owner = owner)
      //     }
      //   }
      // }

      save_state({ board, played: { ...played, [word]: turn + 1 }, turn: turn + 1 })
      set_selected([])
    },
    reset: () => {
      save_state({ board:construct_board(), turn:0, played:{} })
      set_selected([])
    },
    resize: () => {
      const r = Q('#board')
      const outer = r.parentElement.getBoundingClientRect()
      while (r.clientWidth < outer.width && r.clientHeight < innerHeight * .8) {
        r.style.fontSize = `${parseFloat(window.getComputedStyle(r).fontSize) + 1}px`
      }
      while (r.clientWidth > outer.width) {
        r.style.fontSize = `${parseFloat(window.getComputedStyle(r).fontSize) - .1}px`
      }
    },
  }
  useF(handle.resize)
  useEventListener(window, 'resize', handle.resize)

  useF(handle.load)
  useEventListener(window, 'focus', handle.load)
  useInterval(handle.load, 10_000)

  const selected_set = useM(selected, () => set(selected?.map(({ rc }) => rc.st()) || []))
  const board_map = useM(board, () => {
    const map = {}
    board.forEach(row => {
      row.forEach(cell => {
        map[cell.rc.st()] = cell
      })
    })
    return map
  })

  const status = useM(board, () => {
    let counts = {}
    board.forEach(row => {
      row.forEach(cell => {
        counts[cell.owner] = (counts[cell.owner] || 0) + 1
      })
    })
    if (counts[-1]) return -1
    const winner = counts[0] > counts[1] ? 0 : 1
    return winner
  })
  const gameover = status > -1

  const last_word = useM(played, () => {
    const entries = Object.entries(played) as any
    if (entries.length === 0) return undefined
    entries.sort((a, b) => b[1] - a[1])
    return entries[0][0]
  })

  usePageSettings({
    // professional:true,
    icon: '/raw/images/icon-capture.png',
    ...(a.user ? {} : {
      background: '#15eba1',
    })
  })
  return <Style>
    <InfoBody>
      <modals.Element />
      <InfoSection labels={!lang_loaded ? [NAME, 'loading dictionary...'] : [
        NAME,
        { 'new game': handle.reset },
      ]}>
        <div id='container' className='w100 column'>
          <div id='board' className={`gameover-${gameover}`}>
            {board.map((row, r) => <div key={r} className='row'>
              {row.map((cell, c) => {
                const rc = V.ne(r, c)
                return <span 
                key={c} className={`tile middle-row ${cell.owner>-1?`owner-${cell.owner}`:''} selected-${selected_set.has(cell.rc.st())}`}
                data-r={r} data-c={c} onPointerDown={e => {
                  const x = e.clientX, y = e.clientY
                  const el = document.elementFromPoint(x, y) as any
                  if (el.classList.contains('tile')) {
                    let r = el.dataset['r'], c = el.dataset['c']
                    let cell = board_map[V.ne(r, c).st()]
                    handle.select(cell.rc)
                  }
                }}>{cell.letter}</span>
              })}
            </div>)}
          </div>
          {gameover ? <>
            <div>
              {['red', 'blue'][status]} wins!
            </div>
          </> : <>
            <div id='selected'>
              {selected.length ? <div id='selected-word'>
                <Reorderable 
                elements={selected.map(({ rc, cell }) =>
                  <span className={`tile middle-row ${cell.owner>-1?`owner-${cell.owner}`:''}`} onClick={e => {
                    log('here')
                    handle.select(rc)
                  }}>{cell.letter}</span>)} 
                reorder={order => {
                  set_selected(order.map(i => selected[i]))
                }} style={S(`flex-wrap:nowrap`)} />
              </div> : last_word ? `${['blue','red'][owner]} played ${last_word.toUpperCase()}` : 'no tiles selected'}
            </div>
            <div>
              <button onClick={e => handle.play()}>play</button> <button onClick={e => set_selected([])}>deselect</button> <button onClick={e => {
                modals.open(({ close }) => {
                  return <div style={S(`
                  padding: .5em;
                  `)}>
                    <table style={S(`
                    `)}>
                      {Object.entries<any>(played).reverse().map(([word, turn_1]) => <tr key={word}>
                        <td>{turn_1 || 1}&nbsp;</td>
                        <td>{word.toUpperCase()}</td>
                      </tr>)}
                    </table>
                    <HalfLine />
                    <button onClick={close}>close</button>
                  </div>
                })
              }}>history</button>
            </div>
            <div>
              <span>({owner === 0 ? 'red' : 'blue'} turn)</span>
            </div>
          </>}
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const common_css = `
#container {
  gap: .5em;
}
#board, #selected-word {
  border: 1px solid currentcolor;
  user-select: none;
  background: var(--id-color-text-readable);
}
#board {
  &.gameover-true {
    pointer-events: none;
  }
}
#selected-word {
  border-radius: 9em;
  overflow: hidden;
  touch-action: none;
}
.tile {
  font-family: sf-mono;
  font-size: 1.5em;
  aspect-ratio: 1;
  height: 1.5em;
  width: auto;
  cursor: pointer;
  text-transform: uppercase;

  &.owner-0 {
    background: #f88;
  }
  &.owner-1 {
    background: #88f;
  }
  &.selected-true {
    background: #222;
    color: #eee;
  }

  position: relative;
  &:is(.desktop *):hover, &:has(.desktop):hover {
    &::after {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #0002;
      pointer-events: none;
    }
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
  background: var(--id-color-text-readable);
  color: var(--id-color-text);
  border-radius: 10em;
  border: 1px solid var(--id-color-text);
  box-shadow: 0 1px var(--id-color-text);
  min-width: 2em;
  display: inline-flex; align-items: center; justify-content: center;
  translate: 0 -1px;
  &:not(:disabled) {
    cursor: pointer;
    &:active, &.active {
      translate: 0;
      box-shadow: none;
    }
  }
  &:disabled {
    cursor: default;
    color: #888;
    // background: #ccc;
  }
  min-height: 1.5em;
  padding: 0 .67em;
}

.section.h100 {
  margin: 0;
}

--id-color: #eee;
--id-color-text: #222;
--id-color-text-readable: #eee;
background: var(--id-color) !important;
color: var(--id-color-text) !important;
padding: .5em;
font-family: monospace;
`
const Style = styled(InfoStyles)`
margin: .5em;
width: calc(100% - 1em);
height: calc(100% - 1em);
border: 1px solid #000;
border-radius: .25em;

${common_css}

box-shadow: none !important; /* to undo expand style (bad code) */
`
const PopupStyle = styled(InfoStyles)`
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);
${common_css}
`