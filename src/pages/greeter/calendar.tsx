import React from 'react'
import { auth } from 'src/lib/api'
import { useEventListener, useF, useInterval, useR, useS } from 'src/lib/hooks'
import { useCachedScript } from 'src/lib/hooks_ext'
import { InfoSection } from '../../components/Info'
import { S } from 'src/lib/util'
import { store } from 'src/lib/store'
import { Scroller } from 'src/components/Scroller'
import { APP_COOKIE } from './util'


const { named_log, list, strings, truthy, QQ, Q, datetime, duration } = window as any
const log = named_log('greeter calendar')

export const Calendar = ({ user=undefined, other=undefined, handle=undefined }={}) => {

  useCachedScript('/lib/2/mono-cal/script.js')
  const calendar_root = useR()

  const [{ user:viewer }] = auth.use()
  const self = user === viewer

  const [calendar, setCalendar] = useS(undefined)
  useF(user, () => handle.load_calendar(user, other, setCalendar))
  // reload every 5m and on focus
  useInterval(() => handle.load_calendar(user, other, setCalendar), duration({ m:5 }))
  useEventListener(window, 'focus', () => handle.load_calendar(user, other, setCalendar))

  useF(calendar, window['mono_cal'], calendar_root.current, () => {
    const { mono_cal } = window as any
    log({ calendar, mono_cal })
    if (calendar && mono_cal && calendar_root.current) {
      mono_cal.attach(calendar_root.current, calendar, {
        show_toggle: false,
        // max_width: '20em'
        no_resize: true,
        default_func: e => {
          let curr_target = e.target
          while (curr_target && !curr_target.classList.contains('date')) curr_target = curr_target.parentNode
          
          const t = Number(curr_target.dataset['t'] || 0)
          if (t) {
            const actual_t = Number(new Date(datetime.yyyymmdd(t))) + datetime.duration({ h:1 })
            store.set(APP_COOKIE.HANGOUT_PREFILL, { t:actual_t })
            handle.set_path([undefined, 'hangout'])
          }
        }
      })
      const last_calendar_click = store.get('greeter-last-calendar-click')
      if (last_calendar_click) {
        Q(last_calendar_click)?.scrollIntoView({ block: 'center' })
        Q('#inner-index')?.scrollIntoView({ block: 'end' })
        store.set('greeter-last-calendar-click', undefined)
      }
    }
  })

  const [meet, setMeet] = useS(undefined)
  useF(user, other, () => {
    if (user && other) {
      handle.load_meet(user, other, setMeet)
    } else {
      setMeet(undefined)
    }
  })
  
  return <>
    <InfoSection className='section-calendar' labels={[
      other ? `${other} & ${user}'s calendar` : self ? `your calendar` : `${user}'s calendar`,
      !other && { [self ? 'view your meets' : `view ${user}'s meets`]: () => handle.setPath([viewer]) },
      ...(other ? [
        'view:',
        { [user]: () => handle.setPath([user, 'greet']) },
        { [other]: () => handle.setPath([other, 'greet']) },
        meet && { meet: () => handle.setPath([user, 'met', other]) },
      ] : [
        { 'add hangout': () => handle.setPath([undefined, 'hangout']) },
      ])
    ]}>
      {calendar === undefined ? <div>loading calendar</div> : null}
      <div ref={calendar_root} style={S(`
      // max-width: 20em;
      // max-width: 100%;
      height: 0;
      width: 100%;
      flex-grow: 1;
      margin-bottom: -.5em;
      `)} />
    </InfoSection>
  </>
}
