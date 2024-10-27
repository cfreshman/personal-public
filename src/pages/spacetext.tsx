import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoSection, InfoSelect, InfoStyles, Multiline } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'

const { named_log, copy, display_status, values } = window as any
const NAME = 'spacetext'
const log = named_log(NAME)

const TRANSFORM = {
  NONE: 'none',
  UPPERCASE: 'uppercase',
  LOWERCASE: 'lowercase',
}

export default () => {

  const [input, set_input] = store.use('spacetext-input', { default:'' })
  const [transform, set_transform] = store.use('spacetext-transform', { default:TRANSFORM.NONE })
  const output = useM(input, transform, () => {
    let raw = input.split('\n').map(line => line.split('').join(' ')).join('\n')
    switch (transform) {
      case TRANSFORM.UPPERCASE: return raw.toUpperCase()
      case TRANSFORM.LOWERCASE: return raw.toLowerCase()
      default: return raw
    }
  })

  usePageSettings()
  return <Style>
    <InfoBody className='column'>
      <InfoSection labels={[NAME]}>
        <Multiline value={input} setValue={set_input} placeholder='enter text' />
        <InfoSelect label='transform' options={values(TRANSFORM)} value={transform} setter={set_transform} />
        <HalfLine />
        <InfoBadges labels={[
          { 'reset': () => set_input('') },
          'or',
          { 'copy': e => {
            copy(output)
            display_status(e.target, 'copied!')
          } },
        ]} />
        <div style={S(`
        width: 100%;
        white-space: pre-wrap;
        border: 1px solid currentcolor;
        border-radius: .25em;
        padding: .25em;
        font-size: .67em;
        `)}>
          {output||' '}
        </div>
        <HalfLine />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.body {
  height: 100%;
}
`