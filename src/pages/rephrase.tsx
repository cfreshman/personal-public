import React, { useState } from 'react';
import styled from 'styled-components';
import { HalfLine, InfoBadges, InfoBody, InfoCheckbox, InfoFile, InfoLoginBlock, InfoRequireMe, InfoSection, InfoStyles, Loader } from '../components/Info';
import api, { auth } from '../lib/api';
import { asInput, useF, useR, useS, useStyle } from '../lib/hooks';
import { useAuth, usePageSettings, usePathState } from '../lib/hooks_ext';
import { S } from 'src/lib/util';
import { Row } from 'src/components/Common';
import { store } from 'src/lib/store';
import { open_popup } from 'src/components/Modal';

const { named_log, Q, defer, sleep, range, rand, devices } = window as any
const log = named_log('list-picker')

export default () => {
  const [a] = auth.use()
  const [phrase, set_phrase, fill_phrase] = asInput(store.use('rephrase-phrase', { default:'' }))
  const [loading, set_loading] = useS(false)
  const [rephrased, set_rephrased] = store.use('rephrase-rephrased', { default:undefined })
  const [list, set_list] = store.use('rephrase-list', { default:undefined })
  const [error, set_error] = useS(undefined)

  const handle = {
    send: () => {
      if (!phrase) return
      set_list(undefined)
      set_error(undefined)
      set_loading(true)
      set_rephrased(phrase)
      api.post('/rephrase', { phrase }).then(({ list }) => {
        set_list(list)
      }).catch(e => {
        set_error(e.error || e)
      }).finally(() => {
        set_loading(false)
      })
    }
  }

  useF(phrase, () => set_error(undefined))
  useF(phrase, () => {
    if (phrase !== rephrased) {
      set_rephrased(undefined)
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
          <input {...fill_phrase} placeholder={'your phrase'} style={S(`
          text-align: center;
          `)} onKeyDown={e => e.key === 'Enter' && handle.send()} />
          {rephrased ? null : <button disabled={!phrase} style={S(`font-size: 1.5em`)} onClick={e => handle.send()}>rephrase x7</button>}
          {loading ? <Loader color='#fff' /> : null}
          {error ? <div className='center-row'>{error}</div> : null}
          {list ? <div className='center-column'>
            {list.map((phrase, i) => <div key={i} className='center-row'>{phrase}</div>)}
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

input {
  border-radius: .25em !important;
  padding: .33em .67em !important;
  color: var(--id-color-text-readable) !important;
}
}`
