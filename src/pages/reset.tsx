import React, { Fragment, useState } from 'react'
import { convertLinks } from '../lib/render'
import { InfoBadges, InfoBody, InfoLoginBlock, InfoSection, InfoStyles } from '../components/Info'
import api from '../lib/api'
import { sha256 } from '../lib/encrypt'
import { useF, useR } from '../lib/hooks'
import { useAuth, usePageSettings, usePathState } from '../lib/hooks_ext'
import { fromHash } from '../lib/util'

// user is either logged in or sent a link to /reset/user#token

export default () => {
  const auth = useAuth()
  const token = fromHash()
  const [user, setUser] = usePathState({ sep: '/#' })

  const passRef = useR()
  const [sent, setSent] = useState(false)
  const [msg, setMsg] = useState('')

  useF(auth.user, () => auth.user && setUser(auth.user))
  const handle = {
    reset: () => {
      const pass = passRef.current.value
      if (pass) {
        setSent(true)
        sha256(pass).then(hash => {
          if (auth.user) {
            api.post('reset/user', { pass: hash })
            .then(() => setMsg('password updated\nview all /settings'))
          } else {
            api.post('reset/token', { user, token, pass: hash })
            .then(() => setMsg('password updated, logged in\nview all /settings'))
            .catch(() => setMsg('invalid token, try logging in again'))
          }
        })
      }
    },
  }

  usePageSettings()
  return <InfoLoginBlock to='update password' user={user}><InfoStyles>
    <InfoBody>
      <InfoSection label='user'>{user}</InfoSection>
      <InfoSection label='new password' className='edit-container'>
        <input ref={passRef} type='password' placeholder='password'
            readOnly={sent}
            onKeyDown={e => e.key === 'Enter' && handle.reset()}/>
          {/* {sent?'': <span className='button' onClick={handle.reset}>update</span>} */}
          {sent?'': <InfoBadges labels={[
            { 'update': handle.reset }
          ]} />}
        {msg
        ?
        <span style={{fontSize: '.8rem'}}>{convertLinks(msg)}</span>
        :''}
      </InfoSection>
    </InfoBody>
  </InfoStyles></InfoLoginBlock>
}