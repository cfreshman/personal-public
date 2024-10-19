import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles } from 'src/components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import url from 'src/lib/url'
import { S } from 'src/lib/util'
import { use_profile } from '../func/profile'
import { convertLinks } from 'src/lib/render'

const { named_log, strings, datetimes } = window as any
const NAME = 'light profile'
const log = named_log(NAME)

export default ({ id, handle }) => {

  const { profile } = use_profile({ user:id })
  
  return <div className='light-profile column gap'>
    {!profile ? <>
      loading profile @{id}...
    </> : <>
      <div><b>@{id}</b> joined {datetimes.ymd(profile.t)}</div>
      <HalfLine />
      <div className='row gap'>
        <img src={profile.icon} style={S(`
        height: 5em;  
        `)} />
        <span>{convertLinks(profile.bio)}</span>
      </div>
    </>}
  </div>
}
