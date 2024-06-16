import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoButton, InfoSection, InfoSelect, InfoStyles, Select } from '../../components/Info'
import { create_game, fetch_game, user_ids } from './data'
import { useEventListener, useF, useM, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { useSocket } from 'src/lib/socket'
import { once, truthy } from 'src/lib/types'
import { NiceModal, PlayerName, default_player_profiles, open_about, open_howto, open_popup } from './util'
import { openLogin } from 'src/lib/auth'
import { openPopup } from 'src/components/Modal'
import { Style } from './style'
import { message } from 'src/lib/message'
import { S, dev } from 'src/lib/util'
import url from 'src/lib/url'

const { named_log, set, list } = window as any
const log = named_log('quadbase menu')

const MenuGameItem = ({ viewer, profile_map=undefined, info, handle }) => {
  const invite_name = info.public ? 'public' : 'invite'
  const users = user_ids(info)
  const display_users = users.filter(x => x !== viewer).reverse()
  const others = display_users.map(user => user || invite_name)
  const is_invite = !others.every(truthy)
  const profiles = profile_map && users.map((user, i) => users[i] !== viewer && {
    ...(is_invite ? {} : default_player_profiles[i]),
    ...(profile_map[user]||{}),
  })
  const turn = info.turn && info.turns.at(-1)
  const player = turn && info[`p${turn.owner}`]
  const word = turn && turn.word
  const action = word ? `played ${word.toUpperCase()}` : info.status > -1 ? 'resigned' : 'skipped'
  return <div className='menu-game-item center-row gap' onClick={e => handle.set_path(['game', info.id])}>
    <div className='column start'>
      {/* <div>{info.p0 || invite_name} vs {info.p1 || invite_name}</div> */}
      <div>vs {others.join(' ')}</div>
      {info.turn === 0 ? <div>new game</div> : <div>{player} {action}</div>}
    </div>
    <div className='spacer' />
    {profiles.map((profile, i) => profile?.color ? <div>
      <PlayerName {...{ name:others[i], profile }} icon_only />
    </div> : null)}
  </div>
}

export default ({ hf, handle, profile_map, sections }) => {

  const [{user:viewer}] = auth.use()
  const [viewer_profile, set_viewer_profile] = useS(undefined)
  useF(viewer, async () => {
    const { profile:viewer_profile } = await api.get(`/profile/${viewer}`)
    set_viewer_profile(viewer_profile)
  })

  const [local, set_local] = useS(false)

  const [online, set_online] = useS(false)
  useF(viewer, () => set_online(false))
  const [challenge, set_challenge] = useS(false)
  const [players, set_players] = useS([viewer, undefined, undefined, undefined])
  useF(online, () => set_challenge(false))

  handle = {
    ...handle,
    open: ({info:{id:game_id}}) => {
      handle.set_path(['game', game_id])
    },
  }

  useF(local, () => local && set_online(false))
  useF(online, () => online && set_local(false))

  const show_local = useM(sections, () => sections?.local.some(info => info.turn !== 0))

  // const once_stats = once({ profile: () => handle.set_path(['stats', viewer]) })
  const once_stats = once({ profile: () => handle.open_stats() })
  const once_about = once({ about: () => open_about() })
  const once_howto = once({ 'how to': () => open_howto() })

  return <>
    <InfoSection className='menu-upper' labels={['new game']}>
      <div className='menu-section'>
        {/* <InfoButton onClick={async e => {
          handle.open(await create_game(undefined, true))
        }}>local</InfoButton> */}
        <InfoButton onClick={e => {
          set_local(!local)
        }}>{local ? 'close' : 'local'}</InfoButton>
        {local ? <div className='menu-section'>
          human
          <div className='row gap wrap'>
            <InfoButton onClick={async e => {
              handle.open(await create_game(undefined, true))
            }}>new game</InfoButton>
          </div>
          computer
          <div className='row gap wrap'>
            <InfoButton onClick={async e => {
              url.push(`/wordbase`)
            }}>1v1 in wordbase</InfoButton>
            <InfoButton onClick={async e => {
              url.push(`/lettercomb`)
            }}>1v1 in lettercomb</InfoButton>
            {/* <InfoButton disabled onClick={async e => {
              handle.open(await create_game([viewer, 'speedy'], true))
            }}>(coming soon) (maybe)</InfoButton> */}
            {/* <InfoButton disabled onClick={async e => {
              handle.open(await create_game([viewer, 'easy'], true))
            }}>easy</InfoButton>
            <InfoButton disabled onClick={async e => {
              handle.open(await create_game([viewer, 'medium'], true))
            }}>medium</InfoButton>
            <InfoButton disabled onClick={async e => {
              handle.open(await create_game([viewer, 'strategist'], true))
            }}>strategist</InfoButton>
            <InfoButton disabled onClick={async e => {
              handle.open(await create_game([viewer, 'wordsmith'], true))
            }}>wordsmith</InfoButton>
            <InfoButton disabled onClick={async e => {
              handle.open(await create_game([viewer, 'beast'], true))
            }}>beast</InfoButton>
            <InfoButton disabled onClick={async e => {
              handle.open(await create_game([viewer, 'speedy'], true))
            }}>speedy</InfoButton> */}
          </div>
          <HalfLine />
        </div> : null}
      </div>
      <div className='menu-section'>
        {/* <div className='menu-button'>online</div> */}
        <InfoButton onClick={e => {
          if (viewer) {
            set_online(!online)
          } else {
            openLogin()
          }
        }}>{online ? 'close' : 'online'}</InfoButton>
        {online ? <div className='menu-section'>
          private
          <div className='row gap wrap'>
            <InfoButton onClick={async e => {
              handle.open(await create_game(['invite', 'invite', 'invite', viewer]))
            }}>new invite link</InfoButton>
            <InfoButton onClick={e => set_challenge(!challenge)}>{challenge ? 'close' : 'challenge friends'}</InfoButton>
            {challenge ? <NiceModal on_close={e => set_challenge(false)}>
              <InfoSection labels={[
                'select players'
              ]}>
                {players.map((player, i) => {
                  return <InfoSelect
                  options={viewer_profile.friends.concat([viewer])}
                  value={player || `select player ${i + 1}`}
                  setter={value => {
                    const new_players = players.slice()
                    new_players[i] = value
                    set_players(new_players)
                  }} />
                })}
                <HalfLine />

                {/* <div className='row wide end'><InfoButton onClick={e => set_challenge(false)}>close</InfoButton></div> */}
                <div className='row wide gap' style={S(`justify-content:space-between`)}>
                  <InfoButton onClick={e => set_challenge(false)}>cancel</InfoButton>
                  <InfoButton disabled={players.some(x=>!x) || !players.includes(viewer)} onClick={async e => {
                    handle.open(await create_game(players))
                    set_challenge(false)
                  }}>start</InfoButton>
                </div>
              </InfoSection>
            </NiceModal> : null}
          </div>
          {/* {challenge ? <div className='menu-section'>
            <div className='row gap wrap'>
              {viewer_profile ? viewer_profile.friends.map(friend => <InfoButton onClick={async e => {
                // handle.open(await create_game([viewer, friend]))
                // TODO
              }}>{friend}</InfoButton>) : <div>loading friends!</div>}
            </div>
          </div> : null} */}
          public
          <div className='row gap wrap'>
            <InfoButton onClick={async e => {
              handle.open(await create_game(['public', 'public', 'public', viewer]))
            }}>join random</InfoButton>
          </div>
        </div> : null}
      </div>
    </InfoSection>
    {show_local ? <InfoSection labels={[
      'local game',
    ]}>
      {sections.local.map(info => <MenuGameItem {...{ info, handle, viewer, profile_map }} />)}
    </InfoSection> : null}
    {!sections?.your_turn.length && !sections?.their_turn.length ? <InfoSection nowrap labels={[
      'open games',
      { spacer:true },
      once_about(), once_howto(), viewer && once_stats(),
    ]}>
      {!sections
      ? <div>loading games</div>
      : viewer ? <div>no open games</div> : <div>log in to play online games</div>}
    </InfoSection> : null}
    {sections?.your_turn.length ? <InfoSection nowrap labels={[
      'your turn',
      { spacer:true },
      once_about(), once_howto(), viewer && once_stats(),
    ]}>
      {!sections.your_turn.length
      ? <div>no open games</div>
      : sections.your_turn.map(info => <MenuGameItem {...{ info, handle, viewer, profile_map }} />)}
    </InfoSection> : null}
    {sections?.their_turn.length ? <InfoSection nowrap labels={[
      'their turn',
      { spacer:true },
      once_about(), once_howto(), viewer && once_stats(),
    ]}>
      {!sections
      ? <div>loading games</div>
      : !sections.their_turn.length
      ? <div>no open games</div>
      : sections.their_turn.map(info => <MenuGameItem {...{ info, handle, viewer, profile_map }} />)}
    </InfoSection> : null}
    {sections?.completed.length ? <InfoSection labels={[
      'completed',
    ]}>
      {sections.completed.map(info => <MenuGameItem {...{ info, handle, viewer, profile_map }} />)}
    </InfoSection> : null}
  </>
}
