import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBody, InfoButton, InfoSection, InfoSelect, InfoStyles } from '../../components/Info'
import { create_game, fetch_game, get_n_users, user_ids } from './data'
import { useEventListener, useF, useM, useS, useTimed } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { useSocket } from 'src/lib/socket'
import { once, truthy } from 'src/lib/types'
import { NiceModal, PlayerName, default_player_profiles, open_about, open_howto } from './util'
import { openLogin } from 'src/lib/auth'
import { openPopup } from 'src/components/Modal'
import { Style } from './style'
import { message } from 'src/lib/message'
import { S, dev } from 'src/lib/util'
import url from 'src/lib/url'
import { useQr } from 'src/components/qr'
import { store } from 'src/lib/store'
import { SPEEDY_DEFAULT_THINKING_TIME } from '../letterpress/stats'

const { named_log, set, list, range, lists, copy, datetimes } = window as any
const log = named_log('capitals menu')

const MenuGameItem = ({ viewer, profile_map=undefined, info, handle }) => {
  const n_users = get_n_users(info)
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
  return <div className={`menu-game-item ${n_users === 6 ? 'column' : 'center-row'} gap`} onClick={e => handle.set_path(['game', info.id])}>
    <div className='column start'>
      {/* <div>{info.p0 || invite_name} vs {info.p1 || invite_name}</div> */}
      <div>vs {others.join(' ')}</div>
      {info.turn === 0 ? <div>new game</div> : <div>{player} {action}</div>}
    </div>
    <div className='spacer' />
    <div className='row gap'>
      {profiles.map((profile, i) => profile?.color ? <div>
        <PlayerName {...{ name:others[i], profile }} icon_only />
      </div> : null)}
    </div>
  </div>
}

export default ({ hf, handle, profile_map, sections }) => {

  const [{user:viewer}] = auth.use()
  const viewer_game_profile = profile_map[viewer]
  const [viewer_profile, set_viewer_profile] = useS(undefined)
  useF(viewer, async () => {
    const { profile:viewer_profile } = await api.get(`/profile/${viewer}`)
    set_viewer_profile(viewer_profile)
  })
  useF(viewer_profile, () => {
    if (viewer_profile?.followers?.concat([viewer]).includes('cyrus')) {
      window['enable_aporia']()
    }
  })

  const [tripitals, set_tripitals] = useS(false)
  const [hexitals, set_hexitals] = useS(false)
  useF(tripitals, () => tripitals && set_hexitals(false))
  useF(hexitals, () => hexitals && set_tripitals(false))

  const [local, set_local] = useS(false)

  const [online, set_online] = useS(false)
  useF(viewer, () => set_online(false))
  const [challenge, set_challenge] = useS(false)

  useF(online, () => {
    set_challenge(false)
    if (online) {
      set_tripitals(false)
      set_hexitals(false)
    }
  })
  useF(tripitals, () => {
    if (tripitals) {
      set_online(false)
      set_hexitals(false)
    }
  })
  useF(hexitals, () => {
    if (hexitals) {
      set_online(false)
      set_tripitals(false)
    }
  })

  const [players, set_players] = useS([viewer, undefined])
  useF(tripitals, hexitals, () => {
    set_players(range(hexitals ? 6 : tripitals ? 3 : 2).map(i => players[i] || undefined))
  })

  const challenge_link = location.origin + `/lettercomb/new/${viewer_game_profile?.challenge || viewer}`
  const [challenge_modal_open, set_challenge_modal_open] = useS(false)
  const [challenge_link_copied, set_challenge_link_copied] = useTimed(3_000, false)
  const [challenge_qr] = useQr({ href:challenge_link, size:256 })

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
  const once_howto = once({ 'how to': () => open_howto({ handle, hf, viewer }) })

  return <>
    <InfoSection className='menu-upper' labels={['new game']}>
      <div className='menu-section'>
        {/* <InfoButton onClick={async e => {
          handle.open(await create_game(hf, undefined, true))
        }}>local</InfoButton> */}
        <InfoButton onClick={e => {
          set_local(!local)
        }}>{local ? 'close' : 'local'}</InfoButton>
        {local ? <div className='menu-section'>
          human
          <div className='row gap wrap'>
            <InfoButton onClick={async e => {
              handle.open(await create_game(hf, [undefined, undefined], true))
            }}>new game</InfoButton>
          </div>
          computer
          <div className='row gap wrap'>
            {/* <InfoButton onClick={async e => {
              handle.open(await create_game(hf, [viewer, 'easy'], true))
            }}>easy</InfoButton>
            <InfoButton onClick={async e => {
              handle.open(await create_game(hf, [viewer, 'medium'], true))
            }}>medium</InfoButton>
            <InfoButton disabled onClick={async e => {
              handle.open(await create_game(hf, [viewer, 'hard'], true))
            }}>hard (coming soon)</InfoButton>
            <InfoButton onClick={async e => {
              handle.open(await create_game(hf, [viewer, 'strategist'], true))
            }}>strategist</InfoButton>
            <InfoButton onClick={async e => {
              handle.open(await create_game(hf, [viewer, 'wordsmith'], true))
            }}>wordsmith</InfoButton>
            <InfoButton onClick={async e => {
              handle.open(await create_game(hf, [viewer, 'beast'], true))
            }}>beast</InfoButton> */}
            {/* <InfoButton disabled onClick={async e => {
              handle.open(await create_game(hf, [viewer, 'impossible'], true))
            }}>impossible (coming soon)</InfoButton> */}
            <InfoButton onClick={async e => {
              // handle.open(await create_game(hf, [viewer, 'easy'], true))
              store.set('capitals-ai-speedy-ms', 100)
              handle.open(await create_game(hf, [viewer, 'speedy'], true))
            }}>easy speedy</InfoButton>
            <InfoButton onClick={async e => {
              if (store.get('capitals-ai-speedy-ms') < SPEEDY_DEFAULT_THINKING_TIME) {
                store.set('capitals-ai-speedy-ms', SPEEDY_DEFAULT_THINKING_TIME)
              }
              message.trigger({
                text: `open speedy's profile to adjust their thinking time (current: ${datetimes.durations.pretty(store.get('letterpress-ai-speedy-ms')||SPEEDY_DEFAULT_THINKING_TIME)})`,
                ms: 3_000,
              })
              handle.open(await create_game(hf, [viewer, 'speedy'], true))
            }}>speedy</InfoButton>
            <InfoButton onClick={async e => {
              handle.open(await create_game(hf, [viewer, 'wordsmith'], true))
            }}>wordsmith</InfoButton>
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
              handle.open(await create_game(hf, ['invite', viewer]))
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
                  <InfoButton disabled={players.some(x=>!x) || !players.includes(viewer) || lists.unique(players).length === 1} onClick={async e => {
                    handle.open(await create_game(hf, players))
                    set_challenge(false)
                  }}>start</InfoButton>
                </div>
              </InfoSection>
            </NiceModal> : null}
          </div>
          {/* {challenge ? <div className='menu-section'>
            <div className='row gap wrap'>
              {viewer_profile ? viewer_profile.friends.map(friend => <InfoButton onClick={async e => {
                handle.open(await create_game(hf, [viewer, friend]))
              }}>{friend}</InfoButton>) : <div>loading friends!</div>}
            </div>
          </div> : null} */}
          public
          <div className='row gap wrap'>
            <InfoButton onClick={async e => {
              handle.open(await create_game(hf, ['public', viewer]))
            }}>join random</InfoButton>
          </div>
          challenge link
          <div className='row gap wrap'>
            {viewer_game_profile?.challenge_on ? <InfoButton onClick={() => {
              copy(challenge_link)
              set_challenge_link_copied(true)
            }}>{challenge_link_copied ? 'copied!' : 'share challenge link'}</InfoButton> : null}
            <InfoButton onClick={async () => {
              await api.post(`/capitals/challenge`, {
                on: !viewer_game_profile?.challenge_on,
              })
              await handle.load_profiles([viewer], true)
            }}>
              {viewer_game_profile?.challenge_on ? 'disable' : 'enable challenge link'}
            </InfoButton>
            <InfoButton onClick={() => set_challenge_modal_open(!challenge_modal_open)}>?</InfoButton>
            {challenge_modal_open ? <NiceModal>
              <b>challenge link</b>
              <span>lets anyone start a new game with you</span>
              <span>disable at any time to prevent additional games</span>
              <HalfLine />
              {challenge_qr}
              <HalfLine />
              <InfoButton disabled={!viewer_game_profile?.challenge_on} onClick={e => {
                copy(challenge_link)
                set_challenge_link_copied(true)
              }}>{challenge_link_copied ? 'copied!' : challenge_link.replace(location.origin, '')}</InfoButton>
              <div className='row gap wrap'>
                <InfoButton onClick={async () => {
                  await api.post(`/capitals/challenge`, {
                    on: !viewer_game_profile?.challenge_on,
                  })
                  await handle.load_profiles([viewer], true)
                }}>{viewer_game_profile?.challenge_on ? 'disable' : 'enable'}</InfoButton>
                <InfoButton  onClick={async () => {
                  await api.post(`/capitals/challenge`, {
                    randomize: !viewer_game_profile?.challenge,
                  })
                  await handle.load_profiles([viewer], true)
                }}>{!viewer_game_profile?.challenge ? 'randomize' : 'unrandomize'}</InfoButton>
              </div>
              <HalfLine />
              <div className='row wide end'>
                <InfoButton onClick={e => set_challenge_modal_open(false)}>close</InfoButton>
              </div>
            </NiceModal> : null}
          </div>
          <HalfLine />
        </div> : null}
      </div>
      <div className='menu-section'>
        <InfoButton onClick={e => {
          set_tripitals(!tripitals)
        }}>{tripitals ? 'close' : 'tripitals'}</InfoButton>
        {tripitals ? <>
          <div className='menu-section'>
            local (human)
            <div className='row gap wrap'>
              <InfoButton onClick={async e => {
                handle.open(await create_game(hf, [undefined, undefined, undefined], true))
              }}>new local game</InfoButton>
            </div>
            private
            <div className='row gap wrap'>
              <InfoButton onClick={async e => {
                handle.open(await create_game(hf, ['invite', 'invite', viewer]))
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
                  <div className='row wide gap' style={S(`justify-content:space-between`)}>
                    <InfoButton onClick={e => set_challenge(false)}>cancel</InfoButton>
                    <InfoButton disabled={players.some(x=>!x) || !players.includes(viewer)} onClick={async e => {
                      handle.open(await create_game(hf, players))
                      set_challenge(false)
                    }}>start</InfoButton>
                  </div>
                </InfoSection>
              </NiceModal> : null}
            </div>
            public
            <div className='row gap wrap'>
              <InfoButton onClick={async e => {
                handle.open(await create_game(hf, ['public', 'public', viewer]))
              }}>join random</InfoButton>
            </div>
            <HalfLine />
          </div>
        </> : null}
      </div>
      <div className='menu-section'>
        <InfoButton onClick={e => {
          set_hexitals(!hexitals)
        }}>{hexitals ? 'close' : 'hexitals'}</InfoButton>
        {hexitals ? <>
          <div className='menu-section'>
            local (human)
            <div className='row gap wrap'>
              <InfoButton onClick={async e => {
                handle.open(await create_game(hf, range(6).map(_=>undefined), true))
              }}>new local game</InfoButton>
            </div>
            private
            <div className='row gap wrap'>
              <InfoButton onClick={async e => {
                handle.open(await create_game(hf, ['invite', 'invite', 'invite', 'invite', 'invite', viewer]))
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
                  <div className='row wide gap' style={S(`justify-content:space-between`)}>
                    <InfoButton onClick={e => set_challenge(false)}>cancel</InfoButton>
                    <InfoButton disabled={players.some(x=>!x) || !players.includes(viewer)} onClick={async e => {
                      handle.open(await create_game(hf, players))
                      set_challenge(false)
                    }}>start</InfoButton>
                  </div>
                </InfoSection>
              </NiceModal> : null}
            </div>
            public
            <div className='row gap wrap'>
              <InfoButton onClick={async e => {
                handle.open(await create_game(hf, ['public', 'public', 'public', 'public', 'public', viewer]))
              }}>join random</InfoButton>
            </div>
          </div>
          <HalfLine />
        </> : null}
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
      {/* {!sections
      ? <div>loading games</div>
      : viewer ? <div>no open games</div> : <div>log in to play online games</div>} */}
      {/* {!sections
      ? <div>loading games</div>
      : viewer ? <div>no open games</div> : <div className='pre-wrap'>
        <div>log in to play online games</div>
        <div>or play locally against another human</div>
        <div>or play against a bot:</div>
        <div>- play against 'speedy' to start!</div>
        <div>  (tap their name change difficulty)</div>
        <div>  ('easy' takes too long, will fix soon)</div>
        <div>- lose to 'wordsmith'</div>
      </div>} */}
      {viewer ? <div>no open games</div> : <div className='pre-wrap' style={S(`text-align:left;border:1px solid currentcolor;padding:.25em;border-radius:.25em;`)}>
        <div><a onClick={() => openLogin()}>log in</a> to play online games</div>
        {show_local ? null : <>
          <div>or play locally against another human</div>
          <div>or play against a bot!</div>
          <div>open 'HOW TO' to get started</div>
        </>}
        {/* <div>or play against a bot:</div>
        <div>- play against 'speedy' to start!</div>
        <div>  (tap their name change difficulty)</div>
        <div>  ('easy' takes too long, will fix soon)</div>
        <div>- lose to 'wordsmith'</div> */}
      </div>}
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
