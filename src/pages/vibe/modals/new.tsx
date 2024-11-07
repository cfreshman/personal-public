import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles, Loader } from '../../../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { asInput, useE, useF, useM, useR, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { S } from 'src/lib/util'
import { meta } from 'src/lib/meta'
import { Dangerous } from 'src/components/individual/Dangerous'
import { ACCENT } from '../style'
import { store } from 'src/lib/store'
import { MODALS } from '../common'
import { a_get_geo } from '../func/general'

const { named_log, truthy, defer, range, rand, colors, node, Q } = window as any
const NAME = 'vibe new'
const log = named_log(NAME)

const IMAGE_LIMIT = 3

// allow the user to post up to 3 images of their location
export default ({ handle }) => {

  const [location, set_location, fill_location] = asInput(store.use('vibe-location', { default:undefined }))
  const [images, set_images] = store.use('vibe-new-images', { default:[] })
  const [geo, set_geo] = useS(undefined)

  useF(async () => {
    // get users location
    const geo = await a_get_geo()
    if (geo.fake) {
      alert('you must enable location services to post')
      handle.set_path([])
      handle.set_modal(undefined)
    } else {
      set_geo(geo)
    }
  })

  // get user camera
  const [camera_on, set_camera_on] = useS(false)
  const r_camera_stream = useR()
  useF(() => {
    // request back camera
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(stream => {
      const video = Q('#vibe-video') as HTMLVideoElement
      video.srcObject = stream
      video.play()
      r_camera_stream.current = stream
      set_camera_on(true)
    })
  })
  useE(camera_on, () => {
    if (camera_on) {
      return () => {
        r_camera_stream.current.getTracks().forEach(x => x.stop())
      }
    }
  })

  const [post_next, set_post_next] = useS(false)
  handle = {
    ...handle,
    snap: () => {
      if (!camera_on) return
      // take interior square scaled to 512x512px of video
      const video = Q('#vibe-video') as HTMLVideoElement
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 512
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = false
      const { videoWidth:width, videoHeight:height } = video
      const size = Math.min(width, height)
      const x = (width - size) / 2
      const y = (height - size) / 2
      log({ size, x, y, width, height })
      ctx.drawImage(video, x, y, size, size, 0, 0, 512, 512)
      set_images([...images, canvas.toDataURL()])
    },
    post: async () => {
      const { post } = await api.post('/vibe/post/add', {
        location,
        data_urls: images,
        ...geo,
      })
      set_images([])
      set_location('')
      // handle.set_post_id(id)
      // handle.set_modal(MODALS.POST)
      handle.add_post(post)
      handle.set_path(['post', post.id])
    },
  }
  useF(post_next, () => post_next && handle.post())

  const [posting, set_posting] = useS(false)

  return posting 
  ? <div className='w100 h100 center'><div className='center-row spaced'>posting <Loader /></div></div>
  : <div className='w100 h100 column gap'>
    <InfoSection labels={[
      'share the vibe',
      !geo && 'geo needed',
      // geo && `${geo.lat.toFixed(3)}, ${geo.long.toFixed(3)}`,
    ]} className='column gap'>
      <input type='text' {...fill_location} placeholder='location name' style={S(`width:100%; min-width:256px`)} />
      {/* {images.length < 3 && <InfoBadges labels={[
        { 'add image': () => {
          const input = node('<input type="file" accept="image/*" multiple />')
          input.onchange = async () => {
            const files = Array.from<File>(input.files)
            // alert(files.map(f => f.name).join(', ') || 'no files selected')
            const urls = files.slice(0, 3 - images.length).map(file => URL.createObjectURL(file))

            // resize images to 512 max dimension
            const resize = (src) => new Promise(resolve => {
              const img = new Image()
              img.onload = () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                const max = 512
                const scale = Math.min(max / img.width, max / img.height)
                canvas.width = img.width * scale
                canvas.height = img.height * scale
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                resolve(canvas.toDataURL())
              }
              img.src = src
            })
            const resized = await Promise.all(urls.map(resize))

            set_images([...images, ...resized])
          }
          input.click()
        } },
      ]} />} */}
      {images.length ? <div className='middle-row w100 wrap' style={S(`
        max-height: 70vh;
        overflow: auto;
        background: ${ACCENT}22;
        // border: 1px solid ${ACCENT};
        background: linear-gradient(${ACCENT}11 0 0) #fff1;
        `)}>
        {images.map((src, i) => {
          return <div key={i} className='center' style={S(`
          height: 128px;
          width: 128px;
          `)}>
            <img src={src} style={S(`
            height: 100%;
            width: 100%;
            object-fit: cover;
            `)} />
            <div style={S(`position:absolute`)}>
              <InfoBadges labels={[
                { [`remove ${i+1}`]: () => set_images(images.filter((_, j) => i !== j)) },
              ]} />
            </div>
          </div>
        })}
      </div> : null}
      {true ? <>
        {/* use device camera to take photo of current vibe */}
        <div className='center' style={S(`
        width: 256px; height: 256px;
        background: ${ACCENT}22;
        // border: 1px solid ${ACCENT};
        background: linear-gradient(${ACCENT}11 0 0) #fff1;
        box-sizing: content-box;
        position: relative;
        cursor: pointer;
        user-select: none;
        ${images.length < IMAGE_LIMIT ? '' : 'display:none;'}
        `)} onClick={e => {
          handle.snap()
        }}>
          <video id='vibe-video' autoPlay playsInline muted style={S(`
          width: 256px;
          height: 256px;
          object-fit: cover;
          `)} />
          <div className='cover center' style={S(`
          color: #fff;
          text-shadow: 2px 2px 0 #000;
          `)}>{camera_on ? 'tap to capture' : 'waiting for camera'}</div>
        </div>
        
        {/* <InfoBadges labels={[
          { 'snap': () => {
            // take interior square scaled to 512x512px of video
            const video = Q('#vibe-video') as HTMLVideoElement
            const canvas = document.createElement('canvas')
            canvas.width = canvas.height = 512
            const ctx = canvas.getContext('2d')
            const { width, height } = video
            const size = Math.min(width, height)
            const x = (width - size) / 2
            const y = (height - size) / 2
            ctx.drawImage(video, x, y, size, size, 0, 0, 512, 512)
            set_images([...images, canvas.toDataURL()])
          } },
        ]} /> */}
      </> : null}
    </InfoSection>
    {/* <div className='wide tall center'>
      <div className='accented'>coming soon 📸</div>
    </div> */}
    <div className='spacer' />
    <div className='row wide between'>
      <InfoBadges nowrap labels={[
        { cancel: () => handle.set_modal(undefined) },
      ]} />
      <InfoBadges nowrap labels={[
        { post: () => {
          if (!images.length) {
            handle.snap()
          }
          if (!location) {
            // prompt for location
            const new_location = prompt('enter location name')
            if (!new_location) return
            set_location(new_location)
          }
          set_post_next(true)
        } },
      ]} />
    </div>
  </div>
}