import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles } from 'src/components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useInterval, useM, useR, useRerender, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import url from 'src/lib/url'
import { S } from 'src/lib/util'
import { convertLinks, extractLinks } from 'src/lib/render'
import { PostRich } from './post_rich'
import { use_post_href } from '../func/post_href'
import { compute_edit_time, open_popup } from '../func/general'
import { message } from 'src/lib/message'
import { useRoom } from 'src/lib/socket'
import { openLogin } from 'src/lib/auth'
import Edit from './edit'

const { named_log, datetimes, copy, display_status, defer, range, pass, keys } = window as any
const NAME = 'light'
const log = named_log(NAME)

export const Post = ({ id, post:initial, handle, userpage, light, hide_reply, no_new, level=undefined, pin, scroll_to, hide_rich_reply }: {
  id?, post?, handle, userpage?, light?, hide_reply?, no_new?, level?, pin?, scroll_to?, hide_rich_reply?
}) => {

  const [{user:viewer}] = auth.use()

  const [post, set_post] = useS(initial || null)
  handle = {
    ...handle,
    load_post: async () => {
      const { data } = await api.post(`/light/post/${id||post?.id}`)
      set_post(data)
    }
  }
  useF(id, initial, async () => {
    if (initial) {
      set_post(initial)
    } else {
      await handle.load_post()
    }
  })

  const text = useM(post, () => post && post.text)
  const { href, single } = use_post_href({ text })
  const is_repost = useM(href, single, () => single && href.includes('/light/post/'))
  const actual_level = useM(level, is_repost, () => is_repost && !level ? 0 : level || 1)
  const is_rich_reply = !hide_rich_reply && !href && post?.parent && actual_level === 1 && !light
  const jsx_user = post && <b>{post.user ? <A href={`/light/@${post.user}`} tab={!no_new}>@{post.user}</A> : 'deleted'}</b>

  const rerender_edit_time = useRerender()
  useInterval(() => rerender_edit_time(), 1_000)
  const edit_time = useM(post, rerender_edit_time, () => compute_edit_time(post))
  const can_edit = post && post.user === viewer && edit_time > 0 && !keys(post.replies).length

  const label_more = { '..': () => {
    open_popup(close => <InfoSection>
      <div className='center-column wide gap'>
        <div>POST ACTIONS</div>
        {[
          actual_level === 0 ? false : { 'copy link': e => {
            copy(location.origin + `/light/post/${post.id}`)
            display_status(e.target, 'copied!')
          } },
          can_edit && { [`edit (${datetimes.durations.pretty(compute_edit_time(post))})`]: async () => {
            close()
            open_popup(close_2 => <div className='column gap'>
              {/* <div><i>you have {datetimes.durations.pretty(compute_edit_time(post))} to make edits</i></div> */}
              <Edit {...{ handle, post, close: async () => {
                close_2()
                await handle.load_post()
              } }} />
            </div>, { naked:1 })
          } },
          // post.t + datetimes.duration({ m:15 }) > Date.now() && {
          //   edit: 
          // },
          !viewer || actual_level === 0 ? false
          : handle.data.light_profile?.pin === post.id
          ? { 'unpin from profile': async () => {
            close()
            const { success } = await api.post(`/light/post/${post.id}/pin`)
            if (success) {
              message.trigger({
                html: `unpinned ${post.id}`,
                ms: 3_000,
              })
              await handle.load_light_profile()
            }
          } }
          : { 'pin to profile': async () => {
            close()
            const { success } = await api.post(`/light/post/${post.id}/pin`)
            if (success) {
              message.trigger({
                html: `pinned ${post.id} to your <a href='/light/@${viewer}'>profile</a>`,
                ms: 3_000,
              })
              await handle.load_light_profile()
            }
          } },
          viewer === post.user && { 'delete': async () => {
            close()
            open_popup(close_2 => <div className='column wide gap'>
              ARE YOU SURE?
              {[
                { 'confirm delete': async () => {
                  close_2()
                  const { data:new_post } = await api.post(`/light/post/${post.id}/delete`)
                  set_post(new_post)
                } },
              ].map(label => <InfoBadges labels={[label]} />)}
              <HalfLine />
              <div className='row wide end'>
                <InfoBadges labels={[{ cancel:close_2 }]} />
              </div>
            </div>)
          } },
          viewer === 'cyrus' && { 'permadelete': async () => {
            const { success } = await api.post(`/light/post/${post.id}/permadelete`)
            alert(`deleted ${success}`)
            close()
          } },
          !viewer && { 'log in to do more': () => openLogin() },
        ].filter(pass).map(label => <InfoBadges labels={[label]} />)}
        <HalfLine />
        <div className='center-column wide'>
          <InfoBadges labels={[{ close }]} />
        </div>
      </div>
    </InfoSection>)
  } }

  const url_go = (href) => url[no_new ? 'push' : 'new'](href)

  const ref = useR()
  useF(scroll_to, () => {
    if (!scroll_to) return
    const f = () => ref.current.scrollIntoView({ block:'center' })
    range(5).map(i => defer(f, i*100))
  })

  return (hide_reply && post?.parent ? null 
  : actual_level > 2 ? post && <div ref={ref} className='row wide'>
    {/* <span>(quoting deeper post by {jsx_user} <A href={`/light/post/${post.id}`} onClick={e => e.preventDefault()}>{post.id}</A>)</span> */}
    <span className='light-deepquote'>(quoting deeper post by @{post.user})</span>
  </div> 
  : <>
  <div ref={ref} className={`light-post column gap ${level > 1 || light?'light-light':''} ${actual_level === 0 ? 'light-repost' : ''}`} data-post={`light-post-${post?.id}`}
  {...(actual_level > 1 ? {
    onClick: e => {
      url_go(`/light/post/${post.id}`)
      e.stopPropagation()
    }
  } : {})} style={S(`
  ${actual_level > 1 ? `cursor: pointer;` : ''}
  `)}>
    {!post ? 'loading post...'
    : <>
      {/* repost */ actual_level === 0 ? <div className='light-repost-header center-row'>
        {userpage === post.user ? 'reposted' : <>reposted by&nbsp;{jsx_user}</>}
        {/* {convertLinks(post.text.replace(location.origin, '').replace(location.host, ''))} */}
        <div className='spacer' />
        {post.user === viewer ? <InfoBadges labels={[label_more]} /> : null}
      </div>
      : /* hide name on user page */ userpage === post.user || !post.user ? null
      : <div>{jsx_user}</div>}
      {/* <div style={S(`white-space:pre-wrap`)}>{post.parent?'↳ ':''}{convertLinks(post.text)}</div> */}
      {is_rich_reply ? <div className='light-content row wide'>replying to:</div> : null}
      {is_rich_reply ? <PostRich {...{ href:`/light/post/${post.parent}`, single:true, handle, no_new, level:actual_level }} />
      : null}
      {actual_level === 0 ? null : <div className='light-content row wide'>
        {post.parent? <div>↳&nbsp;</div> : ''}
        <div style={S(`white-space:pre-wrap;word-break:break-all`)}>{convertLinks(post.text||'(this post has been deleted)', { new_tab:!no_new, light:1 })}</div>
      </div>}
      {href && actual_level < 3 ? <PostRich {...{ href, single, handle, no_new, level:actual_level, userpage: actual_level === 0 ? userpage : false }} />
      : null}
      {actual_level !== 1 ? null : <div className='row wide end'>
        <InfoBadges nowrap labels={[
          datetimes.ymdhm(post.t),
          { spacer:true },
          label_more,
          // { link: e => {
          //   copy(location.origin + `/light/post/${post.id}`)
          //   display_status(e.target, 'copied!')
          // } },
          // { replies: () => {} },
          { [`${post.n_replies} 💬`]: () => {
            if (post.n_replies || viewer) {
              url_go(`/light/post/${post.id}`)
            }
          } },
          // { like: () => {} },
          { [`${(post.likes||{})[viewer]?'+':''}${post.n_likes} 👍`]: async () => {
            if (viewer) {
              const { data:new_post } = await api.post(`/light/post/${post.id}/like`)
              set_post(new_post)
            }
          } },
        ]} />
      </div>}
    </>}
  </div>
  {pin ? <span style={S(`
  margin-top: -.25em;
  `)}>^PINNED</span> : null}</>)
}
