import React, { useState } from 'react';
import styled from 'styled-components';
import { HalfLine, InfoBadges, InfoBody, InfoCheckbox, InfoFile, InfoLoginBlock, InfoRequireMe, InfoSection, InfoStyles, Loader } from '../components/Info';
import api, { auth } from '../lib/api';
import { asInput, useF, useInterval, useM, useR, useRerender, useS, useStyle, useTimeout } from '../lib/hooks';
import { useAuth, usePageSettings, usePathState } from '../lib/hooks_ext';
import { S, server } from 'src/lib/util';
import { Row } from 'src/components/Common';
import { store } from 'src/lib/store';
import { open_popup } from 'src/components/Modal';
import url from 'src/lib/url';

const { named_log, Q, defer, sleep, range, rand, copy, display_status, datetimes } = window as any
const log = named_log('beam')

export default () => {
  const [a] = auth.use()

  const [file, set_file] = useS(undefined)

  const [id] = usePathState()
  const [beam, set_beam] = useS(undefined)
  const [error, set_error] = useS(undefined)
  useF(id, async () => {
    if (id) {
      try {
        const { data } = await api.post(`/beam/get`, { id })
        log('beam', data)
        set_beam(data)
      } catch (e) {
        set_error(e.error || e)
      }
    } else {
      set_beam(undefined)
    }
  })

  const handle = {
    file: async (file: File) => {
      set_file(file)
      const { data } = await api.post(`/beam/store/${file.name}`, file, { headers: { 'Content-Type': file.type || 'multipart/form-data' } })
      log({ data })
      url.push(`/beam/${data.id}`)
      set_file(undefined)
    },
    download: async () => {
      const a = document.createElement('a')
      a.href = server + `/api/beam/download/${beam.id}`
      a.download = beam.name
      a.click()
    },
  }
  useF(id, () => set_error(undefined))

  const end_ms = useM(beam, () => {
    if (!beam || !beam.t) return 1e99
    return beam.t + beam.d
  })
  const is_over = useM(end_ms, () => end_ms < Date.now())
  const rerender_over = useRerender()
  useInterval(rerender_over, 1_000)

  usePageSettings({
    professional: true,
  })
  return <Style id='list-picker' className='tall wide' onDrop={async e => {
    e.preventDefault()
    handle.file(e.dataTransfer.items[0].getAsFile())
  }} onDragOver={e => e.preventDefault()}>
    <InfoBody className='column'>
      {beam ? <>
        <InfoSection labels={[
          a.expand && 'beam',
        ]} className='column h100 w100'>
          {error ? <span style={S(`color:red; font-weight:bold`)}>{error}</span>
          : <>
            <div className='spacer' />
            <div className='middle-column wide spaced'>
              <div className='center-row spaced'>
                <div><b>beam #{id}</b></div>
                <button onClick={e => {
                  copy(location.href)
                  display_status(e.target, 'copied!')
                  navigator.share({
                    url: location.href,
                  })
                }}>copy link</button>
              </div>
              <button className='large' onClick={handle.download}>download {beam.name}</button>
              {!is_over ? <div>time remaining: {datetimes.durations.pretty(Math.max(0, beam.t + beam.d - Date.now()))}</div>
            : <div>ended {datetimes.durations.pretty(Math.max(0, Date.now() - (beam.t + beam.d)))} ago</div>}
            </div>
            <div className='spacer' />
          </>}
        </InfoSection>
      </> : <>
        <InfoSection labels={[
          a.expand && 'beam',
        ]} className='column h100 w100'>
          <div className='spacer' />
          <div className='center-column wide'>
            <InfoFile label='SELECT FILE TO BEAM 🛸' setValue={handle.file} className='large' />
            <HalfLine />
            <div className='description center-row spaced'>{file ? <>uploading <Loader color='#fff' /></> : <>create a one-hour download link</>}</div>
          </div>
          <div className='spacer' />
        </InfoSection>
      </>}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`&#list-picker {
label.action:has(input[type=file]), button {
  &.large {
    font-size: 1.5em !important;
  }
  background: var(--id-color) !important;
  color: var(--id-color-text) !important;
  border: 1px solid currentcolor;
  border-radius: 10em;
  padding: 0 .5em;
  box-shadow: 0 2px currentcolor;
  translate: 0 -2px;
  cursor: pointer;

  &:active {
    translate: 0;
    box-shadow: none;
  }
}
}`
