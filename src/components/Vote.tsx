import React from "react"
import api from "../lib/api"
import styled from "styled-components"
import { useCached, useCachedSetter, useF } from "../lib/hooks"
import { Color } from "../lib/three"
import { Loader } from "./Info"
import { hex, readable_text } from "src/lib/color"

type vote = { y: number, n: number, total: number, value: number, relative: number, user?: vote }
export const countsToVote = (counts: { y: number, n: number, user?: { y: number, n: number } }): vote => {
  const vote = counts as vote
  vote.total = vote.y + vote.n
  vote.value = vote.y - vote.n
  vote.relative = vote.value / Math.max(1, vote.total)
  if (vote.user) vote.user = countsToVote(vote.user)
  console.debug('COUNTS TO VOTE', vote)
  return vote
}

export const useVote = name => {
  const key = `vote-${name}`
  return useCachedSetter<vote, any>({
    name: key,
    fetcher: async () => {
      const result = await api.post(`i/batch/${key}`, {
        keys: ['y', 'n'],
      })
      return countsToVote(result)
    },
    setter: async op => {
      const result = await api.post(`i/batch/${key}`, op)
      return countsToVote(result)
    },
  })
}
export const useVotes = prefix => {
  const key = `vote-${prefix}`
  return useCached(key, async () => {
    const result = await api.get(`i/${key}/op/prefix`, {
      keys: ['y', 'n'],
    })
    console.debug('USE_VOTES', prefix, result)
    const allCounts = {}
    result.map(x => {
      allCounts[x.space] = Object.assign(allCounts[x.space] || {
        user: { y: 0, n: 0 },
      }, {
        [x.key]: x.value,
      })
      allCounts[x.space].user[x.key] += Object.values<number>(x.user).reduce((a,v)=>a+v)
    })
    const votes = {}
    Object.keys(allCounts).map(x => {
      votes[x.replace('vote-', '')] = countsToVote(allCounts[x])
    })
    console.debug('USE_VOTES votes', votes)
    return votes
  })
}

export default ({ name, hideLabel=false, nonNegative=false, upOnly=false, green='green', yellow='#fd0', red='red', white='#fff', color=undefined, voteHandle={} }: {
  name:string, hideLabel?:boolean, nonNegative?:boolean, upOnly?:boolean, green?:string, yellow?:string, red?:string, white?:string, color?:string, voteHandle?
}) => {
  const [vote, setVote, loadVote] = useVote(name)
  useF('VOTE', vote, console.debug)

  const { total=0, value=0, y=0, relative=0, user: { value: userValue=0 }={} } = vote ?? {}
  const weight = .3 * Math.min(1, total) // Math.min(10, total) / 10 /* max 50% saturation */ * .3
  const userVote = userValue ? userValue > 0 ? 'y' : 'n' : false
  const displayValue = upOnly ? y : nonNegative ? Math.max(0, value) : value

  const handle = {
    un: () => {
      userVote && setVote(userVote === 'y' ? {
        shifts: { y: -1, n: false }
      } : {
        shifts: { n: -1, y: false }
      })
    },
    no: () => {
      if (userVote === 'n') return
      setVote(!userVote ? {
        // sets: { y: 0, n: 0 },
        // sets: { y: 10, n: 3 },
        ticks: { n: true, y: false }
      } : {
        shifts: { n: 1, y: -1 }
      })
    },
    yes: () => {
      if (userVote === 'y') return
      setVote(!userVote ? {
        ticks: { y: true, n: false }
      } : {
        shifts: { y: 1, n: -1 }
      })
    }
  }
  Object.assign(voteHandle, handle)

  const background = 
  new Color(white)
  .lerp(new Color(yellow), weight * .8)
  .lerp(new Color(green), Math.max(relative, 0) * weight)
  .lerp(new Color(red), -Math.min(0, relative) * weight)
  .getStyle()

  return <Style className={`vote ${userVote ? `voted voted-${userVote}` : ''}`}
    style={{ background, color:color??readable_text(hex(background)) }}
    onClick={e => {
      e.stopPropagation()
      e.preventDefault()
      handle.un()
    }}>
    <span className='vote-value' style={{background:'inherit'}}>
      {
      vote || 1
      ?
      <span style={{ visibility: 'hidden', position: 'relative', margin: displayValue < 0 ? '0 .3em' : '0 .3em' }}>
        {Math.abs(displayValue)}
        <span style={{ position: 'absolute', right: '0', visibility: 'visible' }}>{displayValue}</span>
      </span>
      :
      <Loader />
      }
    </span>
    <span className='vote-button vote-button-n' style={{background:red}} onClick={handle.no}>-<div className='vote-dot vote-dot-n'>N</div></span>
    <span className='vote-button vote-button-y' style={{background:green}}  onClick={handle.yes}>+<div className='vote-dot vote-dot-y'>Y</div></span>

    <div className='vote-divider' />

    {
    hideLabel ? '' :
    <div className='vote-label'>
      {/* <div className='vote-dot vote-dot-n'>N</div> */}
      <div style={userVote ? { cursor: 'pointer' } : undefined} onClick={handle.un}>{userVote ? 'UNDO' : 'VOTE'}</div>
      {/* <div className='vote-dot vote-dot-y'>Y</div> */}
    </div>
    }
  </Style>
}

const Style = styled.div`
display: inline-flex; justify-content: center;
height: 1.5em;
border: 1px solid #000;
border-radius: 100em;
user-select: none;
* { color:inherit }

&.voted { cursor: pointer }

.vote-button {
  display: inline-block;
  height: 100%;
  width: 1em;
  text-align: center;
  cursor: pointer;

  position: absolute;
  width: 50%;
  // z-index: 1;
}
.vote-button-n {
  left: 0;
  padding-right: calc(50% - 1em);
}
.vote-button-y {
  right: 0;
  padding-left: calc(50% - 1em);
}
.vote-value {
  line-height: 1.3;
  align-self: center;
  // background: white; //#fff8;
  line-height: 1.15;
  border-radius: 0.5em;
  min-width: 1em;
  text-align: center;

  margin: 0 1em;
  z-index: 2;
  pointer-events: none;
  padding: 0 .5em;

  > span { z-index: 1 }
}
&.voted .vote-value {
  background: none !important;
}
&:hover {
  // background: #fff !important;
  .vote-value {
    // background: #fff !important;
  }
}

position: relative;
.vote-divider {
  position: absolute;
  height: 100%;
  width: 1.5px;
  // background: #0003;
  color: inherit;
  background: currentcolor;
  opacity: .25;
}

// &::after {
//   content: "VOTE";
//   font-size: .5em;
//   position: absolute;
//   bottom: 100%;
// }
.vote-label {
  content: "VOTE";
  font-size: .5em;
  position: absolute;
  bottom: 100%;

  display: flex;
  // justify-content: space-between;
  justify-content: center;
  align-items: center;
  // width: 100%;
  // padding: 0 .5em;
  .vote-dot {
    display: inline-block;
    border-radius: 50%;
    line-height: 1;
    width: 1em;
    height: 1em;
    opacity: .65;
    color: white;
    // border: 1px solid black;
    // font-size: .8em;
    display: inline-flex;
    align-items: center; justify-content: center;
    color: transparent;

    visibility: hidden;
  }
  .vote-dot-n {
    background: red;
  }
  .vote-dot-y {
    background: green;
  }
}

.vote-button {
  display: flex;
  align-items: center;
  justify-content: center;
  .vote-dot {
    font-size: .5em;
    position: absolute;
    bottom: calc(100% + .25em);
    display: inline-block;
    border-radius: 50%;
    line-height: 1;
    width: 1em;
    height: 1em;
    opacity: .5;
    color: white;
    mix-blend-mode: difference;
    // border: 1px solid black;
    // font-size: .8em;
    display: inline-flex;
    align-items: center; justify-content: center;
    color: transparent;

    visibility: hidden;
    border: 2px solid transparent;
  }
  .vote-dot-n {
    background: red;
    border-color: red;
  }
  .vote-dot-y {
    background: green;
    border-color: green;
  }
}
&.voted .vote-button, &.voted .vote-divider {
  visibility: hidden;
}
&:not(:is(.voted-n, .voted-y)) .vote-button:not(:hover) {
  background: none !important;
}
.vote-button-n {
  border-top-left-radius: inherit;
  border-bottom-left-radius: inherit;
}
&:not(.voted-n) .vote-button-n:hover {
  // background: linear-gradient(#f008 0 0), white;
  // opacity: .5;
  // color: transparent;
}
.vote-button-y {
  border-top-right-radius: inherit;
  border-bottom-right-radius: inherit;
}
&:not(.voted-y) .vote-button-y:hover {
  // background: linear-gradient(#0808 0 0), white;
  // opacity: .5;
  // color: transparent;
  
  color: inherit; background: currentcolor;
}
&:not(.voted) .vote-button:hover .vote-dot,
&.voted-n .vote-dot-n,
&.voted-y .vote-dot-y {
  // visibility: visible;
}
.vote-button:active .vote-dot {
  // background: none;
}

&:not(.voted-y):has(.vote-button-y:hover) .vote-button-n {
  filter: invert(1);
}
&:not(.voted-n):has(.vote-button-n:hover) .vote-button-y {
  filter: invert(1);
}
.vote-value > span {
  pointer-events: all;
  z-index: 1;
}
`