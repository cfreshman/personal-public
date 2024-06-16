import React, { useState } from 'react';
import styled from 'styled-components';
import { CodeBlock, InfoBody, InfoLine, InfoLoginBlock, InfoSection, InfoStyles, Select } from '../components/Info';
import api from '../lib/api';
import { copy } from '../lib/copy';
import { useF } from '../lib/hooks';
import { useAuth } from '../lib/hooks_ext';
import { UserList } from './u';

const Api = {
  counter: 'i',
  queue: 'q',
  switch: 'switch',
}

let copyTimeout
export default () => {
  const auth = useAuth()
  const [info, setInfo]: [any, any] = useState({})
  
  const handle = {
    load: () => {
      api.get('/key/').then(({ info }) => setInfo(info))
    },
    new: () => {
      api.get('/key/new').then(data => {
        console.log(data)
        setInfo(data.info)
      })
    },
    delete: key => {
      api.delete(`/key/${key}`).then(({ info }) => setInfo(info))
    },
  }
  useF(info, () => console.debug(info))

  useF(auth.user, () => handle.load())

  const [copied, setCopied] = useState(-1)
  const [apiLabel, setApi] = useState('[api]')
  const apiUser = auth.user || '[user]'
  const [apiKey, setApiKey] = useState('')
  useF(info.keys, 
    () => !info.keys?.includes(apiKey) && setApiKey((info.keys || ['[key]'])[0]))
  const apiAuth = `auth=${apiUser}:${apiKey}`
  return <InfoLoginBlock to='manage api keys'><Style>
    <InfoBody>
      <UserList labels={['user']} users={[auth.user]} />
      <InfoSection labels={[
        'api keys',
        { text: 'new', func: () => handle.new() },
      ]}>
        {info.keys?.length
        ? info.keys.map((key, i) =>
          <InfoLine key={i} labels={[
              { text: 'delete', func: () => handle.delete(key) },
              copied === i ? 'copied!' : ''
            ]}>
            <div className={`key entry link`} onClick={() => {
              copy(`${auth.user}:${key}`)
              setCopied(i)
              clearTimeout(copyTimeout)
              copyTimeout = setTimeout(() => {
                setCopied(-1)
                copyTimeout = undefined
              }, 2000)
              }}>
              {`${auth.user}:${key}`}
              {/* {copied === i
              ?
              <div className='copied'>copied!</div>
              :''} */}
            </div>
          </InfoLine>)
        : <div>no api keys</div>}
      </InfoSection>
      <InfoSection labels={[
        'usage',
        {
          text: <Select 
          value={apiLabel} preserveCase
          options={Object.keys(Api)} 
          onChange={e => setApi(e.target.value)} />,
        },
        {
          text: <Select 
          value={apiKey} preserveCase
          options={info.keys || []} 
          onChange={e => setApiKey(e.target.value)} />,
        },
      ]}>
        <div className="usage full">
          <CodeBlock lines={[
            `curl -L api.f8n.co/${Api[apiLabel] || apiLabel}?${apiAuth}`
          ]}/>
          for example, counter api /i
          <CodeBlock commands={[
            {
              [`curl -L api.f8n.co/i/${auth.user || 'default'}/x`]:
              `200 { "key": "x", "space": "${auth.user || 'default'}", "value": 123 }`
            },
            {
              [`curl -L api.f8n.co/i/lock/${auth.user || 'default'}/x?${apiAuth}`]:
              `200 { "key": "x", "space": "${auth.user || 'default'}", "owner": "${apiUser}", "value": 123 }`
            },
            {
              [`curl -L api.f8n.co/i/${auth.user || 'default'}/x`]:
              `403 { "error": "already owned" }`
            },
            {
              [`curl -L api.f8n.co/i/unlock/${auth.user || 'default'}/x?${apiAuth}`]:
              `200 { "key": "x", "space": "${auth.user || 'default'}", "value": 123 }`
            },
            {
              [`curl -L api.f8n.co/i/${auth.user || 'default'}/x`]: `200 { "key": "x", "space": "${auth.user || 'default'}", "value": 123 }`
            },
          ]}/>
        </div>
      </InfoSection>
    </InfoBody>
  </Style></InfoLoginBlock>
}

const Style = styled(InfoStyles)`
  .key.entry {
    white-space: pre;
    user-select: none !important;

    position: relative;
    > div {
      position: absolute;
      background: white;
      width: 100%; height: 100%;
      top: 0; left: 0;
    }
  }
  .usage {
    font-size: .8rem;
  }
`