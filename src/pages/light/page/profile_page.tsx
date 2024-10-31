import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles } from 'src/components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import url from 'src/lib/url'
import Profile from '../ui/profile'
import { use_light_profile, use_profile } from '../func/profile'
import { Post } from '../ui/post'

const { named_log, keys } = window as any
const NAME = 'light profile page'
const log = named_log(NAME)

export const ProfilePage =  ({ id, handle }) => {

  const { light_profile } = use_light_profile({ user:id })
  useF(light_profile, () => log('profile', light_profile))

  const [posts, set_posts] = useS(undefined)
  useF(light_profile, async () => {
    if (light_profile) {
      const { list:new_posts } = await api.post(`/light/posts`, { ids:keys(light_profile.posts)})
      log({ new_posts })
      set_posts(new_posts.reverse())
    } else {
      set_posts(undefined)
    }
  })
  
  return <div id='light-profile' className='column gap'>
    <Profile {...{ initial:light_profile, handle }} />
    {light_profile?.pin ? <Post {...{ id:light_profile.pin, handle, userpage:id }} pin /> : null}
    {!posts ? 'loading posts...'
    : posts?.map(post => <Post {...{ post, handle, userpage:id }} hide_reply />)}
    {posts?.length > 2 ? <>
      <HalfLine />
        <div className='middle-row wide'>you've reached the end</div>
      <HalfLine />
    </> : null}
  </div>
}