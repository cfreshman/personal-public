import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBadges, InfoBody, InfoButton, InfoLoginBlock, InfoSection, InfoSelect, InfoStyles, Select } from '../../components/Info'
import { useCachedScript, usePageSettings } from 'src/lib/hooks_ext'
import { S } from 'src/lib/util'
import api, { auth } from 'src/lib/api'
import { useEventListener, useF, useM, useR, useRerender, useS, useSkip, useStyle, useStyleE, useTimed, useTimeout } from 'src/lib/hooks'
import { WebsiteTitle } from 'src/components/website_title'
import GreeterLink from './GreeterLink'
import { store } from 'src/lib/store'
import GreeterUnauthorized from './GreeterUnauthorized'
import GreeterHangout from './GreeterHangout'
import { APP_COOKIE, meet } from './util'
import GreeterMeet from './GreeterMeet'
import url from 'src/lib/url'
import { useQr } from 'src/components/qr'
import { LinkSection, NoteInput, PrintCertificateSection, upload_icon_fill } from './common_components'
import { convertLinks } from 'src/lib/render'


const { named_log, list, strings, datetime, truthy, Q, QQ, node, entries, lists, merge, values, keys, qr, copy, defer } = window as any
const log = named_log('greeter meet')

export const Meet = ({ user1, user2, handle }) => {

  const [{user:viewer}] = auth.use()
  const member = viewer === user1 || viewer === user2
  const other_if_member = member ? viewer === user1 ? user2 : user1 : false
  const [_meet, setMeet] = useS<meet>(undefined)
  const meet: meet = useM(_meet, () => ({
    users: [user1, user2],
    t: undefined,
    location: '',
    public: {
      [user1]: '',
      [user2]: '',
    },
    private: {
      [user1]: '',
      [user2]: '',
    },
    group: {
      [user1]: '',
      [user2]: '',
    },
    links: [],
    ...(_meet || {})
  }))
  useF(meet, () => log({meet}))
  const loaded = useR(false)
  useF(user1, user2, () => handle.load_meet(user1, user2, value => {
    setMeet(value)
    // if member & first load & meet hasn't been defined, prefill if applicable & set to edit mode
    if (member && !loaded.current && !value.t) {
      setEdit(true)
      const prefill = store.get(APP_COOKIE.HANGOUT_PREFILL)
      const new_meet = merge(_meet, prefill)
      log('prefill', prefill, new_meet)
      setMeet(new_meet)
      store.clear(APP_COOKIE.HANGOUT_PREFILL)
    }
    loaded.current = true
  }))

  // TODO figure out side meets (this code is from hangout.jsx)
  // const [side_hangouts, set_side_hangouts] = useS(undefined)
  // const [side_hangouts_user, set_side_hangouts_user] = useS(viewer)
  // useF(viewer, () => set_side_hangouts_user(viewer))
  // useF(viewer, id, async () => {
  //   set_side_hangouts(undefined)
  //   if (viewer && id) {
  //     try {
  //       set_side_hangouts(await api.get(`/greeter/hangout/${id}/side/${side_hangouts_user}`))
  //     } catch {
  //       set_side_hangouts({ unauthorized:true })
  //     }
  //   }
  // })
  // useSkip(useF, _hangout, side_hangouts_user, async () => {
  //   set_side_hangouts(side_hangouts && { loading:true })
  //   if (_hangout) {
  //     try {
  //       set_side_hangouts(await api.get(`/greeter/hangout/${id}/side/${side_hangouts_user}`))
  //     } catch {
  //       set_side_hangouts({ unauthorized:true })
  //     }
  //   }
  // })
  // useF(side_hangouts, () => log({side_hangouts}))
  // const [side_hangout_invite_copied, set_side_hangout_invite_copied] = useTimed(3_000, false)

  const [viewer_profile, setViewerProfile] = useS(undefined)
  useF(viewer, () => handle.load_profile(viewer, setViewerProfile))
  const authorized = useM(viewer_profile, user1, user2, () => viewer_profile 
  ? member || viewer_profile.followers.some(follower => follower === user1 || follower === user2)
  : viewer)
  const following = useM(other_if_member, viewer_profile, () => viewer_profile?.follows?.includes(other_if_member))
  useF(viewer_profile, following, other_if_member, () => log({viewer_profile, following, other_if_member}))

  const [edit, setEdit] = useS(false)
  const rerender = useRerender()
  const [edit_data, set_edit_data] = useS<any>({})
  useF(meet, edit, () => {
    if (meet) {
      const new_edit_data = {
        id: meet.id,
        users: meet.users,
        t: meet.t ? Number(new Date(datetime.yyyymmdd(meet.t + datetime.duration({ h:11 })) + ' 12:00:00')) : Number(new Date(datetime.yyyymmdd() + ' 12:00:00')),
        public: {
          [viewer]: meet.public[viewer],
        },
        private: {
          [viewer]: meet.private[viewer],
        },
        group: {
          [viewer]: meet.group[viewer],
        },
        links: meet.links,
      }
      set_edit_data(new_edit_data)
    }
  })
  // const edit_data_view = useM(hangout, edit_data, () => strings.json.clone(merge(hangout, edit_data)))
  const edit_data_view = useM(meet, edit_data, () => {
    const meet_clone = strings.json.clone(meet)
    const edit_data_clone = strings.json.clone(edit_data)
    const merged = {
      ...meet_clone,
      ...edit_data_clone,
    }
    merged.public = {
      ...meet_clone.public,
      ...(edit_data_clone.public||{}),
    }
    merged.private = {
      ...meet_clone.private,
      ...(edit_data_clone.private||{}),
    }
    merged.group = {
      ...meet_clone.group,
      ...(edit_data_clone.group||{}),
    }
    return merged
  })

  handle = {
    ...handle,
    save_meet: async () => {
      await handle.set_meet(edit_data, setMeet)
      setEdit(false)
    }
  }

  useEventListener(window, 'keydown', e => {
    if (edit && e.metaKey && e.key === 's') {
      e.preventDefault()
      handle.save_meet()
    }
  })

  // useStyleE(meet.icon, auth.expand, meet.icon ? `
  // ${auth.expand ? '#main' : '#inner-index'} {
  //   background: url(${meet.icon}) !important;
  //   background-size: cover !important;
  //   background-position: center !important;
  //   image-rendering: pixelated !important;
  // }
  // #inner-index .info {
  //   background: transparent !important;
  // }
  // ` : '')

  return <>
    <InfoSection labels={[
      `${user1} & ${user2}`,
      member && !edit && { edit: () => setEdit(true) },
      edit && { save: handle.save_meet },
      edit && { cancel: () => {
        setEdit(false)
      } },
      viewer && other_if_member && !following && { [`follow ${other_if_member}`]: () => {
        // api.post(`/profile/${user}/follow`, {}).then(() => handle.load_profile(viewer, setViewerProfile))
        api.post(`/profile/${other_if_member}/follow`, {}).then(() => location.reload())
      } },
      'view:',
      !edit && { 'quiz': e => handle.setPath([user1, 'quiz', user2], e) },
      !edit && member && { 'calendar': e => {
        const last_calendar_click = `.date-${datetime.yyyymmdd(meet.t)}`
        store.set('greeter-last-calendar-click', last_calendar_click)
        handle.setPath([viewer, 'calendar'], e)
      } },
      { [`${user1}`]: e => handle.setPath([user1, 'met', undefined], e) },
      { [`${user2}`]: e => handle.setPath([user2, 'met', undefined], e) },
    ]}>
      {!viewer ? <>
        <InfoLoginBlock inline to={'view meet'} />
      </>
      : !authorized
      ? <GreeterUnauthorized {...{ viewer, users:meet?.users}} />
      : !loaded.current
      ? <div>loading meet</div>
      : !edit
      ? 
        <>
          {meet.t ? <div className='card'>
            <div className='row gap'>
              {meet.icon ? <img src={meet.icon} /> : null}
              <div>
                <div>
                  met {datetime.yyyymmdd(meet.t + datetime.duration({ h:1 }))}
                </div>
                <div>
                  at {meet.location || 'unknown location'}
                </div>
              </div>
            </div>
            <HalfLine />
            <div>
              {user1 === viewer ? <>your note</> :
              <>{user1}'s note</>}
            </div>
            <div className='card-inner'>
              {convertLinks(meet.public[user1] || `no notes by ${user1}`)}
            </div>
            <HalfLine />
            <div>
              {user2 === viewer ? <>your note</> :
              <>{user2}'s note</>}
            </div>
            <div className='card-inner'>
              {convertLinks(meet.public[user2] || `no notes by ${user2}`)}
            </div>
            {meet?.private[viewer] ? <>
              <HalfLine />
              <div>
                your private note
              </div>
              <div className='card-inner'>
                {convertLinks(meet.private[viewer] || 'no private notes')}
              </div>
            </> : null}
          </div> : <div className='card'>
            {loaded.current ? 'no recorded meet' : 'loading meet'}
          </div>}
        </>
      :
      <>
        <div>describe the first time you met:</div>
        <input type='date' value={datetime.input(edit_data.t)} max={datetime.input(Date.now())} onChange={e => {
          set_edit_data({
            ...edit_data,
            t: Number(new Date(datetime.yyyymmdd(Number(new Date(e.target.value)) + datetime.duration({ h:12 })) + ' 12:00:00')),
          })
        }}></input>
        <div className='column' style={S(`margin-bottom:2px`)}>
          <div>
            <InfoBadges labels={[
              ...upload_icon_fill({ edit_data_view, set_edit_data }),
            ]} />
          </div>
          {edit_data.icon ? <img src={edit_data.icon} width={64} /> : null}
        </div>
        <input type='text' placeholder='location' autoCapitalize='off' value={edit_data.location} onChange={e => {
          set_edit_data({
            ...edit_data,
            location: e.target.value,
          })
        }}></input>
        <InfoSelect options={[
          'friends',
          'dates',
        ]} value={edit_data.group[viewer] || 'friends'} setter={value => {
          set_edit_data({
            ...edit_data,
            group: {
              ...(edit_data_view.group||{}),
              [viewer]: value,
            }
          })
        }} display={value => `${value} (${{
          friends: 'visible to follows',
          dates: 'hidden from others',
        }[value]})`}/>
        <textarea placeholder='public notes' rows={5} value={edit_data.public[viewer]||''} onChange={e => {
          set_edit_data({
            ...edit_data,
            public: {
              ...(edit_data_view.public||{}),
              [viewer]: e.target.value,
            }
          })
        }} autoCapitalize='off'></textarea>
        <textarea placeholder='private notes' rows={5} value={edit_data.private[viewer]||''} onChange={e => {
          set_edit_data({
            ...edit_data,
            private: {
              ...(edit_data_view.private||{}),
              [viewer]: e.target.value,
            }
          })
        }} autoCapitalize='off'></textarea>
        
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
        <div>this will be visible to anyone you follow</div>
      </>}
    </InfoSection>
    <LinkSection {...{ authorized, edit, links:meet.links }} />
    {/* figure out side meets (this is side hangouts code) */}
    {/* {authorized && !edit && side_hangouts ? <>
      <br />
      <InfoSection labels={[
        // `previous &${side_hangouts.equal_hangouts.length ? ' same day &' : ''} next hangouts`,
        {
          text: <>
            {`previous &${side_hangouts.equal_hangouts?.length ? ' same day &' : ''} next hangouts`}&nbsp;for&nbsp;<InfoSelect value={side_hangouts_user} setter={set_side_hangouts_user} options={lists.unique([viewer, ...hangout.users])} display={(x:string) => x === viewer ? 'you' : x} />
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
    </> : null} */}
    <PrintCertificateSection {...{ edit, member, meet }} />
  </>
}
