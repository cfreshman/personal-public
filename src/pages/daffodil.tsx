import React from 'react'
import styled from 'styled-components'
import { A, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings } from 'src/lib/hooks_ext'
import { mobile, S } from 'src/lib/util'

const { named_log } = window as any
const log = named_log('daffodil')

export default () => {
  usePageSettings({
    background: '#ffd700',
  })
  return <Style>
    <InfoBody className='flex tall'>
      <InfoSection labels={[
          // 'daffodil'
        ]} className='middle-column tall center' style={S(`justify-content: center`)}>
        <div className='middle-column' style={S(`
          gap: .5em;
          padding: 1em;
          `)}>
          <div>i split <A tab href='https://www.lego.com/en-us/product/daffodils-40747'>the new LEGO daffodil set</A> into 4 individual daffodils!</div>
          <img src='https://www.lego.com/cdn/cs/set/assets/blt198dff9f08af2ca0/40747.png' style={S(`height: 15em; border: 1px solid #000`)}/>
          <div><b>instructions:</b> <A tab href='https://freshman.dev/make-daffodil' /></div>
          <div>if i asked you to reimburse: <A tab href='https://freshman.dev/pay-daffodil'>venmo @CyrusFreshman $3</A></div>
          <div>play a word game with me: <A tab href='https://freshman.dev/fight-me' /></div>
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`