import React, { useState } from 'react';
import styled from 'styled-components';
import { InfoBadges, InfoBody, InfoCheckbox, InfoFile, InfoLoginBlock, InfoRequireMe, InfoStyles } from '../components/Info';
import api, { auth } from '../lib/api';
import { asInput, useF, useR, useS } from '../lib/hooks';
import { useAuth, usePageSettings, usePathState } from '../lib/hooks_ext';
import { S } from 'src/lib/util';
import { Row } from 'src/components/Common';
import { store } from 'src/lib/store';

const { Q, defer, sleep, range } = window as any

export default () => {
  usePageSettings({
    professional: true,
  })
  const [{ user }] = auth.use()
  const [id, setId] = usePathState()
  const [file, setFile] = useS<File>(undefined)
  const data_ref = useR<HTMLTextAreaElement>()

  const [is_public, setPublic, bindPublic] = asInput(store.use('file-public', { default:false }))
  const [is_preserve_id, setPreserveId, bindPreserveId] = asInput(store.use('file-preserve-id', { default:false }))

  const handle = {
    load: async (id) => {
      setId(id)
      data_ref.current.value = await api.get(`/file/${id}`)
    },
    upload: (data) => {
      const id_save = id
      setId('(uploading)')
      console.debug('upload', data)
      data_ref.current.value = data
      api
      .post(`/file/${id}`, data, {
        headers: { 'Content-Type': data.type || 'multipart/form-data' },
      })
      .then(result => {
        console.debug('upload result', result)
        data_ref.current.value = location.origin + '/api/file/' + encodeURIComponent(id)
      })
      .finally(() => {
        setId(id_save)
      })
    },
  }
  useF(auth.user, () => id || handle.load('x'))
  useF(file, async () => {
    if (file) {
      is_preserve_id || setId(file.name)
      data_ref.current.value = '(loading)'
      data_ref.current.disabled = true
      await sleep(1)
      if (file.size > 10 * 1_000) {
        data_ref.current.value = `large file (${Math.round(file.size / 100_000) / 10}MB)`
      } else {
        data_ref.current.value = await file.text()
      }
      data_ref.current.disabled = false
    }
  })
  useF(id, is_public, () => setId(id.replace(/^(public-)?/, is_public ? 'public-' : '')))

  return <Style id='page-file' className='tall wide' onDrop={async e => {
    e.preventDefault()
    setFile(e.dataTransfer.items[0].getAsFile())
  }}>
    <InfoRequireMe>
      <InfoBody className='column tall wide' style={S(`align-items:stretch`)}>
        <Row className='wide'>
          <input type="text" placeholder='file name' value={id} onChange={e => setId(e.target.value)} />
        </Row>
        <InfoBadges style={S(`max-width:100%;`)} labels={[
          { 'load ↑': e => handle.load(id) },
          { 'upload ↓ as ↑': e => handle.upload(data_ref.current.value) },
          { 
            'upload → as ↑': e => handle.upload(file),
            label: !file,
          },
          <InfoFile label='select file' setValue={setFile} style={S(`
          flex-shrink: 1;
          display: inline-flex;
          justify-content: flex-end;
          overflow: hidden;
          `)} /> as any,
        ]} />
        <InfoBadges style={S(`max-width:100%;`)} labels={[
            <InfoCheckbox data-input-public label='public' {...bindPublic} setter={setPublic} /> as any,
            <InfoCheckbox data-input-preserve-id label='preserve name' {...bindPreserveId} setter={setPreserveId} /> as any,
          ]} />
        <textarea ref={data_ref} className='wide grow' style={S(`
        font-size: .5rem;
        `)} />
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