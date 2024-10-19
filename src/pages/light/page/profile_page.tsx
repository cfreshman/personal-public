import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from 'src/components/Info'
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
  
  return <div id='light-profile' className='column gap'>
    <Profile {...{ id, handle }} />
    {!light_profile?.posts ? 'loading posts...'
    : keys(light_profile.posts).reverse().map(id => <Post {...{ id, handle }} userpage hide_reply />)}
  </div>
}