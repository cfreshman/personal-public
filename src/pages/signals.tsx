import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { useM } from 'src/lib/hooks'
import { trigger } from 'src/lib/trigger'
import { usePageSettings } from 'src/lib/hooks_ext'


const InputChild = (({ backbone }) => {
  backbone.use()
  return <div>
    <input value={backbone.value} onChange={e => {
      backbone.set(e.target.value)
    }}></input>
  </div>
})
const TextChild = (({ backbone }) => {
  backbone.use()
  return <div>
    {backbone.value}
  </div>
})

export default () => {
  usePageSettings()
  const backbone = useM(() => trigger.value('hello world'))

  return <Style>
    <InfoBody>
      <InfoSection labels={['section a']}>
        <InputChild {...{ backbone }} />
      </InfoSection>
      <InfoSection labels={['section b']}>
        <InputChild {...{ backbone }} />
      </InfoSection>
      <InfoSection labels={['section c']}>
        <TextChild {...{ backbone }} />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`