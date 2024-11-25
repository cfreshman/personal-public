import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoFile, InfoSection, InfoStyles, Loader } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useR, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import url from 'src/lib/url'
import { S, server } from 'src/lib/util'
import { openLogin } from 'src/lib/auth'

const { named_log, copy, display_status, download, defer } = window as any
const NAME = 'x'
const log = named_log(NAME)

// 1MB file limit
const FILE_LIMIT = 1024 * 1024

export default () => {
  const [a] = auth.use()
  const x_url = `${a.user || 'LOGIN'}.x.tu.fo`

  const [id] = usePathState()
  useF(id, async () => {
    if (id) {
      location.href = server + `/api/x/html/${id}`
    }
  })

  const [x, set_x] = useS(undefined)
  useF(a.user, async () => {
    if (a.user) {
      const { data } = await api.post(`/x/item/get`)
      log('x item', { data })
      set_x(data)
    } else {
      set_x(undefined)
    }
  })
  
  const [file, set_file] = useS(undefined)
  const [error, set_error] = useS(undefined)
  const r_frame = useR()
  
  const handle = {
    file: async (file: File) => {
      if (file.size > FILE_LIMIT) {
        set_error('file too large')
        return
      }
      set_file(file)
      const { data } = await api.post(`/x/item/add`, file, { headers: { 'Content-Type': file.type || 'multipart/form-data' } })
      log({ data })
      set_x(data)
      set_file(undefined)
      if (r_frame.current) r_frame.current.src = server + `/api/x/html/${data.id}`
    },
    icon: async (file: File) => {
      // read image file and resize to 128x128
      const reader = new FileReader()
      reader.onload = async e => {
        const img = new Image()
        img.onload = async () => {
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 128
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 128, 128)
          const { data } = await api.post(`/x/item/icon`, { dataurl:canvas.toDataURL() })
          set_x(data)
        }
        img.src = e.target.result as string
      }
      reader.readAsDataURL(file)
    },
    download: async () => {
      const response = await api.get(`/x/html/${x.id}`)
      download(response, `${x.id}.html`)
    }
  }
  useF(id, () => set_error(undefined))

  usePageSettings({
    professional: true,
  })
  return <Style id='list-picker' className='tall wide' onDrop={async e => {
    e.preventDefault()
    handle.file(e.dataTransfer.items[0].getAsFile())
  }} onDragOver={e => e.preventDefault()}>
    <InfoBody className='column'>
      {error ? <>
        <span style={S(`color:red; font-weight:bold`)}>{error}</span>
      </> : null}
      {x ? <>
        <InfoSection labels={[]} className='column h100 w100'>
          <InfoBadges labels={[
            <InfoFile label='replace' hide_name setValue={handle.file} className='large' /> as any,
            { 'delete': () => {
              if (confirm('are you sure you want to delete your html file?')) {
                api.post(`/x/item/del`, { id: x.id })
                set_x(undefined)
              }
            } },
            { 'download': handle.download },
            <InfoFile label='icon' image hide_name setValue={handle.icon} className='large' /> as any,
            x.icon && {
              text: <img src={x.icon} style={S(`
              width: 1.5em;
              height: 1.5em;
              `)} />,
              func: async () => {
                if (confirm('delete your website icon?')) {
                  const { data } = await api.post(`/x/item/icon`, { dataurl:null })
                  set_x(data)
                }
              }
            },
            { 'share': e => {
              const full_url = 'http://'+x_url
              copy(full_url)
              display_status(e.target, 'copied!')
              navigator.share({
                url: full_url,
              })
            } },
          ]} />
          <iframe ref={r_frame} src={server + `/api/x/html/${x.id}`} className='grow wide' style={S(`
          border: 1px solid currentcolor;
          `)} />
        </InfoSection>
      </> : <>
        <InfoSection labels={[]} className='column h100 w100'>
          <div className='spacer' />
          <div className='center-column wide gap'>
            <div className='center-row spaced'>{file ? <>uploading <Loader color='#fff' /></> : <>host a one-page website at {x_url}!</>}</div>
            {a.user
            ? <InfoFile label='SELECT HTML FILE' setValue={handle.file} className='large' />
            : <InfoBadges className='large' labels={[
              { 'log in to upload': () => openLogin() },
            ]} />}
            <div className='center-row spaced small'>
              (1MB limit)
            </div>
          </div>
          <div className='spacer' />
        </InfoSection>
      </>}
    </InfoBody>
  </Style>
}

const common_css = `
input, select {
  height: 1.5em;
  font-size: 1em;
  border: 1px solid currentcolor;
  border-radius: .25em;
  &[type=number] {
    max-width: 5em;
  }
}

ul {
  padding-left: 1em;
}

button {
  color: var(--id-color-text);
  border-radius: 10em;
  border: 1px solid var(--id-color-text);
  box-shadow: 0 1px var(--id-color-text);
  min-width: 2em;
  display: flex; align-items: center; justify-content: center;
  translate: 0 -1px;
  &:not(:disabled) {
    cursor: pointer;
    &:active, &.active {
      translate: 0;
      box-shadow: none;
    }
  }
  &:disabled {
    cursor: default;
    color: #888;
    // background: #ccc;
  }
  min-height: 1.5em;
  padding: 0 .67em;
}

.section.h100 {
  margin: 0;
}

.large {
  font-size: 1.5em !important;
}
.small {
  font-size: .75em !important;
}

--id-color: #eee;
--id-color-text: #222;
--id-color-text-readable: #eee;
background: var(--id-color) !important;
color: var(--id-color-text) !important;
padding: .5em;
font-family: monospace;
`
const Style = styled(InfoStyles)`
margin: .5em;
width: calc(100% - 1em);
height: calc(100% - 1em);
border: 1px solid #000;
border-radius: .25em;

${common_css}

box-shadow: none !important; /* to undo expand style (bad code) */
`
const PopupStyle = styled(InfoStyles)`
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);
${common_css}
`