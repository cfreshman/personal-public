import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'

const { named_log } = window as any
const NAME = 'template'
const log = named_log(NAME)

export default () => {
  useF(() => store.local.set('cookies', true))

  usePageSettings({
    professional:true,
  })
  return <Style>
    <InfoBody>
      <InfoSection>
        <b>this site stores info on your device for login and project functionality</b>
        <span>see <a href="https://gdpr.eu/cookies#:~:text=to%20the%20user.-,Preferences%20cookies,-%E2%80%94%20Also%20known%20as" target="_blank" rel="noreferrer">gdpr.eu/cookies</a> (first-party functionality cookies)</span>
        <HalfLine />
        <b>current items:</b>
        <div style={S(`
        overflow-x: scroll;
        width: 100%;
        `)}>{Object.keys(localStorage).length
          ? Object.entries(Object.assign({}, localStorage)).map(([k, v]) =>
          <div key={k} style={S("white-space:pre;font-size:.8em")}>
            <span>{k}</span>
            &nbsp;&nbsp;
            <span style={S('opacity:.5')}>
              {k === 'loginAuth' ? '(hidden for your security - DO NOT SHARE THIS COOKIE. it includes a unique token (which allows you to stay signed in on this device) that someone else could use to sign into your account if shared)' : JSON.stringify(v, null, 2)}
            </span>
          </div>)
          : <span>(empty - <a onClick={() => location.reload()}>reload</a> to see new cookies)</span>}
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const common_css = `
input, select {
  height: 1.5em;
  font-size: 1em;
  border: 1px solid currentcolor;
  border-radius: .25em;
  &[type=number] {
    max-width: 5em;
  }
}

ul {
  padding-left: 1em;
}

button {
  color: var(--id-color-text);
  border-radius: 10em;
  border: 1px solid var(--id-color-text);
  box-shadow: 0 1px var(--id-color-text);
  min-width: 2em;
  display: flex; align-items: center; justify-content: center;
  translate: 0 -1px;
  &:not(:disabled) {
    cursor: pointer;
    &:active, &.active {
      translate: 0;
      box-shadow: none;
    }
  }
  &:disabled {
    cursor: default;
    color: #888;
    // background: #ccc;
  }
  line-height: 1.3em;
}

--id-color: #eee;
--id-color-text: #222;
--id-color-text-readable: #eee;
background: var(--id-color) !important;
color: var(--id-color-text) !important;
padding: .5em;
font-family: monospace;
`
const Style = styled(InfoStyles)`
margin: .5em;
width: calc(100% - 1em);
height: calc(100% - 1em);
border: 1px solid #000;
border-radius: .25em;

${common_css}

box-shadow: none !important; /* to undo expand style (bad code) */
`
const PopupStyle = styled(InfoStyles)`
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);
${common_css}
`