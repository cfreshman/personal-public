import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings } from 'src/lib/hooks_ext'
import { mobile, S } from 'src/lib/util'
import url from 'src/lib/url'

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
        <div className='spacer' />
        <div className='middle-column' style={S(`
          gap: .5em;
          padding: 1em;
          `)}>
          <div>you are in possession of one LEGO daffodil!</div>
          <A href='https://freshman.dev/make-daffodil'>
            <img src='https://www.lego.com/cdn/cs/set/assets/blt198dff9f08af2ca0/40747.png' style={S(`height: 15em; border: 1px solid #000`)}/>
          </A>
          {/* <div><b>instructions:</b> <A tab href='https://freshman.dev/make-daffodil' /></div> */}
          <div><button className='cute' style={S(`font-size:1.33em`)} onClick={e => {
            e.preventDefault()
            location.href = 'https://freshman.dev/make-daffodil'
          }}>building instructions →</button></div>
          {/* <div>if i asked you to reimburse: <A tab href='https://freshman.dev/pay-daffodil'>venmo @CyrusFreshman $3</A></div> */}
        </div>
        <div className='spacer center-column'>
          <div className='spacer' />
          <div>play a word game with me!</div>
          <div><A tab href='https://freshman.dev/fight-me' /></div>
          <HalfLine />
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

button.cute {
  color: var(--id-color-text);
  border-radius: 10em;
  border: 1px solid var(--id-color-text);
  box-shadow: 0 1px var(--id-color-text);
  min-width: 2em;
  display: flex; align-items: center; justify-content: center;
  translate: 0 -1px;
  &:not(:disabled) {
    cursor: pointer;
    &:active, &.active {
      translate: 0;
      box-shadow: none;
    }
  }
  &:disabled {
    cursor: default;
    color: #888;
    // background: #ccc;
  }
  min-height: 1.5em;
  padding: 0 .67em;
}

`