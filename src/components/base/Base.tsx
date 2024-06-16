import React, { useState } from 'react';
import { Link, Route, Switch, Redirect } from 'react-router-dom';
import styled from 'styled-components';
import api from '../../lib/api';
import { useEventListener, useF, useInterval, useR } from '../../lib/hooks';
import { useSubdomain, useSublocation } from '../../lib/hooks_ext';
import { meta } from '../../lib/meta';
import { About } from './About';
import { Home } from './Home';
import { Projects } from './Projects';

let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D
const DIM = [1000, 1000]
function init(canvasEl: HTMLCanvasElement) {
  canvas = canvasEl
  canvas.width = DIM[0]
  canvas.height = DIM[1]
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

const lineWidth = 16
const lineModeOptions = ['draw', 'erase']
let lineMode = lineModeOptions[0]
let dirty = false
const draw = e => {
  dirty = true

  ctx.strokeStyle = lineMode == 'draw' ? '#fff' : '#000'
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(...down)
  down = e2p(e)
  ctx.lineTo(...down)
  ctx.stroke()

  // make sure taps are drawn on iOS
  ctx.fillStyle = lineMode == 'draw' ? '#fff' : '#000'
  ctx.lineWidth = 0
  ctx.beginPath()
  ctx.arc(down[0], down[1], lineWidth/2, 0, 2*Math.PI)
  ctx.fill()
}

const Doodle = () => {
  const doodleRef = useR<HTMLCanvasElement>()
  const [doodleMode, setDoodleMode] = useState(0)
  useF(doodleMode, () => lineMode = lineModeOptions[doodleMode])

  const handle = {
    send: () => {
      if (dirty) {
        dirty = false
        const dataUrl = canvas.toDataURL()
        api.put(`/graffiti/~/home`, { dataUrl })
      }
    },
    update: () => {
      const curr = document.createElement('img')
      curr.src = canvas.toDataURL()
      api.get(`/graffiti/~/home`).then(data => {
        if (data?.dataUrl) {
          const img = document.createElement('img')
          img.onload = () => {
            ctx.drawImage(img, 0, 0)
            ctx.drawImage(curr, 0, 0)
            handle.send()
          }
          img.src = data.dataUrl
        } else if (data?.hash !== undefined) {
          handle.send()
        }
      });
    },
  }

  useF(() => {
    init(doodleRef.current)
    handle.update()
    window['setMode'] = setDoodleMode
    if (location.hash == '#erase') setDoodleMode(1)
  })
  useInterval(() => {
    if (dirty) {
      handle.update()
    }
  }, 3000)
  useEventListener(window, 'keypress', e => {
    if (e.key == '1') erase = !erase
  })
  useEventListener(doodleRef.current, 'pointerdown', e => {
    down = e2p(e)
    // console.debug(down)
    // setEdited(true)
    if (!erase) {
      draw(e)
      draw(e)
    }
  })
  useEventListener(doodleRef.current, 'pointerup', e => {
    if (erase) {
      const to = e2p(e)
      ctx.clearRect(down[0], down[1], to[0]-down[0], to[1]-down[1])
    }
    down = undefined
  })
  useEventListener(doodleRef.current, 'pointermove', e => {
    if (down && !erase) draw(e)
  })

  return <div id="doodle">
    <div className="doodle-inner">
      <canvas className="doodle-img" ref={doodleRef} />
    </div>
  </div>
}

export const Base = () => {
  const base = useSubdomain() // if we're here, the subdomain is one of '', about, projects
  const url = useSublocation()
  const isHome = url === (base ? 'home' : '')

  meta.title.use({ value: 'Cyrus Freshman' })
  console.debug('ORIGINAL BASE')
  return (
    <Style id='home'>
      <div id='before'></div>

      <Box>
        <Links className={"left " + (isHome ? "home" : "")}>
          <Link to="/home" {...{'data-content': '/home'}}>/home</Link>
          <Link to="/about" {...{'data-content': '/about'}}>/about</Link>
          <Link to="/projects" {...{'data-content': '/projects'}}>/projects</Link>
        </Links>
        <Links className={"right " + (isHome ? "home" : "")}>
          <a href="https://github.com/cfreshman" data-content='github'>github</a>
          <a href="https://twitter.com/freshman_dev" data-content='twitter'>twitter</a>
          <a href="https://www.linkedin.com/in/cfreshman/" data-content='linkedin'>linkedin</a>
        </Links>
        <Switch>
          <Route exact path='/' component={{
            '': Home,
            'about': About,
            'projects': Projects,
          }[base] ?? 'empty'} />
          <Route exact path='/home' component={Home} />
          <Redirect exact path='/contact' to='/about' />
          <Route exact path='/about' component={About} />
          <Redirect exact path='/contents' to='/projects' />
          <Route exact path='/projects' component={Projects} />
        </Switch>
        {/* <div>
          <WikiLink path={url} />
        </div> */}
      </Box>

      <div id="after"></div>

      {/* <Doodle /> */}
    </Style>
  )
}


const Style = styled.div`
min-height: 100%;
width: 100%;
display: flex;
flex-direction: column;
align-items: center;
background: black;
overflow: auto;
padding: 0 1rem; /* needed to avoid issue with scrollbar hiding border */
&::-webkit-scrollbar { display: none }

#before {
  height: 1rem;
}
#after {
  min-height: 1rem;
  flex-grow: 5;
}

.wiki-link {
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  right: 0;
  bottom: -1.5rem;
  color: var(--light);
  opacity: .5;
}

p a, span a {
  color: rgb(155 228 170); // #ddffe4; // #c0fbcd; // #6e7f90
  text-decoration: none;
  &:hover, &:focus {
    // color: var(--light);
    // text-decoration: underline;
    color: var(--bg);
    background: var(--light);
    text-decoration: none;
    background: rgb(155,228,170);
  }
}

.subtle {
  // color: #58556e;
  // color: #5d5a70;
  // color: #67647b;
  color: #6c697d !important;
}

#doodle {
  opacity: .07;
  position: absolute;
  left: 0; top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  .doodle-inner {
    width: 0;
    height: 0;
    position: relative;

    .doodle-img {
      &img { z-index: -1; }
      position: absolute;
      left: -50vw;
      top: -50vh;
      width: max(100vw, 100vh);
      height: max(100vw, 100vh);
    }
  }
}
`

const Box = styled.div`
  flex: 0 0 auto;
  color: var(--light);
  width: 20rem;
  max-width: 100%;
  margin: 1rem 0;
  border-radius: 0.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;

  padding: 1rem;
  background: #131125;
  width: calc(100% - 1rem);
  left: -.15rem;
  max-width: 33rem;
  border: none;
  &::before {
    position: absolute;
    content: "";
    width: 100%;
    height: 100%;
    background: inherit;
    border-radius: inherit;
    z-index: -1;
  }
  &::after {
    position: absolute;
    left: -0.3rem;
    top: -0.3rem;
    content: "";
    width: calc(100% + 1.2rem);
    height: calc(100% + 1.2rem);
    background: linear-gradient(15deg, rgb(255, 145, 145) 0%, rgb(255, 227, 114) 100%) fixed;
    // background: linear-gradient(15deg,#609e98,#e2d291) fixed;
    background: var(--background) fixed;
    // background: #242031;
    border-radius: .2rem;
    z-index: -2;
  }
  @media (max-width: 30.01rem) {
  }
  @media (min-width: 30rem) {
  }

  & > * {
    width: 100%;
    flex: 0 0 auto;
  }

  & > a {
    height: 3rem;
    padding: 0.75rem;
    border-top: 2px solid var(--light);
    color: inherit;
    text-decoration: none !important;

    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  & > a:last-of-type {
    border-bottom: 2px solid var(--light);
    margin-bottom: 0.25rem;
  }
  & > a::after {
    content: '>';
    float: right;
  }
  & > a:hover, & > a:active, & > a:focus {
    background: var(--light);
    color: var(--dark);
  }
`
const Links = styled.div`
  z-index: 1;
  font-size: 1rem;
  width: 0;

  position: fixed;
  top: 0;
  padding: 1rem;

  position: absolute;
  padding: 0;
  top: .5rem;
  font-size: .8rem;
  top: .25rem;

  font-size: .9em;

  @media (min-width: 30rem) {
    position: absolute;
    padding: 0;
    top: .5rem;
    font-size: .8rem;
    top: .25rem;
  }
  &.home {
    position: absolute;
    padding: 0;
    // top: 3rem;
    top: .25rem;
    @media (min-width: 30rem) {
      font-size: .8rem;
      top: .25rem;
    }
  }

  & > a {
    display: block;
    color: var(--light);
    &:hover, &:active, &:focus {
      // color: var(--light);
      width: fit-content;
      background: var(--light);
      color: var(--dark);
      text-decoration: none;
      // background: linear-gradient(0deg, var(--light) 50%, #0000 50%);
      // background-size: 200% 200%;
      // background-position-y: 100%;
      // animation: hover .1s linear;
      // @keyframes hover {
      //   0% { background-position-y: 50%; }
      // }
    }
  }

  &.left {
    left: .5rem;
    direction: ltr;
    > a {
      // position: relative;
      // background: none;
      // // background: var(--dark);
      // color: var(--light);
      // content: attr(data-content);
      // &:hover, &:active, &:focus {
      //   &::after {
      //     content: attr(data-content);
      //     position: absolute;
      //     width: 100%; height: 100%;
      //     left: 0; top: 0;
      //     overflow: hidden;
      //     background: var(--light);
      //     color: var(--dark);
      //     width: 100%;
      //     animation: hover .1s linear;
      //     @keyframes hover {
      //       0% { width: 0%; }
      //     }
      //   }
      // }
    }
  }
  &.right {
    right: .5rem;
    direction: rtl;
  }
`

export const Title = styled.div`
  margin: 0;
  padding: 0.25em 0 1em 0;
  text-align: center;
  // margin-top: 0.5em;
  margin-bottom: 1em;
  & > .imgDiv {
    width: 42%;
    max-width: 10em;
    position: relative;
    margin: auto;
    margin-bottom: .5em;
    &::after {
      content: "";
      display: block;
      padding-bottom: 100%;
    }
    & > img {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      border-radius: 50%;
      // border: 2px solid var(--light);
      box-shadow: 1px 2px 4px #00000020;
    }
  }
  & > h1 {
    margin: 0;
    font-size: 2em;
    font-weight: 400;
  }
  & > p {
    margin: 0;
    font-size: 0.8em;
  }
`

export const ProjectName = styled.p`
`
export const Description = styled.p`
  font-size: .8rem;
`