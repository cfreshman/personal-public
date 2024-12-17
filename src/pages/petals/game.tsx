import React from 'react'
import styled from 'styled-components'
import { A, InfoBody, InfoButton, InfoSection, InfoStyles, Reorderable } from '../../components/Info'
import { useCachedScript } from 'src/lib/hooks_ext'
import { useE, useEventListener, useF, useInterval, useM, useR, useRerender, useS, useStyle } from 'src/lib/hooks'
import { pass, truthy } from 'src/lib/types'
import { S, dev, layerBackground } from 'src/lib/util'
import { Info, State, clone_info, clone_state, construct_state, create_game, fetch_game, update_game, play_turn as do_play_turn, play_state as do_play_state, construct_tile_map, profile_colors, is_local_player, profile_icons, user_ids, next_owner, score_turn } from './data'
import { is_valid_word, rand_alpha } from './dict'
import { message } from 'src/lib/message'
import api, { auth } from 'src/lib/api'
import { useSocket } from 'src/lib/socket'
import { NiceModal, PlayerNameFromInfo, create_tile_bag, default_player_profiles, open_about, open_howto, open_popup, named_colors } from './util'
import { Chat } from 'src/components/Chat'
import { Modal, openPopup } from 'src/components/Modal'
import { Style } from './style'
import { openLogin } from 'src/lib/auth'
import { get_selection, is_ai } from './ai'
import { resolve_iframe, themes } from './theme'
import { useModals } from 'src/lib/modals'

const { named_log, node, svg_node, V, range, set, rand, Q, QQ, on, list, devices, strings, defer, values, lists, from, colors } = window as any
const log = named_log('petals game')

const debug = {
  check: true,
}
if (dev) window['petals_game_debug'] = debug


export default ({ id, hf, handle, settings, profile_map, sections }) => {
  const [{user:viewer}] = auth.use()
  const theme = useM(settings, () => themes[settings?.petals?.theme||'default'])

  const [_info, set_info] = useS<Info>(undefined)
  const info = useM(_info, () => ({
    p0: undefined,
    p1: undefined,
    turn: 0, owner: 0,
    start_t: Date.now(),
    last_t: Date.now(),
    turns: [],
    scores: [0, 0],
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
          text: `open previous: /petals/${info.previous}`,
          ms: 3_000,
          id: 'petals-previous', delete: 'petals-previous',
        })
      }
      if (info.rematch) {
        message.trigger({
          text: `open rematch: /petals/${info.rematch}`,
          ms: 3_000,
          id: 'petals-rematch', delete: 'petals-rematch',
        })
      } else if (member) {
        window[`petals-start-rematch-${info.id}`] = () => handle.rematch()
        message.trigger({
          text: `<a onclick="window['petals-start-rematch-${info.id}']()">start rematch!</a>`,
          ms: 3_000,
          id: 'petals-rematch', delete: 'petals-rematch',
        })
      }
      message.trigger({
        text: `${info[`p${info.status}`]} wins!`,
        ms: 3_000,
        id: 'petals-gameover', delete: 'petals-gameover',
      })
    } else {
      message.trigger({
        delete: 'petals-gameover',
      })
    }
  })
  const member = useM(viewer, info, () => info.id === 'local' || (viewer && info.id && user_ids(info).includes(viewer)))
  useF(state, () => log('new state', {state}))

  const [played, set_played] = useS(false)
  const get_play_length = (turn=info.turn) => info.turns.at(turn - 1)?.word.length||0
  const play_length = useM(info, () => get_play_length())
  const [play_turn, set_play_turn] = useS(0)
  useF(played, () => set_play_turn(played ? play_length : 0))

  const can_replay = !!state?.deltas
  const [replay, set_replay] = useS(false)
  // useF(replay, () => set_selection([]))
  const [replay_turn, set_replay_turn] = useS(0)
  useF(replay_turn, () => {
    if (replay_turn === 0) {
      set_played(true)
    }
  })

  const is_turn = useM(viewer, info, gameover, () => !gameover && (id === 'local' || info[`p${info.owner}`] === viewer))
  const can_play = useM(is_turn, replay, replay_turn, played, () => (!replay || replay_turn === info.turn) && is_turn && (!info.turn||played))

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

  const [profiles, set_profiles] = useS(default_player_profiles.slice(user_ids(info).length))
  useF(info, () => {
    set_profiles(profiles.map((profile, i) => profile || default_player_profiles[i]))
    handle.load_profiles(user_ids(info), true)
  })
  useF(info, profile_map, theme, () => {
    const new_profiles = range(user_ids(info).length).map(i => ({
      ...default_player_profiles[i],
      ...((is_local_player(info[`p${i}`])?undefined:profile_map[info[`p${i}`]])||{}),
      ...((theme?.profiles||[])[i]||{}),
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
  useF(selection, () => set_replay(false))

  const board_root = useR()
  const l_board = useM(() => node(`<div id="board"></div>`))
  useF(l_board, () => board_root.current.append(l_board))
  const play_timeout = useR(undefined)
  const play_turn_timeout = useR(undefined)
  const under_attack_list = useR([])
  const display_turn = useM(info, replay, replay_turn, () => replay ? replay_turn : info.turn)

  // const tile_counts = useM(state, display_turn, () => {
  //   const display_state = construct_state(state, display_turn)
  //   return range(2).map(owner => display_state.tiles.filter(x => x.owner === owner).length)
  // })
  const [tile_counts, set_tile_counts] = useS(user_ids(info).map(_ => 0))
  const some_tile_count = useM(tile_counts, () => tile_counts.some(x => x))

  const [score, set_score] = useS(user_ids(info).map(_ => 0))

  const resize = useRerender()
  useEventListener(window, 'resize', () => resize())

  useF(l_board, info?.turn, state, selection, can_play, profiles, replay, replay_turn, played, play_turn, display_turn, theme, resize, () => {
    log('render board', { info, state })
    if (!state) return

    const size = Math.sqrt(state.tiles.length)
    let inner_html = `
    <style>
      #board {
        width: ${size}em;
        height: ${size}em;
      }
      #board .tile {
        width: ${100 / size}%;
        height: ${100 / size}%;

        position: relative;
        z-index: 1;
      }
      #board .tile::before, #board .tile::after {
        content: "";
        position: absolute; height: 100%; width: 100%; top: 0; left: 0;
        background: ${theme.background};
        z-index: -1;
      }
      #board .tile::after {
        background: inherit;
      }
      ${can_play && !devices.is_mobile ? `
      #board .tile:not(.selected):hover {
        background: var(--id-color-text-readable) !important;
        color: var(--id-color-text) !important;
      }` : ''}
    </style>
    `
    
    let display_state, base_state, last_state, display_selection
    // const turn_owner = !display_turn ? 0 : next_owner({...info,owner:info.turns.at(display_turn-(played?1:2))?.owner||0})
    const turn_owner = played ? display_turn % 2 : (display_turn - 1 + 2) % 2
    log('board view', {played,display_turn,play_turn,replay,replay_turn,selection})
    if (selection.length) {
      try {
        base_state = construct_state(state, display_turn)
      } catch {
        // TODO fix this better
        base_state = construct_state(state, display_turn - 1)
      }
      // display_state = base_state
      // const base_state_tile_map = construct_tile_map(base_state)
      const mock_info = clone_info({
        ...info,
        turn: info.turn + 1,
        owner: next_owner(info),
        turns: info.turns.concat([{
          owner: info.owner,
          t: Date.now(),
          tiles: selection,
          word: selection.map(tile => tile.letter).join('')
        }]),
      })
      const { new_state:raw_display_state } = do_play_state(state, mock_info, hf)
      display_state = construct_state(raw_display_state)
      if (played) {
        set_gameover(display_turn === info.turn && info.status > -1)
      } else {
        set_gameover(false)
      }
    } else if (played) {
      display_state = construct_state(state, display_turn)
      set_gameover(display_turn === info.turn && info.status > -1)
      delete display_state.deltas
      log('regular play state', display_turn, display_state)
    } else {
      if (display_turn) {
        last_state = construct_state(state, Math.max(0, display_turn - 1))
        // display_state = construct_state(last_state, display_turn ? 1 : 0)
        delete last_state.deltas
        const actual_play_turn = played ? word.length : play_turn
        display_state = do_play_state(last_state, info, hf, display_turn, actual_play_turn, construct_state(state, display_turn)).new_state
  
        if (!played) {
          clearTimeout(play_turn_timeout.current)
          const last_play_turn = play_turn === get_play_length(display_turn)
          play_turn_timeout.current = setTimeout(() => {
            if (last_play_turn) {
              set_played(true)
            } else {
              set_play_turn(play_turn + 1)
            }
          }, last_play_turn ? 666 : 333)
    
          log({state,last_state,display_state})
          const curr_turn = info.turns[display_turn - 1]
          if (curr_turn) {
            display_selection = curr_turn.tiles.slice(0, play_turn)
    
            if (play_turn === 0) {
              const total_play_ms = 666 + 333 * curr_turn.tiles.length
      
              const play_user = info[`p${curr_turn.owner}`]
              const action = curr_turn.word ? `played ${curr_turn.word.toUpperCase()}` : ((info.status > -1 && info.status !== curr_turn.owner) && display_turn === info.turn) ? 'resigned' : 'skipped'
              message.trigger({
                text: `${play_user} ${action}`,
                ms: total_play_ms, // 666,
                id: `petals-play-turn`, delete: `petals-play-turn`,
              })
            }
          }
          set_gameover(false)
        } else {
          set_gameover(display_turn === info.turn && info.status > -1)
        }
      } else {
        display_state = state
        set_gameover(false)
      }
    }
    base_state = base_state || display_state
    display_selection = display_selection || selection

    log('state DISPLAY', display_state)

    const display_tile_map = construct_tile_map(display_state)
    const petals = display_state.tiles.filter(x => x.capital)
    const under_attack_set = set(petals.flatMap(x => hf.adj(x.pos).map(pos => display_tile_map[pos.st()]).filter(x => x && x.letter).map(x => x.pos.st())))
    log({petals,under_attack_set})

    log({played,play_turn})
    under_attack_list.current = []
    const base_state_tile_map = construct_tile_map(base_state)
    const TILE_OUT = [V.ne(2, 0), V.ne(2, 1), V.ne(2, 3), V.ne(2, 4), V.ne(0, 2), V.ne(1, 2), V.ne(3, 2), V.ne(4, 2)]
    if (display_turn === 0) TILE_OUT.push(V.ne(2, 2))
    const TILE_OUT_SET = set(TILE_OUT.map(x => x.st()))
    display_state.tiles.map((tile, i) => {
      const empty = TILE_OUT_SET.has(tile.pos.st()) || !tile.letter
      const selected = selection.some(x => x.pos.eq(tile.pos))
      const base_tile = base_state_tile_map[tile.pos.st()]
      const color = profiles[base_tile.owner]?.color
      const actual_color = !color ? theme.tile.off : base_tile.locked ? layerBackground(theme.background, `${color}ee`) : layerBackground(theme.background, `${color}cc`)
      const text_hex = colors.to_hex(theme.tile.letter) // colors.to_hex(!color ? theme.tile.letter : theme.color)
      const text_color = text_hex // `${text_hex}dd` //  color ? `${text_hex}dd` : 'var(--id-color-text)'
      inner_html += `
      <div id="group_${i}" class="tile ${selected?'selected':''} ${empty?'empty':''}" style="
      ${selected ? `
      background: #fff;
      color: #ddd;
      ` : `
      background: ${actual_color};
      color: ${text_color};
      `}
      ">${base_tile.letter}</div>
      `
    })

    l_board.innerHTML = inner_html
    l_board.style['font-size'] = `1em`
    const rect = l_board.getBoundingClientRect()
    const outer_rect = l_board.parentNode.getBoundingClientRect()
    const ratio = Math.min(outer_rect.width / rect.width, outer_rect.height / rect.height)
    log(ratio, { rect, outer_rect })
    l_board.style['font-size'] = `${Math.max(1, ratio)}em`

    // const get_animation = (target, name) => target.getAnimations().find(x => x.animationName === name)

    // let animation_time = undefined
    // under_attack_groups.map(group => {
    //   const l_group = Q(svg, group)
    //   log('animations', l_group.getAnimations())
    //   const anim_group = get_animation(l_group, 'capital-attack-group')
    //   if (!anim_group?.startTime) return // TODO better

    //   log({anim_group}, anim_group.startTime)

    //   if (animation_time === undefined) {
    //     animation_time = anim_group.startTime
    //   } else {
    //     anim_group.startTime = animation_time
    //     get_animation(Q(l_group, 'text'), 'capital-attack-text').startTime = animation_time
    //   }
    // })

    if (true || can_play) {
      base_state.tiles.map((tile, i) => {
        const l_group = Q(l_board, `#group_${i}`)
        if (tile.letter) {
          on(l_group, 'click mousedown', e => {
            const { selection } = play_ref.current
            const filtered = selection.filter(x => !x.pos.eq(tile.pos))
            if (selection.length !== filtered.length) {
              set_selection(filtered)
            } else {
              set_selection(selection.concat(tile))
            }
          })
        }
      })
    }

    // set_tile_counts(range(user_ids(info).length).map(owner => (can_play ? display_state : base_state).tiles.filter(x => x.owner === owner).length))
    set_score((can_play ? display_state : base_state).score ?? info.scores)
  })
  // useInterval(selection, () => {
  //   under_attack_list.current.map(tile => {
  //     if (selection.some(x => x.pos.eq(tile.pos))) return
  //     const l_group = Q(svg, `#group_${tile.i}`)
  //     const l_tile = Q(l_group, 'text')
  //     l_group.style.animation = 'none'
  //     l_tile.style.animation = 'none'
  //     defer(() => {
  //       l_group.style.animation = '2s capital-attack-group forwards'
  //       l_tile.style.animation = '2s capital-attack-text forwards'
  //     }, 10)
  //   })
  // }, 2_000)

  handle = {
    ...handle,
    load: async (load_id=id) => {
      try {
        const { info:new_info, state:new_state } = await fetch_game(load_id, hf)
        set_info(new_info)
        if (new_info.turn !== info.turn || user_ids(info).join('-') !== user_ids(new_info).join('-')) {
          set_state(new_state)
        }
      } catch (e) {
        set_info({} as any)
        set_state({} as any)
      }
    },
    play: async (tiles=selection, skip=false) => {
      if (tiles.length || skip) {
        const turn_player = info[`p${info.owner}`]
        const computer_player = is_ai(turn_player)
        const word = tiles.map(tile => tile.letter).join('')
        log('play', {turn_player,computer_player,word,tiles,valid:is_valid_word(word)})

        const played_word = !skip && info.words.find(other => other.startsWith(word)) || (info.tried_words||[]).includes(word)
        if (played_word) {
          message.trigger({
            text: `${played_word.toUpperCase()} has already been played`,
            ms: 3_000,
            id: 'petals-already-word',
            // replace: 'petals-invalid-word',
          })
          return
        }

        let new_info
        const post_turn = async () => {
          // handle.load_info(id)
          handle.load_list()

          // if (computer_player) handle.load()
          handle.load()

          if (new_info.id !== 'local' && info.owner !== new_info.owner) {
            const next_game = sections?.your_turn.find(x => x.id !== id)
            log({next_game,sections})
            if (next_game) {
              message.trigger({
                text: `next game vs ${user_ids(next_game).filter(x => x && x !== viewer).join(' ')||'invite'}: /petals/${next_game.id}`,
                id: `petals-next-game`, delete: `petals-next-game`,
                ms: 3_000,
              })
            }
          }
        }
        
        if ((!is_valid_word(word) && debug.check) && !skip) {
          new_info = clone_info(info)
          new_info.tries += 1
          if (!new_info.tried_words) new_info.tried_words = []
          new_info.tried_words.push(word)
          
          const tries_left = 3 - new_info.tries
          message.trigger({
            text: `${word.toUpperCase()} is not a valid word. ${tries_left} ${tries_left===1?'try':'tries'} left`,
            ms: 3_000,
            id: 'petals-invalid-word',
          })

          const is_turn_end = new_info.tries === 3
          let new_state = state
          if (is_turn_end) {
            const play_turn_result = do_play_turn(info, state, [], hf)
            new_info = play_turn_result.new_info
            const new_state = play_turn_result.new_state
            set_state(new_state)
            set_selection([])
          }
          set_info(new_info)
          set_play_turn(0)
          set_played(true)
          if (is_turn_end) {
            if (computer_player) {
              set_played(false)
            }
            await update_game(new_info, new_state)
            post_turn()
          }
        } else {
          const play_turn_result = do_play_turn(info, state, tiles, hf)
          new_info = play_turn_result.new_info
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
          await update_game(new_info, new_state)
  
          post_turn()
        }
      }
    },
    resign: () => {
      const play_turn_result = do_play_turn(info, state, [], hf)
      const new_info = play_turn_result.new_info
      const new_state = play_turn_result.new_state
      new_info.status = new_info.owner

      set_info(new_info)
      set_state(new_state)
      set_selection([])
      update_game(new_info, new_state)
    },
    // ai_move: () => {
    //   message.trigger({
    //     text: `AI is thinking of a move...`,
    //     id: `petals-ai-thinking`, delete: `petals-ai-thinking`,
    //   })
    //   defer(async () => {
    //     const { info, state } = await fetch_game(id, hf)
    //     const selection = await get_selection(info, state, hf, (progress) => message.trigger({
    //       text: `AI is thinking of a move (${progress})`,
    //       id: `petals-ai-thinking`, delete: `petals-ai-thinking`,
    //     }))
    //     log('ai selection', {selection})
    //     handle.play(selection)
    //     message.trigger({
    //       delete: `petals-ai-thinking`,
    //     })
    //   }, 500)
    // },
    rematch: async () => {
      const scores = info.scores
      const user_to_score = {}
      user_ids(info).map((user, i) => user_to_score[user] = scores[i])
      const users = user_ids(info).sort((a, b) => user_to_score[a] - user_to_score[b])
      message.trigger({
        text: 'creating rematch',
        id: 'petals-rematch-create',
      })
      const { info:rematch_info, state:rematch_state } = await create_game(hf, users, info.id === 'local')
      message.trigger({
        delete: 'petals-rematch-create',
      })
      if (info.id === 'local') {
        set_info(rematch_info)
        set_state(rematch_state)
        handle.load_list()
        message.trigger({
          delete: `petals-play-turn petals-ai-thinking petals-gameover petals-rematch petals-previous`,
        })
      } else {
        log('rematch', await api.post(`/petals/game/${info.id}/rematched/${rematch_info.id}`))
        handle.set_path(['game', rematch_info.id])
      }
    }
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
    set_chat_open(false)
    defer(() => handle.load())
  })
  useEventListener(window, 'focus', e => handle.load())
  useEventListener(window, 'keydown', e => {
    if (e.key === 'Enter') {
      handle.play()
    } else if (e.key === 'Backspace') {
      set_selection([])
    }
  })
  useSocket({
    on: {
      'petals:update': updated_id => {
        log('petals:update', updated_id)
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
  const is_local = info.id === 'local'
  useF(_info, member, is_local, async () => {
    if (!_info || member || is_local) return
    const invite = user_ids(info).some(x => !x)
    log({invite})
    if (invite) {
      const {info} = await api.post(`/petals/game/${id}/join`)
      set_info(info)
    }
  })

  const show_chat = useM(info, member, is_local, settings, () => member && !is_local && info?.chat && (settings?.petals?.chat??true))
  const [chat_open, set_chat_open] = useS(false)
  const [chat_unread, set_chat_unread] = useS(0)
  useE(info, chat_open, () => {
    if (can_replay) {
      const ls_words = QQ('#chat-container :is(.capital-word, .petals-word)').reverse()
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
  #chat-container :is(.capital-word, .petals-word) {
    position: relative;
    z-index: 1;
    padding: .1em .33em !important;
    border-radius: .25em !important;
  }
  #chat-container :is(.capital-word, .petals-word)::after {
    content: "";
    position: absolute;
    height: 100%; width: 100%;
    top: 0; left: 0;
    z-index: -1;
    opacity: .3;
    border-radius: inherit;
  }
  
  ${profiles.map((profile, i) => `
  #chat-container :is(.capital-word, .petals-word).p${i} {
    border: .05em solid ${profile.color} !important;
    border: max(1px, .05em) solid #000 !important;
  }
  #chat-container :is(.capital-word, .petals-word).p${i}::after {
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
      }
    }
  }

  const last_turn_object = useM(info, display_turn, () => info.turns.at(display_turn - 1))
  const display_owner = useM(info, display_turn, word, last_turn_object, () => word.length ? info.owner : last_turn_object?.owner || next_owner(info))
  const display_action = useM(info, display_turn, word, play_turn, last_turn_object, () => {
    if (!display_turn) return undefined
    
    const display_word = word ? word : last_turn_object?.word ?? undefined
    if (display_word !== undefined) {
      const action = display_word ? `${(word ? display_word : display_word.slice(0, play_turn)).toUpperCase()}` : ((info.status > -1 && info.status !== last_turn_object.owner) && info.turn === display_turn) ? 'resigned' : 'skipped'
      return action
    } else {
      return undefined
    }
  })
  const player_name_for_i = (i) => profiles[i] ? <PlayerNameFromInfo {...{ owner:i, info, display_turn, played, gameover, profiles, icon_click:icon_click_for(info[`p${i}`]), handle }} do_reaction={!is_local && !word && display_turn && display_turn === info.turn && last_turn_object?.owner === i && info[`p${i}`] === viewer} /> : null
  // const display_player_jsx = <PlayerNameFromInfo no_arrow do_reaction={!word && display_turn && display_turn === info.turn && info[`p${display_owner}`] === viewer} {...{ owner:display_owner, info, display_turn, gameover, profiles, handle }} />

  const modals = useModals()

  return <>
    <modals.Element handle={{
      ...handle,
      info, state, is_turn, can_play,
    }} />
    {user_ids(info).length === 2 ? <>
      <div id='game-players' className='row wide gap'>
        {player_name_for_i(0)}
        {/* <span id='game-players-vs'>vs</span> */}
        <div id='game-players-vs'>{score?.join(' - ')}</div>
        {player_name_for_i(1)}
      </div>
    </> : <>
      <div id='game-players' className='row wide gap'>
        {range(user_ids(info).length).map(i => <div className='game-player-count-and-name center-column'>
          <span id='game-players-vs'>{score && score[i]}</span>
          <span>{player_name_for_i(i)}</span>
        </div>)}
      </div>
    </>}
    <div id='game-word' className='middle-row'>
      {word
      ? <div id='game-controls-word'>
        <Reorderable elements={selection.map(tile => {
          const color = profiles[tile.owner]?.color
          const actual_color = !color ? theme.tile.off : tile.locked ? layerBackground(theme.background, `${color}ee`) : layerBackground(theme.background, `${color}cc`)
          const text_hex = colors.hex_to_canonical(theme.tile.letter)
          const text_color = text_hex // `${text_hex}dd` // color ? `${text_hex}bb` : 'var(--id-color-text)'
          return <span style={S(`
          background: ${actual_color};
          color: ${text_color};
          flex-grow: 1;
          `)} onClick={e => {
            setTimeout(() => {
              set_selection(selection.filter(other => other !== tile))
            }, 10)
          }}>{tile.letter}</span>
        })} reorder={order => {
          set_selection(lists.order(selection, order))
        }} />
      </div>
      // : some_tile_count
      // ? <div id='game-controls-word'>{tile_counts.join(' - ')}</div>
      : <div id='game-controls-word' className='empty'>&nbsp;</div>}
    </div>
    <div id='game-controls' className='row wide gap'>
      {word ? <InfoButton onClick={e => set_selection([])}>clear</InfoButton> : <InfoButton onClick={e => {
        handle.set_path(['menu'])
      }}>menu</InfoButton>}
      <div className='spacer'></div>
      {word && can_play
      ? <InfoButton disabled={!can_play} onClick={e => handle.play()}>{can_play ? 'submit' : 'not your turn'}</InfoButton>
      : replay
      ? <>
        <InfoButton onClick={e => {
          set_replay_turn(Math.max(0, replay_turn - 1))
          set_play_turn(0)
          set_played(false)
        }} disabled={replay_turn === 0}>{'←'}</InfoButton>
        <InfoButton disabled={!played || !replay_turn} onClick={e => {
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
          modals.open(({ close, handle }) => {
            const { info, state, can_play } = handle
            return <div className='middle-column' style={S(`
            padding: 1em;
            `)}>
              <InfoButton disabled>turn {info.turn}</InfoButton>
              {can_play ? <InfoButton onClick={e => {
                close()
                handle.play([], true)
              }}>skip turn</InfoButton> : null}
              {can_replay ? <InfoButton onClick={e => {
                close()
                set_replay_turn(0)
                set_replay(true)
                set_played(true)
                // set_play_turn(0)
                // set_played(false)
              }}>replay</InfoButton> : null}
              {user_ids(info).map(user => !user || is_local_player(user) || is_ai(user) ? null : <InfoButton onClick={e => {
                close()
                handle.set_stats_popup_user(user)
              }}>{user}'s stats</InfoButton>)}
              <InfoButton onClick={open_howto}>how to</InfoButton>
              <InfoButton onClick={open_about}>about</InfoButton>
              {!member 
              ? null 
              : info.status < 0 
              ?
                is_turn
                ? <InfoButton onClick={() => {
                  close()
                  modals.open(({ close, handle }) => <>
                    <InfoBody id='petals-game-resign' className='middle-column'>
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
            </div>
          })
        }}>more</InfoButton>
        <InfoButton onClick={e => set_chat_open(!chat_open)}>{chat_open ? 'close' : chat_unread ? `${chat_unread} unread` : show_chat ? 'chat' : 'turns'}</InfoButton>
      </>}
    </div>
    <div id='board-container' className='grow middle-column' ref={board_root}>
      {info.chat && show_chat
      ? <div id='chat-container' className={`chat-visible-${chat_open}`}>
        <Chat {...{ hash:`petals:${id}`, reading:chat_open, setUnread:set_chat_unread, flipped:info.p1===viewer, special:'petals-word capital-word' }} />
      </div> 
      : <div id='chat-container' className={`chat-visible-${chat_open}`}>
        <div className='column gap' style={S(`
        background: var(--id-color); color: var(--id-color-text);
        height: 100%;
        overflow: auto;
        padding-bottom: 10em;
        `)}>
          {info.turns.slice().reverse().map((turn, i) => {
            const skip = !turn.word && ((info.status > -1 && info.status !== info.owner) && i === info.turn - 1 ? 'resigned' : 'skipped')
            return <div className={`petals-word p${turn.owner} ${skip?'petals-skip':''}`} style={S(`
            ${turn.owner === 0 ? 'margin-left: auto;' : ''} 
            `)}>
              {turn.word || skip}
            </div>
          })}
          <div style={S(`
          margin: 0 auto;
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

