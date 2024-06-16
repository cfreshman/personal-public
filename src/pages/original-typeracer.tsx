import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoSelect, InfoStyles } from '../components/Info'
import { useEventListener, useInput, useS } from 'src/lib/hooks'
import { Q } from 'src/lib/util'


export default () => {
  const [target, setTarget, bindTarget] = useInput('typeracer')

  useEventListener(window, 'keydown', e => e.key === 'Enter' && Q('.body select').click())

  return <Style>
    <InfoBody>
      <InfoSection labels={['original typeracer']}>
        <InfoSelect
        {...bindTarget}
        options={target.split('').map((x,i,a) => a.slice(0, i+1).join(''))}
        value=''
        />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`