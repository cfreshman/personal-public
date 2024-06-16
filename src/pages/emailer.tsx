import React, { useState } from 'react';
import styled from 'styled-components';
import { InfoBadges, InfoBody, InfoButton, InfoRequireMe, InfoSection, InfoStyles, Multiline } from '../components/Info';
import api from '../lib/api';
import { useF, useM, useR, useS } from '../lib/hooks';
import { q_parse } from '../lib/queue';
import { Modal, openPopup } from 'src/components/Modal';

const { named_log, entries, strings } = window as any
const log = named_log('emailer')

export default () => {
  const [id, setId] = useS<string | boolean>('updates')
  const [key, setKey] = useS<string | boolean>('me')
  const [q, setQ] = useS<{name,space,list:({i,t,msg:{value:string,uuid,href:string}})[]}>(undefined)

  const handle = {
    clear: () => {
      setQ(undefined)
    },
    wrapWithParse: (promise, set=true) => {
      promise
        .then(q => {
          console.debug(q)
          console.debug(q_parse(q))
          set && setQ(q_parse(q))
        })
        .catch(q => {
          console.debug(q)
          setQ(q)
        })
    },
    load: (id) => {
      setId(id)
      handle.wrapWithParse(api.get(`/q/${id}?key=${key}`))
    },
    poll: () => {
      handle.clear()
      handle.wrapWithParse(api.get(`/q/poll/${id}?ms=${3_000}&key=${key}`))
    }
  }
  useF(() => {
    handle.load(id)
  })

  const groups = useM(q, () => {
    const result = {}
    q?.list.map(item => {
      const { value:user, href:ref } = item.msg
      if (!result[ref]) result[ref] = []
      result[ref].push(user)
    })
    return result
  })

  const [emailing, setEmailing] = useS<string>(undefined)
  const [email, setEmail] = useS('')

  const [blasting, set_blasting] = useS(false)
  const [blast, set_blast] = useS('')
  const [blast_link, set_blast_link] = useS('')
  const [blast_list, set_blast_list] = useS(undefined)
  useF(blasting, async () => blasting && set_blast_list(await api.get('/notify/dangerous/mailer')))

  return <InfoRequireMe>
    {emailing ? <Modal>
      <InfoStyles>
        <InfoBody>
          <InfoSection labels={[
            emailing,
          ]}>
            <div>emailing {groups[emailing].length} user(s)</div>
            <Multiline value={email} setValue={setEmail} />
            <InfoBadges labels={[
              { send: () => alert('todo') },
              { close: () => setEmailing(undefined) },
            ]} />
          </InfoSection>
        </InfoBody>
      </InfoStyles>
    </Modal> : null}
    {blasting ? <Modal>
      <InfoStyles>
        <InfoBody>
          <InfoSection labels={[
            'email blast'
          ]}>
            {/* <Multiline value={blast} setValue={set_blast} /> */}
            <input value={blast} onChange={e => set_blast(e.target.value)} />
            <input value={blast_link} onChange={e => set_blast_link(e.target.value)} />
            <InfoBadges labels={[
              { send: async () => {
                await api.post('/notify/dangerous/mailer', { text:blast.replace(/\\n/g, '\n'), link:blast_link })
                set_blasting(false)
              } },
              { close: () => set_blasting(false) },
            ]} />
            <pre>{strings.json.pretty(blast_list)}</pre>
          </InfoSection>
        </InfoBody>
      </InfoStyles>
    </Modal> : null}
    <Style>
      <InfoBody>
        <InfoButton onClick={e => handle.load(id)}>refresh</InfoButton>
        {/* <div style={{ whiteSpace: 'pre', fontSize: '.5rem' }}>
          {JSON.stringify(q, null, 2)}
        </div> */}
        {entries(groups).map(([ref, users]) => <InfoSection labels={[
          ref,
          { 'email': () => setEmailing(ref) },
        ]}>
          {users.map(user => <span>{user}</span>)}
        </InfoSection>)}
        <br />
        <InfoButton onClick={e => set_blasting(true)}>send email blast to all users</InfoButton>
      </InfoBody>
    </Style>
  </InfoRequireMe>
}

const Style = styled(InfoStyles)`
`