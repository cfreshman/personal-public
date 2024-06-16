import React, { useState } from 'react';
import styled from 'styled-components';
import { InfoBody, InfoStyles } from '../components/Info';
import api from '../lib/api';
import { useF, useR } from '../lib/hooks';
import { q_parse } from '../lib/queue';

export default () => {
  const [id, setId] = useState<string | boolean>('')
  const [q, setQ] = useState({})
  const idRef = useR()
  const msgRef = useR()
  const delRef = useR()

  const handle = {
    clear: () => {
      setQ({})
    },
    parse: (promise, set=true) => {
      promise
        .then(q => {
          // console.log(q)
          // q.list.forEach(item => {
          //   item.msg = JSON.parse(item.msg)
          //   // item.t = new Date(item.t).toLocaleString()
          // })
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
      handle.parse(api.get(`/q/${id}`))
    },
    add: (msg, set=false) => {
      handle.clear()
      handle.parse(api.post(`/q/${id}`, { msg }), set)
    },
    del: (i) => {
      handle.clear()
      handle.parse(api.get(`/q/${id}?i=${i}`))
    },
    flush: () => {
      handle.clear()
      handle.parse(api.get(`/q/flush/${id}`))
    },
    poll: () => {
      handle.clear()
      handle.parse(api.get(`/q/poll/${id}?ms=${3_000}`))
    }
  }
  useF(() => {
    idRef.current.value = 'x';
    handle.load('x');

    msgRef.current.value = `{"str":"abc","num":2}`
  })

  return <Style>
    <InfoBody>
      <div>
        <input ref={idRef} type="text" />
        <button onClick={e => handle.load(idRef.current.value)}>load</button>
      </div>
      <div>
        <textarea ref={msgRef} style={{ fontSize: '.5rem' }} rows={10} />
        <button onClick={e => handle.add(msgRef.current.value)}>
          add</button>
        <button onClick={e => handle.add(msgRef.current.value, true)}>
          {'&'} parse</button>
      </div>
      <div>
        <input ref={delRef} type="text" />
        <button onClick={e => handle.del(delRef.current?.value)}>
          del</button>
      </div>
      <div>
        <button onClick={e => handle.flush()}>flush</button>
        <button onClick={e => handle.poll()}>poll</button>
      </div>
      <div style={{ whiteSpace: 'pre', fontSize: '.5rem' }}>
        {JSON.stringify(q, null, 2)}
      </div>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
  input, textarea {
    min-width: 14rem;
    margin-right: .5rem;
  }
  button {
    background: none;
    color: inherit;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    outline: inherit;

    margin-right: .5rem;
    padding: 0 .5rem;
    border: 1px solid black;
    border-radius: .2rem;
    white-space: pre;
  }
  .body > div {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
  }
`