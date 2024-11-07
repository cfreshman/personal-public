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
const { named_log, truthy, defer, range, rand, colors, keys, strings, datetimes, duration } = window as any
const NAME = 'vibe user'
const log = named_log(NAME)

export default ({ handle }) => {
  const [posts, set_posts] = useS(undefined)
  useF(async () => {
    const { post_list } = await api.post('/vibe/profile/posts')
    log('user list', { post_list })
    set_posts(post_list.reverse())
  })

  return <>
    {/* <>
      <div className='wide tall center'><div className='accented'>coming soon 🧑‍🚀</div></div>
    </> */}
    <div className='w100 h100 column gap' style={S(`overflow: auto`)}>
      {!posts ? <div className='w100 h100 center'><div className='center-row spaced float'>loading<Loader /></div></div>
      : posts.length ? posts.map(post => {
        const n_likes = keys(post.likes).length
        return <div className='wide backed column gap' style={S(`
        height: fit-content;
        border: 1px solid ${ACCENT};
        padding: .25em;
        `)}>
          <Post key={post.id} {...{ post, handle, close:()=>{} }} full_size />
          <div className='row wide between'>
            <InfoBadges labels={[
              `${datetimes.durations.pretty((post.t + duration({ d:1 }) - Date.now()))} left`,
            ]} />
            <InfoBadges labels={[
              `${n_likes} ${strings.plural(n_likes, 'like', 's')}`,
            ]} />
          </div>
        </div>
      })
      : <div className='w100 h100 center'><div className='center-row spaced float'>you haven't posted in the last 24hr</div></div>}
    </div>
  </>
}