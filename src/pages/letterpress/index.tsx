import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBody, InfoButton, InfoSection, InfoStyles } from '../../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { truthy } from 'src/lib/types'
import Menu from './menu'
import Game from './game'
import Stats from './stats'
import { useEventListener, useF, useM, useR, useS, useStyle, useTimed } from 'src/lib/hooks'
import { S, dev } from 'src/lib/util'
import api, { auth } from 'src/lib/api'
import { Style } from './style'
import { NiceModal, open_popup } from './util'
import { Modal } from 'src/components/Modal'
import { message } from 'src/lib/message'
import { COOKIES_LETTERPRESS, create_game, fetch_game, fetch_profile, play_turn, update_game, user_ids } from './data'
import { useSocket } from 'src/lib/socket'
import { get_selection, is_ai } from './ai'
import { dict, load_lang } from './dict'
import user from 'src/lib/user'
import { resolve_iframe, themes } from './theme'
import { track_lists, track_play } from 'src/lib/track_player'
import { store } from 'src/lib/store'
import { copy } from 'src/lib/copy'
import { openLogin } from 'src/lib/auth'

const { named_log, list, set, defer, keys } = window as any
const log = named_log('letterpress')

const sort_list_info_by_last_t = (list, reverse=false) => list.sort((a, b) => (b.last_t - a.last_t) * (reverse ? -1 : 1))

export default () => {
  const [{user:viewer}] = auth.use()
  const [settings] = user.settings.use()
  const theme = useM(settings, () => themes[settings?.letterpress?.theme||'default'])

  const [[page, page_id, page_modifier], set_path] = usePathState({
    push: true,
    from: (path): ['menu'|'game'|'stats'|'game-stats'|'new', string, string] => {
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
  useF(page, () => {
    if (page !== 'game') {
      message.trigger({
        delete: `letterpress-play-turn letterpress-ai-thinking letterpress-gameover letterpress-rematch letterpress-previous`,
      })
    }
  })
  const modes = useM(page, () => ({
    menu: page === 'menu' || page === 'new',
    game: (page === 'game' || page === 'game-stats') && page_id,
    stats: page === 'stats',
    game_stats: page === 'game-stats',
    new: page === 'new' && page_id,
  }))
  useF(page, page_id, page_modifier, modes, () => log({page, page_id, page_modifier, modes}))

  const [list_info, set_list_info] = useS(undefined)
  const [profile_map, set_profile_map] = store.use(COOKIES_LETTERPRESS.PROFILES, { default:{} })
  const [stats_popup_user, set_stats_popup_user] = useS(undefined)

  const [challenge_link, set_challenge_link] = useS(undefined)
  const [copied_challenge, set_copied_challenge] = useTimed(3_000, false)
  useF(modes.new, page_id, async () => {
    if (modes.new && page_id) {
      set_challenge_link(undefined)
      const { user, id } = await api.get(`/letterpress/challenge/${page_id}`)
      set_challenge_link({user,id})
    } else {
      set_challenge_link(undefined)
    }
  })

  const handle = {
    set_path, set_stats_popup_user,
    load_list: async () => {
      const {info:local} = await fetch_game('local', hf)
      const { list=[] } = viewer ? await api.get('/letterpress') : {}
      log({list})
      set_list_info([local, ...list])
    },
    load_info: async (id) => {
      const {info} = await api.get(`/letterpress/game/${id}/info`)
      const new_list_info = (list_info||[]).slice()
      const existing_info_index = new_list_info.indexOf(x => x.id === info.id)
      if (existing_info_index) {
        new_list_info[existing_info_index] = info
      } else {
        new_list_info.push(info)
      }
      set_list_info(new_list_info)
      log('load info', {id,list_info,new_list_info})
    },
    load_profiles: async (users, force=true) => {
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
    open: ({info:{id:game_id}}) => {
      handle.set_path(['game', game_id])
      handle.load_list() // for any new games being opened
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
      'letterpress:update': id => {
        log('letterpress:update', id)
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
      const is_turn = user_ids(info).indexOf(viewer) === info.owner
      return is_turn && info.id !== 'local' && info.status === -1
    }), true),
    their_turn: sort_list_info_by_last_t(list_info.filter(info => {
      const is_turn = user_ids(info).indexOf(viewer) === info.owner
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
    sections.local.map(local_info => {
      if (local_info.status < 0) {
        const active_player = local_info[`p${local_info.owner}`]
        if (is_ai(active_player)) {
          const ai_handle = rand.alphanum(16)
          current_ai_handle.current[ai_handle] = false
          const trigger_for_game = (value, invert=false) => current_is_local_game.current!==invert && message.trigger(value)
          trigger_for_game({
            text: `${active_player} is thinking of a move...`,
            id: `letterpress-ai-thinking`, delete: `letterpress-ai-thinking`,
          })
          defer(async () => {
            try {
              const { info, state } = await fetch_game(local_info.id, hf)
              const selection = await get_selection(info, state, hf, (progress) => trigger_for_game({
                text: `${active_player} is thinking of a move (${progress})`,
                id: `letterpress-ai-thinking`, replace: `letterpress-ai-thinking`,
              }), () => current_ai_handle.current[ai_handle])
              log('ai selection', {selection})
              const { new_info, new_state } = play_turn(info, state, selection, hf)
              update_game(new_info, new_state)
              trigger_for_game({
                delete: `letterpress-ai-thinking`,
              })
              handle.load_list()
              trigger_for_game({
                text: `${active_player} played ${new_info.turns.at(-1).word.toUpperCase()} in letterpress: /letterpress/local`,
                ms: 5_000,
                id: 'letterpress-turn', delete: 'letterpress-turn',
                to: `/letterpress/local`,
              }, true)
            } catch (e) {
              log('ai turn', e)
              delete current_ai_handle.current[ai_handle]
            }
          })
        }
      }
    })
  })

  usePageSettings({
    // professional: true,
    background: '#fff',
    icon: '/raw/letterpress/icon.png',
  })
  // useF(settings?.letterpress?.music, list_name => list_name && track_play(list_name, {do_shuffle:false}))
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
  useStyle(theme, `
  :root {
    ${(x => x ? `filter: ${x} !important;` : '')(theme?.filter)}
    ${(x => x ? `--id-color: ${x} !important;` : '')(theme?.background)}
    ${(x => x ? `--id-color-text: ${x} !important;` : '')(theme?.color)}
    ${(x => x ? `--id-color-text-readable: ${x} !important;` : '')(theme?.background)}
  }
  ${theme.css||''}
  `)
  const iframe_src = useM(theme.iframe, () => theme.iframe && resolve_iframe(theme.iframe))
  return <Style>
    {iframe_src ? <iframe src={iframe_src} style={S(`
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    filter: contrast(.8);
    `)} /> : null}
    <InfoBody style={S(`
    z-index: 1;
    `)}>
      {modes.game
      ? <Game {...{ id:page_id, hf, handle, settings, profile_map, sections }} />
      : modes.stats
      ? <Stats {...{ user:page_id, hf, handle, profile_map }} />
      : <Menu {...{ hf, handle, profile_map, sections }} />}
      {stats_popup_user ? <NiceModal on_close={e => set_stats_popup_user(undefined)}>
        <Stats {...{ user:stats_popup_user, hf, handle, profile_map }} embedded />
        <div>&nbsp;</div>
        <div className='row wide end'><InfoButton onClick={e => set_stats_popup_user(undefined)}>close</InfoButton></div>
      </NiceModal> : null}
      {modes.new ? <NiceModal on_close={e => {
        set_path(['menu'])
      }}>
        {challenge_link ? <>
          <b>challenge link ({page_id})</b>
          <HalfLine />
          {!challenge_link.user ? <>
            invalid challenge link. maybe they disabled it?
          </> : challenge_link.user === viewer ? <>
            <span>this is your challenge link</span>
            <span>post it somewhere for people to start games with you!</span>
            <InfoButton onClick={async e => {
              copy(location.href)
              set_copied_challenge(true)
            }}>{copied_challenge ? 'copied!' : 'copy challenge link'}</InfoButton>
          </> : challenge_link.id ? <>
            you already have a game with {challenge_link.user}!
            <InfoButton onClick={e => {
              set_path(['game', challenge_link.id])
            }}>{`/letterpress/${challenge_link.id}`}</InfoButton>
          </> : <>
            challenge {challenge_link.user}!
            <InfoButton onClick={async e => {
              viewer
              ? handle.open(await create_game(hf, [viewer, challenge_link.user]))
              : openLogin()
            }}>{viewer ? 'new game' : 'log in to challenge'}</InfoButton>
          </>}
        </> : <>
          loading challenge link
        </>}
        <div>&nbsp;</div>
        <div className='row wide end'><InfoButton onClick={e => set_path(['menu'])}>close</InfoButton></div>
      </NiceModal> : null}
    </InfoBody>
  </Style>
}
