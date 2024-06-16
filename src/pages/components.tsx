import React from 'react'
import styled from 'styled-components'
import { Checkbox, CodeBlock, InfoBody, InfoButton, InfoCheckbox, InfoGroup, InfoSection, InfoSlider, InfoStyles } from '../components/Info'
import { Dropdown } from 'src/components/individual/Dropdown'
import { S, randAlphanum, range } from 'src/lib/util'

declare global {
  class rand {
    static alphanum
  }
}

export default () => {
  return <Style>
    <InfoBody>
      <InfoSection id='showcase' labels={['component showcase']}>

        <CodeBlock>code block</CodeBlock>
        
        <div className='center-row' style={{justifyContent:'flex-start'}}>
          <Dropdown label='label' indicator='right'>
            {range(3).map(i => <a key={i}>{rand.alphanum(8)}</a>)}
            <hr />
            {range(3).map(i => <a key={i}>{rand.alphanum(8)}</a>)}
          </Dropdown>
          <Dropdown label='lines'>
            {range(3).map(i => <a key={i}>{rand.alphanum(8)}</a>)}
            <hr />
            {range(3).map(i => <a key={i}>{rand.alphanum(8)}</a>)}
          </Dropdown>
          <Dropdown label='icon'>
            {range(3).map(i => <a key={i}>{rand.alphanum(8)}</a>)}
            <hr />
            {range(3).map(i => <a key={i}>{rand.alphanum(8)}</a>)}
          </Dropdown>
        </div>

        <InfoSlider />
        <InfoSlider value={5} range={[0, 11]} color='#fff' />

        <div className='column'>
          <label><Checkbox /> unchecked</label>
          <label><Checkbox value={true} /> checked</label>
          <InfoCheckbox label='info-checkbox' />
        </div>

      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
#showcase {
  display: flex; br { display:none }
  flex-direction: column;
  gap: 1em;
}
`