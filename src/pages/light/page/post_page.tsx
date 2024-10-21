import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from 'src/components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import url from 'src/lib/url'
import Profile from '../ui/profile'
import { use_light_profile, use_profile } from '../func/profile'
import { Post } from '../ui/post'
import Edit from '../ui/edit'
import { use_post_href } from '../func/post_href'

const { named_log, keys, defer } = window as any
const NAME = 'light post page'
const log = named_log(NAME)

export const PostPage =  ({ id, handle }) => {

  const [{user:viewer}] = auth.use()

  const [post, set_post] = useS(undefined)
  const [ancestors, set_ancestors] = useS(undefined)
  useF(id, async () => {
    const { data, ancestors } = await api.post(`/light/post/${id}`)
    set_post(data)
    set_ancestors(ancestors)
  })

  const text = useM(post, () => post && post.text)
  const { href, single } = use_post_href({ text })
  const is_repost = useM(href, single, () => single && href.includes('/light/post/'))

  return <div id='light-post' className='column gap'>
    {/* {post && post.parent ? <Post {...{ id:post.parent, handle }} light no_new /> */}
    {ancestors ? ancestors.slice().reverse().map(post => <Post {...{ post, handle }} light no_new />)
    : null}
    <Post {...{ post, handle }} no_new scroll_to hide_rich_reply />
    {!viewer || is_repost ? null : <Edit {...{ handle, parent:id }} reply />}
    {!post ? 'loading replies...'
    : keys(post.replies).map(reply_id => <Post {...{ id:reply_id, handle }} light no_new />)}
  </div>
}