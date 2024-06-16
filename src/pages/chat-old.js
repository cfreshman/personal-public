import React, { Fragment, useState } from "react";
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { A, InfoBadges, InfoBody, InfoFuncs, InfoLine, InfoLoginBlock, InfoSection, InfoSelect, InfoStyles, Select } from '../components/Info';
import api from "../lib/api";
import { useEventListener, useF, useM, useR, useS, useStyle } from "../lib/hooks";
import { useAuth, usePathState, usePageSettings } from "../lib/hooks_ext";
import { useSocket } from "../lib/socket";
import url from "../lib/url";
import { convertLinks, convertLinksAndHtml, extractLinks } from "../lib/render";
import { S, getCssVar, isMobile, sum, toStyle } from "../lib/util";
import { JSX } from "../lib/types";
import { SettingStyles } from "./settings";
import { Scroller } from "src/components/Scroller";
import { readable_text } from "src/lib/color";
import { dangerous } from "src/components/individual/Dangerous";
import { UserBadge } from "src/components/user_badges";

const siteChats = ['cyrus', 'site']
const { components, named_log } = window
const log = named_log('chat')

export default () => {
  usePageSettings({
    transparentHeader: true,
  })
  const auth = useAuth()
  const inputRef = useR()
  const [profile, setProfile] = useState()
  // const [other, setOther] = useState(window.location.hash.slice(2) || '')
  const [other, setOther] = usePathState({
    from: p => p || auth.user,
    to: other => other === auth.user ? '' : other,
  })
  useF(other, () => {
    if (!other || other === auth.user) {
      url.replace(`/selfchat`)
    } else {
      url.replace(`/chat/${other}`)
    }
  })
  const [chatUser, setChatUser] = useState()
  const [unread, setUnread] = useState()
  // const [unreadCount, setUnreadCount] = useState(0)
  const [chats, setChats] = useState({})
  const [typing, setTyping] = useState({})
  const [update, setUpdate] = useState()

  const chat = other ? chats[other] : undefined;

  const handle = {
    updateChat: (other, newChat) => {
      if (other) {
        setChats(Object.assign({}, chats, { [other]: newChat }))
        // console.log(chats[other], newChat)
        if (chats[other]?.messages.slice(-1)[0]?.meta.t !== newChat?.messages.slice(-1)[0]?.meta.t) {
          setTimeout(handle.scrollToLatest, 50)
        }
      }
    },
    loadProfile: () => {
      if (auth.user) {
        api.get(`/profile/${auth.user}`).then(({profile}) => {
          setProfile(profile)
          // if (!profile.friends.includes('cyrus')) profile.friends.push('cyrus')
          siteChats.map(siteChat => {
            if (siteChat === other) profile?.friends.push(siteChat)
          })
          if (other && !profile.friends.includes(other) && auth.user !== 'cyrus') {
            setOther(false)
          }
        })
        api.get(`/chat`).then(({chatUser, unread: unreadCount}) => {
          setChatUser(chatUser)
          console.debug(chatUser)
          // setUnreadCount(unreadCount)
        })
      }
    },
    loadChat: other => {
      auth.user && other && api.get(`/chat/u/${other}`).then(({chat: newChat}) => {
        console.debug(newChat)
        handle.updateChat(other, newChat)
        if (newChat?.messages?.length !== chat?.messages?.length) {
          setTyping({ ...typing, [other]: false })
        }
        // console.debug(chatUser, chatUser?.unread, chatUser?.unread[newChat.hash])
        if (chatUser?.unread && chatUser.unread[newChat.hash]) {
          socket && socket.emit('chat:view', newChat.hash)
        }
      })
    },
    switchChat: other => {
      setOther(other)
      handle.loadChat(other)
    },
    sendChat: () => {
      let text = inputRef.current.value
      if (text) {
        inputRef.current.value = ''
        handle.scrollToLatest()
        api.post(`/chat/u/${other}`, { messages: [{ text }] }).then(({chat: newChat}) => handle.updateChat(other, newChat))
      }
      handle.resize()
      // socket.emit('chat:send', chat.hash, text, meta)
    },
    typing: e => {
      chat && auth.user && socket.emit('chat:typing', chat.hash, auth.user, e.target.value)
      handle.resize()
    },
    resize: () => {
      const sendInput = inputRef.current
      if (sendInput) {
        sendInput.style.height = 'auto';
        sendInput.style.lineHeight = sendInput.scrollHeight < 40 ? '1.1' : '1.3';
        sendInput.style.height = `calc(${sendInput.scrollHeight}px + .25rem)`;
      }
    },
    scrollToLatest: () => {
      let latestMessage = document.querySelector('.chat .messages :first-child')
      latestMessage?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest"
      })
      // fix weird outer body scroll bug
      document.querySelector('#index').scrollIntoView({ block: 'end' })
    }
  }
  useEventListener(window, 'resize', handle.resize)

  const socket = useSocket({
    on: {
      "chat:update": (hash, messages) => setUpdate({ hash, messages }),
      "chat:typing": (hash, other, isTyping) =>
        setTyping({ ...typing, [other]: isTyping }),
      'chat:unread': unread => setUnread(unread),
    },
  })
  useF(update, () => {
    if (update) {
      let chat = Object.values(chats).find(c => c.hash === update.hash)
      if (chat) {
        if (chat.users.length === 2) {
          let other = chat.users.find(u => u !== auth.user)
          handle.updateChat(other, { ...chat, messages: chat.messages.concat(update.messages) })
          setTyping({ ...typing, [other]: false })
        } else if (update.hash === chat.hash) {
          handle.updateChat(other, { ...chat, messages: chat.messages.concat(update.messages) })
          setTyping({ ...typing, [other]: false })
        }
      }
    }
  })
  useF(unread, () => {
    if (unread) {
      if (chat && unread[chat.hash]) {
        delete unread[chat.hash]
        socket && socket.emit('chat:view', chat.hash)
      }
      setChatUser(Object.assign({}, chatUser, { unread }))
    }
  })

  useF(auth.user, handle.loadProfile)
  useEventListener(window, 'focus', () => other && handle.loadChat(other))
  useF(other, () => other && handle.loadChat(other))

  let unreadCount = chatUser?.unread && Object.values(chatUser.unread).reduce((acc, val) => acc + val, 0)
  const options = useM(chatUser?.dms, profile?.friends, other, () => {
    return ['site'].concat(
      (chatUser?.dms
      && Array.from(
        new Set([
          ...(profile?.friends ||[]),
          ...Object.keys(chatUser.dms).filter(s => siteChats.includes(auth.user) || siteChats.includes(s)),
          other
      ])) || []
      )
      .filter(x => x && x !== 'site')
      .sort())
  })
  const [user_to_unread, set_user_to_unread] = useS({})
  useF(keys(chatUser?.unread).join('-'), async () => {
    const result = {}
    const hashes = keys(chatUser?.unread||{})
    log('here', chatUser?.unread, hashes)
    await Promise.allSettled(hashes.map(hash => 
      api.get(`/chat/user-chat/${hash}`)
      .then(({user}) => {
        result[user] = hash
        resolve()
      })))
      .catch(log)
    log({user_to_unread:result})
    set_user_to_unread(result)
  })
  const display = useM(options, user_to_unread, () => {
    const value = {}
    options
    .map(x => {
      let unread = (chatUser?.unread || {})[x]
      return [x, unread]
    })
    .sort((a, b) => a[1] - b[1])
    .map(([x]) => {
      log({unread})
      // value[x] = unread ? x + ` (${sum(Object.values(unread))})` : x
      const user_unread = unread && user_to_unread && unread[user_to_unread[x]]
      value[x] = user_unread ? `${x} (${user_unread})` : x
    })
    log('OPTIONS', options, value)
    return value
  })

  useStyle(`
  #inner-index#inner-index a {
    color: inherit !important;
    word-break: break-all;
  }
  #inner-index#inner-index a.button {
    color: var(--id-color-text-readable) !important;
  }
  .expand-false #chat {
    border-top: 1px solid var(--id-color-text);
  }
  `)
  
  return <Style id="chat"><InfoLoginBlock to='view chat'>
    <InfoBody className='chat'>
      <InfoSection id='chat-friend-select' labels={[
        <Select 
        name={'select friend'} value={other} setter={setOther}
        options={options} display={x => display[x]} />,
        // other && {
        //   text: 'profile',
        //   href: `/u/${other}`,
        // },
        other && <UserBadge {...{ user:other, text:'profile' }} />,
        unreadCount && `${unreadCount} other message${unreadCount===1?'':'s'}`
      ]} style={S(`
      position: absolute;
      width: fit-content;
      `)}/>
      {/* <div id='chat-friend-select'
      style={toStyle(`
      position: absolute;
      z-index: 1;
      ${auth.expand ? '' : `
      padding-top: 2rem;
      `}
      `)}>
        {/* <InfoSelect 
        name={'select friend'} value={other} setter={setOther}
        options={options} display={x => display[x]}/>
        {other ? <A href={`/u/${other}`} style={toStyle(`
        font-size: .8em;
        text-decoration: none;
        `)}>→ u/{other}</A> : ''} */}
        
        {/* <div class='center-row' style={S(`
        gap: .25em;
        align-items: stretch;
        `)}>
          <InfoSelect 
          name={'select friend'} value={other} setter={setOther}
          options={options} display={x => display[x]}/>
          <InfoBadges labels={[
            {
              text:
              other && <A href={`/u/${other}`} style={toStyle(`
              color: ${readable_text(getCssVar('var(--id-color-text)'))};
              color: var(--id-color);
              text-decoration: none;
              `)}>profile</A>
            }
          ]}/>
        </div> */}
      {/* </div> */}
      {other 
      ? <>
      <InfoSection className='messages'>
        <Scroller deps={[other, chat, chat?.messages]} />
        {chat?.messages.length === 0 ? <div className='info'>no messages</div> : ''}
        {typing[other] ? <div className='left typing'>...</div> : ''}
        {chat?.messages.slice().reverse().map(({text, meta}, i, arr) => {
          let previews = []
          if (text) {
            // const links = extractLinks(text)
            // previews = links.map(href => dangerous(components.link_preview(href)))
            // text = other === 'site' ? convertLinksAndHtml(text) : convertLinks(text)
            text = convertLinks(text)
          }
          let side = meta.user === auth.user ? 'right' : 'left'

          // return in reverse order
          return <>
            {previews}
            {text ?
            <div className={side} title={new Date(meta.t).toLocaleString()}>
              {text}
            </div> : ''}
            {meta.page ? <>
              {meta.pageDesc ?
              <Link to={meta.page} className={`${side} page`}>
                {meta.pageDesc}
              </Link>
              : ''}
              <Link to={meta.page} className={`${side} page link`}>
                {meta.pageImg ? <div className='img-cont'><img src={meta.pageImg}/></div> : ''}
                {meta.page}
              </Link>
            </>
            : ''}
            {i === arr.length-1 || meta.t - arr[i+1].meta.t > 60 * 60 * 1000 // > 1 hour
            ? <div className='timestamp'>{new Date(meta.t).toLocaleString(0, {
              dateStyle: 'short',
              timeStyle: 'short',
            }).replace(',', '')}</div>
            : ''}
          </>
        })}
      </InfoSection>
      <textarea className='chat-input' ref={inputRef} rows="1" spellCheck='false'
      onKeyDown={e => {
        if (!e.shiftKey && e.key === 'Enter') {
          e.preventDefault()
          // socket.emit('live:message', e.target.value)
          handle.sendChat()
        }
      }}
      onChange={handle.typing}></textarea>
      </>
      : ''
      // <InfoSection className='messages'>
      //   <div className='info'>select a friend to chat</div>
      // </InfoSection>
      }
    </InfoBody>
  </InfoLoginBlock></Style>
}


const Style = styled(SettingStyles)`
&#chat {

  .login-block {
    margin-top: 2.25em;
  }

  display: flex;
  flex-direction: row;
  justify-content: center;
  max-width: 37rem;
  background: none;
  .body {
    background: white;
    overflow-x: hidden;
    padding-top: 0 !important;
    // > :first-child {
    //   padding-top: .25em;
    // }
  }
  #chat-friend-select {
    margin-top: 2.5rem !important;
    > * {
      margin: 0 !important;
    }
  }
  .body.friends {
    width: 7rem;
    flex-grow: 0;
    flex-shrink: 0;
    border-right: 1px solid #00000022;
    .entry-line {
      position: relative;
      .badges {
        position: absolute;
        bottom: 0; right: 100%;
        margin: 0; margin-right: .27em;
        height: 100%;
        display: flex; align-items: center;
      }
    }
    .entry {
      user-select: none !important;
    }
    .friends-list:not(:hover) .selected {
      text-decoration: underline;
    }
  }
  .body.chat {
    padding: .5rem;
    padding: 0 .25em !important;

    a {
      color: inherit !important;
    }

    display: flex;
    flex-direction: column;
    .chat-input-container {
      width: 100%;
      margin-bottom: 0;
      position: relative;
      display: flex;
      border: 1px solid black;
      border-radius: .2em;
      margin: -1px;
      width: calc(100% + 2px);
      border-radius: 0 !important;
      border: 0;

      .chat-input {
        font-size: max(16px, .8rem);
        padding: .2rem .2rem .3rem .2rem;
        line-height: 1.1;
        height: 1.6rem;
        margin: 0;
        margin-right: .25rem;
        flex-grow: 1;
        resize: none;
        outline: none;
  
        padding: 0.35rem 3.1rem 0.35rem 0.25rem;
        margin-right: 0;
        height: 2rem;
        overflow: hidden;

        background: #000;
        color: var(--id-color);
        color: #fff;
        border-radius: 0 !important;
        border-radius: .33rem !important;
        border-radius: 2px !important;
      }
      .chat-send {
        display: none;
        float: none;
        flex-grow: 0;
        // display: flex;
        align-items: center;
        justify-content: center;
  
        position: absolute;
        right: .3rem;
        bottom: calc(.15rem + 2px);
        width: 2.5rem;
        height: 1.4rem;
      }
  
      &:focus-within .chat-send {
        display: flex;
        border: 0;
        text-decoration: underline;
      }
    }
   
    .messages {
      width: 100%;
      width: -webkit-fill-available;
      margin-right: -.5rem;
      padding-right: .5rem;
      padding-top: 2em;
      // &::-webkit-scrollbar { display: none }
      height: 0;
      flex-grow: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column-reverse;
      // flex-direction: column;
      padding-bottom: 1rem;
      &::before {
        content: "";
        height: 0;
        flex-grow: 1;
      }
      &::after {
        content: "";
        min-height: 1rem;
      }
      > * {
        max-width: 90%;
        font-size: .8rem;
        white-space: pre-wrap;
        background: #00000011;
        border-radius: .3rem;
        padding: .2rem .4rem;
        margin-bottom: .3rem;
        overflow-wrap: break-word;
        position: relative;
      }
      .info {
        align-self: center;
        color: #00000055;
        background: none;
        text-shadow: none;
        padding-top: 0;
      }
      .left {
        align-self: flex-start;
        & + .left {
          margin-bottom: 0;
        }
      }
      .right {
        align-self: flex-end;
        // background: #00000055;
        background: black;
        color: white;
        // text-align: right;
        & + .right {
          margin-bottom: 0;
        }
      }
      .typing {
        background: #00000006;
      }
      .page {
        background: none;
        color: black;
        border: .15rem solid black;
        padding: .2rem;
        text-decoration: none;
        display: flex;
        align-items: center;
        &:hover, a:hover, &:hover a {
          text-decoration: underline;
        }
        .img-cont {
          display: inline-flex;
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
      .timestamp {
        background: none;
        color: #0004;
        align-self: center;
        text-shadow: none;
        margin: 0;
        padding-top: 0;

        padding: 0;
        line-height: 1.1;
      }
    }
    .other-label {
      margin: -.5rem;
      padding: 1rem;
      margin-bottom: 0;
      border-bottom: 1px solid #00000022;
    }
  }

  textarea {
    resize: none;
    font-size: max(1em, 16px);
    // margin: 0 -.25em -.25em -.25em !important;
    padding: .25em !important;
    border-radius: .25em !important;
    // width: calc(100% + .5em) !important;
    width: 100%;
    margin-bottom: .25em !important;
  }

}
`