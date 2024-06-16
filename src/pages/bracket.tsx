import React, { useState } from 'react'
import styled from 'styled-components'
import { A } from '../components/A'
import { ExternalIcon, InfoBody, InfoButton, InfoSection, InfoStyles } from '../components/Info'
import { Tooltip } from '../components/Modal'
import { useF } from '../lib/hooks'
import { JSX } from '../lib/types'
import url from '../lib/url'
import { group, randAlphanum, randi, range } from '../lib/util'

const bracketize = players => {
  if (players.length < 1) return players
  // for n players, tree with height on order of log2(n)

  // TODO redo splits from top
  const recurseSplit = <T,>(values: T[], score: (T)=>number) => {
    const ordered = values.slice().sort((a, b) => score(a) - score(b))
    // console.debug(ordered)
    if (ordered.length <= 2) return ordered

    let left = []
    let right = []
    while (ordered.length) {
      right.push(ordered.shift())
      ordered.length && left.push(ordered.shift())
      ordered.length && right.push(ordered.pop())
      ordered.length && left.push(ordered.pop())
    }
    // console.debug(left, right)

    left = recurseSplit(left, score)
    right = recurseSplit(right, score)
    if (left.length === right.length
        && Math.min(...right.map(score)) < Math.min(...left.map(score))) {
      [left, right] = [right, left]
    }

    return [...left, ...right]
  }
  const baseSplit = <T,>(values: T[], score: (T)=>number) => {
    if (values.length < 2) return values
    const ordered = recurseSplit(values, score)
    // return ordered

    let maxScore
    let tree = ordered.map(x => {
      const x_score = score(x)
      if (x_score < maxScore) maxScore = x_score
      return {
        value: x,
        min: x_score,
      }
    })
    while (tree.length > 1) tree = group(tree, 2).map(x => ({
      value: x, min: x.length < 2 ? maxScore : Math.min(x[0].min, x[1].min),
    }))
    const recurseSortTree = (tree: { value, min?:number }, score) => {
      // sort pairs, sort & flatten nodes
      if (!Array.isArray(tree.value)) {
        // pass
      } else {
        recurseSortTree(tree.value[0] as any, score)
        tree.value[1] && recurseSortTree(tree.value[1] as any, score)
        tree.value = tree.value.sort((a,b) => a.min - b.min).flatMap(x => x.value)
      }
      return tree
    }
    return recurseSortTree(tree[0], score).value
  }

  // initialize order to match first & last by rating
  const ratingOrder = players.slice().sort((a, b) => b.rating - a.rating)
  ratingOrder.map((x, i) => {
    x.rank = i + 1
  })
  let layer = baseSplit(ratingOrder, x => x.rank)

  // this outputs an order which can be iteratively composed into a bracket
  // (it would be easier to just use internal pairs, but this is a nice property)1qq12q1qq1
  layer.map((x, i) => x.total = 1)
  const layers = [layer]
  while (layer.length > 1) {
    const previous = layer.slice()
    layer = []
    let pick, put, reverse
    if (layers.length % 2) {
      pick = () => previous.shift()
      put = x => layer.push(x)
      reverse = false
    } else {
      pick = () => previous.pop()
      put = x => layer.unshift(x)
      reverse = true
    }

    while (previous.length > 1) {
      const [first, second] = (x => reverse ? x.reverse() : x)([pick(), pick()])
      first.class = 'first'
      second.class = 'second'
      // second.total = Math.max(2, second.total)
      put({
        name: `(${first.name} or ${second.name})`,
        incomplete: true,
        rating: Math.max(first.rating, second.rating),

        total: first.total + second.total,
        min: Math.min(first.min ?? 1, second.min ?? 1),
        last: layers.length,

        first, second,
        rank: Math.min(first.rank, second.rank),
      })
    }
    if (previous.length) {
      const first = previous[0]
      first.class = 'first second'
      // first.bye = true
      put({
        ...first,
        first,
        second: { total: 0 },
        // bye: false,
        bye: true,
      })
    }
    layers.push(layer)
  }

  return layers
}

export const Bracket = ({ bracket, round:outerRound=0 }) => {
  const handle = {
    user: name => {
      url.frame(`/-u/${name}`)
    },
  }
  // useF(() => handle.user('cyrus'))
  const [round, setRound] = useState(outerRound)
  useF('ROUND', round, outerRound, console.debug)
  useF(outerRound, setRound)
  const r_n = bracket.length
  const stem = r_n > 8 ? '' : r_n > 6 ? '─' : '──'
  return <>
    <InfoSection labels={[
      'search for user'
    ]}>
      <input type='text'
      onKeyDown={e => {
        if (e.key === 'Enter') {
          const L = document.querySelector(`[data-name=${(e as any).target.value}]`)
          if (L) {
            L.scrollIntoView({
              // behavior: "smooth",
              block: "center",
              inline: "nearest"
            })
            document.querySelector('#index').scrollIntoView({ block: 'end' })
            document.querySelector('.highlight')?.classList.remove('highlight')
            L.classList.add('highlight')
          }
        }
      }} />
    </InfoSection>
    <InfoSection labels={[
      'bracket',
      // copied ? 'copied' : { text: 'copy', func: () => {
      //   // TODO make this printable
      //   copy((document.querySelector('.bracket') as any).textContent)
      //   setCopied(true)
      // } },
      ]} style={{whiteSpace:'pre'}}>
      <BracketStyle className='bracket'>
        {(bracket.length ? bracket : [[{ name: '(empty)', rank: 0 }]]).slice(round).map((_round, i) => {
          _round.map((match, j) => {
            if (i === 0) {
              match.total = 1
            } else {
              match.total = (match.first?.total ?? 0) + (match.second?.total ?? 0)
            }
          })
          // the next level doesn't provide additional visual info
          let count = true
          if (i === 1) count = false // return ''
          else if (i > 1) i -= 1

          const true_i = i + round
          return <div className='round' key={i}>
            {count
            ?
            <div className='count-container'
            // style={{zIndex:bracket.length-i}}
            >
              {!i && round
              ?
              (round === 1 ? [0] : [0, round-1]).map(i =>
              <div key={i} className={`count count-button-true`} onClick={e => setRound(i)}>{i + 1}</div>)
              :''}
              <div className={`count count-button-${true_i !== round}`} onClick={e => setRound(true_i)}>{i ? '' : round ? 'round ' : 'round '}{true_i + 1}</div>
            </div>
            :''}
            {_round.map((match, j) => {
              return (i // match.total > 1
                ? <>
                  {/* <span>—–{match.name}</span> */}
                  <span className='match'>{stem}{match.bye
                  ? '─'
                  : <span className='match-links'>┰{
                    match.links ? <Tooltip
                    className='match-links-icon'
                    of={<>
                      {match.links.map((x,i) => <A key={x} href={x}>game {i+1} ({x.match(/#.*/)[0]})</A>)}
                    </>}
                    click><ExternalIcon/></Tooltip> : ''
                  }</span>}{'\n'}</span>
                  {/* {j < round.length-1 ? range(match.total - 1).map(j => <span key={j}>   |</span>) : ''} */}
                  {match.second?.total
                  ? <>
                    {range(match.first.total-1).map(j => <span key={j} className='match'><span className=''>┃</span>{'\n'}</span>)}
                    {match.second.total
                    ? <>
                      <span className='match'>{stem}<span className=''>┚</span>{'\n'}</span>
                      {/* <span>—–^</span> */}
                      {range(match.second.total-1).map(j => <span key={j} className='match'>{'\n'}</span>)}
                    </>
                    :''}
                  </>
                  : range(match.total - 1).map(j => <span key={j} className='match'>{'\n'}</span>)}
                </>
                // : match.bye
                // ? ''
                : <>
                  <span
                  data-name={match.name}
                  className={'name '+(match.winner?'winner ':'')+match.class}
                  onClick={e => match.incomplete || handle.user(match.name)}>
                    <span className='rank'>{match.rank}</span> {match.incomplete ? <span style={{opacity:.3}}>########</span> : match.name}{'\n'}
                  </span>
                  {range(match.total - 1).map(x => <span key={x}> </span>)}
                </>)
            })}
          </div>
        })}

        <div className='round'>
          <span className='match'>──{'\n'}</span>
        </div>
        <div className='round'>
          <span className='name' style={{background:'#ffd700dd'}}>1st{'\n'}</span>
          <span className='name' style={{background:'#e1e3e6dd'}}>2nd{'\n'}</span>
          <span className='name' style={{background:'#f09851dd'}}>3rd{'\n'}</span>
        </div>
      </BracketStyle>
    </InfoSection>
  </>
}

export default () => {
  const [n, setN] = useState(99)
  const [players, setPlayers] = useState([])
  const [bracket, setBracket] = useState([])
  const handle = {
    generatePlayers: (_n=n) => {
      setPlayers([
        ...players.slice(0, _n),
        ...range(_n - players.length).map(i => ({ name: randAlphanum(3 + randi(6)), rating: i }))
      ])
    },
    construct: (_players=players) => {
      setBracket(bracketize(players))
    },
  }
  useF(n, () => n !== players.length && handle.generatePlayers())
  useF('BRACKET', bracket, 'PLAYERS', players, console.debug)

  const [copied, setCopied] = useState(false)
  useF(copied, () => copied && setTimeout(() => setCopied(false), 1500))

  return <Style>
    <InfoBody>
      <InfoSection labels={[
        // 'create ',
      ]}>
        <InfoButton onClick={handle.construct}>
          construct bracket for <input
          type='number' value={n}
          max={9999} style={{width:'5em'}}
          onChange={e => setN(Number(e.target.value))}
          onKeyDown={e => e.key === 'Enter' && handle.construct()}
          /> players
        </InfoButton>
        <input type='text' value={players.map(x => x.name).join(',')} onChange={e => {
          const players = e.target.value.split(',').map((x, i) => ({ name: x.slice(0, 8), rating: -i }))
          setPlayers(players)
          setN(players.length)
        }} onKeyDown={e => e.key === 'Enter' && handle.construct()} />
      </InfoSection>
      <Bracket bracket={bracket} />
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.body {
  max-width: unset !important;
}
`
const BracketStyle = styled.div`
&.bracket {
  display: flex;
  flex-direction: row;
  white-space: pre;

  .round {
    display: flex;
    flex-direction: column;
    text-align: right;

    .name {
      background: #eee;
      border-right: 3px solid black;
      border-bottom: 0; border-top: 0;
      // border-radius: .2em;
      cursor: pointer;

      &:hover {
        background: #000;
        color: white;
      }

      &.winner {
        background: #64d790;
        &:hover {
          color: #64d790;
          background: #000;
        }
      }
      &.highlight {
        background: #ffcf12;
        &:hover {
          color: #ffcf12;
          background: #000;
        }
      }

      display: inline-flex;
      justify-content: space-between;
      .rank {
        margin-right: .67em;
        opacity: .25;
      }
    }
    &:first-child .name, &:last-child .name {
      padding: 0 .5em;
      &.first {
        border-top-left-radius: .2em;
      }
      &.second {
        border-bottom-left-radius: .2em;
      }
    }
    &:last-child .name {
      border: 0;
      margin-bottom: .33em;
      border-left: 3px solid black;
      border-top-right-radius: .2em;
      border-bottom-right-radius: .2em;
      &:hover {
        background: #000 !important;
        color: white;
      }
    }

    .match {
      display: inline-block;
      // transform: scaleY(3);
      user-select: none;
    }
    .match-links {
      position: relative;
      .match-links-icon {
        position: absolute !important;
        // z-index: 100 !important;
        left: -.25em;
        background: #eee;
        border-radius: .2em;
        display: inline-flex;
        padding: .25em;

        svg {
          fill: black !important;
        }
        &:hover:not(:active) {
          background: black;
          svg {
            fill: white !important;
          }
        }

        box-shadow: 1px 1px 5px 1px #8881;
      }
      #tooltip {
        background: transparent !important;
        padding: 0 !important;
        border: 0 !important;
        > * {
          text-align: left;
          display: block;
          box-shadow: 1px 1px 5px 1px #8881;
          background: #eee;
          padding: 0 .5em;
          border-radius: .2em;
          margin: .25em 0;
          text-decoration: none;
          &:hover:not(:active) {
            background: #000;
            color: white !important;
          }
        }
      }
    }

    &:not(:last-child) > span:nth-of-type(2n) {
      margin-bottom: .33em;
    }

    position: relative;
    margin-top: 2em;
    .count-container {
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: .15em;
      // z-index: 1;
      display: flex;
      user-select: none;
      &:hover {
        z-index: 100100100 !important;
      }

      .count {
        padding: 0 .25em;
        min-width: 1.25em;
        text-align: center;

        &.count-button-true {
          background: #eee;
          box-shadow: 0px 1px #ddd;
          // border-right: 1px solid #ddd;
          // border-top: 0; border-bottom: 0;
          border-radius: .2em;
          pointer-events: all;
          cursor: pointer;
          &:hover {
            background: #000 !important;
            color: white;
          }
        }

        &:not(:last-child) { margin-right: .15em }
      }
    }
    &:first-child .count-container {
      left: 0; right: unset;
    }
    &:not(:first-child) .count-container .count {
      position: relative;
      right: -.125em;
    }
  }
}
`