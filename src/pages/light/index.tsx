import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from '../../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import url from 'src/lib/url'
import { EditPage } from './page/edit_page'
import { PostPage } from './page/post_page'
import { S } from 'src/lib/util'
import { HomePage } from './page/home_page'
import { Scroller } from 'src/components/Scroller'
import { ProfilePage } from './page/profile_page'
import { Style } from './style'
import { use_light_profile, use_profile } from './func/profile'
import { FriendsPage } from './page/friends_page'
import { meta } from 'src/lib/meta'
import { openLogin } from 'src/lib/auth'
import { open_popup } from './func/general'
import Edit from './ui/edit'

const { named_log, devices, colors } = window as any
const NAME = 'light'
const log = named_log(NAME)

export default () => {

  const [{user:viewer, expand}] = auth.use()
  const { profile, reload_profile:load_profile } = use_profile({ user:viewer })
  const { light_profile, reload_light_profile:load_light_profile } = use_light_profile({ user:viewer })

  const [[page, id], set_path] = usePathState({
    from: (path) => {
      if (!path) return ['home', undefined]
      if (path[0] === '@') return ['profile', path.slice(1)]
      return path.split('/')
    },
    to: ([page, id]) => {
      if (page === 'profile') return `@${id}`
      return [page === 'home' ? '' : page, id].filter(x => x).join('/')
    },
  }) as [['home'|'friends'|'profile'|'new'|'post', string], any]

  const title = useM(page, () => {
    // no special cases yet
    return page
  })

  const handle = {
    data: { profile, light_profile },
    load_profile, load_light_profile,
    send: async ({ text, parent }) => {
      const { data:post } = await api.post(`/light/post`, { text, parent })
      return post.id
    },
  }

  useF(viewer, page, () => {
    if (!viewer && ['friends', 'new'].includes(page)) {
      url.replace(`/light`)
    }
  })

  usePageSettings({
    expand: !devices.is_mobile,
  })
  const [label_color] = meta.theme_color.as((theme_color) => {
    const label_hex = colors.hex_readable(colors.to_hex(theme_color))
    const [r, g, b] = colors.hex_to_rgb(label_hex)
    return `rgba(${r},${g},${b},0.125)`
  })
  useStyle(`
  #light {
    --id-color-label: ${label_color};
  }
  `)
  return <Style id='light'>
    <InfoBody className='column tall'>
      {expand ? <InfoSection labels={[
        NAME,
        title,
      ]} /> : null}
      <InfoSection id="light-container" className='column grow' style={S(`height:0; overflow:auto`)}>
        <Scroller />
        {page === 'profile' ? <ProfilePage {...{ id, handle }} />
        : page === 'new' ? <EditPage {...{ handle }} />
        : page === 'post' ? <PostPage {...{ id, handle }} />
        : page === 'home' ? <HomePage {...{ handle }} />
        : page === 'friends' ? <FriendsPage {...{ handle }} />
        : null}
      </InfoSection>
      {!viewer ? <InfoSection>
        <InfoBadges labels={[
          { text:'log in to interact', func: () => openLogin() },
        ]} />
      </InfoSection> 
      : <InfoSection>
        <InfoBadges labels={[
          // { home: () => url.push('/light/home'), label: page === 'home' },
          // { profile: () => url.push(`/light/@${viewer}`), label: page === 'profile' && id === viewer },
          // { new: () => url.push('/light/new'), label: page === 'new' },
          { text:'all', href:'/light/home', label: page === 'home' },
          { text:'friends', href:'/light/friends', label: page === 'friends' },
          { text:'yours', href:`/light/@${viewer}`, label: page === 'profile' && id === viewer },
          // { text:'new', href:'/light/new', label: page === 'new' },
          { text:'new', func:() => {
            open_popup(close => <Edit {...{ handle, close }} />)
          } },
        ]} />
      </InfoSection>}
    </InfoBody>
  </Style>
}
