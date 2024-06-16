import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S } from 'src/lib/util'

const { named_log } = window as any
const log = named_log('euphoria')

export default () => {
  return <Style>
    <InfoBody className='column'>
      <InfoSection labels={['euphoria']}>
        track days you felt true euphoria. aim for 100%
      </InfoSection>
      <InfoSection labels={[
        'app',
        '(use case of /tally)',
        { text: 'open /tally', href: '/tally' },
      ]} style={S(`
      flex-grow: 1;
      `)}>
        <iframe src="/-tally#euphoria" style={S(`
        height: -webkit-fill-available;
        border: 1px solid currentcolor;
        `)} />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`