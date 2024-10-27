import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'
import { EmojiKeyboard } from 'src/components/emoji'

const { named_log, Q, entries, keys, values } = window as any
const NAME = 'emojis'
const log = named_log(NAME)

export default () => {
  const [text, set_text] = store.use('emoji-text')

  usePageSettings()
  return <Style>
    <InfoBody>
      <InfoSection labels={[NAME]}>
        <input id='input-emoji' value={text} onChange={e => set_text(e.target.value)} style={S(`font-size: 3em;`)} />
        <EmojiKeyboard input_selector={'#input-emoji'} />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`