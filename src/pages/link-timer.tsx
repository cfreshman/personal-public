import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoButton, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useInput, useInterval, useM, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { pass } from 'src/lib/types'
import { store } from 'src/lib/store'
import { is_mobile } from 'src/lib/util'

const { named_log, Q, values, datetime, rand } = window as any
const log = named_log('link-timer')

const STORE_KEY = {
  INPUTS: 'link-timer_inputs',
  TIMERS: 'link-timer_timers',
}

type timer = {
  id: string,
  link: string,
  label?: string,
  t: number,
  d: number,

  active: boolean,
  overdue: boolean,
  completed: boolean,
}
type timer_list = timer[]

const TimerList = ({ timers, outer }: { timers:timer_list, outer }) => {
  return timers.length ? <>
    {timers.map((timer, i) => {
      const common_badges = [
        { X: () => outer.delete(timer.id) },
        { '↻': () => outer.reset(timer.id) },
      ]
      try {
        return <InfoBadges nowrap labels={[
          `${i + 1}`,
          (timer.label || timer.link) && {
            text: timer.label || timer.link,
            style: `
            flex-shrink: 1;
            overflow: hidden;
            display: block;
            user-select: all !important;
            `,
          },
          new Date(timer.t + timer.d)[timer.d < datetime.duration({ d:1 }) ? 'toLocaleTimeString' : 'toLocaleString'](),
          ...common_badges,
          { now: () => outer.open(timer.id) },
        ]} />
      } catch {
        return <InfoBadges labels={[
          'error displaying timer',
          ...common_badges,
        ]} />
      }
    })}
  </> : <>no matching timers</>
}

export default () => {

  // const [timers, set_timers] = useS<timer_list>([])
  const [timers, set_timers] = store.use(STORE_KEY.TIMERS, { default:[] })
  const groups = useM(timers, () => ({
    overdue: timers.filter(t => t.overdue),
    active: timers.filter(t => t.active),
    completed: timers.filter(t => t.completed),
  }))
  useF(timers, groups, () => log({timers, groups}))
  useF(timers, () => {
    let update = false
    timers.map(t => {
      if (!t.id) {
        t.id = rand.alphanum(8)
        update = true
      }
    })
    if (update) set_timers(timers.slice())
  })

  const stored_inputs = store.get(STORE_KEY.INPUTS) || {link:'',label:'',duration:''}
  const [link, set_link, link_fill] = useInput(stored_inputs.link)
  const [label, set_label, label_fill] = useInput(stored_inputs.label)
  const [duration, set_duration, duration_fill] = useInput(stored_inputs.duration)
  useF(link, label, duration, () => store.set(STORE_KEY.INPUTS, {link,label,duration}))
  // let link_fill, label_fill, duration_fill
  // link_fill = label_fill = duration_fill = {}

  const handle = {
    _Ls: () => {
      return {
        link: Q('#link'),
        label: Q('#label'),
        duration: Q('#duration'),
      }
    },
    start: () => {
      const matches = {
        s: Number((/(\d+)s( |$)/.exec(duration)||[0,0])[1]),
        m: Number((/(\d+)m( |$)/.exec(duration)||[0,0])[1]),
        h: Number((/(\d+)h( |$)/.exec(duration)||[0,0])[1]),
        d: Number((/(\d+)d( |$)/.exec(duration)||[0,0])[1]),
        w: Number((/(\d+)w( |$)/.exec(duration)||[0,0])[1]), 
      }
      const d = 1_000 * (matches.s + 60 * (matches.m + 60 * (matches.h + 24 * (matches.d + 7 * matches.w)))) || datetime.duration({ m:30 })
      
      const new_timer = {
        id: rand.alphanum(8),
        link,
        label,
        t: Date.now(),
        d,

        active: true,
        overdue: false,
        completed: false,
      }
      log({new_timer, matches}, /\d+m/.exec(duration), /\d+h/.exec(duration), /\d+d/.exec(duration))
      set_timers([new_timer, ...timers])
      handle.clear()
    },
    clear: () => {
      set_link('')
      set_label('')
      set_duration('')
    },
    delete: (id) => {
      log('delete', id)
      set_timers(timers.filter(t => t.id !== id))
    },
    open: (id) => {
      log('open', id)
      set_timers(timers.map(timer => {
        if (timer.id === id) {
          timer.active = false
          try {
            open(timer.link, '_blank')
            timer.completed = true
          } catch {
            timer.overdue = true
          }
        }
        return timer
      }))
    },
    reset: (id) => {
      log('reset', id)
      set_timers(timers.map(timer => {
        if (timer.id === id) {
          timer.completed = timer.overdue = false
          timer.active = true
          timer.t = Date.now()
        }
        return timer
      }))
    },
  }

  useInterval(groups, () => {
    let update = false
    const now = Date.now()
    const is_new_overdue = (timer) => {
      if (timer.overdue || timer.completed) return false
      const expiration = timer.t + timer.d
      if (expiration < now) {
        return true
      }
    }
    values(groups).map(timers => timers.map(timer => {
      if (is_new_overdue(timer)) {
        handle.open(timer.id)
        update = true
      }
    }))
    if (update) set_timers(timers.slice())
  }, 500)

  usePageSettings({
    background: '#86b2ee',
    expand: true,
  })
  return <Style>
    <InfoBody className='column'>
      <InfoSection>
        {/* <div>set a timer for a link! {is_mobile ? '30m by default' : '(re-opens in 30m by default)'}</div> */}
        <div>set a timer for a link! 30m by default</div>
        <input id='link' placeholder='link' {...link_fill}></input>
        <input id='label' placeholder='optional label' {...label_fill}></input>
        <input id='duration' placeholder='duration (like 2d, 1h, 10m, 3w, 2h 30m)' {...duration_fill}></input>
        {/* TODO random <input id='duration' placeholder='duration (like 2d, 1h, 10m, 2h 30m, 1h-2h (random))' {...duration_fill}></input> */}
        <InfoBadges labels={[
          { 'start!': handle.start },
          { 'clear': handle.clear },
        ]} />
      </InfoSection>
      {/* <InfoSection labels={['overdue']}>
        <TimerList {...{ timers:groups.overdue, outer:handle }} />
      </InfoSection> */}
      <InfoSection labels={['active']}>
        <TimerList {...{ timers:groups.active, outer:handle }} />
      </InfoSection>
      <InfoSection labels={['completed']}>
        <TimerList {...{ timers:groups.completed, outer:handle }} />
      </InfoSection>
      <div className='spacer' />
      <InfoSection labels={[
        'fine print'
      ]}>
        <div>timers run locally. won't sync to other computers. keep this window open (or links won't open) (best on desktop). find this useful? <a href="https://freshman.dev/1">donate me $1/mo!</a> bored? <a href="https://freshman.dev/fight-me">fight me!</a></div>
      </InfoSection>
      {/* <InfoSection labels={[
        'legal uh fine print'
      ]}>
        <div>use at ur own risk! don't sue me! uh purposely breaks if link is very important</div>
      </InfoSection> */}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`