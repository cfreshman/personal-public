import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles } from '../../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useInline, useM, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { Style } from './style'
import AppItem from './ui/AppItem'
import url from 'src/lib/url'
import { S } from 'src/lib/util'
import { Rating, Stars } from './ui/common'
import AppEdit from './ui/AppEdit'
import AppView from './ui/AppView'
import AppList from './ui/AppList'

const { named_log, range, values, truthy, devices } = window as any
const NAME = 'was'
const log = named_log(NAME)

export default () => {
  const [a] = auth.use()
  let [[id='', option='']] = usePathState({
    from: (path) => path.split('/'),
    to: (parts) => parts.join('/'),
  })
  const id_modes = useM(id, () => {
    return {
      edit: id === 'edit',
      manage: id === 'manage',
      ranked: id === '',
      new: id === 'new',
    }
  })
  option = useM(option, id_modes, () => {
    if (values(id_modes).some(truthy)) return id
    return option
  })
  id = useM(id, id_modes, () => {
    if (values(id_modes).some(truthy)) return ''
    return id
  })
  const modes = useM(id_modes, option, () => {
    return { ...id_modes, [option]: true }
  })
  useF(id, option, () => log({id, option}))

  const [apps, set_apps] = useS<any>(undefined && [{
    id: 'test',
    name: '/greeter',
    url: 'https://freshman.dev/greeter',
    user: 'freshman',
    title: 'a social diary',
    icon: 'https://freshman.dev/raw/greeter/icon.png',
    description: 'share how you first met friends - and log everyday hangouts!',
    rating: { total: 9, count: 2 },
  }, {
    id: 'test2',
    name: '/wordbase',
    url: 'https://freshman.dev/wordbase',
    user: 'cyrus',
    title: 'a word game',
    icon: 'https://freshman.dev/raw/wordbase/icon-large.png',
    description: 'a turn-based multiplayer word strategy game',
    rating: { total: 4, count: 1 },
  }, {
    id: 'test3',
    name: '/lettercomb',
    url: 'https://freshman.dev/lettercomb',
    user: 'cyrus',
    title: 'a word game',
    icon: 'https://freshman.dev/raw/capitals/icon.png',
    description: 'a turn-based multiplayer word strategy game',
    rating: { total: 5, count: 1 },
  }, {
    id: 'test4',
    name: '/letterpress',
    url: 'https://freshman.dev/letterpress',
    user: 'cyrus',
    title: 'a word game',
    icon: 'https://freshman.dev/raw/letterpress/icon-large.png',
    description: 'a turn-based multiplayer word strategy game',
    rating: { total: 5, count: 1 },
  }])
  useInline(apps, () => {
    apps?.map(app => {
      app.rating.value = app.rating.total / (app.rating.count || 1)
    })
  })
  // const [users, set_users] = useS<any>({
  //   cyrus: {
  //     user: 'cyrus',
  //   },
  //   freshman: {
  //     user: 'freshman',
  //     name: 'cyrus',
  //   },
  // })
  const users = useM(apps, () => {
    const users = {}
    apps?.map(app => {
      users[app.user] = users[app.user] || { user: app.user }
    })
    return users
  })
  useInline(users, () => {
    Object.values<any>(users).map(user => {
      user.name = user.name || user.user
    })
  })

  const app = useM(id, apps, () => apps?.find(app => app.id === id))

  const handle = {
    a,
    id, option, modes,
    to: (new_id='', new_option='') => url.push(new_option ? `/web-app-store/${new_id || '-'}/${new_option}` : `/web-app-store/${new_id}`),
    new: (new_id='', new_option='') => url.new(new_option ? `/web-app-store/${new_id || '-'}/${new_option}` : `/web-app-store/${new_id}`),
    nav: (e, new_id='', new_option='') => {
      if (e?.metaKey) handle.new(new_id, new_option)
      else handle.to(new_id, new_option)
    },
    apps, app, users,
    load_apps: async () => {
      const { list } = await api.get('/was')
      log({list})
      set_apps(list)
    },
    set_app: (ob) => {
      const existing = apps.find(app => app.id === ob.id)
      if (existing) {
        Object.assign(existing, ob)
        set_apps(apps.slice())
      } else {
        set_apps([...apps, ob])
      }
    },
    del_app: (id) => {
      set_apps(apps.filter(app => app.id !== id))
    },
  }
  useF(handle.load_apps)

  usePageSettings({
    professional: true,
    // icon:'https://freshman.dev/raw/images/icon-was-4.png',
    icon: '/raw/images/icon-was-5.png',
    title: 'web-app-store',
    manifest: {
      name: 'web-app-store',
      start_url: '/web-app-store',
      icon: '/raw/images/icon-was-5.png',
      display: 'standalone',
      background_color: '#eeebe6',
    },
  })
  useStyle(`
  #index#index {
    margin: 0 !important;
    height: 100% !important;
    width: 100% !important;
  }
  #inner-index#inner-index {
    border: 0 !important;
  }
  #web-app-store {
    max-width: unset !important;
    width: 100vw !important;
  }`)
  return <Style id='web-app-store' className={`${devices.is_mobile ? 'mobile' : ''}`}>
    <InfoBody>
      {modes.edit ? <AppEdit {...{ handle }} /> : 
      app ? <AppView {...{ app, handle } } /> : 
      <AppList {...{ handle }} />}
    </InfoBody>
  </Style>
}