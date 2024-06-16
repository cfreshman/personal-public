import React from 'react'
import styled from 'styled-components'
import { A, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { asInput, useF, useM, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { store } from 'src/lib/store'
import { S, server } from 'src/lib/util'
import { RawWebsiteIcon, WebsiteIcon, WebsiteTitle, WebsiteTitleAndIcon } from 'src/components/website_title'
import GreeterLink from './greeter/GreeterLink'

const { named_log, copy, display_status } = window as any
const log = named_log('template')

export default () => {
  const [url_in, set_url_in, fill_url_in] = asInput(store.use('splink-url_in'))
  useF(url_in, () => set_url_in(url_in?.replace(/https?:\/\//, '')))
  const url_out = useM(url_in, () => {
    if (!url_in) return ''
    // const naked_url = new URL(`https://${url_in}`)
    // delete naked_url.search
    const naked_url = url_in.split('?')[0]
    return `${server}/api/splink/${naked_url.toString()}`
    // return `freshman.dev/api/splink/${url_in}`
  })

  usePageSettings({
    background: '#1DB954',
    expand: true,
  })
  return <Style>
    <InfoBody className='column'>
      <InfoSection labels={[
        'splink in',
      ]}>
        <input {...fill_url_in} placeholder='enter spotify link' />
        {url_in ? <A tab={`https://${url_in}`} className='row gap' style={S(`
        border: 1px solid currentcolor;
        padding: .5em;
        border-radius: .25em;
        gap: .5em;
        background: var(--id-color-text-readable);
        text-decoration: none !important;
        `)}>
          <RawWebsiteIcon href={url_in} style={S(`height: 3em`)} />
          <WebsiteTitle href={url_in} />
        </A> : null}
      </InfoSection>
      <InfoSection labels={[
        'splink out',
        { 'create and copy': e => {
          copy(`${url_out}`)
          display_status(e.target, 'copied!')
        }, label: !url_in },
      ]}>
        <div className='pre-wrap' style={S(`word-break:break-all`)}>{url_in ? url_out : `paste spotify link above to generate link with smaller imessage display`}</div>
      </InfoSection>
      <div className='spacer' />
      <InfoSection label='more'>
        <div>- add to your home screen for quick access</div>
        <div>- read <A bold tab='/about' /> this website</div>
        <div>- <A bold tab='/contact' /> me</div>
        <div>- donate a <A bold tab='/coffee' /></div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`