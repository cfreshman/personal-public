/*

Messages.tsx

Display stack of temporary or persistent notifications in corner

*/

import { Fragment, useState } from 'react';
import { auth } from '../lib/api';
import styled from 'styled-components';
import { useF, useM, useR, useS, useScript, useTimeout } from '../lib/hooks';
import { parseLogicalPath } from '../lib/page';
import { convertLinksAndHtml, extractScript } from '../lib/render';
import { useSocket } from '../lib/socket';
import { store } from '../lib/store';
import url from '../lib/url';
import user from '../lib/user';
import { InfoBody, InfoLabel, InfoStyles } from './Info';
import { Modal } from './Modal';
import { message } from '../lib/message';
import { JSX } from '../lib/types';
import { S } from 'src/lib/util';
import { Dangerous } from './individual/Dangerous';

const { named_log, defer, set, list, strings } = window as any
const log = named_log('messages')

const url_params = new URLSearchParams(location.search)
const hide_ui = url_params.has('hide-freshman-ui')

const Message = ({ message, outer }: {
  message: string & {
    text?: string, html?: string,
    ms?: number, delay?: number, expire?: number,
    to?: string,
    style?: string,
    delete?: string, replace?: string, require?: string,
    clear?: string,
  }, outer,
}) => {

  const [display, setDisplay] = useState(!message.delay)
  useTimeout(() => setDisplay(true), message.delay)

  useTimeout(() => {
    if (message.expire) outer.delete(message)
  }, message.expire - Date.now())

  const { script, text } = useM(message.text || message, () => extractScript(message.text || message))
  useScript(script, true)

  url.use(path => {
    if (parseLogicalPath() === message.to) {
      outer.delete(message)
    }
  })

  return !display ? <></> : <div className='message' style={typeof(message.style) === 'string' ? S(message.style) : message.style}>
    {message.html ? <Dangerous html={message.html} style={S(`display:flex`)} /> : <div
      onClick={e => {
        if ((e.nativeEvent.target as HTMLElement).tagName === 'A') outer.delete(message)
      }}
      style={{ display: 'inline-block' }}>
      {(typeof(text) === 'string' ? convertLinksAndHtml(text) : text)}
    </div>}
    <InfoLabel labels={[{
      text: <X fill='#0003' />,
      // text: <>
      //   <X fill='#0003' />
      //   <svg viewBox='0 0 1 1' style={{
      //     position: 'absolute',
      //     top: 0, left: 0,
      //     height: '100%', width: '100%',
      //   }}>
      //     <path d="M.5,.5 h-.5 a.5,.5 0 1,0 .5,-.5 z" fill="#fff" />
      //   </svg>
      // </>,
      func: () => outer.delete(message),
    }]} />
  </div>
}

export { message }
export const Messages = () => {
  const [messages, setMessages] = useState([])
  const [seen, setSeen] = store.use('messages-seen', { default: {} })
  const [{ expand }] = auth.use()

  const new_messages = useR([])
  const [has_new_messages, set_has_new_messages] = useS(false)

  // inject seen hints from cloud setting to start
  const [settings] = user.settings.use()
  const { hints={} } = settings
  Object.assign(seen, hints)
  useF(() => setSeen(Object.assign({}, seen, hints))) // trigger rerender on first time

  const handle = {
    delete: message => {
      message.id?.split(' ').map(id => seen[id] = true)
      setSeen(seen)
      // send locally seen hints back to cloud setting
      user.settings.update('hints', Object.assign(settings.hints ?? {}, seen))
      setMessages(messages.filter(m => m != message))
    },
    add: (...newMessages) => {
      new_messages.current.push(...newMessages)
      defer(() => {
        set_has_new_messages(true)
        log('add', newMessages)
      })
    },
    _add: () => {
      log('_add', new_messages.current)
      let add_messages = new_messages.current
      new_messages.current = []
      set_has_new_messages(false)
      if (add_messages.some(m => m.clear)) {
        log('clear messages', messages)
        setMessages([])
        return
      }

      // calculate expiration time for messages with defined 'ms'
      const now = Date.now()
      add_messages = add_messages.map(m => {
        if (typeof(m) === 'string') m = { text: m }
        if (m.ms) m.expire = now + m.ms
        if (m.delay) m.start = now + m.delay
        return m
      })

      const get_ids = (m) => m.id ? m.id?.split(' ')||[] : [m.text]
      const get_refs = (...xs) => xs.map(x => x||'').join(' ').split(' ').filter(x=>x)

      const visible_ids = set(messages.filter(m => !m.start || m.start < now ).flatMap(m => get_ids(m)))
      log('visible', list(visible_ids))

      // filter out one-time messages
      log('unfiltered', add_messages)
      add_messages = add_messages.filter(m => !(m.once && (
        get_ids(m).some(id => seen[id])
        || get_ids(m.id).some(id => visible_ids.has(id))
        || seen[m.text]
        || visible_ids.has(m.text))))

      // incrementally add and delete messages
      let actual_new_messages = messages.slice()

      add_messages.map((m, i) => {
        const to_delete = set()
        get_refs(m.delete, m.replace).map(delete_id => to_delete.add(delete_id))
        log(m.text, list(to_delete))
        actual_new_messages = actual_new_messages.filter(n => {
          log(n.text, !get_ids(n).some(id => to_delete.has(id)), !to_delete.has(n.text))
          return !get_ids(n).some(id => to_delete.has(id)) && !to_delete.has(n.text)
        })

        // filter out replacement messages without visible targets
        const require = get_refs(m.require, m.replace)
        log(require, m.text)
        if ((m.text||m.html) && (!require.length || require.some(r => visible_ids.has(r)))) {
          actual_new_messages.push(m)
          get_ids(m).map(id => visible_ids.add(id))
        }

        log('filter step', i, strings.json.clone(actual_new_messages))
      })

      log('filtered', actual_new_messages, 'from', messages)
      setMessages(actual_new_messages)
    }
  }
  useF(has_new_messages, () => has_new_messages && handle._add())

  useSocket({
    on: {
      'message': message => handle.add(message),
    },
  })
  message.use(value => handle.add(value))
  
  return hide_ui ? null : <Modal block={false} target='body'>
    <Style className={`message-list message-list-${expand ? 'top' : 'bottom'} message-list-right`}>
      <InfoBody>
        {messages.map((message, i) => <Message key={i} {...{ message, outer: handle }} />)}
      </InfoBody>
    </Style>
  </Modal>
}

const Style = styled(InfoStyles)`
margin-top: 1em;

width: 100%; height: 100%;
max-width: unset;
background: none;
font-size: 16px;

.body {
  width: 100%; height: 100%;
  overflow-y: auto;
  display: flex;
  padding: 1em;
  align-items: flex-end;
}
&.message-list-top .body {
  flex-direction: column;
  justify-content: flex-start;
}
&.message-list-bottom .body {
  flex-direction: column-reverse;
  justify-content: flex-end;
}

.message {
  max-width: 100%;
  max-height: 100%; overflow-y: auto;
  pointer-events: all;
  background: white;
  background: var(--id-color-text-readable);
  color: var(--id-color-text);
  margin-bottom: .25em;
  border: 1px solid black;
  padding: .5em;
  font-size: .8em;
  box-shadow: 2px 2px black;

  display: flex;
  flex-direction: row;
  align-items: flex-start;
  > :first-child {
    margin-right: .5em;
  }

  white-space: pre-wrap;
  word-break: break-word;

  a {
    font-weight: bold; // make links more visible
    color: inherit;
  }
}

.badges {
  margin-left: .5em;

  > .button:last-child { // X
    border: 0; margin: 0;
    background: #f17a7a;
    color: #0002; text-shadow: none;
    width: 1.5em; height: 1.5em;
    display: flex; align-items: center; justify-content: center;
  }
}
`

const X = ({ size='1em', fill='#000' }: {
  size?: string, fill?: string
}) => {
  return <svg className='x'
  xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img"
  preserveAspectRatio="xMidYMid meet"
  style={{width:size, height:size}}
  viewBox="0 0 460.775 460.775" fill={fill}>
  <path d="M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55
    c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55
    c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505
    c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55
    l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719
    c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z"/>
  </svg>
}