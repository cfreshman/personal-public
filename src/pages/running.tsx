import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S } from 'src/lib/util'

const { named_log, Q } = window as any
const log = named_log('running')

export default () => {
  usePageSettings({
    professional: true,
  })

  return <Style>
    <InfoBody className='column'>
      {/* <InfoSection labels={['running']}>
        stay on pace
      </InfoSection> */}
      <InfoSection labels={[
        'app',
        { 'open separately': () => parent.open(Q('#app-frame').contentWindow.location.href, '_blank') }
      ]} style={S(`flex-grow:1`)}>
        <iframe id='app-frame' src='/raw/running/app.html' style={S(`
        height: 100%;
        border: 1px solid currentcolor;
        `)} />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`