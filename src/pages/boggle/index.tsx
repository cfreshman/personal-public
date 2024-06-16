import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoButton, InfoSection, InfoStyles, Select } from '../../components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useEventListener, useF, useM, useRerender, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { dict, is_valid_word, load_lang } from 'src/lib/dict'
import { Modal, openPopup } from 'src/components/Modal'
import { S } from 'src/lib/util'
import { end_round, init_round, is_round_over, new_local_state, next_local_player, ROUND_MS, start_round } from './data'
import { store } from 'src/lib/store'

const { named_log, range, Q, V, sleep } = window as any
const NAME = 'boggle'
const log = named_log(NAME)

const COLORS = {
  HIGHLIGHT: '#f7dc6f', // '#90d2ff', //
  HOVER: '#000',
}

V.ma = (v, other) => {
  if (other) return V.ad(v, V.sc(other, -1)).ma()
  let sum = 0
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i]
  }
  return Math.sqrt(sum)
}

const open_popup = (closer) => {
  openPopup(close => <Style>
    <InfoBody>
      {closer(close)}
    </InfoBody>
  </Style>, `
  height: max-content;
  width: max-content;
  min-height: 400px; min-width: 300px;
  padding: 0;
  `)
}

let down = undefined
const Board = ({ state, handle, hide_board, disable_board }) => {

  const [selection, set_selection] = useS([])

  handle = {
    ...handle,
    move: (tile) => {
      if (!down) return
      const index = selection.findIndex(x => V.eq(x.pos, tile.pos))
      if (index > -1 && index === selection.length - 2) {
        set_selection(selection.slice(0, -1))
      } else if (index === -1) {
        const last = selection[selection.length - 1]
        // set_selection(selection.concat(tile))
        // last && alert(`${V.ma(last.pos, tile.pos)} ${last.face} ${last.pos} ${tile.face} ${tile.pos}`)
        if (!last || V.ma(last.pos, tile.pos) < 1.9) {
          set_selection(selection.concat(tile))
        }
      }
    },
    play: () => {
      const word = selection.map(x => x.face).join('')
      if (word && word.length > 2 && !state.round_words[state.round][state.player_i].some(x => x.word === word)) {
      // alert(`${word} is ${is_valid_word(word) ? 'a' : 'not a'} valid word`)
        const accepted = is_valid_word(word)
        state.round_words[state.round][state.player_i].push({ word, accepted })
        handle.set_state({...state})
      }
      set_selection([])
    },
  }

  useF(state?.player_i, () => set_selection([]))

  const resized = useRerender()
  useF(state, resized, () => {
    const game_board = Q('#game-board')
    const width_save = game_board.style.width
    game_board.style.width = '100%'
    const target_width = game_board.clientWidth
    game_board.style.width = width_save
    let fs = 0
    do {
      fs += 1
      game_board.style.fontSize = `${fs}px`
    } while (game_board.clientWidth < target_width && fs < 100)
    while (game_board.clientWidth > target_width) {
      fs -= .1
      game_board.style.fontSize = `${fs}px`
    }
  })
  useEventListener(window, 'resize', () => resized())

  useEventListener(window, 'pointerup', () => {
    down = undefined
    handle.play()
  })

  const tile_to_id = (tile) => `tile-${tile.pos.x}-${tile.pos.y}`
  const id_to_tile = useM(state, () => {
    const map = {}
    state.board?.map(t => map[tile_to_id(t)] = t)
    return map
  })

  return <div id='game-board' className='row wrap' style={S(`
  user-select: none !important;
  font-size: 5em;
  gap: .075em;
  padding: .15em;
  border-radius: calc(.075em / 2);
  width: calc(4em + 3 * .075em + 2 * .15em);
  aspect-ratio: 1/1;
  background: var(--id-color-text);
  ${disable_board || !state.board ? 'pointer-events: none;' : ''}
  `)}>
    {(hide_board || !state.board ? range(16).map(i => ({ face:'', pos:V.ne(0,0) })) : state.board).map(tile => {
      const selected = selection.some(x => V.eq(x.pos, tile.pos))
      // alert(tile.pos)
      return <div className={`game-tile selected-${selected}`} style={S(`
      height: 1em; width: 1em;
      background: var(--id-color);
      display: flex; align-items: center; justify-content: center;
      text-transform: uppercase;
      font-family: system-ui;
      font-weight: bold;
      ${selected ? `
      background: ${COLORS.HIGHLIGHT};
      // color: var(--id-color);
      ` : ''}
      `)}>
        <span data-tile={tile_to_id(tile)}  style={S(`
        font-size: ${tile.face.length === 2 ? '.6em' : '.8em'};
        border-radius: 50%;
        // border: 1px solid red;
        width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        `)}
        onPointerDown={e => {
          down = tile
          // alert(`${tile.face} ${tile.pos}`)
          handle.move(tile)
        }}
        onMouseEnter={e => {
          handle.move(tile)
        }}
        onTouchMove={e => {
          const touch = e.touches[0]
          const element = document.elementFromPoint(touch.clientX, touch.clientY) as any
          const tile_id = element.dataset['tile']
          const tile = id_to_tile[tile_id]
          if (tile) {
            handle.move(tile)
          }
        }}
        >{tile.face}</span>
      </div>
    })}
  </div>
}
const Game = ({ viewer, state, handle }) => {

  const player_i = useM(state, viewer, () => state.id === 'local' ? state.player_i : state.players.indexOf(viewer))
  const player_round_start = useM(state, player_i, () => (state.round_start[state.round]||[])[player_i] || false)

  const not_started = useM(player_round_start, () => {
    return !player_round_start
  })
  const check_out_of_time = useRerender()
  const out_of_time = useM(player_round_start, check_out_of_time, () => {
    if (!player_round_start) return false
    return player_round_start + ROUND_MS < Date.now()
  })

  const round_over = useM(state, () => is_round_over(state))
  const round_end_display = useM(state, () => {
    return state.round > -1 && state.round === state.round_total.length - 1
  })

  const hide_board = (not_started || out_of_time) && !round_end_display
  const disable_board = hide_board || round_end_display

  useF(player_round_start, async () => {
    const l_timer = Q('#game-timer')
    let remaining
    const format_remaining = (ms) => `${Math.floor((ms / 1000) / 60)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, '0')} left`
    do {
      remaining = player_round_start ? Math.max(0, player_round_start + ROUND_MS - Date.now()) : ROUND_MS
      l_timer.textContent = format_remaining(remaining)
      await sleep(1_000)
    } while (remaining > 0 && player_round_start)
    check_out_of_time()
  })
  return <div className='column gap' style={S(`
  border: 1px solid currentcolor;
  border-radius: .25em;
  padding: .25em;
  `)}>
    <Board {...{ state, handle, hide_board, disable_board }} />
    {/* <div className='column' style={S(`
    `)}>
      {state.round_words[state.player_i].slice().reverse().map(o_word => {
        return <div>{o_word.accepted ? o_word.word : <s>{o_word.word}</s>}</div>
      })}
    </div> */}
    <div className='row wide between'>
      <div id='game-timer'>0:00 left</div>
      {round_end_display ? <button onClick={e => handle.set_state(init_round(state))}>next round</button>
      : round_over ? <button onClick={e => {
        handle.set_state(end_round(state))
      }}>end round</button>
      : !player_round_start ? <button onClick={e => handle.set_state(start_round(state))}>start turn (player {state.player_i+1}/{state.n_players})</button>
      : out_of_time ? <button onClick={e => {
        handle.set_state(next_local_player(state))
      }}>next player</button>
      : null}
    </div>
    {round_end_display ? <div className='column gap'>
      <div><b>round {state.round + 1} results</b></div>
      {range(state.n_players).map(i => {
        const total_points = state.points[i]
        const round_points = state.round_total.map(totals => totals[i])
        return <div>player {i+1}: <b>{total_points} point(s)</b> ({round_points.map((points, round_i) => {
          // return round_i === state.round ? <>{points} this round: <button onClick={e => {
          //   const player_word_objects = state.round_words[state.round][i]
          //   const player_word_points = state.round_points[state.round][i]
          //   log({ player_word_objects, player_word_points })
          //   open_popup(close => <InfoSection labels={[
          //     `player ${i+1} round ${state.round+1}`,
          //     { close },
          //   ]}>
          //     <div className='column gap'>
          //       {player_word_objects.map((o_word, i) => {
          //         return <div>{o_word.word} - {player_word_points[i]}</div>
          //       })}
          //     </div>
          //   </InfoSection>)
          // }}>view</button></> : null
          return <>{round_i?' ':''}{points}{round_i === state.round ? <>&nbsp;<button onClick={e => {
            const player_word_objects = state.round_words[state.round][i]
            const player_word_points = state.round_points[state.round][i]
            log({ player_word_objects, player_word_points })
            open_popup(close => <InfoSection labels={[
              `player ${i+1} round ${state.round+1}`,
              { close },
            ]}>
              <div className='column gap'>
                <div><b>{state.round_total[state.round][i]} total point(s)</b></div>
                {player_word_objects.map((o_word, i) => {
                  return o_word.accepted ? <div>{player_word_points[i]} {player_word_points[i] ? o_word.word : <s>{o_word.word}</s>}</div> : null
                })}
              </div>
            </InfoSection>)
          }}>view</button></> : null}</>
        })})</div>
      })}
    </div>
    : <div className='row wrap' style={S(`width:0;min-width:fit-content`)}>
      {(state.round_words[state.round]||[])[player_i]?.map((o_word, i, a) => {
        return <>{o_word.accepted ? <span>{o_word.word}</span> : <s>{o_word.word}</s>}{i<a.length-1?<>,&nbsp;</>:null}</>
      })}
    </div>
    }
  </div>
}

export default () => {

  const [{user:viewer}] = auth.use()

  const [loaded, set_loaded] = useS(false)
  useF(() => {
    load_lang('english').then(() => set_loaded(true))
  })

  const [n_players, set_n_players] = store.use('boggle-n_players', { default:2 })
  const [play, set_play] = useS(false)

  const [state, set_state] = store.use('boggle-state', { default:undefined })
  useF(loaded, () => loaded && !state && set_state(init_round(new_local_state(n_players))))

  const handle = {
    set_state,
  }

  window['boggle'] = { state }
  return <Style>
    <InfoBody>
      {/* <InfoSection labels={['new game']}>
        <InfoButton className='new-game-button'>local</InfoButton>
        <div className='row pre'> ↳ local game with <Select value={n_players} options={range(2, 9)} setter={set_n_players} /> players</div>
      </InfoSection> */}
      <InfoSection labels={[
        'BOGGLE',
        {
          text: <div className='row pre'><Select value={n_players} options={range(1, 9)} setter={set_n_players} /> players</div>,
        },
        { 'new game': () => {
          set_state(init_round(new_local_state(n_players)))
        } },
      ]}>
        {state ? <Game {...{ viewer, state, handle }} /> : <>
          start a game
        </>}
      </InfoSection>
    </InfoBody>
    {!loaded ? <Modal>
      <div style={S(`
      width: fit-content; height: fit-content;
      color: var(--id-color-text);
      background: var(--id-color);
      border: 1px solid currentcolor;
      box-shadow: 0 2px currentcolor;
      padding: .5em;
      `)}>
        loading dictionary...
      </div>
    </Modal> : null}
  </Style>
}

const Style = styled(InfoStyles)`
.new-game-button {
  font-size: 1.67em !important;
  text-transform: uppercase;
  border-radius: .25em !important;
}
// .select {
//   border-radius: .25em !important;
//   font-weight: bold;
// }
.badges .select {
  font-size: 1em !important;
}

.game-tile {
  // &:hover:not(.selected-true) {
  //   background: var(--id-color-text) !important;
  //   color: var(--id-color);
  // }
}
`