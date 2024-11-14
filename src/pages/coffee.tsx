import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBody, InfoButton, InfoSection, InfoStyles } from '../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useS, useStyle } from 'src/lib/hooks'
import api from 'src/lib/api'
import { mobile, S } from 'src/lib/util'
import { Dangerous } from 'src/components/individual/Dangerous'
import { QR } from 'src/components/qr'

const { named_log } = window as any
const NAME = 'coffee'
const log = named_log(NAME)

export default () => {
  useCachedScript(`https://js.stripe.com/v3/buy-button.js`)
  // useStyle(`
  // #inner-index#inner-index#inner-index {
  //   // border-radius: .25em;
  //   // border: 1px solid #fff2 !important;
  //   box-shadow: .125em .125em .5em #0004 !important;
  // }
  // #index::after {
  //   background: linear-gradient(#f201 0 0), linear-gradient(calc(15deg + 0deg), #ff5f2d88, #2b0600), linear-gradient(15deg, #cb0200, #5e2314, #5e2314, #ac4103, #ac4103, #410907, #410907, #63392a) !important;
  //   background-size: 105%;
  // }
  // `)
  usePageSettings({
    // background: '#222'
    professional: true,
  })
  return <Style>
    <InfoBody>
      <InfoSection>
        <div>buy me a coffee!</div>
        <img src='/raw/coffee/mug.png' style={S(`
        width: 16em;
        `)} />
        <HalfLine />
        {null && <>
          <div>just venmo:</div>
          <div className='row' style={S(`
            align-items: center;
            gap: .5em;
            `)}>
            {/* <a target="_blank" href={`${mobile ? 'venmo://users/CyrusFreshman' : 'https://freshman.dev/venmo'}`}>
              <img
              src="/raw/coffee/venmo-logo.png"
              title="venmo me" alt="Donate with Venmo button"
              style={S(`
              height: calc(1.5em + 2px);
              `)} />
            </a>
            <a target="_blank" href={`${mobile ? 'venmo://users/CyrusFreshman' : 'https://freshman.dev/venmo'}`}>
              <button>OPEN VENMO</button>
            </a> */}
            {mobile ? <a target="_blank" href='venmo://users/CyrusFreshman'>
              <button>
                OPEN VENMO&nbsp;<img
                src="/raw/coffee/venmo-logo.png"
                title="venmo me" alt="Donate with Venmo button"
                style={S(`
                height: calc(1.5em + 2px);
                `)} />
              </button>
            </a> : <QR {...{
              href: 'venmo://users/CyrusFreshman',
              size: '8em',
              qr_options: {
                border_width: '0',
                colorLight: '#eee',
                colorDark: '#000'
              },
            }} />}
          </div>
          <HalfLine />
        </>}
        <div>support publicly:</div>
        <Dangerous html={`<a href='https://ko-fi.com/U7U64599J' target='_blank'>
          <img style='height:3em' src='https://storage.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' />
        </a>`} />
        <HalfLine />
        <div>support privately:</div>
        <div>
          <Dangerous html={`
<stripe-buy-button
  buy-button-id="buy_btn_1PLVvgHQL6OVj4R1BwFigRDa"
  publishable-key="pk_live_B1kkIywcVRgdddU64hB2s6mW001AZzDbgm"
>
</stripe-buy-button>`} />
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.body {
  --id-color: #eee;
  --id-color-text: #222;
  --id-color-text-readable: #eee;
  background: var(--id-color) !important;
  color: var(--id-color-text) !important;
  margin: .5em;
  border: 1px solid #000;
  border-radius: .25em;
  padding: 1em !important;
  font-family: monospace;
  font-weight: bold !important;
}

a {
  text-decoration: none !important;
}
button, .button-like {
  box-shadow: 0 2px var(--id-color-text);
  translate: 0 -2px;
  cursor: pointer;

  &:active {
    translate: 0;
    box-shadow: none;
  }
}
button {
  border-radius: 10em;
  border: 1px solid var(--id-color-text);
  min-width: 2em;
  display: flex; align-items: center; justify-content: center;
}
`