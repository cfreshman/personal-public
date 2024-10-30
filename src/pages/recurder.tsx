import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBadges, InfoBody, InfoButton, InfoLoginBlock, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useInput, useM, useRerender, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'
import { openPopup } from 'src/components/Modal'

const { named_log, datetime } = window as any
const NAME = 'recurder'
const log = named_log(NAME)

const STORE_KEY = {
  INPUTS: 'recurder-inputs',
}

const dur_str_to_num = (str) => {
  const matches = {
    s: Number((/(\d+)s( |$)/.exec(str)||[0,0])[1]),
    m: Number((/(\d+)m( |$)/.exec(str)||[0,0])[1]),
    h: Number((/(\d+)h( |$)/.exec(str)||[0,0])[1]),
    d: Number((/(\d+)d( |$)/.exec(str)||[0,0])[1]),
    w: Number((/(\d+)w( |$)/.exec(str)||[0,0])[1]), 
  }
  return 1_000 * (matches.s + 60 * (matches.m + 60 * (matches.h + 24 * (matches.d + 7 * matches.w)))) || datetime.duration({ m:30 })
}
const t_8am = () => {
  const t_date = new Date()
  t_date.setHours(8, 0, 0, 0)
  return Number(t_date)
}

const open_popup = (closer) => {
  openPopup(close => <Style>
    <InfoBody>
      {closer(close)}
    </InfoBody>
  </Style>, `
  height: max-content;
  width: max-content;
  background: #000 !important;
  padding: 0;
  `)
}

const ReminderList = ({ data, reminders, opened, due, handle }: { data, reminders, opened, due?, handle }) => {
  const [label, set_label, label_fill] = useInput('')
  const [duration, set_duration, duration_fill] = useInput('')
  const open_reminder = useM(reminders, opened, () => {
    return reminders.find(x => x.id === opened)
  })
  const cancel = useRerender()
  useF(open_reminder?.id, cancel, () => {
    if (open_reminder) {
      set_label(open_reminder.label)
      set_duration(open_reminder.interval)
    }
  })
  const can_update = useM(label, duration, open_reminder, () => {
    return open_reminder && (open_reminder.label !== label || open_reminder.interval !== duration)
  })

  handle = {
    ...handle,
    update: async (id) => {
      const inst = data.reminders.find(y => y.id === id)
      inst.label = label
      inst.interval = duration
      inst.d = dur_str_to_num(duration)
      inst.due = inst.t + inst.d < Date.now()
      handle.set_opened(undefined)
      await handle.save_data(data)
    },
  }

  return reminders.length ? <>
    {reminders.map((x, i) => {
      // const common_badges = [
      //   { X: () => outer.delete(timer.id) },
      //   { '↻': () => outer.reset(timer.id) },
      // ]
      const is_open = opened === x.id
      const base = <InfoBadges nowrap labels={[
        /*is_open ? x.label : */{
          [x.label]: () => {
            handle.set_opened(is_open ? undefined : x.id)
          },
        },
        ...(due ? [
          { done: async () => {
            const inst = data.reminders.find(y => y.id === x.id)
            // inst.t = t_8am()
            while (inst.t < Date.now()) inst.t += inst.d
            await handle.save_data(data)
          } },
        ] : [
          `${x.interval} → ${datetime.yyyymmdd(new Date(x.t + x.d))}`,
        ]),
        // ...common_badges,
        // { now: () => outer.open(timer.id) },
      ]} />
      if (is_open) {
        return <div className='column wide gap'>
          {base}
          <input id='label' placeholder='label' {...label_fill}></input>
          <input id='duration' placeholder='interval (like 2d, 4w, 1w 3d)' {...duration_fill} onKeyDown={e => e.key === 'Enter' && handle.update(x.id)}></input>
          <InfoBadges labels={[
            // { cancel: () => cancel() },
            { update: async () => handle.update(x.id) },
          ]} />
          <HalfLine />
          <InfoBadges labels={[
            { [x.active ? 'turn off' : 'turn on']: async () => {
              const inst = data.reminders.find(y => y.id === x.id)
              inst.active = !inst.active
              handle.set_opened(undefined)
              await handle.save_data(data)
            } },
            x.active && !due && { 'make due': async () => {
              const inst = data.reminders.find(y => y.id === x.id)
              inst.t = Date.now() - inst.d
              handle.set_opened(undefined)
              await handle.save_data(data)
            } },
            { 'delete': () => {
              open_popup(close =>
              <InfoSection>
                <div>
                  delete "<b>{x.label}</b>"?
                </div>
                <HalfLine />
                <div className='row wide gap' style={S(`
                font-size: 1.5em;
                `)}>
                  <InfoButton onClick={close}>CANCEL</InfoButton>
                  <div className='spacer' />
                  <InfoButton onClick={async e => {
                    data.reminders = data.reminders.filter(y => y.id !== x.id)
                    close()
                    await handle.save_data(data)
                  }}>CONFIRM</InfoButton>
                </div>
              </InfoSection>)
            } },
          ]} />
          <HalfLine />
        </div>
      }
      return base
      // return <div className='center-row wide gap' style={S(`
      // margin-bottom: 1px;
      // align-items: center;
      // `)}>
      //   <span style={S(`
      //   align-items: center;
      //   border: 1px solid currentcolor;
      //   // border-radius: 10em;
      //   padding: .25em .5em;
      //   box-shadow: 0 1px currentcolor;
      //   background: var(--id-color-text-readable);
      //   `)}>{x.label} due {datetime.yyyymmdd(new Date(x.t + x.d))}</span>
      //   {/* <InfoBadges labels={[
      //     { options: () => {} },
      //   ]} /> */}
      // </div>
      {/* return <InfoBadges nowrap labels={[
        {
          text: x.label,
          style: `
          flex-shrink: 1;
          overflow: hidden;
          display: block;
          user-select: all !important;
          `,
        },
        datetime.yyyymmdd(new Date(x.t + x.d)),
        ...common_badges,
        { now: () => outer.open(timer.id) },
      ]} /> */}
    })}
  </> : <>no matching reminders</>
}

export default () => {
  const [{user:viewer}] = auth.use()

  // const [data, set_data] = store.use('recurder-test-data', { default:{
  //   user: 'cyrus',
  //   reminders:[
  //     { id:1, label:'test reminder', t: Date.now(), interval:'1w', d:datetime.durations.new({ w:1 }), active:true },
  //     { id:2, label:'second reminder', t: Date.now(), interval:'4w', d:datetime.durations.new({ w:4 }), active:true }
  //   ],
  // } })
  const [data, set_data] = useS(undefined)

  const stored_inputs = store.get(STORE_KEY.INPUTS) || {label:'',duration:''}
  const [label, set_label, label_fill] = useInput(stored_inputs.label)
  const [duration, set_duration, duration_fill] = useInput(stored_inputs.duration)
  useF(label, duration, () => store.set(STORE_KEY.INPUTS, {label,duration}))

  const [opened, set_opened] = useS(undefined)

  const handle = {
    set_opened,
    load_data: async () => {
      const { data } = await api.get('/recurder')
      set_data(data)
    },
    save_data: async (new_data) => {
      set_data({...new_data})
      await api.post('/recurder', { data:new_data })
      await handle.load_data()
    },
    add_reminder: async () => {
      const d = dur_str_to_num(duration)
      const t = t_8am()

      const new_reminder = {
        id: rand.alphanum(8),
        label, interval:duration,
        t, d,

        active: true,
        due: false,
      }
      data.reminders.push(new_reminder)
      data.reminders.sort((a, b) => (a.t + a.d) - (b.t + b.d))
      set_label('')
      set_duration('')
      await handle.save_data(data)
    },
  }
  useF(viewer, handle.load_data)

  const lists = useM(data, () => {
    if (!data) return {}
    const due_set = new Set(data.reminders.filter(x => x.t + x.d < Date.now()).map(x => x.id))
    return {
      due: data.reminders.filter(x => x.active && due_set.has(x.id)),
      active: data.reminders.filter(x => x.active && !due_set.has(x.id)),
      inactive: data.reminders.filter(x => !x.active),
    }
  })

  usePageSettings({
    background: '#86b2ee',
    expand: true,
  })
  return <Style>
    <InfoBody className='column'>
      {/* <InfoSection>
        <div><b>recurder 🕰</b> - periodic reminders</div>
        <HalfLine />
      </InfoSection> */}
      <InfoSection>
        <div style={S(`
        border: 1px solid var(--id-color-text) !important;
        padding: .5em !important;
        border-radius: .25em !important;
        `)}><b>recurder:</b> periodic reminders</div>
        <HalfLine />
      </InfoSection>
      {!viewer ? <>
        <InfoSection>
          <InfoLoginBlock inline to='use' />
        </InfoSection>
      </>
      : !data ? <>
        <InfoSection>
          loading...
        </InfoSection>
      </> 
      : <>
        <InfoSection labels={[
          'due',
        ]}>
          <ReminderList due {...{ data, reminders:lists.due, opened, handle }} />
          <HalfLine />
        </InfoSection>
        <InfoSection labels={[
          'new periodic reminder',
          { 'add': () => {
            handle.add_reminder()
          } },
        ]}>
          <input id='label' placeholder='label' {...label_fill}></input>
          <input id='duration' placeholder='interval (like 2d, 4w, 1w 3d)' {...duration_fill} onKeyDown={e => e.key === 'Enter' && handle.add_reminder()}></input>
          <HalfLine />
        </InfoSection>
        <InfoSection labels={[
          'active reminders',
        ]}>
          <ReminderList {...{ data, reminders:lists.active, opened, handle }} />
          <HalfLine />
        </InfoSection>
        <InfoSection labels={[
          'inactive reminders',
        ]}>
          <ReminderList {...{ data, reminders:lists.inactive, opened, handle }} />
          <HalfLine />
        </InfoSection>
        <div className='spacer' />
        <InfoSection label='more'>
          <div>- add to your home screen for quick access</div>
          <div>- <A bold tab='/contact' /> me</div>
          <div>- donate a <A bold tab='/coffee' /></div>
        </InfoSection>
      </>}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`