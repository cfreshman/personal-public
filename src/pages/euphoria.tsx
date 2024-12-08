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
      <InfoSection labels={[
        'euphoria',
        '(use case of /tap)',
        { text: 'open /tap', href: '/tap/#/euphoria' },
        ]} style={S(`
        flex-grow: 1;
        overflow: hidden;
        `)}>
        track days you felt true euphoria. aim for 100%
        <iframe src="/-tap#euphoria" style={S(`
        height: -webkit-fill-available;
        border: 1px solid #0008;
        border-radius: .25em;
        overflow: hidden;
        `)} />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`