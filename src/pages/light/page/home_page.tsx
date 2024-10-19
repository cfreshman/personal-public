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
const NAME = 'light home page'
const log = named_log(NAME)

export const HomePage =  ({ handle }) => {

  const [posts, set_posts] = useS(undefined)
  useF(async () => {
    const { list:new_posts } = await api.post('/light')
    set_posts(new_posts)
  })
  
  return <div id='light-home' className='column gap'>
    {!posts ? 'loading posts...'
    : keys(posts).reverse().map(post => <Post {...{ post, handle }} hide_reply />)}
  </div>
}