import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from '../../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { S, getCssVar } from 'src/lib/util'
import { useE, useEventListener, useF, useS, useSkip, useStyle } from 'src/lib/hooks'
import { Meet } from './meet'
import api, { auth } from 'src/lib/api'
import { User } from './user'
import { Greet } from './greet'
import { Calendar } from './calendar'
import { openPopup } from 'src/components/Modal'
import { store } from 'src/lib/store'
import { About } from './about'
import { Quiz } from './quiz'
import GreeterMeet from './GreeterMeet'
import { Summary } from './summary'
import { Hangout } from './hangout'
import GreeterHangout from './GreeterHangout'
import { AI } from './ai'
import { Style } from './style'
import { parseSubdomain } from 'src/lib/page'

const { named_log, list, truthy, datetime, values, set, node, Q, range, keys } = window as any
const log = named_log('greeter')

const non_user_pages = set('about ai')
const id_pages = set('hangout')
const path_parts_to_path = (parts) => {
  if (non_user_pages.has(parts[1])) {
    return parts[1]
  } else if (id_pages.has(parts[1])) {
    return [parts[1], parts[0], parts[2]].filter(truthy).join('/')
  } else {
    return parts.filter(truthy).join('/')
  }
}

export const create_handle = (context) => {
  const {setPath} = context as any
  const handle = {
    setPath: (parts, e=undefined) => {
      if (e && e.metaKey) {
        open(`/greeter/${parts.join('/')}`)
      } else {
        setPath(parts)
      }
    },
    set_path: (...xs) => handle.setPath(...(xs as [any, any])),
    load_profile: async (user, setProfile) => {
      try {
        const {profile} = await api.get(`/profile/${user}`)
        setProfile(profile)
      } catch (e) {
        log(e)
      }
    },
    load_meet: async (friend, other, setMeet) => {
      try {
        const {item} = await api.post(`/greeter/met`, { friend, other })
        setMeet(item)
      } catch (e) {
        log(e)
        setMeet({
          met: false,
        })
      }
    },
    set_meet: async (data, setMeet) => {
      try {
        const {item} = await api.post(`/greeter/meet`, data)
        setMeet(item)
      } catch (e) {
        log(e)
        setMeet({
          met: false,
          ...data,
        })
      }
    },
    load_greet: async (user, setGreet) => {
      try {
        const {item} = await api.get(`/greeter/greet/${user}`)
        setGreet(item)
      } catch (e) {
        log(e)
        setGreet({})
      }
    },
    set_greet: async (data, setGreet) => {
      try {
        const {item} = await api.post(`/greeter/greet`, data)
        setGreet(item)
      } catch (e) {
        log(e)
        setGreet({
          met: false,
          ...data,
        })
      }
    },
    load_meets: async (user, setMeets) => {
      try {
        const {list} = await api.get(`/greeter/meets/${user}`)
        setMeets(list)
      } catch (e) {
        log(e)
        setMeets([])
      }
    },
    load_calendar: async (user, other, setCalendar) => {
      log('set calendar')
      try {
        let [{list:meet_list},{list:hangout_list}] = await Promise.all([
          api.get(`/greeter/meets/${user}`),
          api.get(`/greeter/hangouts/${user}`),
        ])
        if (other) {
          meet_list = meet_list.filter(item => item.users.includes(other))
          hangout_list = hangout_list.filter(item => item.users.includes(other))
        }
        log('retrieved meets', {meet_list,hangout_list})
        // const entries = list.map(item => {
        //   return {
        //     date: new Date(item.t + datetime.duration({ h:12 })),
        //     func: () => handle.setPath([item.users[0], 'met', item.users[1]])
        //   }
        // })
        const entries_per_date = {}
        meet_list.map(item => {
          const ymd = datetime.yyyymmdd(new Date(item.t + datetime.duration({ h:1 })))
          entries_per_date[ymd] = (entries_per_date[ymd] || []).concat([{meet:true,item}])
        })
        hangout_list.map(item => {
          const ymd = datetime.yyyymmdd(new Date(item.t + datetime.duration({ h:1 })))
          entries_per_date[ymd] = (entries_per_date[ymd] || []).concat([{hangout:true,item}])
        })
        const entries = []
        await Promise.allSettled(values(entries_per_date).map(async dual_items => {
          const meets = dual_items.filter(dual_item => dual_item.meet).map(dual_item => dual_item.item)
          const hangouts = dual_items.filter(dual_item => dual_item.hangout).map(dual_item => dual_item.item)
          const both = [].concat(meets, hangouts)

          const single = both.length === 1 && both[0]
          const hrefs = [].concat(
            meets.map(item => `/greeter/${[item.users[0], 'met', item.users[1]].join('/')}`),
            hangouts.map(item => `/greeter/hangout/${item.id}`),
          )
          const funcs = [].concat(
            meets.map(item => () => {
              handle.setPath([item.users[0], 'met', item.users[1]])
              // const last_calendar_click = `.date-${datetime.yyyymmdd(item.t)}`
              // store.set('greeter-last-calendar-click', last_calendar_click)
            }),
            hangouts.map(item => () => {
              handle.setPath([item.id, 'hangout'])
              // const last_calendar_click = `.date-${datetime.yyyymmdd(item.t)}`
              // store.set('greeter-last-calendar-click', last_calendar_click)
            })
          )
          let hide_date = single ? !!single.icon : true // false
          const icon = single ? single.icon : await (async () => {
            const IMG_SIZE = 64
            const canvas = node('canvas')
            const ctx = canvas.getContext('2d')
            const rows = Math.floor(Math.sqrt(both.length))
            const columns = Math.ceil(both.length / rows)
            canvas.height = (both.length === 2 ? 2 : rows) * IMG_SIZE
            canvas.width = columns * IMG_SIZE
            // ctx.fillStyle = '#111'
            // ctx.fillRect(0, 0, canvas.width, canvas.height)
            const images = Array.from(await Promise.allSettled<any>(both.map(({ icon=undefined }) => new Promise(resolve => {
              const img = node(`<img crossorigin="anonymous" />`)
              img.onload = e => resolve(img)
              if (icon) {
                img.src = icon
              } else {
                resolve(undefined)
              }
            })))).map(x => x.status === 'fulfilled' ? (x as any).value : undefined)
            log({images})
            const n_no_icon = images.filter(x => !x).length
            let i_no_icon = 0
            range(both.length).map((i) => {
              const r = both.length === 2 ? i : Math.floor(i / columns)
              const c = i % columns
              if (images[i]) {
                hide_date = true
                ctx.drawImage(images[i], 0, 0, images[i].width, images[i].height, c * IMG_SIZE, r * IMG_SIZE, IMG_SIZE, IMG_SIZE)
              } else {
                const i_ratio = i_no_icon / n_no_icon
                ctx.fillStyle = n_no_icon > 1 ? `hsl(${i_ratio * 360}deg 70% 70%)` : '#fff'
                ctx.fillRect(c * IMG_SIZE, r * IMG_SIZE, IMG_SIZE, IMG_SIZE)
                i_no_icon += 1
              }
            })
            return canvas.toDataURL()
          })()
          // single && log('icon', single.icon)
          entries.push({
            date: new Date(both[0].t + datetime.duration({ h:1 })),
            // invert: single && !single.icon,
            // classes: single ? 'date-meet' : 'date-group',
            classes: 'date-meet',
            func: () => {
              if (single) {
                funcs[0]()
              } else {
                openPopup(close => <InfoStyles>
                  <InfoBody>
                    <InfoSection labels={[
                      `select ${meets.length ? 'meeting' : 'hangout'}`,
                      { close },
                    ]}>
                      {/* {meets.map((item, i) => <div className='center-row gap'>
                        <a onClick={e => {
                          funcs[i]()
                          close()
                        }} style={S(`
                        text-transform: uppercase;
                        `)}>{item.users.filter(item_user => item_user !== user).join(' & ') || 'self'}</a>
                        {item.icon ? <img src={item.icon} style={S(`
                        height: 1.4em;
                        width: 1.4em;
                        `)} /> : null}
                      </div>)} */}
                      {/* {meets.map((item, i) => <InfoBadges labels={[
                        {
                          func: () => {
                            funcs[i]()
                            close()
                          },
                          text: <>
                            {item.users.filter(item_user => item_user !== user).join(' & ') || 'self'}
                            {item.icon ? <>
                              &nbsp;
                              <img src={item.icon} style={S(`
                              height: 1.4em;
                              width: 1.4em;
                              `)} />
                            </> : null}
                          </>,
                        },
                      ]} />)} */}
                      {meets.map((meet, i) => <GreeterMeet {...{
                        user, meet,
                        func: e => {
                          if (e.metaKey) {
                            open(hrefs[i], '_blank')
                            e.preventDefault()
                            e.stopPropagation()
                          } else {
                            funcs[i]()
                            close()
                          }
                        },
                      }} />)}
                      {hangouts.map((hangout, i) => <GreeterHangout {...{
                        user, hangout,
                        func: e => {
                          if (e.metaKey) {
                            open(hrefs[i + meets.length], '_blank')
                            e.preventDefault()
                            e.stopPropagation()
                          } else {
                            funcs[i + meets.length]()
                            close()
                          }
                        },
                      }} />)}
                    </InfoSection>
                  </InfoBody>
                </InfoStyles>, `
                width: fit-content;
                height: fit-content;
                background: var(--id-color);
                `)
              }
            },
            // ...(icon ? { img:icon, classes: hide_date ? '' : 'date-image' } : {}),
            ...(icon ? { img:icon, classes: `date-image ${hide_date?'':'date-keep-text'} ${single?'':'date-image-border'}` } : {}),
          })
        }))
        setCalendar(entries)
      } catch (e) {
        log(e)
        setCalendar([])
      }
    },
    load_summary: async (user, setSummary) => {
      try {
        const {list} = await api.get(`/greeter/meets/${user}`)
        setSummary({meets:list})
      } catch (e) {
        log(e)
        setSummary({meets:[]})
      }
    },
    load_hangout: async (id, setHangout) => {
      try {
        const {item} = await api.get(`/greeter/hangout/${id}`)
        log('loaded hangout', item)
        setHangout(item)
      } catch (e) {
        log(e)
        setHangout(undefined)
      }
    },
    set_hangout: async (data, setHangout) => {
      try {
        const {item} = await api.post(`/greeter/hangout`, data)
        setHangout(item)
      } catch (e) {
        log(e)
        setHangout()
      }
    },
    load_hangouts: async (user, setHangouts) => {
      try {
        const {list} = await api.get(`/greeter/hangouts/${user}`)
        // sort reverse chronologically
        list.sort((a, b) => b.t - a.t)
        setHangouts(list)
      } catch (e) {
        log(e)
        setHangouts([])
      }
    },
  }
  return handle
}

const is_app = 'greeter' === parseSubdomain()
export default () => {
  const [{user:viewer}] = auth.use()
  // just reload after login to avoid issue w/ profile load
  useSkip(useF, viewer, () => {
    location.reload()
  })

  const [[user, mode, mode_id], setPath] = usePathState({
    push: true,
    from: (path): [string, ''|'met'|'greet'|'calendar'|'about'|'quiz'|'summary'|'hangout'|'ai', string] => {
      const parts = path.split('/').filter(truthy)
      if (['about', 'ai'].includes(parts[0])) {
        return [undefined, parts[0], undefined]
      }
      if (parts[0] === 'hangout') {
        return [parts[1], 'hangout', parts[2]]
      }
      if (parts.length === 3) {
        return parts
      }
      if (parts.length === 2) {
        return parts.concat([undefined])
      }
      if (parts.length === 1) {
        return parts.concat(['', undefined])
      }
      return [undefined, '', undefined]
    },
    to: (parts: [string, string, string]) => {
      return path_parts_to_path(parts)
    },
  })
  const users = [user, mode_id].filter(truthy)
  const modes = {
    met: mode === 'met',
    greet: mode === 'greet',
    calendar: mode === 'calendar',
    about: mode === 'about' || (!viewer && (!mode_id || mode_id === viewer)),
    quiz: mode === 'quiz',
    summary: mode === 'summary',
    hangout: mode === 'hangout',
    ai: mode === 'ai',
  }

  const handle = create_handle({setPath})
  useF(viewer, handle.load)

  useF(mode, user, mode_id, log)

  // const theme_color = '#b03326'
  // const theme_color = '#3e9770'
  // const theme_color = '#2c1c21'
  // const theme_color = '#e9d6a2'
  const theme_color = '#7687fc'
  usePageSettings({
    // professional: true,
    // background: '#110000',
    // background: '#388eff',
    // background: '#fff',
    // background: '#272736',
    // background: '#192527',
    // background: '#191515',
    // background: '#b03326',
    background: theme_color, // viewer ? undefined : theme_color,
    title: (
      modes.met && users.length === 2 ? users.join(' & ') :
      modes.greet && users.length === 1 ? `greet u/${users[0]}` :
      modes.calendar ? `${users.join(' and ')}'s calendar` :
      modes.about ? 'about greeter' :
      modes.met ? `meet u/${users[0]||viewer}` :
      modes.quiz && users.length === 2 ? `${users.join(' & ')}'s quiz` :
      modes.summary ? `${users[0]}'s summary` :
      modes.hangout ? `hangout` :
      modes.ai ? 'greeter AI' :
      is_app ? location.host :
      '/greeter'
    ),
    icon: '/raw/greeter/icon.png',
  })
  // useE(viewer, getCssVar('var(--id-color)'), () => {
  //   if (!viewer) return
  //   const theme_color = Q('[name=theme-color')
  //   const theme_color_save = theme_color.content
  //   // theme_color.content = '#192527'
  //   theme_color.content = getCssVar('var(--id-color)')
  //   return () => theme_color.content = theme_color_save
  //   // const theme_color = node(`<meta name="theme-color" content="#110000" />`)
  //   // document.head.append(theme_color)
  //   // return () => theme_color.remove()
  // })
  useStyle(`
  .message {
    border: 1px solid #fff !important;
  }
  `)
  return <Style id='greeter' className={`greeter-${keys(modes).find(k => modes[k])}`}>
    <InfoBody>
      {
        modes.about ? <About {...{ handle }} /> :
        modes.ai ? <AI {...{ handle }} /> :
        modes.calendar ? <Calendar {...{ user:user||viewer, other:mode_id, handle }} /> :
        // mode === 'greet' ? <Greet {...{ user:friend, handle }} /> :
        modes.greet ? <User {...{ user, handle }} /> :
        modes.quiz && user && mode_id ? <Quiz {...{ user1:user, user2:mode_id, handle }} /> :
        modes.summary ? <Summary {...{ user:user||viewer, handle }} /> :
        modes.hangout ? <Hangout {...{ id:user, handle, join:mode_id }} /> :
        (modes.met && !mode_id) || (user && !mode_id) ? <User {...{ user, handle }} /> :
        user ? <Meet {...{ user1:user, user2:mode_id||viewer, handle }} /> : <>
        <User {...{ user:viewer, handle }} />
      {/* <InfoSection labels={['your profile']}>
        <div>
          <span style={S(`
          text-transform: uppercase;
          `)}>
            cyrus
          </span> <span>joined 12 months ago</span>
        </div>
      </InfoSection> */}
      {/* <InfoSection labels={[
        viewer,
        'your friends',
      ]}>
        {friends?.map(friend => 
        <div style={S(`
        text-transform: uppercase;
        `)}>
          <a onClick={e => setFriend(friend)}>{friend}</a>
        </div>)}
      </InfoSection> */}
      {/* <InfoSection labels={['your events']}>
        {list('circus movies concert zoo museum friendlys bowling').map(event =>
        <div style={S(`
        display: flex;
        flex-direction: column;
        min-width: 20em;
        border-radius: .25em;
        padding: .25em;
        border: 1px solid currentcolor;
        `)}>
          <span style={S(`
          text-transform: uppercase;
          `)}>{event}</span>
          <span>Lorem ipsum dolor sit amet, consectetur adipiscing elit</span>
        </div>)}
      </InfoSection> */}
      </>}
    </InfoBody>
  </Style>
}