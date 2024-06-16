/* eslint-disable react/prop-types */
import React, { Fragment, useState } from 'react';
import { parseSubdomain } from '../lib/page';
import { convertLinks, extractLinks } from '../lib/render';
import { JSX } from '../lib/types';
import url from '../lib/url';
import styled from 'styled-components';
import { A, InfoBadges, InfoBody, InfoLabel, InfoLine, InfoSection, InfoUser } from '../components/Info';
import { Modal } from '../components/Modal';
import api, { auth } from '../lib/api';
import { copy } from '../lib/copy';
import { useE, useEventListener, useF, useR } from '../lib/hooks';
import { useAuth, useHash, useSave } from '../lib/hooks_ext';
import { fromHash, hashString, randAlphanum } from '../lib/util';
import { domains } from './domains';
import { Select, SettingStyles } from './settings';

const { named_log } = window
const log = named_log('ly')

const sep = ':'
const copySep = ''
let host = 'freshman.dev'
if (location.host.length < host.length) {
  host = location.host
}
const short = (window.location.hostname === 'localhost')
  ? window.location.origin : 'https://' + host

// const tiny = (window.location.hostname === 'localhost')
//   ? window.location.origin : 'https://f8n.co'
// const short = (window.location.hostname === 'localhost')
//   ? window.location.origin : 'https://cyfr.dev'
// const long = (window.location.hostname === 'localhost')
//   ? window.location.origin : 'https://freshman.dev'

let lyView
export default ({ loaded }) => {
  const lyRegex = /\/(\.|:|-|ly\/)([^#]+)/.exec(location.href)
  lyView = lyRegex && lyRegex[2]

  auth.use()
  let [error, setError] = useState('')
  let [hash, setHash] = useState(fromHash() || lyView || '')
  let [ly, setLy] = useState({
    hash,
    links: []
  })
  let [lys, setLys] = useState(undefined)
  let [edit, setEdit] = useState(true);

  useF(auth.user, () => {
    ly.hash && handle.load();
    handle.loadAll();
  })
  useHash({}, ly, () => ly.hash === lyView ? '' : ly.hash)

  useF(edit, () => edit && setHash(ly.hash))
  const handle = {
    setLy,
    setEdit,
    loadAll: () => {
      if (auth.user) {
        api.get('/ly').then(data => {
          setError('')
          setLys(data.list)
        }).catch(e => setError(e.error))
      } else {
        setLys([])
      }
    },
    load: () => {
      return ly.hash && api.get(`/ly/${ly.hash}`).then(data => {
        setError('')
        if (data.ly) {
          setLy(data.ly);
        } else {
          // setError(`/ly/${ly.hash} does not exist`)
          setEdit(true)
        }
      }).catch(e => setError(e.error))
    },
    save: (_ly=ly) => {
      _ly.links = _ly.links.filter(l => l)
      return api.post(`/ly/${_ly.hash}`, _ly).then(data => {
        setError('')
        if (data.ly) {
          // setLy(data.ly);
          setEdit(false);
          handle.loadAll();
        } else {
          // setError(`${ly.hash} does not exist`)
          setEdit(true)
        }
      }).catch(e => {
        setError(e.error)
        setEdit(true)
      })
    },
    new: () => {
      setEdit(true)
      setLy({
        hash: randAlphanum(7),
        links: [],
        isNew: true,
      })
    },
    delete: (_ly=ly) => {
      log({_ly})
      return api.delete(`/ly/${_ly.hash}`).then(data => {
        handle.setLy({ hash: '' })
        handle.loadAll()
      })
    },
    cancel: () => {
      setEdit(false)
      setError('')
      if (ly.isNew) {
        handle.menu()
      } else {
        setLy(lys.find(l => l.hash === hash))
      }
    },
    menu: () => {
      setEdit(false)
      setError('')
      setLy({
        hash: '',
        links: [],
      })
    },
  };
  useSave(handle.save)

  // useE(loaded)
  if (ly?.hash && edit && auth.user !== 'cyrus') setEdit(false)
  return (
  <Style>
    <InfoBody>
      {!error ? ''
      : <div className='error' style={{color: 'red', minHeight: '0'}}>{error}</div>}
      {ly.hash && !edit
      ? <LinkView handle={handle} ly={ly} />
      : auth.user !== 'cyrus'
      ? `you aren't cyrus, sorry :/`
      : ly.hash
      ? <LinkEdit handle={handle} ly={ly} />
      : <LinkMenu handle={handle} lys={lys} />}
    </InfoBody>
  </Style>
  )
}

const LinkMenu = ({handle, lys}) => {
  let auth = useAuth()
  let [copied, setCopied] = useState(-1)
  let [copyOff, setCopyOff] = useState(-1)

  const [mode, setMode] = useState(undefined)
  const edit = mode === 'edit'
  useEventListener(window, 'keydown keyup', e => {
    if (e.key === 'Shift') setMode(e.metaKey ? 'edit' : edit ? false : mode)
  })

  useF(copied, () => {
    if (copied > -1) {
      clearTimeout(copyOff)
      setCopyOff(setTimeout(() => setCopied(-1), 3000))
    }
  })
  return auth.user && lys
  ? <>
    <InfoSection className='lys'
    labels={[
      'lys',
      { [edit ? 'view' : 'edit']: () => setMode(edit ? false : 'edit') },
      edit || { text: 'new', func: handle.new },
    ]}>
      {lys.length
      ? lys.map((ly, i) => {
        const preview = ly.links[0] + (ly.links.length === 1 ? '' : ` + ${ly.links.length - 1}`)
        return edit||1
        ? <>
        <InfoBadges key={i} labels={[
          { [`/${copySep}${ly.hash}`]: () => {
            handle.setLy(ly)
            handle.setEdit(true)
          } },
          !edit && { copy: e => copy(location.origin + `/${copySep}${ly.hash}`, e.currentTarget) },
          edit && { clone: () => {
            const lyCopy = {
              ...ly,
              hash: ly.hash + '*',
            }
            // handle.setLy(lyCopy)
            handle.save(lyCopy) // .then(() => handle.setEdit(true))
          } },
          edit && { delete: () => handle.delete(ly) },
          preview,
        ]} />
        <br/>
        </>
        : <InfoLine key={i} labels={[preview]}>
        <div className={copied === i ? 'entry' : 'entry link'} onClick={e => {
          const shortLink = `${ly.domain || short}/${copySep}${ly.hash}`
          console.debug('LY COPY', shortLink)
          copy(shortLink)
          setCopied(i)
          if (e.metaKey) url.new('/:'+ly.hash)
          }}>
          {copied === i ? 'copied!' : `/${copySep}${ly.hash}`}</div>
      </InfoLine>
      })
      : <div>no links</div>}
    </InfoSection>
  </>
  : <InfoSection label='your links'>
    {lys ? 'sign in to create & edit links' : ''}
  </InfoSection>
}

const LinkEdit = ({handle, ly}) => {
  const auth = useAuth()
  const hashInput = useR();
  const linksInput = useR();
  useE(ly, () => {
    // hashInput.current.value = ly.hash;
    // linksInput.current.value = ly.links.join('\n');
  });
  return <>
    <InfoSection labels={[
      { text: 'menu', func: () => handle.menu() },
      { text: 'cancel', func: () => handle.cancel() },
      ly.links.some(l=>l) ? { text: 'save', func: () => handle.save(ly) } : ''
    ]}>
      <A href={`https://${ly.domain || location.host}/${ly.hash}`} />
    </InfoSection>
    <InfoSection className='edit-container' labels={[
      'short',
    ]} >
      <input ref={hashInput}
          className='input' type='text' spellCheck='false'
          value={ly.hash}
          onChange={e => handle.setLy({...ly, hash: hashInput.current.value})} />
    </InfoSection>

    <InfoSection label='author'>
      {ly.user || auth.user}
    </InfoSection>

    <InfoSection label='domain'>
      <label className='action'>
        <Select
        value={ly.domain || 'unset'} options={['unset'].concat(domains.map(d => d.text))} preserveCase
        onChange={e => handle.setLy({ ...ly, domain: e.target.value === 'unset' ? undefined : e.target.value }) }/>
      </label>
    </InfoSection>

    <InfoSection className='edit-container' label='links'>
      <textarea ref={linksInput}
        className='input' spellCheck='false'
        rows={Math.max(5, ly.links.length + 1)}
        value={ly.links.join('\n')}
        onChange={e => {
          let newLinks = linksInput.current.value
            .replace(/\n{3,}/g, '\n\n')
            .split('\n')
            // .map(l => l.trim())
          handle.setLy({ ...ly, links: newLinks})}} />
    </InfoSection>
  </>
}

const LinkView = ({handle, ly}) => {
  let auth = useAuth()
  let [copied, setCopied] = useState(false)
  let [confirm, setConfirm] = useState(false)

  let isUser = auth.user === ly.user;
  let isMe = auth.user === 'cyrus';
  const display = !isMe || lyView
  const [modal, setModal] = useState(display)
  const close = () => {
    setModal(false)
    url.push(parseSubdomain() ? '/' : '/-search')
  }

  return <>
    {display ? '' : <InfoLine><InfoLabel labels={[
      { text: 'menu', func: () => handle.menu() },
      { text: 'open', func: () => setModal(true) },
      // { text: 'open', func: () => window.open(`/ly/${ly.hash}`, '_self') },
      isUser ? { text: 'edit', func: () => handle.setEdit(true) } : '',
      (isUser && !confirm) ? { text: 'delete', func: () => setConfirm(true) } : '',
      (isUser && confirm) ? { text: 'cancel', func: () => setConfirm(false) } : '',
      (isUser && confirm) ? { text: 'really delete', func: () => handle.delete() } : '',
    ]} /></InfoLine>}
    <InfoSection labels={[
      'short',
      display && { text: 'open', func: () => setModal(true) },
    ]}>
      <div className={copied ? '' : 'entry link pointer-target'} onClick={() => {
        // copy(`${window.location.origin}/ly/${ly.hash}`);
        copy(`${ly.domain || short}/${copySep}${ly.hash}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
        }}>
        {/* {copied ? 'copied!' : `${window.location.host}/ly/${ly.hash}`}</div> */}
        {/* {copied ? 'copied!' : `${tiny.replace(/https?:\/\//, '')}/ly/${ly.hash}`}</div> */}
        {copied ? 'copied!' : `${ly.domain || host}/${copySep}${ly.hash}`}</div>
    </InfoSection>

    {display ? '' : <InfoUser labels={['author']} user={ly.user || auth.user || ''} />}

    <InfoSection label='links'>
      {convertLinks(ly.links.join('\n'))}
      {/* {ly.links.map((link, i) => {
        const parts = link.split(' ')
        const url = parts[0]
        let label = parts.slice(1).join(' ')
        return <div className='entry' key={i}>
          <a href={'http://' + url.replace(/https?:\/\//, '')}>
            {url}
          </a> {label}
        </div>
      })} */}
    </InfoSection>

    {modal ? <Modal><ModalStyle onClick={() => close()} style={{
      background: `hsl(${hashString(ly.hash) % 360} 100% 97%)`,
    }}>
      {ly.links.length === 0 ? '' : <InfoBody onClick={e => e.stopPropagation()}>
        <InfoSection className='modal-top-line' labels={[
          `${ly.domain || location.host}/${sep}`,
          { text: <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width=".9em" height=".9em" preserveAspectRatio="xMidYMid meet"
          viewBox="0 0 460.775 460.775" fill="#0003">
          <path d="M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55
            c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55
            c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505
            c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55
            l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719
            c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z"/>
          </svg>,
          func: () => close(), style: {
            // position: 'absolute',
            // margin: 0,
            // top: '.5rem',
            // right: '.5rem',
            // minWidth: '1.38rem',
            // fontSize: '1rem',
            // width: '1.38rem',
            // height: '1.38rem',
            // display: 'flex', alignItems: 'center', justifyContent: 'center',
            // borderWidth: '1.5px',
          } },
        ]}>
          <div className={copied ? '' : 'entry link pointer-target'} onClick={() => {
            // copy(`${window.location.origin}/ly/${ly.hash}`);
            copy(`${ly.domain || short}/${copySep}${ly.hash}`)
            setCopied(true)
            setTimeout(() => setCopied(false), 3000)
            }}>
            {/* {copied ? 'copied!' : `${window.location.host}/ly/${ly.hash}`}</div> */}
            {/* {copied ? 'copied!' : `${tiny.replace(/https?:\/\//, '')}/ly/${ly.hash}`}</div> */}
            {copied ? 'copied!' : `${ly.hash}`}</div>
        </InfoSection>
        <InfoSection label='links' className='links'>
          {ly.links.map((link, i) => {
            let url = extractLinks(link)[0] || ''
            const label = url ? link.replace(new RegExp(` ?${url} ?`), '') : link
            url = url.replace(/(https?:\/\/)?(www\.)?/, '')

            return <div className='entry' key={i}>
              {url
              ? <>
                <a href={url[0] === '/' ? url : url.replace(/^(https?:\/\/)?/, 'http://')}>
                  {label
                  ?
                    <div className='ly-entry-labeled'>
                      <a className='ly-entry-detail'>{url}</a>
                      <div className='ly-entry-main'>{label}</div>
                    </div>
                  : <div className='ly-entry-main'>{url}</div>}
                </a>
              </>
              : <div className='ly-entry-text'>{label}</div>}
            </div>
          })}
        </InfoSection>
      </InfoBody>}
    </ModalStyle></Modal> : ''}
  </>
}


const Style = styled(SettingStyles)`
  .lys {
    .entry {
      min-width: 8rem;
    }
    .entry-line .label {
      max-width: calc(100vw - 15.5rem);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .entry-line {
      max-width: 100%;
      &, * { flex-wrap: nowrap; white-space: pre }
      .badges {
        width: 0;
        flex-grow: 1;
      }
    }
  }

  .entry {
    overflow-wrap: break-word;
  }
`

const ModalStyle = styled(SettingStyles)`
border-radius: .2rem;

.button-close {
  position: absolute !important;
  right: 0.8rem !important;
}

height: 100%; width: 100%;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
background: transparent;
background: #fff8;
border-radius: 0.2rem;

position: relative;
overflow: hidden;
// background: linear-gradient(15deg, #609e98ee, #e2d291ee) fixed;
background: linear-gradient(15deg, #609e98, #e2d291) fixed;

.body {
  z-index: 2;
  white-space: pre-wrap;
  // height: 50%;
  // width: 24rem;
  // width: 95%;
  max-width: fit-content;
  // min-height: 95%;
  // height: calc(100% - 2rem);
  // width: calc(100% - 2rem);
  flex-grow: 0;
  background: white;
  background: #0000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0.2rem;
  border: 1px solid black;

  // animation: .1s appear; // cubic-bezier(0.34, 1.56, 0.64, 1);
  // @keyframes appear {
  //     from { transform: scale(0); }
  //     to { transform: scale(1); }
  // }
  animation: .25s appear; // cubic-bezier(0.34, 1.56, 0.64, 1);
  // @keyframes appear {
  //     from { transform: scale(0); }
  //     to { transform: scale(1); }
  // }
  @keyframes appear {
    from { opacity: 0; }
    to { opacity: 1; }
}

position: relative;

.links .entry > a {
  padding: .5rem;
  border-bottom: 1px solid #0001;
  display: inline-block;
  width: 100%;
  color: currentColor;
  min-width: 8rem;
  user-select: none;

  &:hover {
    color: white;
    background: black;
    text-decoration: none !important;
  }

  min-width: 20rem;
  position: relative;
  display: flex;
  align-items: center;
  padding-right: 4rem;
  &::after {
    content: ">";
    position: absolute;
    right: 0.5rem;
  }

  text-decoration: none;
  .ly-entry-detail { text-decoration: underline }
}
.links .entry:nth-child(3) a {
  border-top: 1px solid #0001;
  margin-top: .8rem;
}

.modal-top-line .badges {
  display: inline-flex;
  width: calc(100% + 0.5rem);
  justify-content: space-between;
  align-items: center;
  width: 100%;
  > :last-child {
    border: none;
    background: #f75454;
    background: #f17a7a;
    color: #0002; text-shadow: none;
    width: 1.2rem; height: 1.2rem;
    width: 1.4rem; height: 1.4rem;
    // width: 2rem; height: 2rem; position: absolute; right: .8rem;
    display: flex; align-items: center; justify-content: center;
    svg {
      // width: 1rem; height: 1rem;
    }
    // display: none;
  }
}

.ly-entry-labeled {
  display: flex;
  flex-direction: column-reverse;
  margin: -0.075rem 0;
}
.ly-entry-detail {
  font-size: .6em;
  // opacity: .33;
}
`