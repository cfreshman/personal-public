import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles, Multiline, Select } from '../../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { openLogin } from 'src/lib/auth'
import { S } from 'src/lib/util'
import url from 'src/lib/url'

const { named_log, duration, values, defer, node } = window as any
const NAME = 'dating edit'
const log = named_log(NAME)

// id: string-id
// user: string-user
// name: string
// sex: string
// birthday: number
// location: { type:"Point", coordinates:[number, number] }
// sti: number
// bio: string
// photos: { url:string-url, label:string }[]
// preferences: { sex:string, age:[number-timedelta, number-timedelta], local:boolean, miles:number|false }
// hidden: boolean

const SEX = {
  MALE: 'male',
  FEMALE: 'female',
}
const MATCH_SEX = {
  MALE: 'male',
  FEMALE: 'female',
  ANY: 'any',
}
const PHOTOS_MAX = 14

export default ({ viewer, handle }) => {

  const [dating_profile, set_dating_profile] = useS(undefined)

  handle = {
    ...handle,
    load_dating_profile: async () => {
      const { data } = await api.post(`/dating/profile/${viewer}`)
      set_dating_profile(data)
    }
  }
  useF(viewer, handle.load_dating_profile)

  const gen_input_fill = (field) => {
    const setValue = new_value => set_dating_profile({ ...dating_profile, [field]:new_value })
    return {
      value: dating_profile[field],
      setValue,
      onChange: e => setValue(e.target.value),
    }
  }
  const gen_preferences_input_fill = (field) => {
    const setValue = new_value => set_dating_profile({ ...dating_profile, preferences: { ...dating_profile.preferences, [field]:new_value } })
    return {
      value: dating_profile.preferences[field],
      setValue,
      onChange: e => setValue(e.target.value),
    }
  }

  const nav_badges = () => <InfoBadges labels={[
    { 'cancel': async () => {
      await handle.load_dating_profile()
      defer(() => {
        const to_menu = confirm('profile reset - back to menu?')
        to_menu && url.push('/dating')
      })
    } },
    'or',
    { 'save changes': async () => {
      const { data } = await api.post(`/dating/profile`, { data:dating_profile })
      set_dating_profile(data)
      const to_menu = confirm('profile saved - back to menu?')
      to_menu && url.push('/dating')
    } },
  ]} />

  return <>
    <InfoSection>
      {dating_profile ? <div className='column wide' style={S(`gap: .5em;`)}>
        {nav_badges()}
        <div><b>@{viewer}</b></div>
        <div className='center-row'>name:&nbsp;<input type='text' {...gen_input_fill('name')} placeholder={`@${viewer}`} /></div>
        <div className='center-row'>sex:&nbsp;<Select {...gen_input_fill('sex')} options={values(SEX)} /></div>
        <div className='center-row'>birthday:&nbsp;<input type='date' {...gen_input_fill('birthday')} /></div>
        <div className='bordered column wide gap'>
          location:
          <InfoBadges labels={[
            { 'update location': e => {
              e.target.textContent = 'updating...'
              navigator.geolocation.getCurrentPosition((position) => {
                set_dating_profile({ ...dating_profile, location: { type:"Point", coordinates:[position.coords.latitude, position.coords.longitude] } })
                e.target.textContent = 'update location'
              })
            } },
            dating_profile.location ? { 'remove location': () => set_dating_profile({ ...dating_profile, location:undefined }) } : null,
          ]} />
          {dating_profile.location ? <div>latitude: {dating_profile.location.coordinates[0]}, longitude: {dating_profile.location.coordinates[1]}</div>
          : 'no location set'} 
        </div>
        <div className='center-row'>last full STI test:&nbsp;<input type='date' {...gen_input_fill('sti')} /></div>
        <div className='column wide'>
          bio:
          <Multiline rows={3} {...gen_input_fill('bio')} />
        </div>
        <div className='bordered column wide gap'>
          photos:
          <div className='row wide gap wrap' style={S(`column-gap: .5em;`)}>
            {dating_profile.photos.map(({ url, label }, i, arr) => {
              return <div className='column gap'>
                <img src={url} style={S(`height: 10em`)} />
                <div className='row'>
                  ↳&nbsp;<input type='text' placeholder='add label' value={label} onChange={e => {
                    const new_photos = dating_profile.photos.slice()
                    new_photos[i] = { ...new_photos[i], label:e.target.value }
                    set_dating_profile({ ...dating_profile, photos:new_photos })
                  }} />
                </div>
                <div className='row'>
                  ↳&nbsp;<InfoBadges labels={[
                    { 'delete': () => {
                      const new_photos = dating_profile.photos.slice().filter((_, j) => j !== i)
                      set_dating_profile({ ...dating_profile, photos:new_photos })
                    } },
                    i > 0 && { 'move up': () => {
                      const new_photos = dating_profile.photos.slice()
                      const temp = new_photos[i]
                      new_photos[i] = new_photos[i - 1]
                      new_photos[i - 1] = temp
                      set_dating_profile({ ...dating_profile, photos:new_photos })
                    } },
                    i < arr.length - 1 && { 'move down': () => {
                      const new_photos = dating_profile.photos.slice()
                      const temp = new_photos[i]
                      new_photos[i] = new_photos[i + 1]
                      new_photos[i + 1] = temp
                      set_dating_profile({ ...dating_profile, photos:new_photos })
                    } },
                  ]} />
                </div>
              </div>
            })}
          </div>
          {dating_profile.photos.length < PHOTOS_MAX ? <div>
            <InfoBadges labels={[
              { 'add photo': () => {
                const input = node('<input type=file accept="image/*"></input>')
                input.onchange = async e => {
                  const file = input.files[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = async e => {
                      const img = node('img')
                      img.onload = () => {
                        const canvas = node('canvas')
                        const ctx = canvas.getContext('2d')
                        // scale image to 1024 max dimension
                        const scale = Math.min(1024 / img.width, 1024 / img.height)
                        canvas.width = img.width * scale
                        canvas.height = img.height * scale
                        ctx.imageSmoothingEnabled = false
                        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height)
                        set_dating_profile({ ...dating_profile, photos:[...dating_profile.photos, { url:canvas.toDataURL() }] })
                      }
                      img.src = reader.result
                    }
                    reader.readAsDataURL(file)
                  }
                }
                input.click()
              } },
            ]} />
          </div> : null}
        </div>
        <div className='bordered column gap wide'>
          match preferences:
          <div className='center-row wide'>sex:&nbsp;<Select {...gen_preferences_input_fill('sex')} options={values(MATCH_SEX)} /></div>
          <div className='center-row wide'>years below:&nbsp;<input type='number' {...gen_preferences_input_fill('years_below')} min={1} /></div>
          <div className='center-row wide'>years above:&nbsp;<input type='number' {...gen_preferences_input_fill('years_above')} min={1} /></div>
          {dating_profile.location ? <>
            <div><input type='checkbox' checked={dating_profile.preferences.local} onChange={e => {
              set_dating_profile({ ...dating_profile, preferences: { ...dating_profile.preferences, local:e.target.checked } })
            }} /> match by location</div>
            {dating_profile.preferences.local ? <div className='center-row wide'>miles away:&nbsp;<input type='number' {...gen_preferences_input_fill('miles')} /></div> : null}
          </> : null}
        </div>
        <HalfLine />
        {nav_badges()}
      </div> : 'loading your /dating profile...'}
    </InfoSection>
  </>
}
