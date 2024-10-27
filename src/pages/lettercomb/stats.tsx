import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles } from '../../components/Info'
import { useF, useM, useR, useRerender, useS } from 'src/lib/hooks'
import { S } from 'src/lib/util'
import api, { auth } from 'src/lib/api'
import { PlayerName } from './util'
import { create_game, profile_colors } from './data'
import { is_ai } from './ai'
import { store } from 'src/lib/store'

const { named_log, strings, maths, colors, lists, V, datetime, copy, display_status, set } = window as any
const log = named_log('capitals stats')

const SPEEDY_DEFAULT_THINKING_TIME = 3_000
const special_details = {
  easy: `easy can play short words`,
  medium: `medium can play mid-length words`,
  hard: `medium can play longer words`,
  strategist: `strategist plays similar length words to the medium bot but plays them more strategically`,
  wordsmith: `wordsmith plays the longest word it can! it doesn't care about strategy`,
  beast: `beast wants to eliminate as many of your tiles as possible. it doesn't care about defense. that is your only chance`,
  speedy: (rerender) => {
    const speedy_ms = store.get('capitals-ai-speedy-ms') || SPEEDY_DEFAULT_THINKING_TIME
    const options = lists.unique([100, 300, 700, 1_500, 3_000, 7_000, 15_000, 30_000, 70_000, 1e10].concat(speedy_ms)).sort(maths.comparators.numeric)
    const display_option = (x) => x > 70_000 ? '∞' : datetime.durations.pretty(x)
    return <>
      speedy could play as well as beast if they took a little longer
      <div>&nbsp;</div>
      select decision time:
      <InfoBadges labels={options.map(option => speedy_ms === option ? display_option(option) : {
        text: display_option(option),
        func: () => {
          store.set('capitals-ai-speedy-ms', option)
          rerender()
        }
      }).concat([{
        reset: () => {
          store.set('capitals-ai-speedy-ms', SPEEDY_DEFAULT_THINKING_TIME)
          rerender()
        }
      }])} />
    </>
  },

  top: 'the top player goes second!',
  bottom: 'the bottom player goes first!',
}
export const render_special_detail = (value, rerender) => typeof(value) === 'string' ? value : value(rerender)

export default ({ user, hf, handle, profile_map, embedded=false }) => {

  const [{user:viewer}] = auth.use()
  const self = user === viewer
  
  const profile = profile_map[user]
  useF(viewer, user, () => handle.load_profiles([user]))
  const stats = profile?.stats||{}
  useF(profile, () => log({user,profile}))

  const [pair_stats, set_pair_stats] = useS(undefined)
  useF(viewer, user, async () => {
    if (viewer && viewer !== user) {
      const { stats:pair_stats } = await api.get(`/capitals/pair/${viewer}/${user}`)
      log({pair_stats})
      set_pair_stats(pair_stats)
    } else {
      set_pair_stats(undefined)
    }
  })

  const [edit, set_edit] = useS(false)
  const edit_data = useR(undefined)
  const rerender = useRerender()
  useF(profile, edit, () => {
    if (profile) {
      edit_data.current = strings.json.clone(profile)
    }
  })

  const special_detail = special_details[user]

  const historic_users = useR([])
  useM(user, () => user !== viewer && historic_users.current.push(user))
  const [viewer_profile, set_viewer_profile] = useS(undefined)
  useF(viewer, async () => {
    const { profile:new_viewer_profile } = await api.get(`/profile/${viewer}`)
    set_viewer_profile(new_viewer_profile)
  })
  const viewer_friends_set = useM(viewer_profile, () => set(viewer_profile?.friends||[]))
  const user_label_order = useM(viewer_profile, user, special_detail, () => {
    if (!viewer_profile?.follows || special_detail) return [user]

    const label_users = [...viewer_profile.follows.filter(x => x !== viewer)]
    historic_users.current.map(user => {
      if (!label_users.includes(user)) {
        label_users.unshift(user)
      }
    })
    if (viewer !== user) {
      label_users.unshift(viewer)
    }
    log({label_users})
    return label_users
  })
  useF(user_label_order, () => {
    handle.load_profiles(user_label_order)
  })

  const closest_color = (() => {
    if (edit_data.current?.color) {
      const rgb = V.ne(colors.hex_to_rgb(edit_data.current.color))
      const rgbs = profile_colors.map(x => colors.hex_to_rgb(x)).map(V.ne)
      const dist2 = (a, b) => a.ad(b.sc(-1)).do()
      const hex = colors.rgb_to_hex(...lists.minning(rgbs, x => dist2(x, rgb)))
      log({rgb,rgbs,hex,base:edit_data.current?.color,d:rgbs.map(x=>dist2(x, rgb))})
      return hex
    }
  })()

  return <>
    <InfoSection labels={[
      !embedded && !edit && { menu: () => handle.set_path(['menu']) },
      // user,
      self && !edit && { edit: () => set_edit(true) },
      edit && { save: async () => {
        const { profile } = await api.post(`/profile/game`, edit_data.current)
        // handle.set_profile(viewer, profile)
        handle.load_profiles([viewer], true)
        set_edit(false)
      } },
      edit && { cancel: () => {
        set_edit(false)
      } },
      ...(edit ? [] : [
        self && 'view:',
        ...user_label_order.map(label_user => label_user === user ? user : {
          text: label_user,
          func: () => embedded ? handle.set_stats_popup_user(label_user) : handle.set_path(['stats', label_user])
        }),
      ]),
      // { text: <A href={`/u/${user}`}>view user</A> },
    ]}>
      {edit ? null : profile ? <>
        <div className='middle-column wide'>
          <PlayerName {...{ name:user, zoom:2, profile:{
            color: '#000', // '#34b5e5',
            icon: '👶', // '🐶',
            ...profile
          } }} />
          {(x => {
            return is_ai(user) ? <div>bot player</div> : <div>{x} {strings.plural(x, 'day', 's')}</div>
          })(stats?.letters_played ? Math.ceil((Date.now() - profile.t) / datetime.durations.new({ d:1 })) : 0)}
        </div>
      </> : <div>loading!</div>}
      {edit ? <>
        select color:
        <div className='row gap wrap'>
          {profile_colors.map(color => <div className='stats-color-block player-icon' style={S(`
          background: ${color};
          `)} onClick={e => {
            edit_data.current.color = color
            rerender()
          }}>{closest_color === colors.hex_to_canonical(color) ? edit_data.current.icon||'🐶' : null}</div>)}
        </div>
        <HalfLine />
        enter icon:
        <input value={edit_data.current.icon||''} placeholder='🐶' className='stats-icon-input' onChange={e => {
          const {value} = e.target
          const icon = [...value].at(-1) || ''
          e.target.value = icon
          edit_data.current.icon = icon
          rerender()
        }}></input>
      </> : <>
        
      </>}
    </InfoSection>
    {edit ? null : special_detail ? <>
      <InfoSection labels={['details']}>
        {render_special_detail(special_detail, rerender)}
      </InfoSection>
    </> : <>
      <InfoSection labels={[
        'stats',
        self && { share: e => {
          copy(location.origin + `/lettercomb/stats/${user}`)
          display_status(e.target, 'copied!')
        } }
        ]} />
      {profile ? <>
        <InfoSection labels={['longest word']}>
          {(stats.longest_word||'').toUpperCase() || 'NONE'} {stats.longest_word ? `(${stats.longest_word.length})` : null}
        </InfoSection>
        <InfoSection labels={['average word length']}>
          {(x => `${x} ${strings.plural(x, 'letter', 's')}`)(maths.round((stats.letters_played||0)/(stats.words_played||1), 2))}
        </InfoSection>
        <InfoSection labels={['longest game']}>
          {stats.longest_game||0} {strings.plural(stats.longest_game, 'turn', 's')}
        </InfoSection>
        {/* {stats.longest_feud ? <InfoSection labels={['longest feud']}>
          {stats.longest_feud||0} {strings.plural(stats.longest_feud, 'game', 's')}
        </InfoSection> : null} */}
        <div>&nbsp;</div>
        {pair_stats ? <>
          <InfoSection labels={['versus']} />
          <InfoSection labels={['completed games']}>
            {pair_stats.completed||0}
          </InfoSection>
          {/* <InfoSection labels={['wins']}>
            {pair_stats.win||0}
          </InfoSection>
          <InfoSection labels={['loses']}>
            {(pair_stats.total-pair_stats.win)||0}
          </InfoSection> */}
          <InfoSection labels={['win percentage']}>
            {
              pair_stats.completed 
              ? maths.round((pair_stats.win / (pair_stats.completed||0)) * 100)||0 
              : <>
                <div>
                  still working on the first game {pair_stats.total /*|| !viewer_friends_set.has(user)*/ ? null : <InfoBadges labels={[
                    {
                      text: 'new game',
                      func: async e => {
                        handle.open(await create_game(hf, [viewer, user]))
                      }
                    }
                  ]} />}
                </div>
              </>
            }{pair_stats.completed?'%':''}
          </InfoSection>
          
        </> : <>
          <InfoSection labels={['all players']} />
          <InfoSection labels={['active games']}>
            {stats.active_games||0}
          </InfoSection>
          <InfoSection labels={['total letters played']}>
            {stats.global_letters||0}
          </InfoSection>
        </>}
      </> : <div>loading stats!</div>}
    </>}
  </>
}
