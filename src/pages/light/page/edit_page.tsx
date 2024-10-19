import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles, Multiline } from 'src/components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import url from 'src/lib/url'
import Profile from '../ui/profile'
import { store } from 'src/lib/store'
import Edit from '../ui/edit'

const { named_log } = window as any
const NAME = 'light edit page'
const log = named_log(NAME)

export const EditPage =  ({ handle }) => {
  return <div id='light-edit'>
    <Edit {...{ handle }} />
  </div>
}