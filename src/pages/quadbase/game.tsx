import React from 'react'
import styled from 'styled-components'
import { A, InfoBody, InfoButton, InfoSection, InfoStyles, Reorderable } from '../../components/Info'
import { useCachedScript } from 'src/lib/hooks_ext'
import { useE, useEventListener, useF, useM, useR, useS, useStyle } from 'src/lib/hooks'
import { pass, truthy } from 'src/lib/types'
import { S, dev } from 'src/lib/util'
import { Info, State, clone_info, clone_state, construct_state, create_game, fetch_game, update_game, play_turn as do_play_turn, play_state as do_play_state, BOARD_SIZE, QUADBASE_SETS, compute_new_owner, user_ids, is_local_player, profile_colors, profile_icons } from './data'
import { is_valid_word, rand_alpha } from './dict'
import { message } from 'src/lib/message'
import api, { auth } from 'src/lib/api'
import { useSocket } from 'src/lib/socket'
import { NiceModal, PlayerNameFromInfo, create_tile_bag, default_player_profiles, open_about, open_howto, open_popup, named_colors } from './util'
import { Chat } from 'src/components/Chat'
import { Modal, openPopup } from 'src/components/Modal'
import { Style } from './style'
import { openLogin } from 'src/lib/auth'

const { named_log, node, svg_node, V, range, set, rand, Q, QQ, on, list, devices, strings, defer, values, keys, lists } = window as any
const log = named_log('quadbase game')

const debug = {
  check: true,
}
if (dev) window['quadbase_game_debug'] = debug


export default ({ id, handle, profile_map, sections }) => {
  const [{user:viewer}] = auth.use()

  const [_info, set_info] = useS<Info>(undefined)
  const info = useM(_info, () => ({
    p0: undefined,
    p1: undefined,
    turn: 0, owner: 0,
    start_t: Date.now(),
    last_t: Date.now(),
    turns: [],
    status: -1,
    tries: 0,
    words: [],
    ..._info,
  }))
  const [_state, set_state] = useS<State>(undefined)
  const state = useM(_state, () => ({
    tiles: [],
    ..._state,
  }))
  const [gameover, set_gameover] = useS(false)
  useF(gameover, () => {
    if (gameover) {
      if (info.previous) {
        message.trigger({
          text: `open previous: /quadbase/${info.previous}`,
          ms: 3_000,
          id: 'quadbase-previous', delete: 'quadbase-previous',
        })
      }
      if (info.rematch) {
        message.trigger({
          text: `open rematch: /quadbase/${info.rematch}`,
          ms: 3_000,
          id: 'quadbase-rematch', delete: 'quadbase-rematch',
        })
      } else if (member) {
        window[`quadbase-start-rematch-${info.id}`] = () => handle.rematch()
        message.trigger({
          text: `<a onclick="window['quadbase-start-rematch-${info.id}']()">start rematch!</a>`,
          ms: 3_000,
          id: 'quadbase-rematch', delete: 'quadbase-rematch',
        })
      }
      message.trigger({
        text: `${info[`p${info.status}`]} wins!`,
        ms: 3_000,
        id: 'quadbase-gameover', delete: 'quadbase-gameover',
      })
    } else {
      message.trigger({
        delete: 'quadbase-gameover',
      })
    }
  })
  const member = useM(viewer, info, () => info.id === 'local' || (info.id && user_ids(info).includes(viewer)))
  useF(state, () => log('new state', {state}))
  useF(info, () => {
    if (info.out[info.owner]) {
      const new_info = {
        ...info,
        owner: (info.owner + 1)%4,
      }
      update_game(new_info, state)
    }
  })

  const can_replay = !!state?.deltas
  const [replay, set_replay] = useS(false)
  const [replay_turn, set_replay_turn] = useS(0)

  const [played, set_played] = useS(false)
  const get_play_length = (turn=info.turn) => info.turns.at(turn - 1)?.word.length||0
  const play_length = useM(info, () => get_play_length())
  const [play_turn, set_play_turn] = useS(0)
  useF(played, () => set_play_turn(played ? play_length : 0))

  const is_turn = useM(viewer, info, gameover, () => !gameover && (id === 'local' || info[`p${info.owner}`] === viewer))
  const can_play = useM(is_turn, replay, replay_turn, played, () => (!replay || replay_turn === info.turn) && is_turn && (!info.turn||played))

  const has_double_play = useM(info, () => {
    return false
    
    if (info.turn) {
      const curr_turn = info.turns.at(-1)
      const prev_turn = info.turns.at(-2)
      if (curr_turn.owner === prev_turn?.owner) {
        return true
      }
    }
    return false
  })
  const [double_play, set_double_play] = useS(false)
  useF(has_double_play, () => set_double_play(!played && has_double_play))
  useF(played, () => played && set_double_play(false))

  useF(info?.turn, () => {
    set_replay(false)
    if (info.turn) {
      const curr_turn = info.turns.at(-1)
      const prev_turn = info.turns.at(-2)
      if (info[`p${curr_turn.owner}`] !== viewer && curr_turn.owner !== prev_turn?.owner) {
        set_play_turn(0)
        set_played(false)
      }
    }
  })
  useF(played, () => {
    if (played && double_play) {
      set_double_play(false)
      set_played(false)
    }
  })

  const [profiles, set_profiles] = useS(default_player_profiles)
  useF(info, () => {
    handle.load_profiles(user_ids(info), true)
  })
  useF(info, profile_map, () => {
    const new_profiles = range(4).map(i => ({
      ...default_player_profiles[i],
      ...((is_local_player(info[`p${i}`])?undefined:profile_map[info[`p${i}`]])||{}),
      // ...((theme?.profiles||[])[i]||{}),
    }))
    let color_i = 0, icon_i = 0
    new_profiles.map((profile, p_i) => {
      while (new_profiles.slice(0, p_i).some(other => other.color === profile.color)) {
        profile.color = profile_colors[color_i]
        color_i += 1
      }
      while (new_profiles.slice(0, p_i).some(other => other.icon === profile.icon)) {
        profile.icon = profile_icons[icon_i]
        icon_i += 1
      }
    })
    set_profiles(new_profiles)
  })
  useF(profiles, () => log({profiles}))

  const [selection, set_selection] = useS([])
  const play_ref = useR()
  useF(selection, () => play_ref.current = {selection})
  const word = useM(selection, () => selection.map(tile => tile.letter).join(''))
  const last_word = '' // useM(info, () => info.turn ? info.turns.at(-1).word || 'skipped' : undefined)
  useF(selection, () => set_replay(false))

  const hex_root = useR()
  const svg = useM(() => node(`
  <svg id="svg"
  viewBox="-${BOARD_SIZE/2 + .25} -${BOARD_SIZE/2 + .25} ${BOARD_SIZE + .5} ${BOARD_SIZE + .5}" 
  xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="pattern"
              width="8" height="10"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45 50 50)">
        <line stroke="#a6a6a6" stroke-width="7px" y2="10"/>
      </pattern>
    </defs>
  </svg>`))
  useF(svg, () => hex_root.current.append(svg))
  const play_timeout = useR(undefined)
  const play_turn_timeout = useR(undefined)
  const [can_submit, set_can_submit] = useS(false)
  useF(svg, info?.turn, state, selection, can_play, profiles, replay, replay_turn, played, play_turn, double_play, () => {
    log('render board', { info, state })
    if (!state) return

    let svg_inner_html = `
    <style>
      #svg {
        user-select: none;
        max-height: 100%;
        background: #eee;
        border-radius: 15%;
      }
      #svg g {
      }
      #svg path {
        fill: inherit;
        stroke: #fff;
        stroke-width: .05px;
      }
      #svg text {
        fill: #fff;
        stroke: none;
        text-anchor: middle;
        // dominant-baseline: ${devices.is_mobile ? 'middle' : 'central'};
        font-size: .67px;
        text-transform: uppercase;
        font-family: Duospace, Ubuntu, sans-serif;
        font-weight: bold;
        pointer-events: none;
      }
      #svg g.letter * {
        cursor: pointer !important;
        user-select: none;
      }
      ${can_play && !devices.is_mobile ? `
      #svg g.letter:not(.unplayable):hover path {
        fill: #fff !important;
      }
      #svg g.letter:not(.unplayable):hover text {
        fill: #000;
      }` : ''}
    </style>
    `
    
    let display_state, base_state, last_state, last_turn_tile_map, display_selection
    const display_turn = replay ? replay_turn : info.turn - (double_play ? 1 : 0)
    const turn_owner = !display_turn ? 0 : compute_new_owner({...info,owner:info.turns.at(display_turn-(played?1:2))?.owner||0}, display_turn) // ((info.turns.at(display_turn - 1)?.owner || display_turn ? 0 : -1) + 1)%4
    log({display_turn,turn_owner})
    if (!played && display_turn) {
      last_state = construct_state(state, Math.max(0, display_turn - 1))
      // display_state = construct_state(last_state, display_turn ? 1 : 0)
      delete last_state.deltas
      display_state = do_play_state(last_state, info, display_turn, play_turn, construct_state(state, display_turn)).new_state

      clearTimeout(play_turn_timeout.current)
      const last_play_turn = play_turn === get_play_length(display_turn)
      play_turn_timeout.current = setTimeout(() => {
        if (last_play_turn) {
          if (double_play) {
            set_double_play(false)
            set_play_turn(0)
            set_played(false)
          } else {
            set_played(true)
          }
        } else {
          set_play_turn(play_turn + 1)
        }
      }, last_play_turn ? 666 : 333)

      log({state,last_state,display_state})
      const curr_turn = info.turns[display_turn - 1]
      last_turn_tile_map = {}
      if (curr_turn) {
        display_selection = curr_turn.tiles.slice(0, play_turn)
        // curr_turn?.tiles.slice(0, play_turn).map((tile, i) => last_turn_tile_map[tile.pos.st()] = {...tile, i})
        curr_turn?.tiles.map((tile, i) => last_turn_tile_map[tile.pos.st()] = {...tile, i})

        if (play_turn === 0) {
          // const total_play_ms = Math.max(1_000, (.5 + .25 * curr_turn.tiles.length) * 1_000)
          const total_play_ms = 666 + 333 * curr_turn.tiles.length
  
          // clearTimeout(play_timeout.current)
          // play_timeout.current = setTimeout(() => {
          //   if (double_play) {
          //     set_double_play(false)
          //   } else {
          //     set_played(true)
          //   }
          // }, total_play_ms)
  
          const play_user = info[`p${curr_turn.owner}`]
          const action = curr_turn.word ? `played ${curr_turn.word.toUpperCase()}` : info.status > -1 && display_turn === info.turn ? 'resigned' : 'skipped'
          message.trigger({
            text: `${play_user} ${action}`,
            ms: total_play_ms, // 666,
            id: `quadbase-play-turn`, delete: `quadbase-play-turn`,
          })
        }
      }
      set_gameover(false)
      set_can_submit(false)
    } else if (selection.length) {
      try {
        base_state = construct_state(state, display_turn)
      } catch {
        // TODO fix this better
        base_state = construct_state(state, display_turn - 1)
      }
      const base_state_tile_map = {}
      base_state.tiles.map(tile => base_state_tile_map[tile.pos.st()] = tile)
      const mock_info = clone_info({
        ...info,
        turn: info.turn + 1,
        owner: compute_new_owner(info),
        turns: info.turns.concat([{
          owner: info.owner,
          t: Date.now(),
          tiles: selection,
          word: selection.map(tile => tile.letter).join('')
        }]),
      })
      const { new_state:raw_display_state } = do_play_state(state, mock_info)
      display_state = construct_state(raw_display_state)
      const display_state_tile_map = {}
      display_state.tiles.map(tile => display_state_tile_map[tile.pos.st()] = tile)
      let all_connected = true
      selection.map(tile => {
        const display_tile = display_state_tile_map[tile.pos.st()]
        // display_tile.letter = tile.letter
        display_tile.selected = turn_owner
        // display_tile.captured = display_tile.owner < 0 && '#888' // '#222'
        // display_tile.captured = profiles[display_tile.owner]?.color || '#888'
        display_tile.captured = display_tile.owner === turn_owner ? profiles[display_tile.owner]?.color || '#888' : '#888'
        log('can submit', display_tile.owner, display_tile, turn_owner)
        if (display_tile.owner !== turn_owner) {
          all_connected = false
        }
      })
      log({all_connected,turn_owner})
      set_can_submit(all_connected)
      log({hide_quadbase:info.turn > 0 && info.owner === info.turns.at(-1).owner})
      // if (info.turn > 0 && info.owner === info.turns.at(-1).owner) {
      //   display_state.tiles.map(tile => {
      //     if (tile.quadbase && tile.owner !== info.owner) {
      //       tile.quadbase = false
      //     }
      //   })
      // }
      log({mock_info,display_state})
      last_turn_tile_map = {}
      set_gameover(false)
    } else {
      try {
        display_state = construct_state(state, display_turn)
      } catch {
        // TODO fix this better
        display_state = construct_state(state, display_turn - 1)
      }
      last_turn_tile_map = {}
      const gameover = display_turn === info.turn && info.status > -1
      set_gameover(gameover)
      set_can_submit(false)
    }
    base_state = base_state || display_state
    display_selection = display_selection || selection

    // const actual_state = construct_state(state, replay ? replay_turn : played ? info.turn : Math.max(0, info.turn - 1))
    // if (!replay && !played) setTimeout(() => set_played(true), 1_000)

    log({played,play_turn})
    display_state.tiles.map((tile, i) => {
      if (!tile.letter) return
      const last_tile = last_turn_tile_map[tile.pos.st()] 
      const selected = base_state === display_state && selection.some(x => x.pos.eq(tile.pos))
      const cart = tile.pos.ad(V.ne(-BOARD_SIZE/2 + .5, -BOARD_SIZE/2 + .5))
      const vs = range(4).map(i => {
        const o = [[-1,-1],[1,-1],[1,1],[-1,1]].map<any>(V.ne).map(x => x.sc(.5))[i]
        return V.ne(cart.ad(o))
      })
      // const played = played_tile && tile.pos.eq(played_tile.pos) && tile.owner === -1
      const played_selected = base_state === display_state && display_selection.some(x => x.pos.eq(tile.pos))
      const played = base_state === display_state ? played_selected && tile.owner !== turn_owner : false // tile.owner < 0 && tile.selected
      const color = selected ? '#fff' : played ? '#888' : profiles[tile.owner]?.color || (tile.letter ? '#222' : '#eee')
      const text = tile.letter || (tile.quadbase ? profiles[tile.owner].icon : '')
      const unplayable = turn_owner === tile.owner
      if (tile.captured) log('captured', )
      svg_inner_html += `
      <g id="group_${i}" class="${tile.letter?'letter':''} ${played?`played`:''} ${unplayable?`unplayable`:''}" style="
      fill: ${tile.captured || color};
      // ${tile.captured || (tile.owner < 0 && tile.selected) ? 'opacity: .5;' : ''}
      ">
        <path d="M ${vs[0][0]},${vs[0][1]} ${vs.slice(1).concat([vs[0]]).map(v => {
          return `L ${v[0]},${v[1]}`
        })} Z" />
        ${QUADBASE_SETS.some(base_set => base_set.has(tile.pos.st())) ? `
        <path d="M ${vs[0][0]},${vs[0][1]} ${vs.slice(1).concat([vs[0]]).map(v => {
          return `L ${v[0]},${v[1]}`
        })} Z" style="
        fill: #fff3;
        pointer-events: none;
        " />
        ` : ''}
        <text x=${cart.x} y=${cart.y} dy='.33em' style="
        ${selected ? 'fill: #000;' : ''}
        ${tile.owner === turn_owner && tile.selected === undefined && !last_tile ? `fill: #fff5;` : ''}
        ">${last_tile ? last_tile.letter : text}</text>
      </g>
      `
      // :last_tile?`last-${last_tile.i}`
      // ${0&&last_tile ? `
      // <style>
      //   .played text {
      //     animation: .1s linear played;
      //   }
      //   @keyframes played {
      //     0% {
      //       fill: blue;
      //     }
      //     100% {
      //       fill: transparent;
      //     }
      //   }
      // </style>
      // ` : ''}
    //   <style>
    //   .last-${last_tile.i} text {
    //     animation: .5s linear last-${last_tile.i};
    //     animation-delay: ${.25 + .25 * last_tile.i}s;
    //   }
    //   @keyframes last-${last_tile.i} {
    //     0% {
    //       fill: transparent;
    //     }
    //     33% {
    //       fill: transparent;
    //     }
    //     34% {
    //       fill: #fff;
    //     }
    //   }
    // </style>

      // <style>
      // .last-${last_tile.i} {
      //   animation: ${.25 + .25 * last_tile.i}s linear last-${last_tile.i}-group;
      // }
      // .last-${last_tile.i} text {
      //   animation: ${.25 + .25 * last_tile.i}s linear last-${last_tile.i}-text;
      // }
      // @keyframes last-${last_tile.i}-group {
      //   0% {
      //     fill: #fff;
      //   }
      //   100% {
      //     fill: #fff;
      //   }
      // }
      // @keyframes last-${last_tile.i}-text {
      //   0% {
      //     fill: #000;
      //   }
      //   100% {
      //     fill: #000;
      //   }
      // }
      // </style>
    })

    svg.innerHTML = svg_inner_html

    if (can_play) {
      base_state.tiles.map((tile, i) => {
        const l_group = Q(svg, `#group_${i}`)
        if (!l_group) return

        const l_path = Q(l_group, `path`)
        const l_text = Q(l_group, `text`)
        if (tile.letter && tile.owner !== info.owner) {
          on(l_path, 'click', e => {
            const { selection } = play_ref.current
            const filtered = selection.filter(x => !x.pos.eq(tile.pos))
            if (selection.length !== filtered.length) {
              set_selection(filtered)
              // l_path.style.fill = '#222'
              // l_text.style.fill = ''
            } else {
              set_selection(selection.concat(tile))
              // l_path.style.fill = '#eee'
              // l_text.style.fill = '#000'
            }
          })
        }
      })
    }
  })

  handle = {
    ...handle,
    load: async (load_id=id) => {
      try {
        const { info:new_info, state:new_state } = await fetch_game(load_id)
        set_info(new_info)
        if (new_info.turn !== info.turn || user_ids(info).join('-') !== user_ids(new_info).join('-')) {
          set_state(new_state)
        }
      } catch (e) {
        set_info({} as any)
        set_state({} as any)
      }
    },
    play: (tiles=selection) => {
      if (tiles.length) {
        const turn_player = info[`p${info.owner}`]
        const computer_player = false // is_ai(turn_player)
        const word = tiles.map(tile => tile.letter).join('')
        log('play', {turn_player,computer_player,word,tiles,valid:is_valid_word(word)})

        if (info.turns.map(turn => turn.word).includes(word)) {
          message.trigger({
            text: `${word.toUpperCase()} has already been played`,
            ms: 3_000,
            id: 'quadbase-already-word',
            // replace: 'quadbase-invalid-word',
          })
          return
        }

        let new_info
        const post_turn = async () => {
          // handle.load_info(id)
          handle.load_list()

          if (computer_player) handle.load()

          if (new_info.id !== 'local' && info.owner !== new_info.owner) {
            const next_game = sections?.your_turn.find(x => x.id !== id)
            log({next_game,sections})
            if (next_game) {
              message.trigger({
                text: `next game vs ${user_ids(next_game).filter(x => x && x !== viewer).join(' ') || 'invites'}: /quadbase/${next_game.id}`,
                id: `quadbase-next-game`, delete: `quadbase-next-game`,
                ms: 3_000,
              })
            }
          }
        }
        
        if (!is_valid_word(word) && debug.check) {
          if (info.words.includes(word)) {
            message.trigger({
              text: `${word.toUpperCase()} has already been played`,
              ms: 3_000,
              id: 'quadbase-already-word',
              // replace: 'quadbase-invalid-word',
            })
            return
          }
          new_info = clone_info(info)
          new_info.tries += 1
          new_info.words.push(word)
          
          const tries_left = 3 - new_info.tries
          message.trigger({
            text: `${word.toUpperCase()} is not a valid word. ${tries_left} ${tries_left===1?'try':'tries'} left`,
            ms: 3_000,
            id: 'quadbase-invalid-word',
            // replace: 'quadbase-invalid-word',
          })

          const is_turn_end = new_info.tries === 3
          let new_state = state
          if (is_turn_end) {
            const turn = {
              owner: info.owner,
              t: Date.now(),
              tiles: [],
              word: '',
            }
            new_info.turn += 1
            new_info.owner = compute_new_owner(info)
            new_info.turns.push(turn)
            new_info.tries = 0
            // new_info.words = []

            if (state.deltas) {
              new_state = clone_state(state)
              new_state.deltas.push([])
              set_state(new_state)
            }
            set_selection([])
            post_turn()
          }
          set_info(new_info)
          set_play_turn(0)
          set_played(true)
          if (is_turn_end) {
            update_game(new_info, new_state)
          }
        } else {
          const play_turn_result = do_play_turn(info, state, tiles)
          new_info = play_turn_result.new_info
          new_info.words.push(word)
          const new_state = play_turn_result.new_state
          log('played', {state,new_state})
  
          set_state(new_state)
          set_info(new_info)
          set_selection([])
  
          set_play_turn(0)
          if (computer_player) {
            set_played(false)
          } else {
            set_played(true)
          }
          update_game(new_info, new_state)
  
          post_turn()
        }
      }
    },
    resign: () => {
      const new_info = clone_info(info)
      const new_state = clone_state(state)
      
      const turn = {
        owner: info.owner,
        t: Date.now(),
        tiles: [],
        word: '',
      }
      new_info.turn += 1
      new_info.owner = compute_new_owner(new_info)
      new_info.turns.push(turn)
      new_info.tries = 0
      if (!new_info.out) new_info.out = {}
      new_info.out[info.owner] = info.turn
      if (keys(new_info.out).length === 3) {
        new_info.status = new_info.owner
      }

      if (new_state.deltas) new_state.deltas.push([])

      set_info(new_info)
      set_state(new_state)
      set_selection([])
      update_game(new_info, new_state)
    },
    rematch: async () => {
      const users = user_ids(info).sort((a, b) => (info.out[a]||1e10) - (info.out[b]||1e10))
      message.trigger({
        text: 'creating rematch',
        id: 'quadbase-rematch-create',
      })
      const { info:rematch_info, state:rematch_state } = await create_game(users, info.id === 'local')
      message.trigger({
        delete: 'quadbase-rematch-create',
      })
      if (info.id === 'local') {
        set_info(rematch_info)
        set_state(rematch_state)
        handle.load_list()
        message.trigger({
          delete: `quadbase-play-turn quadbase-ai-thinking quadbase-gameover quadbase-rematch quadbase-previous`,
        })
      } else {
        log('rematch', await api.post(`/quadbase/game/${info.id}/rematched/${rematch_info.id}`))
        handle.set_path(['game', rematch_info.id])
      }
    },
  }
  // useF(_info, played, () => {
  //   if (_info && played && _info.status < 0) {
  //     const active_player = info[`p${info.owner}`]
  //     if (is_ai(active_player)) {
  //       handle.ai_move()
  //     }
  //   }
  // })

  useF(id, () => {
    set_info(undefined)
    handle.load()
  })
  useEventListener(window, 'focus', e => handle.load())
  useEventListener(window, 'keydown', e => {
    if (can_submit && e.key === 'Enter') {
      handle.play()
    } else if (e.key === 'Backspace') {
      set_selection([])
    }
  })
  useSocket({
    on: {
      'quadbase:update': updated_id => {
        log('quadbase:update', updated_id)
        if (id === updated_id) {
          handle.load()
          // message.trigger({
          //   text: 'your turn!',
          //   ms: 3_000,
          // })
        }
      }
    }
  })
  const info_from_index = useM(sections, () => values(sections).flatMap(pass).find(x => x.id === id))
  useF(info_from_index, () => handle.load())

  // join invites
  useF(viewer, _info, async () => {
    if (!_info || !viewer) return
    const can_join_invite = user_ids(info).some(x => !x) && !user_ids(info).includes(viewer)
    if (can_join_invite) {
      const {info} = await api.post(`/quadbase/game/${id}/join`)
      set_info(info)
    }
  })

  const [chat_open, set_chat_open] = useS(false)
  const [chat_unread, set_chat_unread] = useS(0)
  useE(info, chat_open, () => {
    if (can_replay) {
      const ls_words = QQ('#chat-container :is(.quadbase-word, .quadbase-word)').reverse()
      return ls_words.map((l_word, i) => {
        l_word.style.cursor = 'pointer'
        return on(l_word, 'click', e => {
          set_replay(true)
          set_replay_turn(i + 1)
          set_play_turn(0)
          set_played(false)
          set_chat_open(false)
        })
      })
    }
  })

  useStyle(profiles, `
  #chat-container :is(.quadbase-word, .quadbase-word) {
    position: relative;
    z-index: 1;
    padding: .1em .33em !important;
    border-radius: .25em !important;
  }
  #chat-container :is(.quadbase-word, .quadbase-word)::after {
    content: "";
    position: absolute;
    height: 100%; width: 100%;
    top: 0; left: 0;
    z-index: -1;
    opacity: .3;
    border-radius: inherit;
  }
  ${profiles.map((profile, i) => `
  #chat-container :is(.quadbase-word, .quadbase-word).p${i} {
    border: .05em solid ${profile.color} !important;
    border: .05em solid #000 !important;
  }
  #chat-container :is(.quadbase-word, .quadbase-word).p${i}::after {
    background: ${profile.color} !important;
  }
  `).join('')}
  `)

  const show_login_to_join = useM(info, member, () => !member && user_ids(info).some(x => !x))
  const icon_click_for = (user) => {
    const display_turn = replay ? replay_turn : info.turn
    const turn = info.turns[display_turn - 1]
    if (turn?.owner === user_ids(info).indexOf(user)) {
      return () => {
        set_play_turn(0)
        set_played(false)
        has_double_play && set_double_play(true)
      }
    }
  }

  const is_local = info.id === 'local'
  const player_name_jsx_for_i = (i) => <PlayerNameFromInfo {...{ owner:i, info, gameover, profiles, icon_click:icon_click_for(info[`p${i}`]), handle }} />

  return <>
    <div id='game-players' className='row wide gap'>
      {player_name_jsx_for_i(0)}
      {player_name_jsx_for_i(2)}
      {player_name_jsx_for_i(3)}
      {player_name_jsx_for_i(1)}
    </div>
    <div id='game-controls' className='row wide gap'>
      {word ? <InfoButton onClick={e => set_selection([])}>clear</InfoButton> : <InfoButton onClick={e => {
        handle.set_path(['menu'])
      }}>menu</InfoButton>}
      {word ? <div id='game-controls-word'>
        <Reorderable elements={selection.map(tile => {
          return <span onClick={e => {
            set_selection(selection.filter(other => other !== tile))
          }}>{tile.letter}</span>
        })} reorder={order => {
          set_selection(lists.order(selection, order))
        }} />
      </div> : last_word ? <div id='game-controls-word'>{last_word}</div> : null}
      <div className='spacer'></div>
      {word 
      ? <InfoButton disabled={!can_submit} onClick={e => handle.play()}>submit</InfoButton>
      : replay
      ? <>
        <InfoButton onClick={e => {
          set_replay_turn(Math.max(0, replay_turn - 1))
          set_play_turn(0)
          set_played(false)
        }} disabled={replay_turn === 0}>{'←'}</InfoButton>
        <InfoButton disabled={!played} onClick={e => {
          set_play_turn(0)
          set_played(false)
        }}>{replay_turn}/{info.turn || 1}</InfoButton>
        <InfoButton onClick={e => {
          set_replay_turn(Math.min(info.turn, replay_turn + 1))
          set_play_turn(0)
          set_played(false)
        }} disabled={replay_turn === info.turn}>{'→'}</InfoButton>
        <InfoButton onClick={e => set_replay(false)}>exit</InfoButton>
      </>
      : <>
        <InfoButton onClick={e => {
          open_popup(close => <>
            <InfoBody id='quadbase-game-options' className='middle-column'>
              <InfoButton disabled>turn {info.turn}</InfoButton>
              {can_replay ? <InfoButton onClick={e => {
                close()
                set_replay_turn(0)
                set_replay(true)
                set_play_turn(0)
                set_played(false)
              }}>replay</InfoButton> : null}
              <InfoButton onClick={open_howto}>how to</InfoButton>
              <InfoButton onClick={open_about}>about</InfoButton>
              {!member 
              ? null 
              : info.status < 0 
              ?
                is_turn
                ? <InfoButton onClick={() => {
                  close()
                  open_popup(close => <>
                    <InfoBody id='quadbase-game-resign' className='middle-column'>
                      are you sure? <InfoButton onClick={e => {
                        close()
                        handle.resign()
                      }}>resign</InfoButton> <InfoButton onClick={close}>cancel</InfoButton>
                    </InfoBody>
                  </>)
                }}>resign</InfoButton>
                : null
              : info.rematch
              ? null
              : <InfoButton onClick={async () => {
                close()
                handle.rematch()
              }}>rematch</InfoButton>}
              {info.rematch ? <InfoButton onClick={() => {
                close()
                handle.set_path(['game', info.rematch])
              }}>rematched</InfoButton> : null}
              {info.previous ? <InfoButton onClick={() => {
                close()
                handle.set_path(['game', info.previous])
              }}>previous</InfoButton> : null}
              <InfoButton onClick={close}>close</InfoButton>
            </InfoBody>
          </>)
        }}>more</InfoButton>
        {member ? <InfoButton onClick={e => set_chat_open(!chat_open)}>{chat_open ? 'close' : chat_unread ? `${chat_unread} unread` : is_local ? 'turns' : 'chat'}</InfoButton> : null}
      </>}
    </div>
    <div id='board-container' className='grow middle-column' ref={hex_root}>
      {info.chat
      ? <div id='chat-container' className={`chat-visible-${chat_open}`}>
        <Chat {...{ hash:`quadbase:${id}`, reading:chat_open, setUnread:set_chat_unread, special:'quadbase-word' }} />
      </div> 
      : <div id='chat-container' className={`chat-visible-${chat_open}`}>
        <div className='column gap' style={S(`
        background: #fff;
        height: 100%;
        overflow: auto;
        padding-bottom: 10em;
        `)}>
          {info.turns.slice().reverse().map(turn => {
            return <div className={`quadbase-word p${turn.owner}`} style={S(`
            ${turn.owner === 0 ? 'margin-left: auto;' : ''} 
            `)}>
              {turn.word}
            </div>
          })}
          <div style={S(`
          margin: 0 auto;
          color: #0004;
          `)}>
            tap a word to view that turn
          </div>
        </div>
      </div>}
      {!_info
      ? <NiceModal block={false}>
        <span>loading game!</span>
      </NiceModal>
      : show_login_to_join
      ? <NiceModal block={false}>
        <span><a onClick={e => openLogin()}>log in</a> to join the game!</span>
      </NiceModal>
      : null}
    </div>
  </>
}

