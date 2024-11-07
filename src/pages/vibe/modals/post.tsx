import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles, Loader } from '../../../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useE, useF, useM, useR, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { S } from 'src/lib/util'
import { meta } from 'src/lib/meta'
import { Dangerous } from 'src/components/individual/Dangerous'
import { ACCENT } from '../style'
import { store } from 'src/lib/store'
import Post from '../ui/post'
import url from 'src/lib/url'
const { named_log, truthy, defer, range, rand, colors } = window as any
const NAME = 'vibe post'
const log = named_log(NAME)

export default ({ handle }) => {
  const { a, posts, post_id } = handle.data

  const [loaded_post, set_loaded_post] = useS(undefined)
  const post = useM(posts, post_id, loaded_post, () => loaded_post || (posts && posts.find(p => p.id === post_id)))
  handle = {
    ...handle,
    load_post: async () => {
      const { post } = await api.post('/vibe/post/get', { id: post_id })
      log('loaded post', { post })
      set_loaded_post(post)
    },
  }

  useF(post_id, posts, post, async () => {
    if (post_id && posts && !post) {
      handle.load_post()
    }
  })

  return <>
    <div className='w100 h100 column gap'>
      <div className='wide grow accented column gap'>
        <Post {...{ post, handle, close: () => {
          handle.set_modal(undefined)
        } }} />
      </div>
      <div className='row wide between'>
        <InfoBadges labels={[
          { 'close': () => {
            handle.set_preserve_view(true)
            handle.set_path(['', post?.id])
            handle.set_modal(undefined)
          } },
        ]} />
        {post ? <InfoBadges labels={[
          a.user && (post.likes[a.user] ? 'liked' : { 'like': async () => {
            const { post:new_post } = await api.post('/vibe/post/like', { id: post.id })
            handle.replace_post(new_post)
          } }),
          { 'directions': () => {
            // open google maps
            url.new(`https://www.google.com/maps/dir/?api=1&destination=${post.lat},${post.long}`)
          } },
          // { 'locate': () => {
          //   handle.set_path(['map', post.id])
          //   handle.set_modal(undefined)
          // } },
        ]} /> : null}
      </div>
    </div>
  </>
}