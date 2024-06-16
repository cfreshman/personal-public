import React, { useState } from 'react'
import { convertLinks } from '../lib/render'
import styled from 'styled-components'
import { InfoBody, InfoPageSearch, InfoRequireMe, InfoStyles } from '../components/Info'
import { list } from '../lib/util'

export default () => {
  return <InfoRequireMe>
    <Style>
      <InfoPageSearch />
      <InfoBody>
        {convertLinks(list('settings counts updates').map(x => '/'+x).join('\n'))}
      </InfoBody>
    </Style>
  </InfoRequireMe>
}

const Style = styled(InfoStyles)`
white-space: pre;
`