import React, { Fragment, useState } from "react";
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { A, HalfLine, InfoBadges, InfoBody, InfoFuncs, InfoLine, InfoLoginBlock, InfoSection, InfoSelect, InfoStyles, Select } from '../components/Info';
import api from "../lib/api";
import { useE, useEventListener, useF, useM, useR, useS, useStyle } from "../lib/hooks";
import { useAuth, usePathState, usePageSettings } from "../lib/hooks_ext";
import { useRoom, useSocket } from "../lib/socket";
import url from "../lib/url";
import { convertLinks, convertLinksAndHtml, extractLinks } from "../lib/render";
import { S, getCssVar, isMobile, sum, toStyle } from "../lib/util";
import { JSX } from "../lib/types";
import { SettingStyles } from "./settings";
import { Scroller } from "src/components/Scroller";
import { readable_text } from "src/lib/color";
import { dangerous } from "src/components/individual/Dangerous";
import { UserBadge } from "src/components/user_badges";
import { openPopup } from "src/components/Modal";
import { RawWebsiteIcon, WebsiteIcon, WebsiteTitle } from "src/components/website_title";

const siteChats = ['cyrus', 'site']
const { components, named_log, Q, set, lists, datetime } = window
const log = named_log('chat')

const audio_sound_new_message = new Audio('/raw/audio/effects/message.mp3')
function sound_new_message() {
  audio_sound_new_message.play()
}

const open_popup = (closer) => {
  openPopup(close => <Style>
    <InfoBody>
      {closer(close)}
    </InfoBody>
  </Style>, `
  height: max-content;
  width: max-content;
  min-height: min(400px, 90vh);
  min-width: min(300px, 90vw);
  background: #000 !important;
  padding: 0;
  `)
}

const _ListItem = ({ x, marked, toggle_mark, checked }) => {
  const skip = checked !== !!marked.marked[x.t]
  return skip ? null : <div 
  title={x.text} className='row wide' style={S(`align-items:center;cursor:pointer`)}
  onClick={e => toggle_mark(x)}>
    <input type='checkbox' checked={checked} onChange={e => toggle_mark(x)} />
    &nbsp;
    <span style={S(`
    text-wrap: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    `)}>{checked ? <s>{x.text}</s> : x.text}</span>
  </div>
}
const ListsModal = ({lists,chat,other,close}) => {

  const n_lists = keys(lists).length
  const [select, set_select] = useS(n_lists > 1 ? undefined : keys(lists)[0])

  const [marked, set_marked] = useS({ marked:{} })
  const load_marked = async () => {
    const { marked } = await api.get(`/chat/marked/${chat.hash}`)
    set_marked(marked)
  }
  const toggle_mark = async (item) => {
    const { marked:new_marked } = await api.post(`/chat/marked/${chat.hash}`, { t:item.t, marked:!marked.marked[item.t] })
    set_marked(new_marked)
  }
  useF(lists, chat, other, () => load_marked())
  useF(marked, () => log({ marked }))

  useRoom({
    room: `chat:list:${chat.hash}`,
    on: {
      [`chat:list:${chat.hash}:update`]: () => load_marked()
    },
  })

  return <>
    <InfoSection labels={[
      `your lists with ${other}`,
      { close: () => close() },
    ]}>
      {!n_lists ? `create lists by chatting!\ne.g. send "watchlist The Matrix"` : null}
    </InfoSection>
    <HalfLine />
    {entries(lists).map(([name, items]) => {
      const is_open = select === name
      log(name, items)
      return <InfoSection labels={[
        name+'list',
        n_lists > 1 && (is_open ? { close: () => set_select(undefined) } : { open: () => set_select(name) }),
      ]}>
        {is_open ? <div className='column wide'>
          {items.map(x => <_ListItem {...{ x, marked, toggle_mark, checked:false }} />)}
          {items.slice().reverse().map(x => <_ListItem {...{ x, marked, toggle_mark, checked:true }} />)}
        </div> : null}
      </InfoSection>
    })}
  </>
}
const AiModal = ({viewer,chat,close}) => {

  const [query, set_query] = useS(undefined)
  useF(viewer, chat, async () => {
    const lines = []
    lines.push(`chat members: ${lists.unique(chat.users).join(', ')}`)
    chat.messages.map(({text, meta}, i, arr) => {
      if (text) {
        lines.push(`${meta.user} ${datetime.ymdhms(meta.t)}: "${text}"`)
      }
    })
    log('ai', { lines })
    const {query} = await api.post('/chat/ai/suggestions', { logs:lines.join('\n\n')||'no logs yet. just make something up' })
    log('ai', { query })
    set_query(query)
  })

  return <>
    <InfoSection labels={[
      `AI helper`,
      { close: () => close() },
    ]}>
      {!query ? 'loading LLM query' : <>
        <HalfLine />
        <div className='column gap' style={S(`
        font-size: 2em;
        `)}>
          {[
            { 'copy prompt': e => {
              copy(query)
              display_status(e.target, 'copied!')
            } },
            { text: 'open ChatGPT', href: 'https://chatgpt.com/?temporary-chat=true' },
          ].map(item => <InfoBadges labels={[item]} />)}
        </div>
        <HalfLine />
        <div>
          prompt too long?
          <div>- use {convertLinks('https://chatgpt-prompt-splitter.vercel.app')}</div>
          <div>- if you pay for an LLM it should remove the limit</div>
        </div>
      </>}
    </InfoSection>
  </>
}

export default () => {
  usePageSettings({
    // transparentHeader: true,
  })
  const auth = useAuth()
  const viewer = auth.user
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
          if (chat?.messages?.length) sound_new_message()
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
      // let latestMessage = document.querySelector('.chat .messages :first-child')
      // latestMessage?.scrollIntoView({
      //   behavior: "smooth",
      //   block: "start",
      //   inline: "nearest"
      // })
      // fix weird outer body scroll bug
      // document.querySelector('#index').scrollIntoView({ block: 'end' })
      // Q('#inner-index')?.scrollIntoView({ block:'end' })
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
    return [viewer, 'site'].concat(
      (chatUser?.dms
      && Array.from(
        new Set([
          ...(profile?.friends ||[]),
          ...Object.keys(chatUser.dms).filter(s => siteChats.includes(auth.user) || siteChats.includes(s)),
          other
      ])) || []
      )
      .filter(x => x && x !== 'site' && x !== viewer)
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

  // construct lists
  const lists = useM(chat, () => {
    if (!chat) return {}
    const lists = {}
    chat.messages.map(({text, meta}, i, arr) => {
      if (!text) return
      const list_regexes = [
        /(^| )(?<name>[^ ]+)list($| )/ig,
        /(^| )(?<name>todo)($| )/ig
      ]
      const matches = []
      list_regexes.map(list_regex => {
        while (1) {
          const match = list_regex.exec(text)
          if (!match) break
          matches.push(match)
        }
      })
      const IGNORE_LISTS = set('play')
      const list_names = matches.map(m => m.groups.name).filter(name => !IGNORE_LISTS.has(name))
      list_names.map(name => {
        if (!lists[name]) lists[name] = []
        let cleaned_item = text.replaceAll('todo', '')
        list_names.map(name => {
          cleaned_item = cleaned_item.replaceAll(`${name}list`, '')
        })
        cleaned_item = cleaned_item.split(/ +/).map(x => x.trim()).filter(x => x).join(' ')
        if (cleaned_item) {
          lists[name].push({ text:cleaned_item, t:meta.t })
        }
      })
    })
    keys(lists).map(k => {
      if (lists[k].length === 0) {
        delete lists[k]
      }
    })
    log('construct lists', chat, lists)
    return lists
  })
  useF(lists, () => log('lists', lists))

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
  #footer {
    display: none;
  }
  `)
  
  return <Style id="chat"><InfoLoginBlock to='view chat'>
    <InfoBody className='chat'>
      {/* <InfoSection id='chat-friend-select' labels={[
        'chat with:',
        <Select 
        name={'select friend'} value={other} setter={setOther}
        options={options} display={x => display[x]} />,
        // other && {
        //   text: 'profile',
        //   href: `/u/${other}`,
        // },
        'options:',
        other && <UserBadge {...{ user:other, text:'profile' }} />,
        // unreadCount && `${unreadCount} other message${unreadCount===1?'':'s'}`
      ]} style={S(`
      position: absolute;
      width: fit-content;
      padding: .25em;
      background: var(--id-color);
      border: 1px solid currentcolor;
      box-shadow: 0 2px currentcolor;
      `)}/> */}
      <InfoSection id='chat-friend-select' style={S(`
      position: absolute;
      width: fit-content;
      padding: .25em;
      background: var(--id-color);
      border: 1px solid currentcolor;
      box-shadow: 0 2px currentcolor;
      `)}>
        <InfoBadges labels={[
          'chat with:',
          <Select 
          name={'select friend'} value={other} setter={setOther}
          options={options} display={x => display[x]} />,
        ]} />
        <InfoBadges labels={[
          'options:',
          other && <UserBadge {...{ user:other, text:'profile' }} />,
          { lists: () => {
            open_popup(close => <ListsModal {...{ other, chat, lists, close }} />)
          } },
          { ai: () => {
            open_popup(close => <AiModal {...{ viewer, chat, close }} />)
          } },
        ]} />
      </InfoSection>
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
          let previews = undefined
          if (text) {
            const links = extractLinks(text)
            previews = links.map(href => {
              href = href[0]==='/' ? server + href : ('https://'+href).replace('https://http', 'http')
              if (/\.(jpg|jpeg|png|gif)/.test(href)) {
                return <a target='_blank' href={href} className='chat-image'>
                  <img src={href} />
                </a>
              } else {
                return <a target='_blank' href={href} className='chat-preview middle-row' style={S(`
                gap: .67em;
                `)}>
                  <RawWebsiteIcon href={href} style={S(`
                  height: 1.5em;
                  `)} />
                  <WebsiteTitle href={href} />
                </a>
              }
            })
            text = convertLinks(text)
          }
          let side = meta.user === auth.user ? 'right' : 'left'

          // return in reverse order
          return <>
            {text ?
            <div className={side} title={new Date(meta.t).toLocaleString()}>
              {text}
            </div> : ''}
            {previews?.slice().reverse().map(preview => 
            <div className={`${side} page`}>
              {preview}
            </div>
            )}
            {meta.page ? <>
              {meta.pageDesc ?
              <Link to={meta.page} className={`${side} page`}>
                {meta.pageDesc}
              </Link>
              : ''}
              <Link to={meta.page} className={`${side} page link`}>
                <div className='column center gap'>
                  {meta.pageImg ? <div className='img-cont'><img src={meta.pageImg}/></div> : ''}
                  <span style={S(`
                  background: #8882;
                  margin: -.25em; margin-top: 0;
                  // border-top: 1px solid currentcolor;
                  padding: .25em;
                  `)}>{meta.page}</span>
                </div>
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


const Style = styled(SettingStyles)`&#chat {
.login-block {
  // margin-top: 2.25em;
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
  // margin-top: 2.5rem !important;
  margin-top: .25rem !important;
  > * {
    margin: 0 !important;
  }
  z-index: 100100;
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
    padding-top: 0;
    // &::-webkit-scrollbar { display: none }
    height: 0;
    flex-grow: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column-reverse;
    // flex-direction: column;
    padding-bottom: 1rem;
    &::before {
      // content: "";
      height: 1rem;
      flex-shrink: 0;
    }
    &::after {
      content: "";
      height: 50%; width: 100%;
      flex-grow: 1;
      flex-shrink: 0;
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

      cursor: pointer !important;
      border: 1px solid #000;
      background: var(--id-color-text-readable);
      box-shadow: 0 2px var(--id-color-text);
      margin-bottom: 2px !important;

      background: var(--id-color);

      background: #fff;
      box-shadow: 0 2px #fff;

      &:hover, a:hover, &:hover a {
        text-decoration: underline;
      }
      .img-cont {
        display: inline-flex;
        // margin-right: .25rem;
        // padding: .1rem;
        // background: #00000011;
        // border-radius: .1rem;
        img {
          // margin-left: -.15rem;
          // height: 2rem;
          // height: 4em;
          width: 8em;
          image-rendering: pixelated;
        }

        // background: #8882;
        // margin: -.25em; margin-bottom: 0; padding: .25em;
        // width: calc(100% + .5em);
        // display: flex; align-items: center; justify-content: center;
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

.badges > .label {
  // background: #ddd;
}

.page:has(.chat-preview), .chat-preview {
  text-decoration: none !important;
}

.chat-image {
  padding: 0 !important;
  display: flex;
  img {
    max-height: min(30em, 67vh);
    max-width: min(30em, 50vw);
  }
}

}


input[type=checkbox] {
  -webkit-appearance: checkbox !important;
}
`