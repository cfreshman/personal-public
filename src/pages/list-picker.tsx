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

const { named_log, Q, defer, sleep, range, rand } = window as any
const log = named_log('list-picker')

export default () => {
  const [a] = auth.use()
  const [image, set_image] = useS(undefined)
  const [list, set_list] = useS(undefined)
  const [item, set_item] = useS(undefined)
  const [error, set_error] = useS(undefined)

  const handle = {
    image: async (image_data: File) => {
      // convert file to data url
      const reader = new FileReader()
      reader.onload = async () => {
        set_image(reader.result)

        // send to server
        let close_popup
        open_popup(close => {
          close_popup = close
          return <div className='middle-column h100 w100'>
            <span className='center-row'>reading menu&nbsp;<Loader color={'#fff'} /></span>
          </div>
        })
        try {
          const { list } = await api.post('/list-picker', { data_url: reader.result })
          log({ list })
          set_list(list)
          set_item(rand.sample(list))
          set_error(undefined)
        } catch (e) {
          log('error', e)
          set_error(e.error || e)
        }
        close_popup()
      }
      reader.readAsDataURL(image_data)
    },
  }
  useF(image, () => set_error(undefined))

  usePageSettings({
    professional: true,
  })
  return <Style id='list-picker' className='tall wide' onDrop={async e => {
    e.preventDefault()
    handle.image(e.dataTransfer.items[0].getAsFile())
  }}>
    <InfoBody className='column'>
      {image ? <>
        <InfoSection labels={[
          a.expand && 'list-picker',
          { 'view menu items': () => {
            open_popup(close => {
              return <div className='center-column h100 w100'>
                {list.map((item, i) => <div>{item}</div>)}
              </div>
            })
          } },
          { 'pick a different item': () => {
            let new_item
            do {
              new_item = rand.sample(list)
            } while (new_item === item) 
            set_item(new_item)
          } },
        ]}>
          {error ? <span style={S(`color:red; font-weight:bold`)}>{error}</span>
          : !list ? <>choosing menu item...</>
          : !item ? <>couldn't read any menu items</>
          : <>
            <span>choose <span style={S(`font-weight:bold`)}>{item}</span></span>
          </>}
        </InfoSection>
        <HalfLine />
        <InfoSection labels={[
          { 'clear image': () => set_image(undefined) },
        ]}>
          <img src={image} style={S(`max-width: 100%; max-height: 20em;`)} />
        </InfoSection>
      </> : <>
        <InfoSection labels={[
          a.expand && 'list-picker',
        ]} className='column h100 w100'>
          <div className='spacer' />
          <div className='grow center-column wide'>
            <InfoFile label='SELECT IMAGE' setValue={handle.image} />
            <HalfLine />
            <div className='description' style={S(`max-width: 20em`)}>list-picker will give you a random item from your image</div>
            <div className='spacer' />
          </div>
        </InfoSection>
      </>}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`&#list-picker {
label.action:has(input[type=file]) {
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
