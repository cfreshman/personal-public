import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoLoginBlock, InfoSection, InfoStyles } from '../../components/Info'
import { usePageSettings } from 'src/lib/hooks_ext'
import { S } from 'src/lib/util'
import api, { auth } from 'src/lib/api'
import { useEventListener, useF, useM, useR, useRerender, useS } from 'src/lib/hooks'
import url from 'src/lib/url'
import { GreeterLoginNotice } from './greeter_login_notice'
import { WebsiteIcon, WebsiteTitle } from 'src/components/website_title'
import GreeterLink from './GreeterLink'
import { UserBadge } from 'src/components/user_badges'


const { named_log, list, strings, truthy, QQ } = window as any
const log = named_log('greeter greet')

export const Greet = ({ user=undefined, handle=undefined, embedded=false, hide_profile=false }={}) => {

  const [{ user:viewer }] = auth.use()
  const self = viewer === user
  const [_greet, setGreet] = useS(undefined)
  const greet = useM(_greet, () => ({
    links: [],
    ...(_greet || {}),
  }))
  useF(user, () => handle.load_greet(user, setGreet))

  const [profile, setProfile] = useS(undefined)
  useF(user, () => handle.load_profile(user, setProfile))

  const [viewer_profile, setViewerProfile] = useS(undefined)
  useF(viewer_profile, () => handle.load_profile(viewer, setViewerProfile))

  const [edit, setEdit] = useS(false)
  const edit_data = useR({})
  const rerender = useRerender()
  useF(greet, () => {
    if (greet) {
      log('edit')
      edit_data.current = strings.json.clone(greet)
    }
  })

  const followed = useM(profile, () => profile?.follows?.includes(viewer))
  const following = useM(viewer_profile, () => viewer_profile?.follows?.includes(user))

  handle = {
    ...handle,
    save_greet: async () => {
      await handle.set_greet(edit_data.current, setGreet)
      setEdit(false)
    }
  }

  useEventListener(window, 'keydown', e => {
    if (edit && e.metaKey && e.key === 's') {
      e.preventDefault()
      handle.save_greet()
    }
  })

  return <>
    <InfoSection labels={[
      !embedded && user,
      embedded && (self ? 'your links' : 'links'),
      viewer && self && !edit && { edit: () => setEdit(true)},
      edit && { save: handle.save_greet },
      edit && { cancel: () => setEdit(false) },
      !embedded && !edit && followed && { 'view meets': e => handle.setPath([user, 'met', undefined], e) },
      // !edit && { 'view profile': () => url.push(`/u/${user}`) },
      !hide_profile && user && !edit && <UserBadge {...{ user, text:'open profile' }} />,
      viewer && !self && !embedded && !edit && !following && { 'follow': () => {
        api.post(`/profile/${user}/follow`, {}).then(() => handle.load_profile(viewer, setProfile))
      } },
      !self && !embedded && !edit && following && { 'add meeting': e => handle.setPath([viewer, 'met', user], e) },
    ]}>
      {edit ? <>
        {edit_data.current.links.map((link, i) => <input className='greeter-greet-links-input' type='text' value={link} onChange={e => {
          edit_data.current.links[i] = e.target.value
          edit_data.current.links = edit_data.current.links.filter(truthy)
          rerender()
        }} />)}
        <input type='text' placeholder={'new social link'} onChange={e => {
          edit_data.current.links.push(e.target.value)
          e.target.value = ''
          rerender()
          setTimeout(() => {
            QQ('.greeter-greet-links-input').at(-1).focus()
          })
        }}></input>
      </> : <>
        {greet?.links?.map(link => <GreeterLink href={link} />)}
        {greet?.links?.length ? null : <div>
          {_greet ? 'no links added' : 'loading profile'}
        </div>}
      </>}
    </InfoSection>
    {viewer || embedded ? null : <>
      <br />
      <GreeterLoginNotice />
    </>}
  </>
}
