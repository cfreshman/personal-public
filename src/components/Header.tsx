import React, { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { copy } from '../lib/copy'
import { JSX, pass, truthy } from '../lib/types'
import styled from 'styled-components'
import api, { auth } from '../lib/api'
import { login, token as token_auth, logout, signup, auth as authAuth } from '../lib/auth'
import { Conditions } from '../lib/conditions'
import { asToggle, useE, useF, useM, useR, useRerender, useS, useStyle, useToggle } from '../lib/hooks'
import { useAuth, useCachedScript, useLogicalPath, useSupporter } from '../lib/hooks_ext'
import { meta, defaultIcon as metaDefaultIcon } from '../lib/meta'
import url from '../lib/url'
import user from '../lib/user'
import { A, Comment, External, HalfLine, InfoBadges, InfoBody, InfoButton, InfoSection, InfoStyles, Typed } from './Info'
import { Unread } from './Unread'
import { Modal, Tooltip, openFeedback, openFrame, openPopup } from './Modal'
import { S, dev, duration, elapsed, is_mobile, mobile, named_log } from '../lib/util'
import { parseLogicalPath, parsePage } from '../lib/page'
import { message } from './Messages'
import { Dropdown } from './individual/Dropdown'
import { store } from 'src/lib/store'
// import css from 'src/lib/css'
import { debug } from 'console'
import Settings from 'src/pages/settings'
import { Dangerous, dangerous } from './individual/Dangerous'
// import { QR } from 'src/pages/icons'
import { V } from 'src/lib/ve'
import { DropdownTrackPlayerFill } from 'src/lib/track_player'
import { GoogleLogin } from '@react-oauth/google'
import { QR } from './qr'

const {css,range,defer,node,datetime,Q,set,entries,devices} = window as any

const url_params = new URLSearchParams(location.search)
const hide_ui = url_params.has('hide-freshman-ui')

const log = named_log('header')

const User = ({ expand }: { expand: boolean }) => {
  auth.use()
  // useF(auth.dropdown, setDropdown)
  const dropdown = auth.get().dropdown
  const setDropdown = (dropdown) => auth.set({ ...auth.get(), dropdown })
  useF('user dropdown', auth.get().dropdown, log)
  const [error, setError] = useState('')
  
  const [new_user, set_new_user] = useS('')
  const [use_google, set_use_google]: [{ exists:boolean }, any] = store.use('login-use-google', { default:undefined })
  const [new_pass, set_new_pass] = useS('')
  const [new_pass_verify, set_new_pass_verify] = useS('')
  
  const userRef = useR()
  const passRef = useR()
  const [verify, setVerify] = useState(false)
  const verifyRef = useR()
  const emailRef = useR()
  const [profile] = user.profile.use()
  const supporter = useSupporter()
  const show_donate = false // !supporter // && profile && elapsed(profile.t || Date.now()) > duration({ d: 1 })

  const handle = {
    _reset_with_new_auth: (new_auth) => {
      setError('')
      setVerify(false)
      set_new_user(undefined)
      set_new_pass(undefined)
      set_new_pass_verify(undefined)
      setChecks({
        pptc: false,
        cn: false,
        // is_21: false,
      })
      defer(() => {
        auth.set(new_auth)
        location.reload()
        // defer(() => {
        //   Q('.dropdown-container.user .dropdown-label').click()
        // })
      })
    },
    _update_email: async (email, force_verify=false) => {
      if (email) {
        await api.post('/notify/method', { method: 'email', value: email, source: location.host, force_verify })
        if (location.pathname.startsWith('/notify')) location.reload()
      }
    },
    signin: async (func, message=undefined) => {
      if (!userRef.current.value) return setError('enter username')
      if (!passRef.current.value) return setError('enter password')
      setError(message || '')
      const email = emailRef.current?.value
      log('[SIGNIN]', userRef.current?.value, emailRef.current?.value)
      await func(userRef.current.value, passRef.current.value, { checks })
        .then(new_auth => {
          log('[SIGNIN] complete', auth)
          // email && setTimeout(() => api.post('/notify/email', { email, source: location.host }), 1000)
          handle._reset_with_new_auth(new_auth)
          handle._update_email(email)
        })
        .catch(e => {
          setError(e.error || e.toString() || 'error')
        })
    },
    signup: async () => {
      setError('')
      if (verify) {
        emailRef.current?.blur()
        if (!(checks.cn && checks.pptc)) {
          setError('^ not accepted')
        } else if (verifyRef.current?.value === passRef.current?.value) {
          if (emailRef.current.value) {
            // if ('default' === Notification?.permission) {
            //   Notification.requestPermission()
            // }
          }
          await handle.signin(signup, 'wait one moment')
        } else {
          setError('passwords mismatch')
        }
      } else {
        setVerify(true)
        setTimeout(() => verifyRef.current?.focus())
      }
    },
    logout: () => {
      setDropdown(false)
      logout()
    },
    nav: (path?) => {
      !expand && setDropdown(false)
      path && url.push(path)
    },
    reset: () => {
      api.post('reset/request', {
        user: userRef.current.value
      })
      .then(() => setError('check email for link'))
      .catch(err => {
        console.log(err)
        setError(err.error)
      })
    },
  }

  // useF(auth.user, () => auth.set({...auth.get(),dropdown:false}))
  useF(dropdown, () => {
    if (dropdown === 'signup') {
      setVerify(true)
    }
    if (!dropdown) {
      setError('')
      setVerify(false)
    } else {
      setTimeout(() => userRef.current?.focus())
    }
  })

  useF(error, () => {
    if (error.includes(`user doesn't exist`)) {
      // setVerify(true)
      setTimeout(() => {
        setVerify(true)
        setTimeout(() => verifyRef.current?.focus())
        setError('')
      }, 1000)
    }
  })

  const isMe = auth.user === 'cyrus'

  const setting_for_page = (page) => ({
    'lettercomb': 'capitals',
  }[page] || page)

  const loggedIn = (
    <>
      {auth.basic ? '' : <>
        <A href={`/u/${auth.user}`} className='item' onClick={() => handle.nav()}>
          {expand ? '/u/'+auth.user : '/profile'}
        </A>
      </>}
      {/* <A href='/chat/site' className='item' onClick={() => handle.nav()}>notifs</A> */}
      <A href={`/settings/${encodeURIComponent(setting_for_page(parsePage()))}`} className='item' onClickCapture={e => {
        if (!e.metaKey && !is_mobile) {
          e.stopPropagation()
          e.preventDefault()
          const close = openFrame({
            href: `/-settings/?app=${encodeURIComponent(setting_for_page(parsePage()))}`,
            options:{
              scale: .9,
              additive: true,
            },
          })
          url.once(close)
        }
      }}>/settings</A>
      {isMe
      ? <A href='/admin' className='item' onClick={() => handle.nav()} />
      : ''}
      {profile?.recents?.length ? <>
        <hr />
        {profile.recents.map(recent =>
        <A key={recent} href={recent} className='item' onClick={() => handle.nav()}>{recent}</A>)}
        {profile.recents ? <hr /> : ''}
      </> : ''}
      {show_donate ? <>
        {/* <A className='item' href='/donate'>tip jar</A> */}
        {/* <A href='/donate' className='item' onClickCapture={e => {
          if (!e.metaKey && !is_mobile) {
            e.stopPropagation()
            e.preventDefault()
            const [W, H] = V.ne(400, 600)
            const close = openFrame({
              href: `/-coffee`,
              options:{
                scale: .85,
                width: W,
                height: H,
                ...(rect => {
                  return auth.expand ? {
                    x: rect.x - 4 - W,
                    // y: window.innerHeight - 8 - 700,
                    y: rect.y + rect.height - H,
                  } : {
                    x: rect.x + rect.width - W,
                    y: auth.expand ? rect.y - 4 - H : rect.y + rect.height + 4,
                  }
                })(Q('.user .dropdown')?.getBoundingClientRect())
              },
            })
            url.once(close)
          }
        }}>tip jar</A> */}
        {/* <div style="font-size:.8em;line-height:1.3;width:max-content">donation-supported<br/>like Wikipedia</div> */}
        {/* <div style="font-size:.8em;line-height:1.3;width:max-content">sponsors: <a style="text-decoration:underline" target="_blank" href="https://freshman.dev/donoboard">/donoboard</a></div> */}
        {/* <form action="https://www.paypal.com/donate" method="post" target="_top" class="row">
            <input type="hidden" name="business" value="64YZZ6TQ94E4E" />
            <input type="hidden" name="no_recurring" value="0" />
            <input type="hidden" name="item_name" value="(monthly will acquire /donoboard slots)" />
            <input type="hidden" name="currency_code" value="USD" />
            <input type="image" src="/raw/images/donate-paypal.png" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" 
            style="height:2em" />
            <img alt="" border="0" src="https://www.paypal.com/en_US/i/scr/pixel.gif" width="1" height="1" style="display:none" />
          </form> */}
        {/* <a style="display:flex" target="_blank" href="/raw/images/donate_profile.jpg"><img src="/raw/images/donate_profile.jpg" style="height: 5em" title="donate profile" /></a> */}
        
        {/* <Dangerous style={S(`white-space:unset`)} html={`
        <div class="middle-column gap" style="align-items:center">
          <br/>
          <!-- <div style="font-size:.75em;width:max-content"><a style="text-decoration:underline" target="_blank" href="https://freshman.dev/donoboard">donation-supported</a><br/>like Wikipedia</div> -->
          <div style="display:flex;position:relative;border:1px solid currentcolor">
            <div style="position:absolute;font-size:.67em;width:max-content;background:#000;margin:1px;bottom:0;right:0">it's just me!</div>
            <img src="/raw/images/donate_profile.jpg" style="height: 6em" title="donate profile" />
          </div>
          <br/>
          <div style="font-size:.75em;width:max-content">send me a coffee:</div>
          <form id="donate-form" style="display:none" action="https://www.paypal.com/donate" method="post" target="_blank" class="row">
            <input type="hidden" name="business" value="64YZZ6TQ94E4E" />
            <input type="hidden" name="no_recurring" value="0" />
            <input type="hidden" name="item_name" value="(monthly will acquire /donoboard slots)" />
            <input type="hidden" name="currency_code" value="USD" />
          </form>
          <div class='middle-row'>
            <a onclick="
            Q('#donate-form').submit()
            ">
              <img
              src="/raw/images/donate-paypal.png"
              title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button"
              style="width:8em" />
            </a>
          </div>
          <div class='middle-row'>
            <a target="_blank" href="https://freshman.dev/venmo">
              <img
              src="/raw/images/donate-venmo.png"
              title="venmo me" alt="Donate with Venmo button"
              style="width:8em" />
            </a>
          </div>
          <br/>
        </div>`} /> */}

        {/* <div className="middle-column gap" style={S("align-items:center")}>
          <br/>
          <div style={S("font-size:.75em;width:max-content")}>send me a coffee:</div>
          <div id='header-donate' className='middle-column'>
            <a target="_blank" href={`${mobile ? 'venmo://users/CyrusFreshman' : 'https://freshman.dev/venmo'}`}>
              <style>{`
              #header-donate {
                a {
                  text-decoration: none !important;
                }
                button, .button-like {
                  box-shadow: 0 1px var(--id-color-text-readable);
                  translate: 0 -1px;
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
              }
              `}</style>
              <button>
                OPEN VENMO&nbsp;<img
                src="/raw/coffee/venmo-logo.png"
                title="venmo me" alt="Donate with Venmo button"
                style={S(`
                height: calc(1.5em + 2px);
                `)} />
              </button>
            </a>
            {mobile ? null : <>
              <HalfLine ratio={.25} />
              <a target="_blank" href={`${mobile ? 'venmo://users/CyrusFreshman' : 'https://freshman.dev/venmo'}`}>
                <div className='middle-column' style={S(`
                `)}>
                  <QR {...{
                    href: 'venmo://users/CyrusFreshman',
                    size: '8em',
                    qr_options: {
                      border_width: '.25em',
                      colorLight: '#000',
                      colorDark: '#fff'
                    },
                  }} />
                </div>
              </a>
            </>}
          </div>
          <br/>
        </div> */}

        <div className="middle-column gap" style={S("align-items:center")}>
          <br/>
          <div style={S("font-size:.75em;width:max-content")}>support the site!</div>
          <div id='header-donate' className='middle-column'>
            <a target="_blank" href={`${mobile ? 'venmo://users/CyrusFreshman' : 'https://freshman.dev/venmo'}`}>
              <style>{`
              #header-donate {
                a {
                  text-decoration: none !important;
                }
                button, .button-like {
                  box-shadow: 0 1px var(--id-color-text-readable);
                  translate: 0 -1px;
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
              }
              `}</style>
              <Dangerous html={`<a href='https://ko-fi.com/U7U64599J' target='_blank' style='
              display: inline-flex;
              '>
                <img style='height:2em' src='https://storage.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' />
              </a>`} />
            </a>
          </div>
          <br/>
        </div>

        {/* <A href='/donoboard' className='item' onClick={() => handle.nav()} /> */}
        <hr />
      </> : null}
      <>
        <div className='middle-column gap'>
          <br/>
          <div style={S(`width:max-content; padding:0 .5em`)}><button className='cute'><A tab='/donate'>tip me <span style={S('font-family:system-ui')}>☕️</span></A></button></div>
          <HalfLine />
          <div style={S(`width:max-content; padding:0 .5em`)}><button className='cute'><A tab='/contact'>hire me!</A></button></div>
          <br/>
        </div>

        {/* <A href='/donoboard' className='item' onClick={() => handle.nav()} /> */}
        <hr />
      </>
      {/* <A href='/otp'>OTP login</A> */}
      <a className='item' onClick={() => { handle.logout() }}>log out</a>
    </>
  )

  useCachedScript('/lib/2/otp.js.html')

  const [checks, setChecks] = useState({
    pptc: false,
    cn: false,
    // is_21: false,
  })

  const user_ok = useM(new_user, () => !!new_user)
  const pass_ok = useM(user_ok, new_pass, () => user_ok && !!new_pass)
  const checks_ok = useM(user_ok, pass_ok, new_pass_verify, checks, use_google, () => {
    if (!use_google) {
      return pass_ok && !!new_pass_verify && checks.cn && checks.pptc
    }
    if (use_google.exists) {
      return user_ok
    } else {
      return user_ok && checks.cn && checks.pptc
    }
  })
  useF(new_user, new_pass, new_pass_verify, checks, () => log({new_user, new_pass, new_pass_verify, checks}))

  const show_google = false // true // location.pathname === '/admin'

  // const google_ref = useR()
  // useF(() => {
  //   google_ref.current.innerHTML = `
  //   <div id="g_id_onload"
  //       data-client_id="1033547890894-k2liippvrka0q7j9vf5g7d26k050iu7m.apps.googleusercontent.com"
  //       data-context="signup"
  //       data-ux_mode="popup"
  //       data-login_uri="http://localhost:3030/login"
  //       data-auto_prompt="false">
  //   </div>
  //   <div class="g_id_signin"
  //       data-type="standard"
  //       data-shape="pill"
  //       data-theme="outline"
  //       data-text="continue_with"
  //       data-size="medium"
  //       data-logo_alignment="left">
  //   </div>
  //   `
  // })

  useStyle(`
  .wait-for-user {
    ${user_ok ? '' : `
    opacity: .5;
    pointer-events: none;
    `}
  }
  .wait-for-pass {
    ${pass_ok ? '' : `
    opacity: .5;
    pointer-events: none;
    `}
  }
  .wait-for-checks {
    ${checks_ok ? '' : `
    opacity: .5;
    pointer-events: none;
    `}
  }
  #google-login-container {
    max-width: 200px;
    overflow: hidden;
  }
  #google-login-container > * {
    height: unset !important;
    ${new_user ? '' : `
    opacity: .5;
    pointer-events: none;
    `}
  }
  #error#error#error#error#error {
    ${set(`wait one moment`, ',').has(error) ? '' : `
    color: red !important;
    `}
  }

  #header button.cute {
    background: #bfb !important; 
    color: #000 !important; 
    border: 1px solid currentcolor !important;
    box-shadow: 0 2px #fff !important;
    translate: 0 -2px !important;
    border-radius: 99em !important;
    padding: 0 .5em !important;
    height: 1.5em;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer !important;
    font-family: monospace !important;

    background: #405f92 !important;
    background: #2869d3 !important;
    background: #2e7dff !important;
    color: #fff !important;

    &:active, &.active {
      box-shadow: none !important;
      translate: 0 !important;
    }
    *:hover {
      text-decoration: none !important;
    }
  }
  `)
  useF(new_user, async () => {
    if (use_google) {
      const precheck = await api.get(`/login/google-precheck/${new_user}`)
      log('google precheck', precheck)
      set_use_google(precheck)
    } else {
      setVerify(false)
    }
  })
  const loggedOut = (
    <>
      <div className='item info'>
        <input ref={userRef} type='text' maxLength={8} placeholder='username'
          autoComplete="username"
          autoCorrect='off' autoCapitalize='off'
          value={new_user} onChange={e => set_new_user(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && passRef.current?.focus()}
          // style={use_google ? S(`width: 100%`) : undefined}
          />
      </div>
      {!use_google && show_google ? <>
        <div className='item info signin'><u><span className='' onClick={async () => {
          const precheck = await api.get(`/login/google-precheck/${new_user}`)
          log('google precheck', precheck)
          set_use_google(precheck)
          handle.signup()
        }}>continue with google</span></u></div>
        <div className='item info'><HalfLine /></div>
      </> : null}
      {use_google ? null : <div className='item info'>
        <input className='nope-wait-for-user' ref={passRef} type='password' placeholder='password'
          autoComplete={verify ? "new-password" : "current-password"}
          value={new_pass} onChange={e => set_new_pass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handle.signin(login)}/>
      </div>}
      {verify || use_google ? <>
        {use_google ? null : <>
          <div className='item info'>
            <input ref={verifyRef} type='password' placeholder='confirm password'
              autoComplete="new-password"
              value={new_pass_verify} onChange={e => set_new_pass_verify(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && emailRef.current?.focus()}/>
          </div>
          <div className='item info'><HalfLine /></div>
          <div className='item info'>
            <input ref={emailRef} type='email' placeholder={dropdown === 'email' ? 'email' : 'optional email'}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  log(document.querySelector('#conditions'));
                  (document.querySelector('#conditions') as any).focus()
                }
              }}/>
          </div>
          <div className='item info' style={{whiteSpace:'pre'}}>
            {'- password reset\n- notifications\n  (sent in 1 thread)\n'}
          </div>
          {/* <div className='item info'>
            <input ref={verifyRef} type='password' placeholder='confirm password'
              autoComplete="new-password"
              value={new_pass_verify} onChange={e => set_new_pass_verify(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && emailRef.current?.focus()}/>
          </div>
          <div className='item info' style={{whiteSpace:'pre'}}>
            {'notifications:\nsent in single thread\nallows password reset'}
          </div>
          <div className='item info'>
            <input ref={emailRef} type='email' placeholder={dropdown === 'email' ? 'email' : 'optional email'}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  log(document.querySelector('#conditions'));
                  (document.querySelector('#conditions') as any).focus()
                }
              }}/>
          </div> */}
        </>}
        {use_google && !use_google.exists
        ? <div className='item info'>{use_google.exists ? 'known user' : 'new user'}</div>
        : null}
        <div className='item info'><HalfLine /></div>
        {(use_google ? use_google.exists : false) ? null : <>
          <Conditions id='conditions' item={true} setChecks={setChecks} outerNext={handle.signup} />
          <div className='item info'><HalfLine /></div>
        </>}

        {/* <div className='item info' style={{whiteSpace:'pre'}}>
          {'sent in single thread'}
        </div> */}
      </> : ''}
      {error?.includes('no email')
      // ? <div className='item'>
      //   {'\n'}<a href='/contact'>contact me</a>
      // </div>
      ? <Link to='/contact' className='item'>contact me</Link>
      : ''}
      {1 ?'': <div className='item info row end'><a onClick={async (e) => {
        const OTP = window['OTP']
        const {otp,token} = await OTP.request()
        let close
        openPopup(_close => {
          close = _close
          return <InfoStyles id='otp-modal' style={S(`
          background: #fff;
          color: #000;
          `)}>
            <style dangerouslySetInnerHTML={{__html:`
            #otp-modal {
              --id-color: #fff;
              --id-color-text: #000;
              --id-color-text-readable: #fff;
            }
            `}} />
            <InfoBody>
              <InfoSection labels={['about']}>
                <span>Log into your account using another device you're already logged into</span>
                <span>Go to freshman.dev/otp on your chosen device</span>
              </InfoSection>
              <InfoSection labels={[
                'OTP',
                { copy: e => copy(otp, e.target) },
                {close},
              ]}>
                <div style={S(`
                display: flex;
                gap: 2px;
                max-width: min(100%, 30em);
                width: -webkit-fill-available;`)}>
                  {otp.split('').map(cell => <span style={S(`
                  flex: 1 1;
                  background: #eee;
                  height: 2.5em;
                  padding: .25em;
                  font-size: 3em;
                  font-weight: bold !important;
                  text-transform: uppercase !important;
                  display: inline-flex !important;
                  ${css.mixin.middle_column}
                  `)}>
                    {cell}
                  </span>)}
                </div>
                {/* {<QR href={location.origin + `/otp?otp=${otp}`} />} */}
              </InfoSection>
            </InfoBody>
          </InfoStyles>
        })
        const end = Date.now() + duration({ m:5 })
        log('(otp) polling')
        while (Date.now() < end) {
          try {
            log('(otp) continue polling')
            const otp_result = await OTP.poll({otp})
            log('(otp) polled', otp_result)
            const {user,token} = otp_result
            const token_result = await token_auth(user, token)
            log('(otp) token result', token_result)
            log('(otp) end polling')
            close()
            return
          } catch (e) {
            console.error(e)
          }
        }
        log('(otp) end polling')
        // while (await OTP.poll()) {}
        // login(store.local.get('X-O-User'), store.local.get('X-O-Token'))
      }}>or use one-time password</a></div>}
      {error === 'incorrect password'
      ? use_google
        ? null
        : <div className='item info signup' onClick={handle.reset}>reset password?</div>
      : null}
      {use_google ? <>
        <div className='item info'><HalfLine /></div>
        <div className='item info wide middle-column'>
          <div id='google-login-container' className='wait-for-checks' style={S(`
          border: 1px dashed #fff;
          padding: .25em;
          border-radius: 99em;
          width: fit-content;
          `)}>
            <GoogleLogin 
            onSuccess={async response => {
              log('google success', response)
              const parse_JWT = (token) => {
                const base64_url = token.split('.')[1]
                const base64 = base64_url.replace(/-/g, '+').replace(/_/g, '/')
                const json = decodeURIComponent(atob(base64).split('').map((c) => {
                  return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''))
                return JSON.parse(json)
              }
              const jwt_data = parse_JWT(response.credential)
              log('google JWT parsed', jwt_data)
              try {
                const new_auth = await api.post('/login/google', {
                  user:new_user,
                  jwt:response.credential,
                  info: {
                    href: location.href,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  },
                  options: { checks },
                })
                log('google server payload', new_auth)
                handle._reset_with_new_auth(new_auth)
                if (!use_google.exists) {
                  handle._update_email(jwt_data.email, true)

                  // set profile info
                  let icon, bio
                  const update_profile = async () => {
                    log('update profile', { bio, icon })
                    await api.post(`/profile/bio`, { bio, icon })
                    if (location.pathname.startsWith(`/u/${new_auth.user}`)) location.reload()
                  }

                  bio = `joined ${datetime.ymd()}`

                  const img = node(`<img referrerpolicy="no-referrer" crossorigin="anonymous" />`)
                  img.onload = () => {
                    try {
                      const canvas = node('<canvas />')
                      const IMG_SIZE = 128
                      canvas.height = canvas.width = IMG_SIZE
                      const ctx = canvas.getContext('2d')
                      ctx.imageSmoothingEnabled = false
                      ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height)
                      icon = canvas.toDataURL()
                      update_profile()
                    } catch (e) {
                      log(e)
                    }
                  }
                  img.onerror = () => update_profile()
                  img.src = jwt_data.picture
                }
              } catch (e) {
                setError(e.error || e)
              }
            }} onError={() => {
              log('google error')
              setError('Google error')
            }}
            // size='small' 
            size='medium'
            text='continue_with'
            shape='pill'
            logo_alignment='center'
            // theme='filled_black'
            // width={250}
            // type='icon'
            // useOneTap={true}

            />
          </div>
        </div>
        <div className='item info'><HalfLine /></div>
        <div className='item info'><HalfLine /></div>
        <div className='item info'><HalfLine /></div>
        <div className='item info signin'><u><span onClick={async () => {
          set_use_google(undefined)
          setVerify(false)
        }}>use password</span></u></div>
      </> : <>
        <div className='item info signin'>
          {verify ? <>
            {/* <span onClick={() => handle.signin(login)}>log in</span>
            {' / '} */}
            <u><span onClick={() => setVerify(false)}>X</span></u>
            {/* <span></span> */}
            <u><span className='wait-for-checks' onClick={() => handle.signup()}>complete sign up</span></u>
          </> : <>
            <u><span className='wait-for-pass' onClick={() => handle.signup()}>sign up</span></u>
            {/* {' / '} */}
            <u><span className='wait-for-pass' onClick={() => handle.signin(login)}>log in</span></u>
          </>}
        </div>
        {verify ? null : null&&<>
          <div className='item info'><HalfLine /></div>
          <div className='item info'><HalfLine /></div>
        </>}
      </>}
      {/* {error ? <div className='error-msg'>{error}</div> : ''} */}
      {!verify && dev && 0 ? <>
        <div className='item info'><HalfLine /></div>
        {/* <div className='item info'>or</div> */}
        <div id='google-login-container' className='item info middle-row wide'>
          <GoogleLogin 
          onSuccess={async data => {
            log('google success', data)
            const parse_JWT = (token) => {
              const base64_url = token.split('.')[1]
              const base64 = base64_url.replace(/-/g, '+').replace(/_/g, '/')
              const json = decodeURIComponent(atob(base64).split('').map((c) => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''))
             return JSON.parse(json)
           }
           log('google JWT parsed', parse_JWT(data.credential))
           const payload = api.post('/login/google', { user:new_user, jwt:data.credential })
           log('google server payload', payload)
          }} onError={() => log('google error')}
          size='medium' 
          text='continue_with'
          shape='pill'

          />
        </div>
        {/* <div className='item info'><div ref={google_ref} /></div> */}
      </> : null}
      {!verify || use_google ? null&&<>
        <div className='item info'><HalfLine /></div>
        <div className='item info'>
          new here?
        </div>
        <div className='item info'>
          <u><A tab href='https://freshman.dev/starter'>starter guide</A></u>
        </div>
      </> : null}

      {error ? <>
        <div className='item info'><HalfLine /></div>
        <div id='error' className='item info'>
          {error === 'incorrect password' && use_google ? `${new_user} uses a password\nor other Google account` : error}
        </div>
      </> : null}
    </>
  )

  // url.use(x => setDropdown(false))
  useStyle(expand ? `` : `
  #badges {
    display: flex;
    align-items: stretch;
    margin-left: .67em;
    
    margin-left: 0;
    overflow: visible;
  }
  #badges > * {
    opacity: 1;
    background: #0000 !important;
    color: black;
    text-decoration: underline;
    display: inline-flex;
    align-items: center;
    
    margin-left: 0;
    font-size: .725em !important;
    opacity: 1 !important;
  }
  `)

  const user_dropdown_control:any = {}
  useF(!!dropdown, () => defer(() => {
    user_dropdown_control.toggle && user_dropdown_control.toggle(!!dropdown)
    log('user dropdown control', !!dropdown, user_dropdown_control.toggle)
  }))

  return <>
    <Unread />
    {auth.hidden && !auth.user 
    ? null 
    : <Dropdown className='user' expand={expand&&1} position='s w' indicator={!expand&&'left'} open={!!dropdown} label={
      expand
      ? <svg width="24px" height="24px" viewBox="0 0 24 24" fill="#000" stroke="#000" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M11.8445 21.6618C8.15273 21.6618 5 21.0873 5 18.7865C5 16.4858 8.13273 14.3618 11.8445 14.3618C15.5364 14.3618 18.6891 16.4652 18.6891 18.766C18.6891 21.0658 15.5564 21.6618 11.8445 21.6618Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M11.8372 11.1735C14.26 11.1735 16.2236 9.2099 16.2236 6.78718C16.2236 4.36445 14.26 2.3999 11.8372 2.3999C9.41452 2.3999 7.44998 4.36445 7.44998 6.78718C7.4418 9.20172 9.3918 11.1654 11.8063 11.1735C11.8172 11.1735 11.8272 11.1735 11.8372 11.1735Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      : (auth.user ? auth.user : 'log in')
    } control={user_dropdown_control} clear_messages set_open={setDropdown} dropdown_style={S(`
    ${devices.is_mobile ? `font-size: max(1em, 16px);` : ''}
    `)}>
      {auth.user ? loggedIn : loggedOut}
    </Dropdown>}
  </>
}

export const Header = () => {
  const [{ expand, popup, }] = auth.use()
  const [embedded] = meta.embedded.use()
  const [invert, toggleInvert] = asToggle(store.local.use('header-invert'))
  const [grayscale, toggleGrayscale] = asToggle(store.local.use('header-grayscale'))
  const [solarize, toggleSolarize] = asToggle(store.local.use('header-solarize', { default: false }))

  const path = decodeURIComponent(useLogicalPath())
  const crumbs = useM(path, () => {
    let total = ''
    const crumbs = []
    path.split('/').filter(p=>p).forEach(part => {
      total += '/' + part
      crumbs.push(total)
    })
    return crumbs
  })

  const [icon_href] = meta.icon.use()
  meta.install.use()
  
  const page_actions_control:any = { close:()=>{} }
  useF(expand, path, () => page_actions_control.close())

  useStyle(expand && `
  #main {
    width: 100%;
  }
  `)
  useStyle(invert, grayscale, solarize, `
  :root {
    ${solarize ? css.mixin.solarize : ''}
    filter: ${[invert&&`invert(1)`,grayscale&&`grayscale(1)`,solarize&&`var(--filter)`].filter(truthy).join(' ')};
  }
  `)
  return (
    <Style id="header">
      {hide_ui ? null : <>
      <div className='nav'>
        <Dropdown expand={expand && 0} control={page_actions_control} label={<>{expand
          ? <ExpandIcon onClick={e => auth.set({...auth.get(), expand:!expand })} />
          : <img id='home' src={icon_href as string /*TODO*/} style={S(`
          aspect-ratio: 1/1;
          // margin-right: .25em;
          // box-shadow: 0 0 0 1px var(--id-color-text);
          border-radius: 2px;
          border-radius: 0;
          // margin: 1px;
  
          z-index: 1;
          background: #fff;

          background: var(--id-color);
          border: .5px solid var(--id-color-text);

          `)} />}{useM(expand, () => expand ? null : <a className='center-row' style={S(`
          line-height:0;padding-right:5px;text-shadow:${range(0).map(i => `${i}px 0 currentcolor`).join(', ')};
          position: relative; width: 0; left: calc(-1.15em); top: -1.5px; padding: 0 !important; text-decoration: none;
          // color: #fffa; mix-blend-mode: difference;
          // color: #fff; 
          pointer-events: none;
  
          // font-size: 1.35em !important;
          position: relative !important; top: unset; left: unset; width: unset; height: 0;
          // top: -.5em; 
          // top: -.075em;
          // margin-right: .125em;
          font-family: system-ui;
          margin-left: 2px;
          `)}>{'☜'}</a>)}</>} dropdown_style={S(`
          ${devices.is_mobile ? `font-size: max(1em, 16px);` : ''}
          `)}>
          {/* <hr /> */}
          <A href='/'>home</A>
          <a onClick={e => {
            const AppIconTile = ({
              name,
              img,
              close,
            }) => {
              return <A href={`/${name}`} onClick={close} style={S(`
              position: relative;
              height: 3em;
              width: 3em;
              `)}>
                <img src={img} style={S(`
                height: 100%; width: 100%;
                image-rendering: pixelated;
                border: 1px solid #fff;
                background: #fff;
                image-rendering: pixelated;
                `)} />
                <b style={S(`
                position: absolute;
                bottom: 2px; right: 2px;
                background: #000; color: #fff;
                font-size: .33em;
                
                max-width: 100%;
                white-space: normal;
                text-align: right;
                `)}>/{name}</b>
              </A>
            }
            openPopup(close => <InfoStyles style={S(`
            background: #000 !important;
            `)}>
              <InfoBody>
                <div className='flex row wrap' style={S(`
                gap: .5em;
                padding: .5em;
                max-width: 11em;
                font-size: min(7vw, 48px);
                `)}>
                  {entries({
                    'greeter': 'https://freshman.dev/raw/greeter/icon.png',
                    'lettercomb': 'https://freshman.dev/raw/capitals/icon.png',
                    'letterpress': 'https://freshman.dev/raw/letterpress/icon.png',
                    'wordbase': 'https://freshman.dev/raw/wordbase/icon.png',
                    // 'selfchat': 'https://freshman.dev/raw/chat/icon.png',
                    'apple-orange-banana': 'https://freshman.dev/raw/apple-orange-banana/icon.png',
                    'cowork': 'https://freshman.dev/raw/cowork/icon.png',
                    'light': 'https://freshman.dev/raw/light/icon.png',
                    'vibe': 'https://freshman.dev/raw/vibe/icon-2.png',
                    'settings': 'https://freshman.dev/raw/settings/icon.png',
                  }).map(([name, img]) => <AppIconTile {...{ name, img, close }} />)}
                </div>
                <div className='row wide end'>
                  <div style={S(`
                  color: #fff;
                  `)}>
                    TAP OUTSIDE TO CLOSE
                  </div>
                </div>
              </InfoBody>
            </InfoStyles>, `
            height: max-content;
            width: max-content;
            background: #000 !important;
            padding: 0;
            border: 1px solid #fff;
            `)
          }}>launcher</a>
          <A href='/search'>
            <Tooltip of={'(⌘+/)'} position='right' style={S(`text-decoration:inherit;${css.mixin.center_row};${css.mixin.inline}`)} tooltipStyle={S(`
            margin:0;border:0;padding:0;background:0;color:#fff;
            `)}>search</Tooltip>
          </A>
          <hr/>
          <a onClick={e => auth.set({...auth.get(), expand:!expand })}>
            <Tooltip of={'(Esc)'} position='right' style={S(`text-decoration:inherit;${css.mixin.center_row};${css.mixin.inline}`)} tooltipStyle={S(`
            margin:0;border:0;padding:0;background:0;color:#fff;
            `)}>{expand ? 'unfull' : 'full'}</Tooltip>
          </a>
          {embedded
          ? <A href={typeof(embedded) === 'string' ? location.origin+embedded : `${location.origin}/raw${crumbs[0]}${location.hash}`}>html</A>
          : ''}
          {mobile ? null : <>
            <A href='/frames' className='item' onClickCapture={e => {
              if (!e.metaKey && !is_mobile) {
                e.stopPropagation()
                e.preventDefault()
                const close = openFrame({
                  href: location.pathname.replace(/^\/-*/, '/-'),
                  options: {
                    additive: true,
                    persist: true,
                  },
                })
                // url.once(close)
              }
            }}>frame</A>
            <span className='item' onClickCapture={e => {
              url.popup(location.href.replace(location.origin + '/-', location.origin + '/').replace(location.origin + '/', location.origin + '/-'))
            }}>popup</span>
          </>}
          <hr/>
          <span><a onClick={toggleInvert}>invert</a>{invert?' •':null}</span>
          <span><a onClick={toggleGrayscale}>grayscale</a>{grayscale?' •':null}</span>
          <span><a onClick={toggleSolarize}>solarize</a>{solarize?' •':null}</span>
          <hr/>
          <div style={S(`
          display: flex;
          width: 100%;
          padding: calc(.5 * var(--item-padding)) var(--item-padding);
          position: relative;
          `)}>
            <img src={icon_href as string} style={S(`
            width: 100%;
            background: #fff;
            border: 1px solid #fff;
            image-rendering: pixelated;
            `)} />
            <span style={S(`
            position: absolute;
            bottom: 0;
            right: 0;
            margin: calc(.5 * var(--item-padding) + 2px) calc(var(--item-padding) + 2px);
            background: #000e;
            color: #fff;
            font-size: .67em;
            text-transform: none;

            max-width: 100%;
            white-space: normal;
            text-align: right;
            `)}>{crumbs[0]}</span>
          </div>
          <a onClick={() => message.trigger({text: <InfoStyles>
            <InfoBody style={S(`
            font-family: monospace;
            display: flex;
            flex-direction: column;
            `)}>
              <span>{parseLogicalPath()} uses:</span>
              {Object.entries(meta.uses.get()).map(([name, v]) => [name, typeof v === 'string' ? [v, false] : v]).map(([name, [site, code]]:[string,[string,string|false]]) => <span key={name}>{name} ({Object.entries(code ? {site,code} : {link:site}).filter(x=>x[1]).map(([k,v],i)=><>{i>0?', ':''}<A href={'http://'+v}>{k}</A></>)})</span>)}
              <span>(may be incomplete)</span>
            </InfoBody>
          </InfoStyles>})}>uses</a>
          <a onClick={() => openFeedback({ prefill:`feedback on /${parsePage()}: ` })}>feedback</a>
          {/* {meta.install.value ? <a onClick={()=>meta.install.value.prompt()}>install</a> : null} */}
          {/* {popup
          ? <a onClick={e => open(location.href.replace('/'+parsePage(), '/-'+parsePage()), '_blank', 'popup,' + (popup === true ? '' : popup))}>popup</a>
          : ''} */}
          {/* <a>© 2023 <a href='https://freshman.dev'>FRESHMAN.DEV</a> <span>LLC</span></a> */}
          <hr/>
          <DropdownTrackPlayerFill />
          {/* <a href='https://freshman.dev'>© 2023<br/>FRESHMAN<br/>.DEV LLC</a> */}
          <span>© 2024<br/>CYRUS<br/>FRESHMAN</span>
        </Dropdown>
        <div id='crumbs'>
          {crumbs.map((crumb, i, a) =>
          <A href={crumb} key={crumb} className='crumb' frame={''} onClick={i === a.length - 1 ? e => {
            e.preventDefault()
            e.stopPropagation()
            if (!e.metaKey) {
              copy(location.origin + a[i], e.target, undefined, '/copied!')
            }
          } : undefined}>
            /{crumb.split('/').pop().replace(/\+/g, ' ')}
          </A>)}
        </div>
      </div>
      <User {...{ expand }} />
      </>}
    </Style>)
}

const Style = styled.div`
a { text-decoration: none; }

width: 100%;
padding: .25rem;
display: flex;
flex-direction: row;
align-items: center;
justify-content: space-between;
position: relative;
background: #131125;
font-size: max(.9rem, 10pt);

color: black;
background: white;

// border-bottom: 1px solid var(--id-color-text) !important;

> div {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
}

.nav {
  user-select: none;
  flex-grow: 1;
  width: 0;
  flex-wrap: nowrap;
  text-overflow: ellipsis;
  background: inherit;
  margin-right: 1em;
  #crumbs {
    flex-shrink: 1;
    overflow: hidden;
    margin-right: .125em;
    a {
      color: inherit;
    }
  }
  #projects {
    display: inline-flex;
    align-items: center;
    #home {
      height: 1.5em;
      width: 1.5em;
      &.profile-true {
        // border-radius: 50%;
      }
      background: none;
      border: 0;

      margin-right: .125rem;
    }
    div#home {
      background-attachment: fixed;
      background-clip: content-box;
      border-radius: .3em;

      position: relative;
      display: flex;
      align-items: center; justify-content: center;
      &::before, &::after {
        content: "";
        position: absolute;
        width: 67%; height: 67%;
        border-radius: inherit;
      }
      &::before {
        background: currentColor fixed;
        translate: 16.67% 16.67%;
        border: 1px solid currentColor;
        color: var(--icon);
      }
      &::after {
        border: 1px solid black;
        background: inherit;
      }
    }
    &:hover #home {
      // filter: brightness(1.15);
    }
  }
  a {
    white-space: nowrap;
    // color: var(--light);
    // text-shadow: 1px 2px 4px #00000020;
    // padding-left: .25rem;
    // &:first-child { padding-right: .25rem; }
    text-decoration: none;
    &:hover { text-decoration: underline }
  }

  .expand-false .dropdown-label {
    // margin-right: .25em !important;
    // padding: 0 .125em;
    border: 0 solid transparent;
    border-width: .05em .125em;
    border-width: 1px;
    padding: 0 !important;
    > :first-child {
      // margin-right: 0 !important;
    }
    > :nth-child(2) {
      // position: absolute !important;
      // left: 2px !important;
    }
    &:hover {
      // filter: invert(1);
      // color: #000;
      background: var(--id-color-text);
      color: var(--id-color-text-readable);
      // img { filter:invert(1) }
      > :first-child {
        // z-index: -1;
      }
      > * {
        z-index: 1;
      }
      &::after {
        // content: "";
        position: absolute; height: calc(100% - 2px); top: -1px; left: -1px;
        background: var(--id-color);
        // border: 2px solid var(--id-color-text) !important;
        border: 2px solid var(--id-color) !important;

        margin-right: 0.25em;
        border-radius: 0px;
        aspect-ratio: 1 / 1;
        z-index: 0;

        margin: 0;
        width: calc(100% - 2px);
      }
      > a {
        // opacity: .875;
      }
    }
  }
}

.dropdown {
  .item {
    &:not(.info):hover { text-decoration: underline; cursor: pointer; }
    &.signin {
      display: flex;
      justify-content: space-between;
      span:hover { text-decoration: underline; cursor: pointer; }
    }
  }

  .hydrated-switch {
    font-size: .8em !important;
    margin: calc(.1em / .8) 0 !important;
    border-color: var(--id-color-text) !important;
    cursor: pointer !important;
  }
}
`

const ExpandIcon = ({ ...props }) => <svg {...props} style={S(`
height: 1em; width: 1em;
color: var(--id-color-text);
`)} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" xmlSpace="preserve">            
<path d="M320.106,172.772c0.031,0.316,0.09,0.622,0.135,0.933c0.054,0.377,0.098,0.755,0.172,1.13
  c0.071,0.358,0.169,0.705,0.258,1.056c0.081,0.323,0.152,0.648,0.249,0.968c0.104,0.345,0.234,0.678,0.355,1.015
  c0.115,0.319,0.22,0.641,0.35,0.956c0.131,0.315,0.284,0.618,0.43,0.925c0.152,0.323,0.296,0.65,0.466,0.967
  c0.158,0.294,0.337,0.574,0.508,0.86c0.186,0.311,0.362,0.626,0.565,0.93c0.211,0.316,0.447,0.613,0.674,0.917
  c0.19,0.253,0.365,0.513,0.568,0.759c0.892,1.087,1.889,2.085,2.977,2.977c0.246,0.202,0.506,0.378,0.759,0.567
  c0.304,0.228,0.601,0.463,0.918,0.675c0.303,0.203,0.618,0.379,0.929,0.565c0.286,0.171,0.566,0.351,0.861,0.509
  c0.317,0.17,0.644,0.314,0.968,0.466c0.307,0.145,0.609,0.298,0.924,0.429c0.315,0.13,0.637,0.236,0.957,0.35
  c0.337,0.121,0.669,0.25,1.013,0.354c0.32,0.097,0.646,0.168,0.969,0.249c0.351,0.089,0.698,0.187,1.055,0.258
  c0.375,0.074,0.753,0.119,1.13,0.173c0.311,0.044,0.617,0.104,0.932,0.135c0.7,0.069,1.403,0.106,2.105,0.106H448
  c11.782,0,21.333-9.551,21.333-21.333c0-11.782-9.551-21.333-21.333-21.333h-55.163L505.752,36.418
  c8.331-8.331,8.331-21.839,0-30.17c-8.331-8.331-21.839-8.331-30.17,0L362.667,119.163V64c0-11.782-9.551-21.333-21.333-21.333
  C329.551,42.667,320,52.218,320,64v106.667c0,0,0,0.001,0,0.001C320,171.37,320.037,172.072,320.106,172.772z"></path>
<path d="M170.667,42.667c-11.782,0-21.333,9.551-21.333,21.333v55.163L36.418,6.248c-8.331-8.331-21.839-8.331-30.17,0
  c-8.331,8.331-8.331,21.839,0,30.17l112.915,112.915H64c-11.782,0-21.333,9.551-21.333,21.333C42.667,182.449,52.218,192,64,192
  h106.667c0.703,0,1.405-0.037,2.105-0.106c0.316-0.031,0.622-0.09,0.933-0.135c0.377-0.054,0.755-0.098,1.13-0.172
  c0.358-0.071,0.705-0.169,1.056-0.258c0.323-0.081,0.648-0.152,0.968-0.249c0.345-0.104,0.678-0.234,1.015-0.355
  c0.319-0.115,0.641-0.22,0.956-0.35c0.315-0.131,0.618-0.284,0.925-0.43c0.323-0.152,0.65-0.296,0.967-0.466
  c0.295-0.158,0.575-0.338,0.862-0.509c0.311-0.185,0.625-0.361,0.928-0.564c0.317-0.212,0.615-0.448,0.92-0.676
  c0.252-0.189,0.511-0.364,0.757-0.566c1.087-0.892,2.084-1.889,2.977-2.977c0.202-0.246,0.377-0.505,0.566-0.757
  c0.228-0.305,0.464-0.603,0.676-0.92c0.203-0.303,0.378-0.617,0.564-0.928c0.171-0.286,0.351-0.567,0.509-0.862
  c0.17-0.317,0.313-0.643,0.466-0.967c0.145-0.307,0.299-0.61,0.43-0.925c0.13-0.315,0.235-0.636,0.35-0.956
  c0.121-0.337,0.25-0.67,0.355-1.015c0.097-0.32,0.168-0.645,0.249-0.968c0.089-0.351,0.187-0.698,0.258-1.056
  c0.074-0.375,0.118-0.753,0.172-1.13c0.044-0.311,0.104-0.618,0.135-0.933c0.069-0.7,0.106-1.402,0.106-2.104
  c0,0,0-0.001,0-0.001V64C192,52.218,182.449,42.667,170.667,42.667z"></path>
<path d="M191.894,339.228c-0.031-0.316-0.09-0.622-0.135-0.933c-0.054-0.377-0.098-0.755-0.172-1.13
  c-0.071-0.358-0.169-0.705-0.258-1.056c-0.081-0.323-0.152-0.648-0.249-0.968c-0.104-0.345-0.234-0.678-0.355-1.015
  c-0.115-0.319-0.22-0.641-0.35-0.956c-0.131-0.315-0.284-0.618-0.43-0.925c-0.152-0.323-0.296-0.65-0.466-0.967
  c-0.158-0.295-0.338-0.575-0.509-0.862c-0.185-0.311-0.361-0.625-0.564-0.928c-0.212-0.317-0.448-0.615-0.676-0.92
  c-0.189-0.252-0.364-0.511-0.566-0.757c-0.892-1.087-1.889-2.084-2.977-2.977c-0.246-0.202-0.505-0.377-0.757-0.566
  c-0.305-0.228-0.603-0.464-0.92-0.676c-0.303-0.203-0.617-0.378-0.928-0.564c-0.286-0.171-0.567-0.351-0.862-0.509
  c-0.317-0.17-0.643-0.313-0.967-0.466c-0.307-0.145-0.61-0.299-0.925-0.43c-0.315-0.13-0.636-0.235-0.956-0.35
  c-0.337-0.121-0.67-0.25-1.015-0.355c-0.32-0.097-0.645-0.168-0.968-0.249c-0.351-0.089-0.698-0.187-1.056-0.258
  c-0.375-0.074-0.753-0.118-1.13-0.172c-0.311-0.044-0.618-0.104-0.933-0.135c-0.7-0.069-1.403-0.106-2.105-0.106H64
  c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h55.163L6.248,475.582
  c-8.331,8.331-8.331,21.839,0,30.17c8.331,8.331,21.839,8.331,30.17,0l112.915-112.915V448c0,11.782,9.551,21.333,21.333,21.333
  c11.782,0,21.333-9.551,21.333-21.333V341.333c0,0,0-0.001,0-0.001C192,340.63,191.963,339.928,191.894,339.228z"></path>
<path d="M392.837,362.667H448c11.782,0,21.333-9.551,21.333-21.333c0-11.782-9.551-21.333-21.333-21.333H341.333
  c-0.703,0-1.405,0.037-2.105,0.106c-0.315,0.031-0.621,0.09-0.932,0.135c-0.378,0.054-0.756,0.098-1.13,0.173
  c-0.358,0.071-0.704,0.169-1.055,0.258c-0.324,0.081-0.649,0.152-0.969,0.249c-0.344,0.104-0.677,0.233-1.013,0.354
  c-0.32,0.115-0.642,0.22-0.957,0.35c-0.315,0.131-0.617,0.284-0.924,0.429c-0.324,0.153-0.65,0.296-0.968,0.466
  c-0.295,0.158-0.575,0.338-0.861,0.509c-0.311,0.186-0.626,0.362-0.929,0.565c-0.316,0.212-0.614,0.447-0.918,0.675
  c-0.253,0.19-0.512,0.365-0.759,0.567c-1.087,0.892-2.085,1.889-2.977,2.977c-0.202,0.246-0.378,0.506-0.568,0.759
  c-0.227,0.304-0.463,0.601-0.674,0.917c-0.203,0.304-0.379,0.619-0.565,0.93c-0.171,0.286-0.351,0.566-0.508,0.86
  c-0.17,0.317-0.313,0.643-0.466,0.967c-0.145,0.307-0.299,0.61-0.43,0.925c-0.13,0.315-0.235,0.636-0.35,0.956
  c-0.121,0.337-0.25,0.67-0.355,1.015c-0.097,0.32-0.168,0.645-0.249,0.968c-0.089,0.351-0.187,0.698-0.258,1.056
  c-0.074,0.374-0.118,0.753-0.172,1.13c-0.044,0.311-0.104,0.618-0.135,0.933c-0.069,0.7-0.106,1.402-0.106,2.104
  c0,0,0,0.001,0,0.001V448c0,11.782,9.551,21.333,21.333,21.333c11.782,0,21.333-9.551,21.333-21.333v-55.163l112.915,112.915
  c8.331,8.331,21.839,8.331,30.17,0c8.331-8.331,8.331-21.839,0-30.17L392.837,362.667z"></path></svg>