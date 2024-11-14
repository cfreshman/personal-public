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
const { named_log, truthy, defer, range, rand, colors, set, copy, display_status } = window as any
const NAME = 'vibe post'
const log = named_log(NAME)

export default ({ handle }) => {
  const { a, posts, post_ids } = handle.data

  const [loaded_posts, set_loaded_posts] = useS({})
  const id_to_posts_post = useM(posts, () => {
    const id_to_posts_post = {}
    posts?.forEach(x => id_to_posts_post[x.id] = x)
    return id_to_posts_post
  })
  const opens = useM(id_to_posts_post, loaded_posts, post_ids, () => post_ids?.map(id => loaded_posts[id] || id_to_posts_post[id]))
  handle = {
    ...handle,
    load_posts: async () => {
      await Promise.allSettled(post_ids.map(async id => {
        const { post } = await api.post('/vibe/post/get', { id })
        loaded_posts[id] = post
      }))
      set_loaded_posts({...loaded_posts})
    },
  }

  useF(post_ids, posts, opens, async () => {
    if (post_ids && posts && opens.some(x => !x)) {
      handle.load_posts()
    }
  })

  const first = opens && opens[0]
  const single = opens?.length === 1

  return <>
    <div className='w100 h100 column gap'>
      <div className='wide grow accented column' style={S(`
      max-height: 30em;
      overflow: auto;
      `)}>
        {single ? null : <div className='accented middle-row wide'>{opens.length} posts</div>}
        {opens.map((post, i) => <div className='column wide gap'>
          <Post {...{ post, handle, close: () => {
            handle.set_modal(undefined)
          } }} full_size sticky />
          {post ? <div className='row wide between'>
            <InfoBadges labels={[
              a.user === post.user && { 'delete': async () => {
                if (confirm('delete this post?')) {
                  await handle.delete_post(post)
                }
              } },
            ]} />
            <InfoBadges labels={[
              a.user && post && (post.likes[a.user] ? 'liked' : { 'like': async () => {
                const { post:new_post } = await api.post('/vibe/post/like', { id: post.id })
                handle.replace_post(new_post)
              } }),
              { 'share': e => {
                const href = location.origin + '/vibe/post/' + post.id
                copy(href)
                display_status(e.target, 'copied!')
                navigator.share({ url:href })
              } },
            ]} />
          </div> : null}
        </div>)}
      </div>
      <div className='row wide between'>
        <InfoBadges labels={[
          { 'close': () => {
            handle.set_preserve_view(true)
            handle.set_path(['', opens && opens[0].id])
            handle.set_modal(undefined)
          } },
        ]} />
        {first ? <InfoBadges labels={[
          // single && a.user && (first.likes[a.user] ? 'liked' : { 'like': async () => {
          //   const { post:new_post } = await api.post('/vibe/post/like', { id: first.id })
          //   handle.replace_post(new_post)
          // } }),
          { 'directions': () => {
            // open google maps
            url.new(`https://www.google.com/maps/dir/?api=1&destination=${first.lat},${first.long}`)
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