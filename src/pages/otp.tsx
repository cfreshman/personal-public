import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoGroup, InfoSection, InfoStyles, Loader } from '../components/Info'
import { socket } from 'src/lib/socket'
import { addStyle, asInput, useE, useEventListener, useF, useInterval, useR, useRerender, useS, useStyle } from 'src/lib/hooks'
import { copy } from 'src/lib/copy'
import { S, defer, duration, formatDurationMs, group, interval, is_mobile, list, range } from 'src/lib/util'
import { useCachedScript, usePageSettings } from 'src/lib/hooks_ext'
import { JSX, pass } from 'src/lib/types'
import css from 'src/lib/css'
import { store } from 'src/lib/store'
import { auth } from 'src/lib/api'

const { Q, QQ, named_log, sleep, rand } = window as any
const { O, OTP } = window as any
const log = named_log('otp')

const TOTP_S = 30
const rand_otp = () => String(rand.i(1e6)).padStart(6, '0')

export default () => {
  useCachedScript('/lib/2/otp.js.html')
  
  const [{user,token}] = auth.use()
  usePageSettings({
    professional: true,
  })
  const [otp, setOtp] = useS<string>(undefined)
  const [expire, setExpire] = useS<number>(undefined)

  socket.use(instance => {
    instance.on('otp', ({otp}) => {
      setOtp(otp)
      setExpire(undefined)
    })
    instance.on('totp', ({otp, expire}) => {
      setOtp(otp)
      setExpire(expire)
    })
  })

  const [input_otp, setInputOtp] = useS('')
  const [topt_display, setToptDisplay] = useS('')
  useF(otp, () => {
    setToptDisplay(otp ?? '')
    Q('#totp').style.transition = '0'
    Q('#totp').style.transition = ''
  })
  const handle = {
    next_input: (e, i=input_otp.length) => {
      const input_l = QQ('#otp-input .input-cell input')[i]
      if (input_l) input_l.focus()
      else (document.activeElement as HTMLElement).blur()
    },
    mock: () => {
      setOtp(rand_otp())
      setExpire(Date.now() + duration({ s: TOTP_S }))
    },
    copy: () => {
      setToptDisplay('copied')
      // copy(otp, '.totp-copy', 1_500)
      copy(otp)
      defer(() => setToptDisplay(otp), 2_000)
    }
  }

  useF(handle.mock)
  useInterval(() => {
    const expire_l = Q('.totp-expire')
    if (expire_l) expire_l.textContent = formatDurationMs(Math.max(0, expire - Date.now()))
    if (expire < Date.now()) handle.mock()
  }, 100)
  useF(input_otp, () => {
    handle.next_input(null, input_otp.length)
  })
  useF(input_otp.length === 6, is => is && defer(async () => {
    try {
      console.debug(`(otp)`, {user, token})
      await OTP.input(input_otp, user, token)
      await sleep(1_000)
      setInputOtp('')
    } catch (e) {
      console.error(e)
      setInputOtp('ERROR!')
    }
  }))
  useF(otp, expire, () => log({otp, expire}))

  useStyle(expire, expire ? `
  @property --a{
    syntax: '<angle>';
    inherits: false;
    initial-value: 90deg;
  }
  @property --l{
    syntax: '<percentage>';
    inherits: false;
    initial-value: 10%;
  }
  @property --c{
    syntax: '<color>';
    inherits: false;
    initial-value: red;
  }
  

  #totp {
    position: relative;
  }
  #totp::after {
    content:""; ${css.mixin.fill}
    --a: 90deg;
    --l: 100%;
    transition: --l ${expire - Date.now()}ms linear, --c ${expire - Date.now()}ms linear;
    background: linear-gradient(var(--a), #2f24 var(--l), #f001 0) !important;
    background: linear-gradient(var(--a), #666 var(--l), #0000 0) !important;
    mix-blend-mode: color-burn;
    pointer-events: none;
  }
  ` : '')
  useE(input_otp, expire, () => {
    if (expire) {
      console.debug('transition gradient')
      let cleanup = []
      defer(() => {
        cleanup.push(addStyle(`
          #totp::after {
            --l: 0%;
          }
        `))
      })
      return cleanup
    }
  })

  return <Style id='otp'>
    <InfoBody onClick={e => {
      if (!e.target.onclick) {
        handle.next_input(null)
      }
    }}>
      {user
      ?
      <InfoSection labels={[
        'enter OTP to log in other device',
      ]}>

        <InfoGroup id='otp-input' className='input-cell-row center-row relative'>
          {range(6).map(i => {
            // if (input_otp.length > i + 1) {
            //   return <div className='large input-cell'>{input_otp[i]}</div>
            // }

            const next_cell_input = (e) => handle.next_input(e, i)
            return <div className='large input-cell'>
              <input inputMode='numeric'
              readOnly={input_otp.length > i + 1}
              value={input_otp[i]||''} 
              onPointerDown={e => {
                setInputOtp(input_otp.slice(0, i+1))
                next_cell_input(e)
              }}
              onKeyDown={e => {
                if (input_otp && e.key === 'Backspace' && input_otp.length === i) {
                  // ;(e.currentTarget.previousElementSibling as HTMLElement).focus()
                  handle.next_input(null, i - 1)
                }
              }}
              onInput={e => {
                setInputOtp(input_otp.slice(0, i) + e.currentTarget.value)
                handle.next_input(null, i + 1)
              }}
              ></input>
            </div>
          })}
          {input_otp.length === 6
          ? <div style={S(`
          ${css.mixin.fill}
          ${css.mixin.middle_column}
          background: #fffd;
          `)}>
            {/* <Loader invert={true} className='large' color={'#000000'} /> */}
            <InfoBadges labels={[
              // 'authorizing',
              // { 'authorizing': pass },
              {
                text: <>authorizing <Loader /></>,
                classes: 'middle-row',
                func: pass,
              },
            ]} />
          </div>
          :null}
        </InfoGroup>

      </InfoSection>
      :
      <span>
        click <b>LOG IN → OR USE ONE-TIME PASSWORD</b> and open this page on another device to log into your account
      </span>
      // <InfoSection labels={[
      //   'TOPT',
      //   // { mock: handle.mock },
      // ]}>
      //   {otp
      //   ?
      //   <>
      //     <div id='totp' className='input-cell-row'>
      //       {topt_display?.split('').map((x,i) =>
      //       <div className='large input-cell' onClick={handle.copy}><span>{x}</span></div>)}
      //     </div>
      //     <InfoBadges labels={[
      //       { 
      //         copy: handle.copy,
      //         classes: 'totp-copy',
      //       },
      //       expire && {
      //         text: '',
      //         classes: 'totp-expire',
      //         label: true,
      //       },
      //     ]} />
      //   </>
      //   :null}
      // </InfoSection>
      }

      {/* <div style={{flexGrow:1}} /> */}

      {/* <InfoSection labels={[
        'TOPT',
        // { mock: handle.mock },
      ]}>
        {otp
        ?
        <>
          <div id='totp' className='input-cell-row'>
            {topt_display?.split('').map((x,i) =>
            <div className='large input-cell' onClick={handle.copy}><span>{x}</span></div>)}
          </div>
          <InfoBadges labels={[
            { 
              copy: handle.copy,
              classes: 'totp-copy',
            },
            expire && {
              text: '',
              classes: 'totp-expire',
              label: true,
            },
          ]} />
        </>
        :null}
      </InfoSection>
       */}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`&#otp {
user-select: none;

.body {
  min-height: 100%;
  ${css.mixin.column}
  ${is_mobile ? `
  justify-content: end;
  // flex-direction: column-reverse;
  > * { flex-grow: 0 !important }
  `:''}
}

.large {
  font-weight: bold !important;
  font-size: 4em !important;
}

.input-cell-row {
  display: flex;
  gap: 2px;
  max-width: min(100%, 30em);
  width: -webkit-fill-available;
}
.input-cell {
  flex: 1 1;
  height: 2em !important;
  background: #eee;
  ${css.mixin.middle_column}
  
  cursor: pointer;
  // opacity: .7 !important;
  &:focus-within {
    --id-color-text: gold;
    // opacity: 1 !important;
  }
  &:nth-child(3n - 2):not(:first-child) {
    margin-left: .33em;
  }
  &[readonly] {
    filter: invert(1) brightness(0.75);
  }

  position: relative;
  > * {
    position: absolute; top: 0; left: 0;
    height: 100%; width: 100%; margin: 0; padding: .25em; 
    ${css.mixin.middle_column}
    display: inline-flex !important;
    font-weight: bold !important;
    text-transform: uppercase !important;
  }
}

}`