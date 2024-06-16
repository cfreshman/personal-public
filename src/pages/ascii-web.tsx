// maybe

/* eslint-disable react/prop-types */
import { Fragment, useState } from 'react';
import styled from 'styled-components';
import { InfoBody, InfoFuncs, InfoSection } from '../components/Info';
import api from '../lib/api';
import { useE, useError, useF } from '../lib/hooks';
import { useAuth, usePathState } from '../lib/hooks_ext';
import { meta } from '../lib/meta';
import { randAlphanum } from '../lib/util';

const host = location.host
const short = location.origin

// const validHash = str => true // !/[^\w\d .]/.test(str)
const validHash = str => !/\//.test(str)

export default () => {
  const auth = useAuth()
  const [list, setList] = useState(undefined)

  const [[view, hash], setParts] = usePathState({
    prefix: '',
    from: path => {
      // split paper/na+me into [true, 'na me']
      const parts = path.split('/').concat([''])
      return [parts[0] === 'paper', parts[1]]
    },
    to: ([view, hash]) => [view ? 'paper' : 'txt', hash || ''],
    push: true,
  })
  const setHash = hash => setParts([view, hash])
  const setView = view => setParts([view, hash])

  const [_0, _1, handleError, errorRender] = useError(3000)

  const handle = {
    load: () => {
      api.get(`/txt/`).then(({ list }) => {
        setList(list.sort((a, b) => a.hash.localeCompare(b.hash)))
      }).catch(e => handleError)
    },
    new: () => {
      setHash(randAlphanum(7))
    }
  }

  useF(auth.user, hash, handle.load)
  // useF(hash, view, () => hash && setPaper(view))
  useE(view, hash, () => meta.manifest.set({
    name: `/${view ? 'paper' : 'txt'}/${hash}`,
    display: `standalone`,
    start_url: `${window.origin}/${view ? 'paper' : 'txt'}/${hash}`,
  }))

  const labels = [
    // 'txts',
    // { text: 'new', func: handle.new },
    view ? 'papers' : 'txts',
    !view && { text: 'view', func: () => setView(true) },
    view
    ? { text: 'edit', func: () => setView(false) }
    : { text: 'new', func: handle.new },
  ]
  return <Style>
    <InfoBody>
      {errorRender}
      {list
      // ? <InfoFuncs labels={labels}
      //   entries={list.map(item => item.hash)}
      //   entryFunc={hash => setHash(hash)} />
      ? <>
        <InfoFuncs labels={labels}
        entries={list.filter(item => !item.public).map(item => item.hash)}
        entryFunc={hash => setHash(hash)} />
        <InfoFuncs labels={['public']}
        entries={list.filter(item => item.public).map(item => item.hash)}
        entryFunc={hash => setHash(hash)} />
      </>
      : <InfoSection labels={labels}>
        {list === undefined ? '' : '(empty)'}
      </InfoSection>}
    </InfoBody>
  </Style>
}

const Style = styled.div`
`