import React from 'react'
import styled from 'styled-components'
import { A, InfoBadges, InfoBody, InfoSection, InfoStyles } from 'src/components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useR, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import url from 'src/lib/url'
import { S } from 'src/lib/util'
import { convertLinks, extractLinks } from 'src/lib/render'
import { PostRich } from './post_rich'

const { named_log, datetimes, copy, display_status } = window as any
const NAME = 'light'
const log = named_log(NAME)

export const Post = ({ id, post:initial, handle, userpage, postpage, light, hide_reply, no_new }: { id?, post?, handle, userpage?, postpage?, light?, hide_reply?, no_new? }) => {

  const [{user:viewer}] = auth.use()

  const [post, set_post] = useS(initial)
  useF(id, initial, async () => {
    if (initial) {
      set_post(initial)
    } else {
      const { data } = await api.post(`/light/post/${id}`)
      set_post(data)
    }
  })

  const text = useM(post, () => post && post.text)
  const [href, set_href] = useS('')
  useF(text, () => {
    if (!text) {
      set_href(undefined)
    } else {
      const links = extractLinks(text)
      set_href(links.at(-1))
    }
  })
  const single = useM(text, href, () => {
    if (href && !text.replace(href.replace(/https?:\/\//, ''), '').replace(/https?:\/\//, '').trim()) {
      return true
    }
    return false
  })

  return hide_reply && post?.parent ? null : <div className={`light-post column gap ${light?'light-light':''}`}>
    {!post ? 'loading post...'
    : <>
      {userpage ? null : <div><b><A href={`/light/@${post.user}`}>@{post.user}</A></b></div>}
      {/* <div style={S(`white-space:pre-wrap`)}>{post.parent?'↳ ':''}{convertLinks(post.text)}</div> */}
      <div className='light-content row wide'>
        {post.parent? <div>↳&nbsp;</div> : ''}
        <div style={S(`white-space:pre-wrap;word-break:break-all`)}>{convertLinks(post.text)}</div>
      </div>
      {href ? <PostRich {...{ href, single }} /> : null}
      <div className='row wide end'>
        <InfoBadges nowrap labels={[
          datetimes.ymdhm(post.t),
          { spacer:true },
          { link: e => {
            copy(location.origin + `/light/post/${post.id}`)
            display_status(e.target, 'copied!')
          } },
          // { replies: () => {} },
          { [`${post.n_replies} 💬`]: () => {
            url[no_new ? 'push' : 'new'](`/light/post/${post.id}`)
          } },
          // { like: () => {} },
          { [`${(post.likes||{})[viewer]?'+':''}${post.n_likes} 👍`]: async () => {
            const { data:new_post } = await api.post(`/light/post/${post.id}/like`)
            set_post(new_post)
          } },
        ]} />
      </div>
    </>}
  </div>
}
