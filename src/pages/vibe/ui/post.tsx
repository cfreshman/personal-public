import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles, Loader, ScrollText } from '../../../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useE, useF, useInterval, useM, useR, useRerender, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { S } from 'src/lib/util'
import { meta } from 'src/lib/meta'
import { Dangerous } from 'src/components/individual/Dangerous'
import { ACCENT } from '../style'
import { store } from 'src/lib/store'
const { named_log, truthy, defer, range, rand, colors, datetimes, duration } = window as any
const NAME = 'vibe post'
const log = named_log(NAME)

const Elapsed = ({ time, left }) => {
  // const rerender = useRerender()
  // const date = useM(time, () => new Date(time))
  // useInterval(rerender, 60_000)
  return <div className='accented' title={datetimes.ymdhms(time)}>{datetimes.durations.pretty(left ? time + duration({ d:1 }) - Date.now() : Date.now() - (time||0))}{left?' left':''}</div>
}

export default ({ post, full_size=false, sticky=false, left=false, handle, close }) => {
  const { posts } = handle.data
  const { a: { user:viewer } } = handle.data
  const [deleted, set_deleted] = useS(false)
  return <>
    <div className='wide grow accented column gap' style={S(`
    height: fit-content;
    ${sticky ? 'gap: 0' :''}
    `)}>
      {!posts ? <div className='w100 h100 center'><div className='center-row spaced'>loading <Loader /></div></div>
      : post ? <>
        <div className='center-row wide between spaced' style={S(`
        white-space: nowrap;
        ${sticky ? `position: sticky; top: -1px; background: var(--id-color); padding: .125em 0; z-index: 1;` : ``}
        `)}>
          <div className='accented' style={S(`
          width: 0; flex-grow: 1;
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          `)}><ScrollText>{post.location || `#${post.id}`}</ScrollText></div>
          {post.user === viewer && !sticky && 0 ? <InfoBadges labels={[
            deleted ? 'deleted' : { delete: async () => {
              if (confirm('delete this post?')) {
                await handle.delete_post(post)
                close()
                set_deleted(true)
              }
            } },
          ]} /> : <>
            <Elapsed time={post.t} left={left} />
          </>}
        </div>
        <div className='middle-row wide gap wrap' style={S(`
          min-height: 20em; min-width: 20em;
          ${full_size ? `` : `
          height: fit-content;
          max-height: 25em;
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