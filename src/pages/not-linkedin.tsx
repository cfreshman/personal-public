import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { openLogin } from 'src/lib/auth'
import { S, mobile } from 'src/lib/util'

const { named_log } = window as any
const log = named_log('not-linkedin')

const LinkedinAccountTypes = () => {
  return <A tab='https://expandi.io/blog/linkedin-account-types/'>
    <img src='/raw/not-linkedin/account_types.png' style={S(`height: 15em; padding: .5em; background: #fff; border: 1px solid #000`)} />
  </A>
}

export default () => {
  const [{user:viewer}] = auth.use()
  usePageSettings({
    // background: '#ffd700',
    background: '#000', text_color: '#ffd700',
    expand: true,
  })
  return <Style>
    <InfoBody className='column tall gap'>
      <InfoSection labels={['not-linkedin']}>
        {mobile ? <>
          <div><b>LinkedIn charges for an unfair advantage</b></div>
          <div>you entered your career info and they make money</div>
          <HalfLine />
          <LinkedinAccountTypes />
          <HalfLine />
          <div><b>we can kill LinkedIn Premium</b></div>
          <div>- venmo $5 to 5 friends to make them sign up here</div>
          <div>- free public access but similar privacy settings (only show in company org chart to friends instead of publicly, etc)</div>
          <div><b>i will only implement this if there's enough interest</b></div>
        </> : <>
          <div><b>LinkedIn charges for an unfair advantage</b></div>
          <div>you entered your career info and they make money off of it</div>
          <HalfLine />
          <LinkedinAccountTypes />
          <HalfLine />
          <div><b>if we put our career info into a free-to-use website, we can kill LinkedIn Premium</b></div>
          <div>- send $5 to 5 friends with this link (asking them to sign up)</div>
          <div>- we can create a free career-building / professional networking service</div>
          {/* <div>if they sign up and this takes off venmo me $5. but you can still use it if you dont</div> */}
          <div>- i only ask that you <A tab='https://freshman.dev/venmo'>venmo me $5</A> if this works, but you don't have to</div>
          <div>- everyone will have access but similar privacy settings will exist (only show in company org chart to friends instead of publicly, etc)</div>
          <div><b>i will only implement this if there's enough interest</b></div>
        </>}
        <HalfLine />
      </InfoSection>
      <InfoSection labels={[
          'add your info', // viewer ? 'add info' : 'sign in'
        ]}>
        {viewer ? <>
          <div>coming soon. once built, it will take your career info and provide professional services comparable to paid LinkedIn tiers <b>such as public org charts for private companies</b>. if you didn't already give an email, add one at <A href='/notify' /> to get a notification when ready</div>
        </> : <a onClick={() => openLogin()}>sign in</a>}
        <HalfLine />
        <div><b>ideally i'll be able to use your LinkedIn "<A tab='https://www.linkedin.com/help/linkedin/answer/a1339364/downloading-your-account-data'>download your data</A>" archive without any extra work / data input on your part</b></div>
      </InfoSection>
      <div className='spacer' />
      <InfoSection label='more'>
        <div>- read <A bold tab='/about' /> this website</div>
        <div>- <A bold tab='/contact' /> me</div>
        <div>- donate a <A bold tab='/coffee' /></div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
`