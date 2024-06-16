import React, { Fragment } from 'react';
import { InfoBody, InfoSection, InfoStyles } from '../../components/Info';
import api from '../../lib/api';
import { useF, useR } from '../../lib/hooks';
import { useAuth } from '../../lib/hooks_ext';


export default () => {
  const auth = useAuth();
  const userRef = useR();
  const appRef = useR();
  const textRef = useR();

  const handle = {
    send: () => {
      const user = userRef.current.value
      const app = appRef.current.value
      const text = textRef.current.value
      api.post(`notify/msg/${app}`, { user, text })
    },
  }

  useF(() => {
    if (auth.user === 'cyrus') {
      userRef.current.value = 'cyrus';
      appRef.current.value = 'test';
      textRef.current.value = 'notif';
    }
  })

  return <InfoStyles>
    <InfoBody>
    {auth.user !== 'cyrus' ? `sorry, you aren't cyrus :/` : <>
      <InfoSection label='send notification' className='edit-container'>
        <input ref={userRef} type='text' placeholder='user' />
        <input ref={appRef} type='text' placeholder='app' />
        <input ref={textRef} type='text' placeholder='text' />
        <span className='button' onClick={handle.send}>send</span>
      </InfoSection>
    </>}
    </InfoBody>
  </InfoStyles>
}