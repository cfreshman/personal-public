import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBody, InfoButton, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { asInput, useF, useM, useR, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { S } from 'src/lib/util'
import { openPopup } from 'src/components/Modal'
import url from 'src/lib/url'
import { store } from 'src/lib/store'
import { useSocket } from 'src/lib/socket'

const { named_log, entries, datetime, QQ, Q, defer, rand, string, keys } = window as any
const NAME = 'rent-splitter'
const log = named_log(NAME)

const room_i_to_letter = (i) => string.upper[i]
const RENT_ADJUST = 20

const open_popup = (closer) => {
  openPopup(close => <Style id='rent-splitter'>
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

const Split = ({ viewer, id, joined, handle }) => {
  const join = joined[id]

  const [item, set_item] = useS(undefined)

  handle = {
    ...handle,
    load_item: async () => {
      log('loading item', id)
      let { item } = await api.get(`/rent-splitter/${id}`)
      if (!item.avg) {
        // calculate avg rent, rounded up to 10
        item.avg = Math.ceil(item.rent / item.roommates / 10) * 10
      }
      if (!item.rooms) {
          item.rooms = Array.from({ length:item.roommates }).map(() => item.avg)
      }
      item = {
          ...item,
          round: item.round || undefined,
          choices: item.choices || {},
      }
      set_item(item)
      log({ item })

      if (item.user === viewer && !join) {
        // auto-join
        const { item:joined_item } = await api.post('/rent-splitter/join', { code:item.code, name:viewer })
        handle.set_joined({
          ...joined,
          [item.id]: { label:item.name, token:item.token, name:viewer },
        })
        set_item(joined_item)
      }
    }
  }
  useF(id, () => {
    handle.load_item()
    // set_item({
    //   id: 'test',
    //   host: 'cyrus',
    //   t: Date.now(),
    //   name: 'best house ever',
    //   code: '4e45',
    //   token: 'asdblkads',
    //   rent: 3000,
    //   roommates: 3,
    //   rooms: [1000, 1000, 1000],
    //   round: 0,
    //   choices: { 'cyrus': [], 'bob': [], 'jack': [] },
    // })
  })
  useSocket({
    room: 'rent-splitter',
    on: {
      'rent-splitter:update': uid => {
        log('rent-splitter:update', uid)
        // alert(uid)
        if (id === uid) {
          handle.load_item()
        }
      }
    }
  })

  const [local_choice, set_local_choice] = useS(-1)
  const choice = useM(item, join, () => {
    if (!item || !join) return -1
    return item.choices[join.name][item.round] ?? -1
  })
  useF(local_choice, async () => {
    if (item && local_choice !== choice) {
      item.choices[join.name][item.round] = local_choice
      await api.post('/rent-splitter', { item, token:item.token })
    }
  })
  useF(item, () => {
    if (local_choice !== choice) {
      set_local_choice(choice)
    }
  })

  const lines = useM(item, () => {
    if (!item) return []
    const lines = []
    const delta = Math.ceil(item.avg / 3 / RENT_ADJUST) * RENT_ADJUST
    const start = item.avg - delta
    for (let i = start; i < item.avg + delta; i += RENT_ADJUST) {
      lines.push(i)
    }
    return lines.reverse()
  })
  useF(lines, () => {
    if (item) {
      Q(`#rs-line-${item.avg}`).scrollIntoView({ block: 'center' })
      Q('#inner-index')?.scrollIntoView({ block:'end' })
    }
  })

  const markers = useM(item, () => {
    if (!item) return {}

    const markers = {}
    const color_delta = 360 / item.roommates
    item.rooms.map((x, i) => {
      if (!markers[x]) markers[x] = []
      markers[x].push({
        x, i,
        // color: choice > -1 ? (choice === i ? `hsl(${color_delta * i} 100% 70%)` : `hsl(${color_delta * i} 20% 60%)`) : `hsl(${color_delta * i} 100% 80%)`,
        // color: `hsl(${color_delta * i} 100% 80%)`,
        color: choice > -1 && choice !== i ? `hsl(0 0% 60%)` : `hsl(${color_delta * i} 100% 80%)`,
        center: .1 + i * (.75 / (item.roommates - 1)),
        letter: string.upper[i],
      })
    })
    log({markers})
    return markers
  })

  const n_joined = useM(item, () => {
    if (!item) return 0
    return keys(item.choices).length
  })
  const waiting_for = useM(item, n_joined, () => {
    if (!item) return 1
    log('waiting for', item, n_joined)
    return item.roommates - n_joined
  })

  const is_host = item && viewer === item.user
  const is_started = item && item.round
  const is_entered = useM(is_started, item, join, () => {
    if (!is_started || !join) return false
    return item.choices[join.name][item.round] !== undefined
  })
  const chosen = local_choice > -1

  return <>
    <InfoSection labels={[
      NAME,
      { 'back to menu': () => url.push('/rent-splitter') },
    ]}>
      {!item ? 'loading...'
      : <div className='bordered-paragraph'>
        <div>
          <b>{item.name}</b>
        </div>
        <div style={S(`
        font-size: .8em;
        opacity: .67;
        `)}>
          <div>${item.rent} split {item.roommates} ways</div>
          <div>{item.user} {datetime.yyyymmdd(item.t)}</div>
        </div>
        {!join ? null
        : <>
          <HalfLine />
          <div>
            joined as <b>{join.name}</b>{is_host ? <> - you are the host</> : null}
          </div>
        </>}
        <HalfLine />
        <div>
          {item.complete ? <>
            <div><b>room & rent assignment complete!</b></div>
            {entries(item.choices).map(([name, list]) => {
              const choice = list[item.round]
              return <div>{name}: {room_i_to_letter(choice)} for ${item.rooms[choice]}</div>
            })}
            <div><span className='highlight'>screenshot and share with group</span></div>
          </>
          : item.round ? <>round {item.round}{is_entered?null:<> - {chosen ? <>you chose {room_i_to_letter(choice)}</> : <span className='highlight'>tap your room of choice</span>}</>}</>
          : <>
            {waiting_for ? <>waiting for {waiting_for} more player(s) - code <b>{item.code}</b></> 
            : <div>waiting for host to start session</div>}
            <HalfLine />
            <div>
              <span className='highlight'>agree on which rooms are which letters!</span>
            </div>
          </>}
        </div>
        {!is_host || is_started ? null
        : <>
          <HalfLine />
          <div className='row'>
            <InfoButton onClick={async () => {
              // start by incrementing round
              item.round = 1
              const { item:new_item } = await api.post('/rent-splitter', { item })
              set_item(new_item)
            }} disabled={waiting_for}>START SESSION</InfoButton>
          </div>
        </>}
      </div>}
    </InfoSection>
    <InfoSection labels={[
      'rooms',
    ]} style={S(`
    height: 0;
    flex-grow: 1;
    `)}>
      <div className='bordered-paragraph' style={S(`
      width: 100%;
      overflow: scroll;
      padding: 0 .25em;
      `)}>
        {lines.map(line => {
          const line_markers = markers && markers[line]
          return <div className='rs-line' id={`rs-line-${line}`} style={S(`
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end
          `)}>
            <span>${line}</span>
            {line_markers?.map(marker => {
              return <div onClick={() => {
                if (item.complete) return
                set_local_choice(choice === marker.i ? -1 : marker.i)
              }} style={S(`
              font-size: 2em;
              height: 1.25em;
              width: 1.25em;
              border-radius: 50%;
              position: absolute;
              left: calc(${marker.center * 100}% - .625em);
              background: ${marker.color};
              color: #000;
              border: 1px solid #000;
              display: flex; align-items: center; justify-content: center;
              font-family: roboto-mono, monospace;
              box-shadow: 0 .125em 0 0 #000;
              ${item.complete ? '' : 'cursor: pointer;'}
              user-select: none;
              ${choice === marker.i ? `
              translate: 0 -.125em;
              box-shadow: 0 .25em 0 0 #000;
              ` : ''}
              `)}>{marker.letter}</div>
            })}
          </div>
        })}
      </div>
    </InfoSection>
  </>
}

const Base = ({ viewer, profile, joined, handle }) => {
  const splits_list = useM(profile, () => {
    if (!profile) return undefined
    return entries(profile.splits).map(([id, name]) => ({ id, name }))
  })
  useF(splits_list, () => log('splits', splits_list))

  handle = {
    ...handle,
    new: () => {
      // handle.set_id('test')
      const SplitNew = ({ close }) => {
        const [name, set_name, fill_name] = asInput(useS(''))
        const ref_name = useR()
        useF(() => ref_name.current.focus())

        const [rent, set_rent, fill_rent] = asInput(useS(''))
        const [roommates, set_roommates, fill_roommates] = asInput(useS(''))
        const code = useM(() => rand.unambiguous(4))

        const ready = useM(name, rent, roommates, () => {
          return Boolean(name && rent && roommates)
        })

        const create_split = () => {
          const SplitLoad = ({ close }) => {
            useF(async () => {
              // create room
              await api.post('/rent-splitter', { item:{user:viewer, name, rent, roommates, code} })
              // join it
              const { item } = await api.post('/rent-splitter/join', { code, name:viewer })
              log('joined', item)
              handle.set_joined({
                ...joined,
                [item.id]: { label:item.name, token:item.token, name:viewer },
              })
              // handle.set_id(item.id)
              url.push(`/rent-splitter/${item.id}`)
              await handle.load_profile()
              close()
            })
            return <>
              <InfoSection>
                loading...
              </InfoSection>
            </>
          }
          close()
          defer(() => open_popup(close => <SplitLoad close={close} />))
        }

        return <>
          <InfoSection>
            <input ref={ref_name} {...fill_name} placeholder='name for group' style={S(`
            min-width: 16em;
            `)} />
            <input type='number' {...fill_rent} placeholder='total rent' style={S(`
            min-width: 16em;
            `)} />
            <input type='number' {...fill_roommates} placeholder='# of roommates' style={S(`
            min-width: 16em;
            `)} />
            <HalfLine />
            {/* <div style={S(`
            font-size: .8em;
            opacity: .67;
            white-space: pre-line;
            `)}>{`plan to complete /rent-splitter in one sitting.\neach player needs a device to join\nand can't switch devices after joining.`}</div> */}
            <ul style={S(`
            font-size: .8em;
            opacity: .67;
            white-space: pre-line;
            width: min-content;
            min-width: 100%;
            margin: 0;
            padding-left: 1em;
            `)}>
              <li>plan to complete /rent-splitter in one sitting</li>
              <li>each player needs a device and can't switch after joining</li>
            </ul>
            <HalfLine />
            <div className='row wide'>
              <InfoButton onClick={close}>CANCEL</InfoButton>
              <div className='spacer' />
              <InfoButton onClick={create_split} disabled={!ready}>CREATE</InfoButton>
            </div>
          </InfoSection>
        </>
      }
      open_popup(close => <SplitNew close={close} />)
    },
    join: () => {
      const SplitJoin = ({ close }) => {
        const [name, set_name, fill_name] = asInput(useS(''))
        const ref_name = useR()
        useF(() => ref_name.current.focus())

        const [code, set_code, fill_code] = asInput(useS(''))

        const ready = useM(name, code, () => {
          return Boolean(name && code)
        })

        const create_split = () => {
          const SplitLoad = ({ close }) => {
            useF(async () => {
              const { item } = await api.post('/rent-splitter/join', { code, name })
              log('joined', item)
              handle.set_joined({
                ...joined,
                [item.id]: { label:item.name, token:item.token, name },
              })
              // handle.set_id(item.id)
              url.push(`/rent-splitter/${item.id}`)
              close()
            })
            return <>
              <InfoSection>
                loading...
              </InfoSection>
            </>
          }
          close()
          defer(() => open_popup(close => <SplitLoad close={close} />))
        }

        return <>
          <InfoSection>
            <input ref={ref_name} {...fill_name} placeholder='your name (unique)' style={S(`
            min-width: 16em;
            `)} />
            <input {...fill_code} placeholder='code' className='code-input' />
            <HalfLine />
            {/* <div style={S(`
            font-size: .8em;
            opacity: .67;
            white-space: pre-line;
            `)}>{`plan to complete /rent-splitter in one sitting.\neach player needs a device to join\nand can't switch devices after joining.`}</div> */}
            <ul style={S(`
            font-size: .8em;
            opacity: .67;
            white-space: pre-line;
            width: min-content;
            min-width: 100%;
            margin: 0;
            padding-left: 1em;
            `)}>
              <li>plan to complete /rent-splitter in one sitting</li>
              <li>don't switch to a different device</li>
            </ul>
            <HalfLine />
            <div className='row wide'>
              <InfoButton onClick={close}>BACK</InfoButton>
              <div className='spacer' />
              <InfoButton onClick={create_split} disabled={!name}>JOIN</InfoButton>
            </div>
          </InfoSection>
        </>
      }
      open_popup(close => <SplitJoin close={close} />)
    },
  }

  const [del, set_del] = useS(false)

  return <>
    <InfoSection labels={[NAME]}>
      <div className='bordered-paragraph'>
        <div>
          renting with roommates and need to assign rooms? use this!
        </div>
        <HalfLine />
        <div>
          rooms will rent based on how desired they are, so everyone is happy - you get a nicer room or cheaper rent
        </div>
        <HalfLine />
        <div>
          {/* join active split:
          <input className='code-input' placeholder={'code'} maxLength={4} /> */}
          <div className='row gap wrap'>
            <InfoButton onClick={handle.join}>JOIN ACTIVE SPLIT</InfoButton>
            {viewer ? <InfoButton onClick={handle.new}>CREATE NEW SPLIT</InfoButton>
            : <InfoButton onClick={handle.new} disabled>LOG IN TO CREATE NEW SPLIT</InfoButton>}
          </div>
        </div>
        <HalfLine />
        <div>
          or <A href='/rent-splitter-manual'>view pen & paper instructions</A>
        </div>
      </div>
    </InfoSection>
    <InfoSection labels={[
      'splits',
      viewer && { 'new': handle.new },
      viewer && (del ? { 'view': () => set_del(false) } : { 'delete': () => set_del(true) }),
    ]}>
      {!viewer ? `log in to view splits you've created`
      : !splits_list ? 'loading...'
      : !splits_list.length ? '(empty)'
      : splits_list.map(x => <InfoButton onClick={async () => {
        if (del) {
          await api.delete(`/rent-splitter/${x.id}`)
          handle.load_profile()
        } else url.push(`/rent-splitter/${x.id}`)
      }}>{x.name}</InfoButton>)}
    </InfoSection>
  </>
}

export default () => {

  const [{user:viewer}] = auth.use()
  const [profile, set_profile] = useS(undefined)

  const [joined, set_joined] = store.use(`rent-splitter-joined`, { default: {} as {
    [key:string]: { label:string, token:string, name:string }
  } })
  const [id, set_id] = usePathState()

  const handle = {
    set_id, set_joined,
    load_profile: async () => {
      const { profile } = await api.get('/rent-splitter/profile')
      set_profile(profile)
    },
  }

  useF(viewer, handle.load_profile)

  usePageSettings({
    expand: true,
  })
  return <Style id='rent-splitter'>
    <InfoBody>
      {id ? <Split {...{ viewer, id, joined, handle }} />
      : <Base {...{ viewer, profile, joined, handle }} />}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`&#rent-splitter#rent-splitter#rent-splitter {
  .body, .section {
    display: flex;
    flex-direction: column;
  }
  .bordered-paragraph {
    width: 100%;
    padding: .25em;
    border-radius: .25em;
    border: 1px solid currentcolor;
  }

  .code-input {
    font-size: 2em !important;
    width: 4em !important;
    display: block;
    text-transform: uppercase;
  }
  .highlight {
    background: yellow;
  }

  .rs-line {
    border-bottom: 1px solid #000;
  }
    
  button {
    font-size: 1.5em !important;
  }
}`