import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { asInput, useF, useM, useR, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { store } from 'src/lib/store'
import { S, server } from 'src/lib/util'
import { RawWebsiteIcon, WebsiteIcon, WebsiteTitle, WebsiteTitleAndIcon } from 'src/components/website_title'
import GreeterLink from './greeter/GreeterLink'

const { named_log, copy, display_status } = window as any
const log = named_log('itly')

export default () => {
  const [url_in, set_url_in, fill_url_in] = asInput(store.use('itly-url_in'))
  useF(url_in, () => set_url_in(url_in?.replace(/https?:\/\//, '')))
  const url_out = useM(url_in, () => {
    if (!url_in) return ''
    // const naked_url = new URL(`https://${url_in}`)
    // delete naked_url.search
    const naked_url = url_in.includes('open.spotify.com') ? url_in.split('?')[0] : url_in
    return `${server}/api/itly/${naked_url.replace(/https?:\/\//, '').toString()}`
    // return `freshman.dev/api/itly/${url_in}`
  })

  const [history, set_history] = store.use('itly-history', { default:[] })
  
  const handle = {
    add_history: (item=url_in) => {
      if (item) {
        set_history([item, ...history.filter(x => x !== item)])
      }
    },
  }

  usePageSettings({
    // background: '#1DB954',
    background: '#F7DC6F',
    expand: true,
  })
  return <Style id='itly'>
    <InfoBody className='column' style={S(`gap: .5em`)}>
      <InfoSection>
        <div className='itly-block'><b>itly:</b> itty bitty link previews</div>
      </InfoSection>
      <InfoSection labels={[
        'in',
        { 'paste clipboard': () => navigator.clipboard.readText().then(set_url_in) },
        url_in && { 'clear': e => {
          set_url_in('')
        }, label: !url_in },
      ]}>
        <input {...fill_url_in} placeholder='enter link' className='itly-block itly-block-dark' />
      </InfoSection>
      <InfoSection labels={[
        'out',
        url_in && { 'copy': e => {
          copy(url_out)
          display_status(e.target, 'copied!')
          handle.add_history()
        }, label: !url_in },
      ]}>
        <div className='pre-wrap' style={S(`max-width:100%;overflow-wrap:break-word`)}>{url_in ? <>
          <div onClick={e => {
            copy(url_out)
            display_status(e.target, 'copied!')
            handle.add_history()
          }} className='itly-block itly-block-dark pointer'>{url_out}</div>
        </> : `paste link above to generate link with smaller iMessage display`}</div>
        {url_in ? <A tab={`https://${url_in}`} className='row gap' style={S(`
        border: 1px solid currentcolor;
        padding: .5em;
        border-radius: .25em;
        gap: .5em;
        background: var(--id-color-text-readable);
        text-decoration: none !important;
        `)}>
          <WebsiteTitle href={url_in} />
          <RawWebsiteIcon href={url_in} style={S(`height: 3em`)} />
        </A> : null}
        {url_in ? null : <>
          <HalfLine />
          <InfoBadges labels={[
            { 'try an example': () => set_url_in(`https://open.spotify.com/track/29OFLlrrfKIEVwbVMTjBYe?si=771beb8462fc4817`) }
          ]} />
        </>}
      </InfoSection>
      {history.length ? <InfoSection labels={[
        'history',
        { 'clear': () => set_history([]) },
      ]}>
        <div className='row gap wrap'>
          <InfoBadges labels={history.map(url => {
            return {
              func: () => set_url_in(url),
              text: <>
                <WebsiteTitle href={url} />
                &nbsp;
                <RawWebsiteIcon href={url} style={S(`height: 1.5em`)} />
              </>
            }
          })} />
        </div>
      </InfoSection> : null}
      <div className='spacer' />
      <InfoSection label='more'>
        <div>- add to your home screen for quick access</div>
        {/* <div>- read <A bold tab='/about' /> this website</div> */}
        <div>- <A bold tab='/contact' /> me</div>
        <div>- donate a <A bold tab='/coffee' /></div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`&#itly#itly#itly{
  .itly-block {
    border: 1px solid var(--id-color-text) !important;
    padding: .5em !important;
    border-radius: .25em !important;
  }
  .itly-block-dark {
    &:is(input) {
      background: #000 !important;
      color: #fff !important;

      background: #222 !important;
      color: var(--id-color) !important;
    }
    &:not(input) {
      background: #222;
      color: var(--id-color);
    }
  }
  .pointer {
    cursor: pointer !important;
  }
  .button {
    background: #222 !important;
    color: var(--id-color) !important;
  }
}`