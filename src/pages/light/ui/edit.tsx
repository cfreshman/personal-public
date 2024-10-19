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

const { named_log } = window as any
const NAME = 'light edit'
const log = named_log(NAME)

const CAP_POST_LEN = 500

export default ({ handle, parent=undefined, reply=false }) => {
  const [{user:viewer}] = auth.use()

  const [text, set_text] = store.use('light-edit-text', { default:'' })
  const [href, set_href] = useS('')
  useF(text, () => {
    const links = extractLinks(text)
    set_href(links.at(-1))
  })
  const single = useM(text, href, () => {
    if (href && !text.replace(href.replace(/https?:\/\//, ''), '').replace(/https?:\/\//, '').trim()) {
      return true
    }
    return false
  })

  const is_over = useM(text, () => text.length > CAP_POST_LEN)

  return <div className={`light-edit column gap ${reply?'light-light':''}`}>
    <div><b>@{viewer}</b></div>
    <Multiline className='light-content' value={text} setValue={set_text} rows={reply ? undefined : single ? 3 : 16} row_limited={16} placeholder='type here' />
    {href ? <PostRich {...{ href, single }} /> : null}
    <div className='row wide end'>
      <InfoBadges labels={[
        `${text.length}/${CAP_POST_LEN}`,
        is_over ? 'too long' : { post: async () => {
          const id = await handle.send({ text, parent })
          set_text('')
          url.push(`/light/post/${id}`)
        } },
      ]} />
    </div>
  </div>
}
