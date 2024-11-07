import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles, Loader, ScrollText } from '../../../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useE, useF, useM, useR, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { S } from 'src/lib/util'
import { meta } from 'src/lib/meta'
import { Dangerous } from 'src/components/individual/Dangerous'
import { ACCENT } from '../style'
import { store } from 'src/lib/store'
const { named_log, truthy, defer, range, rand, colors, datetimes } = window as any
const NAME = 'vibe post'
const log = named_log(NAME)

export default ({ post, full_size=false, handle, close }) => {
  const { posts } = handle.data
  const { a: { user:viewer } } = handle.data
  const [deleted, set_deleted] = useS(false)
  return <>
    <div className='wide grow accented column gap' style={S(`
    height: fit-content;
    `)}>
      {!posts ? <div className='w100 h100 center'><div className='center-row spaced'>loading <Loader /></div></div>
      : post ? <>
        <div className='center-row wide between spaced' style={S(`
        white-space: nowrap;
        `)}>
          <div className='accented' style={S(`
          width: 0; flex-grow: 1;
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          `)}><ScrollText>{post.location || `#${post.id}`}</ScrollText></div>
          {post.user === viewer ? <InfoBadges labels={[
            deleted ? 'deleted' : { delete: async () => {
              if (confirm('delete this post?')) {
                await handle.delete_post(post)
                close()
                set_deleted(true)
              }
            } },
          ]} /> : <>
            <div className='accented'>{datetimes.durations.pretty(Date.now() - (post.t||0))}</div>
          </>}
        </div>
        <div className='middle-row wide gap wrap' style={S(`
          min-height: 20em; min-width: 20em;
          ${full_size ? `` : `
          height: 0;
          flex-grow: 1;
          `}
          overflow: auto;
          background: ${ACCENT}66;
          background: linear-gradient(${ACCENT}11 0 0) #fff1;
          box-sizing: content-box;
          `)}>
          {post && post.hrefs.map((src, i) => <img key={i} src={src} className='post-image' style={S(`height:20em`)} />)}
        </div>
      </> : <div className='w100 h100 center'><div className='center-row spaced'>this post has disappeared</div></div>}
    </div>
  </>
}