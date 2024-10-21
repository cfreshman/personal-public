import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles, Multiline } from 'src/components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import url from 'src/lib/url'
import { store } from 'src/lib/store'
import { extractLinks } from 'src/lib/render'
import { RawWebsiteIcon, WebsiteTitle } from 'src/components/website_title'
import { S } from 'src/lib/util'
import { PostRich } from './post_rich'
import { use_profile } from '../func/profile'
import { use_post_href } from '../func/post_href'
import { message } from 'src/lib/message'
import { compute_edit_time } from '../func/general'

const { named_log, datetimes, Q } = window as any
const NAME = 'light edit'
const log = named_log(NAME)

const CAP_POST_LEN = 500

export default ({ handle, parent=undefined, reply=false, post=undefined, close=undefined }) => {
  const [{user:viewer}] = auth.use()

  const [text, set_text] = store.use('light-edit-text', { default:'' })
  useF(post, () => post && set_text(post.text))
  const { href, single } = use_post_href({ text })

  const is_over = useM(text, () => text.length > CAP_POST_LEN)

  const on_submit = ((id) => {
    if (close) {
      message.trigger({
        html: `your <a href='/light/post/${id}'>post</a> was sent`,
      })
    } else if (reply) {
      url.push(`/light/post/${id}`)
    } else {
      // view on main feed
      url.push(`/light`)
    }
  })

  useF(() => !text && Q('.light-edit textarea')?.focus())

  return <div className={`light-edit column gap ${reply?'light-light':''} ${close?'light-popup':''}`} style={S(`
  ${close ? `
  max-height: 100%;
  ` : ''}
  `)}>
    <div><b>@{viewer}</b></div>
    <Multiline className='light-content' value={text} setValue={set_text} rows={reply ? undefined : single ? 3 : 16} row_limited={16} placeholder='type here' />
    {href ? <div style={S(`
    width: 100%;
    flex-shrink: 1;
    overflow: auto;
    `)}>
      <PostRich {...{ href, single, handle }} />
    </div> : null}
    <div className='row wide end' style={!close?undefined:S(`font-size:1.125em;/* not sure why this is required :/ */`)}>
      <InfoBadges nowrap labels={[
        ...(close ? [
          { 'cancel': close },
          { spacer:true },
        ] : []),
        post && {
          text: <i>you have {datetimes.durations.pretty(compute_edit_time(post))} to make edits</i>,
        },
        `${text.length}/${CAP_POST_LEN}`,
        is_over ? 'too long' : { [post ? 'save' : 'post']: async () => {
          if (post) {
            if (post.t + datetimes.duration({ m:15 }) < Date.now() && post.user !== 'cyrus') {
              alert('too late to edit')
              set_text('')
              close && close()
            } else {
              const { data:new_post } = await api.post(`/light/post/${post.id}/edit`, { text })
              set_text('')
              on_submit(new_post.id)
              close && close()
            }
          } else {
            const id = await handle.send({ text, parent })
            set_text('')
            on_submit(id)
            close && close()
          }
        } },
      ]} />
    </div>
  </div>
}
