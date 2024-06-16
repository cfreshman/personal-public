import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S } from 'src/lib/util'

const { named_log } = window as any
const log = named_log('developer-program')

export default () => {
  usePageSettings({
    background: '#111',
  })
  return <Style>
    <InfoBody className='column'>
      <InfoSection labels={['developer-program']} style={S(`
        white-space: pre-line;
      `)}>
        <div>want to learn how to make web apps?</div>
        <HalfLine />
        <div><b>build apps on freshman.dev!</b></div>
        <HalfLine />
        <div>log your full-time hours and send them to me to split next week's site donations</div>
        <HalfLine />
        <div>get started by cloning <A bold tab='https://github.com/cfreshman/personal-public' /> and reading the <A bold tab='https://github.com/cfreshman/personal-public/issues/1'>pinned issue</A></div>
        <HalfLine />
        <div><i>if you don't know how to do anything yet - Google is your friend!! <b>you can teach yourself 100% of software skills</b> - especially by looking at existing code. the code for this page is at [todo]</i></div>
      </InfoSection>
      <div className='spacer' />
      <InfoSection label='more'>
        <div>- read <A bold tab='/about' /> this website</div>
        <div>- <A bold tab='/contact' /> me</div>
        <div>- donate a <A bold tab='/coffee' /></div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`