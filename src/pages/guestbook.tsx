import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { HalfLine, InfoBody, InfoStyles } from '../components/Info';
import api from '../lib/api';
import { useE, useEventListener, useF, useInterval, useR, useStyle } from '../lib/hooks';
import { useAuth, usePage, usePageSettings, useStored } from '../lib/hooks_ext';
import { q_parse } from '../lib/queue';
import { useSocket } from '../lib/socket';
import { store } from '../lib/store';
import { offDate } from '../lib/util';
import { convertLinks } from '../lib/render';
import { Scroller } from 'src/components/Scroller';
import { readable_text } from 'src/lib/color';

const { datetimes } = window as any

const PRINT_QUEUE = 'cyrus/print'
const GUESTBOOK_QUEUE = 'cyrus/guestbook'
const POSTS_PER_PERIOD = 5
const PERIOD_MINS = 2 // 12 * 60
let initialPrint = true

const _cp437 = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ `
// omit some characters, turn into table
const cp437 = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~ ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ `.match(/.{16}/g).map(line => line.match(/.{8}/g).join(' ')).join('\n')
const cp437Set = new Set(cp437)

let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D
function init(canvasEl: HTMLCanvasElement) {
  canvas = canvasEl
  ctx = canvas.getContext('2d')
}
const e2p = (e: PointerEvent): [number, number] => {
  const rect = canvas.getBoundingClientRect()
  const x = (e.clientX - rect.x) / rect.width * canvas.width
  const y = (e.clientY - rect.y) / rect.height * canvas.height
  return [x, y]
}
let down: [number, number] = undefined
let erase = false

const lineOptions = [2.0, 4.0, 8.0, 16.0]
let lineWidth = lineOptions[1]
const lineModeOptions = ['draw', 'erase']
let lineMode = lineModeOptions[0]
const draw = e => {
  ctx.strokeStyle = lineMode == 'draw' ? '#000' : '#fff'
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(...down)
  down = e2p(e)
  ctx.lineTo(...down)
  ctx.stroke()

  // make sure taps are drawn on iOS
  ctx.fillStyle = lineMode == 'draw' ? '#000' : '#fff'
  ctx.lineWidth = 0
  ctx.beginPath()
  ctx.arc(down[0], down[1], lineWidth/2, 0, 2*Math.PI)
  ctx.fill()
}

const PostContent = ({ type, content }: {
  type: string, content: string
}) => {
  if (type === 'data') {
    return <img src={content} />
  } else {
    return <div>
      {/* {convertLinks(
        content.split('\n').map(s => (s.match(/.{1,32}/g)||[]).join('\n')).join('\n'))} */}
      {convertLinks(content)}
    </div>
  }
}
const Post = ({ i, msg }: {
  msg: any, i: number
}) => {
  const user = msg.content[0].content.match(/u\/.+/)
  return <div className='post' data-i={i}>
    <div className='meta'>
      {user ? <Link to={user[0]}>{user[0]}</Link> : ''}
      {msg.content[0].content.replace(user, '') + '\n\n'}
    </div>
    <PostContent {...msg.content[1]} />
    {location.href.includes('localhost')
    ?
    <div style={{position:'absolute',top:'.5rem',right:'.75rem',cursor:'not-allowed'}}
    onClick={e => api.get(`/q/-/${GUESTBOOK_QUEUE}?i=${i}`)}>{i}</div>
    : ''}
    {'\n\n'}
  </div>
}

export default () => {
  usePageSettings({
    checkin: 'guestbook',
    background: '#ecff97',
    // text_color: readable_text('#e0ff1a'),
    text_color: '#000',
    transparentHeader: true,
  })
  
  const auth = useAuth()

  const [q, setQ]: any = useState({})
  const [name, setName] = useState('')
  const [time, setTime] = useState('')
  const [doodle, setDoodle] = store.use('guestbook-doodle', { default: false })
  const msgRef = useR()
  const errorOverlayRef = useR()
  const doodleRef = useR()
  const postsRef = useR()
  const [edited, setEdited] = useState(false)
  const [showChars, setShowChars] = useState(false)
  const [showError, setShowError] = useState(false)
  const [expand, setExpand] = useState(0)

  const [doodleSize, setDoodleSize] = useStored('guestbook-doodle-size', 1)
  const [doodleMode, setDoodleMode] = useState(0)
  const bumpDoodleSize = () => setDoodleSize((doodleSize + 1) % lineOptions.length)
  const bumpDoodleMode = () => setDoodleMode((doodleMode + 1) % lineModeOptions.length)
  useF(doodleSize, () => lineWidth = lineOptions[doodleSize])
  useF(doodleMode, () => lineMode = lineModeOptions[doodleMode])

  const dayAgo = offDate(d => d.setMinutes(d.getMinutes() - PERIOD_MINS))
  const printsTowardLimit = q.list?.filter(item => item.t > dayAgo) || []
  const rateLimited = printsTowardLimit.length >= POSTS_PER_PERIOD
  const nextPrint = rateLimited
    ? offDate(d => {
      d.setMinutes(d.getMinutes() + PERIOD_MINS + 1)
      d.setSeconds(0)
    }, printsTowardLimit[0].t)
      .toLocaleTimeString().replace(/:\d+ /, '')
    : false

  useF(auth, () => auth.user && !name && setName(`u/${auth.user}`))

  const handle = {
    clear: () => {
      canvas.width = canvas.width
      msgRef.current.value = ''
      setEdited(false)
      handle.errorOverlay()
    },
    parse: promise => promise
      .then(raw => {
        console.debug(raw)
        const q = q_parse(raw)
        // HACKY ignore first item (to hide first doodle on freshman.dev)
        q.list = q.list.slice(1)
        setQ(q)
      })
      .catch(err => {
        console.debug(err)
        setQ(err)
      }),
    load: () => handle.parse(api.get(`/q/${GUESTBOOK_QUEUE}`)),
    _time: () => {
      const date = new Date()
      let tz : any = -date.getTimezoneOffset()/60
      tz = (tz > 0) ? '+'+tz : tz
      const time = datetimes.ymdhms(date).replace(/:\d\d$/, '') + ` Z${tz}`
      return time
    },
    add: () => {
      // rate limit
      if (rateLimited) return
      // only add if msg or doodle exists
      if (doodle ? !edited : !msgRef.current.value) return

      const time = handle._time()
      const info = {
        name: name || 'anonymous',
        time,
        type: doodle ? 'data' : 'text',
        content: doodle
          ? canvas.toDataURL()
          : msgRef.current.value,
      }
      handle.clear()
      const msg = JSON.stringify({
        type: 'list',
        content: [
          { type: 'text', content: `${info.name}\n${info.time}` },
          { type: info.type, content: info.content },
        ],
      })
      handle.parse(api.post(`/q/${GUESTBOOK_QUEUE}`, { msg }))
      api.post(`/q/${PRINT_QUEUE}`, { msg })
      setShowChars(false)
    },
    time: () => {
      // const date = new Date()
      // let tz: any = -date.getTimezoneOffset()/60
      // tz = (tz > 0) ? '+'+tz : tz
      // setTime(date.toLocaleString().replace(',', '').replace(/:\d+ /, '')
      //   + ` Z${tz}`)
      setTime(handle._time())
    },
    errorOverlay: () => {
      const msgEl = msgRef.current
      const errorEl = errorOverlayRef.current
      let anyErrors = false
      errorEl.innerHTML = msgEl.value
        .split('')
        .map(s => {
          if (!cp437Set.has(s)) {
            anyErrors = true
            return `<span class="error">${s}</span>`
          }
          return s
        })
        .join('')
      setShowError(anyErrors)
    },
  }
  useF(() => {
    handle.load()
    // msgRef.current.value = '123456789-123456789-123456789-123\n2\n3\n4\n5\n6\n7\n8\n9'
    // msgRef.current.value =
    // // " _._     _,-\'\"\"`-._\n(,-.`._,\'(       |\\`-/|\n    `-.-\' \\ )-`( , o o)\n          `-    \\`_`\"\'-"
    // `2H₂ + O₂ ⇌ 2H₂O, R = 4.7 kΩ, ⌀ 200 mm  2H₂ + O₂ ⇌ 2H₂O, R = 4.7 kΩ, ⌀ 200 mm`
    // handle.errorOverlay()
    init(doodleRef.current)
  })
  useEventListener(window, 'keypress', e => {
    if (e.key == '1') erase = !erase
  })
  useEventListener(doodleRef.current, 'pointerdown', e => {
    down = e2p(e)
    // console.debug(down)
    if (!erase) {
      if (doodleMode === 0) setEdited(true)
      draw(e)
      draw(e)
    }
  })
  useEventListener(window, 'pointerup', e => {
    if (erase) {
      const to = e2p(e)
      ctx.clearRect(down[0], down[1], to[0]-down[0], to[1]-down[1])
    }
    down = undefined
  })
  useEventListener(window, 'pointermove', e => {
    if (down && !erase) draw(e)
  })
  useSocket({
    on: {
      q: key => {
        if (key.includes(GUESTBOOK_QUEUE)) {
          handle.load()
        }
      },
    },
    connect: socket => socket.emit('join', 'q')
  })

  useF(handle.time)
  useInterval(handle.time, 60_000, 1000 * (61 - new Date().getSeconds()))
  useEventListener(window, 'focus', handle.load)

  // visually print new items
  useE(q.list?.length, () => {
    const posts = postsRef.current
    if (posts && q.list) {
      window['_posts'] = posts
      posts.style.height = 0
      let currPrint = store.get('guestbook-print') || 0
      // let currPrint = 0

      // store last post to start scroll from in case posts are deleted
      const lastPrint = store.get('guestbook-print-last') || 0
      // const lastPrint = 0
      const lastPrintEl = posts.querySelector(`[data-i="${lastPrint}"]`)
      console.debug('LAST PRINT', lastPrintEl)
      currPrint = Math.min(currPrint, lastPrintEl
        ? posts.scrollHeight - lastPrintEl.offsetTop
        : posts.scrollHeight)
      store.set('guestbook-print-last', q.list[q.list.length-1]?.i)

      // hacky, this is the scroll container posts are within - used to maintain scroll
      const infoBody = posts?.parentNode.parentNode

      // starting at current print height, expand posts until 100% height
      posts.style.height = currPrint+'px'
      posts.scrollTop = posts.scrollHeight - currPrint
      let timeout = setTimeout(() => {
        initialPrint = false
        let t = performance.now() // print using dt instead of constant val
        timeout = setInterval(() => {
          currPrint = Math.min(posts.scrollHeight, currPrint + (performance.now() - t)/5)
          t = performance.now()
          store.set('guestbook-print', currPrint)
          posts.style.height = currPrint+'px'
          posts.scrollTop = posts.scrollHeight - currPrint
          if (infoBody.scrollTop > 0) infoBody.scrollTop += 1
          if (posts.scrollTop <= 0) {
            clearInterval(timeout)
          }
        }, 5)
      }, initialPrint ? 1000 : 0)
      return () => clearTimeout(timeout)
    }
  })

  const [typePos, setTypePos] = useState(0)
  // const rows = expand ? 16 : 8
  const rows = (expand + 1) * 8
  useF(rows, () => {
    const msgEl = msgRef.current as any
    const lines = msgEl.value.split('\n')
    // limit to exactly 32x8 box - nvm, 32x16
    msgEl.value = lines
      .map(line => line.padEnd(32 * Math.ceil(line.length / 32), '•'))
      .join('\n')
      .slice(0, 32 * rows + Math.min(rows - 1, lines.length - 1))
      .replace(/•/g, '')
    handle.errorOverlay()
  })
  useF(showChars, () => showChars && setTimeout(() => msgRef.current.focus(), 10))
  return <Style>
    <InfoBody>
      <Scroller />
      <HalfLine ratio={1} />
      <div>
        <div id='heading'>Leave a receipt</div>
        <div id='description'>
          {/* not only will it be added here, it'll <a href='https://learn.adafruit.com/mini-thermal-receipt-printer'>print out physically</a>, too
          - 32 letters wide */}
          it'll print out in the real world, too (maybe)
        </div>
        <br/>
      </div>
      <div id='printer-container' style={q.list?{}:{visibility:'hidden'}}>
        <div id='printer'>
          {rateLimited
          ? <div className='block'>
            print limit reached{'\n'}
            (come back at {nextPrint})
          </div>
          : ''}
          <div>
            <input type='text'
            placeholder='your name'
            value={name} onChange={e => setName(e.target.value)}/>
            <div>{time}</div>
          </div>
          <div className='flex'>
            <button onClick={e => setDoodle(false)}
            style={{background:'rgb(253 162 162)'}}>
              {doodle?'':'> '}message{doodle?'':' <'}</button>
            <button onClick={e => setDoodle(true)}
            style={{background:'rgb(154 154 253)'}}>
              {doodle?'> ':''}doodle{doodle?' <':''}</button>
          </div>
          <div className='flex down'>
            <div id='content'>
              <textarea id='message' ref={msgRef} rows={rows} cols={32}
              style={{display:doodle?'none':''}}
              placeholder='add your message'
              onSelect={(e:any) => setTypePos(e.target.selectionEnd)}
              onChange={e => {
                const selection = [e.target.selectionStart, e.target.selectionEnd]
                const lines = e.target.value.split('\n')
                // limit to exactly 32x8 box - nvm, 32x16
                const temp = lines
                  .map(line => line.padEnd(32 * Math.ceil(line.length / 32), '•'))
                  .join('\n')
                if (temp.length >= 32 * 8 + Math.min(8 - 1, lines.length - 1)) {
                  if (temp.length >= 64 * 8 + Math.min(8 - 1, lines.length - 1)) {
                    setExpand(2)
                  } else {
                    setExpand(1)
                  }
                }
                e.target.value = temp
                  .slice(0, 32 * 16 + Math.min(16 - 1, lines.length - 1))
                  .replace(/•/g, '')
                ;[e.target.selectionStart, e.target.selectionEnd] = selection
                handle.errorOverlay()
              }}
              onScroll={(e:any) => errorOverlayRef.current.scrollTop = e.target.scrollTop}/>
              <div id='error-overlay' ref={errorOverlayRef} className='post'
              style={{display:doodle?'none':''}}
              onScroll={(e:any) => msgRef.current.scrollTop = e.target.scrollTop}></div>
              <canvas ref={doodleRef} id='scratchpad' height="100" width="174" style={{display:doodle?'':'none'}}></canvas>
            </div>
            <div className='flex space'>
              {/* <button onClick={e => handle.clear()}
              style={doodle&&edited?{}:{visibility:'hidden'}}>
                clear</button> */}
              {doodle
              ?
              <div>
                <button onClick={bumpDoodleSize}>
                  size {doodleSize}</button>
                <button onClick={bumpDoodleMode}>
                  {['draw', 'erase'][doodleMode]}</button>
                <button onClick={e => handle.clear()}
                style={doodle&&edited?{}:{visibility:'hidden'}}>
                  clear</button>
              </div>
              :
              <div id='chars-container'>
                <div>
                  <button onClick={e => setShowChars(!showChars)}>symbols</button>
                  {showError
                  ? <div id='error-info' className='error'>
                    (won't print)
                    <div id='error-info-tooltip'>
                      {/* will turn into ? when printed physically */}
                      to appear as ? on physical print
                    </div>
                  </div>
                  : <button onClick={e => setExpand((expand + 1) % 3)}>32x{rows}</button>}
                </div>
                {showChars
                ? <div id='chars'>
                  {cp437.split('\n').map((line, i) =>
                    <div key={i} className='char-row'>
                      {line.split('').map((l, j) => <span key={j}
                      className={`char char-${l !== ' '}`}
                      onPointerDown={e => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        const msgEl = msgRef.current
                        msgEl.value = msgEl.value.slice(0, typePos) + l + msgEl.value.slice(typePos)
                        setTypePos(typePos + 1)
                        handle.errorOverlay()
                      }}>{l}</span>)}
                    </div>
                  )}
                </div>
                : ''}
              </div>
              }
              <button onClick={e => handle.add()}
              // style={{background:'rgb(255 224 131)'}}
              style={{background:'rgb(151 210 156)'}}>
                add</button>
            </div>
          </div>
        </div>
        <div id='post-list' ref={postsRef}>
          {q.list?.slice().reverse().map((entry, i) => <Post key={i} {...entry} />)}
        </div>
      </div>
      {/* <div>
        <input type='text'
        placeholder='your name'
        value={name} onChange={e => setName(e.target.value)}/>
        <div>{time}</div>
      </div>
      <div className='flex'>
        <button onClick={e => setDoodle(false)} style={{opacity:doodle?.8:1}}>
          {doodle?'':'> '}message{doodle?'':' <'}</button>
        <button onClick={e => setDoodle(true)} style={{opacity:doodle?1:.8}}>
          {doodle?'> ':''}doodle{doodle?' <':''}</button>
      </div>
      <div className='flex down'>
        <div>
          <textarea ref={msgRef} rows={8} cols={32} style={{display:doodle?'none':''}}/>
          <canvas ref={doodleRef} id='scratchpad' height="100" width="170" style={{display:doodle?'':'none'}}></canvas>
        </div>
        <button onClick={e => handle.add()}>
          add</button>
      </div>
      <div>
        {q?.list?.map((entry, i) => <Entry key={i} {...entry} />)}
      </div> */}
      {/* <div style={{ whiteSpace: 'pre', fontSize: '.5rem' }}>
        {JSON.stringify(q, null, 2)}
      </div> */}
    </InfoBody>
  </Style>
}

const printWidth = '19.3em'
const Style = styled(InfoStyles)`
text-shadow: none;
--id-color: #ecff97;
animation: id-color-keyframes 2s infinite linear;
@keyframes id-color-keyframes {
  0% { --id-color: #ecff97 }
  50% { --id-color: #feff97 }
  100% { --id-color: #ecff97 }
}

// &::before {
//   content: ""; width: 100%; height: 100%;
//   position: absolute; top: 0; left: 0;
//   background: url(https://thumbs.dreamstime.com/b/geometric-seamless-pattern-squiggles-vector-geometric-abstract-seamless-pattern-chaotic-squiggles-interior-design-invitations-125967649.jpg);
//   opacity: .03;
// }
#heading {
  // text-decoration: underline;
  font-weight: bold;
  text-shadow: 2px 2px 1px white;
  // font-size: 1.2rem;
  // border-bottom: 1px dashed black;
  // border-bottom: 1px solid black;
  // border-top: 1px solid black;
  width: fit-content;
  // margin-bottom: 0.3rem;
  margin-top: 1rem;
}
#description {
  // font-size: .8rem;
  font-size: .8em;
  font-style: italic;
  text-shadow: none;
}
#printer-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  * {
    font-size: 12px;
    font-family: 'Roboto Mono';
  }
  > * { background: white; }
}
#printer {
  padding: 1rem;
  box-sizing: content-box;
  border: 2px solid black;
  border-radius: 2px;
  box-shadow: 2px 2px #0008;
  > * {
    margin-bottom: .25rem;
  }
  z-index: 1;
  position: relative;

  border-left-width: 1em;
  border-right-width: 1em;
  border-bottom-width: 2em;
  margin-bottom: -1em;
}
.block {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: #fffc;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
  white-space: pre-line;
}
input, textarea, canvas, #error-overlay {
  // border: 1px solid #0008;
  border: 1px solid #000;
  // background: #0001;
  border-radius: 0;
  word-break: break-all;
  resize: none;
  width: ${printWidth};
  box-sizing: content-box;
  box-shadow: none;
}
input, textarea, #error-overlay {
  // padding: 0;
  padding: .04rem .2rem;
}
button {
  background: none;
  color: inherit;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;

  margin-right: .5rem;
  &:last-child {
    margin-right: 0;
  }
  padding: 0 .5rem;
  border: 1px solid black;
  border-radius: .2rem;
  white-space: pre;
  outline: none !important;
}
.flex {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  &.down {
    flex-direction: column;
    align-items: flex-end;
  }
  &.space {
    justify-content: space-between;
  }
}

#scratchpad {
  cursor: pointer;
  // border: 1px solid #0008;
  background: #fff1;
  // width: 100%;
  image-rendering: pixelated;
  opacity: .8;
  user-select: none;
  // padding: .09rem 0;
  padding: .5px 0;
  touch-action: none;
  width: calc(${printWidth} + .4rem);
}

#post-list {
  // box-shadow: 4px 0 #0001;
  background: transparent;
  position: relative;
  left: 1px; top: 1em;
  overflow: scroll;
  ::-webkit-scrollbar { display:none; }
  height: 0;
  margin-bottom: 2em;

  // z-index: 1;
  // margin-top: -1em;
  box-sizing: content-box;
  border-top: 1px dotted black;
  box-shadow: 0 4px #0001 inset;
}
.post {
  background: #fff;
  text-shadow: none;
  white-space: pre-wrap;
  word-break: break-all;
  border: 1px solid black;
  border-top-style: dashed;
  &:not(:last-child) { border-bottom: none; }
  overflow: hidden;
  width: ${printWidth};
  box-sizing: content-box;
  padding: .5rem .75rem;
  margin-top: -1px;
  position: relative;
  & img {
    width: 100%;
    image-rendering: pixelated;
    opacity: .8;
  }
  & .meta * {
    color: black;
  }
}
textarea, .post {
  line-height: 17px;
}

#chars-container {
  position: relative;
}
#chars {
  position: absolute;
  top: calc(100% + .25rem); left: 0;
  width: calc(${printWidth} + .4rem);
  box-sizing: content-box;
  background: white;
  border: 1px solid black;
  box-shadow: 2px 2px 4px #000b;
  white-space: pre;
  cursor: default;
  .char-row {
    display: flex;
    .char {
      flex-grow: 1;
      text-align: center;
      &.char-true:hover {
        background: black; color: white;
        cursor: pointer;
      }
    }
  }
}
#content {
  position: relative;
}
#error-overlay {
  // display: none;
  position: absolute;
  top: 0; top: 1px;
  left: 0;
  border-color: transparent;
  margin: 0;
  pointer-events: none;
  // color: red;
  height: calc(100% - 0.25rem - 4px);
  overflow: scroll;
  ::-webkit-scrollbar { display:none; }
  // &::after {
  //   content: " ( won't print physically ) ";
  //   padding: 2px;
  //   display: none;
  //   position: fixed;
  //   bottom: .25rem; right: .25rem;
  //   z-index: 1;
  //   width: max-content;
  //   background-color: white;
  //   border: 1px solid black;
  //   box-shadow: 1px 1px #0008;
  //   border-radius: 2px;
  // }
  // &:hover::after {
  //   display: inline-block;
  // }
  background: inherit;
}
.error {
  // pointer-events: all;
  background: #f004;
  background: fixed repeating-linear-gradient(-45deg, #f001, #f001 3px, #f002 3px, #f002 6px);
  border-radius: 1px;
  // position: relative;
  // cursor: pointer;
}
#error-info {
  display: inline-block;
  cursor: pointer;
  #error-info-tooltip {
    display: none;
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    // width: max-content;
    // max-width: 20em;
    width: ${printWidth};
    box-sizing: content-box;
    background: white;
    border: 1px solid black;
    padding: 0 0.2rem;
    z-index: 1;
    box-shadow: 1px 1px black;
    box-shadow: 2px 2px 4px #000b;
  }
  &:hover #error-info-tooltip {
    display: block;
  }
}
`
