import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBadges, InfoBody, InfoButton, InfoSection, InfoSelect, InfoStyles } from '../../components/Info'
import { usePageSettings } from 'src/lib/hooks_ext'
import { S } from 'src/lib/util'
import api, { auth } from 'src/lib/api'
import { useEventListener, useF, useM, useR, useRerender, useS } from 'src/lib/hooks'
import { WebsiteTitle } from 'src/components/website_title'
import GreeterLink from './GreeterLink'
import { store } from 'src/lib/store'
import GreeterUnauthorized from './GreeterUnauthorized'
import { APP_COOKIE } from './util'
import url from 'src/lib/url'


const { named_log, list, strings, datetime, truthy, QQ, node, merge } = window as any
const log = named_log('greeter meet')

export const Meet = ({ friend, other, handle }) => {

  const [{user:viewer}] = auth.use()
  const member = viewer === friend || viewer === other
  const member_and_non_viewer = member ? viewer === friend ? other : friend : false
  const [_meet, setMeet] = useS(undefined)
  const meet = useM(_meet, () => ({
    // t: Date.now(),
    users: [friend, other],
    t: undefined,
    location: '',
    public: {
      [friend]: '',
      [other]: '',
    },
    private: {
      [friend]: '',
      [other]: '',
    },
    group: {
      [friend]: '',
      [other]: '',
    },
    // t: Date.now(),
    // location: `Arby's`,
    // public: {
    //   [friend]: 'I had the endless shrimp',
    //   [other]: 'lunch date',
    // },
    // private: {
    //   [friend]: 'smelly',
    //   [other]: 'smelly',
    // },
    // group: {
    //   [friend]: 'friends',
    //   [other]: 'friends',
    // },
    ...(_meet || {})
  }))
  useF(meet, () => log(meet))
  const loaded = useR(false)
  useF(friend, () => handle.load_meet(friend, other, value => {
    setMeet(value)
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

  const [viewer_profile, setViewerProfile] = useS(undefined)
  useF(viewer, () => handle.load_profile(viewer, setViewerProfile))
  const authorized = useM(viewer_profile, friend, other, () => viewer_profile 
  ? member || viewer_profile.followers.includes(friend)||viewer_profile.followers.includes(other)
  : viewer)
  const following = useM(member_and_non_viewer, viewer_profile, () => viewer_profile?.follows?.includes(member_and_non_viewer))
  useF(viewer_profile, following, member_and_non_viewer, log)

  const [edit, setEdit] = useS(false)
  const edit_data = useR({
    public: {},
    private: {},
    group: {},
  })
  const rerender = useRerender()
  useF(meet, edit, () => {
    if (meet) {
      edit_data.current = strings.json.clone(meet)
      edit_data.current.t = edit_data.current.t || Number(new Date(datetime.yyyymmdd()))
      rerender()
    }
  })

  handle = {
    ...handle,
    save_meet: async () => {
      await handle.set_meet(edit_data.current, setMeet)
      setEdit(false)
    }
  }

  useEventListener(window, 'keydown', e => {
    if (edit && e.metaKey && e.key === 's') {
      e.preventDefault()
      handle.save_meet()
    }
  })

  return <>
    <InfoSection labels={[
      `${friend} & ${other}`,
      // { back: () => handle.setPath([undefined, '', undefined]) },
      member && !edit && { edit: () => setEdit(true) },
      edit && { save: handle.save_meet },
      edit && { cancel: () => {
        setEdit(false)
      } },
      edit && { clear: () => {
        setMeet({
          users: meet.users,
          t: meet.t,
        })
      } },
      viewer && member_and_non_viewer && !following && { [`follow ${member_and_non_viewer}`]: () => {
        // api.post(`/profile/${user}/follow`, {}).then(() => handle.load_profile(viewer, setViewerProfile))
        api.post(`/profile/${member_and_non_viewer}/follow`, {}).then(() => location.reload())
      } },
      'view:',
      !edit && { 'quiz': e => handle.setPath([friend, 'quiz', other], e) },
      !edit && member && { 'calendar': e => {
        const last_calendar_click = `.date-${datetime.yyyymmdd(meet.t)}`
        store.set('greeter-last-calendar-click', last_calendar_click)
        handle.setPath([viewer, 'calendar'], e)
      } },
      { [`${friend}`]: e => handle.setPath([friend, 'met', undefined], e) },
      { [`${other}`]: e => handle.setPath([other, 'met', undefined], e) },
    ]}>
      {!authorized
      ? <GreeterUnauthorized {...{ viewer, users:[friend, other]}} />
      : !_meet
      ? <div>loading meeting</div>
      : !edit
      ? 
        <>
          {meet.t ? <div className='card'>
            {/* <div>
              met 3 years ago
            </div>
            <div>
              at Arby's
            </div> */}
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
              {friend === viewer ? <>your note</> :
              <>{friend}'s note</>}
            </div>
            <div className='card-inner'>
              {meet.public[friend] || `no notes by ${friend}`}
            </div>
            <HalfLine />
            <div>
              {other === viewer ? <>your note</> :
              <>{other}'s note</>}
            </div>
            <div className='card-inner'>
              {meet.public[other] || `no notes by ${other}`}
            </div>
            {meet?.private[viewer] ? <>
              <HalfLine />
              <div>
                your private note
              </div>
              <div className='card-inner'>
                {meet.private[viewer] || 'no private notes'}
              </div>
            </> : null}
          </div> : <div className='card'>
            {loaded.current ? 'no recorded meeting' : 'loading meeting'}
          </div>}
        </>
      :
      <>
        <div>describe the first time you met:</div>
        <input type='date' value={datetime.input(edit_data.current.t)} max={datetime.input(Date.now())} onChange={e => {
          edit_data.current.t = Number(new Date(e.target.value)) + datetime.duration({ h:1 })
          rerender()
        }}></input>
        <div className='column' style={S(`margin-bottom:2px`)}>
          <div>
            <InfoBadges labels={[
              { 'upload icon': () => {
                const node_file = node('<input type="file" accept="image/*" />')
                node_file.onchange = e => {
                  const file = node_file.files[0]
                  const img = node(`<img />`)
                  img.onload = () => {
                    const canvas = node('<canvas />')
                    const IMG_SIZE = 128
                    canvas.height = canvas.width = IMG_SIZE
                    const ctx = canvas.getContext('2d')
                    ctx.imageSmoothingEnabled = false
                    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, IMG_SIZE, IMG_SIZE)
                    edit_data.current.icon = canvas.toDataURL()
                    rerender()
                  }
                  img.src = URL.createObjectURL(file)
                }
                node_file.click()
              } },
              edit_data.current.icon && { 'remove icon': () => {
                edit_data.current.icon = false
                rerender()
              } }
            ]} />
          </div>
          {edit_data.current.icon ? <img src={edit_data.current.icon} width={64} /> : null}
        </div>
        <input type='text' placeholder='location' autoCapitalize='off' value={edit_data.current.location} onChange={e => {
          edit_data.current.location = e.target.value
          rerender()
        }}></input>
        <InfoSelect options={[
          'friends',
          'dates',
        ]} value={edit_data.current.group[viewer] || 'friends'} setter={value => {
          edit_data.current.group[viewer] = value
          rerender()
        }} display={value => `${value} (${{
          friends: 'visible to follows',
          dates: 'hidden from others',
        }[value]})`}/>
        <textarea placeholder='public notes' rows={5} value={edit_data.current.public[viewer]||''} onChange={e => {
          edit_data.current.public[viewer] = e.target.value
          rerender()
        }} autoCapitalize='off'></textarea>
        <textarea placeholder='private notes' rows={5} value={edit_data.current.private[viewer]||''} onChange={e => {
          edit_data.current.private[viewer] = e.target.value
          rerender()
        }} autoCapitalize='off'></textarea>
        
        {/* <div>&nbsp;</div> */}
        <HalfLine />
        <div>add any relevant links:</div>
        {edit_data.current.links?.map((link, i) => <input className='greeter-greet-links-input' type='text' value={link} onChange={e => {
            edit_data.current.links[i] = e.target.value
            edit_data.current.links = edit_data.current.links.filter(truthy)
            rerender()
          }} />)}
          <input type='text' placeholder={'enter link'} onChange={e => {
            edit_data.current.links.push(e.target.value)
            e.target.value = ''
            rerender()
            setTimeout(() => {
              QQ('.greeter-greet-links-input').at(-1).focus()
            })
          }}></input>

          <HalfLine />
          <div>this will be visible to anyone you follow</div>
      </>}
    </InfoSection>
    {!edit && meet.links?.length ? <>
      <InfoSection labels={['links']}>
        {/* <div className='row wide gap wrap'>
          {meet.links?.map(link => <a className='greeter-link' href={link.replace(/^(https?:\/\/)?/, 'http://')}><WebsiteTitle href={link} /></a>)}
        </div> */}
        {meet.links?.map(link => <GreeterLink href={link} />)}
      </InfoSection>
    </> : null}
    {!edit && member ? <>
      <br />
      <InfoSection labels={[
        { 'print certificate': () => {
          url.new(location.origin + `/raw/greeter/display.html?meet=${[friend, other].join('-')}`)
        } },
      ]} />
    </> : null}
  </>
}
