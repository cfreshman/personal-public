import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBody, InfoButton, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useRerender, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import url from 'src/lib/url'
import { S } from 'src/lib/util'
import { openLogin } from 'src/lib/auth'
import { Greet } from './greeter/greet'
import { create_handle } from './greeter'
import GreeterLink from './greeter/GreeterLink'

const { named_log } = window as any
const log = named_log('invite')

export default () => {
  const [invite, set_invite] = usePathState()
  const [{user:viewer}] = auth.use()
  
  const [loaded, set_loaded] = useS(false)
  const [invite_user, set_invite_user] = useS(undefined)
  const [invite_user_profile, set_invite_user_profile] = useS(undefined)
  const reload_invite_profile = useRerender()
  useF(invite, reload_invite_profile, async () => {
    if (!invite) {
      url.replace(`/u`)
      return
    }

    const { user:invite_user, profile:invite_user_profile } = await api.get(`/profile/invite/${invite}`)
    set_loaded(true)
    if (invite_user) {
      if (viewer === invite_user) {
        url.replace(`/u`)
        return
      }
      set_invite_user(invite_user)
      set_invite_user_profile(invite_user_profile)
    }
  })

  const is_friend = useM(viewer, invite_user_profile, () => viewer && invite_user_profile?.friends?.includes(viewer))

  const [greet, set_greet] = useS(undefined)
  const greeter_handle = create_handle({})
  useF(invite_user, () => invite_user && greeter_handle.load_greet(invite_user, set_greet))

  usePageSettings({
    background: '#7687fc',
  })
  return <Style>
    <InfoBody>
      <InfoSection labels={[`viewing invite #${invite}`]} style={S(`white-space:pre-line`)}>
        {!loaded
        ? `loading invite link`
        : !invite_user
        ? `invalid invite link\n\nmaybe they changed it? ask your friend for a new one`
        : <>
          <div>{is_friend ? <>
            <A href={`/u/${invite_user}`}>{invite_user}</A>
          </> : invite_user} is on freshman.dev!</div>
          <HalfLine />
          <div>
            <InfoButton className='invite-button' disabled={is_friend} onClick={async e => {
              if (viewer) {
                await api.post(`/profile/invite/${invite}`)
                reload_invite_profile()
              } else {
                openLogin()
              }
            }}>
              {is_friend ? <>you've added {invite_user} as a friend</> : <>add {invite_user} as a friend</>}
            </InfoButton>
          </div>
          <HalfLine />
          <div>
            <InfoButton className='invite-button' disabled={!is_friend} onClick={async e => {
              url.push(`/greeter/${viewer}/met/${invite_user}`)
            }}>
              add the first time you met {invite_user}
            </InfoButton>
          </div>
        </>}
      </InfoSection>
      <HalfLine />
      {greet ? <InfoSection labels={[
        `${invite_user}'s links`
      ]} style={S(`font-size: .5em`)}>
        {greet.links.map(href => <GreeterLink href={href} /> )}
      </InfoSection> : null}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`&{
  font-size: 2em !important;
  .invite-button {
    text-transform: uppercase !important;
    text-align: left !important;
  }

  .greeter-link {
    background: #fff !important; color: #000 !important;
    padding: 0 .5em;
    border-radius: .75em;
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    z-index: 1;
  }
}`