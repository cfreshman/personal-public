import React from 'react';
import styled from 'styled-components';
import { InfoBody, InfoStyles } from '../components/Info';
import { auth } from '../lib/auth';
import { useF } from '../lib/hooks';
import { store } from '../lib/store';
import { toStyle } from '../lib/util';


export default () => {
  useF(() => store.local.set('cookies', true))
  auth.use()
  return <Style>
    <InfoBody>
      <u>Cookie Notice</u>
      <br/><br/>
      This site stores info on your device for login and project functionality
      <br/><br/>
      See <a href="https://gdpr.eu/cookies#:~:text=to%20the%20user.-,Preferences%20cookies,-%E2%80%94%20Also%20known%20as" target="_blank" rel="noreferrer">gdpr.eu/cookies</a> (first-party functionality cookies)
      <br/><br/>
      Current items:
      <div style={toStyle(`
      overflow-x: scroll;
      max-width: 50rem;
      `)}>{Object.keys(localStorage).length
        ? Object.entries(Object.assign({}, localStorage)).map(([k, v]) =>
        <div key={k} style={toStyle("white-space:pre;font-size:.8em")}>
          &nbsp;
          <span>{k}</span>
          &nbsp;&nbsp;
          <span style={toStyle('opacity:.5')}>
            {k === 'loginAuth' ? '(hidden for your security - DO NOT SHARE THIS COOKIE. it includes a unique token (which allows you to stay signed in on this device) that someone else could use to sign into your account if shared)' : JSON.stringify(v, null, 2)}
          </span>
        </div>)
        : <span>(empty - <a onClick={() => location.reload()}>reload</a> to see new cookies)</span>}
      </div>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.body {
  white-space: pre-wrap;

  a {color:inherit}
}
`