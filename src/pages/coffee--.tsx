import React, { useState } from 'react'
import { usePathState } from '../lib/hooks_ext'
import url from '../lib/url'
import styled from 'styled-components'
import { InfoBody, InfoStyles } from '../components/Info'
import api from '../lib/api'
import { copy } from '../lib/copy'
import { useCached, useF, useI, useM, useR, useStyle } from '../lib/hooks'
import { store } from '../lib/store'
import { JSX } from '../lib/types'
import { isMobile, pipe, strToStyle, toStyle } from '../lib/util'

const SUPPORTER_SCROLL_MS = 375
export default () => {
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
    
  }
  #index::after {
    background: linear-gradient(#f201 0 0), linear-gradient(calc(15deg + 0deg), #ff5f2d88, #2b0600), linear-gradient(15deg, #cb0200, #5e2314, #5e2314, #ac4103, #ac4103, #410907, #410907, #63392a);
    // animation: coffee-animate 5s ease infinite;
    background-size: 105%;

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
    'crypto', 
    'cashapp', 
    'venmo', 
    'ko-fi', 
    'buymeacoffee', 
    'github',
  ]
  const monthly = ['default', 'ko-fi', 'buymeacoffee', 'github'].filter(x => methods.includes(x)).map(x => 'monthly-'+x)
  const methodToDisplay = x => {
    const y = x.replace('monthly-','')
    return ({
      // 'monthly-stripe': 'bank/card',
      'monthly-default': 'monthly',
    }[x] || {
      github: 'GitHub',
      stripe: 'bank',
      cashapp: 'cash.app',
      venmo: 'Venmo',
      'ko-fi': 'Ko-fi',
      // buymeacoffee: 'Apple/Google',
      buymeacoffee: 'BMC',
    }[y] || y)
  }
  const github = (label, href, qr_filename) => <p className='payment' key={0}>
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
    default: stripe('donation link', 'https://buy.stripe.com/aEU6pR1c17QWbTO9AB', 'stripe-once-gradient.png'),
    // github: github('buy me a coffee ($5)', 'https://github.com/login?return_to=%2Fsponsors%2Fcfreshman%2Fsponsorships%3Ftier_id%3D258891', 'github-once.png'),
    // stripe: stripe('buy me a coffee ($5)', 'https://buy.stripe.com/5kA15x1c1efk2jebIL', 'stripe-once-gradient.png'),
    github: github('github.com/sponsors/cfreshman', 'https://github.com/login?return_to=%2Fsponsors%2Fcfreshman%2Fsponsorships%3Ftier_id%3D258891', 'github-once.png'),
    // stripe: stripe('donation link', 'https://buy.stripe.com/aEU6pR1c17QWbTO9AB', 'stripe-once-gradient.png'),
    crypto: <p className='payment' key={0}>
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
    'cashapp': <p className='payment' key={0}>
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
    venmo: <p className='payment' key={0}>
      <div dangerouslySetInnerHTML={{ __html: `
      <div class='inner' style='
      background: linear-gradient(#0074DE 30%, #fff 30%);
      '>
      <a href='https://venmo.com/code?user_id=3662354550097393340&created=1667355052.838129&printed=1' target='_blank' style='
        color: white;
        padding: 1rem;
      '>venmo @freshman_dev</a>

      <a href='https://venmo.com/code?user_id=3662354550097393340&created=1667355052.838129&printed=1' target='_blank'
      class='qr' style='
        border-radius: 2.2em;
        overflow: hidden;
        padding: 1.8em;
        box-shadow: rgb(0 0 0 / 8%) 0px 4px 40px;
        background: white;
        // scale: .7;
        height: auto;
        width: 80%;
      '>
        <img src='/raw/coffee/venmo.jpg' style='
          width: 100%;
          object-fit: contain;
        '/>
      </a>

      <br/>
      <p>TAP/SCAN TO OPEN VENMO</p>

      </div>` }} />
    </p>,
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
    'monthly-github': github('github.com/sponsors/cfreshman', 'https://github.com/sponsors/cfreshman', 'github.png'),
    'monthly-default': stripe('monthly donation link', 'https://buy.stripe.com/7sIcOff2RgnscXSaEG', 'stripe-gradient.png'),
    'monthly-ko-fi': <p className='payment' key={0}>
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
    'monthly-buymeacoffee': <p className='payment' key={0}>
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

  return <Style>
    <InfoBody>
      {/* <p>buy me a coffee if you'd like :-)</p> */}
      <div id='coffee'>
        <p id='method'>
          {methods
          .map((x,i) => <a key={x} onClick={e => setMethod(x)} style={{
            textDecoration: x === method ? 'underline' : 'none',
            opacity: x !== method && i >= 1 ? .5 : 1,
          }}>{methodToDisplay(x)}</a>)
          .map((l, i) => i > 0 ? <><span style={{ opacity: .075 }}><span style={{fontSize:'.33em'}}> </span>•<span style={{fontSize:'.33em'}}> </span></span>{l}</> : l)}
          {/* <a onClick={e => setMethod(0)}>card / Google Pay</a> / <a onClick={e => setMethod(1)}>Paypal</a> */}
        </p>
        <p id='monthly'>
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
.button {
  background: unset;
}
.body {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
    margin: -1rem;
    // margin-top: 0;
    padding: 1rem;
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