import React, { useState } from 'react';
import styled from 'styled-components';
import { InfoBadges, InfoBody, InfoCheckbox, InfoFile, InfoLoginBlock, InfoRequireMe, InfoStyles } from '../components/Info';
import api, { auth } from '../lib/api';
import { asInput, useF, useR, useS } from '../lib/hooks';
import { useAuth, usePageSettings, usePathState } from '../lib/hooks_ext';
import { S } from 'src/lib/util';
import { Row } from 'src/components/Common';
import { store } from 'src/lib/store';

const { named_log, Q, defer, sleep, range } = window as any
const log = named_log('file-image')

export default () => {
  usePageSettings({
    professional: true,
  })
  const [{ user }] = auth.use()
  const [file, setFile] = useS<File>(undefined)
  const [href, set_href] = useS(undefined)

  const handle = {
    upload: (data) => {
      console.debug('upload', data)
      api
      .post(`/image`, data, {
        headers: { 'Content-Type': data.type || 'multipart/form-data' },
      })
      .then(result => {
        log('upload result', result)
        set_href(result.href)
      })
    },
  }

  return <Style id='page-file' className='tall wide' onDrop={async e => {
    e.preventDefault()
    setFile(e.dataTransfer.items[0].getAsFile())
  }}>
    <InfoRequireMe>
      <InfoBody className='column tall wide' style={S(`align-items:stretch`)}>
        <InfoBadges style={S(`max-width:100%;`)} labels={[
          <InfoFile label='select file' setValue={setFile} style={S(`
          flex-shrink: 1;
          display: inline-flex;
          justify-content: flex-end;
          overflow: hidden;
          `)} /> as any,
          { 
            'upload': e => handle.upload(file),
            label: !file,
          },
        ]} />
        {href ? <img src={href} /> : 'no image uploaded'}
      </InfoBody>
    </InfoRequireMe>
  </Style>
}

const Style = styled(InfoStyles)`
&#page-file {
  input:not(:checkbox), textarea {
    min-width: 14rem;
    &[disabled] {
      filter: contrast(.5);
    }
  }
  button {
    background: none;
    color: inherit;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    outline: inherit;

    margin-right: .5rem;
    padding: 0 .5rem;
    border: 1px solid black;
    border-radius: .2rem;
    white-space: pre;
  }
  .body > div {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
  }
  .row {
    align-self: stretch;
    gap: 2px;
    > * {
      white-space: pre;
    }
  }
}
`