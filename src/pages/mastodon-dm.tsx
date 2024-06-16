import React, { useState } from 'react';
import { usePageSettings } from '../lib/hooks_ext';
import styled from 'styled-components';
import { CodeBlock, Comment, InfoBody, InfoCheckbox, InfoEntry, InfoGroup, InfoLabel, InfoSection, InfoStyles } from '../components/Info';
import { auth, useHideLogin } from '../lib/auth';
import { Conditions } from '../lib/conditions';
import { copy } from '../lib/copy';
import { useF, useR } from '../lib/hooks';
import { JSX, pass } from '../lib/types';
import { S, toStyle } from '../lib/util';
import { trigger } from '../lib/trigger';
import { store } from '../lib/store';


export default () => {
  usePageSettings({
    hideLogin: true,
    background: '#fff',
  })
  const mastodonPlaceholder = `@user@mastodon.example`
  const [mastodon, setMastodon] = store.local.use('mastodon-dm-mastodon', { default: '' })
  const [message, setMessage] = store.local.use('mastodon-dm-message', { default: '' })
  const [follow, setFollow] = store.local.use('mastodon-dm-follow', { default: '' })

  const match = /^@([^@ ]+)@(([^@ ]+)+\.[^@ ]{2,}$)/.exec(mastodon)
  let user, server, dm
  if (match) {
      [user, server] = match.slice(1)
      // dm = `https://${server}/share?visibility=direct&text=${mastodon}%20${encodeURIComponent(message)}`
      dm = follow
        ? `https://mastodon.freshman.dev/authorize_follow?resolve=true&uri=${encodeURIComponent(`https://${server}/@${user}`)}`
        : `https://mastodon.freshman.dev/share?resolve=true&visibility=direct&text=${mastodon}%20${encodeURIComponent(message)}`
  }

  const buttonPlaceholder = 
    `${follow ? 'Follow' : 'Message'} ${match ? mastodon : mastodonPlaceholder}`
  const [buttonText, setButtonText] = store.local.use('mastodon-dm-button-text', { default: '' })
  const [buttonIcon, setButtonIcon] = store.local.use('mastodon-dm-button-icon', { default: true })
  const [buttonDark, setButtonDark] = store.local.use('mastodon-dm-button-icon', { default: false })
  const [buttonOnMastodon, setButtonOnMastodon] = useState(!buttonIcon)
  const buttonRef = useR()

  const displayedButtonText = buttonText || buttonPlaceholder
  const button = <a ref={buttonRef} href={dm} target='_blank' rel='noreferrer' className='mastodon-dm-button' style={toStyle(`
  background-color: #6d6eff;
  color: #000;
  ${buttonDark
  ? `
  background-color: #595aff;
  color: #fff;
  ` :''}
  border: 10px;
  border-radius: 4px;
  box-sizing: border-box;
  cursor: pointer;
  display: inline-block;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 22px;
  overflow: hidden;
  padding: 7px 18px;
  position: relative;
  text-align: center;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: auto;

  color: white;
  font-family: system-ui, sans-serif;
  display: inline-flex;
  align-items: center;
  user-select: none;
  `)}>
    {buttonIcon
    ?
    <>
      <svg xmlns="http://www.w3.org/2000/svg" height="22px" width="22px" fill="currentColor" viewBox="0 0 16 16">
        <path d="M11.19 12.195c2.016-.24 3.77-1.475 3.99-2.603.348-1.778.32-4.339.32-4.339 0-3.47-2.286-4.488-2.286-4.488C12.062.238 10.083.017 8.027 0h-.05C5.92.017 3.942.238 2.79.765c0 0-2.285 1.017-2.285 4.488l-.002.662c-.004.64-.007 1.35.011 2.091.083 3.394.626 6.74 3.78 7.57 1.454.383 2.703.463 3.709.408 1.823-.1 2.847-.647 2.847-.647l-.06-1.317s-1.303.41-2.767.36c-1.45-.05-2.98-.156-3.215-1.928a3.614 3.614 0 0 1-.033-.496s1.424.346 3.228.428c1.103.05 2.137-.064 3.188-.189zm1.613-2.47H11.13v-4.08c0-.859-.364-1.295-1.091-1.295-.804 0-1.207.517-1.207 1.541v2.233H7.168V5.89c0-1.024-.403-1.541-1.207-1.541-.727 0-1.091.436-1.091 1.296v4.079H3.197V5.522c0-.859.22-1.541.66-2.046.456-.505 1.052-.764 1.793-.764.856 0 1.504.328 1.933.983L8 4.39l.417-.695c.429-.655 1.077-.983 1.934-.983.74 0 1.336.259 1.791.764.442.505.661 1.187.661 2.046v4.203z"/>
        <Comment text={'https://icons.getbootstrap.com/icons/mastodon'} />
        <Comment text={`
        The MIT License (MIT)

        Copyright (c) 2019-2021 The Bootstrap Authors

        Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

        The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
        `} />
      </svg>
      {displayedButtonText.trim() ? <>&nbsp;&nbsp;</> : ''}
    </>
    :''}
    {displayedButtonText ? displayedButtonText.trim() : 'Message me'}
    {buttonOnMastodon ? ' on Mastodon' : false}
  </a>
  const [buttonHtml, setButtonHtml] = useState('')
  useF(mastodon, message, buttonText, buttonIcon, buttonOnMastodon, buttonDark, () => setButtonHtml(buttonRef.current?.outerHTML))

  useF(() => setTimeout(() => (document.querySelector('#main input') as any)?.focus(), 250))

  return <Style className={buttonDark ? 'style-dark' : ''}>
    <InfoBody>
      <InfoSection labels={[follow ? 'link to follow on Mastodon' : 'link to Mastodon DM']}>
        <input type='text' placeholder={mastodonPlaceholder}
        value={mastodon}
        onChange={e => {
          let at = e.target.value
          let start = e.target.selectionStart
          if (at && at[0] !== '@') {
            at = '@'+at
            start += 1
          }
          setMastodon(at)
          setTimeout(() => e.target.selectionStart = start)
        }}
        />
        <InfoGroup>
          <InfoCheckbox group='mastodon-dm-intent' initial={!follow} onChange={e => setFollow(!e.target.checked)}>
            message
          </InfoCheckbox>
          <InfoCheckbox group='mastodon-dm-intent' initial={follow} onChange={e => setFollow(e.target.checked)}>
            follow
          </InfoCheckbox>
        </InfoGroup>
        {follow ? null : 
        <textarea placeholder='Optional message' rows={5}
        value={message}
        onChange={e => setMessage(e.target.value)}
        />}
      </InfoSection>
      <InfoSection labels={['result']}>
        <div className='mastodon-dm-link'>
          {dm
          ? <a href={dm}>{dm}</a>
          : `(enter valid Mastodon @ to generate ${follow ? 'follow' : 'DM'} link)`}
        </div>
        {dm
        ?
        <>
          <button onClick={(e: any) => {
            copy(dm,
              e.target, undefined, 'copied')
          }}>copy link</button>
          <br/>
        </>
        :''}
      {/* </InfoSection>
      <InfoSection labels={['html button']}> */}
        <br/>
        {dm
        ?
        <>
          <div className=''>
            {button}
          </div>
          <div>
            <button onClick={(e: any) => {
              copy(buttonHtml).then(x => {
                e.target.textContent = 'copied'
                setTimeout(x => {
                  e.target.textContent = 'copy HTML button'
                }, 1500)
              })
            }}>copy HTML button</button>
            {/* &nbsp;
            <button onClick={(e: any) => {
              copy(`${location.origin.replace(':300', ':500')}/api/mastodon-dm?image&${new URLSearchParams({
                mastodon,
                icon: buttonIcon ? '1' : '',
                text: buttonText,
                on: buttonOnMastodon ? '1' : '',
              })}`).then(x => {
                e.target.textContent = 'copied'
                setTimeout(x => {
                  e.target.textContent = 'copy image link'
                }, 1500)
              })
            }}>copy image link</button> */}
          </div>
          <br/>
        </>
        :
        <>
          {button}
        </>}
      </InfoSection>
      <br/>
      {dm
      ?
      <InfoSection labels={['details']}>
        {dm
        ?
        <>
          <InfoGroup>
            <InfoCheckbox initial={buttonIcon} onChange={e => setButtonIcon(e.target.checked)}>
              icon
            </InfoCheckbox>
            <InfoCheckbox initial={buttonOnMastodon} onChange={e => setButtonOnMastodon(e.target.checked)}>
              on Mastodon
            </InfoCheckbox>
            <InfoCheckbox initial={buttonDark} onChange={e => setButtonDark(e.target.checked)}>
              dark
            </InfoCheckbox>
          </InfoGroup>
          <input type='text' placeholder={`${buttonPlaceholder}`}
          value={buttonText}
          onChange={e => setButtonText(e.target.value)}
          />
        </>
        :''}
        <code>
          {buttonHtml}
        </code>
      </InfoSection>
      :''}
      <InfoSection labels={[
        'how does it work',
        // { 'how does it work': () => store.memo.set('mastodon-dm-how', !store.memo.get('mastodon-dm-how')) },
      ]}>
        This doesn't store any data.
        <br/>
        <InfoLabel labels={[
          { [`show ${store.memo.single('mastodon-dm-how').use()[0] ? 'less' : 'more'}`]: () => store.memo.set('mastodon-dm-how', !store.memo.get('mastodon-dm-how')) },
        ]} />
        {store.memo.single('mastodon-dm-how').use()[0]
        ? <div style={S(`
        white-space: pre;
        font-size: .8em;
        `)}>
DM links (like <code>{'/share?visibility=direct&text=<user>'}</code>) only work for users on your server{'\n'}
I tested a way to redirect users to their own server (with added <code>{'resolve=true'}</code>){'\n'}
(Until Mastodon provides a way to do that){'\n'}
        </div>
        : ''}
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
white-space: pre-line;

&.style-dark {
  background: #222;
  color: #d9e1e8;

  input, textarea {
    background: #fff1;
    color: inherit;
    border-color: #fff2;
    &::placeholder {
      color: #fff4;
    }
  }
}

input[type=text], textarea {
  display: block;
  min-width: 100%;
  margin-bottom: .5em;
}
.mastodon-dm-link {
  font-size: .9em;
  word-break: break-all;
  margin-bottom: .5em;
}
button, .mastodon-dm-button {
  font-size: 1em;
  margin-bottom: .5em;
  cursor: pointer;
}
button a {
  text-decoration: none;
  color: inherit;
}

.centerline {
  display: flex;
  align-items: center;
}

code {
  color: #eee;
  background: #111;
  padding: 2px;
  margin: -2px;

  display: inline-block;
  border-radius: .25em;
}
pre > code {
  padding: .5em;
  display: block;
}
`