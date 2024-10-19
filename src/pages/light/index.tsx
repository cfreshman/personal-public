import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from '../../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import url from 'src/lib/url'
import { EditPage } from './page/edit_page'
import { PostPage } from './page/post_page'
import { S } from 'src/lib/util'
import { HomePage } from './page/home_page'
import { Scroller } from 'src/components/Scroller'
import { ProfilePage } from './page/profile_page'

const { named_log, devices } = window as any
const NAME = 'light'
const log = named_log(NAME)

export default () => {

  const [{user:viewer, expand}] = auth.use()

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
  }) as [['home'|'profile'|'new'|'post', string], any]

  const title = useM(page, () => {
    if (page === 'home') return 'home'
    if (page === 'profile') return 'profile'
    if (page === 'new') return 'new'
    if (page === 'post') return 'post'
  })

  const handle = {
    send: async ({ text, parent }) => {
      const { data:post } = await api.post(`/light/post`, { text, parent })
      return post.id
    },
  }

  usePageSettings({
    expand: !devices.is_mobile,
  })
  return <Style id='light'>
    <InfoBody className='column tall'>
      {expand ? <InfoSection labels={[
        NAME,
        title,
      ]} /> : null}
      <InfoSection id="light-container" className='column grow' style={S(`height:0; overflow:auto`)}>
        <Scroller scrollBarSelector='#light' />
        {page === 'profile' ? <ProfilePage {...{ id, handle }} />
        : page === 'new' ? <EditPage {...{ handle }} />
        : page === 'post' ? <PostPage {...{ id, handle }} />
        : page === 'home' ? <HomePage {...{ handle }} />
        : null}
      </InfoSection>
      {!viewer ? null 
      : <InfoSection>
        <InfoBadges labels={[
          { home: () => url.push('/light/home'), label: page === 'home' },
          { profile: () => url.push(`/light/@${viewer}`), label: page === 'profile' && id === viewer },
          { new: () => url.push('/light/new'), label: page === 'new' },
        ]} />
      </InfoSection>}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`&#light{
overflow-x: hidden;
#light-container > :not(.badges) {
  width: 100%;
}
.light-profile, .light-edit, .light-post {
  border: 1px solid currentcolor;
  padding: .25em;
  width: -webkit-fill-available;

  &:not(.light-light) {
    margin-bottom: 2px;
    box-shadow: 0 2px currentcolor;
  }
}

.light-content {
  font-family: monospace;
}
  
.light-edit {
  textarea, input[type=text] {
    // border: none !important;
    border-radius: 0;
    padding: .25em;
    // background: var(--id-color-text-readable) !important;

    background: var(--id-color) !important;
    border: 1px dashed var(--id-color-text) !important;
    /* ANNOYING FIX FOR CSS ISSUE - left border is hidden without this */
    margin-left: .5px;
    width: calc(100% - 1px);

    &, &::placeholder {
      color: var(--id-color-text) !important;
      font-size: max(1em, 16px) !important;
    }
  }
}

.light-post-rich {
  width: -webkit-fill-available;
  position: relative;
  .light-post-rich-title {
    position: absolute;
    bottom: 0; right: 0; margin: 2px;
    background: var(--id-color-text);
    color: var(--id-color-text-readable);
    padding: 0;
  }
}

}`