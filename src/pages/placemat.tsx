import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'


export default () => {
  return <Style>
    <InfoBody>
      <InfoSection labels={['template']}>new page</InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`