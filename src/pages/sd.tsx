import React, { useState } from 'react';
import styled from 'styled-components';
import { HalfLine, InfoBadges, InfoBody, InfoCheckbox, InfoFile, InfoLoginBlock, InfoRequireMe, InfoSection, InfoStyles, Loader, Multiline } from '../components/Info';
import api, { auth } from '../lib/api';
import { asInput, useF, useR, useS, useStyle } from '../lib/hooks';
import { useAuth, usePageSettings, usePathState } from '../lib/hooks_ext';
import { S } from 'src/lib/util';
import { Row } from 'src/components/Common';
import { store } from 'src/lib/store';
import { open_popup } from 'src/components/Modal';

const { named_log, Q, defer, sleep, range, rand, devices } = window as any
const log = named_log('sd')

export default () => {
  const [a] = auth.use()
  const [phrase, set_phrase, fill_phrase] = asInput(store.use('sd-phrase', { default:'' }))
  const [loading, set_loading] = useS(false)
  const [sent, set_sent] = store.use('sd-sent', { default:undefined })
  const [response, set_response] = store.use('sd-response', { default:undefined })
  const [error, set_error] = useS(undefined)

  const handle = {
    send: () => {
      if (!phrase) return
      set_response(undefined)
      set_error(undefined)
      set_loading(true)
      set_sent(phrase)
      api.post('/companion/sd', { prompt:phrase }).then(({ response }) => {
        set_response(response)
      }).catch(e => {
        set_error(e.error || e)
      }).finally(() => {
        set_loading(false)
      })
    }
  }

  useF(phrase, () => set_error(undefined))
  useF(phrase, () => {
    if (phrase !== sent) {
      set_sent(undefined)
    }
  })

  usePageSettings({
    professional: true,
  })
  return <Style id='rephrase' className='tall wide'>
    <InfoBody className='column'>
      <InfoSection labels={[
      ]} className='column h100 w100'>
        <div className='spacer' />
        <div className='center-column wide spaced'>
          <Multiline value={phrase} setValue={set_phrase} placeholder={'your prompt'} style={S(`
          text-align: center;
          `)} onKeyDown={e => {
            if (e.key === 'Enter' && e.shiftKey) {
              e.preventDefault()
              handle.send()
            }
          }} />
          {sent ? null : <button disabled={!phrase} style={S(`font-size: 1.5em`)} onClick={e => handle.send()}>generate image</button>}
          {loading ? <Loader color='#fff' /> : null}
          {error ? <div className='center-row'>{error}</div> : null}
          {response ? <div className='center-column'>
            <img src={response} style={S(`
            width: 512px;
            max-width: 100%;
            `)} />
          </div> : null}
        </div>
        <div className='spacer' />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`&#rephrase {
label.action:has(input[type=file]), button {
  background: var(--id-color-text-readable) !important;
  color: var(--id-color-text) !important;
  height: 1.5em;
  border: 1px solid currentcolor;
  border-radius: 10em;
  padding: 0 .5em;
  box-shadow: 0 2px currentcolor;
  translate: 0 -2px;
  cursor: pointer;
  user-select: none;

  &:active, &.active {
    translate: 0;
    box-shadow: none;
  }

  &:disabled {
    opacity: .5;
    pointer-events: none;
  }
}

input, textarea {
  border-radius: .25em !important;
  padding: .33em .67em !important;
  color: var(--id-color-text-readable) !important;
  background: var(--id-color-text) !important;
  border: none !important;
  &:placeholder {
    color: var(--id-color) !important;
  }
}
}`
