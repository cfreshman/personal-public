import React, { useState } from 'react';
import styled from 'styled-components';
import api, { auth } from '../../../lib/api';
import { useInput } from '../../../lib/hooks';
import { S, is_mobile } from 'src/lib/util';
import { A } from '../../A';

export const Contact = ({ newStyles=false, prefill='' }) => {
  const [content, setContent, contentProps] = useInput(prefill)
  const [contact, setContact, contactProps] = useInput('')
  auth.use(x => x.user && setContact(`u/${x.user}`))

  const [{token}] = auth.use()

  const [sent, setSent] = useState(false)
  const handle = {
    send: e => {
      if (content) {
        api
        .post('/contact', {
          content,
          contact,
          domain: location.host,
          token,
        })
        .catch(() => setSent(false))
        setSent(true)
      }
    },
  }

  return <Style id='contact-container' className={sent ? 'sent' : ''}>
    <textarea className='content' {...contentProps}
      placeholder='your message'
      rows='10'
      // placeholder='send me a message  :-)'
      />
    <input type='text' className='contact' {...contactProps}
      placeholder='your contact'
      spellCheck='false'
      onKeyDown={e => e.key === 'Enter' && handle.send()}
      />

    <div style={S(`
    display: flex;
    width: 100%;
    justify-content: space-between;
    flex-direction: column-reverse; align-items: flex-end;
    `)}>
      <span style={S(`text-align: right`)}>or&nbsp;&nbsp;<A tab href="mailto:cyrus@freshman.dev">just email cyrus@freshman.dev</A></span>
      {/* <span style={S(`text-align: right`)}>or&nbsp;&nbsp;<A tab href="https://meetings.hubspot.com/cyrus-freshman">schedule a meeting</A></span> */}
      {/* <span style={S(`text-align: right`)}>or&nbsp;&nbsp;<A tab href="https://freshman.dev/schedule">schedule a meeting</A></span> */}
      {/* <span style={S(`text-align: right`)}>or&nbsp;&nbsp;<A tab href="https://freshman.dev/feedback">leave detailed feedback</A></span> */}
      <span style={S(`text-align: right`)}>or&nbsp;&nbsp;<A tab href="https://freshman.dev/feedback">submit a bug / feature</A></span>
      <span style={S(`text-align: right`)}>or&nbsp;&nbsp;<A tab href="https://freshman.dev/discord">join the discord</A></span>
      {/* <span style={S(`text-align: right`)}>also</span> */}
      <br/>
      {newStyles
      ?
        <a className='send-new' onClick={handle.send}>{sent ? 'sent' : 'send message'}</a>
      :
      sent
        ? <div className='confirmation'>sent!</div>
        : <button className='send' onClick={handle.send}>send</button>
      }
      {newStyles ? <style>{`
      .content.content, .contact.contact {
        margin: 0 !important;
      }
      `}</style> : null}
    </div>
  </Style>
}


// this is a mess, it includes old styles I'd rather not clean up right now
const Style = styled.div`
  display: flex;
  flex-direction: column;
  font-size: .8em;

  &#contact-container#contact-container#contact-container.sent :is(.content, .contact, .send, .send-new, .confirmation) {
    opacity: .5 !important;
    &:focus {
      outline: none !important;
    }
    pointer-events: none !important;
  }

  & * {
    color: var(--light);
    text-shadow: 1px 2px 4px #00000020;
  }

  gap: .5em;
  & > * {
    border-radius: .2em;
    &:focus {
      outline-color: var(--light);
    }
  }

  & .content, & .contact {
    border: none;
    background: #010113; //#090919; // #06060f
    padding: .4em;
    resize: none;
    text-shadow: none;

    &::placeholder {
      color: inherit;
      opacity: .7;
      // color: #58556e;
      // text-align: center;
      font-size: .725em;
    }
    &:focus-within:not([readonly])::placeholder { visibility: hidden }
  }
  & .content::placeholder {
    padding-top: 4em;
  }

  & .send, & .confirmation {
    align-self: flex-end;
    background: none;
    line-height: normal;
    border: none;
    padding: .15rem 0;
    margin-bottom: -.15rem;
    background: #010113;
    border-radius: .2rem;
    &::before {
      content: "[ ";
    }
    &::after {
      content: " ]";
    }
    font-size: 1.25em;
  }
  & .send:hover {
    // text-decoration: underline;
    color: var(--bg);
    background: var(--light);
    border-radius: 0;
    text-decoration: none;
    cursor: pointer;
  }
  & .confirmation {
    cursor: default;
  }
`