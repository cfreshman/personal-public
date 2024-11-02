import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings } from 'src/lib/hooks_ext'
import { S } from 'src/lib/util'
import { asInput, useInput, useStyle, useToggle } from 'src/lib/hooks'
import { store } from 'src/lib/store'
import { TwitterEmoji } from 'src/lib/render'
import { QR } from 'src/components/qr'

const { named_log, range, Q, list } = window as any
const log = named_log('logo')
const GOOGLE_QR_SIZE = 256
const GOOGLE_QR_BORDER = '16.1%'

const toAbsoluteUrl = href => href.startsWith('http') ? href : new URL(href, 'https://tu.fo').toString() 

// export const QR = ({ href }) => {
//   useStyle(`
//     :root {
//       --google-qr-clip: ${GOOGLE_QR_BORDER};
//     }
//   `)

//     return <img 
//     // style={S(`
//     // // mix-blend-mode: screen;
//     // // filter: invert(1);
//     // object-fit: contain;
//     // min-height: calc(256px - 4 * 16px);
//     // margin: calc(-1 * var(--google-qr-clip));
//     // position: relative; left: -24px !important; top: 0; margin-left: 0;
//     // clip-path: polygon(var(--google-qr-clip) var(--google-qr-clip), var(--google-qr-clip) calc(100% - var(--google-qr-clip)), calc(100% - var(--google-qr-clip)) calc(100% - var(--google-qr-clip)), calc(100% - var(--google-qr-clip)) var(--google-qr-clip));
//     // `)}
//     style={S(`
//     object-fit: contain;
//     min-height: calc(256px - 4 * 16px);
//     border: 1px solid #000;
//     aspect-ratio: 1/1;
//     `)}
//     src={`https://chart.googleapis.com/chart?chs=${GOOGLE_QR_SIZE}x${GOOGLE_QR_SIZE}&cht=qr&chl=${encodeURIComponent(toAbsoluteUrl(href))}&choe=UTF-8`} />
// }

export default () => {
  usePageSettings({
    background: '#fff',
  })

  const [qr, _, bindQr] = asInput(store.local.use('logo-qr-url', {
    default: '/tip',
  }))

  const [full_size, toggleFullSize] = useToggle(false)
  useStyle(`
  #plain .rendered-icon {
    font-size: ${full_size ? '1px' : '.5px'} !important;
  }
  `)

  return <Style>
    <InfoBody>
      <InfoSection id='qr-icon' labels={['qr', 0&&{ save: e => {
        // html2canvas(Q('#qr-icon').querySelector('.rendered-icon')).then(canvas => log(canvas.toDataURL()))
      }}]}>
        <input {...bindQr} />
        {/* <div className='column' style={S(`
        background: #333;
        color: #fff;
        border-radius: 6px;
        width: 256px; height: 256px;
        padding: 16px;
        font-size: 20px;
        line-height: 1;
        
        position: relative;
        `)}>
          <span style={S(`
          position: absolute;
          bottom: calc(100% - 16px);
          `)}>freshman.dev</span>
          <img src={`https://chart.googleapis.com/chart?chs=${GOOGLE_QR_SIZE}x${GOOGLE_QR_SIZE}&cht=qr&chl=${encodeURIComponent(new URL(qr, location.origin).toString())}&choe=UTF-8`} style={S(`
          min-height: -webkit-fill-available;
          clip-path: polygon(var(--google-qr-clip) var(--google-qr-clip), var(--google-qr-clip) calc(100% - var(--google-qr-clip)), calc(100% - var(--google-qr-clip)) calc(100% - var(--google-qr-clip)), calc(100% - var(--google-qr-clip)) var(--google-qr-clip));
          scale: calc(100% + var(--google-qr-clip)/${GOOGLE_QR_SIZE} * 100);
          mix-blend-mode: difference;
          filter: invert(1);
          `)}></img>
        </div> */}
        {/* <div className='rendered-icon column' style={S(`
        background: url(https://chart.googleapis.com/chart?chs=256x256&cht=qr&chl=${encodeURIComponent(new URL(qr, location.origin).toString())}&choe=UTF-8);
        background-position-x: -22px;
        color: #000;
        filter: invert(1);
        border-radius: 6px;
        width: 256px; height: 256px;
        padding: 16px;
        font-size: 20px;
        line-height: 1;
        
        position: relative;
        `)}>
          <span>freshman.dev</span>
          <span style={S(`
          position: absolute;
          top: calc(100% - 32px);
          font-size: .67em;
          `)}>{qr}</span>
        </div> */}
        <div className='rendered-icon column' style={S(`
        background: #000;
        color: #fff;
        border-radius: 6px;
        width: 256px; height: 256px;
        padding: 16px;
        font-size: 20px;
        line-height: 1;
        
        position: relative;
        justify-content: center; align-items: center;
        `)}>
          <span style={S(`
          position: absolute;
          top: 16px; left: 16px;
          `)}>freshman.dev</span>
          <div style={S(`
          // position: absolute; top: 0; left: 0; height: 100%; width: 100%;
          // padding: 16px;
          border: 16px solid transparent;
          padding: 16px 32px 16px 0;
          `)}>
            <QR {...{
              href: toAbsoluteUrl(qr),
              size: GOOGLE_QR_SIZE - 32,
              qr_options: {
                border_width: '0',
              },
            }} />
          </div>
          {/* <img 
          style={S(`
          mix-blend-mode: screen;
          filter: invert(1);
          object-fit: contain;
          min-height: calc(256px - 4 * 16px);
          margin: calc(-1 * var(--google-qr-clip));
          position: absolute; left: -24px;
          clip-path: polygon(var(--google-qr-clip) var(--google-qr-clip), var(--google-qr-clip) calc(100% - var(--google-qr-clip)), calc(100% - var(--google-qr-clip)) calc(100% - var(--google-qr-clip)), calc(100% - var(--google-qr-clip)) var(--google-qr-clip));
          `)}
          src={`https://chart.googleapis.com/chart?chs=${GOOGLE_QR_SIZE}x${GOOGLE_QR_SIZE}&cht=qr&chl=${encodeURIComponent(toAbsoluteUrl(qr))}&choe=UTF-8`} /> */}
          <span style={S(`
          position: absolute;
          top: calc(100% - 32px); left: 16px;
          font-size: .67em;
          `)}>{qr}</span>
        </div>
      </InfoSection>
      <InfoSection id='plain' labels={['plain', { scale: toggleFullSize }]}>
        <div className='row gap wrap' style={S(`flex-wrap:wrap-reverse`)}>
          <div className='rendered-icon column' style={S(`
          background: #333;
          color: #fff;
          font-size: .5px;
          border-radius: 6em;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: 20em;
            `)}>freshman.dev</span>
          </div>
          <div className='rendered-icon column' style={S(`
          color: #fd6464;
          font-size: .5px;
          // border-radius: 6em;
          width: 256em; height: 256em;
          padding: 8em;
          line-height: 1;
          border: 8em solid currentcolor;
          display: flex; justify-content: flex-end; align-items: center;
          `)}>
            <span style={S(`
            background: #fd6464; color: #fff;
            font-size: 32em;
            white-space: pre;
            font-weight: bold;
            padding: calc(8em / 32);
            width: 100%;
            text-align: right;
            `)}>{`pico-\n repo`}</span>
          </div>
          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>👋</span>
          </div>
          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>💬</span>
          </div>
          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🔔</span>
          </div>
          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>👤</span>
          </div>
          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>⏲️</span>
          </div>
          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🥀</span>
          </div>
          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🗺️</span>
          </div>
          {[1, 2, 4, 8, 16].map(n => 
          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc((128em + 32em + 8em)/${n});
            white-space: pre;
            letter-spacing: .1em;
            line-height: 1.1;
            `)}>{range(n).map(r => <>{r?'\n':null}{range(n).map(c => <span>🏆</span>)}</>)}</span>
          </div>)}
          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          background: url(/icon.png);
          background-size: cover;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🪵</span>
          </div>
          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          background: url(/icon.png);
          background-size: cover;
          font-family: system-ui;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>☕</span>
          </div>
          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>:-1</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>📄</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          // background: #eef;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🚘</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          // background: #eef;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🌼</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #100;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>💪</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #1DB954;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🎵</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          color: #1DB954;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>♆</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>💻</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🌁</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          color: #F7DC6F;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>♆</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: linear-gradient(blue, pink);
          color: #0004;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>᧫</span>
          </div>

          {/* <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          `)}>
            <img
            src="/raw/twitter/icon.svg"
            style={S(`
            height: 100%;
            width: 100%;
            `)} />
          </div> */}

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          background: linear-gradient(15deg,#609e98,#e2d291);
          // background: url(/raw/images/space-square.jpg);
          // background-size: cover;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            text-shadow: 1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000;
            `)}>📀</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          background: linear-gradient(15deg,#609e98,#e2d291);
          background: url(/raw/images/space-square-2.avif);
          background-size: cover;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            text-shadow: 1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000;
            `)}>📀</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🏠</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>⚙️</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🔍</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #000;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🗂️</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #3b342f;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🍎</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          background: #86b2ee;
          background: #000;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🕰️</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #86b2ee;
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>⏲️</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;

          font-family: roboto-mono;
          color: #1DB954;
          background: #000;
          `)}>
            <span style={S(`
            // font-size: calc(128em + 32em + 8em);
            font-size: 64em;
            `)}>/spot</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>📝</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>💩</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #eeebe6;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>💼</span>
          </div>
          <div className='rendered-icon middle-row' style={S(`
          background: #eeebe6;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>💩</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #eeebe6;
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          font-family: monospace;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-size: 256em;
            translate: 0 -.025em;
            `)}>♛</span>
          </div>
          <div className='rendered-icon middle-row' style={S(`
          background: #fff;
          color: #000;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          font-family: monospace;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-size: 325em;
            translate: 0 -.1em;
            `)}>♚</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #86b2ee;
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🟩</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #86b2ee;
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>📷</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #86b2ee;
          background: #eeebe6;
          background: #e9e9ea;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🌞</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #86b2ee;
          background: #eeebe6;
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🌐</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #86b2ee;
          background: #eeebe6;
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            `)}>🍣</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #86b2ee;
          background: #eeebe6;
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-weight: bold;
            `)}>{`<3`}</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #86b2ee;
          background: #eeebe6;
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          overflow: hidden;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-weight: bold;
            pointer-events: none;
            `)}>{`RUN`}</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #86b2ee;
          background: #eeebe6;
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          overflow: hidden;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-weight: bold;
            pointer-events: none;
            `)}>{`👀`}</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #86b2ee;
          background: #eeebe6;
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          overflow: hidden;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-weight: bold;
            pointer-events: none;
            font-size: 320em;
            `)}>{`🌌`}</span>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-weight: bold;
            pointer-events: none;
            position: absolute;
            font-size: 64em;
            white-space: pre;
            `)}>{`space\ntext`}</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #86b2ee;
          background: #eeebe6;
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          overflow: hidden;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-weight: bold;
            pointer-events: none;
            `)}>{`🏁`}</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #9bb1e8;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          overflow: hidden;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-weight: bold;
            pointer-events: none;
            `)}>{`🐋`}</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          overflow: hidden;
          background-image: url(/raw/images/back-graffiti.jpg);
          background-size: cover;
          color: #000;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-weight: bold;
            pointer-events: none;
            font-size: 48em;
            text-align: right;
            background: #000;
            color: #fff;
            `)}>{`graffiti\nwall`}</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          overflow: hidden;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-weight: bold;
            pointer-events: none;
            `)}>{`📖`}</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          overflow: hidden;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-weight: bold;
            pointer-events: none;
            `)}>{`🫵`}</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          overflow: hidden;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-weight: bold;
            pointer-events: none;
            `)}>{`🗳️`}</span>
          </div>

          <div className='rendered-icon middle-row' style={S(`
          background: #000;
          color: #fff;
          border-radius: 0;
          width: 256em; height: 256em;
          padding: 16em;
          line-height: 1;
          overflow: hidden;
          `)}>
            <span style={S(`
            font-size: calc(128em + 32em + 8em);
            font-weight: bold;
            pointer-events: none;
            `)}>{`🛸`}</span>
          </div>
        </div>
      </InfoSection>
      <InfoSection labels={['static']}>
        <div className='row gap'>
        {
          list('/icon.png /raw/printgames/icon-65.png /raw/images/icon-graffiti.png')
          .map(src => 
          <img src={src} style={S(`
          width: 128px;
          `)} />)
        }
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`