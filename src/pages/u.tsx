import React, { useState } from 'react';
import { A, HalfLine, InfoBadges, InfoBody, InfoFuncs, InfoLine, InfoLinks, InfoLoginBlock, InfoSearch, InfoSection, InfoStyles } from '../components/Info';
import api from '../lib/api';
import { useCached, useEventListener, useF, useM, useR, useRerender, useS } from '../lib/hooks';
import { useAuth, usePageSettings } from '../lib/hooks_ext';
import { parseParts } from '../lib/page';
import { useSocket } from '../lib/socket';
import url from '../lib/url';
import { convertLinks } from '../lib/render';
import { settings } from '../lib/user';
import { S } from 'src/lib/util';
import styled from 'styled-components';
import { UserBadges } from 'src/components/user_badges';
import { copy } from 'src/lib/copy';
import { meta } from 'src/lib/meta';
import { useQr } from 'src/components/qr';
import { openPopup } from 'src/components/Modal';
import { NiceModal } from 'src/components/nice_modal';


const { named_log, node, qr } = window as any
const log = named_log('u')
const siteAccounts = ['site']

export const UserList = ({labels, users}: {labels, users}) => {
  return <InfoLinks {...{
    entries: users.map(u => ({ text: u, data: `/u/${u}` })),
    labels,
  }}/>
}

export default () => {
  const rerender = useRerender()
  const auth = useAuth()
  const [user] = url.as(() => {
    const [page, user] = parseParts(2)
    console.debug('AS', page, user)
    if (page[0] === '~') return page.slice(1)
    if (user) return user

    if (auth.user && 'profile u'.includes(page)) url.replace(`/u/${auth.user}`)
    return auth.user
  })
  const self = auth.user && auth.user === user
  const [loaded, setLoaded] = useState(false)
  const [profile, setProfile] = useState(undefined)
  let [info, setInfo]: [{ [key: string]: any }, any] = useState({})
  const searchRef = useR()
  const [similar, setSimilar] = useState(undefined)

  const bioInput = useR()

  const [unread, setUnread] = useState({})
  useSocket({
    on: {
      'chat:unread': unread => {
        setUnread(unread)
      }
    },
    connect: socket => socket.emit('chat:unread'),
  })

  useF(user, auth.user, () => {
    setLoaded(false)
    setProfile(undefined)
    setInfo({})
    if (user && auth.user) {
      handle.load()
    }
  })
  const handle = {
    load: async () => {
      log('fetch', {user})
      return await api.get(`/profile/${user}`).with(x => log('fetched', x)).then(handle.parse)
    },
    follow: () => api.post(`/profile/${user}/follow`, {}).then(handle.parse),
    unfollow: () => api.post(`/profile/${user}/unfollow`, {}).then(handle.parse),
    // bio: bio => api.post(`/profile/bio`, { bio }).then(handle.parse),
    save: async ({ bio=profile.bio, icon=profile.icon }) => {
      return await api.post(`/profile/bio`, { bio, icon }).then(handle.parse)
    },
    parse: data => {
      log(data)
      setProfile(data.profile)
      setLoaded(true);
      if (data.profile) {
        const { friends, followers } = data.profile;
        info = {};
        if (auth.user) {
          info.isUser = user === auth.user;
          const friendSet = new Set(friends);
          const followerSet = new Set(followers);
          if (info.isUser) {
            info.requests = followers.filter(f => !friendSet.has(f));
          } else {
            // if (friends) {
            //   info.isFriend = friendSet.has(auth.user);
            //   info.isFollower = friendSet.has(auth.user); // just 'cyrus'
            //   info.canFollow = !followerSet.has(auth.user);
            //   info.canUnfollow = followerSet.has(auth.user);
            // } else if (data.viewer) {
            //   info.isFriend = false
            //   info.isFollower = data.viewer.follows.includes(user)
            //   info.canUnfollow = data.viewer.follows.includes(user)
            //   info.canFollow = !info.canUnfollow
            // }
            info.isFriend = friends && friendSet.has(auth.user);
            info.isFollower = data.viewer.followers.includes(user)
            info.canUnfollow = data.viewer.follows.includes(user)
            info.canFollow = !info.canUnfollow
          }
        }
        setInfo(info);
        setSimilar(undefined)
      } else if (data.similar) {
        setSimilar([...new Set(data.similar)])
        setInfo({});
      }
    },
    search: () => {
      const current = searchRef.current;
      if (current) {
        const search = (current as HTMLInputElement).value
        search && url.push(`/u/${search}`)
      }
    },
  }

  const showChat = info?.isFriend
    ? `/chat/${profile.user}`
    : (user === auth.user && !!profile?.friends?.length) ? '/chat' : ''
  const siteAccount = siteAccounts.includes(user)
  const unreadCount = showChat && unread && Object.keys(unread).length

  const [bio, setBio] = useState(undefined)
  const [bioEdit, setBioEdit] = useState(false)
  const bioLength = 120
  useF(profile, () => setBio(profile?.bio))
  if (siteAccount && profile) profile.bio = 'this is a special account for site notifications'

  const [cost]: any = useCached('cost/month', () => api.get('cost/month'))
  const isSupporter = cost?.supporters?.includes(user)
  const [hideSupport] = settings.as(x => x['profile.hideSupport'])

  useEventListener(window, 'keydown', e => {
    if (bioEdit && e.metaKey && e.key === 's') {
      e.preventDefault()
      setBioEdit(false)
      handle.save({bio})
    }
  })

  const u_href = profile ? location.origin + `/invite/${profile.invite}` : undefined
  const [u_qr, u_qr_copy_badge, u_qr_expand_badge] = useQr({ href:u_href, size:128 })
  const [show_randomize, set_show_randomize] = useS(false)
  const [show_u_href_about, set_show_u_href_about] = useS(false)

  meta.title.use({ value: `u/${user}` })

  const starter = profile && <>
    <InfoBadges labels={[
      {
        text: 'read the guide to getting started on freshman.dev →',
        href: '/starter',
      }
    ]} />
    <HalfLine />
  </>
  const show_starter_at_top = useM(profile, self, () => self && profile && !profile.follows.length)

  const [del_reqs, set_del_reqs] = useS(undefined)

  usePageSettings({
    // professional: true,
  })
  return <InfoLoginBlock to={user ? 'view user' : 'view your profile'}><Style id='u'>
    <InfoSearch {...{searchRef, placeholder: 'find a user', search: handle.search}}/>
    {profile ?
    <InfoBody>
      {show_starter_at_top ? starter : null}
      <InfoSection labels={[
        user === 'cyrus' ? 'site owner' : siteAccount ? 'not a user' : 'user',
        isSupporter && (bioEdit
        ? { 
          text: hideSupport ? 'show support' : 'hide support',
          style: hideSupport ? undefined : { background: 'gold', color: '#000' },
          func: () => settings.update('profile.hideSupport', !hideSupport),
          classes: 'supporter-button',
        }
        : hideSupport ? undefined : { text: 'supporter', style: S(`
        background: gold !important;
        color: #000 !important;
        `), func: () => url.push('/coffee'), classes: 'supporter-button' }),
        // user === 'cyrus' && { text: 'site owner. donate $1/mo!', func: () => location.href = 'https://github.com/sponsors/cfreshman?frequency=recurring&sponsor=cfreshman' },
        // user === 'cyrus' && { text: 'site owner. donate $2/mo!', href: '/donoboard' },
        // user === 'cyrus' && { text: 'site owner. buy me a coffee!', href: '/coffee' },
        // user === 'cyrus' && 'site owner',
        // user === 'cyrus' && { text: 'buy me a coffee!', href: '/coffee' },

        info.isFriend ? 'friend' : (info.isFollower ? 'follows you' : ''),
        info.canFollow && !siteAccount ? { text: 'follow', func: handle.follow } : '',
        info.canUnfollow ? { text: 'unfollow', func: handle.unfollow } : '',
        // info.canUnfollow && {
        //   href: `/greeter/${user}/greet`,
        //   text: 'greet',
        // },
      ]}>
        <InfoLine labels={[
          // info.isFriend ? 'friend' : (info.isFollower ? 'follows you' : ''),
          // info.canFollow && !siteAccount ? { text: 'follow', func: handle.follow } : '',
          // info.canUnfollow ? { text: 'unfollow', func: handle.unfollow } : '',
          // info.canUnfollow && {
          //   href: `/greeter/${user}/greet`,
          //   text: 'greet',
          // },
        ]}>
          {profile.user}
        </InfoLine>
      </InfoSection>
      {bioEdit 
      ? <InfoSection className='edit-container' style={{ width: '100%' }} labels={[
        'bio',
        { text: 'cancel', func: () => {
          setBioEdit(false)
          handle.load()
        } },
        { text: 'save', func: () => {
          setBioEdit(false)
          handle.save({bio})
        } },
        `${bio.length} / ${bioLength}`,
        { 'upload icon': () => {
          const node_file = node('<input type="file" accept="image/*" />')
          node_file.onchange = e => {
            const file = node_file.files[0]
            const img = node(`<img />`)
            img.onload = () => {
              const canvas = node('<canvas />')
              canvas.height = canvas.width = 64
              const ctx = canvas.getContext('2d')
              ctx.imageSmoothingEnabled = false
              ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 64, 64)
              profile.icon = canvas.toDataURL()
              rerender()
            }
            img.src = URL.createObjectURL(file)
          }
          node_file.click()
        } },
        profile.icon && { 'remove icon': () => {
          profile.icon = false
          rerender()
        } }
        ]}>
        <textarea
        ref={bioInput}
        className='input' spellCheck='false'
        rows={Math.max(3, profile.bio?.split('\n').length)}
        value={bio || ''}
        onChange={e => {
          if (bioInput.current) {
            const newBio = bioInput.current.value
              .replace(/\n{3,}/g, '\n\n')
              .split('\n')
              .slice(0, 3)
              .join('\n')
              .slice(0, bioLength)
            setBio(newBio)
            const L = e.target
            const selection = [L.selectionStart, L.selectionEnd]
            setTimeout(() => {
              L.selectionStart = selection[0]
              L.selectionEnd = selection[1]
            })
          }
        }} />
        {profile.icon ? <img className='profile-icon' src={profile.icon} /> : null}
      </InfoSection>
      : profile.bio || profile.icon
      ? <InfoSection labels={[
        'bio',
        self && { text: 'edit', func: () => setBioEdit(true) },
      ]} style={{ whiteSpace: 'pre-wrap' }}>
        <div className='row wide gap'>
          {/* {profile.icon ? <img className='profile-icon' src={profile.icon} /> : null} */}
          {profile.icon ? <img className='profile-icon' src={profile.icon} /> : null}
          {profile.bio ? <div>{convertLinks(profile.bio)}</div> : null}
        </div>
          {/* {profile.bio} */}
      </InfoSection>
      : null}
      {!bio && info.isUser && !bioEdit
      ? <InfoSection labels={['bio', { text: 'add', func: () => setBioEdit(true) }]} />
      : ''}

      {/* {profile.recents ? <InfoLinks labels={['recents']} entries={profile.recents} /> : ''} */}
      {/* {profile.recents ? <InfoFuncs labels={['recents']} entries={profile.recents} entryFunc={url.push} /> : ''} */}
      {/* {profile.recents?.map(recent => <InfoLine labels={[
        { 'hide': () => api.delete(`checkin${recent}`).then(rerender) },
      ]}>
        <A href={recent}>{recent}</A>
      </InfoLine>)} */}
      {profile.recents?.length ? <InfoSection labels={[
        'recents',
        auth.user === profile.user && { 'clear': () => api.delete(`profile/checkin`).then(handle.load) },
      ]}>
        {/* {profile.recents?.map(recent => 
        <InfoBadges key={recent} labels={[{ href:recent }]} />
        // <div key={recent}>
        //   <A href={recent}>{recent}</A>
        // </div>
        )} */}
        <InfoBadges style={{fontSize:'1em'}} labels={profile.recents?.map(recent => {
          const func_href = {
            // greeter: () => `/greeter/${user}`,
            // // wordbase: () => self ? recent : `/wordbase/new/${user}`, // nvm, this creates a new game
            // wordbase: () => `/wordbase/stats/${user}`,
            // audio_form: () => `/audio_form/u/${user}`,
            // chat: !self && (() => `/chat/${user}`),
          }[recent.slice(1)] || (() => recent)
          return {
            href:func_href(),
            text: recent,
          }
        })} />
      </InfoSection> : null}
      {profile.friends?.length ?
      <InfoSection labels={[
        'friends',
        showChat ? { text: 'chat', func: () => url.push(showChat) } : '',
        auth.user !== user && showChat ? { text: 'greet', func: () => url.push(auth.user === user ? `/greeter` : `/greeter/${auth.user}/met/${user}`) } : '',
        showChat ? { text: 'graffiti', func: () => url.push(`/graffiti/${user}`) } : '',
        // auth.user !== user && showChat ? { text: 'pixels', func: () => url.push(`/pixels/#/${user}`) } : '',
        // showChat && !info.isFriend && unreadCount ? { text: unreadCount, func: () => history.push('/chat') } : '',
        // showChat && unread ? `${unread}` : ''
        ]}>
        {/* <InfoBadges style={{fontSize:'1em'}} labels={profile.friends?.map(friend => ({ text:friend, href:`/u/${friend}` }))} /> */}
        <UserBadges {...{ users:profile?.friends }} />
        {/* {profile.friends?.map(friend => 
        <InfoBadges key={friend} labels={[{ text:friend, href:`/u/${friend}` }]} />
        // <div key={recent}>
        //   <A href={recent}>{recent}</A>
        // </div>
        )} */}
      </InfoSection>

      // <UserList labels={[
      //   'friends',
      //   showChat ? { text: 'chat', func: () => url.push(showChat) } : '',
      //   showChat ? { text: 'graffiti', func: () => url.push(`/graffiti/#/${user}`) } : '',
      //   showChat ? { text: 'pixels', func: () => url.push(`/pixels/#/${user}`) } : '',
      //   // showChat && !info.isFriend && unreadCount ? { text: unreadCount, func: () => history.push('/chat') } : '',
      //   // showChat && unread ? `${unread}` : ''
      //   ]} users={profile.friends} />

      // : profile.friends
      // ? <InfoSection labels={['friends']}>
      //   add friends for various things, like wordbase challenges
      //   <br/>
      //   you'll just need their username
      //   </InfoSection>
      : ''}
      {info.isUser && info.requests?.length
      ? 
      // <UserList labels={['requests']} users={info.requests} />
      <InfoSection labels={[
        del_reqs ? 'removing followers' : 'followers',
        auth.user === profile.user && (del_reqs ? { 'done': () => set_del_reqs(false) } : { 'remove': () => set_del_reqs(true) }),
        ]}>
        <InfoBadges style={{fontSize:'1em'}} labels={info.requests?.map(user => {
          if (del_reqs) return {
            text: user,
            func: async () => {
              await api.post(`/u/${user}/deny`)
              await handle.load()
            }
          }
          return { text:user, href:`/u/${user}` }
        })} />
      </InfoSection>
      : ''}
      <HalfLine />
      {!bioEdit ? <>
        <HalfLine />
        <InfoBadges labels={[
          { text:'view greeter', href:`/greeter/${user}` },
          { text:'view posts', href:`/light/@${user}` },
        ]} />
      </> : null}
      {!bioEdit && info.isUser ? <>
        <HalfLine />
        <InfoSection labels={[
          'friend link',
          u_qr_copy_badge,
          u_qr_expand_badge,
          { 're-randomize': () => set_show_randomize(true) },
          { '?': () => set_show_u_href_about(true) },
        ]}>
          {u_qr}
          {show_randomize ? <NiceModal on_close={() => set_show_randomize(false)}>
            <InfoSection labels={[
              'your friend link'
            ]}>
              <div>are you sure you want to re-randomize your friend link?</div>
              <div>your existing link will no longer work</div>
              <div className='column gap'>
                <InfoBadges labels={[
                  u_href.replace(/https?:\/\//, ''),
                ]} />
                <InfoBadges labels={[
                  { randomize: async () => {
                    await api.post(`/profile/randomize/invite`)
                    await handle.load()
                  } },
                ]} />
              </div>
              <HalfLine />
              <div className='row wide end'>
                <InfoBadges labels={[
                  { close: () => set_show_randomize(false) },
                ]} />
              </div>
            </InfoSection>
          </NiceModal> : null}
          {show_u_href_about ? <NiceModal on_close={() => set_show_u_href_about(false)}>
            <InfoSection labels={[
              'your friend link'
            ]}>
              <div>this is your friend link!</div>
              <div className='column gap'>
                <InfoBadges labels={[
                  u_href.replace(/https?:\/\//, ''),
                ]} />
              </div>
              <HalfLine />
              <div>if you share it with someone and they open the link, you'll both automatically follow each other</div>
              <HalfLine />
              <div>be careful with it! but you can re-randomize if it ends up somewhere it shoudn't</div>
              <HalfLine />
              <div className='row wide end'>
                <InfoBadges labels={[
                  { close: () => set_show_u_href_about(false) },
                ]} />
              </div>
            </InfoSection>
          </NiceModal> : null}
        </InfoSection>
      </> : null}
      {self && !show_starter_at_top ? <>
        <HalfLine />
        {starter}
      </> : null}
    </InfoBody>
    : loaded
    ? <InfoBody>
      <InfoSection label='user'>
        <InfoLine>{`'${user}' does not exist`}</InfoLine>
      </InfoSection>
      {similar ? <UserList labels={['similar']} users={similar} /> : ''}
    </InfoBody>
    : <InfoBody>
      <InfoSection label='user'>
        <div>loading user</div>
      </InfoSection>
    </InfoBody>}
  </Style></InfoLoginBlock>
}

const Style = styled(InfoStyles)`
&#u#u#u {
  .supporter-button {
    background: gold !important; color: #000 !important;
  }
  .profile-icon {
    width: 64px;
    aspect-ratio: 1/1;
    border-radius: 4px;
  }
}
`

// const linkRegex = /(?:(?:ht|f)tp(?:s?)\:\/\/|~\/|\/)?(?:\w+:\w+@)?((?:(?:[-\w\d{1-3}]+\.)+(?:dev|com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|edu|co\.uk|ac\.uk|it|fr|tv|museum|asia|local|travel|[a-z]{2}))|((\b25[0-5]\b|\b[2][0-4][0-9]\b|\b[0-1]?[0-9]?[0-9]\b)(\.(\b25[0-5]\b|\b[2][0-4][0-9]\b|\b[0-1]?[0-9]?[0-9]\b)){3}))(?::[\d]{1,5})?(?:(?:(?:\/(?:[-\w~!$+|.,=]|%[a-f\d]{2})+)+|\/)+|\?|#)?(?:(?:\?(?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)(?:&(?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)*)*(?:#(?:[-\w~!$ |\/.,*:;=]|%[a-f\d]{2})*)?/gi
// const convertLinks = str => {
//   return str.split(linkRegex).filter(part => part).map(part => {
//     if (linkRegex.test(part)) {
//       return <span dangerouslySetInnerHTML={{__html: part
//         .replace(linkRegex, `<a href="https://$&">$&</a>`)
//         .replace(/href="https:\/\/((?:ht|f)tp(?:s?)\:\/\/|~\/|\/)/i, `href="$1`)}}/>
//     } else {
//       return <span>{part}</span>
//     }
//   })
// }

// const linkRegex = /(?:https?:\/\/)?((?:\w+\.)+[\w:/?=&%#\+]{2,})/gi
// const convertLinks = str => {
//   // console.log(str.split(linkRegex).filter(part => part))
//   return str.split(linkRegex).filter(part => part).map((part, i) => {
//     if (linkRegex.test(part)) {
//       return <span key={i} dangerouslySetInnerHTML={{__html: part
//         .replace(linkRegex, `<a href="http://$1">$&</a>`)
//         .replace(/href="http:\/\/((?:ht|f)tp(?:s?)\:\/\/|~\/|\/)/i, `href="$1`)}}/>
//     } else {
//       return <span key={i}>{part}</span>
//     }
//   })
// }
