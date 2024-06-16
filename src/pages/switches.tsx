import React, { useState } from 'react'
import api, { auth } from '../lib/api'
import { useCached, useF, useI, useR, useRerender, useToggle } from '../lib/hooks'
import { useSocket } from '../lib/socket'
import { store } from '../lib/store'
import { JSX, truthy } from '../lib/types'
import { squash, toStyle } from '../lib/util'
import styled from 'styled-components'
import { A, CodeBlock, InfoBody, InfoButton, InfoCheckbox, InfoLine, InfoSection, InfoSelect, InfoStyles, Loader, Select } from '../components/Info'

const LogicGates = {
  '': 0,

  'NOT': 1,

  'AND': 2,
  'OR': 2,
  'XOR': 2,

  'NAND': 2,
  'XNOR': 2,
}

const toKey = item => item.space + '/' + item.name


export default () => {
  // lock switches under /${user}/ and display as list
  // if user not logged in, just show default switches
  // create 'default' switch under ${user || 'default'}

  const [{ user }] = auth.use()
  const [keys, reloadKeys] = useCached<string>(
    'api-keys',
    () => api.get('/key').then(({ info }) => info.keys))
  const space = user || 'default'
  const apiAuth = `${user || 'user'}:${(keys||[])[0] || 'key'}`

  const [userAdded, setUserAdded]: [string[], any] = store.use('switches-user-added', { 
    default: ['default/default', 'default/not', 'default/not-not', 'default/not-not-and']
  })
  useI(userAdded, () => {
    const unique = [...new Set(userAdded)]
    if (unique.length !== userAdded.length) {
      setUserAdded(unique)
    }
  })
  const [switches, reloadSwitches] = useCached('switch-list', async () => {
    const { list } = await api.get(`/switch/all/${space}`)
    const fetched = new Set(list.map(x => x.space + '/' + x.name))
    const userAddedList = []
    await Promise.all(
      userAdded
      .filter(x => !fetched.has(x))
      .map(x => api
        .get(`/switch/${x}`)
        .then(({ item }) => userAddedList.push(item))))
    const ordered = [
      userAddedList, list
    ].flatMap(x => x.sort((a, b) => toKey(a).localeCompare(toKey(b))))
    console.debug('SWITCHES', ordered)
    return ordered
  })
  useF(userAdded, reloadSwitches)
  const rerender = useRerender()
 
  const on = squash(
    [
      space,
      ...userAdded.map(x => x.split('/')[0])
    ]
    .map(x => `switch:${x}`)
    .map(x => ({ [x]: (...y) => {
      console.debug('SWITCH SOCKET EVENT', x, y)
      reloadSwitches()
    } })))
  console.debug('SWITCH SOCKET EVENTS', on)
  useSocket({ on })
  useF(user, async () => {
    if (user) {
      await api.post(`/switch/lock/${user}`)
    }
    await api.post(`/switch/add/${space}/default`)
  })

  const spaceRef = useR()
  const nameRef = useR()
  const buttonRef = useR()
  useF(user, () => spaceRef.current.value = user || 'default')
  const [example, setExample] = useState({
    space: 'default',
    name: 'example',
  })
  const [editView, toggleEditView] = useToggle(false)
  return <Style>
    <InfoBody>
      <InfoSection labels={[
        'switches',
        { [editView ? 'done' : 'edit']: toggleEditView },
      ]}>
        {!switches ? <span><Loader/> loading</span> : switches.map(x => {
          const id = x.space + '/' + x.name
          return <div className='switch-entry'>
            <InfoCheckbox key={id} inline
            label={id}
            initial={x.state} 
            onChange={async e => {
              await api.post(`/switch/toggle/${id}`)
              reloadSwitches()
            }} />
            {editView
            ? <>
              <InfoButton inline onClick={async e => {
                await api.delete(`/switch/${id}`)
                setUserAdded(userAdded.filter(x => x !== id))
              }}>delete</InfoButton>
              {userAdded.includes(x.id)
              ?
              <InfoButton inline onClick={async e => {
                setUserAdded(userAdded.filter(y => y !== x.id))
              }}>hide</InfoButton>
              :''}
            </>
            :''}
            <InfoSelect 
            value={x.gate || ''} 
            setter={y => {
              x.gate = y
              x.inputs = Array.from({ length: LogicGates[y] }).map(x => undefined)
              api.post(`/switch/logic/${id}`, x)
              rerender()
            }}
            options={Object.keys(LogicGates)} />
            {!x.inputs ? '' : x.inputs
            .concat(Array.from({ length: LogicGates[x.gate] - x.inputs.length }))
            .map((y, i) => 
            <InfoSelect
            value={y}
            setter={y => {
              x.inputs[i] = y
              api.post(`/switch/logic/${id}`, x)
              rerender()
            }}
            options={switches.map(x => x.space + '/' + x.name)} />
            )}
          </div>
        })}
        <div className='switch-entry'>
          <input type='text' ref={spaceRef} 
          onKeyDown={e => {
            if (e.key === 'Enter') nameRef.current.focus()
          }}/><span>/</span><input type='text' ref={nameRef}
          onKeyDown={e => {
            if (e.key === 'Enter') buttonRef.current.click()
          }}/>
          <InfoButton ref={buttonRef} inline onClick={async e => {
            const id = [
              spaceRef.current.value,
              nameRef.current.value
            ].map(x => x || 'default').join('/')
            if (id.split('/').length === 2) {
              await api.post(`/switch/add/${id}`)
              setUserAdded(userAdded.concat([id]))
            }
          }}>add</InfoButton>
        </div>
      </InfoSection>
      <InfoSection labels={[
        'api',
        {
          text:
          <Select
          value={example} 
          setter={setExample}
          options={switches}
          display={x => x && (x.space + '/' + x.name)}
          />,
        },
      ]}>
        {
        keys?.length
        ? ''
        :
        <A href='/keys' frame>Get api key</A>
        }
        {[
          { get: '', result: '{"item":{"space":"default","name":"example","state":false}}' },
          { state: '/state', result: 'false' },
          { on: '/state/on', result: 'true' },
          { off: '/state/off', result: 'false' },
          { toggle: '/state/toggle', result: 'true' },
          { 
            logic: '/logic', 
            query: { gate: 'OR', inputs: 'default/default,default/example' },
            result: '{"item":{"name":"example","space":"default","state":false,"gate":"OR","inputs":["default/default","default/example"]}}'
          },
        ].map(x => {
          const [name, endpoint] = Object.entries(x)[0]
          const query = new URLSearchParams(x.query || {}).toString()
          const text = `# ${name}\ncurl -L "${api.host}/api/switch${endpoint}${example.space === 'default' ? '' : '/'+example.space}/${example.name}?auth=${apiAuth}${query ? '&'+query :''}"`
          const props = x.result ? { 
            commands: [{ 
              [text]: x.result
                .replace('"default"', '"'+example.space+'"')
                .replace('"example"', '"'+example.name+'"') 
            }]
          } : { text }
          return <CodeBlock {...props} />
        })}
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.switch-entry {
  align-items: stretch;
  display: flex;
  gap: .25em;
  input[type=text], .action {
    height: 1.6em;
    min-width: fit-content;
    .select {
      height: -webkit-fill-available;
    }
  }
}
.action {
  margin: 0 !important;
}
input {
  width: 10em;
  flex-grow: 1;
  padding: 0;
}
.section:not(:last-child) {
  margin-bottom: 1em;
}
`