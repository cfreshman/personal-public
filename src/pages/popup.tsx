import React from 'react'
import { asInput, useF } from '../lib/hooks'
import { parseLogicalPath } from '../lib/page'
import { store } from '../lib/store'
import { apply, pass } from '../lib/types'
import url from '../lib/url'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings } from '../lib/hooks_ext'


export default () => {
  usePageSettings({
    expand: true,
  })

  const [value, setValue] = store.local.use('popup-value')
  const [dimensions, setDimensions, bindDimensions] = asInput(store.local.use('popup-dimensions', {
    default: '1600x900',
  }))
  const handle = {
    open: (_value=value) => {

      let url = _value
      if(0)0
      else if (url.endsWith('.')) url = url + location.host
      else if (url.startsWith('/') || !url.includes('.')) url = location.origin.replace('popup.', '') + url.replace(/^\/?-?/, '/-')
      else url = url.replace(/^(https?:\/\/)/, 'http://')

      const [w, h] = dimensions.split('x')
      open(url, '_blank', `popup,width=${w},height=${h}`)
    },
  }
  // useF(() => {
  //   if (to_open) {
  //     setValue(to_open)
  //     handle.open(to_open)
  //     url.replace('/popup')
  //   }
  // })

  return <Style>
    <InfoBody>
      <InfoSection>
        <input value={value} onChange={e => setValue(e.target.value)} onKeyDown={(e:any) => apply({ 'Enter': handle.open }[e.key])}></input>
        <input {...bindDimensions} />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`