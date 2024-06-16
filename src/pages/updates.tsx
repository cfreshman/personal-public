import React from 'react'
import styled from 'styled-components'
import { CodeBlock, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { useCached } from '../lib/hooks'
import api from '../lib/api'
import { toStyle, toYearMonthDay } from '../lib/util'


export default () => {
  const [updates, reloadUpdates] = useCached('updates-queue', () => api.get('q/updates'))
  return <Style>
    <InfoBody>
      <InfoSection labels={['updates']}>
        <CodeBlock
        download={'updates-' + toYearMonthDay(new Date())}
        style={toStyle(`
        font-size: .55em;
        `) /* TODO more efficient toStyle */}
        >{JSON.pretty(updates) /* TODO don't pollute prototypes */}</CodeBlock>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
`