import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'

const { named_log, display_status } = window as any
const NAME = 'overlay-helper'
const log = named_log(NAME)

export default () => {
  usePageSettings()
  return <Style>
    <InfoBody>
      <InfoSection labels={[NAME]}>
        <InfoBadges labels={[
          { 'reset': async e => {
            const { success } = await api.delete('/overlay')
            display_status(e.target, success ? 'success' : 'fail')
          } },
        ]} />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`