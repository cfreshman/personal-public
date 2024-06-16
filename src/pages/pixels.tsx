import React, { useState } from 'react';
import styled from 'styled-components';
import { InfoLoginBlock } from '../components/Info';
import api from '../lib/api';
import { openLogin } from '../lib/auth';
import { useEventListener, useF, useInterval, useR } from '../lib/hooks';
import { useAuth, usePageSettings, useHashState } from '../lib/hooks_ext';
import { useSocket } from '../lib/socket';
import { store } from '../lib/store';
import { fields } from '../lib/types';

const SIZE = 64, FETCH_MS = 1000;
const WIDTH = SIZE, HEIGHT = SIZE;
let canvasScale: number;
let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D;
let drawn: HTMLCanvasElement, draw: CanvasRenderingContext2D;
let reference: string, referenceTimestamp: number;
const referenceImg = new Image();
let erased: boolean, dirty: boolean;
let mouse = [0, 0];
const isMobile = /iPhone|iPod|Android/i.test(navigator.userAgent);
let panned = false;

// let socket;
let outOfDate: boolean;

const PALETTE = 'garden-palette'
const ORIGINAL_CLR = {
  natural: '#f2eee3',
  erase: '#f2eee3',
  black: '#0f0f0e',
  white: '#ffffff',
  red: '#eb3d51',
  orange: '#ff9838',
  yellow: '#ffe747',
  green: '#83f674',
  cyan: '#6dfdec',
  blue: '#558df7',
  purple: '#a059f7',
  pink: '#faa8fa',
  brown: '#5c4b3a',
  tan: '#c4a789',
  green1: '#2a652e',
  green2: '#2e8548',
  green3: '#51bd6c',
  green4: '#8de793',
  custom1: '#555555',
  custom2: '#bbbbbb',
}
const CLR: fields<string> = store.get(PALETTE) ?? ORIGINAL_CLR
const SZ = {
  '.4rem': 1,
  '.7rem': 2,
  '1rem': 4
}
const TYPE = {
  draw: 'draw',
  fill: 'fill',
  line: 'line',
  pick: 'pick',
}

const copyCanvas = (): HTMLCanvasElement => {
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  copy.getContext('2d').drawImage(canvas, 0, 0);
  return copy;
}

const initCanvas = (hash: string) => {
  canvas = document.getElementById('garden') as HTMLCanvasElement;
  ctx = canvas.getContext('2d');

  resize();

  reference = hash;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawn = copyCanvas();
  draw = drawn.getContext('2d');
}

const updateCanvas = (hash: string, image: CanvasImageSource) => {
  if (hash === reference) {
    if (erased) {
      erased = false;
      dirty = true;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, (image as any).width as number, (image as any).height as number, 0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(drawn, 0, 0);
    draw.clearRect(0, 0, drawn.width, drawn.height);
  }
}

const resize = () => {
  const save = copyCanvas();
  const style = window.getComputedStyle(canvas.parentElement);
  const containerWidth = Number(style.width.slice(0, -2));
  const containerHeight = Number(style.height.slice(0, -2));

  canvasScale = Math.min(containerWidth / WIDTH, containerHeight / HEIGHT);
  canvas.style.width = `${canvasScale * WIDTH}px`;
  canvas.style.height = `${canvasScale * HEIGHT}px`;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(save, 0, 0, canvas.width, canvas.height);
  save.remove();
}

const floodFill = (x, y, original, fill) => {
  const getImgData = (img: ImageData, x: number, y: number) => {
    if (x < 0 || x >= img.width || y < 0 || y >= img.height) return undefined
    const i = (y * img.width * 4) + (x * 4)
    return img.data[i] === undefined
      ? undefined
      : img.data.slice(i, i + 4)
  }
  const eqImgData = (img: ImageData, pixel: ImageData, x: number, y: number) => {
    const imgGet = getImgData(img, x, y)
    if (!imgGet) return false
    return imgGet.every((_, i) => imgGet[i] === pixel.data[i])
  }
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const adj = (img: ImageData, pos: number[]): number[][] => {
    return [[-1, 0], [1, 0], [0, -1], [0, 1]].map(off => {
      const x_off = pos[0] + off[0]
      const y_off = pos[1] + off[1]
      return (getImgData(img, x_off, y_off))
        ? [x_off, y_off]
        : undefined
    }).filter(e => e)
  }
  if (eqImgData(original, fill, 0, 0)) return
  const frontier = [[x, y]]
  const filled = new Set()
  filled.add(`${x} ${y}`)
  while (frontier.length) {
      adj(img, frontier.pop())
          .filter(pos => !filled.has(`${pos[0]} ${pos[1]}`)
            && eqImgData(img, original, pos[0], pos[1]))
          .forEach(pos => {
            // console.log(pos)
            frontier.push(pos)
            filled.add(`${pos[0]} ${pos[1]}`)
            draw.fillRect(pos[0], pos[1], 1, 1)
          });
  }
}

const last = {
  pos: undefined,
  size: undefined,
  color: undefined,
  type: undefined,
  line: true,
}
const drawPixel = (x, y, size, color, type) => {
  size = SZ[size]
  const offset = Math.floor(size/2)
  if (false && color === CLR.erase) {
    erased = true;
    ctx.clearRect(x - offset, y - offset, size, size)
    draw.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    if (type === TYPE.fill) {
      const original = ctx.getImageData(x, y, 1, 1)
      draw.fillStyle = color;
      draw.fillRect(x - offset, y - offset, size, size)
      const fill = draw.getImageData(x, y, 1, 1)
      floodFill(x, y, original, fill)
    } else if (type === TYPE.line) {
      draw.fillStyle = color
      if (!last.line && last.pos
        && (last.pos[0] !== x || last.pos[1] !== y)
        && last.type === type && last.color === color && last.size === size) {

        const marks = Math.abs(last.pos[0] - x) + Math.abs(last.pos[1] - y)
        for (let i = 0; i <= marks; i++) {
          const lerp = i / marks
          const x_lerp = lerp * last.pos[0] + (1 - lerp) * x
          const y_lerp = lerp * last.pos[1] + (1 - lerp) * y
          draw.fillRect(Math.round(x_lerp - offset), Math.round(y_lerp - offset), size, size)
        }
        last.line = true
      } else {
        draw.fillRect(x - offset, y - offset, size, size)
        if (!last.pos || (last.pos[0] !== x || last.pos[1] !== y)) {
          last.line = false
        }
      }
    } else {
      draw.fillStyle = color
      draw.fillRect(x - offset, y - offset, size, size)
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(referenceImg, 0, 0)
    ctx.drawImage(drawn, 0, 0)
  }
  dirty = true;
  Object.assign(last, { pos: [x, y], size, color, type })
}


const ColorDot = ({ choice, color, setColor }: { choice: string, color: string, setColor }) => <div
  style={{ backgroundColor: choice }}
  onClick={() => setColor(choice)}
  className={'color dot ' + (choice === color)} />

const SizeDot = ({ choice, color, size, setSize }: { choice: string, size: string, color: string, setSize }) => <div
  style={{ fontSize: choice, backgroundColor: color }}
  onClick={() => setSize(choice)}
  className={'size dot ' + (choice === size)} />

const TypeEntry = ({ choice, type, setType }: { choice: string, type: string, setType }) => <div
  onClick={() => setType(choice)}
  className={'type entry ' + (choice === type)}>
    {choice}
  </div>

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
  const hex = x.toString(16)
  return hex.length === 1 ? '0' + hex : hex
}).join('')

const pointers = {}
const Wall = ({ hash, blocked }: { hash: string, blocked: boolean }) => {
  const auth = useAuth();
  const [down, setDown] = useState(false);
  const [move, setMove] = useState(undefined);
  const [size, setSize] = useState('.4rem');
  const [color, setColor] = useState(CLR.black);
  const [type, setType] = useState(TYPE.draw)

  const handle = {
    draw: (e, force?) => {
      const rect = e.target.getBoundingClientRect();
      mouse = [
        e.clientX - rect.left,
        e.clientY - rect.top
      ];
      if (down || force) {
        const x = Math.floor(mouse[0] / canvasScale)
        const y = Math.floor(mouse[1] / canvasScale)
        if (type === TYPE.pick) {
          const pixel = ctx.getImageData(x, y, 1, 1).data
          const newColor = (pixel[3] === 0)
            ? CLR.erase
            : rgbToHex(pixel[0], pixel[1], pixel[2]) //`rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`
          const value = Object.values(CLR).find(val => val === newColor)
          if (!value) {
            const key = Object.keys(CLR).find(key => CLR[key] === color)
            if (Object.keys(CLR).indexOf(key) > 1) { // don't change erase //, black, or white
              CLR[key] = newColor
              setTimeout(() => {
                store.set(PALETTE, CLR)
              })
            }
          }
          setColor(newColor)
        } else {
          drawPixel(x, y, size, color, type);
        }
      }
    },
    down: e => {
      // socket?.emit('debug', 'DOWN', e.pointerId)
      // socket?.emit('debug', Object.keys(pointers))
      pointers[e.pointerId] = e
      // socket?.emit('debug', Object.keys(pointers))
      // setMove(e)
      setDown(e)
      panned = Object.keys(pointers).length > 1;
      if (isMobile) {
        // don't draw if the down turns into a pan action
        setTimeout(() => {
          // draw if lifted without panning before 100ms
          if (!panned && Object.keys(pointers).length === 0) {
            panned = true
            handle.draw(e, true)
          }
        }, 100)
        setTimeout(() => {
          // draw if lifted without panning before 200ms
          if (!panned && Object.keys(pointers).length === 0) {
            handle.draw(e, true)
          }
          // draw if not lifted after 200ms, and set move to continue to draw
          if (!panned && Object.keys(pointers).length === 1) {
            const curr = pointers[e.pointerId]
            if (e.clientX === curr.clientX && e.clientY === curr.clientY) {
              handle.draw(e, true)
              setMove(e)
            }
          }
        }, 200)
      } else {
        handle.draw(e, true)
        setMove(e)
      }
    },
    up: e => {
      if (erased) referenceImg.src = canvas.toDataURL();
      // socket?.emit('debug', 'UP', e.pointerId)
      // socket?.emit('debug', Object.keys(pointers))
      delete pointers[e.pointerId]
      // socket?.emit('debug', Object.keys(pointers))
      setDown(false)
      setMove(false)
    },
    move: e => {
      // socket?.emit('debug', Object.keys(pointers))
      if (pointers[e.pointerId]) pointers[e.pointerId] = e
      if (Object.keys(pointers).length < 2) {
        setMove(e);
        handle.draw(e);
        e.preventDefault();
      }
    },
    update: () => {
      const baseHash = hash;
      outOfDate = false;
      api.get(`/garden/${baseHash}`).then(data => {
        if (data?.dataUrl) {
          referenceImg.src = data.dataUrl;
          const image = new Image();
          image.onload = () => {
            updateCanvas(baseHash, image);
            handle.send(baseHash);
          };
          image.src = data.dataUrl;
          referenceTimestamp = Date.now();
        } else if (data?.hash !== undefined) {

          handle.send(baseHash);
          referenceTimestamp = Date.now();
        }
      });
    },
    send: (baseHash: string) => {
      if (dirty && baseHash === reference && Date.now() - referenceTimestamp < 2 * FETCH_MS) {
        dirty = false;
        const dataUrl = canvas.toDataURL();
        api.put(`/garden/${baseHash}`, { dataUrl  });
        referenceImg.src = dataUrl;
      }
    },
    keydown: e => {
      switch (e.key) {
        case 's': setDown(true); break;
      }
    },
    keyup: e => {
      switch (e.key) {
        case 's': setDown(false); break;
      }
    },
    color: e => {
      const key = Object.keys(CLR).find(key => CLR[key] === color)
      if (Object.keys(CLR).indexOf(key) > 1) { // don't change erase //, black, or white
        CLR[key] = e.target.value
        setTimeout(() => {
          store.set(PALETTE, CLR)
        })
        setColor(e.target.value)
      }
    }
  }

  useF(hash, () => {
    initCanvas(hash);
    handle.update();
  });
  useInterval(() => {
    if (dirty || outOfDate) {
      outOfDate = false;
      handle.update();
    }
  }, FETCH_MS);
  useInterval(() => {
    if (down && move) {
      handle.draw(move);
    }
  }, 100);
  useEventListener(window, 'pointerdown', e => {
    // socket?.emit('debug', 'OTHER DOWN', e.pointerId)
    // socket?.emit('debug', Object.keys(pointers))
    pointers[e.pointerId] = e
    // socket?.emit('debug', Object.keys(pointers))
  }, false);
  useEventListener(window, 'pointerup', handle.up, false);
  useEventListener(window, 'pointercancel', e => {
    panned = true;
    handle.up(e);
  }, false);
  useEventListener(window, 'resize', resize, false);
  useEventListener(window, 'keydown', handle.keydown, false);
  useEventListener(window, 'keyup', handle.keyup, false);
  useEventListener(window, 'focus', handle.update, false);

  const wallRef = useR();
  useEventListener(document, 'touchmove', (e: TouchEvent) => {
    let inside = e.changedTouches[0].target as Element;
    while (inside !== null && inside !== wallRef.current) {
      inside = inside.parentElement
    }
    if (inside && e.touches.length < 2) {
      e.preventDefault()
    }
  }, { passive: false });

  const admin = auth.user && [hash, 'cyrus'].includes(auth.user);
  const vertical = false;//document.body.clientWidth < .8 * document.body.clientHeight;
  const [confirm, setConfirm] = useState(false)
  useF(color, size, () => setConfirm(false))
  return <div className={`garden ${vertical ? 'vertical' : 'horizontal'}`}>
    <div className='toolbar'>
      <div className={`color section erase-${admin}`}>
        {Object.values(CLR).slice(admin ? 1 : 2).map(choice =>
          <ColorDot key={choice} choice={choice} color={color} setColor={setColor} />)}
        <input type="color" value={color} onChange={e => { handle.color(e) }} onClick={e => setConfirm(false)}></input>
        <input type="text" value={color} onChange={e => { handle.color(e) }} onClick={e => setConfirm(false)}></input>
        <button onClick={e => {
          if (confirm) {
            const key = Object.keys(CLR).find(key => CLR[key] === color)
            CLR[key] = ORIGINAL_CLR[key]
            setColor(CLR[key])
            store.set(PALETTE, CLR)
          }
          setConfirm(!confirm)
        }}>{confirm ? 'confirm' : 'reset'}</button>
        {!confirm ? '' : <button onClick={e => {
          if (confirm) {
            Object.keys(CLR).forEach(key => delete CLR[key])
            Object.assign(CLR, ORIGINAL_CLR)
            setColor(CLR[Object.keys(CLR)[2]])
            store.set(PALETTE, CLR)
          }
          setConfirm(!confirm)
        }}>reset all</button>}
      </div>
      <div className="divider" />
      <div className="size section">
        {Object.keys(SZ).map(choice =>
          <SizeDot key={choice} choice={choice} size={size} color={color} setSize={setSize} />)}
      </div>
      <div className="divider" />
      <div className="type section">
        {Object.keys(TYPE).map(choice =>
          <TypeEntry key={choice} choice={choice} type={type} setType={setType} />)}
      </div>
    </div>
    <div className='wall' ref={wallRef}>
      {blocked ? <div className='login-block' onClick={e => openLogin()}><span>log in to view {hash}{"'"}s wall</span></div> : ''}
      <div className="inner">
        <canvas id="garden"
          onPointerDown={handle.down}
          onPointerUp={handle.up}
          onPointerMove={handle.move}>
          <img id="backing"></img>
        </canvas>
      </div>
    </div>
  </div>
}

export default () => {
  const [hash, setHash] = useHashState()
  const auth = useAuth();
  const [profile, setProfile] = useState(undefined);

  usePageSettings({
    // checkin: 'pixels',
    // background: '#222', text_color: '#eee',
  })
  useSocket({
    room: 'garden',
    on: {
      "garden:update": updatedHash => {
        if (hash === updatedHash) {
          outOfDate = true;
        }
      },
    }
  })

  useF(auth.user, () => {
    if (auth.user) {
      api.get(`/profile/${auth.user}`).then(({ profile }) => {
        setProfile(profile)
        if (hash !== auth.user && !profile?.friends.includes(hash)) {
          setHash('')
        }
      })
    } else {
      setProfile(undefined)
    }
  })

  return <Style>
    <div className="selection">
    <div className="pages">
        <div className={''+(hash === '')} onClick={() => setHash('')}>public</div>
        {auth.user
        ?
        [auth.user, ...(profile?.friends || [])].map(user =>
        <div className={''+(hash === user)} key={user} onClick={() => setHash(user)}>{user}</div>)
        :
        <InfoLoginBlock inline text='or log in for personal walls'/>
        }
        <div className="hidden-download">download</div>
      </div>
      <div className="download" onClick={e => {
        const link = document.createElement('a');
        link.download = `graffiti${hash ? `-${hash}` : ''}.png`;
        link.href = canvas.toDataURL()
        link.click();
      }}>download</div>
    </div>
    <Wall {...{ hash, blocked: hash && !auth.user }} />
  </Style>
}

const Style = styled.div`
height: 100%;
width: 100%;
display: flex;
flex-direction: column;
border: 1px solid #fff;

.selection {
  display: flex;
  background: var(--dark-l);
  font-size: .8rem;
  padding: .2rem .5rem;

  padding: 0 .25rem;
  justify-content: space-between;

  .pages {
    display: flex;
    overflow-x: auto;
    ::-webkit-scrollbar {
      height: .5rem;
    }
    ::-webkit-scrollbar-track {
      border-radius: .25rem;
      background: #fff2;
    }
    ::-webkit-scrollbar-thumb {
      border-radius: .25rem;
      background: #ffffffcd;
    }
  }
  .pages > *, .download {
    margin-right: .5rem;
    cursor: pointer;
    color: #ffffffcd;

    &.true, &:hover {
      color: white;
      text-decoration: underline;
    }
  }
  .hidden-download {
    opacity: 0;
  }
  position: relative;
  .download {
    margin-right: 0;
    position: absolute;
    right: 0;
    padding: 0 .5rem;
    background: var(--dark-l);
    &.true, &:hover {
      text-decoration: underline;
    }
  }
}

.garden {
  // height: 100%;
  height: 0;
  flex-grow: 1;
  width: 100%;
  display: flex;
  flex-direction: row;
  background: var(--dark);
  &.vertical {
    flex-direction: column;
  }
}

.wall {
  flex-grow: 1;
  display: flex;
  flex-direction: row;
  @media (min-width: 30rem) {
    padding: .5rem;
  }
  -webkit-user-select: none !important;
  -webkit-touch-callout: none !important;

  & .inner {
    flex-grow: 1;
    display: flex;
    height: 100%;
    justify-content: center;
    align-items: center;
  }

  & canvas {
    image-rendering: pixelated;
    background: #f2eee3;
    user-select: none;
    // touch-action: none;
    touch-action: pinch-zoom;
  }

  position: relative;
  .login-block {
    position: absolute;
    width: 100%; height: 100%;
    left: 0; top: 0;
    z-index: 1000;
    display: flex; align-items: center; justify-content: center;
    span {
      background: black;
      color: white;
      padding: .3rem 1rem;
      border-radius: .3rem;
      cursor: pointer;
      &:hover {
        text-decoration: underline;
      }
    }
  }
}
.vertical .wall {
  flex-direction: column;
  & .inner {
    width: 100%;
  }
}

.toolbar {
  background: var(--dark-l);
  height: 100%;
  // height: fit-content;
  // min-height: 100%;
  padding: .2rem 0;
  // flex-wrap: wrap;
  flex-direction: column;
  overflow-y: auto;

  &, .section {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    > * {
      flex-shrink: 0;
    }
    &.erase-true .dot:first-child { margin-left: .75rem; }
    &.color {
      // background: red;
      flex-direction: row;
      flex-wrap: wrap;
      max-width: 3.5rem;
      padding: .25rem;
      .dot {
        // width: 50%;
        margin: 0;
        width: 1.5rem;
        height: 1.5rem;
      }
      input {
        font-size: .5rem;
        max-width: 100%;
        margin-top: .25rem;
        &[type=color] {
          width: 100%;
        }
      }
      button {
        font-size: .5rem;
        width: 100%;
        border: 1px solid rgb(118, 118, 118);
        margin-top: .25rem;
        background: rgb(239, 239, 239);
        color: black;
        white-space: nowrap;
        padding: .05rem 0;
      }
    }
  }

  .divider {
    height: .05rem;
    width: calc(100% - .75rem);
    margin: .5rem;
    background: var(--light);

    // // height: .1rem;
    // height: 0;
    // width: calc(100% - 1rem);
    // margin: .5rem;
    // border: .05rem solid var(--light);
    // // background: var(--light);
  }
}
.vertical .toolbar {
  height: auto;
  width: 100%;
  padding: 0 .2rem;
  flex-direction: row;
  flex-wrap: wrap-reverse;
  .section {
    position: relative;
    flex-direction: row;
    flex-grow: 1;
    padding-top: calc(.25rem + 2px);
    padding-bottom: .25rem;
    &::after {
      content: "";
      height: .1rem;
      width: calc(100% - .4rem);

      content: "";
      height: 2px;
      position: absolute;
      margin: 0 .2rem;
      background: var(--dark);
      left: 0;
      top: 0;
      width: calc(100% + .5rem);
      margin: 0;
      left: -.25rem;
    }
  }
  .divider {
    display: none;
    width: .1rem;
    height: calc(100% - 1rem);
  }
}

.section .dot {
  // border-radius: 50%;
  width: 1.75em;
  height: 1.75em;
  margin: calc((2.2rem - 1.75em)/6 + .2rem*2/3) calc((2.4rem - 1.75em)/6 + .4rem*2/3); // .2rem .4rem;
  border: 2px solid var(--dark);
  background-color: var(--dark-l);
  box-shadow: 1px 2px 4px black;
  cursor: pointer;

  &.true {
    border: 2px solid var(--light);
  }
}
.section .entry {
  font-size: .5rem;
  width: 100%;
  margin: .25rem;
  border: 2px solid var(--dark);
  background-color: var(--dark-l);
  box-shadow: 1px 2px 4px black;
  cursor: pointer;
  min-width: 2rem;
  text-align: center;

  &.true {
    border: 2px solid var(--light);
  }
}
`