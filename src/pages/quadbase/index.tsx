import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoButton, InfoSection, InfoStyles } from '../../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { truthy } from 'src/lib/types'
import Menu from './menu'
import Game from './game'
import Stats from './stats'
import { useEventListener, useF, useM, useR, useS, useStyle } from 'src/lib/hooks'
import { dev } from 'src/lib/util'
import api, { auth } from 'src/lib/api'
import { Style } from './style'
import { NiceModal, open_popup } from './util'
import { Modal } from 'src/components/Modal'
import { message } from 'src/lib/message'
import { fetch_game, fetch_profile, play_turn, update_game } from './data'
import { useSocket } from 'src/lib/socket'
import { dict, load_lang } from './dict'
import user from 'src/lib/user'

const { named_log, list, set, defer, keys } = window as any
const log = named_log('quadbase')

const sort_list_info_by_last_t = (list, reverse=false) => list.sort((a, b) => (b.last_t - a.last_t) * (reverse ? -1 : 1))

export default () => {
  usePageSettings({
    // professional: true,
    background: '#fff',
    icon: '/raw/quadbase/icon.png',
  })

  const [{user:viewer}] = auth.use()

  const [[page, page_id, page_modifier], set_path] = usePathState({
    push: true,
    from: (path): ['menu'|'game'|'stats'|'game-stats', string, string] => {
      const parts = path.split('/').filter(truthy)
      if (parts.length === 1) {
        return ['game', parts[0], undefined]
      }
      return [parts[0] || 'menu', parts[1], parts[2]]
    },
    to: ([page, page_id=undefined, page_modifier=undefined]) => {
      if (page === 'menu') return ''
      if (page === 'game') return page_id || 'local'
      return [page, page_id, page_modifier].filter(truthy).join('/')
    },
  })
  useF(page, () => log({page}))
  useF(page, () => {
    if (page !== 'game') {
      message.trigger({
        delete: `quadbase-play-turn quadbase-ai-thinking quadbase-gameover quadbase-rematch quadbase-previous`,
      })
    }
  })
  const modes = {
    menu: page === 'menu',
    game: page === 'game' || page === 'game-stats',
    stats: page === 'stats',
    game_stats: page === 'game-stats',
  }

  const [list_info, set_list_info] = useS(undefined)
  const [profile_map, set_profile_map] = useS({})
  const [stats_popup_user, set_stats_popup_user] = useS(undefined)

  const handle = {
    set_path, set_stats_popup_user,
    load_list: async () => {
      const {info:local} = await fetch_game('local')
      const { list=[] } = viewer ? await api.get('/quadbase') : {}
      log({list})
      set_list_info([local, ...list])
    },
    load_info: async (id) => {
      const {info} = await api.get(`/quadbase/game/${id}/info`)
      const new_list_info = list_info.slice()
      const existing_info_index = new_list_info.indexOf(x => x.id === info.id)
      if (existing_info_index) {
        new_list_info[existing_info_index] = info
      } else {
        new_list_info.push(info)
      }
      set_list_info(new_list_info)
      log('load info', {id,list_info,new_list_info})
    },
    load_profiles: async (users, force=false) => {
      const new_profile_map = {
        ...profile_map,
      }
      await Promise.all(users.filter(x => x && (!profile_map[x] || force)).map(async user => {
        new_profile_map[user] = await fetch_profile(user)
      }))
      set_profile_map(new_profile_map)
    },
    set_profile: (user, profile) => {
      set_profile_map({
        ...profile_map,
        [user]: profile,
      })
    },
    open_stats: (user=viewer) => {
      // open_popup(close => <InfoBody id='game-popup-stats'>
      //   <Stats {...{ user, handle, profile_map }} />
      //   <div>&nbsp;</div>
      //   <div className='row wide end'><InfoButton onClick={close}>close</InfoButton></div>
      // </InfoBody>)
      set_stats_popup_user(user)
    },
  }

  useF(modes.game_stats, page_modifier, () => modes.game_stats && set_stats_popup_user(page_modifier))

  useCachedScript('/lib/2/hecks/script.js')
  const hecks = window['hecks']
  const hf = useM(hecks, () => hecks && new hecks.Field(1, hecks.Field.Orientation.TOP_FLAT))

  useSocket({
    on: {
      'quadbase:update': id => {
        log('quadbase:update', id)
        // handle.load_info(id)
        handle.load_list()
      }
    }
  })

  useF(viewer, handle.load_list)
  useEventListener(window, 'focus', e => handle.load_list())
  useF(list_info, () => {
    if (!list_info) return
    const others = list(set(list_info.flatMap(x => [x.p0, x.p1]))).filter(x => x && x !== viewer)
    handle.load_profiles(others)
  })
  const sections = useM(list_info, () => list_info && ({
    local: list_info.filter(info => info.id === 'local'),
    your_turn: sort_list_info_by_last_t(list_info.filter(info => {
      const is_turn = info.owner === 0 ? info.p0 === viewer : info.p1 === viewer
      return is_turn && info.id !== 'local' && info.status === -1
    }), true),
    their_turn: sort_list_info_by_last_t(list_info.filter(info => {
      const is_turn = info.owner === 0 ? info.p0 === viewer : info.p1 === viewer
      return !is_turn && info.id !== 'local' && info.status === -1
    })),
    completed: sort_list_info_by_last_t(list_info.filter(info => info.id !== 'local' && info.status !== -1)),
  }))

  const current_is_local_game = useR(false)
  const current_ai_handle = useR({})
  const local_t = useM(page, page_id, sections, () => {
    return sections?.local.find(truthy)?.last_t || 0
  })
  const [dict_ready, set_dict_ready] = useS(false)
  useF(() => defer(() => load_lang('english').then(() => set_dict_ready(true)), 5_000))
  useF(page, page_id, () => {
    current_is_local_game.current = page === 'game' && page_id === 'local'
  })
  useF(local_t, dict_ready, () => {
    log({dict_ready,local_t}, dict.words)
    if (!dict_ready) return
    keys(current_ai_handle.current).map(k => current_ai_handle.current[k] = true)
    sections?.local.map(local_info => {
      if (local_info.status < 0) {
        const active_player = local_info[`p${local_info.owner}`]
        // if (is_ai(active_player)) {
        //   const ai_handle = rand.alphanum(16)
        //   current_ai_handle.current[ai_handle] = false
        //   const trigger_for_game = (value, invert=false) => current_is_local_game.current!==invert && message.trigger(value)
        //   trigger_for_game({
        //     text: `${active_player} is thinking of a move...`,
        //     id: `quadbase-ai-thinking`, delete: `quadbase-ai-thinking`,
        //   })
        //   defer(async () => {
        //     try {
        //       const { info, state } = await fetch_game(local_info.id, hf)
        //       const selection = await get_selection(info, state, hf, (progress) => trigger_for_game({
        //         text: `${active_player} is thinking of a move (${progress})`,
        //         id: `quadbase-ai-thinking`, delete: `quadbase-ai-thinking`,
        //       }), () => current_ai_handle.current[ai_handle])
        //       log('ai selection', {selection})
        //       const { new_info, new_state } = play_turn(info, state, selection, hf)
        //       update_game(new_info, new_state)
        //       trigger_for_game({
        //         delete: `quadbase-ai-thinking`,
        //       })
        //       handle.load_list()
        //       trigger_for_game({
        //         text: `${active_player} played ${new_info.turns.at(-1).word.toUpperCase()} in quadbase: /quadbase/local`,
        //         ms: 5_000,
        //         id: 'quadbase-turn', delete: 'quadbase-turn',
        //         to: `/quadbase/local`,
        //       }, true)
        //     } catch (e) {
        //       log('ai turn', e)
        //       delete current_ai_handle.current[ai_handle]
        //     }
        //   })
        // }
      }
    })
  })

  useStyle(`
  #game-modal {
    width: max-content;
    height: max-content;
    max-width: calc(100% - 1em);
    max-height: calc(100% - 6em);
    border: 1px solid #000;
    box-shadow: 0px 2.5px 1px var(--id-color-text), 0px 0px 1px var(--id-color-text) !important;
    pointer-events: all;
  }
  `)
  return <Style>
    <InfoBody>
      {modes.game
      ? hecks ? <Game {...{ id:page_id, hf, handle, profile_map, sections }} /> : <div>loading!</div>
      : modes.stats
      ? <Stats {...{ user:page_id, hf, handle, profile_map }} />
      : hecks ? <Menu {...{ hf, handle, profile_map, sections }} /> : <div>loading!</div>}
      {stats_popup_user ? <NiceModal on_close={e => set_stats_popup_user(undefined)}>
        <Stats {...{ user:stats_popup_user, hf, handle, profile_map }} embedded />
        <div>&nbsp;</div>
        <div className='row wide end'><InfoButton onClick={e => set_stats_popup_user(undefined)}>close</InfoButton></div>
      </NiceModal> : null}
    </InfoBody>
  </Style>
}
