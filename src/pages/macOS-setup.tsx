import React from 'react'
import styled from 'styled-components'
import { CodeBlock, InfoBody, InfoSection, InfoStyles } from '../components/Info'


export default () => {
  return <Style>
    <InfoBody>
      <InfoSection labels={['personal macOS settings']}>
        <CodeBlock>Finder file extensions</CodeBlock>
      </InfoSection>
      <InfoSection labels={['other programs']}>
        <CodeBlock>You probably shouldn't share that publicly</CodeBlock>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`