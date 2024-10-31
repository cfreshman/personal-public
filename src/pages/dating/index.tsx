import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from '../../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { openLogin } from 'src/lib/auth'
import url from 'src/lib/url'
import Edit from './edit'
import Profile from './profile'
import { server } from 'src/lib/util'
import { Style } from './style'

const { named_log, devices } = window as any
const NAME = 'dating <3'
const log = named_log(NAME)

const INTERESTS = [
  "technology",
  "gaming",
  "books",
  "fitness",
  "travel",
  "cooking",
  "arts",
  "music",
  "movies",
  "environment",
  "science",
  "history",
  "self-help",
  "fashion",
  "photography",
  "pets",
  "sports",
  "languages",
  "game dev",
  "DIY",
  "podcasts",
  "cars",
  "space",
  "VR",
  "crypto",
  "AI",
  "gardening",
  "astronomy",
  "writing",
  "animation",
]

export default () => {

  const [{user:viewer}] = auth.use()
  const [dating_pro, set_dating_pro] = useS(undefined)
  useF(async () => {
    const { data } = await api.post(`/dating/user`)
    set_dating_pro(data)
  })

  const [[page, id], set_path] = usePathState({
    from: (path) => {
      return path.split('/')
    },
    to: ([page, id]) => {
      return [page, id].filter(x=>x).join('/')
    },
  })

  const handle = {}

  usePageSettings({
    expand:true,
  })
  return <Style id='dating'>
    <InfoBody className='column'>
      <InfoSection labels={[
        NAME,
        page,
        id,
        page && { 'back to menu': () => {
          url.push('/dating')
        } }
      ]} />
      {page === 'edit' ? <Edit {...{ viewer, handle }} />
      : page === 'profile' ? <Profile {...{ viewer, user:id||viewer, handle }} />
      : <>
        <InfoSection>
          <div className='pre'>
            <div>• write a bio</div>
            <div>• upload 3-14 photos & label them</div>
            <div>• set your location & preferences</div>
            <div>• add your most recent STI test</div>
            <div>• get a relationship</div>
            <div>&nbsp;</div>
            <div className='column gap'>
              {dating_pro?.notify ? <div>you'll be notified when /dating is ready</div> : <div>not ready yet. get a notification at 100+ users:</div>}
              <div className='column gap'>
                <InfoBadges labels={[
                  !dating_pro?.notify && { 'notify me': async () => {
                    log('notify user')
                    if (viewer) {
                      const { data } = await api.post(`/dating/notify`)
                      log('notified', {data})
                      set_dating_pro(data)
                    } else {
                      openLogin()
                    }
                  } },
                  dating_pro?.notify && {
                    'edit profile': () => url.push('/dating/edit'),
                  },
                  dating_pro?.notify && {
                    'view profile': () => url.push('/dating/profile'),
                    // 'view profile': () => {
                    //   url.new(`${server}/api/dating/view/${viewer}`)
                    // },
                  },
                ]} />
              </div>
            </div>
          </div>
        </InfoSection>
      </>}
    </InfoBody>
  </Style>
}
