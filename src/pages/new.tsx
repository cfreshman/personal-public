import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { openLogin } from 'src/lib/auth'

const { named_log } = window as any
const NAME = 'new'
const log = named_log(NAME)

export default () => {
  return <Style>
    <InfoBody>
      <InfoSection labels={[
        'new'
      ]}>
        <InfoBadges labels={[
          { 'create an account on freshman.dev': () => openLogin() },
        ]} />
        <InfoBadges labels={[
          { text: 'back to home', href: '/' },
        ]} />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`