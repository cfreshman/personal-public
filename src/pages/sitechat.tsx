import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBadges, InfoBody, InfoFile, InfoLoginBlock, InfoSection, InfoStyles, Multiline } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useEventListener, useF, useM, useR, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { mobile, S, server } from 'src/lib/util'
import { store } from 'src/lib/store'
import { useSocket } from 'src/lib/socket'
import { convertLinks, extractLinks } from 'src/lib/render'
import { RawWebsiteIcon, WebsiteTitle } from 'src/components/website_title'
import { open_popup, openPopup } from 'src/components/Modal'
import { openLogin } from 'src/lib/auth'
import { Dropdown } from 'src/components/individual/Dropdown'

const { named_log, Q, set, list } = window as any
const NAME = 'sitechat'
const log = named_log(NAME)

const audio_sound_new_message = new Audio('/raw/audio/effects/message.mp3')
function sound_new_message() {
  audio_sound_new_message.play()
}

export const Chat = ({ hash }: {
  hash: string
}) => {
  const [{user:viewer}] = auth.use()
  const [chat, set_chat] = useS(undefined)
  const [typing, set_typing] = useS(false)
  const [update, set_update] = useS(undefined)
  const [message, set_message] = store.use('uglychat-message', { default:'' })

  const [recorder, set_recorder] = useS<MediaRecorder>(undefined)
  const [audio_src, set_audio_src] = useS(undefined)
  const [audio_file, set_audio_file] = useS(undefined)

  const handle = {
    parse: new_chat => {
      log({new_chat})
      set_chat(new_chat)
      if (new_chat?.messages?.length !== chat?.messages?.length) {
        if (chat?.messages?.length) sound_new_message()
        set_typing(false)
      }
    },
    a_load: async () => {
      if (hash) {
        const { chat } = await api.get(`/chat/${hash}`)
        handle.parse(chat)
      }
    },
    a_send: async (_message=message) => {
      if (_message) {
        set_message('')
        const { chat } = await api.post(`/chat/${hash}`, { messages: [{ text:_message }] })
        handle.parse(chat)
      }
    },
    typing: e => {
      if (chat && viewer) {
        socket.emit('chat:typing', chat.hash, viewer, e.target.value)
      }
    },
    record: () => {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const recorder = new MediaRecorder(stream)
        const recorder_chunks = []
        recorder.ondataavailable = e => recorder_chunks.push(e.data)
        recorder.onstop = e => {
          const audio_blob = new Blob(recorder_chunks, { type: 'audio/mpeg-3' })
          const audio_url = window.URL.createObjectURL(audio_blob)
          set_audio_src(audio_url)
          set_audio_file(new File([audio_blob], 'audio.mp3'))
        }
        recorder.start()
        set_recorder(recorder)
      })
    },
    stop: () => {
      recorder?.stop()
      set_recorder(undefined)
    },
    audio_send: () => {
      api.put(`/audio`, audio_file, {
        headers: { 'Content-Type': audio_file.type || 'multipart/form-data' },
      })
      .then(result => {
        log('upload result', result)
        
      })
    },
  }

  const socket = useSocket({
    on: {
      'chat:update': (updateHash, messages, unread) => {
        log('update', {updateHash,messages,unread})
        console.debug(updateHash, messages, unread)
        set_update({ updateHash, messages, unread })
      },
      'chat:typing': (updateHash, other, isTyping) => {
        if (hash === updateHash) {
          set_typing(isTyping)
        }
      },
    }
  })
  useF(update, () => {
    if (update && chat) {
      const { updateHash, messages, unread } = update
      if (hash === updateHash) {
        set_chat({ ...chat, messages: chat.messages.concat(messages) })
        set_typing(false)
      }
    }
  })

  useF(viewer, hash, handle.a_load)
  useEventListener(window, 'focus', () => handle.a_load())

  useF(viewer, message, () => {
    if (!viewer && message) {
      set_message('')
      open_popup(close => <>
        <InfoBadges labels={[
          { 'log in to send messages': () => openLogin() },
        ]} />
      </>)
    }
  })

  const hide_media = true
  const hide_audio = true
  const [image_upload_wait, set_image_upload_wait] = useS(false)
  const image_upload_ref = useR()
  const [audio_upload_wait, set_audio_upload_wait] = useS(false)
  const audio_upload_ref = useR()

  let lastDateString, last_name
  return <ChatStyle className='column'>
    {viewer||1 ? <>
    <div className={`messages`}>
      {chat?.messages.length === 0
      ? <div className='default chat-info'>no messages</div>
      : ''}
      {typing ? <div className={`non-message default left typing`}>...</div> : ''}
      {chat?.messages.slice().reverse().map((msg, i, arr) => {
        const { text, meta } = msg

        let previews, ignore_text
        if (text) {
          let removed_text = text // if only images, remove text message
          const links = extractLinks(text)
          previews = links.filter(x => x).map(href => {
            href = href[0]==='/' ? server + href : ('https://'+href).replace('https://http', 'http')
            if (/(\.(jpg|jpeg|png|gif))|gstatic.com\/images|pbs.twimg.com\/media/.test(href)) {
              removed_text = removed_text.replace(href.replace(/https?:\/\//, ''), '')
              return <a target='_blank' href={href} className='chat-image'>
                <img src={href} />
              </a>
            } else if (/(\.(mp3|wav))/.test(href)) {
              removed_text = removed_text.replace(href.replace(/https?:\/\//, ''), '')
              return <audio className='chat-audio' src={href} controls />
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
          ignore_text = !removed_text.replaceAll(/https?:\/\//g, '').trim()
        }

        const linked_text = text && convertLinks(text)
        const side = meta.user === viewer ? 'right' : 'left'
        const base = `${side} ${meta.classes || 'default'}`
        const name = meta.user === viewer || chat.users.length < 3 ? undefined : meta.user
        const date = new Date(meta.t)
        const useDate = lastDateString !== date.toDateString()
        if (useDate) lastDateString = date.toDateString()

        const jsx = <>
          {name && name !== last_name ? <div className={`non-message ${base} name`}>{name}</div> : null}
          {linked_text && !ignore_text ?
          <div className={`message ${base}`} title={date.toLocaleString()}>
            {linked_text}
          </div> : ''}
          {previews?.slice().reverse().map(preview => 
          <div className={`message ${side} page`}>
            {preview}
          </div>
          )}
          {meta.page ? <>
            {meta.pageDesc ?
            <A href={meta.page} className={`message ${base} page`}>
              {meta.pageDesc}
            </A>
            : ''}
            <A to={meta.page} className={`message ${base} page link`}>
              {meta.pageImg ? <div className='img-cont'><img src={meta.pageImg}/></div> : ''}
              {meta.page}
            </A>
          </>
          : ''}
          {i === arr.length-1 || meta.t - arr[i+1].meta.t > 60 * 60 * 1000 // > 1 hour
          ? <div className='non-message timestamp'>{new Date(meta.t).toLocaleString(undefined, {
            dateStyle: 'short',
            timeStyle: 'short',
          }).replace(',', '')}</div>
          : ''}
        </>
        last_name = name
        return jsx
      })}
      <div className='spacer' />
    </div>
    {1?null:<div id='message-container' className='center-row wide' style={S(`
    gap: .25em;
    position: relative;
    `)}>
      {message ? null : <>
        <button id='message-add' className='middle-row' style={S(`
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;

        position: absolute;
        bottom: calc(100% + .25em);
        left: 0;

        height: 1.75em;
        `)} onClick={e => {
          const MessageAddPopup = ({ close }) => {
            const [wait, set_wait] = useS(false)
            const ref = useR()
            useF(() => ref.current.click())
            return wait ? 'one sec...' : <div style={S(`font-size:1em`)}>
              <InfoBadges labels={[
                <InfoFile ref={ref} label='select image' setValue={file => {
                  if (file) {
                    set_wait(true)
                    api
                    .post(`/image`, file, {
                      headers: { 'Content-Type': file.type || 'multipart/form-data' },
                    })
                    .then(result => {
                      log('upload result', result)
                      handle.a_send(result.href)
                      close()
                    })
                    .catch(e => {
                      alert('error uploading image')
                      close()
                    })
                  } else {
                    close()
                  }
                }} />,
              ]} />
              <HalfLine />
              <div className='row end'>
                <InfoBadges labels={[
                  { close }
                ]} />
              </div>
            </div>
          }
          open_popup(close => <MessageAddPopup close={close} />)
        }}><span style={S(`font-size:1em`)}>🖼️ send image</span></button>
      </>}
      {1 ? null : <>
        <Dropdown position='n e' label={<div id='message-add' style={S(`
        background: var(--id-color-text) !important;
        width: 2em; height: 2em; border-radius: 50%;
        flex-shrink: 0;
        color: var(--id-color) !important;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;

        // border-radius: .25em;
        // height: 100%;
        `)} onClick={e => {
          // const MessageAddPopup = ({ close }) => {
          //   const [wait, set_wait] = useS(false)
          //   return wait ? 'one sec...' : <div style={S(`font-size:1em`)}>
              
          //   </div>
          // }
          // open_popup(close => <MessageAddPopup close={close} />)
        }}><span style={S(`font-size:1em`)}>+</span></div>} dropdown_style={S(`
        border-radius: 0;
        `)}>
          <div style={S(`
          border: 1px solid var(--id-color-text);
          background: var(--id-color);
          font-size: 1.5rem;
          width: max-content; height: max-content;
          `)}>
            <InfoBadges labels={[
              <InfoFile label='send image' setValue={file => {
                if (file) {
                  // set_wait(true)
                  api
                  .post(`/image`, file, {
                    headers: { 'Content-Type': file.type || 'multipart/form-data' },
                  })
                  .then(result => {
                    log('upload result', result)
                    handle.a_send(result.href)
                    close()
                  })
                  .catch(e => {
                    alert('error uploading image')
                    close()
                  })
                }
              }} />,
            ]} />
          </div>
        </Dropdown>
      </>}
      <Multiline id='message-input' style={S(`
      border-radius: .25em;
      width: 100% !important;
      background: var(--id-color-text) !important;
      color: var(--id-color-text-readable) !important;
      padding: .25em;
      flex-grow: 1;

      // border-radius: 1.25em;
      // padding: .25em .75em;

      border-radius: .25rem;
      padding: .25rem;
      `)} extra_height='.5em' value={message} setValue={set_message} onChange={handle.typing} onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handle.a_send().then(() => set_message(''))
        }
      }} />
    </div>}
    {0?null:<div id='message-container' className='column wide' style={S(`
    gap: .25em;
    `)}>
      <Multiline id='message-input' style={S(`
      width: 100% !important;
      background: var(--id-color-text) !important;
      color: var(--id-color-text-readable) !important;
      flex-grow: 1;
      border-radius: .25rem;
      padding: .25rem;
      `)} extra_height='.5em' value={message} setValue={set_message} onChange={handle.typing} onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handle.a_send().then(() => set_message(''))
        }
      }} />
      {hide_media?null:<div id='message-buttons' className='row gap'>
        <button className='middle-row' style={S(`
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;

        height: 1.75em;
        `)} onClick={e => {
          image_upload_ref.current.click()
        }}>
          <span style={S(`font-size:1em`)}>{image_upload_wait ? '🖼️ one sec...' : '🖼️ send image'}</span>
          <span style={S('display:none')}>
            <InfoFile image ref={image_upload_ref} label='select image' setValue={file => {
              if (file) {
                set_image_upload_wait(true)
                api
                .post(`/image`, file, {
                  headers: { 'Content-Type': file.type || 'multipart/form-data' },
                })
                .then(result => {
                  log('upload result', result)
                  handle.a_send(result.href)
                  close()
                })
                .catch(e => {
                  alert('error uploading image: ' + (e.error || e.message || e))
                  close()
                })
                .finally(() => {
                  set_image_upload_wait(false)
                })
              } else {
                close()
              }
            }} />
          </span>
        </button>
        {hide_audio?null:<button className='middle-row' style={S(`
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;

        height: 1.75em;
        `)} onClick={e => {
          audio_upload_ref.current.click()
        }}>
          <span style={S(`font-size:1em`)}>{audio_upload_wait ? '🔊 one sec...' : '🔊 send audio'}</span>
          <span style={S('display:none')}>
            <InfoFile audio ref={audio_upload_ref} label='select audio' setValue={file => {
              if (file) {
                set_audio_upload_wait(true)
                api
                .post(`/audio`, file, {
                  headers: { 'Content-Type': file.type || 'multipart/form-data' },
                })
                .then(result => {
                  log('upload result', result)
                  handle.a_send(result.href)
                  close()
                })
                .catch(e => {
                  alert('error uploading audio: ' + (e.error || e.message || e))
                  close()
                })
                .finally(() => {
                  set_audio_upload_wait(false)
                })
              } else {
                close()
              }
            }} />
          </span>
        </button>}
      </div>}
    </div>}
    </>
    :
    // <div>log in to access chat</div>
    <div><InfoLoginBlock inliine to={'access chat'} /></div>
    }
  </ChatStyle>
}

export default () => {

  const [{user:viewer}] = auth.use()
  useF(viewer, async () => {
    if (viewer) {
      const { success } = await api.get(`/chat/uglychat/join`)
    }
  })

  usePageSettings({
    professional: true,
  })
  return <Style className='column tall gap' style={S(`
  `)}>
    <InfoBody>
      <div id='chat-container' className='grow column gap'>
        <Chat hash='uglychat' />
      </div>
      {/* <div className='middle-row'>this is ugllychat</div> */}
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
    &:active {
      translate: 0;
      box-shadow: none;
    }
  }
  &:disabled {
    cursor: default;
    color: #888;
    // background: #ccc;
  }
  &.on {
    background: var(--id-color-text);
    color: var(--id-color-text-readable);
    translate: 0;
    box-shadow: none;
  }
  line-height: 1.3em;
}

--id-color-text: #222;
--id-color-text-readable: #fff;
background: var(--id-color) !important;
color: var(--id-color-text) !important;
// padding: .5em;
font-size: .8em;
font-family: monospace;
`
const Style = styled(InfoStyles)`
.body {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;

  gap: .25em;

  padding: 0 !important;
  // padding-bottom: .5em !important;
}

#chat-container {
  --id-color: #fff;
  width: 100%;
  // border-radius: .25em;
  background: var(--id-color);
}

${common_css}

box-shadow: none !important; /* to undo expand style (bad code) */
`


const ChatStyle = styled.div`
height: 100%; width: 100%; overflow: hidden;
gap: .5em;
padding: .5em;

.messages {
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
  align-items: flex-start;
  margin: -.5em 0;
  width: 100%;
  padding: .5em 0;
  height: 0; flex-grow: 1; overflow-y: scroll; padding-right: 0;

  ${mobile ? '' : `
  margin-right: -.5rem;
  width: calc(100% + .5rem);
  `}

  .message, .non-message {
    max-width: calc(100% - 2em);
    word-break: break-all;

    &.message, &.typing {
      background: #ddd;
      padding: .25em;
      border-radius: .25em;
    }
    &.right {
      align-self: flex-end;
      &.message {
        background: var(--id-color-text);
        color: var(--id-color);
      }
    }
    &.page {
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

      .img-cont {
        display: inline-flex;
        img {
          width: 8em;
          image-rendering: pixelated;
        }
      }
    }
  }
  .chat-info {
    align-self: center;
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
  .name::before {
    content: "↳ ";
  }
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

.chat-audio {
    background: #eee;
}
`