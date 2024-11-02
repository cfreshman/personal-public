import React from 'react'
import styled from 'styled-components'
import { A, ColorPicker, HalfLine, InfoBadges, InfoBody, InfoButton, InfoLoginBlock, InfoSection, InfoSelect, InfoStyles, Select } from '../../components/Info'
import { useCachedScript, usePageSettings } from 'src/lib/hooks_ext'
import { S } from 'src/lib/util'
import api, { auth } from 'src/lib/api'
import { useE, useEventListener, useF, useM, useR, useRerender, useS, useSkip, useStyle, useStyleE, useTimed, useTimeout } from 'src/lib/hooks'
import { WebsiteTitle } from 'src/components/website_title'
import GreeterLink from './GreeterLink'
import { store } from 'src/lib/store'
import GreeterUnauthorized from './GreeterUnauthorized'
import GreeterHangout from './GreeterHangout'
import { APP_COOKIE, hangout } from './util'
import GreeterMeet from './GreeterMeet'
import url from 'src/lib/url'
import { useQr } from 'src/components/qr'
import { IconCreate, LinkSection, MODALS, NoteInput, PrintCertificateSection, upload_icon_fill } from './common_components'
import { openLogin } from 'src/lib/auth'
import { convertLinks } from 'src/lib/render'
import { Modal } from 'src/components/Modal'
import { Style } from './style'


const { named_log, list, strings, datetime, truthy, Q, QQ, node, entries, lists, merge, values, keys, qr, copy, defer, colors } = window as any
const log = named_log('greeter hangout')

let prefill
export const Hangout = ({ id, handle, join=undefined }) => {

  const [{user:viewer}] = auth.use()
  const invited = join && !viewer

  const [_hangout, setHangout] = useS<hangout>(undefined)
  const hangout: hangout = useM(_hangout, () => ({
    // t: Date.now(),
    users: [viewer],
    t: undefined,
    title: '',
    location: '',
    public: {
      [viewer]: '',
    },
    links: [],
    ...(_hangout || {})
  }))
  const member = useM(hangout, () => viewer && hangout.users.includes(viewer))
  useF(hangout, () => log({hangout}))
  const loaded = useR(false)
  useF(viewer, id, () => handle.load_hangout(id, value => {
    if ((!id || (value?.users.includes(viewer) && !value.t)) && !loaded.current) {
      setEdit(true)
      // log('prefill', store.get(APP_COOKIE.HANGOUT_PREFILL), merge(value||{}, store.get(APP_COOKIE.HANGOUT_PREFILL)))
      prefill = store.get(APP_COOKIE.HANGOUT_PREFILL)
      if (prefill) {
        keys(prefill.public).map(k => value.public[k] = prefill.public[k])
        const public_save = value.public
        keys(prefill).map(k => value[k] = prefill[k])
        value.public = public_save
      }
      setHangout(prefill)
      store.clear(APP_COOKIE.HANGOUT_PREFILL)
    } else {
      log('set hangout', value)
      if (!_hangout && !value.users.includes(viewer)) {
        // set_side_hangouts_user(value.users[0])
      }
      setHangout(value)
    }
    loaded.current = true
  }))
  useF(hangout, () => {
    if (hangout.id && !location.pathname.includes(hangout.id)) {
      handle.setPath([hangout.id, 'hangout', join])
    }
  })

  const [side_hangouts, set_side_hangouts] = useS(undefined)
  const [side_hangouts_user, set_side_hangouts_user] = useS(viewer)
  useF(viewer, () => set_side_hangouts_user(viewer))
  useF(viewer, id, async () => {
    set_side_hangouts(undefined)
    if (viewer && id) {
      try {
        set_side_hangouts(await api.get(`/greeter/hangout/${id}/side/${side_hangouts_user}`))
      } catch {
        set_side_hangouts({ unauthorized:true })
      }
    }
  })
  useSkip(useF, _hangout, side_hangouts_user, async () => {
    set_side_hangouts(side_hangouts && { loading:true })
    if (_hangout) {
      try {
        set_side_hangouts(await api.get(`/greeter/hangout/${id}/side/${side_hangouts_user}`))
      } catch {
        set_side_hangouts({ unauthorized:true })
      }
    }
  })
  useF(side_hangouts, () => log({side_hangouts}))
  const [side_hangout_invite_copied, set_side_hangout_invite_copied] = useTimed(3_000, false)

  const others = useM(hangout, () => hangout.users.filter(x => x !== viewer))
  const [meet, setMeet] = useS(undefined)
  useF(viewer, others, member, () => {
    if (member && others.length === 1) handle.load_meet(viewer, others[0], setMeet)
    else setMeet(undefined)
  })
  const [new_others, set_new_others] = useS(undefined)
  useF(others, async () => {
    if (!member) set_new_others(undefined)
    
    const new_new_others = []
    await Promise.all(others.map(async (other) => {
      const { item } = await api.get(`/greeter/${viewer}/met/${other}`)
      if (!item?.t) {
        new_new_others.push(other)
      }
    }))
    set_new_others(new_new_others)
    log({new_new_others})
  })

  const [viewer_profile, setViewerProfile] = useS(undefined)
  useF(viewer, () => handle.load_profile(viewer, setViewerProfile))
  const authorized = useM(join, viewer_profile, hangout, () => join || (viewer_profile 
  ? member || hangout.users.some(user => viewer_profile.followers.includes(user))
  : viewer))

  const [edit, setEdit] = useS(false)
  const rerender = useRerender()
  const [edit_data, set_edit_data] = useS<any>({})
  useF(hangout, edit, () => {
    if (hangout) {
      // const new_edit_data = hangout.id ? {
      //   id: hangout.id,
      //   t: hangout.t ? Number(new Date(datetime.yyyymmdd(hangout.t + datetime.duration({ h:11 })) + ' 12:00:00')) : Number(new Date(datetime.yyyymmdd() + ' 12:00:00')),
      //   public: {
      //     [viewer]: hangout.public[viewer],
      //   },
      //   links: hangout.links,
      // } : strings.json.clone(hangout)
      const new_edit_data = {
        id: hangout.id,
        t: hangout.t ? Number(new Date(datetime.yyyymmdd(hangout.t + datetime.duration({ h:11 })) + ' 12:00:00')) : Number(new Date(datetime.yyyymmdd() + ' 12:00:00')),
        public: {
          [viewer]: hangout.public[viewer],
        },
        links: hangout.links,
        ...(prefill||{}),
      }
      prefill = undefined
      set_edit_data(new_edit_data)
    }
  })
  // const edit_data_view = useM(hangout, edit_data, () => strings.json.clone(merge(hangout, edit_data)))
  const edit_data_view = useM(hangout, edit_data, () => {
    const hangout_clone = strings.json.clone(hangout)
    const edit_data_clone = strings.json.clone(edit_data)
    const merged = {
      ...hangout_clone,
      ...edit_data_clone,
    }
    merged.public = {
      ...hangout_clone.public,
      ...(edit_data_clone.public||{}),
    }
    return merged
  })

  const edit_users = useM(viewer_profile, edit_data, () => {
    if (!viewer_profile) return []

    const viewer_profile_follow_set = new Set(viewer_profile.follows)
    const last_follow_attendee = edit_data_view.users.slice().reverse().find(user => viewer_profile_follow_set.has(user))
    const last_follow_attendee_index = viewer_profile.follows.indexOf(last_follow_attendee)
    const unfiltered_edit_users = last_follow_attendee_index < viewer_profile.follows.length - 1 ? [
      ...viewer_profile.follows.slice(last_follow_attendee_index + 1),
      ...viewer_profile.follows.slice(0, last_follow_attendee_index + 1),
    ] : viewer_profile.follows
    const edit_users = unfiltered_edit_users.filter(x => !edit_data_view.users.includes(x))
    // log({last_follow_attendee,last_follow_attendee_index,viewer_profile_follow_set,unfiltered_edit_users,edit_users}, viewer_profile.follows.slice(last_follow_attendee_index + 1))
    return edit_users
  })
  const [manual_attendee, set_manual_attendee] = useS('')
  const [manual_attendee_error, set_manual_attendee_error] = useS('')
  useTimeout(manual_attendee_error, () => manual_attendee_error && set_manual_attendee_error(''), 3_000)
  useF(manual_attendee, () => set_manual_attendee_error(''))

  handle = {
    ...handle,
    save_hangout: async () => {
      await handle.set_hangout(edit_data, setHangout)
      setEdit(false)
    },
    add_manual_attendee: async () => {
      const { profile } = await api.get(`/profile/${manual_attendee}`)
      log('add manual attendee', {profile})
      if (profile) {
        set_edit_data({
          edit_data,
          users: edit_data_view.users.concat([manual_attendee]),
        })
        set_manual_attendee('')
        rerender()
      } else {
        set_manual_attendee_error('no such user')
      }
    },
  }

  useEventListener(window, 'keydown', e => {
    if (edit && e.metaKey && e.key === 's') {
      e.preventDefault()
      handle.save_hangout()
    }
  })

  const is_today_or_yesterday = useM(() => datetime.yyyymmdd(hangout.t) === datetime.yyyymmdd() || datetime.yyyymmdd(hangout.t + datetime.duration({ d:1 })) === datetime.yyyymmdd())
  const join_href = useM(hangout, member, edit, () => member && !edit && hangout.code && (is_today_or_yesterday || viewer === 'cyrus') && `${location.origin}/greeter/hangout/${hangout.id}/${hangout.code}`)
  const [join_qr, join_qr_copy, join_qr_expand] = useQr({ href:join_href, size:128+64 })

  useF(viewer, hangout, member, join, async () => {
    log('join?', hangout.id, viewer, !member, join)
    if (hangout.id && viewer && !member && join) {
      const modify_hangout = {
        id: hangout.id,
        users: hangout.users.concat([viewer]),
        code: join,
      }
      log({modify_hangout})
      await handle.set_hangout(modify_hangout, setHangout)
    }
  })

  // useStyleE(hangout.icon, auth.expand, hangout.icon ? `
  // ${auth.expand ? '#main' : '#inner-index'} {
  //   background: url(${hangout.icon}) !important;
  //   background-size: cover !important;
  //   background-position: center !important;
  //   image-rendering: pixelated !important;
  // }
  // #inner-index .info {
  //   background: transparent !important;
  // }
  // ` : '')

  const [confirm_del, set_confirm_del] = useTimed(3_000)

  /* TODO fix duplicate user bug better */
  const viewer_edit_user_i = useM(edit_data_view, () => edit_data_view?.users?.findIndex(user => user === viewer))

  const [modal, set_modal] = useS(undefined)
  const close_modal = () => set_modal(undefined)

  return <>
    {modal ? <Modal outerClose={close_modal}><Style 
    style={S(`height:max-content;width:max-content;min-height:400px;min-width:300px;border:1px solid currentcolor;box-shadow:0 2px currentcolor`)}
    ><InfoBody>
      {modal === MODALS.ICON_CREATE ? <IconCreate {...{ close:close_modal, set_icon:icon => set_edit_data({ ...edit_data, icon }) }} />
      : null}
    </InfoBody></Style></Modal> : null}
    <InfoSection labels={[
      // hangout?.users.join(' & ') || 'loading hangout',
      'hangout',
      // { back: () => handle.setPath([undefined, '', undefined]) },
      member && !edit && { edit: () => setEdit(true) },
      viewer && !edit && { new: (e) => {
        store.set(APP_COOKIE.HANGOUT_PREFILL, { users:hangout.users })
        // handle.setPath([undefined, 'hangout', undefined], e)
        location.href = '/greeter/hangout'
      }},
      viewer && !edit && viewer === 'cyrus' && (confirm_del ? { confirm: (e) => {
        api.post('/greeter/hangout', {
          id: hangout.id,
          delete: true,
        }).then(result => {
          log('del result', result)
          url.to(false, '/greeter')
        })
      }} : { del: () => set_confirm_del(true) }),
      edit && { save: handle.save_hangout },
      edit && { cancel: () => {
        if (id) {
          setEdit(false)
        } else {
          history.back()
        }
      } },
      !edit && viewer && 'view:',
      !edit && meet && { 'meet': e => handle.setPath([viewer, 'met', others[0]]) },
      !edit && member && { 'calendar': e => {
        const last_calendar_click = `.date-${datetime.yyyymmdd(hangout.t)}`
        store.set('greeter-last-calendar-click', last_calendar_click)
        handle.setPath([viewer, 'calendar'], e)
      } },
      ...((viewer && hangout?.users.map(user => (user && !edit && { [user]: e => handle.setPath([user, 'met'], e) }))) || []),

      invited && { 'log in to join hangout': () => openLogin() }
    ]}>
      {!viewer && !join
      ? <InfoLoginBlock inline to={join ? 'join hangout' : 'view hangout'} />
      : !authorized
      ? <GreeterUnauthorized {...{ viewer, users:hangout?.users}} />
      : !loaded.current
      ? <div>loading hangout</div>
      : !edit
      ? 
        <>
          {hangout.t ? <div className='card'>
            {/* <div>
              met 3 years ago
            </div>
            <div>
              at Arby's
            </div> */}
            <div>{hangout.title || `hangout with ${hangout.users.join(' & ')}`}</div>
            <div className='row gap'>
              {hangout.icon ? <img src={hangout.icon} style={S(`width:128px`)} /> : null}
              <div>
                <div>
                  hung out {datetime.yyyymmdd(hangout.t + datetime.duration({ h:1 }))}
                </div>
                <div>
                  at {hangout.location || 'unknown location'}
                </div>
              </div>
            </div>
            <HalfLine />
            {entries(hangout.public).filter(e => e[1]).map(([user, comment]) => <>
              <div>
                {user === viewer ? <>your note</> :
                <>{user}'s note</>}
              </div>
              <div className='card-inner'>
                {(typeof(comment) === 'string' && convertLinks(comment, { new_tab:true })) || `no notes by ${user}`}
              </div>
            </>)}
            {invited ? <>
              <HalfLine />
              <a onClick={() => openLogin()}>log in</a> to add your own note
            </> : null}
          </div> : <div className='card'>
            {loaded.current ? 'no recorded hangout' : 'loading hangout'}
          </div>}
        </>
      :
      <>
        <div>attendees:</div>
        <InfoBadges labels={[
          'once saved, new users can scan QR to join',
        ]} />
        <div className='column gap'>
          {edit_data_view.users.map((user, i) => <InfoBadges labels={[
            user,
            i !== viewer_edit_user_i && { remove: () => {
              lists.remove(edit_data_view.users, user)
              set_edit_data({
                ...edit_data,
                users: edit_data_view.users,
              })
            } },
          ]} />)}
          {/* {edit_users.length ? <InfoBadges labels={[
            {
              text: <Select 
              options={edit_users}
              value={'add attendee from friends list'}
              setter={value => {
                edit_data.current.users.push(value)
                rerender()
              }} />,
            },
            // { add: () => {
            //   if (edit_new_user) {
            //     edit_data.current.users.push(edit_new_user)
            //     rerender()
            //   }
            // } },
          ]} /> : null} */}
          <InfoSelect 
          options={edit_users}
          value={'add attendee from follow list'}
          setter={user => {
            set_edit_data({
              ...edit_data,
              users: edit_data_view.users.concat([user])
            })
            rerender()
          }} />
          <InfoBadges labels={[
            {
              text: <input placeholder={'add attendee by username'} value={manual_attendee} onChange={e => {
                set_manual_attendee(e.target.value)
              }} onKeyDown={e => {
                if (e.key === 'Enter') {
                  handle.add_manual_attendee()
                }
              }} style={S(`
              min-width: 20em;
              `)} autoCapitalize='off' />,
            },
            manual_attendee && { [manual_attendee_error || 'add']: () => handle.add_manual_attendee() },
          ]} style={S(`
          align-items: stretch;
          `)}/>
        </div>
        <div>describe this hangout:</div>
        <input type='date' value={datetime.input(edit_data_view.t)} onChange={e => {
          set_edit_data({
            ...edit_data,
            t: Number(new Date(datetime.yyyymmdd(Number(new Date(e.target.value)) + datetime.duration({ h:12 })) + ' 12:00:00')),
          })
        }}></input>
        <input type='text' placeholder='title' autoCapitalize='off' value={edit_data_view.title} onChange={e => {
          set_edit_data({
            ...edit_data,
            title: e.target.value,
          })
        }}></input>
        <div className='row gap' style={S(`margin-bottom:2px`)}>
          {edit_data_view.icon ? <img src={edit_data_view.icon} width={64} /> : null}
          <div>
            <InfoBadges labels={[
              ...upload_icon_fill({ edit_data_view, set_edit_data, set_modal }),
            ]} />
          </div>
        </div>
        <input type='text' placeholder='location' autoCapitalize='off' value={edit_data_view.location} onChange={e => {
          set_edit_data({
            ...edit_data,
            location: e.target.value,
          })
        }}></input>
        <NoteInput value={edit_data_view.public[viewer]||''} setter={value => {
          set_edit_data(merge(edit_data, {
            public: {
              [viewer]: value,
            },
          }))
        }} />
        
        <HalfLine />
        <div>add any relevant links:</div>
        {edit_data_view.links?.map((link, i) => <input className='greeter-greet-links-input' type='text' value={link} onChange={e => {
          let {links=[]} = edit_data_view
          links[i] = e.target.value
          links = edit_data_view.links.filter(truthy)
          set_edit_data({
            ...edit_data,
            links,
          })
        }} />)}
        <input type='text' placeholder={'enter link'} onChange={e => {
          let {links=[]} = edit_data_view
          links.push(e.target.value)
          e.target.value = ''
          set_edit_data({
            ...edit_data,
            links,
          })
          setTimeout(() => {
            QQ('.greeter-greet-links-input').at(-1).focus()
          })
        }}></input>

        <HalfLine />
        <div>this hangout will be visible to anyone you follow</div>
      </>}
    </InfoSection>
    <LinkSection {...{ authorized, edit, links:hangout.links }} />
    {viewer && authorized && !edit && side_hangouts ? <>
      <br />
      <InfoSection labels={[
        // `previous &${side_hangouts.equal_hangouts.length ? ' same day &' : ''} next hangouts`,
        {
          text: <>
            {`previous &${side_hangouts.equal_hangouts?.length ? ' same day &' : ''} next hangouts`}&nbsp;for&nbsp;<Select value={side_hangouts_user} setter={set_side_hangouts_user} options={lists.unique([viewer, ...hangout.users])} display={(x:string) => x === viewer ? 'you' : x} />
          </>
        }
      ]}>
        {side_hangouts.unauthorized ? <div className='row gap'>
          <InfoBadges labels={[
            `${side_hangouts_user} doesn't follow you`,
            side_hangout_invite_copied ? 'copied!' : { 'send them your greeter': () => {
              copy(location.origin + `/greeter/${viewer}/greet`)
              set_side_hangout_invite_copied(true)
            } }
          ]} />
        </div> : side_hangouts.loading ? null : <div className='row gap wrap stretch'>{[side_hangouts.previous_hangout, ...side_hangouts.equal_hangouts, side_hangouts.next_hangout].map((hangout, i) => {
          return (hangout
            ? <GreeterHangout {...{ user:viewer, hangout }} />
            : <InfoBadges labels={[`no ${!i ? 'previous' : 'next'} hangout`]} />)
        })}</div>}
      </InfoSection>
    </> : null}
    {authorized && !edit && viewer && new_others?.length ? <>
      <br />
      <InfoSection labels={[
        `new meets`
      ]}>
        <div className='row gap wrap stretch'>{new_others.map((other, i) => {
          return <GreeterMeet {...{
            user:viewer,
            meet:{users:[viewer,other]},
            func: () => {
              store.set(APP_COOKIE.HANGOUT_PREFILL, {
                t: hangout.t,
                location: hangout.location,
                icon: hangout.icon,
                links: [location.href],
              })
              handle.set_path([viewer, 'met', other])
            }
          }} />
        })}</div>
      </InfoSection>
    </> : null}
    <PrintCertificateSection {...{ edit, member, hangout }} />
    {join_href ? <>
      <br />
      <InfoSection labels={[
        'scan QR to join',
        join_qr_copy,
        join_qr_expand,
      ]}>
        {join_qr}
      </InfoSection>
    </> : null}
  </>
}
