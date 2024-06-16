import React from 'react'
import styled from 'styled-components'
import { A, InfoBody, InfoButton, InfoSection, InfoStyles, Reorderable } from '../../components/Info'
import { useCachedScript } from 'src/lib/hooks_ext'
import { useE, useEventListener, useF, useInterval, useM, useR, useRerender, useS, useStyle } from 'src/lib/hooks'
import { pass, truthy } from 'src/lib/types'
import { S, dev } from 'src/lib/util'
import { Info, State, clone_info, clone_state, construct_state, create_game, fetch_game, update_game, play_turn as do_play_turn, play_state as do_play_state, construct_tile_map, user_ids, profile_colors, new_turn, get_n_users, is_local_player, profile_icons } from './data'
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

const { named_log, node, svg_node, V, range, set, rand, Q, QQ, on, list, devices, strings, defer, values, lists } = window as any
const log = named_log('capitals game')

const debug = {
  check: true,
}
if (dev) window['capitals_game_debug'] = debug


export default ({ id, hf, handle, settings, profile_map, sections }) => {
  const [{user:viewer}] = auth.use()
  const theme = useM(settings, () => themes[settings?.capitals?.theme||'default'])

  const [_info, set_info] = useS<Info>(undefined)
  const info = useM(_info, () => ({
    p0: undefined,
    p1: undefined,
    turn: 0, owner: 0,
    start_t: Date.now(),
    last_t: Date.now(),
    turns: [],
    status: -1, out: {},
    tries: 0,
    words: [],
    ..._info,
  }))
  const n_users = useM(info, () => get_n_users(info))
  const [_state, set_state] = useS<State>(undefined)
  const state = useM(_state, () => ({
    tiles: [],
    ..._state,
  }))
  useF(info, n_users, state, () => log('set info/state', {n_users,info,state}))
  const [gameover, set_gameover] = useS(false)
  useF(gameover, () => {
    if (gameover) {
      if (info.previous) {
        message.trigger({
          text: `open previous: /lettercomb/${info.previous}`,
          ms: 3_000,
          id: 'capitals-previous', delete: 'capitals-previous',
        })
      }
      if (info.rematch) {
        message.trigger({
          text: `open rematch: /lettercomb/${info.rematch}`,
          ms: 3_000,
          id: 'capitals-rematch', delete: 'capitals-rematch',
        })
      } else if (member) {
        window[`capitals-start-rematch-${info.id}`] = () => handle.rematch()
        message.trigger({
          text: `<a onclick="window['capitals-start-rematch-${info.id}']()">start rematch!</a>`,
          ms: 3_000,
          id: 'capitals-rematch', delete: 'capitals-rematch',
        })
      }
      message.trigger({
        text: `${info[`p${info.status}`]} wins!`,
        ms: 3_000,
        id: 'capitals-gameover', delete: 'capitals-gameover',
      })
    } else {
      message.trigger({
        delete: 'capitals-gameover',
      })
    }
  })
  const member = useM(viewer, info, () => info.id === 'local' || (viewer && info.id && user_ids(info).includes(viewer)))
  useF(state, () => log('new state', {state}))

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
  useF(info, profile_map, theme, () => {
    const users = user_ids(info)
    const n_users = users.length

    const claimed_colors = {}
    const claimed_icons = {}
    range(n_users).reverse().filter(i => !is_local_player(info[`p${i}`])).map(i => {
      const profile = profile_map[info[`p${i}`]]
      if (profile) {
        if (profile.color) claimed_colors[profile.color] = i
        if (profile.icon) claimed_icons[profile.icon] = i
        // log(i, {profile, claimed_colors, claimed_icons})
      }
    })

    const default_colors = {}
    const default_icons = {}
    const is_default = (i) => !profile_map[info[`p${i}`]]
    range(n_users).filter(is_default).map(i => {
      const profile = default_player_profiles[i]
      log('default_colors', i, profile)
      if (profile) {
        if (profile.color) default_colors[profile.color] = i
        if (profile.icon) default_icons[profile.icon] = i
        log(i, {profile, default_colors, default_icons})
      }
    })

    log({claimed_colors,claimed_icons,default_colors,default_icons}, range(n_users).filter(i => !profile_map[info[`p${i}`]]), range(n_users).filter(i => is_local_player(info[`p${i}`])))

    const new_profiles = range(n_users).map(i => ({
      ...default_player_profiles[i],
      ...((is_local_player(info[`p${i}`])?undefined:profile_map[info[`p${i}`]])||{}),
      ...((theme?.profiles||[])[i]||{}),
    }))
    let color_i = 0, icon_i = 0
    new_profiles.map((profile, p_i) => {
      while ((claimed_colors[profile.color] && claimed_colors[profile.color] !== p_i)
        || (is_default(p_i) && default_colors[profile.color] && default_colors[profile.color] !== p_i)
        || new_profiles.slice(0, p_i).some(other => other.color === profile.color)) {

        profile.color = profile_colors[color_i]
        color_i += 1
      }
      while ((claimed_icons[profile.icon] && claimed_icons[profile.icon] !== p_i)
        || (is_default(p_i) && default_icons[profile.icon] && default_icons[profile.icon] !== p_i)
        || new_profiles.slice(0, p_i).some(other => other.icon === profile.icon)) {
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

  const hex_root = useR()
  const svg = useM(() => node(`
  <svg id="svg"
  viewBox="-1 -1 2 2"
  xmlns="http://www.w3.org/2000/svg"
  ></svg>`))
  useF(svg, () => hex_root.current.append(svg))
  const play_timeout = useR(undefined)
  const play_turn_timeout = useR(undefined)
  const under_attack_list = useR([])
  const display_turn = useM(info, replay, replay_turn, double_play, () => replay ? replay_turn : info.turn - (double_play ? 1 : 0))
  const last_word = useM(info, display_turn, () => display_turn ? info.turns.at(display_turn - 1)?.word || 'skipped' : undefined)
  useF(svg, info?.turn, state, selection, can_play, profiles, replay, replay_turn, played, play_turn, double_play, display_turn, () => {
    log('render board', { info, state })
    if (!state) return

    // svg.setAttribute('viewBox', n_users === 2 ? '-6 -6.25 12 12.5' : n_users === 3 ? '-7 -8 14 16' : '-11.5 -10.5 23 21')

    let svg_inner_html = `
    <style>
      #svg {
        user-select: none;
        max-height: 100%;
      }
      #svg g {
      }
      #svg path {
        fill: inherit;
        stroke: var(--id-color);
        stroke-width: .1;
      }
      #svg text {
        fill: var(--id-color);
        stroke: none;
        text-anchor: middle;
        // dominant-baseline: ${devices.is_mobile ? 'middle' : 'central'};
        font-size: 1px;
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
      #svg g.letter:hover path {
        fill: transparent !important;
      }
      #svg g.letter:hover text {
        fill: var(--id-color-text);
      }` : ''}
      @keyframes capital-attack-group {
        0% {
          fill: ${theme.tile.tentative};
        }
        49% {
          fill: ${theme.tile.tentative};
        }
        50% {
          fill: #000;
        }
        100% {
          fill: #000;
        }
      }
      @keyframes capital-attack-text {
        // 0% {
        //   fill: #000;
        // }
        // 49% {
        //   fill: #000;
        // }
        // 50% {
        //   fill: #fff;
        // }
      }
      #svg g.letter.under-attack${can_play && !devices.is_mobile?':not(:hover)':''} {
        animation: 2s capital-attack-group forwards;
        & text {
          animation: 2s capital-attack-text forwards;
        }
      }
    </style>
    `
    
    let display_state, base_state, last_state, last_turn_tile_map, display_selection
    if (!played && display_turn) {
      last_state = construct_state(state, Math.max(0, display_turn - 1))
      // display_state = construct_state(last_state, display_turn ? 1 : 0)
      delete last_state.deltas
      display_state = do_play_state(last_state, info, hf, display_turn, play_turn, construct_state(state, display_turn)).new_state

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
            id: `capitals-play-turn`, delete: `capitals-play-turn`,
          })
        }
      }
      set_gameover(false)
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
        owner: new_turn(info),
        turns: info.turns.concat([{
          owner: info.owner,
          t: Date.now(),
          tiles: selection,
          word: selection.map(tile => tile.letter).join('')
        }]),
      })
      const { new_state:raw_display_state, new_boundary_tiles } = do_play_state(state, mock_info, hf)
      display_state = construct_state(raw_display_state)
      const display_state_tile_map = {}
      display_state.tiles.map(tile => display_state_tile_map[tile.pos.st()] = tile)
      selection.map(tile => {
        const display_tile = display_state_tile_map[tile.pos.st()]
        // display_tile.letter = tile.letter
        display_tile.selected = info.owner
        display_tile.captured = display_tile.owner < 0 && theme.tile.tentative // '#222'
      })
      new_boundary_tiles.map(tile => {
        const display_tile = display_state_tile_map[tile.pos.st()]
        // display_tile.letter = ''
        display_tile.captured = theme.tile.tentative //'#222' // base_state_tile_map[tile.pos.st()].owner < 0 ? '#222' : profiles[1-info.owner].color
      })
      base_state.tiles.map(tile => {
        const display_tile = display_state_tile_map[tile.pos.st()]
        display_tile.letter = tile.letter
        display_tile.capital = display_tile.owner > -1 && tile.capital
      })
      log({hide_capital:info.turn > 0 && info.owner === info.turns.at(-1).owner})
      // if (info.turn > 0 && info.owner === info.turns.at(-1).owner) {
      //   display_state.tiles.map(tile => {
      //     if (tile.capital && tile.owner !== info.owner) {
      //       tile.capital = false
      //     }
      //   })
      // }
      log({mock_info,display_state,new_boundary_tiles})
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
    }
    base_state = base_state || display_state
    display_selection = display_selection || selection

    // const actual_state = construct_state(state, replay ? replay_turn : played ? info.turn : Math.max(0, info.turn - 1))
    // if (!replay && !played) setTimeout(() => set_played(true), 1_000)

    const display_tile_map = construct_tile_map(display_state)
    const capitals = display_state.tiles.filter(x => x.capital)
    const under_attack_set = set(capitals.flatMap(x => hf.adj(x.pos).map(pos => display_tile_map[pos.st()]).filter(x => x && x.letter).map(x => x.pos.st())))
    log({capitals,under_attack_set})

    log({played,play_turn})
    under_attack_list.current = []
    display_state.tiles.map((tile, i) => {
      const last_tile = last_turn_tile_map[tile.pos.st()] 
      const selected = base_state === display_state && selection.some(x => x.pos.eq(tile.pos))
      const cart = hf.to_cartesian(tile.pos)
      const vs = hf.to_vertices(tile.pos)
      // const played = played_tile && tile.pos.eq(played_tile.pos) && tile.owner === -1
      const played_selected = base_state === display_state && display_selection.some(x => x.pos.eq(tile.pos))
      const tile_played = base_state === display_state ? last_tile && played_selected && tile.owner === -1 : false // tile.owner < 0 && tile.selected
      const color = selected ? 'var(--id-color)' : tile_played ? theme.tile.tentative : profiles[tile.owner]?.color || (tile.letter ? theme.tile.letter : theme.tile.off)
      const text = tile.letter || (tile.capital ? profiles[tile.owner].icon : '')
      const under_attack = !selected && played && under_attack_set.has(tile.pos.st()) // played && hf.adj(tile.pos).map(pos => display_tile_map[pos.st()]).filter(x=>x).some(x => x.capital)
      // log({i,tile,under_attack}, hf.adj(tile.pos).map(pos => display_tile_map[pos.st()]))
      // log(tile.letter, tile.pos.st(), under_attack)
      // if (under_attack) under_attack_groups.push(`#group_${i}`)
      if (under_attack) under_attack_list.current.push({i,...tile})
      svg_inner_html += `
      <g id="group_${i}" class="${tile.letter?'letter':''} ${tile_played?`played`:''} ${selected?'selected':''}" style="
      fill: ${tile.captured || color};
      // ${tile.captured || (tile.owner < 0 && tile.selected) ? 'opacity: .5;' : ''}
      ">
        <path d="M ${vs[0][0]},${vs[0][1]} ${vs.slice(1).concat([vs[0]]).map(v => {
          return `L ${v[0]},${v[1]}`
        })} Z" />
        <text x=${cart.x} y=${cart.y} dy='.33em' style="
        ${selected ? 'fill: #000;' : ''}
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
    const bbox = svg.getBBox({stroke:true})
    svg.setAttribute('viewBox', `${bbox.x - .05} ${bbox.y - .05} ${bbox.width + .1} ${bbox.height + .1}`)

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

    if (can_play) {
      base_state.tiles.map((tile, i) => {
        const l_group = Q(svg, `#group_${i}`)
        const l_path = Q(l_group, `path`)
        const l_text = Q(l_group, `text`)
        if (tile.letter) {
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
        log('loaded info/state', user_ids(info), {new_info,new_state})
        if (new_info.turn !== info.turn || user_ids(info).join('-') !== user_ids(new_info).join('-')) {
          log('set state')
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
        const computer_player = is_ai(turn_player)
        const word = tiles.map(tile => tile.letter).join('')
        log('play', {turn_player,computer_player,word,tiles,valid:is_valid_word(word)})

        if (info.words.includes(word)) {
          message.trigger({
            text: `${word.toUpperCase()} has already been played`,
            ms: 3_000,
            id: 'capitals-already-word',
            // replace: 'capitals-invalid-word',
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
                text: `next game vs ${user_ids(next_game).filter(x => x && x !== viewer).join(' ')||'invite'}: /lettercomb/${next_game.id}`,
                id: `capitals-next-game`, delete: `capitals-next-game`,
                ms: 3_000,
              })
            }
          }
        }
        
        if (!is_valid_word(word) && debug.check) {
          new_info = clone_info(info)
          new_info.tries += 1
          new_info.words.push(word)
          
          const tries_left = 3 - new_info.tries
          message.trigger({
            text: `${word.toUpperCase()} is not a valid word. ${tries_left} ${tries_left===1?'try':'tries'} left`,
            ms: 3_000,
            id: 'capitals-invalid-word',
            // replace: 'capitals-invalid-word',
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
            new_info.owner = 1 - info.owner
            new_info.turns.push(turn)
            new_info.tries = 0
            new_info.words = []

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
      new_info.owner = new_turn(info)
      new_info.turns.push(turn)
      new_info.tries = 0
      new_info.status = new_info.owner

      if (new_state.deltas) new_state.deltas.push([])

      set_info(new_info)
      set_state(new_state)
      set_selection([])
      update_game(new_info, new_state)
    },
    // ai_move: () => {
    //   message.trigger({
    //     text: `AI is thinking of a move...`,
    //     id: `capitals-ai-thinking`, delete: `capitals-ai-thinking`,
    //   })
    //   defer(async () => {
    //     const { info, state } = await fetch_game(id, hf)
    //     const selection = await get_selection(info, state, hf, (progress) => message.trigger({
    //       text: `AI is thinking of a move (${progress})`,
    //       id: `capitals-ai-thinking`, delete: `capitals-ai-thinking`,
    //     }))
    //     log('ai selection', {selection})
    //     handle.play(selection)
    //     message.trigger({
    //       delete: `capitals-ai-thinking`,
    //     })
    //   }, 500)
    // },
    rematch: async () => {
      const users = info.out ? user_ids(info).sort((a, b) => (info.out[a]||1e10) - (info.out[b]||1e10)) : (x => {
        if (info.status === 0) x.reverse()
        return x
      })([info.p0, info.p1])
      message.trigger({
        text: 'creating rematch',
        id: 'capitals-rematch-create',
      })
      const { info:rematch_info, state:rematch_state } = await create_game(hf, users, info.id === 'local')
      message.trigger({
        delete: 'capitals-rematch-create',
      })
      if (info.id === 'local') {
        set_info(rematch_info)
        set_state(rematch_state)
        handle.load_list()
        message.trigger({
          delete: `capitals-play-turn capitals-ai-thinking capitals-gameover capitals-rematch capitals-previous`,
        })
      } else {
        log('rematch', await api.post(`/capitals/game/${info.id}/rematched/${rematch_info.id}`))
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
      'capitals:update': updated_id => {
        log('capitals:update', updated_id)
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
    if (!_info || !viewer || is_local) return
    const invite = user_ids(info).some(x => !x) && !user_ids(info).includes(viewer)
    log({invite})
    if (invite) {
      const {info} = await api.post(`/capitals/game/${id}/join`)
      set_info(info)
    }
  })

  const is_local = info.id === 'local'

  const show_chat = useM(info, member, is_local, settings, () => member && !is_local && info?.chat && (settings?.capitals?.chat??true))
  const [chat_open, set_chat_open] = useS(false)
  const [chat_unread, set_chat_unread] = useS(0)
  useE(info, chat_open, () => {
    if (can_replay) {
      const ls_words = QQ('#chat-container :is(.capital-word, .capitals-word, .multipals-word)').reverse()
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
  #chat-container :is(.capital-word, .capitals-word, .multipals-word) {
    position: relative;
    z-index: 1;
    padding: .1em .33em !important;
    border-radius: .25em !important;
  }
  #chat-container :is(.capital-word, .capitals-word, .multipals-word)::after {
    content: "";
    position: absolute;
    height: 100%; width: 100%;
    top: 0; left: 0;
    z-index: -1;
    opacity: .3;
    border-radius: inherit;
  }
  
  ${profiles.map((profile, i) => `
  #chat-container :is(.capital-word, .capitals-word, .multipals-word).p${i} {
    border: .05em solid ${profile.color} !important;
    border: max(1px, .05em) solid #000 !important;
  }
  #chat-container :is(.capital-word, .capitals-word, .multipals-word).p${i}::after {
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

  const last_turn_object = useM(info, display_turn, () => info.turns.at(display_turn - 1))
  const display_owner = useM(info, display_turn, word, last_turn_object, () => word.length ? info.owner : last_turn_object?.owner || new_turn(info))
  const display_action = useM(info, display_turn, word, play_turn, last_turn_object, () => {
    if (!display_turn) return undefined
    
    const display_word = word ? word : last_turn_object?.word ?? undefined
    if (display_word !== undefined) {
      const action = display_word ? `${(word ? display_word : display_word.slice(0, play_turn)).toUpperCase()}` : info.status > -1 && info.turn === display_turn ? 'resigned' : 'skipped'
      return action
    } else {
      return undefined
    }
  })
  // const display_player_jsx = <PlayerNameFromInfo no_arrow do_reaction={!word && display_turn && display_turn === info.turn && info[`p${display_owner}`] === viewer} {...{ owner:display_owner, info, display_turn, gameover, profiles, handle }} />

  const player_name_for_i = (i) => <PlayerNameFromInfo {...{ owner:i, info, display_turn, played, gameover, profiles, icon_click:icon_click_for(info[`p${i}`]), handle }} do_reaction={0 && !is_local && !word && display_turn && display_turn === info.turn && last_turn_object?.owner === i && info[`p${i}`] === viewer} />

  return <>
    {/* {theme.iframe ? <iframe src={resolve_iframe(theme.iframe, {profiles})} style={S(`
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    `)} /> : null} */}
    {/* {false && display_action !== undefined ? <div id='game-players' className='game-players-last row wide'>
      {display_owner === 1 ? display_player_jsx : null}
      <div className='spacer' />
      {display_owner === 0 ? display_player_jsx : null}

      {display_action ? <div id='game-players-action'>
        <InfoButton onClick={icon_click_for(info[`p${display_owner}`])}>{display_action}</InfoButton>
      </div> : null}
    </div> : <div id='game-players' className='row wide gap'>
      <PlayerNameFromInfo do_reaction={!is_local && !word && display_turn && display_turn === info.turn && last_turn_object?.owner === 1 && info.p1 === viewer} {...{ owner:1, info, display_turn, gameover, profiles, icon_click:icon_click_for(info.p1), handle }} />
      <span id='game-players-vs'>vs</span>
      <PlayerNameFromInfo do_reaction={!is_local && !word && display_turn && display_turn === info.turn && last_turn_object?.owner === 0 && info.p0 === viewer} {...{ owner:0, info, display_turn, gameover, profiles, icon_click:icon_click_for(info.p0), handle }} />
    </div>} */}
    {n_users === 2 ? <>
      <div id='game-players' className='row wide gap'>
        {player_name_for_i(1)}
        {player_name_for_i(0)}
      </div>
    </> : n_users === 3 ? <>
      <div id='game-players' className='row wide gap'>
        {player_name_for_i(1)}
        {player_name_for_i(2)}
        {player_name_for_i(0)}
      </div>
    </> : <>
      <div id='game-players' className='row wide gap'>
        {player_name_for_i(5)}
        {player_name_for_i(4)}
        {player_name_for_i(2)}
      </div>
      <div id='game-players' className='row wide gap'>
        {player_name_for_i(3)}
        {player_name_for_i(1)}
        {player_name_for_i(0)}
      </div>
    </>}
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
      </div> : /*last_word ? <div id='game-controls-word'>{last_word}</div> :*/ null}
      <div className='spacer'></div>
      {word 
      ? <InfoButton onClick={e => handle.play()}>submit</InfoButton>
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
            <InfoBody id='capitals-game-options' className='middle-column'>
              <InfoButton disabled>turn {info.turn}</InfoButton>
              {can_replay ? <InfoButton onClick={e => {
                close()
                set_replay_turn(0)
                set_replay(true)
                set_play_turn(0)
                set_played(false)
              }}>replay</InfoButton> : null}
              {n_users > 2 ? null : user_ids(info).map(user => !user || is_local_player(user) || is_ai(user) ? null : <InfoButton onClick={e => {
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
                  open_popup(close => <>
                    <InfoBody id='capitals-game-resign' className='middle-column'>
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
        <InfoButton onClick={e => set_chat_open(!chat_open)}>{chat_open ? 'close' : chat_unread ? `${chat_unread} unread` : show_chat ? 'chat' : 'turns'}</InfoButton>
      </>}
    </div>
    <div id='board-container' className='grow middle-column' ref={hex_root}>
      {info.chat && show_chat
      ? <div id='chat-container' className={`chat-visible-${chat_open}`}>
        <Chat {...{ hash:`capitals:${id}`, reading:chat_open, setUnread:set_chat_unread, flipped:(n_users === 2 && info.p1 === viewer), special:'capitals-word capital-word multipals-word' }} />
      </div> 
      : <div id='chat-container' className={`chat-visible-${chat_open}`}>
        <div className='column gap' style={S(`
        background: var(--id-color); color: var(--id-color-text);
        height: 100%;
        overflow: auto;
        padding-bottom: 10em;
        `)}>
          {info.turns.slice().reverse().map((turn, i) => {
            const skip = !turn.word && (info.status > -1 && i === info.turn - 1 ? 'resigned' : 'skipped')
            return <div className={`capitals-word p${turn.owner} ${skip?'capitals-skip':''}`} style={S(`
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

