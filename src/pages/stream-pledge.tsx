import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles, Multiline } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { asInput, useF, useM, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { S } from 'src/lib/util'
import url from 'src/lib/url'
import { store } from 'src/lib/store'
import { openLogin } from 'src/lib/auth'

const { named_log, copy, display_status, range, rand } = window as any
const NAME = 'stream-pledge'
const log = named_log(NAME)

export default () => {

  const [{user:viewer}] = auth.use()
  const [user, set_user] = usePathState()
  const [sp_pro, set_sp_pro] = useS(undefined)

  const [unsaved, set_unsaved] = useS(false)
  const [email, set_email, fill_email] = asInput(useS(''))

  const handle = {
    load_sp_pro: async () => {
      const { data } = await api.post(`/stream-pledge/${user}`)
      log('load_sp_pro', data)
      set_sp_pro(data)
      set_unsaved(false)
    },
    update_sp_pro: (changes) => {
      set_sp_pro({ ...sp_pro, ...changes })
      set_unsaved(true)
    },
    save_sp_pro: async () => {
      const { success, data:new_data } = await api.post(`/stream-pledge/${viewer}/set`, { data:sp_pro })
      set_sp_pro(new_data)
      set_unsaved(!success)
      return success
    },
    pledge: async () => {
      if (!email) return alert('please enter your email')
      const { success } = await api.post(`/stream-pledge/${user}/pledge`, { email })
      if (success) {
        set_email('')
        alert(`pledged! you will be notified when ${user} hits their goal`)
      } else {
        alert('error while pledging - contact me')
      }
    },
  }
  useF(user, handle.load_sp_pro)

  const self = viewer && viewer === user

  const stars = useM(() => range(1_000).map(i => ({ x:rand.f(100), y:rand.f(100), a:rand.f(360) })))

  usePageSettings({
    expand:true,
    professional:true,
  })
  useStyle(`
  #header {
    border-bottom: 1px solid currentcolor !important;
  }
  `)
  return <Style>
    <InfoBody>
      <div id='sp-container' className={user && !self ? `center` : 'center'}>
        {!user ? <>
          <InfoSection labels={[NAME]}>
            <div className='column spaced wide'>
              <div>
                it's hard to start streaming
              </div>
              <div>
                /stream-pledge makes it easier!
              </div>
              <div>
                wait to start until 10 people have pledged to watch your stream
                {'\n'}
                your pledgers will be notified with your stream link and schedule
              </div>
              <div>
                <InfoBadges labels={[
                  viewer
                  ? { 'create your pledge page!': () => url.push(`/stream-pledge/${viewer}`) }
                  : { 'log in to create your pledge page': () => openLogin() },
                ]} />
              </div>
            </div>
          </InfoSection>
        </>
        : !sp_pro ? <InfoSection>loading {user}'s /stream_pledge...</InfoSection>
        : !self ? <>
          <InfoSection labels={[`pledge to watch ${user}`]}>
            <div><b>{user}</b> will start streaming when they hit <b>{sp_pro.goal}</b> pledges!</div>
            <div>link: <b><A href={sp_pro.link} /></b></div>
            {sp_pro.schedule ? <div className='column gap wide'>
              <span>schedule:</span>
              <span style={S(`
              width: 100%;
              border: 1px dashed currentcolor;
              border-radius: .25em;
              padding: .25em;
              text-align: left;
              white-space: pre-wrap;
              `)}>{sp_pro.schedule}</span>
            </div> : null}
            <HalfLine />
            <div className='column wide gap'>
              enter your email to pledge:
              <div className='row wide'>
                <input type='email' className='grow' placeholder='name@example.com' {...fill_email} onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handle.pledge()
                  }
                }} />
              </div>
            </div>
            <InfoBadges labels={[
              { [`pledge to watch ${user}`]: async () => {
                handle.pledge()
              } },
            ]} />
          </InfoSection>
        </>
        : <>
          <InfoSection labels={[`pledge to watch ${user}`]}>
            <div className='center-row spaced wide'>goal: <input 
            type='number' min={1} max={100}
            value={sp_pro.goal} onChange={e => handle.update_sp_pro({ goal:e.target.value })} 
            /> pledges</div>
            <div className='center-row spaced wide'>link: <input 
            type='text' value={sp_pro.link} 
            onChange={e => handle.update_sp_pro({ link:e.target.value.replace('www.twitch', 'twitch') })} className='grow' 
            /></div>
            <div className='column gap wide'>
              <span>schedule:</span>
              <Multiline
              placeholder={'monday 8pm\nwednesday 8pm\nfriday 8pm\nOR\nsubscribe on twitch to know when i go live'}
              value={sp_pro.schedule} 
              setValue={new_value => handle.update_sp_pro({ schedule:new_value })} />
            </div>
            <div className='center-row spaced wide'>decoration: <input 
            type='text' value={sp_pro.decoration} placeholder='⭐️'
            onChange={e => handle.update_sp_pro({ decoration:e.target.value })}
            /></div>
            <HalfLine />
            <InfoBadges labels={[
              !unsaved && { 'copy link': e => {
                copy(location.href)
                display_status(e.target, 'copied!')
                navigator.share({ url: location.href })
              } },
              unsaved && 'you have unsaved changes:',
              unsaved && { 'reset': async () => {
                await handle.load_sp_pro()
              } },
              unsaved && 'or',
              unsaved && { [`update pledge page`]: async () => {
                const success = await handle.save_sp_pro()
                if (!success) alert('unable to save - contact me')
              } },
            ]} />
          </InfoSection>
        </>}
      </div>
    </InfoBody>

    {stars.map(({ x, y, a }) => <div className='sp-star' style={S(`top:${y}%; left:${x}%; rotate: ${a}deg; user-select:none`)}>{sp_pro?.decoration||'⭐️'}</div>)}
  </Style>
}

const Style = styled(InfoStyles)`
position: relative;
overflow: hidden;
.sp-star {
  position: absolute;
  height: 0; width: 0;
  display: flex; align-items: center; justify-content: center;
}

input {
  width: fit-content !important;
}

#sp-container {
  height:100%; width:100%; overflow:hidden;
  text-align:left;
  
  &.sp-center {
    display:flex; align-items:center; justify-content:center;
  }

  > .section {
    border: 1px solid currentcolor;
    border-radius: .25em;
    padding: .25em;
    white-space: pre-line;
    background: var(--id-color-text-readable);

    position: relative;
    z-index: 1;
  }

  textarea {
    // border: 1px dashed currentcolor !important;
    background: var(--id-color-text) !important;
    color: var(--id-color-text-readable) !important;
    border: none !important;
    border-radius: 0 !important;
    &::placeholder {
      color: inherit !important;
      opacity: .5 !important;
    }
  }
}
`