/* eslint-disable react/prop-types */
import React, { Fragment, useState } from 'react';
import styled from 'styled-components';
import { InfoBody, InfoCheckbox, InfoFuncs, InfoSection, InfoStyles } from '../../components/Info';
import api from '../../lib/api';
import { useE, useError, useEventListener, useF, useR, useToggle } from '../../lib/hooks';
import { useAuth } from '../../lib/hooks_ext';
import { meta } from '../../lib/meta';
import { randAlphanum } from '../../lib/util';

const host = 'f3n.co'

const validHash = str => !/\//.test(str)

export default () => {
  const auth = useAuth()
  const [list, setList] = useState(undefined)

  const hashRegex = /\/box(\/[^#/]+)?\/([^#/]*)/.exec(location.href)
  const hashExtract = hashRegex && hashRegex[2]
    && decodeURIComponent(hashRegex[2].replace(/\+/g, ' '))
  const [hash, setHash]: any[] = useState(hashExtract)
  const spaceExtract = hashRegex && hashRegex[1]
    && decodeURIComponent(hashRegex[1].replace(/\+/g, ' '))
    || ''
  const [space, setSpace]: any[] = useState(spaceExtract)
  const [error, setError, handleError, errorRender] = useError(3000)

  const handle = {
    load: () => {
      api.get(`/box/`).then(({ list }) => setList(list)).catch(handleError)
    },
    new: () => {
      setHash(randAlphanum(7))
    }
  }

  useF(auth.user, hash, handle.load)
  // useF(hash, view, () => hash && setPaper(view))
  useF(hash, () => {
    window.history.replaceState(null, null,
      `/box/${space}${(hash || '').replace(/ /g, '+')}`)
      // `/box/${view ? 'v/' : ''}${(hash || '').replaceAll(' ', '+')}`)
  })
  useE(space, hash, () => meta.manifest.set({
    name: `/box/${space}${hash}`,
    display: `standalone`,
    start_url: `${window.origin}/box/${space}${hash}`,
  }))

  const labels = [
    'box',
    { text: 'new', func: handle.new },
  ]
  return <Style>
    {hash
    ? <BoxesEditBody {...{ hash, setHash }}/>
    : <InfoBody>
      {errorRender}
      {list
      ? <>
        <InfoFuncs labels={labels}
        entries={list.filter(item => item.user === auth?.user).map(item => item.hash)}
        entryFunc={hash => setHash(hash)} />
      </>
      : <InfoSection labels={labels}>
        {list === undefined ? '' : '(empty)'}
      </InfoSection>}
    </InfoBody>}
  </Style>
}

const BoxesEditBody = ({ hash, setHash }: {
  hash, setHash
}) => {
  const auth = useAuth()
  const [box, setBox]: any[] = useState(false)
  const author = auth.user && auth.user === box.user
  const [copied, setCopied] = useState(false)
  const [confirm, toggleConfirm] = useToggle(false)
  const [saved, setSaved] = useState(true)
  const [toggled, setToggled] = useState(new Set())
  const [error, setError, handleError, errorRender] = useError(3000)

  const handle = {
    load: () => {
      setToggled(new Set())
      api.get(`/box/${hash}`).then(({ box }) => {
        setBox(box)
        setSaved(true)
      }).catch(handleError)
    },
    save: () => {
      if (hash != box.hash) {
        api.delete(`/box/${hash}`).catch(handleError)
      }
      api.post(`/box/${box.hash}`, box).then(() => {
        setSaved(true)
        setHash(box.hash)
      }).catch(handleError)
    },
    copy: () => {
      const copyTxt = { ...box, hash: `${box.hash} copy` }
      api.post(`/box/${copyTxt.hash}`, copyTxt).then(() => {
        setHash(copyTxt.hash)
      }).catch(handleError)
    },
    delete: () => {
      api.delete(`/box/${hash}`).then(() => setHash(false)).catch(handleError)
    },
    set: (obj) => {
      if (!author) return
      if (obj.hash && !validHash(obj.hash)) return
      setBox({ ...box, ...obj })
      setSaved(false)
    },
  }

  useF(hash, handle.load)
  useEventListener(window, 'keydown', e => {
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handle.save()
    }
  })

  const textarea = useR()
  return <InfoBody className='box-edit'>
    {errorRender}
    <InfoSection className='input-container' labels={[
      { text: '<', func: () => setHash(false) },
      auth.user && { text: 'copy', func: handle.copy },
      !auth.user && 'log in to copy/edit',
      author && !saved && { text: 'cancel', func: handle.load },
      author && (saved ? 'saved' : { text: 'save', func: handle.save }),
      // { text: saved ? 'saved' : 'save', func: handle.save },
      author && !confirm && { text: 'delete', func: toggleConfirm },
      author && confirm && { text: 'cancel', func: toggleConfirm },
      author && confirm && { text: 'really delete', func: handle.delete },
    ]}>
      {box ? <div className='inputs'>
        <div className='input input-line'>
          <input
          className='input-line-fill'
          type='text' spellCheck='false'
          value={box.hash}
          onChange={e => handle.set({ hash: e.target.value })}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              textarea.current.focus()
            }
          }} />
          <InfoCheckbox
          label='public'
          value={!!box.public}
          onChange={e => handle.set({ public: !box.public })} />
        </div>
        <textarea ref={textarea}
          className={`input`}
          spellCheck='false'
          value={box.value}
          onChange={e => handle.set({ value: e.target.value })} />
      </div> : ''}
    </InfoSection>
  </InfoBody>
}

const Style = styled(InfoStyles)`
.box-edit.body {
  display: flex;
  flex-direction: column;

  br { display: none; }

  .input-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;

    .inputs {
      width: 100%;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      > * {
        margin-top: .5rem;
      }
    }
    .input {
      width: 100%;
    }
    .input-line {
      display: flex;
      > * {
        margin-right: .5rem;
        :last-child {
          margin-right: 0;
        }
      }
    }
    .input-line-fill {
      flex-grow: 1;
    }
    textarea.input {
      flex-grow: 1;
    }
  }

  // textarea.narrow-ruled {
  //   line-height: 1.2;
  // }
  // textarea.college-ruled {
  //   line-height: 1.4;
  // }
  // textarea.wide-ruled {
  //   line-height: 1.6;
  // }
}
`
