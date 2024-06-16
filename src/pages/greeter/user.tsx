import React from 'react'
import styled from 'styled-components'
import { A, InfoBadges, InfoBody, InfoButton, InfoLoginBlock, InfoSection, InfoStyles } from '../../components/Info'
import { useCachedScript, usePageSettings } from 'src/lib/hooks_ext'
import { S, keys } from 'src/lib/util'
import api, { auth } from 'src/lib/api'
import { useF, useM, useR, useRerender, useS, useSkip, useTimed } from 'src/lib/hooks'
import { Greet } from './greet'
import { copy } from 'src/lib/copy'
import { GreeterLoginNotice } from './greeter_login_notice'
import { openLogin } from 'src/lib/auth'
import GreeterMeet from './GreeterMeet'
import GreeterUnauthorized from './GreeterUnauthorized'
import { store } from 'src/lib/store'
import GreeterHangout from './GreeterHangout'
import { APP_COOKIE } from './util'
import url from 'src/lib/url'
import { useQr } from 'src/components/qr'
import { UserBadge } from 'src/components/user_badges'

const { named_log, qr, list, set, rand, range, lists, objects, truthy, sets, datetime, defer, Q } = window as any
const log = named_log('greeter user')

export const User = ({ user, handle }) => {
  const [{ user:viewer }] = auth.use()
  const self = viewer && user === viewer

  const [profile, setProfile] = useS(undefined)
  useF(viewer, user, () => handle.load_profile(user, setProfile))
  const followed = useM(viewer, profile, () => profile?.follows?.includes(viewer)||self)

  const [viewer_profile, setViewerProfile] = useS(undefined)
  useF(viewer, () => handle.load_profile(viewer, setViewerProfile))
  const following = useM(user, viewer_profile, () => viewer_profile?.follows?.includes(user)||self)
  const authorized = useM(viewer_profile, user, self, () => viewer_profile 
  ? self || viewer_profile.followers.includes(user)
  : viewer)

  const [meet, setMeet] = useS(undefined)
  useF(viewer, user, () => handle.load_meet(viewer, user, setMeet))

  useF(profile, () => console.debug('[greeter]', profile))

  const greet_href = location.origin + `/greeter/${user}/greet`
  const [copied, setCopied] = useS(false)
  useF(copied, () => copied && setTimeout(() => setCopied(false), 2500))

  const [meets, setMeets] = useS(undefined)
  useF(viewer, user, () => handle.load_meets(user, setMeets))
  const [hangouts, setHangouts] = useS(undefined)
  useF(viewer, user, () => handle.load_hangouts(user, setHangouts))
  const meet_users = useM(user, meets, () => {
    return meets?.flatMap(x => x.users).filter(x => x !== user)
  })
  const both_users = useM(user, meets, hangouts, () => {
    return list(sets.union(...[meets, hangouts].map(x => x?.flatMap(x => x.users).filter(x => x !== user)||[])))
  })
  const meet_per_other = useM(meets, user, () => {
    const meet_per_other = {}
    meets?.map(meet => {
      const other = meet.users.find(x=>x!==user)
      if (other) {
        meet_per_other[other] = meet
      }
    })
    log({meet_per_other})
    return meet_per_other
  })
  const view_users = useM(self, profile, meet_users, followed, meets, meet_per_other, user, () => {
    let result = self ? profile?.follows : (followed ? meet_users : undefined)
    if (result && meets && (self || followed)) {
      const count_responses = (other) => objects.values((meet_per_other[other]||{public:{}}).public).filter(truthy).length
      log(result.map(count_responses))
      result = result.sort((a, b) => count_responses(b) - count_responses(a))
    }
    return result
  })
  const meet_requests = useM(viewer, self, meets, view_users, meet_per_other, () => {
    if (self && meets && view_users) {
      const view_users_set = new Set(view_users)
      const others = keys(meet_per_other).filter(x => !view_users_set.has(x))
      log({ others })
      return others
    } else {
      return undefined
    }
  })
  useF(meets, log)
  const _repick_suggestions = useRerender()
  const greet_suggestions_cookie = useM(user, () => `greeter-suggestions-${user}`)
  const repick_suggestions = useM(_repick_suggestions, () => () => {
    store.set(greet_suggestions_cookie, undefined)
    _repick_suggestions()
  })
  useF(repick_suggestions, () => window['repick_suggestions'] = repick_suggestions)
  const suggestions = useM(meets, both_users, repick_suggestions, () => {
    if (!meets?.length) return undefined
    
    const existing = store.get(greet_suggestions_cookie)
    if (existing) return existing

    const activities = [
      ['grab coffee', '☕️'],
      ['see a movie', '🍿'],
      ['go on a hike', '🏞️'],
      ['go shopping', '👜'],
      ['get sushi', '🍣'],
      ['go to a bar', '🍻'],
      // 'play a sport',
      ['visit a museum', '🏛️'],
      ['go to a concert', '🎶'],
      ['cook', '👨‍🍳', 0, 'easy recipes'],
      ['video chat', '💻', ' ', 'platforms'],

      ['play tennis', '🎾', 0, 0, .5],
      ['go to the aquarium', '🐠', 0, 0, .5],
      ['go rock climbing', '🧗‍♂️', 0, 0, .5],
      ['go fishing', '🎣', 0, 0, .5],
      ['get pastries', '🥐', 0, 0, .5],
      ['go skydiving', '🪂', 0, 0, .2],
      // ['build something out of wood', 'easy woodworking projects'],
    ].map(x => lists.first(Array.isArray(x) ? x : [x, 0, 0, 0, 0], [0, '', 'with', 'around me', 1]))

    const activities_dict = {}
    const weighted_activities = {}
    activities.map(activity => {
      const [label, _, __, ___, weight] = activity
      activities_dict[label] = activity
      weighted_activities[label] = weight
    })

    log({activities,weighted_activities})

    const suggestion_dict = {}
    let tries = 0
    range(3).map(() => {
      let suggestion
      do {
        tries += 1
        if (tries > 100) return
        // const [activity, how, search_suffix] = rand.sample(activities)
        const [activity, emoji, how, search_suffix] = activities_dict[rand.weighted(weighted_activities)]
        const activity_user = self ? rand.sample(both_users) : user
        // const place = meets.find(x => x.users.includes(user)).location
        suggestion = {
          activity, user,
          // place,
          title: `${activity} ${how} ${activity_user} ${emoji}`.replace(/ +/g, ' '),
          search: `${activity} ${search_suffix}`
        }
      } while (suggestion_dict[suggestion.title])
      suggestion_dict[suggestion.title] = suggestion
    })
    const suggestions = objects.values(suggestion_dict)
    store.set(greet_suggestions_cookie, suggestions)
    return suggestions
  })

  const [hangout_search, set_hangout_search] = useS('')
  const filtered_hangouts = useM(hangouts, hangout_search, () => {
    if (!hangouts || !hangout_search) return hangouts

    defer(() => {
      Q('#greeter-search-input')?.scrollIntoView({ block:'start' })
      Q('#inner-index')?.scrollIntoView({ block:'end' })
    })

    const lowercase_search = hangout_search.toLowerCase()
    return hangouts.filter(hangout => {
      const user_match = hangout.users.some(user => user.toLowerCase().includes(lowercase_search))
      const title_match = hangout.title?.toLowerCase().includes(lowercase_search)
      const location_match = hangout.location?.toLowerCase().includes(lowercase_search)
      const note_match = objects.values(hangout.public).some(note => note?.toLowerCase().includes(lowercase_search))
      const link_match = hangout.links.some(link => link.toLowerCase().includes(lowercase_search))
      const time_match = hangout.t && datetime.yyyymmdd(hangout.t).includes(lowercase_search)
      // TODO month/day name
      return user_match || title_match || location_match || note_match || link_match || time_match
    })
  })

  const weeks_hangouts = useM(hangouts, () => hangouts?.filter(x => Math.abs(x.t - Date.now()) < datetime.duration({ w:1 })))
  const show_weeks_hangouts = useM(followed, weeks_hangouts, () => followed && weeks_hangouts && weeks_hangouts.length > 0)
  
  // const user_href = useM(user, self, () => self && `${location.origin}/greeter/${user}/greet`)
  const user_href = useM(user, self, viewer_profile, () => self && viewer_profile && `${location.origin}/invite/${viewer_profile.invite}`)
  const [user_qr, user_qr_copy, user_qr_expand] = useQr({ href:user_href, size:128 })

  const [show_links_qr, set_show_links_qr] = store.use('greeter-show-links')
  // TODO better
  const [_greet, setGreet] = useS(undefined)
  const greet = useM(_greet, () => ({
    links: [],
    ...(_greet || {}),
  }))
  useF(user, () => handle.load_greet(user, setGreet))
  const not_many_links = useM(_greet, () => _greet && _greet.links.length < 5)
  useF(not_many_links, () => not_many_links && set_show_links_qr(true))
  const links_section = <Greet {...{ user, handle }} embedded hide_profile={self} />
  const qr_section = <>
    {user_href ? <>
      <InfoSection labels={[
        'QR',
        user_qr_copy,
        user_qr_expand,
      ]}>
        {user_qr}
      </InfoSection>
    </> : null}
  </>

  return <>
    {show_weeks_hangouts ? <>
      <InfoSection labels={[
        "this week's hangouts",
        viewer && { 'add hangout': (e) => {
          store.set(APP_COOKIE.HANGOUT_PREFILL, { users:lists.unique([viewer, user]) })
          handle.setPath([undefined, 'hangout', undefined], e)
        }},
        viewer && !self && { 'joint calendar': (e) => handle.setPath([viewer, 'calendar', user], e) },
      ]}>
        <InfoLoginBlock to={'view hangouts'} inline>
          <div className='row gap wrap'>
            {weeks_hangouts.map(hangout => <GreeterHangout {...{ user, hangout }} />)}
            {hangout_search ? <>
              <InfoBadges labels={[
                {
                  'open all': () => {
                    weeks_hangouts.slice().reverse().map(hangout => url.new(location.origin + `/greeter/hangout/${hangout.id}`))
                  }
                },
              ]} />
            </> : null}
          </div>
        </InfoLoginBlock>
      </InfoSection>
    </> : <>
      <InfoBadges style={S(`font-size: 1.25em; padding-bottom: .125em`)} labels={[
        viewer && { 'add hangout': (e) => {
          store.set(APP_COOKIE.HANGOUT_PREFILL, { users:lists.unique([viewer, user]) })
          handle.setPath([undefined, 'hangout', undefined], e)
        }},
      ]} />
    </>}
    <InfoSection labels={[
      // self && user,
      self ? 'your follows' : `${user}'s meetings`,
      ...(viewer ? [
        !self && !following && { 'follow': () => {
          // api.post(`/profile/${user}/follow`, {}).then(() => handle.load_profile(viewer, setViewerProfile))
          api.post(`/profile/${user}/follow`, {}).then(() => location.reload())
        } },
        !self && !following && 'follow to add meeting',
        !self && following && !meet?.t && { [meet?.t ? 'view meet' : 'add meeting']: e => handle.setPath([viewer, 'met', user], e) },
        
        'view:',
        user && followed && { 'summary': e => handle.setPath([user, 'summary'], e)},
        { 'calendar': e => handle.setPath([user, 'calendar'], e)},
        // self && { 'about greeter': () => handle.setPath([undefined, 'about']) },
  
        // !self && !following && 'follow to add meeting',
        !self && following && meet?.t && { 'your meet': e => handle.setPath([viewer, 'met', user], e) },
        // viewer && !self && following && { [meet?.t ? 'view meet' : 'add meeting']: e => handle.setPath([viewer, 'met', user], e) },
      ] : [
        user && { 'log in to meet': () => openLogin() },
      ])
    ]}>
      <InfoLoginBlock to={'view meetings'} inline>
        <div className='row wide gap wrap' style={S(`
        // row-gap: 0;
        `)}>
          {/* <InfoBadges labels={view_users?.map(friend => ({
            href: `/greeter/${user}/met/${friend}`,
            text: friend,
          }))} /> */}
          {view_users?.map(friend => <GreeterMeet {...{
            user,
            meet:meet_per_other[friend]||{users:[user, friend]},
            href: `/greeter/${user}/met/${friend}`,
          }} />)}
          {view_users?.length ? null : <div>
            {profile
            ? !followed ? 'friend this user to view meetings' : (self ? 'no follows' : 'no meetings')
            : 'loading profile'}
          </div>}
        </div>
        {!authorized
        ? <GreeterUnauthorized {...{ viewer, users:[user] }} />
        : null}
      </InfoLoginBlock>
    </InfoSection>
    {/* <InfoSection labels={[
      { 'view greeting card': () => handle.setPath([user, 'greet', undefined]) }
    ]}></InfoSection> */}
    {self ? <>
      <InfoSection labels={[
        not_many_links ? false : { [show_links_qr ? 'hide your links & QR' : 'show your links & QR']: () => set_show_links_qr(!show_links_qr) },
        <UserBadge {...{ user, text:'open your profile' }} />,
      ]} />
      {show_links_qr ? <>
        {links_section}
        {qr_section}
      </> : null}
    </> : <>
      {links_section}
    </>}
    {/* {user && self ? <InfoSection labels={[
      'QR',
      { [copied ? 'copied!' : 'copy link']: () => {
        setCopied(true)
        copy(greet_href)
      } }
    ]}>
      <div style={S(`
      // border: 1px solid #fff;
      // padding: 1em;
      background: #eee;
      background: #fff;
      filter: invert();
      cursor: pointer;
      `)} onClick={e => {
        setCopied(true)
        copy(greet_href)
      }}>
        <img src={qr(greet_href, 256)} style={S(`
        margin: calc(-42px + 1em);
        clip-path: inset(42px);
        min-height: 84px;
        // filter: invert() contrast(.9);
        // border: 1px solid #111;
        // border: 1px solid #555;
        // mix-blend-mode: color-dodge;
        // filter: invert();
        // filter: brightness(.9375);
        `)} />
      </div>
    </InfoSection> : null} */}

    {meet_requests?.length ? <InfoSection labels={['requests']}>
      <InfoBadges labels={meet_requests?.map(friend => ({
        href: `/greeter/${user}/met/${friend}`,
        text: friend,
      }))} />
    </InfoSection> : null}

    {suggestions ? <InfoSection labels={[
      'suggestions',
      { 'new ones': repick_suggestions },
      { 'GREETER-AI': () => handle.set_path([undefined, 'ai', undefined]) },
    ]}>
      {suggestions.map(suggestion => <a className='greeter-link' href={`https://www.google.com/search?q=${suggestion.search.replace(/ /g, '+')}`}>{suggestion.title}</a>)}
    </InfoSection> : null}

    <InfoSection labels={[
      'hangouts',
      viewer && { 'add hangout': (e) => {
        store.set(APP_COOKIE.HANGOUT_PREFILL, { users:lists.unique([viewer, user]) })
        handle.setPath([undefined, 'hangout', undefined], e)
      }},
      viewer && !self && { 'joint calendar': (e) => handle.setPath([viewer, 'calendar', user], e) },
      // viewer && { spacer:true },
      // viewer && 'search:',
      // viewer && {
      //   text: <>
      //     <input id='greeter-search-input' placeholder={'user/title/note'} style={S(`
      //     padding-top: 0 !important;
      //     padding-bottom: 0 !important;
      //     `)} value={hangout_search} onChange={e => set_hangout_search(e.target.value)} />
      //   </>
      // },
      viewer && {
        text: <>
          <span style={{fontSize:'.45em'}}>&nbsp;</span>search: <input id='greeter-search-input' placeholder={'user/title/note'} style={S(`
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          `)} value={hangout_search} onChange={e => set_hangout_search(e.target.value)} />
        </>
      },
    ]}>
      <InfoLoginBlock to={'view hangouts'} inline>
        {!followed
        ? <div>friend this user to view hangouts</div>
        : !hangouts
        ? <div>loading hangouts</div>
        : !hangouts.length
        ? <div>no hangouts</div>
        // : <InfoBadges labels={hangouts.map(hangout => ({
        //   href: `/greeter/hangout/${hangout.id}`,
        //   text: hangout.title || (hangout.users.length < 4 ? hangout.users.filter(x=>x!==viewer).join(' & ') : datetime.yyyymmdd(hangout.t))
        // }))} />
        : !filtered_hangouts.length
        ? <div>no matching hangouts</div>
        : <div className='row gap wrap'>
          {filtered_hangouts.map(hangout => <GreeterHangout {...{ user, hangout }} />)}
          {hangout_search ? <>
            <InfoBadges labels={[
              {
                'open all': () => {
                  filtered_hangouts.slice().reverse().map(hangout => url.new(location.origin + `/greeter/hangout/${hangout.id}`))
                }
              },
            ]} />
          </> : null}
        </div>}
      </InfoLoginBlock>
    </InfoSection>

    <div className='spacer'>&nbsp;</div>
    <InfoSection labels={[
      { 'about greeter': () => handle.setPath([undefined, 'about']) },
    ]} style={S(`
    display: flex;
    align-items: center;
    `)}>
      <A href='/greeter/about'>
        <img src='/raw/greeter/icon.png' style={S(`
        width: 6.75em;
        // border: 2px solid #fff;
        `)} />
      </A>
    </InfoSection>

    {/* <InfoSection>
      <div>&nbsp;</div>
      <GreeterLoginNotice />
    </InfoSection> */}
  </>
}
