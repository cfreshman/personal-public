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
const { named_log, truthy, defer, range, rand, colors, datetimes } = window as any
const NAME = 'vibe post'
const log = named_log(NAME)

export default ({ handle }) => {
  const { a, posts, post_id } = handle.data

  return <>
    <div className='w100 h100 column gap' style={S(`
    overflow: auto;
    // border: 1px solid ${ACCENT};
    `)}>
      {!posts ? <div className='w100 h100 center'><div className='center-row spaced float'>loading <Loader /></div></div>
      : posts.length ? posts.map(post => <>
        <div key={post.id} className='wide column gap backed' style={S(`
        border: 1px solid ${ACCENT};
        padding: .25em;
        `)}>
          <Post {...{ post, handle, close:()=>{} }} full_size />
          <div className='row wide between'>
            <InfoBadges labels={[
              // a.user === post.user && datetimes.durations.pretty(Date.now() - post.t),
              a.user === post.user && { 'delete': async () => {
                if (confirm('delete this post?')) {
                  await handle.delete_post(post)
                }
              } }
            ]} />
            <InfoBadges labels={[
              a.user && (post.likes[a.user] ? 'liked' : { 'like': async () => {
                const { post:new_post } = await api.post('/vibe/post/like', { id: post.id })
                handle.replace_post(new_post)
              } }),
              { 'locate on map': () => {
                handle.set_preserve_view(false)
                handle.set_path(['', post.id])
              } },
            ]} />
          </div>
        </div>
      </>)
      : <div className='w100 h100 center'><div className='center-row spaced float'>no one's posted around here recently</div></div>}
    </div>
  </>
}