import React, { Fragment, useState } from "react";
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { InfoSection, InfoStyles } from '../components/Info';
import api from "../lib/api";
import { useEventListener, useF, useM, useR } from "../lib/hooks";
import { useAuth } from "../lib/hooks_ext";
import { useSocket } from "../lib/socket";
import { convertLinks } from "../lib/render";

const { named_log, set, list } = window as any
const log = named_log('chat')

const audio_sound_new_message = new Audio('/raw/audio/effects/message.mp3')
function sound_new_message() {
  audio_sound_new_message.play()
}

let saveHash = ''
const chatSave = {}

export const Chat = ({ hash, flipped, reading, setUnread, click, fallback, special='' }: {
  hash: string, flipped?: boolean, reading?: boolean, setUnread?, click?, fallback?, special?:string
}) => {
  const auth = useAuth()
  const inputRef = useR<HTMLTextAreaElement>()
  const [chat, setChat] = useState(undefined)
  const [typing, setTyping] = useState(false)
  const [update, setUpdate] = useState(undefined)
  const [edit, setEdit] = useState('')

  useF(hash, () => {
    if (hash && inputRef.current) {
      inputRef.current.value = (chatSave[saveHash] = inputRef.current.value) || ''
      saveHash = hash
      setEdit(inputRef.current.value)
    }
  })

  const handle = {
    parse: newChat => {
      log({newChat})
      setChat(newChat)
      setUnread && setUnread(Math.max(0, newChat.read
        ? newChat.messages.length - newChat.read[auth.user]
        : 0))
      if (newChat?.messages?.length !== chat?.messages?.length) {
        if (chat?.messages?.length) sound_new_message()
        setTyping(false)
      }
    },
    load: () => {
      auth.user && hash && api.get(`/chat/${hash}`).then(({chat: newChat}) => {
        handle.parse(newChat)
        console.debug(newChat)
      })
    },
    send: () => {
      const text = inputRef.current.value
      if (text) {
        inputRef.current.value = ''
        // let firstMessage = document.querySelector('.chat .messages :first-child')
        // firstMessage?.scrollIntoView({
        //   behavior: "smooth",
        //   block: "end",
        //   inline: "nearest"
        // })
        // api.post(`/chat/${chat.hash}`, { messages: [{ text }] }).then(({chat: newChat}) => setChat(newChat))
        api.post(`/chat/${chat.hash}`, { messages: [{ text }] })
        .then(({ chat: newChat }) => handle.parse(newChat))
      }
      handle.resize()
      setEdit('')
    },
    read: () => {
      chat && auth.user && api.post(`/chat/${chat.hash}/unread`).then(() => setUnread && setUnread(0))
    },
    typing: e => {
      console.debug('typing')
      chat && auth.user && socket.emit('chat:typing', chat.hash, auth.user, e.target.value)
      handle.resize()
      setEdit(e.target.value)
    },
    resize: () => {
      const el = inputRef.current
      // let old = Number(/(\d+)px/.exec(el.style.height)[1])
      // let save = el.style.height
      // el.style.height = 'auto';
      // console.log(save, old, el.scrollHeight)
      // if (Math.abs(old - el.scrollHeight) > 2) {
      //   el.style.height = `${el.scrollHeight}px`;
      // } else {
      //   el.style.height = save
      // }
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight + .5}px`;
      }
    },
  }
  useEventListener(window, 'resize', handle.resize)
  useF(handle.resize)

  const socket = useSocket({
    on: {
      'chat:update': (updateHash, messages, unread) => {
        log('update', {updateHash,messages,unread})
        console.debug(updateHash, messages, unread)
        setUpdate({ updateHash, messages, unread })
        setUnread && unread && setUnread(unread[auth.user])
      },
      'chat:typing': (updateHash, other, isTyping) => {
        if (hash === updateHash) {
          setTyping(isTyping)
        }
      },
    }
  })
  useF(update, () => {
    if (update && chat) {
      const { updateHash, messages, unread } = update
      if (hash === updateHash) {
        setChat({ ...chat, messages: chat.messages.concat(messages) })
        setUnread && unread && setUnread(unread[auth.user])
        setTyping(false)
      }
    }
  })

  useF(reading, handle.read);

  useF(auth.user, hash, handle.load)
  useEventListener(window, 'focus', () => handle.load())

  let last_name = undefined
  const special_set = useM(special, () => set(special||''))

  let lastDateString = undefined
  return <Style className={`chat body ${flipped ? 'flipped' : ''} ${reading ? 'reading' : ''}`}>
    {auth.user ? <>
    <InfoSection className='edit-container'>
      <div className={'chat-input-container'+(edit?' edit':'')}>
        <textarea className='chat-input' ref={inputRef} spellCheck='false' rows={1} autoCapitalize="off"
          // placeholder='send message'
          onKeyDown={e => {
            if (!e.shiftKey && e.key === 'Enter') {
              e.preventDefault()
              handle.send()
            }
          }}
          onChange={handle.typing}></textarea>
        {edit ? <span className='button chat-send' onClick={handle.send}>send</span> : ''}
      </div>
    </InfoSection>
    <InfoSection className={`messages fallback-${fallback && chat?.messages.length === 0}`}>
      {chat?.messages.length === 0
      ? fallback || <div className='default chat-info'>no messages</div>
      : ''}
      {typing ? <div className={`default left typing`}>...</div> : ''}
      {chat?.messages.slice().map((msg, i, all) => {
        const { text: _text, meta } = msg
        const text = _text && convertLinks(_text)
        const base = `${meta.user === auth.user ? 'right' : 'left'} ${meta.classes || 'default'}`
        const name = meta.user === auth.user || list(meta.classes||'').some(x => special_set.has(x)) || chat.users.length < 3 ? undefined : meta.user
        const date = new Date(meta.t)
        const useDate = lastDateString !== date.toDateString()
        if (useDate) lastDateString = date.toDateString()

        const onClick = click ? click(msg, i, all) : undefined
        const jsx = <>
          {text ?
          // <div className={`${base} ${onClick ? 'click' : ''}`} title={date.toLocaleString()} onClick={onClick}
          //   dangerouslySetInnerHTML={{__html: text}}>
          <div className={`${base} ${onClick ? 'click' : ''}`} title={date.toLocaleString()} onClick={onClick}>
            {text}
          </div> : ''}
          {meta.page ? <>
            {meta.pageDesc ?
            <Link to={meta.page} className={`${base} page`}>
              {meta.pageDesc}
            </Link>
            : ''}
            <Link to={meta.page} className={`${base} page link`}>
              {meta.pageImg ? <div className='img-cont'><img src={meta.pageImg}/></div> : ''}
              {meta.page}
            </Link>
          </>
          : ''}
          {/* {useDate ? <div className={`date info`}>
            {date.toDateString().split(' ').slice(0, 3).join(' ')}
          </div> : ''} */}
          {name && name !== last_name ? <div className={`${base} name`}>{name}</div> : null}
        </>
        last_name = name
        return jsx
      }).reverse()}
    </InfoSection>
    </>
    :
    <InfoSection className='messages'>
      <div className='info'></div>
    </InfoSection>}
  </Style>
}


const Style = styled(InfoStyles)`
  &.chat {
    background: none;
    width: 100%;
    // max-width: 30rem;
    padding: 0;
    font-size: 1rem;
    user-select: none;

    display: flex;
    flex-direction: column;
    .edit-container {
      width: 100%;
      margin: 0;
      // max-width: 66%;
      margin-left: auto;
      margin-bottom: .15rem;

      .chat-input-container {
        position: relative;
        width: -webkit-fill-available;
        display: flex; align-items: center; justify-content: center;
        &:not(.edit)::after {
          content: "";
          position: absolute;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          z-index: 100;
          opacity: .2;
          pointer-events: none;
        }
        &:focus-within::after {
          content: "";
        }
      }
      .chat-input {
        font-size: max(16px, 1rem);
        line-height: 1.2em;
        height: 1.3em;
        min-height: 1.3em;
        margin: 0;
        margin-right: .25em;
        flex-grow: 1;
        resize: none;

        min-height: 2.5em !important;

        padding: 0.35rem 3.1rem 0.35rem 0.2rem;
        margin-right: 0;
        height: 2.05rem;
        overflow: hidden;
        // font-family: 'Roboto Mono', monospace;
        // padding: 0.4rem 3.4rem 0.4rem 0.4rem;
        padding: 0.4em 3.4em 0.4em 0.4em !important;
        // padding-right: 3em !important;
      }
      // .chat-input::placeholder {
      //   display: flex;
      //   align-items: center;
      //   justify-content: center;
      //   text-align: center;
      //   opacity: .3;
      //   position: absolute;
      //   right: 0;
      //   top: 0;
      //   width: 100%;
      //   height: 100%;
      //   line-height: 1.2;
      // }
      .chat-send {
        float: none;
        flex-grow: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        position: absolute;
        right: .275rem;
        bottom: .65rem;
        bottom: calc(1px + 0.25rem);
        width: 2.5rem;
        height: 1.4rem;
        // font-family: 'Roboto Mono', monospace;

        font-size: 1rem;
        width: 3rem;
        height: 1.5rem;
        border-width: .15rem;
        margin: 0;
        margin-left: .5rem;
        border-radius: .2rem;
      }
    }
    .messages {
      &.fallback-true {
        padding-bottom: 0 !important;
        > * {
          max-width: 100%;
          overflow-y: visible !important;
        }
      }
      user-select: none;
      display: flex;
      flex-direction: column;
      > * {
        max-width: 90%;
        white-space: pre-wrap;
        margin-bottom: .3rem;
        overflow-wrap: anywhere;
        position: relative;
      }
      > .default {
        font-size: .8rem;
        font-size: 1rem;
        max-width: 90%;
        background: #eeeeee;
        border-radius: .3rem;
        padding: .2rem .4rem;
      }
      a {
        color: inherit;
        text-decoration: underline;
      }
      .chat-info {
        align-self: center;
        // color: #00000055;
        color: #0004;
        background: none;
        text-shadow: none;
      }
      .left {
        align-self: flex-start;
      }
      .right {
        align-self: flex-end;
        // background: #00000055;
        background: black;
        color: white;
        // text-align: right;
      }
      .date {
        align-self: center;
        color: #00000055;
        background: none;
        font-size: .8rem;
      }
      .typing {
        background: #f9f9f9;
        font-family: 'Roboto Mono', monospace;
      }
      .page {
        background: none;
        color: black;
        border: .15rem solid black;
        padding: .2rem;
        text-decoration: none;
        &:hover, a:hover, &:hover a {
          text-decoration: underline;
        }
        .img-cont {
          display: inline-block;
          margin-right: .25rem;
          padding: .1rem;
          background: #00000011;
          border-radius: .3rem;
          img {
            // margin-left: -.15rem;
            height: 2rem;
          }
        }
      }
      .click {
        cursor: pointer !important;
      }
      .name {
        border: 0 !important;
        background: none !important;
        padding: 0 !important;
        font-size: .67em;
        opacity: .5;
      }
    }
  }
  &.chat.flipped {
    .edit-container {
      margin-left: 0;
      margin-right: auto;
    }
    .messages {
      .left {
        align-self: flex-end;
        // text-align: right;
      }
      .right {
        align-self: flex-start;
        // text-align: left;
      }
    }
  }
  &.chat.reading .messages {
    user-select: auto;
  }
`