import React, { useState } from 'react'
import { useCachedScript, usePageSettings, usePathState } from '../lib/hooks_ext'
import url from '../lib/url'
import styled from 'styled-components'
import { A, InfoBody, InfoStyles } from '../components/Info'
import api, { auth } from '../lib/api'
import { copy } from '../lib/copy'
import { useCached, useF, useI, useM, useR, useS, useScript, useStyle } from '../lib/hooks'
import { store } from '../lib/store'
import { JSX } from '../lib/types'
import { Q, S, defer, isMobile, is_mobile, keys, list, merge, node, pipe, strToStyle, toStyle } from '../lib/util'
import { Dangerous, dangerous } from 'src/components/individual/Dangerous'
import css from 'src/lib/css'
import { use_sponsor_slots } from 'src/components/individual/sponsors'

const SUPPORTER_SCROLL_MS = 375
const COFFEE_GRADIENT = 'linear-gradient(15deg, #414040, #b46d43) fixed'

export default () => {
  usePageSettings({
    // background: 'linear-gradient(15deg, #aa8e7e, #ffcd90) fixed', 

    // background: 'linear-gradient(15deg, #414040, #b46d43) fixed;',
    // background: COFFEE_GRADIENT,
    // text_color: '#333333',

    // background: '#000', text_color: '#fff',
    // expand: true,
    background: '#222', text_color: '#eee',

    hideLogin: true,
    title: '(tip jar)',
    expand: true,
  })

  // --background: linear-gradient(15deg, #826863, #deaf76);
  // --background: linear-gradient(15deg, #aa8e7e, #ffcd90);
  // background-size: 200% 200%;
  // animation: coffee-animate 3s ease infinite;
  // @keyframes coffee-animate {
  //   0% { background-position: 0% 0% }
  //   50% { background-position: 100% 100% }
  //   100% { background-position: 0% 0% }
  // }
  useStyle(`
  :root {
    --coffee-blend-mode: unset;
    --coffee-filter: invert(1) grayscale(1) brightness(1.5);

    --coffee-blend-mode: multiply;
    --coffee-filter: contrast(1.25);
  }
  #index::after {
    background: linear-gradient(#f201 0 0), linear-gradient(calc(15deg + 0deg), #ff5f2d88, #2b0600), linear-gradient(15deg, #cb0200, #5e2314, #5e2314, #ac4103, #ac4103, #410907, #410907, #63392a) !important;
    // animation: coffee-animate 5s ease infinite;
    background-size: 105%;

    // background: linear-gradient(15deg, #414040f8, #b46d43aa) fixed !important;
  }
  @keyframes coffee-animate {
    0% { transform: rotate(0deg); scale: 105% }
    50% { transform: rotate(3deg); filter: brightness(1.1); scale: 105% }
    100% { transform: rotate(0deg); scale: 105% }
  }
  `) // #6e534e

  const [method, setMethod] = store.use('coffee-method', { default: 'default' })
  const [_method, _setMethod] = usePathState({
    to: x => x.replace(/-?default/, ''),
    from: x => x === 'monthly' ? x + '-default' : x,
  })
  let changed = false
  useI(_method, () => {
    if (_method && _method !== method) {
      setMethod(_method)
      changed = true
      location.reload()
    }
  })
  useI(method, () => {
    if (method && !changed) {
      _setMethod(method)
    }
  })

  // const [crypto, setCrypto] = store.use('coffee-crypto', { default: 'bitcoin' })
  const [crypto, setCrypto] = useState(undefined)

  const cryptoClickTimeout = useR()
  const onCryptoClick = ([name, address, domain, symbol]) => e => {
    e.preventDefault()
    e.stopPropagation()
    clearTimeout(cryptoClickTimeout.current)
    setCrypto([name, address, domain, symbol])
    const query = '#hint'
    copy(address,
      document.querySelector(query), undefined, `COPIED ${name.toUpperCase()} ADDRESS`)
  }

  // repeat supports up to 250 to fill page
  const [supporters, setSupporters] = useState([])
  const [cost]: any = useCached('cost/month', () => api.get('cost/month'))
  useM(cost, () => {
    if (!cost) return []
    console.debug('COST', cost)
    const repeated = cost.supporters.slice()
    while (repeated.length < 250) repeated.push(...repeated)
    setSupporters(repeated)
    // return repeated
    // const list = ['test', 'some other name', ...range(randi(100) + 100).map(i => randAlphanum(randi(12) + 3))]
    // const repeated = list
    // while (repeated.length < 200) repeated.push(...list.slice())
    // return repeated
  })
  const [split, setSplit] = useState(false)
  // useInterval(() => {
  //   if (supporters?.length < 2) return
  //   let last = supporters.pop()
  //   if (!last.length) return setSplit(false) // extra pause at end of word
  //   let first = supporters.shift()

  //   // we want to move a letter from the end of the last name to the beginning of the first

  //   const moveLetter = last.slice(-1)
  //   last = last.slice(0, -1)
  //   if (split) {
  //     // if already split, these are part of the same name
  //     first = moveLetter + first
  //     supporters.unshift(first)
  //     supporters.push(last)
  //     // if (last.length) {
  //     //   supporters.push(last)
  //     // } else {
  //     //   setSplit(false)
  //     // }
  //   } else {
  //     // otherwise, start a new name at the front
  //     supporters.unshift(first)
  //     supporters.unshift(moveLetter)
  //     setSplit(true)
  //     supporters.push(last)
  //   }

  //   setSupporters(supporters.slice())

  //   // console.debug('ROTATE')
  //   // setSupporters([ ...supporters.slice(1), supporters[0] ])
  // }, SUPPORTER_SCROLL_MS)

  // const methods = ['default', 'stripe', 'crypto', 'cashapp', 'venmo', 'ko-fi', 'buymeacoffee', 'github']
  // const monthly = ['stripe', 'ko-fi', 'buymeacoffee', 'github'].map(x => 'monthly-'+x)
  const methods = [
    'default', 
    'venmo', 
    'cashapp', 
    'crypto', 
    'ko-fi', 
    'buymeacoffee', 
    'github',
  ]
  const monthly = ['default', 'ko-fi', 'buymeacoffee', 'github'].filter(x => methods.includes(x)).map(x => 'monthly-'+x)
  const wishlist = ['wishlist']
  const methodToDisplay = x => {
    const y = x.replace('monthly-','').replace('wishlist-','')
    return ({
      // 'monthly-stripe': 'bank/card',
      'monthly-default': 'default',
    }[x] || {
      github: 'GitHub',
      stripe: 'bank',
      cashapp: 'Cash App',
      venmo: 'Venmo',
      'ko-fi': 'Ko-fi',
      // buymeacoffee: 'Apple/Google',
      buymeacoffee: 'BMC',
    }[y] || y)
  }
  const github = (label, href, qr_filename) => 
  dark(href, `<img src=/raw/coffee/${qr_filename} />`, label, 'TAP/SCAN TO OPEN GITHUB SPONSORS') 
  || <p className='payment' key={0}>
    <div dangerouslySetInnerHTML={{ __html: `
    <div class='inner' style='
      background: linear-gradient(#24292f 30%, #fff 30%);
    '>
      <a href='${href}' target='_blank' style='
        color: white;
        padding: 1rem;
      '>${label}</a>

      <a href='${href}' target='_blank'
      class='qr' style='
        border-radius: 2.2em;
        overflow: hidden;
        // padding: 1.8em;
        box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
        // background: #24292f;
        // background: #eee;
        background: #fff;
        // scale: .7;
        height: auto;
        width: 80%;
        
        display: flex;
        flex-direction: column;
        position: relative;
      '>
        <img src='/raw/coffee/${qr_filename}' style='
          width: 100%;
          object-fit: contain;
          border-radius: 2.2em;
        '/>
        <img src='/raw/coffee/github-logo.png' style='
          width: 100%;
          object-fit: contain;
          padding: 1em;
          margin-top: -3em;
          height: 8em;
        '/>
      </a>

      <br/>
      <iframe
      class="button"
      src="https://github.com/sponsors/cfreshman/button"
      title="Sponsor cfreshman"
      style="
      border:0;
      border-radius:6px;
      filter: invert(1);
      height: 32px;
      width: 114px;
      "></iframe>

      <br/>
      <p>TAP/SCAN TO OPEN GITHUB SPONSORS</p>
      
      <!-- <img src='/raw/coffee/github-mark.svg' style='
        width: 100%;
        object-fit: contain;
        padding: 1em;
        height: 8em;
      '/> -->

    </div>` }} />
  </p>
  const stripe = (label, href, qr_filename) => <p className='payment' key={0}>
    <div dangerouslySetInnerHTML={{ __html: `
    <div class='inner' style='
      background: linear-gradient(#111 30%, #fff 30%);
    '>
      <a href='${href}' target='_blank' style='
        color: white;
        padding: 1rem;
      '>${label}</a>

      <a href='${href}' target='_blank'
      class='qr' style='
        border-radius: 2.2em;
        overflow: hidden;
        // padding: 1.8em;
        box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
        // background: white;
        // scale: .7;
        height: auto;
        width: 80%;
        
        display: flex;
        position: relative;
      '>
        <img src='/raw/coffee/${qr_filename}' style='
          width: 100%;
          object-fit: contain;
        '/>

        <div style='
        position: absolute;
        bottom: .5em;
        width: 100%;
        height: 60px;
        background-color: white;
        -webkit-mask: url(/raw/coffee/stripe-logo.svg) no-repeat center;
        '></div>
      </a>

      <br/>
      <p>TAP/SCAN TO OPEN</p>

    </div>` }} />
  </p>

  const buymeacoffee = 
  <p className='payment' key={0}>
    {/* <span>card / Google Pay</span> */}
    <div dangerouslySetInnerHTML={{ __html: `
    <iframe
    title="Buy Me a Coffee"
    style='background: white'
    src="https://www.buymeacoffee.com/widget/page/cyrusfreshman?description=Support%20me%20on%20Buy%20me%20a%20coffee!&amp;color=%2340DCA5"></iframe>` }} />
    {/* <div dangerouslySetInnerHTML={{ __html: `
    <iframe title="Buy Me a Coffee" style="position: fixed; margin: 0px; border: 0px; right: 18px; bottom: 98px; height: calc(100% - 140px); opacity: 1; width: calc(100% - 38px); max-width: 350px; border-radius: 10px; box-shadow: rgba(13, 12, 34, 0.1) -6px 0px 30px; background: url(&quot;https://cdn.buymeacoffee.com/assets/img/widget/loader.svg&quot;) center center / 64px no-repeat rgb(255, 255, 255); z-index: 999999; transition: all 0.4s ease 0s; max-height: 620px;" src="https://www.buymeacoffee.com/widget/page/cyrusfreshman?description=Support%20me%20on%20Buy%20me%20a%20coffee!&amp;color=%2340DCA5"></iframe>` }} /> */}
    {/* <div dangerouslySetInnerHTML={{ __html: `
    <script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="cyrusfreshman" data-description="Support me on Buy me a coffee!" data-message="" data-color="#40DCA5" data-position="Right" data-x_margin="18" data-y_margin="18"></script>` }} /> */}
  </p>

  useCachedScript(`https://js.stripe.com/v3/buy-button.js`)

  const CRYPTO_OPTIONS = {
    bitcoin: [
      '/bitcoin',
      `<img src="/raw/coffee/crypto/bitcoin-icon.png" />`,
      'btc',
      'bc1qaswdv0rq85uaat6n4k6vyxnl8ju2qu52wrzatw',
    ],
    ethereum: [
      '/ethereum',
      `<img src="/raw/coffee/crypto/ethereum-icon.png" />`,
      'eth',
      '0xb5e041ac05F0c716deEb7437d15211c7F5407F91',
    ],
    tezos: [
      '/tezos',
      `<img src="/raw/coffee/crypto/tezos-icon.png" />`,
      'freshman.tez',
      'tz1g9SC3syBE6ssonwzTbE2T99KMLuKMtcFq',
    ],
  }
  const crypto_options = keys(CRYPTO_OPTIONS)
  const selected_crypto = useM(location.hash, () => crypto_options.find(x => x === location.hash.slice(1)))
  const crypto_info = CRYPTO_OPTIONS[selected_crypto]

  const GLASS = true
  const PERCENT_FILL = 40

  const dark = (href, content, label='', action='', nvm=true) =>
  typeof(content) !== 'string'
  ?
  <div className='center-column'
  style={S(`
  width: 100%;
  ${nvm ? '' : 'mix-blend-mode: var(--coffee-blend-mode); filter: var(--coffee-filter);'}
  border-radius: 1.1em;
  position: relative;
  height: fit-content;
  `)}>
    {content}
  </div>
  :
  <Dangerous className='payment middle-column' style={S(`
  // background: linear-gradient(-90deg, #eefd, #eef6 20% 85%, #eefb);
  align-self: center;
  margin: 0 0 1em;
  border-radius: 1em !important;
  border: 1px solid #000c;
  box-shadow: inset -.5px -1.5px 0 1.5px #e4e4ff;
  padding: 4em 0 1em;
  border-top: 2em solid #000;
  border-top-left-radius: 2px; border-top-right-radius: 2px;
  border-top: 0;
  background-clip: border-box;
  // border-top-left-radius: .5em; border-top-right-radius: .5em;
  // border-top-left-radius: 1px; border-top-right-radius: 1px;
  border-top-left-radius: .25em; border-top-right-radius: .25em;
  // border-top-left-radius: .125em; border-top-right-radius: .125em;

  position: relative; z-index: 1; overflow: hidden;
  background: var(--id-color);
  // background: linear-gradient(#fff4 0 0), ${COFFEE_GRADIENT};
  background: linear-gradient(#fff1 0 0), var(--id-color);
  min-height: 28em; max-width: 22.5em; width: 22.5em;
  flex-grow: 0; height: 40em;
  max-height: calc(100% - ${is_mobile ? '2em' : 0});
  aspect-ratio: 1 / 1.5;
  margin: auto;
  padding-right: 2px;

  height: 20em; width: 20em;

  ${GLASS ? '' : 'border: 0; box-shadow: none;'}
  `)} html={`
    <div class="center-column" style="
    ${nvm ? '' : 'mix-blend-mode: var(--coffee-blend-mode); filter: var(--coffee-filter);'}
    ">
      ${label ? `
      <a href='${href}' target='_blank' style='
      font-size: .8em;
      color: #fff;
      background: #080808;
      border-radius: 2px; padding: 0 2px;
      border-bottom-left-radius: 0; border-bottom-right-radius: 0;
      '>${label}</a>
      `:''}
      <a class='center-column'
      href='${href}' target='_blank'
      style='
        border-radius: 1.1em;
        position: relative;
        height: fit-content;
      '>
        ${content.replace('img', `img style="
        border-radius: 6px;
        filter: contrast(3);
        "`)}
      </a>
      ${''&&action ? `
      <br/>
      ${''&&action}
      `:''}
    </div>
    ${GLASS ? `
    <div style="
    position: absolute; top: 0; left: 0; height: 100%; width: 100%;
    background: linear-gradient(-5deg, #6e796f 7em, #fff0 0), linear-gradient(6deg, #7e837b 8em, #fff0 0);
    background: linear-gradient(-5deg, #6e796f ${PERCENT_FILL * .75 + 15 - 2}%, #fff0 0), linear-gradient(6deg, #7e837b ${PERCENT_FILL * .75 + 15}%, #fff0 0);
    opacity: .67;
    z-index: -1;
    pointer-events: none;
    ">
    </div>
    <div style="
    position: absolute; top: 0; left: 0; height: 100%; width: 100%;
    background: linear-gradient(-90deg, #e4e4ffdd, #e4e4ffcc 2.5%, #e4e4ff44 20% 85%, #e4e4ff99 95%, #e4e4ffee);
    border-top: 1em solid #e4e4ff33;
    z-index: -1;
    pointer-events: none;
    "></div>
    </div>
    <div style="
    opacity: .033;
    position: absolute; top: 0; left: 0; height: 100%; width: 100%;
    // background: repeating-linear-gradient(-90deg, #e4e4ffcc 0px .25em, #e4e4ff00 .25em .5em);
    z-index: -1;
    pointer-events: none;
    "></div>
    <div style="
    position: absolute; top: 0; left: 0; display: block;
    color: #fff;
    z-index: 1;
    mix-blend-mode: unset; filter: unset;
    font-size: .67em; line-height: 1; padding: .5em 1em;
    letter-spacing: .67em; padding-left: -20%;
    color: #fff;
    opacity: .33;
    overflow: hidden;
    white-space: pre;

    font-size: 1em; line-height: 1; padding: 0; padding-left: .25em;
    color: #e4e4ffbb;
    text-transform: uppercase;
    display: flex; justify-content: flex-end; align-items: flex-end;
    height: 100%; width: 100%;
    pointer-events: none;
    ">${'tip jar  '.repeat(1)}</div>`:''}
  `} />

  useF(() => Object.assign(window, { copy, defer, Q }))

  const renderedMethods = {
    // default: <p className='payment' key={0}>
    //   {/* <span>card / Google Pay</span> */}
    //   <div dangerouslySetInnerHTML={{ __html: `
    //   <iframe
    //   title="Buy Me a Coffee"
    //   style='background: white'
    //   src="https://www.buymeacoffee.com/widget/page/cyrusfreshman?description=Support%20me%20on%20Buy%20me%20a%20coffee!&amp;color=%2340DCA5"></iframe>` }} />
    //   {/* <div dangerouslySetInnerHTML={{ __html: `
    //   <iframe title="Buy Me a Coffee" style="position: fixed; margin: 0px; border: 0px; right: 18px; bottom: 98px; height: calc(100% - 140px); opacity: 1; width: calc(100% - 38px); max-width: 350px; border-radius: 10px; box-shadow: rgba(13, 12, 34, 0.1) -6px 0px 30px; background: url(&quot;https://cdn.buymeacoffee.com/assets/img/widget/loader.svg&quot;) center center / 64px no-repeat rgb(255, 255, 255); z-index: 999999; transition: all 0.4s ease 0s; max-height: 620px;" src="https://www.buymeacoffee.com/widget/page/cyrusfreshman?description=Support%20me%20on%20Buy%20me%20a%20coffee!&amp;color=%2340DCA5"></iframe>` }} /> */}
    //   {/* <div dangerouslySetInnerHTML={{ __html: `
    //   <script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="cyrusfreshman" data-description="Support me on Buy me a coffee!" data-message="" data-color="#40DCA5" data-position="Right" data-x_margin="18" data-y_margin="18"></script>` }} /> */}
    // </p>,
    // default: stripe('donation link', 'https://buy.stripe.com/aEU6pR1c17QWbTO9AB', 'stripe-once-gradient.png'),
    // default: stripe('donation link', 'https://donate.stripe.com/3cs4hJbQFc7c5vq8wG', 'stripe-once-gradient.png'),
//     default: dark(`https://donate.stripe.com/8wM7tVg6V8V0bTOcN0`, `
// <stripe-buy-button
//   buy-button-id="buy_btn_1NazzPHQL6OVj4R1ghhl0BAi"
//   publishable-key="pk_live_B1kkIywcVRgdddU64hB2s6mW001AZzDbgm"
// >
// </stripe-buy-button>`),
    default: dark(`https://donate.stripe.com/fZe8xZ3k93AG9LG8wL`, `
<!-- <div style="border: 2px solid currentcolor; padding: .5em; border-radius: .25em; text-align: center">Stripe has paused my account - working on getting that back</div> -->
<stripe-buy-button
  buy-button-id="buy_btn_1PLVvgHQL6OVj4R1BwFigRDa"
  publishable-key="pk_live_B1kkIywcVRgdddU64hB2s6mW001AZzDbgm"
>
</stripe-buy-button>
    `, '', '', true),
    // github: github('buy me a coffee ($5)', 'https://github.com/login?return_to=%2Fsponsors%2Fcfreshman%2Fsponsorships%3Ftier_id%3D258891', 'github-once.png'),
    // stripe: stripe('buy me a coffee ($5)', 'https://buy.stripe.com/5kA15x1c1efk2jebIL', 'stripe-once-gradient.png'),
    // github: github('github.com/sponsors/cfreshman', 'https://github.com/login?return_to=%2Fsponsors%2Fcfreshman%2Fsponsorships%3Ftier_id%3D258891', 'github-once.png'),
    github: dark(
      `https://github.com/sponsors/cfreshman/sponsorships?sponsor=cfreshman&tier_id=403150&privacy_level=private`,
      `<img src='/raw/coffee/github/tip-icon.png' />`,
      'github @cfreshman',
      'TAP/SCAN TO OPEN GITHUB SPONSORS'),
    // stripe: stripe('donation link', 'https://buy.stripe.com/aEU6pR1c17QWbTO9AB', 'stripe-once-gradient.png'),
    crypto: (x => x && dark(x[0], (() => {
      // defer(() => {
      //   copy(`${x[3]}`, document.querySelector(`#coffee-crypto-${x[3]}`))
      // }, 250)
      return x[1].replace('img', 'img style="mix-blend-mode:multiply"') + `
      <br/>
      <a
      onclick="copy('${x[3]}', event.currentTarget.querySelector('span'))" 
      style="
        padding: 1rem;
        border-radius: 10em;
        overflow: hidden;
        box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
        width: 256px;
        margin-bottom: 0.5rem;
        padding: 0.5rem 1rem;
        text-decoration: none;
        background: #000; color: #fff;
        display: flex;
        white-space: nowrap;
        // mix-blend-mode: var(--coffee-blend-mode); filter: var(--coffee-filter);
      ">
        <span id=coffee-crypto-${selected_crypto}>${x[2]}</span>
        <span style="
          opacity: .4;
          margin-left: 0.5em;
          float: right;
          overflow: hidden;
          text-overflow: ellipsis;
          text-decoration: none;
          width: 0; flex-grow: 1;
        ">${x[3]}</span>
      </a>
      `
    })(), `
    <a style="
    padding: .5em;
    width: 256px;
    border-radius: 10em;
    text-decoration: none;
    background: #000; color: #fff;
    // mix-blend-mode: var(--coffee-blend-mode); filter: var(--coffee-filter);
    text-align: center;
    "
    href=#>back</a>
    <br/>`, ''))(crypto_info) || dark(
      '',
      `<div class="center-column">${
        crypto_options
        .map(name =>
        `
        <a href=#${name} onclick="
        defer(() => {
          Q('#coffee-crypto-${name}').click()
        })
        " style="
          padding: 1rem;
          border-radius: 10em;
          overflow: hidden;
          box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
          width: 256px;
          margin-bottom: 0.5rem;
          padding: 0.5rem 1rem;
          text-decoration: none;
          background: #000; color: #fff;
          display: flex;
          white-space: nowrap;
          // mix-blend-mode: var(--coffee-blend-mode); filter: var(--coffee-filter);
        ">
            <span>${name}</span>
            <span style="
              opacity: .4;
              margin-left: 0.5em;
              float: right;
              overflow: hidden;
              text-overflow: ellipsis;
              text-decoration: none;
              width: 0; flex-grow: 1;
            ">${CRYPTO_OPTIONS[name][3]}</span>
          </a>`)
        .join('\n')
      }</div>`,
      '',
      '',
    ) || <p className='payment' key={0}>
      <div>
        <div className='inner' style={strToStyle(`
        background: linear-gradient(black 30%, #fff 30%);
        `)}>
          <a
          {...(crypto ? { href: crypto[1] } : {})}
          onClickCapture={crypto ? onCryptoClick(crypto) : undefined}
          style={strToStyle(`
          padding: 1rem;
          color: white;
          `)}>{crypto ? crypto[0] + (crypto[2] ? ' '+crypto[2] : '') : 'select a network'}</a>

          <a className='qr'
          onClick={crypto ? onCryptoClick(crypto) : undefined}
          style={strToStyle(`
          border-radius: 2.2em;
          overflow: hidden;
          padding: 2em;
          box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
          background: white;
          height: auto;
          width: 80%;
          aspect-ratio: 1/1;
          max-height: 69vw;
          position: relative;

          display: flex;
          align-items: center;
          justify-content: center;

          ${crypto ? '' : `
          // background: linear-gradient(15deg, #c5fdff, #ffc5fc 80vh) fixed;
          `}
          `)}>
            {crypto ? '' : <p style={strToStyle(`
              position: absolute;
              opacity: .5;
            `)}>(select network)</p>}
            <img src={crypto ? `/raw/coffee/${crypto[0]}.png` : ''} style={strToStyle(`
            width: 100%;
            object-fit: contain;
            `)}/>
          </a>

          <br/>
          {[
            ['bitcoin', 'bc1qaswdv0rq85uaat6n4k6vyxnl8ju2qu52wrzatw', '', '₿'],
            ['ethereum', '0xb5e041ac05F0c716deEb7437d15211c7F5407F91', '', 'Ξ'],
            ['tezos', 'tz1g9SC3syBE6ssonwzTbE2T99KMLuKMtcFq', 'freshman.tez', 'Ꜩ'],
          ]
          // .filter(e => !crypto || crypto[0] !== e[0])
          .map(([name, address, domain, symbol]) => {
            const selected = crypto && crypto[0] === name
            return <a key={name} className={`crypto-option crypto-option-${name}`}
            onClick={onCryptoClick([name, address, domain, symbol])}
            style={strToStyle(`
              padding: 1rem;
              border-radius: .25rem;
              background: white;
              overflow: hidden;
              box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
              // width: 70%;
              // width: 17rem;
              // width: calc(100% - 2rem);
              width: 217px;
              margin-bottom: 0.5rem;
              padding: 0.5rem;
              text-decoration: none;
              ${!selected ? `
              background: gold;
              background: linear-gradient(15deg, #c5fdff, #ffc5fc 80vh) fixed;
              color: black;
              ` : `
              background: black;
              color: white;
              `}
              display: flex;
              white-space: nowrap;
            `)}>
              <span className='name' style={strToStyle(`
                // flex-grow: 1;
                // text-align: center;
              `)}>{name}</span>
              <span style={strToStyle(`
                opacity: ${selected ? '.4' : '.2'};
                margin-left: 0.5em;
                float: right;
                overflow: hidden;
                text-overflow: ellipsis;
                text-decoration: none;
                width: 0; flex-grow: 1;
              `)}>{address}</span>
          </a>
          })}

          <br/>
          <p id='hint'>TAP TO COPY/VIEW ADDRESS</p>
          {crypto ? <p>{crypto[1]}</p> : ''}

        </div>
      </div>
    </p>,
    'cashapp': dark(
      `https://cash.app/$cyrusfreshman/5`, `
      <img src='/raw/coffee/cashapp/tip-icon.png' />
      `,
      `cash.app/$cyrusfreshman`,
      'TAP/SCAN TO OPEN CASH APP',
    ) || <p className='payment' key={0}>
      {/* <div dangerouslySetInnerHTML={{ __html: `
      <iframe
      src='https://cash.app/$cyrusfreshman/5'
      title='cash.app'></iframe>` }} /> */}
      <div dangerouslySetInnerHTML={{ __html: `
      <div class='inner' style='
      background: linear-gradient(rgb(0, 200, 83) 0%, rgb(10, 190, 73) 30%, #fff 30%);
      '>
        <a href='https://cash.app/$cyrusfreshman/5' target='_blank' style='
        color: white;
        padding: 1rem;
        '>cash.app/$cyrusfreshman</a>

        <a href='https://cash.app/$cyrusfreshman/5' target='_blank' class='qr' style='
        border-radius: 2.2em;
        overflow: hidden;
        padding: 2em;
        box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
        background: white;
        // scale: .7;
        height: auto;
        width: 80%;
        aspect-ratio: 1/1;
        max-height: 69vw;
        '>
          <img src='/raw/coffee/cashapp.png' style='
          width: 100%;
          object-fit: contain;
          '/>
        </a>

        <br/>
        <p>TAP/SCAN TO OPEN CASH APP</p>

      </div>` }} />
    </p>,
    venmo: dark(
      `https://account.venmo.com/pay?amount=5&note=%2Fu%2Fsername%20(for%20supporter%20badge)%3A%0A&recipients=cyrusfreshman&txn=pay`,
      `<img src='/raw/coffee/venmo/tip-icon.png' />`,
      `venmo.com/cyrusfreshman`,
      'TAP/SCAN TO OPEN VENMO',
    ) || dark('', `
      <a href='https://account.venmo.com/pay?amount=5&note=%2Fu%2Fsername%20(for%20supporter%20badge)%3A%0A&recipients=cyrusfreshman&txn=pay' target='_blank' style='
        color: white;
        padding: 1rem;
      '>venmo /u/cyrusfreshman $5</a>

      <br/>
      <p>TAP/SCAN TO OPEN VENMO</p>

      </div>`),
    'ko-fi': <p className='payment' key={0}>
      <div dangerouslySetInnerHTML={{ __html: `
      <iframe
      title="Ko-fi for freshman_dev"
      style='background: white'
      src='https://ko-fi.com/freshman_dev/?hidefeed=true&widget=true&embed=true'
      title='ko-fi'></iframe>` }} />
    </p>,
    buymeacoffee,
    // buymeacoffee: <p className='payment' key={0}>
    //   <div dangerouslySetInnerHTML={{ __html: `
    //   <div class='inner' style='
    //   background: linear-gradient(#fbdd4b 30%, #fff 30%);
    //   '>
    //     <a href='https://buymeacoffee.com/cyrusfreshman' target='_blank' style='
    //     padding: 1rem;
    //     '>buymeacoffee.com/cyrusfreshman</a>

    //     <a href='https://buymeacoffee.com/cyrusfreshman' target='_blank' class='qr' style='
    //     border-radius: 2.2em;
    //     overflow: hidden;
    //     padding: .4em;
    //     box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
    //     background: white;
    //     height: auto;
    //     width: 80%;
    //     aspect-ratio: 1/1;
    //     max-height: 69vw;
    //     '>
    //       <img src='/raw/coffee/bmc_qr.png' style='
    //       width: 100%;
    //       object-fit: contain;
    //       '/>
    //     </a>

    //     <br/>
    //     <a class='img-link'
    //     href="https://buymeacoffee.com/cyrusfreshman" target="_blank"
    //     style='
    //       border-radius: .85em;
    //       box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
    //     ' >
    //       <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" >
    //     </a>

    //     <br/>
    //     <p>TAP/SCAN TO OPEN BUYMEACOFFEE</p>

    //   </div>` }} />
    // </p>,
    // 'monthly-github': github('$1/month', 'https://github.com/sponsors/cfreshman', 'github.png'),
    // 'monthly-stripe': stripe('$1/month', 'https://buy.stripe.com/7sIcOff2RgnscXSaEG', 'stripe-gradient.png'),
    // 'monthly-github': github('github.com/sponsors/cfreshman', 'https://github.com/sponsors/cfreshman', 'github.png'),
    'monthly-github': dark(
      `https://github.com/sponsors/cfreshman`,
      `<img src='/raw/coffee/github/subscribe-icon.png' />`,
      'github @cfreshman',
      'TAP/SCAN TO OPEN GITHUB SPONSORS'),
    // 'monthly-default': stripe('monthly donation link', 'https://buy.stripe.com/7sIcOff2RgnscXSaEG', 'stripe-gradient.png'),
//     'monthly-default': dark(`https://buy.stripe.com/7sIcOff2RgnscXSaEG`, `
// <stripe-buy-button
//   buy-button-id="buy_btn_1NU9aPHQL6OVj4R1ReH8fgCC"
//   publishable-key="pk_live_B1kkIywcVRgdddU64hB2s6mW001AZzDbgm"
// >
// </stripe-buy-button>`),
//     'monthly-default': dark(`https://buy.stripe.com/eVa15xdYN6MS6zu5kA`, `
// <stripe-buy-button
//   buy-button-id="buy_btn_1PLW0ZHQL6OVj4R1DuKq3S3V"
//   publishable-key="pk_live_B1kkIywcVRgdddU64hB2s6mW001AZzDbgm"
// >
// </stripe-buy-button>`, '', '', true),
    'monthly-default': dark(`https://buy.stripe.com/cN26pRg6Vgnsf60eVb`, `
<!-- <div style="border: 2px solid currentcolor; padding: .5em; border-radius: .25em; text-align: center">Stripe has paused my account - working on getting that back</div> -->
<stripe-buy-button
  buy-button-id="buy_btn_1PZkiYHQL6OVj4R1EUohJ1Is"
  publishable-key="pk_live_B1kkIywcVRgdddU64hB2s6mW001AZzDbgm"
>
</stripe-buy-button>`, '', '', true),

    'monthly-ko-fi': dark(
      // `https://ko-fi.com/freshman_dev/tiers`,
      'https://ko-fi.com/summary/c60e5cd8-995c-420b-a9b5-1d73cc2fef5b',
      `<img src='/raw/coffee/kofi/subscribe-icon.png' />`,
      `ko-fi.com/freshman_dev`,
      // 'https://ko-fi.com/summary/c60e5cd8-995c-420b-a9b5-1d73cc2fef5b',
      'TAP/SCAN TO OPEN KO-FI',
    ) || <p className='payment' key={0}>
      <div dangerouslySetInnerHTML={{ __html: `
      <div class='inner' style='
      background: linear-gradient(#55c2fa 30%, #fff 30%);
      '>
        <a href='https://ko-fi.com/freshman_dev/tiers' target='_blank' style='
        padding: 1rem;
        color: white;
        '>ko-fi.com/freshman_dev</a>

        <a href='https://ko-fi.com/freshman_dev/tiers' target='_blank' class='qr' style='
        border-radius: 2.2em;
        overflow: hidden;
        padding: .4em;
        box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
        background: white;
        height: auto;
        width: 80%;
        aspect-ratio: 1/1;
        max-height: 69vw;
        '>
          <img src='/raw/coffee/kofi.png' style='
          width: 100%;
          object-fit: contain;
          '/>
        </a>

        <br/>
        <a class='img-link'
        href='https://ko-fi.com/freshman_dev/tiers' target='_blank'
        style='
          border-radius: 10px;
          box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
        '>
          <img src='/raw/coffee/kofi-btn.png' alt='Support me on Ko-fi' style='
            width: 217px !important;
          '/>
        </a>

        <br/>
        <p>TAP/SCAN TO VIEW MONTHLY TIERS</p>

      </div>` }} />
    </p>,
    'monthly-buymeacoffee': dark(
      `https://buymeacoffee.com/cyrusfreshman/membership`,
      `<img src='/raw/coffee/bmc/subscribe-icon.png' />`,
      `buymeacoffee.com/cyrusfreshman`,
      'TAP/SCAN TO OPEN BUYMEACOFFEE',
    ) || <p className='payment' key={0}>
      <div dangerouslySetInnerHTML={{ __html: `
      <div class='inner' style='
      background: linear-gradient(#fbdd4b 30%, #fff 30%);
      '>
        <a href='https://buymeacoffee.com/cyrusfreshman/membership' target='_blank' style='
        padding: 1rem;
        '>buymeacoffee.com/cyrusfreshman</a>

        <a href='https://buymeacoffee.com/cyrusfreshman/membership' target='_blank' class='qr' style='
        border-radius: 2.2em;
        overflow: hidden;
        padding: .2em;
        box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
        background: white;
        height: auto;
        width: 80%;
        aspect-ratio: 1/1;
        max-height: 69vw;
        '>
          <img src='/raw/coffee/bmc_mem.png' style='
          width: 100%;
          object-fit: contain;
          '/>
        </a>

        <br/>
        <a class='img-link'
        href="https://buymeacoffee.com/cyrusfreshman/membership" target="_blank"
        style='
          border-radius: .85em;
          box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
        ' >
          <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" >
        </a>

        <br/>
        <p>TAP/SCAN TO VIEW MONTHLY TIERS</p>

      </div>` }} />
    </p>,
  }

  const sponsor_slots = use_sponsor_slots()

  return <Style>
    <InfoBody>
      {/* <p>buy me a coffee if you'd like :-)</p> */}
      <div id='coffee'>
        {/* <p><b onClick={e => setMethod('default')}>(tip jar)</b></p> */}
        <p id='method'>
          <span onClick={e => setMethod('default')}>$5:&nbsp;</span>
          {methods
          .map((x,i) => <a key={x} onClick={e => setMethod(x)} style={{
            textDecoration: x === method ? 'underline' : 'none',
            opacity: x !== method && i >= 1 ? .5 : 1,
          }}>{methodToDisplay(x)}</a>)
          .map((l, i) => i > 0 ? <><span style={{ opacity: .075 }}><span style={{fontSize:'.33em'}}> </span>•<span style={{fontSize:'.33em'}}> </span></span>{l}</> : l)}
          {/* <a onClick={e => setMethod(0)}>card / Google Pay</a> / <a onClick={e => setMethod(1)}>Paypal</a> */}
        </p>
        <p id='monthly'>
          <span onClick={e => setMethod('monthly-default')}>$2/mo:&nbsp;</span>
          {/* monthly:  */}
          {monthly
          .map((x, i) => <a key={x} onClick={e => setMethod(x)} style={{
            textDecoration: x === method ? 'underline' : 'none',
            opacity: x !== method && i >= 1 ? .5 : 1,
          }}>{methodToDisplay(x)}</a>)
          .map((l, i) => i > 0 ? <><span style={{ opacity: .075 }}><span style={{fontSize:'.33em'}}> </span>•<span style={{fontSize:'.33em'}}> </span></span>{l}</> : l)}
          {/* monthly: {[
            ['card/Apple/Google', 'https://www.buymeacoffee.com/cyrusfreshman/membership'],
            ['PayPal', 'https://ko-fi.com/freshman_dev/tiers']
          ]
          .map(([k, href], i) => <a key={i} href={href} target='_blank' rel='noreferrer'>{k}</a>)
          .map((l, i) => i > 0 ? <><span style={{ opacity: .15 }}>—</span>{l}</> : l)} */}
          {/* <a onClick={e => setMethod(0)}>card / Google Pay</a> / <a onClick={e => setMethod(1)}>Paypal</a> */}
        </p>
        <p>
          <span>→ {sponsor_slots?.taken||'?'}/{sponsor_slots?.total||'?'} slots taken (<A href='/donoboard' />)</span>
        </p>
        <br/>
        {/* <p><i><a onClick={() => setMethod(method < methods.length ? 2 : methods.length+1)} style={{textDecoration:'none'}}>bank</a> is the least wasteful, GitHub is nice for dev-cred™</i></p> */}
        <div id='payment-container'>

        <div id='supporters'>
            <div style={toStyle(`
              flex-basis: 100%;
              z-index: 1;
              `)}>
              <i>supporters</i>
              {/* &nbsp;
              <span><a href='#' onClick={e => {
                e.preventDefault()
                openPopup(close => <Style>
                  <InfoBody>
                    {cost.supporters.map((x,i) =>
                    <div className='supporter' key={i}>{x}</div>)}
                    <InfoButton onClick={close}>CLOSE</InfoButton>
                  </InfoBody>
                </Style>, `
                max-width: fit-content`)
              }}>open</a></span> */}
            </div>
            {supporters.map((x, i) => <span key={i} className='supporter'>{x}</span>)}
          </div>
          {renderedMethods[method]}
        </div>
      </div>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
user-select: none;

img {
  width: 256px;
}

.button {
  background: unset;
}
.body {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  // overflow: hidden;
  overflow-x: hidden;
  padding-bottom: 0;
  p {
    font-size: .75rem;
  }
  a {
    color: inherit;
  }
  a:hover {
    text-decoration: underline;
  }

  > p {
    margin-bottom: 1em;
  }

  // background: #8b704d;
  // background: #a68b62;
  // > p {
  //   // background: #d1a96e75;
  //   // background: #a68b62;
  //   // background: #8b704d;
  //   border-radius: 0.15em;
  //   padding: 0.15em 0.3em;
  //   color: #262626;
  //   color: #e5c89d;
  //   color: #f1dab7;
  //   color: #ffdaa0;
  //   width: fit-content;
  //   translate: -0.75em -0.5em;
  //   translate: 0 -0.5em;
  //   padding: 0;
  //   margin: -0.075em;
  // }

  #coffee {
    flex-grow: 1;
    // background: #f7f7f7;

    p {
      margin: 0;
    }

    #method, #monthly {
      max-width: 100%;
      display: flex;
      overflow: auto;
      white-space: pre;
      &::-webkit-scrollbar { display: none }
    }

    display: flex;
    flex-direction: column;
    // flex-direction: row;
    // background: #b59d7e;
    .payment {
      flex-grow: 1;
      // span {
      //   background: #fff3;
      //   border-radius: 0.15em;
      //   padding: 0.15em 0.3em;
      //   color: #464646;
      // }
    }

    flex-wrap: wrap;
    .payment > div {
      width: 100%;
      height: 100%;
      min-width: 20rem;
      min-height: 40rem;

      display: flex;
      justify-content: center;
      align-items: center;
    }
    iframe:not(.button), .inner {
      margin: 0;
      border: 0;
      width: 100%;
      height: 100%;

      display: block;
      // height: calc(100% - 140px);
      height: calc(100% - 40px);
      width: calc(100% - 20px);
      max-width: 350px; border-radius: 10px; box-shadow: rgba(13, 12, 34, 0.1) -6px 0px 30px; transition: all 0.4s ease 0s; max-height: 620px;
    }
    .inner {
      display: flex;
      flex-direction: column;
      // justify-content: center;
      align-items: center;

      .qr, .img-link, .crypto-option {
        border: 1px solid transparent;
        overflow: hidden;
        &:hover:not(:active) {
          // scale: 1.005;
          border-color: black !important;
        }
      }
      .qr {
        min-height: 12rem; 
      }
    }
  }
}


${isMobile ? `
.body {
  overflow-y: auto;
  .payment iframe:not(.button) {
    scale: .9;
  }
}
#supporters :first-child {
  display: none;
}
`:''}

#payment-container {
  position: relative;
  flex-grow: 1;
  display: flex;
}
#supporters {
  position: absolute;
  top: 0; left: 0;
  // height: 100%;
  width: 100%;

  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  padding: 1em 0;
  font-size: .8em;
  flex-wrap: wrap;

  color: #0001;
  display: none;
}

.supporter {
  margin: .25em;
  position: relative;
  color: #0001;
  // color: #0006;
  // color: #0001;
  // background: #0001;
  // background: #bfa287;
  // background: #bfa28744;
  background: #bfa28711;
  // background: #bfa28708;
  padding: 0 .5em;
  border-radius: 1em;
  // animation: slide ${SUPPORTER_SCROLL_MS}ms infinite linear;
  // @keyframes slide {
  //   0% { left: -1em }
  //   100% { left: 1em }
  // }
}
.supporter:first-of-type {
  background: none !important;
  // animation: fade-in ${SUPPORTER_SCROLL_MS}ms infinite linear;
  // @keyframes fade-in {
  //   0% { left: -1em; opacity: 0 }
  //   100% { left: 1em }
  // }
}
.supporter:last-child {
  background: none;
  // opacity: 0;
  // animation: fade-out ${SUPPORTER_SCROLL_MS}ms infinite linear;
  // @keyframes fade-out {
  //   0% { left: -1em; opacity: 1 }
  //   100% { left: 1em; }
  // }
}
`