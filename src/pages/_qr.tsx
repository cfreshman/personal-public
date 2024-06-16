// USE /raw/qr INSTEAD

import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { useCachedScript } from 'src/lib/hooks_ext'
import { useF, useR, useS } from 'src/lib/hooks'

const { named_log, Q, copy, defer } = window as any
const log = named_log('qr page')

export default () => {
  const [href, set_href] = useS('')

  const ref_qr = useR()
  const create_qr = useR()
  const generate_code = () => {
      if (window['QRCode'] && (!create_qr.current || !Q(ref_qr.current, 'img'))) {
          const { QRCode } = window as any
          const qr_instance = new QRCode(ref_qr.current, {
              width: 256,
              height: 256,
          })
          create_qr.current = (url) => qr_instance.makeCode(url)
      }
      if (!href || !create_qr.current) return
      create_qr.current(href)
  }
  useCachedScript('/lib/2/external/qrcode.min.js', () => generate_code())
  useF(href, () => generate_code())
  return <Style>
    <InfoBody>
      <InfoSection labels={['generate QR']}>
        <input value={href} onChange={e => set_href(e.target.value)} />
        <div ref={ref_qr} />
      </InfoSection>
    </InfoBody>
  </Style>
}
const Style = styled(InfoStyles)`

`