import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState, useTypedPathState } from 'src/lib/hooks_ext'
import { useF, useM, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { pass } from 'src/lib/types'
import url from 'src/lib/url'
import { Greet } from './greeter/greet'
import { UserBadge } from 'src/components/user_badges'
import GreeterLink from './greeter/GreeterLink'
import { Style as GreeterStyle } from './greeter'
import { convertLinks } from 'src/lib/render'
import { S } from 'src/lib/util'
import { openLogin } from 'src/lib/auth'

const { named_log } = window as any
const log = named_log('linktree')

const EmbeddedGreeterLinks = ({ viewer, user }) => {
  const handle = {
    load_greet: async (user, setGreet) => {
      try {
        const {item} = await api.get(`/greeter/greet/${user}`)
        setGreet(item)
      } catch (e) {
        log(e)
        setGreet({})
      }
    },
  }

  const self = viewer === user
  const [_greet, setGreet] = useS(undefined)
  const greet = useM(_greet, () => ({
    links: [],
    ...(_greet || {}),
  }))
  useF(user, () => handle.load_greet(user, setGreet))

  return <>
    <InfoSection labels={[
      // user && <UserBadge {...{ user, text:'open profile' }} />,
    ]}>
      {greet?.links?.map(link => <GreeterLink href={link} />)}
      {greet?.links?.length ? null : <div>
        {_greet ? 'no links added' : 'loading profile'}
      </div>}
    </InfoSection>
  </>
}

export default () => {
  const [{user:viewer}] = auth.use()
  const [user, set_user] = useTypedPathState<string>({
    from: x => x || 'cyrus',
    to: pass,
  })
  const self = viewer && viewer === user

  const handle = {
    load_profile: async (user, set_profile) => {
      try {
        const {profile} = await api.get(`/profile/${user}`)
        set_profile(profile)
      } catch (e) {
        log(e)
        set_profile(undefined)
      }
    },
  }

  const [profile, set_profile] = useS(undefined)
  useF(viewer, user, () => handle.load_profile(user, set_profile))

  const [viewer_profile, set_viewer_profile] = useS(undefined)
  useF(viewer, () => handle.load_profile(viewer, set_viewer_profile))

  const followed = useM(profile, () => profile?.follows?.includes(viewer))
  const following = useM(viewer_profile, () => viewer_profile?.follows?.includes(user))

  log(profile, viewer_profile, followed, following, {profile, viewer_profile, followed, following})

  usePageSettings({
    // professional: true,
    // background: '#222222', text_color: '#dddddd',
    ...(profile ? {
      background: profile.color,
    } : {
      background: `var(--id-color)`,
    }),
    expand: true,
  })
  const user_link = <b><A href={`/@${user}`}>@{user}</A></b>
  return <Style>
    <InfoBody>
      <InfoSection labels={[]}>
        {profile ? <div className='profile-card column gap'>
          <div style={S(`font-size: 1.25em`)} className='row gap wide'>
            {user_link}
            <div className='spacer' />
            {profile.emoji ? <span style={S(`
            display: inline-block;
            background: ${profile.color || '#000'};
            height: 1.4em;
            aspect-ratio: 1/1;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
            box-shadow: 0 0 0 .125em ${profile.color || '#000'};
            `)}>
              {profile.emoji}
            </span> : null}
          </div>
          <div className='row gap'>
            {profile?.icon ? <div className='column gap'>
              <img src={profile.icon} />
            </div>: null}
            <div className='column gap'>
              {profile?.bio ? <pre>{convertLinks(profile.bio)}</pre> : null}
            </div>
          </div>
        </div> : <div>
          <div style={S(`font-size: 1.25em`)}>{user_link}</div>
          <div><a onClick={() => openLogin()}>log in</a> to view more details</div>
        </div>}
      </InfoSection>
      <InfoSection labels={[
        !self && 'links',
        !self && viewer && { 'view yours': () => set_user(viewer) },
        self && {
          text: 'edit bio @ /profile',
          href: `/profile`,
        },
        self && {
          text: 'edit links @ /greeter',
          href: `/greeter/${viewer}/greet`,
        },
      ]}>
        <EmbeddedGreeterLinks {...{ user, viewer }} />
      </InfoSection>
      {/* <InfoSection labels={[
        'linktree',
        self && {
          text: 'view & edit in /greeter',
          href: `/greeter/${viewer}/greet`,
        },
        !self && viewer && { yours: () => set_user(viewer) },
      ]}>
        <HalfLine />
        <div className='profile-card row gap'>
          {profile?.icon ? <div className='column gap'>
            <img src={profile.icon} />
          </div>: null}
          <div className='column gap'>
            <A href={`/u/${user}`} />
            {profile?.bio ? <div>{convertLinks(profile.bio)}</div> : null}
          </div>
        </div>
        <HalfLine />
        <EmbeddedGreeterLinks {...{ user, viewer }} />
      </InfoSection> */}
    </InfoBody>
  </Style>
}

const Style = styled(GreeterStyle)`
.profile-card {
  background: var(--id-color-text-readable);
  padding: .5em;
  border-radius: .25em;
}

.badges .label {
  // opacity: 1 !important;
  // border: 1px solid transparent !important;
  // position: relative !important; top: -1 !important;
  // border-color: currentcolor !important;
  // background: transparent !important;
  // // background: var(--id-color-text-readable) !important;
  // color: var(--id-color-text-readable) !important;

  // background: var(--id-color-text-readable) !important;
  // color: var(--id-color-text) !important;

  // background: #fff !important;
  // color: #000 !important;
  // mix-blend-mode: difference !important;
}
`