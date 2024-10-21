import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles } from 'src/components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import url from 'src/lib/url'
import { S } from 'src/lib/util'
import { use_profile } from '../func/profile'
import { convertLinks } from 'src/lib/render'
import { UserBadge } from 'src/components/user_badges'

const { named_log, strings, datetimes } = window as any
const NAME = 'light profile'
const log = named_log(NAME)

export default ({ id=undefined, initial=undefined, handle }) => {

  const [{user:viewer}] = auth.use()

  const user = id || initial?.user
  const { profile } = use_profile({ user })
  const [light_profile, set_light_profile] = useS(null)
  useF(id, initial, async () => {
    if (initial) {
      set_light_profile(initial)
    } else {
      const { data } = await api.post(`/light/user/${id}`)
      set_light_profile(data)
    }
  })

  const not_a_user = useM(light_profile, () => light_profile && !light_profile.is_account)
  const followed = useM(user, handle.data.profile, () => {
    if (handle.data.profile) {
      return handle.data.profile.follows.includes(user)
    }
    return false
  })
  const friend = useM(user, handle.data.profile, () => {
    if (handle.data.profile) {
      return handle.data.profile.friends.includes(user)
    }
    return false
  })
  
  return <div className='light-profile column gap'>
    {not_a_user ? <>@{user} does not exist</>
    : !profile || !light_profile ? <>
      loading profile @{user}...
    </> : <>
      <div><b>@{user}</b> {light_profile.t ? <>joined {datetimes.ymd(light_profile.t)}</> : `hasn't posted yet`}</div>
      {profile.icon || profile.bio ? <>
        <HalfLine />
        <div className='row gap'>
          {profile.icon ? <img src={profile.icon} style={S(`
          height: 5em;
          `)} /> : null}
          <span style={S(`white-space:pre-wrap;word-break:break-all`)}>{convertLinks(profile.bio)}</span>
        </div>
      </> : null}
      {user === viewer ? <>
        <HalfLine />
        {/* <UserBadge user={user} text='view/edit your profile' /> */}
        <InfoBadges labels={[
          { 'view/edit site profile →': () => url.push(`/@${user}`) },
        ]} />
      </> : viewer ? <>
        <HalfLine />
        <InfoBadges labels={[
          followed ? { 'unfollow': async () => {
            await api.post(`/profile/${user}/unfollow`)
            handle.load_profile()
          } } : { 'follow': async () => {
            await api.post(`/profile/${user}/follow`)
            handle.load_profile()
          } },
          friend && { 'chat': () => url.push(`/chat/${user}`) },
          { 'view site profile →': () => url.push(`/u/${user}`) },
        ]} />
      </> : null}
    </>}
  </div>
}
