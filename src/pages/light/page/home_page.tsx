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
import { useRoom } from 'src/lib/socket'

const { named_log, keys } = window as any
const NAME = 'light home page'
const log = named_log(NAME)

export const HomePage =  ({ handle }) => {

  handle = {
    ...handle,
    load_posts: async () => {
      const { list:new_posts } = await api.post('/light')
      set_posts(new_posts)
      set_n_updates(0)
    },
  }

  const [n_updates, set_n_updates] = useS(0)
  useRoom({
    room: 'light:home',
    on: {
      'light:home:update': () => {
        set_n_updates(n_updates + 1)
      }
    },
  })

  const [posts, set_posts] = useS(undefined)
  useF(handle.load_posts)
  
  return <div id='light-home' className='column gap'>
    {n_updates ? <div className='middle-row wide'>
      <InfoBadges labels={[
        { 'load new posts': handle.load_posts },
      ]} />
    </div> : null} 
    {!posts ? 'loading posts...'
    : keys(posts).map(post => <Post id={post.id} {...{ post, handle }} hide_reply />)}
    {posts?.length > 2 ? <>
      <HalfLine />
        <div className='middle-row wide'>you've reached the end{posts?.length > 256 ? '. try refreshing!' : null}</div>
      <HalfLine />
    </> : null}
  </div>
}