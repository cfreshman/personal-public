import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'

const { named_log } = window as any
const NAME = 'template'
const log = named_log(NAME)

export default () => {
  return <Style>
    <InfoBody>
      <InfoSection labels={[NAME]}>new page</InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`