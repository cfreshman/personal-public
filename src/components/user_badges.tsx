import React from 'react'
import { InfoBadges } from 'src/components/Info'
import { WebsiteIcon, WebsiteTitle } from 'src/components/website_title'
import api from 'src/lib/api'
import { useF, useS } from 'src/lib/hooks'
import { S } from 'src/lib/util'


export const UserBadge = ({ user, text=user }) => {
  const [profile, set_profile] = useS(undefined)
  useF(user, async () => {
    const { profile:new_profile } = await api.get(`u/${user}`)
    set_profile(new_profile)
  })
  return <InfoBadges labels={[
    {
      href: `/u/${user}`,
      text: <>
        {text}
        {profile?.icon ? <>
          &nbsp;
          <img src={profile.icon} style={S(`
          height: 1.4em;
          width: 1.4em;
          `)} />
        </> : null}
      </>,
    },
  ]} style={S(`display: inline-flex`)} />
}

export const UserBadges = ({ users }) => {
  return <div className='row gap wrap'>
    {users?.map(user => <UserBadge user={user} />)}
  </div>
}