import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { meta } from 'src/lib/meta'
import { useE } from 'src/lib/hooks'
import { S } from 'src/lib/util'
import { usePageSettings } from 'src/lib/hooks_ext'


export default () => {
  meta.install.use()
  const [{icons}] = meta.manifest.use()
  const handle = {
    download: () => {
      meta.install.value?.prompt()
    },
  }

  useE(() => meta.manifest.set({...meta.manifest.get(), name:location.host}))

  usePageSettings({
    title: location.host,
  })
  return <Style>
  <InfoBody className='middle-column'>
      <a onClick={handle.download}>
        <img src={icons[0].src} style={S(`
        width: min(100%, 20em);
        border: 1px solid #000;
        background: #fff;
        `)}/>
      </a>
      <div style={S(`font-size: 2em;`)}>
        <InfoBadges labels={[
          meta.install.value ? { download: handle.download } : 'unable to download',
        ]} />
      </div>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.body {
  height: 100%;
}
`