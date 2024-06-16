import React, { useState } from 'react';
import { toYearMonthDay } from '../lib/util';
import styled from 'styled-components';
import { InfoLoginBlock } from '../components/Info';
import api from '../lib/api';
import { openLogin } from '../lib/auth';
import { useEventListener, useF, useInterval, useR, useRerender } from '../lib/hooks';
import { useAuth, usePageSettings, useHashState } from '../lib/hooks_ext';
import { useSocket } from '../lib/socket';

const SIZE = 256, FETCH_MS = 1000;
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

const CLR = {
  natural: '#f2eee3',
  erase: '#f2eee3',
  black: '#0f0f0e',
  white: '#ffffff',
  red: '#dd2c41',
  orange: '#f78c2e',
  yellow: '#ffe960',
  green: '#53ed42',
  cyan: '#42edb4',
  blue: '#246df4',
  purple: '#862cf4'
}
const SZ = {
  '0.75em': 1,
  '1.25em': 3,
  '1.75em': 8
}

const copyCanvas = (): HTMLCanvasElement => {
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  copy.getContext('2d').drawImage(canvas, 0, 0);
  return copy;
}

const initCanvas = (hash: string) => {
  canvas = document.getElementById('graffiti') as HTMLCanvasElement;
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
  // console.log(canvas.parentElement, containerWidth, containerHeight)

  canvasScale = Math.min(containerWidth / WIDTH, containerHeight / HEIGHT);
  canvas.style.width = `${canvasScale * WIDTH}px`;
  canvas.style.height = `${canvasScale * HEIGHT}px`;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(save, 0, 0, canvas.width, canvas.height);
  save.remove();
}

const drawCircle = (p1, p2, size, color) => {
  if (!color) return
  if (color === CLR.erase) {
    erased = true;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = CLR.black;
    ctx.beginPath();
    ctx.arc(p2[0], p2[1], SZ[size], 0, 2*Math.PI, true);
    ctx.fill();
    ctx.restore();
    draw.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    // draw.globalAlpha = isMobile ? 1 : .2;
    // draw.fillStyle = color;
    // draw.beginPath();
    // draw.arc(mouse[0] / canvasScale, mouse[1] / canvasScale, SZ[size], 0, 2*Math.PI, true);
    // draw.fill();
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.drawImage(referenceImg, 0, 0);
    // ctx.drawImage(drawn, 0, 0);

    // draw.globalAlpha = isMobile ? 1 : .2;
    // draw.fillStyle = color;
    // draw.beginPath();
    // draw.arc(p2[0], p2[1], SZ[size], 0, 2*Math.PI, true);
    // draw.fill();
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.drawImage(referenceImg, 0, 0);
    // ctx.drawImage(drawn, 0, 0);

    const lineWidth = SZ[size] * 2
    draw.lineWidth = lineWidth
    draw.lineCap = 'round'
    draw.lineJoin = 'round'
    draw.fillStyle = draw.strokeStyle = color
    if (p1) {
      draw.beginPath()
      draw.moveTo(p1[0], p1[1])
      draw.lineTo(p2[0], p2[1])
      draw.stroke()
    } else {
      // make sure taps are drawn on iOS
      draw.lineWidth = 0
      draw.beginPath()
      draw.arc(p2[0], p2[1], lineWidth/2, 0, 2*Math.PI)
      draw.fill()
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(referenceImg, 0, 0);
    ctx.drawImage(drawn, 0, 0);
  }
  dirty = true;
}


const ColorDot = ({ choice, colorKey, setColorKey }: {
  choice: string, colorKey: string, setColorKey
}) => <div
  style={{ backgroundColor: CLR[choice] }}
  onClick={() => setColorKey(choice)}
  className={'color dot ' + (choice === colorKey)} />

const SizeDot = ({ choice, size, setSize }: { choice: string, size: string, setSize }) => <div
  style={{ height: choice, width: choice }}
  onClick={() => setSize(choice)}
  className={'size dot ' + (choice === size)} />

const pointers = {}
const Wall = ({ hash, blocked }: { hash: string, blocked: boolean }) => {
  const auth = useAuth();
  const [down, setDown] = useState(false);
  const [move, setMove] = useState(undefined);
  const [size, setSize] = useState('0.75em');
  const [colorKey, setColorKey] = useState('black')
  const color = CLR[colorKey]
  const [_, setRefresh] = useState({})
  const forceRefresh = () => setRefresh({})
  // const [color, setColor] = useState(CLR.black);

  const handle = {
    draw: (e, force?) => {
      const rect = e.target.getBoundingClientRect();
      const prev = mouse
      mouse = [
        (e.clientX - rect.left) / canvasScale,
        (e.clientY - rect.top) / canvasScale
      ];
      (down || force) && drawCircle(prev, mouse, size, color);
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
      mouse = undefined
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
      api.get(`/graffiti/${baseHash}`).then(data => {
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
        api.put(`/graffiti/${baseHash}`, { dataUrl  });
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
  const rerender = useRerender()
  useEventListener(window, 'resize', () => {
    resize()
    rerender()
  }, false);
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
  const vertical = document.body.clientWidth < .8 * document.body.clientHeight;
  return <div className={`graffiti ${vertical ? 'vertical' : 'horizontal'}`}>
    <div className='toolbar'>
      <div className="section">
        {Object.keys(CLR).slice(admin ? 1 : 2).map(choice =>
          <ColorDot key={choice} {...{ choice, colorKey, setColorKey }} />)}
        {/* <input className='color-picker' type='color' value={color} onChange={e => {
          const newColor = e.target.value
          const clrKey = Object.entries(CLR).find(clr => clr[1] === color)[0]
          CLR[clrKey] = newColor
          setColor(newColor)
        }}/> */}
      </div>
      <div className="divider" />
      <div className="section">
        <input className='color-picker' type='color' value={color} onChange={e => {
          const newColor = e.target.value
          CLR[colorKey] = newColor
          forceRefresh()
          // const clrKey = Object.entries(CLR).find(clr => clr[1] === color)[0]
          // CLR[clrKey] = newColor
          // setColor(newColor)
        }}/>
      </div>
      <div className="divider" />
      <div className="section">
        {Object.keys(SZ).map(choice =>
          <SizeDot key={choice} {...{ choice, size, setSize }} />)}
      </div>
    </div>
    <div className='wall' ref={wallRef}>
      {blocked ? <div className='login-block' onClick={e => openLogin()}><span>log in to view {hash}{"'"}s wall</span></div> : ''}
      <div className="inner">
        <canvas id="graffiti"
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
    checkin: 'graffiti',
    background: '#000', text_color: '#fff',
  })
  useSocket({
    room: 'graffiti',
    on: {
      "graffiti:update": updatedHash => {
        if (hash === updatedHash) {
          outOfDate = true;
        }
      },
    },
  })

  useF(auth.user, () => {
    if (auth.user) {
      api.get(`/profile/${auth.user}`).then(({ profile }) => {
        setProfile(profile)
        if (auth.user !== 'cyrus'
            && hash !== auth.user && !profile?.friends.includes(hash)) {
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
        // [auth.user, ...(array(20, i => randAlphanum(7)))].map(user =>
        [auth.user, ...(profile?.friends || [])].map(user =>
        <div className={''+(hash === user)} key={user} onClick={() => setHash(user)}>{user}</div>)
        :
        <InfoLoginBlock inline text='or log in for personal walls'/>
        }
        <div className="hidden-download">download</div>
      </div>
      <div className="download" onClick={e => {
        const link = document.createElement('a');
        link.download = `graffiti${hash ? `-${hash}` : ''}-${toYearMonthDay(new Date())}.png`;
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
max-width: 98vh;
display: flex;
flex-direction: column;

.selection {
  display: flex;
  background: var(--dark-l);
  font-size: .8rem;
  // padding: .2rem .5rem;

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
    // opacity: .8;
    color: #ffffffcd;

    &.true, &:hover {
      // opacity: 1;
      color: white;
      text-decoration: underline;
    }
  }
  .hidden-download {
    opacity: 0;
  }
  position: relative;
  .download {
    // margin-left: auto;
    margin-right: 0;
    // position: absolute;
    // right: 0;
    // padding: 0 .5rem;
    background: var(--dark-l);
    // opacity: 1;
    &.true, &:hover {
      text-decoration: underline;
    }
  }
}

.graffiti {
  // height: 100%;
  height: 0;
  flex-grow: 1;
  width: 100%;
  display: flex;
  flex-direction: row;
  background: var(--dark);
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

  .inner {
    flex-grow: 1;
    display: flex;
    height: 100%;
    justify-content: center;
    align-items: center;
  }

  canvas {
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

.toolbar {
  background: var(--dark-l);
  height: 100%;
  // height: fit-content;
  // min-height: 100%;
  padding: .2rem 0;
  // flex-wrap: wrap;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;

  &, .section {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    > * {
      flex-shrink: 0;
    }
  }

  .divider {
    // height: .1rem;
    height: 0;
    width: calc(100% - 1rem);
    margin: .5rem;
    border: .05rem solid var(--light);
    // background: var(--light);
  }
}

.vertical {
  flex-direction: column-reverse;
  .wall {
    .inner {
      width: 100%;
    }
  }
  .toolbar {
    height: auto;
    width: 100%;
    flex-direction: row-reverse;
    flex-wrap: wrap;
    align-items: flex-end;
    .section {
      justify-content: space-between;
      position: relative;
      flex-direction: row;
      padding: .2rem;
      font-size: 5.4vw;
      .dot {
        margin: .1em;
      }
      // .color.dot {
      //   width: 8vw;
      //   height: 8vw;
      // }
    }
    .divider {
      display: none;
    }
  }
}

.dot {
  border-radius: 50%;
  width: 1.75em;
  height: 1.75em;
  // margin: .1em .25em;
  margin: calc((2.2rem - 1.75em)/6 + .2rem*2/3) calc((2.4rem - 1.75em)/6 + .4rem*2/3);
  border: .1em solid #444;
  background-color: var(--dark-l);
  cursor: pointer;

  &.true {
    border: .1em solid var(--light);
  }
}
.color-picker {
  border-radius: .1em;
  width: 1.75em;
  height: 1.75em;
  margin: .1em;
  border: 0;
  // border-top: 2px solid var(--dark);
  // border: 2px solid var(--dark);
  background-color: var(--light);
  // box-shadow: 1px 2px 4px black;
  // box-shadow: 0x -2px var(--dark);

  position: relative;
  &::-webkit-color-swatch-wrapper {
    position: absolute;
    left: .1em;
    top: .1em;
    width: calc(100% - .2em);
    height: calc(100% - .2em);
    border-radius: calc(0.1em);
    overflow: hidden;
  }
  &::-webkit-color-swatch {
    border: none;
    display: initial;
    position: absolute;
    left: 0; top: 0;
    width: 100%; height: 100%;
  }
}
`