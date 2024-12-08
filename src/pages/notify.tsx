import React, { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { InfoBody, InfoLine, InfoLoginBlock, InfoSection, InfoStyles, InfoSelect, InfoButton, InfoLabel, InfoEntry, InfoBadges, Select } from '../components/Info';
import Vote from '../components/Vote';
import api from '../lib/api';
import { useCached, useF, useR, useTimed } from '../lib/hooks';
import { useAuth, useHashState, usePageSettings, usePathState } from '../lib/hooks_ext';
import { sub, unsub } from '../lib/notify';
import { parseSubdomain } from '../lib/page';
import { useSocket } from '../lib/socket';
import { JSX, pass, truthy } from '../lib/types';
import url from '../lib/url';
import { S, dev, isMobile, node } from '../lib/util';
import { convertLinks } from '../lib/render';
import { A } from 'src/components/A';
import { openFeedback } from 'src/components/Modal';


const { list } = window as any
const notifyProjects = list('greeter wordbase lettercomb letterpress light')//.sort()

const NotifyEntry = ({page, enabled, toggle}) => {
  return <InfoBadges labels={[
    {
      href: `/${page}`,
    },
    {
      text: enabled ? 'unsubscribe' : 'subscribe',
      func: toggle,
    },
  ]} />
}

export default () => {
  const auth = useAuth()
  const [token, setToken] = useHashState()
  const emailRef = useR()
  const [emailEdit, setEmailEdit] = useState(false)
  const [notify, loadNotify] = useCached<any>('notify', () => api.get('notify').then(({notify}) => notify))
  const [changes, setChanges] = useState(notify)
  useF(notify, setChanges)

  useF(auth.user, () => auth.user && !token && handle.load())
  useF(token, () => {
    if (token) {
      setToken('');
      api.post('notify/verify', { token }).then(handle.load)
    }
  })

  const handle = {
    load: loadNotify,
    email: () => {
      handle.method({ email: changes?.methods.email })
      setTimeout(() =>
        setEmailEdit(false)
      )
    },
    method: setting => {
      const [method, value] = Object.entries(setting)[0]
      notify.waiting = true
      return api.post('notify/method', { method, value, source: location.host }).then(handle.load)
    },
    sub: (page: string, doSub: boolean) => {
      (doSub ? sub : unsub)(page).then(handle.load)
    },
  }

  const method = changes?.method || 'email'
  const methodValue = (changes?.method && typeof changes?.methods[method] === 'string') ? changes.methods[method] : undefined
  const removeMethod = (method && changes?.methods[method])
    ? { text: 'remove', func: () => handle.method({ [changes.method]: false }) }
    : false
  const connecting = (notify?.method === method && notify.verify)
  const contactDisplay = {
    email: notify?.methods['email'],
    twitter: `twitter.com/${notify?.methods['twitter']}`, // convertLinks(`twitter.com/${notify?.methods['twitter']}`),
    telegram: `t.me/${notify?.methods['telegram']}`, // convertLinks(`t.me/${notify?.methods['telegram']}`),
  }
  const methods = {
    email: [
      <>
        <input ref={emailRef} 
        type='email' placeholder='enter email for notifications'
        autoCorrect='off' autoCapitalize='off'
        value={changes?.methods['email']}
        onChange={e => {
          setEmailEdit(e.target.value !== notify.methods.email)
          setChanges({ ...changes, methods: { ...changes.methods, email: e.target.value } })
        }}
        onKeyDown={e => ({
          'Enter': handle.email,
          'Escape': () => setEmailEdit(false),
          }[e.key] || pass)()}/>
      </>,
      'notifications sent in one thread'
    ],
    // twitter: <JSX key='twitter'>
    //   <InfoLine labels={[
    //     !methodValue && {
    //       text: methodValue ? 'change' : connecting ? 'restart' : 'connect',
    //       func: () => {
    //         handle.method({
    //           twitter: true,
    //         }).then(notify => {
    //           // Twitter is somewhat special
    //           // It takes a while to receive a new DM event, so verify with DM message instead
    //           console.debug('TWITTER METHOD RESULT', notify)
    //           // click link to get around popup issues
    //           node(
    //             `<a
    //             href="${`https://twitter.com/messages/compose?recipient_id=${
    //               {
    //                 wordbase: '1454915681699381249',
    //               }[parseSubdomain()] || '1601504074809081856'
    //             }&text=${encodeURIComponent(`/subscribe ${auth.user} ${dev ? 'dev' : 'request'}-${notify.verify} \nSEND THIS MESSAGE TO SUBSCRIBE`)}`}"
    //             ></a>`
    //           ).click()
    //         })
    //       },
    //     },
    //     removeMethod
    //   ]}>
    //     <InfoEntry>
    //       {methodValue ? contactDisplay.twitter : connecting ? 'connecting (usually takes ~2m)' : 'not connected'}
    //     </InfoEntry>
    //   </InfoLine>
    //   <p style={{fontSize:'.8rem', opacity:'.5'}}>notifications are DMed</p>
    // </>,
    telegram: [
      <>
        {methodValue ? <InfoBadges labels={[
          contactDisplay.telegram,
          removeMethod,
        ]} /> : <>
          <div style={S(`
          border: 1px solid currentcolor;
          padding: .5em;
          `)}>telegram is great! you'll get non-email notifs you can click and open directly without app-switching: <InfoBadges labels={[
            {
              text: 'install telegram app',
              href: 'https://telegram.org/',
            },
          ]} /></div>
          <div style={S(`
          border: 1px solid currentcolor;
          padding: .5em;
          `)}>just make sure you've set a username in your telegram settings! <InfoBadges labels={[
            {
              text: 'connect',
              func: () => {
                handle.method({
                  telegram: true,
                }).then(notify => {
                  // click link to get around popup issues
                  node(
                    `<a
                    href="${`https://t.me/${
                      {
                        wordbase: 'wordbase_bot'
                      }[parseSubdomain()] || 'freshman_dev_bot'
                    }?start=${auth?.user}-request-${notify.verify}`}"
                    ></a>`
                  ).click()
                })
              },
            },
          ]} /></div>
        </>}
      </>,
      'notifications DMed',
    ],
    // 'mastodon?': <JSX key='mastodon'>
    //   <InfoLine labels={[]}>
    //     <InfoEntry>
    //       coming soon &nbsp;<Vote name='TODO-notify-Mastodon' />
    //     </InfoEntry>
    //   </InfoLine>

    //   {/* <InfoLine labels={[
    //     !methodValue && {
    //       text: methodValue ? 'change' : connecting ? 'restart' : 'connect',
    //       func: () => {
    //         handle.method({
    //           twitter: true,
    //         }).then(notify => {
    //           // Twitter is somewhat special
    //           // It takes a while to receive a new DM event, so verify with DM message instead
    //           console.debug('MASTODON METHOD RESULT', notify)
    //           // click link to get around popup issues
    //           const a = document.createElement('a')
    //           a.href = `https://mastodon.freshman.dev/share?visibility=direct&text=@cyrus@mastodon.freshman.dev%20${
    //             {
    //               wordbase: '1454915681699381249',
    //             }[parseSubdomain()] || '1601504074809081856'
    //           }&text=${encodeURIComponent(`/subscribe ${auth.user} ${dev ? 'dev' : 'request'}-${notify.verify} \nSEND THIS MESSAGE TO SUBSCRIBE`)}`
    //           a.target = '_blank'
    //           a.rel = "noreferrer"
    //           a.click()
    //         })
    //       },
    //     },
    //     removeMethod
    //   ]}>
    //     <InfoEntry>
    //       {methodValue ? contactDisplay.twitter : connecting ? 'connecting (usually takes ~2m)' : 'not connected'}
    //     </InfoEntry>
    //   </InfoLine>
    //   <p style={{fontSize:'.8rem', opacity:'.5'}}>notifications are DMed</p> */}

    // </>,
    // 'whatsapp?': <JSX key='whatsapp'>
    //   <InfoLine labels={[]}>
    //     <InfoEntry>
    //       coming soon &nbsp;<Vote name='TODO-notify-WhatsApp' />
    //     </InfoEntry>
    //   </InfoLine>
    // </>,
    // 'signal?': <JSX key='signal'>
    //   <InfoLine labels={[]}>
    //     <InfoEntry>
    //       coming soon &nbsp;<Vote name='TODO-notify-Signal' />
    //     </InfoEntry>
    //   </InfoLine>
    // </>,
    'something else?': false,
  }
  useF(method, () => method === 'something else?' && openFeedback({ title: 'Suggest contact method:' }))

  const verifiedLabel = (!notify || !notify.methods[notify.method] || notify.waiting)
    ? ''
    : notify.verify
      ? `unverified` + (notify.method === 'email' ? ' – check email for link' : '')
      : 'verified'
  const switchMethod = (!emailEdit && changes && changes.methods[changes.method] && changes.method !== notify.method)
    ? { text: 'save', func: () => handle.method({ [changes.method]: changes.methods[changes.method] || true }) }
    : false

  useSocket({
    on: {
      rerender: handle.load
    }
  })

  const [tested, set_tested] = useTimed(3_000, false)

  const [change, set_change] = usePathState()
  useF(change, notify, changes, () => {
    if (change && notify && changes) {
      setChanges({ ...changes, method:change })
      set_change('')
    }
  })

  usePageSettings()
  return <InfoLoginBlock to='manage notifications'><Style>
    <InfoBody>{!notify ? '' : <>
      <InfoSection label='user'>
        <InfoEntry>
          <A href={`/u/${auth.user}`}>{auth.user}</A>
        </InfoEntry>
      </InfoSection>
      <InfoSection labels={[
        'current contact',
        verifiedLabel,
        tested ? 'sent notif!' : { test: async () => {
          set_tested(true)
          await api.get(`/notify/test`)
        } },
      ]}>
        {notify
        ? <InfoEntry>
          {(notify.methods[notify.method] && contactDisplay[notify.method]) || '(none)'}
        </InfoEntry>
        : ''}
      </InfoSection>
      <InfoSection className='email edit-container column gap' labels={[
        'change contact',
        // !emailEdit && { text: 'edit', func: handle.email },
        // <InfoSelect value={method} options={Object.keys(methods)} onChange={e => setChanges({ ...changes, method:e.target.value })} />,
        ...(x => {
          return x.filter(truthy).length ? x : []//[`(${methods[method][1]})`]
        })([
          emailEdit && { text: 'cancel', func: () => {
            setChanges(notify)
            setEmailEdit(false)
          }},
          emailEdit && { text: 'save', func: () => handle.email() },
          switchMethod,
        ]),
      ].filter(l => l)}>
        <InfoBadges labels={[
          <Select value={method} options={Object.keys(methods)} onChange={e => setChanges({ ...changes, method:e.target.value })} /> as any,
          `(${methods[method][1]})`
        ]} />
        {methods[method][0]}
      </InfoSection>
      <InfoSection labels={[
        'notifications',
        // notify.email ? 'enabled' : 'disabled'//'disabled - add email'
        ]}>
        {notifyProjects.map(page => {
          const enabled = !(notify.unsub || []).includes(page)
          return <NotifyEntry key={page} page={page} enabled={enabled} toggle={() => handle.sub(page, !enabled)}/>
        })}
      </InfoSection>
    </>}
    </InfoBody>
  </Style></InfoLoginBlock>
}

const Style = styled(InfoStyles)`
  .email {
    width: 100%;
    input {
      max-width: 22rem;
      margin-top: 0;
      // cursor: pointer;
    }
    label.action {
      background: #00000022 !important;
    }
    .text {
      // display: flex;
      // flex-direction: row;
      // align-items: center;
      // span, input {
      //   color: black;
      //   // flex-grow: 1;
      //   border: 2px solid transparent;
      //   line-height: 1rem;
      //   height: 2.0rem;
      //   display: flex; align-items: center;
      // }
      // span {
      //   cursor: pointer;
      //   padding: 0;
      // }
      // input {
      //   // min-width: 71.5%;
      //   min-width: 17.6rem;
      //   padding: 0 .5rem;
      //   border-color: #00000022;
      //   border-radius: .2rem;
      //   box-shadow: none;
      //   -webkit-appearance: none;
      // }
    }
    // .button {
    //   display: flex; align-items: center; justify-content: center;
    //   margin-left: .75rem;
    // }
  }
`