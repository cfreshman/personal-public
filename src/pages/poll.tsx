import React from 'react'
import styled from 'styled-components'
import { ColorPicker, HalfLine, InfoBody, InfoSection, InfoStyles, Multiline } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useRerender, useS, useStyle, useTimeout } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'
import { useRoom } from 'src/lib/socket'
import url from 'src/lib/url'

const { named_log, Q, rand, duration, datetimes, copy, display_status, maths, colors, strings, range } = window as any
const NAME = 'poll'
const log = named_log(NAME)

type poll = {
  id: string,
  t: number,
  d: number,
  question: string,
  items: string[],
  votes: number[],
  color: string,
}

export default () => {
  const [a] = auth.use()
  const [id, set_id] = usePathState()
  const [poll, set_poll] = useS<poll>(undefined)
  const [votes, set_votes] = store.use('poll-votes', { default:{} })
  const handle = {
    load_poll: async () => {
      if (id) {
        const { data } = await api.post(`/poll/get`, { id })
        set_poll(data)
      } else {
        set_poll(undefined)
      }
    },
    save_poll: async (update, to_server=false) => {
      set_poll({...update})
      if (to_server) {
        await api.post(`/poll/set`, { data:update })
      }
    },
  }
  useF(id, handle.load_poll)
  useRoom({
    room: `poll:${id}`,
    on: {
      [`poll:${id}:update`]: (data) => {
        set_poll(data)
      }
    },
  })

  useF(poll, () => log({ poll }))
  const can_publish = useM(poll, () => {
    return poll && poll.items.filter(x => x).length >= 2
  })
  const vote_total = useM(poll, () => {
    log(poll?.votes, votes)
    if (!id || !poll || !poll.votes) return 0
    return maths.sum(poll.votes)
  })
  const items_and_votes_sorted = useM(poll, () => {
    if (!id || !poll || !poll.votes) return []
    return poll.items.map((x, i) => ({ item:x, votes:poll.votes[i] })).sort((a, b) => b.votes - a.votes)
  })

  const end_ms = useM(poll, () => {
    if (!poll || !poll.t) return 1e99
    return poll.t + poll.d
  })
  const is_over = useM(end_ms, () => end_ms < Date.now())
  const rerender_over = useRerender()
  useTimeout(() => rerender_over(), !is_over ? end_ms - Date.now() : 1e10)

  usePageSettings({
    professional:true,
  })
  useStyle(`
  #header {
    border-bottom: 1px solid currentcolor !important;
  }
  `)
  useStyle(poll, `
  #poll#poll {
    ${poll?.color ? `
    --id-color: ${poll.color};
    --id-color-text: ${colors.readable(poll.color)};
    --id-color-text-readable: ${colors.readable(colors.readable(poll.color))};
    background: var(--id-color) !important;
    color: var(--id-color-text) !important;
    ` : ''}
  }
  `)
  return <Style id='poll'>
    <InfoBody className={!id || poll?.t ? 'middle-column' : ''}>
      {id ? <>
        {!poll ? null : 
        !poll.t ? <>
          <InfoSection>
            <div className='center-row gap'>
              <b>poll #{id}</b>
              {/* &nbsp;
              <button onClick={e => {
                copy(location.origin + `/-poll/${id}`)
                display_status(e.target, 'copied!')
              }}>copy link</button> */}
            </div>
            <div>duration: {datetimes.durations.pretty(poll.d)}</div>
            <Multiline placeholder='optional question' min_rows={3} value={poll.question} setValue={value => {
              poll.question = value
              handle.save_poll(poll)
            }} />
            <div className='column wide gap'>
              {poll.items.map((x, i) => {
                return <div className='center-row wide gap'>
                  <input type='text' placeholder={`item ${i+1}`} value={x} onChange={e => {
                    poll.items[i] = e.target.value
                    handle.save_poll(poll)
                  }} />
                  {i < 2 ? null : <button onClick={e => {
                    poll.items.splice(i, 1)
                    handle.save_poll(poll)
                  }}>delete</button>}
                </div>
              })}
              {poll.items.length < 6 ? <button onClick={e => {
                poll.items.push('')
                handle.save_poll(poll)
              }}>new item</button> : null}
              <HalfLine />
              <div className='center-row gap'>
                <div>appearance:</div>
                &nbsp;
                <button style={S(`background:${poll.color}`)} onClick={e => Q(e.target, 'input').click()}>
                  <ColorPicker value={poll.color} setValue={color => {
                    poll.color = color
                    handle.save_poll(poll)
                  }} />
                </button>
                <button onClick={e => {
                  poll.color = colors.random()
                  handle.save_poll(poll)
                }}>random</button>
                <button onClick={e => {
                  poll.color = '#ffffff'
                  handle.save_poll(poll)
                }}>reset</button>
              </div>
              <HalfLine />
              <button disabled={!can_publish} onClick={e => {
                poll.t = Date.now()
                poll.votes = poll.items.map(x => 0)
                handle.save_poll(poll, true)
              }}>publish!</button>
            </div>
        </InfoSection>
        </> : <>
          <InfoSection>
            <div className='center-row'>
              <b>poll #{id}</b>&nbsp;
              <button onClick={e => {
                copy(location.origin + `/-poll/${id}`)
                display_status(e.target, 'copied!')
              }}>copy link</button></div>
            {!is_over ? <div>time remaining: {datetimes.durations.pretty(Math.max(0, poll.t + poll.d - Date.now()))}</div>
            : <div>ended {datetimes.durations.pretty(Math.max(0, Date.now() - (poll.t + poll.d)))} ago</div>}
            <div className='middle-column wide gap' style={S(`
            border: 1px solid currentcolor;
            border-radius: .25em;
            padding: .25em;
            background: #00000018;
            `)}>
              {poll.question ? <div>{poll.question}</div> : null}
              {!is_over && !votes[id] ? poll.items.map((x, i) => 
              <button style={S(`width:100%; font-size:2em`)} onClick={e => {
                votes[id] = x
                set_votes({...votes})
                poll.votes[i] += 1
                handle.save_poll(poll, true)
              }}>{x}</button>)
              : items_and_votes_sorted.map(({ item, votes }) => 
                <button className='active' style={S(`width:100%; font-size:2em; display:block; text-align:left`)}>{item} - {Math.round(votes / (vote_total||1) * 100)}%</button>)}
            </div>
            <div>{vote_total} {strings.plural(vote_total, 'vote', 's')} cast</div>
          </InfoSection>
        </>}
      </> : <>
        <InfoSection className='middle-column'>
          <button onClick={async e => {
            const { data:poll } = await api.post('/poll/new')
            set_poll(poll)
            // set_id(poll.id)
            url.push(`/poll/${poll.id}`)
          }} style={S(`font-size:2em`)}>new poll</button>
        </InfoSection>
      </>}
    </InfoBody>
  </Style>
}

const common_css = `
input, select, textarea {
  font-size: max(16px, 1em);
  border: 1px solid currentcolor;
  border-radius: .25em;
  color: var(--id-color-text) !important;
  background: var(--id-color-text-readable) !important;
  border-radius: .75em !important;
  &:is(input, select) {
    height: 1.5em;
    // border-radius: 10em !important;
  }
  &::placeholder {
    color: inherit !important;
    opacity: .5 !important;
  }
  &[type=number] {
    max-width: 5em;
  }
  padding: 0 .67em !important;
}

ul {
  padding-left: 1em;
}

button {
  color: var(--id-color-text);
  background: var(--id-color-text-readable);
  border-radius: .75em !important;
  border: 1px solid var(--id-color-text);
  box-shadow: 0 1px var(--id-color-text);
  min-width: 2em;
  display: flex; align-items: center; justify-content: center;
  translate: 0 -1px;
  &:not(:disabled) {
    cursor: pointer;
    &:active, &.active {
      translate: 0;
      box-shadow: none;
    }
  }
  &:disabled {
    cursor: default;
    color: #888;
    // background: #ccc;
  }
  line-height: 1.3em;
  padding: 0 .67em;
  // opacity: .9 !important;
}

// --id-color: #eee;
// --id-color-text: #222;
// --id-color-text-readable: #eee;
// background: var(--id-color) !important;
// color: var(--id-color-text) !important;
padding: .5em;
// font-family: monospace;
font-family: system-ui;
font-family: space-mono;
`
const Style = styled(InfoStyles)`&#poll{
// margin: .5em;
// width: calc(100% - 1em);
// height: calc(100% - 1em);
// border: 1px solid #000;
// border-radius: .25em;

${common_css}

box-shadow: none !important; /* to undo expand style (bad code) */
}`
const PopupStyle = styled(InfoStyles)`
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);
${common_css}
`