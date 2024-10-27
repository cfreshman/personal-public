import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles, Multiline, Select } from '../../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { openLogin } from 'src/lib/auth'
import { S, server } from 'src/lib/util'
import url from 'src/lib/url'
import { Dangerous } from 'src/components/individual/Dangerous'

const { named_log, duration, values, defer, node } = window as any
const NAME = 'dating profile'
const log = named_log(NAME)

export default ({ viewer, user=viewer, handle }) => {

  const self = viewer === user

  const [dating_pro, set_dating_pro] = useS(undefined)
  const [check, set_check] = useS(false)

  handle = {
    ...handle,
    load_dating_pro: async () => {
      const { data } = await api.post(`/dating/profile/${user}`)
      log('load_dating_pro', data)
      set_dating_pro(data)
    }
  }

  useF(user, handle.load_dating_pro)
  useF(user, () => set_check(false))

  const has_6mo_sti = useM(dating_pro, () => {
    return dating_pro?.sti && dating_pro.sti + duration({ mo:6 }) > Date.now()
  })
  const sti_tested_mo = useM(dating_pro, () => {
    return dating_pro?.sti && Math.round((Date.now() - Number(new Date(dating_pro.sti))) / duration({ mo:1 }))
  })

  return <>
    <HalfLine />
    <InfoSection className='column wide gap'>
      {!dating_pro ? `loading ${user}'s profile...` : <>
        <div className='center-row spaced'>
          <span style={S(`
          font-size: 1.25em;  
          `)}><b>{dating_pro.name || `@${dating_pro.user}`}</b>, {dating_pro.age}</span>
          {sti_tested_mo ? <span style={S(`
          font-size: .8em;
          border: 1px solid currentcolor;
          border-radius: 10em;
          padding: 0 .5em;
          `)}>STI tested {sti_tested_mo}mo ago</span> : null}
        </div>
        <div>{dating_pro.bio}</div>
        <HalfLine />
        <InfoBadges labels={[
          check ? 'checked out' : { 'check me out': () => {
            set_check(true)
          } },
          check && { 'match': () => {
            alert(self ? `that's you!` : 'not ready yet!')
          } },
          { 'next user': () => {
            alert('not ready yet!')
          } },
        ]} />
        <HalfLine />
        {!check ? <div className='dating-photos row wide gap wrap'>
          {dating_pro.photos.map(({ url, label }) => {
            return <div className='dating-photo-hidden'>{label}</div>
          })}
        </div> : <div className='dating-photos row wide wrap'>
          {dating_pro.photos.map(({ url, label }) => {
            return <div className='dating-photo-container'>
              <img src={url} className='dating-photo' />
              <div className='dating-photo-label'>{label}</div>
            </div>
          })}
        </div>}
      </>}
    </InfoSection>
  </>
}
