/* eslint-disable react/prop-types */
import React, { Fragment, useState } from 'react';
import { convertLinks } from '../lib/render';
import { JSX } from '../lib/types';
import styled from 'styled-components';
import { A, InfoBody, InfoButton, InfoCheckbox, InfoFuncs, InfoSection, InfoSelect, InfoStyles, Select } from '../components/Info';
import { Modal } from '../components/Modal';
import api from '../lib/api';
import { copy } from '../lib/copy';
import { asInput, asMode, useE, useError, useEventListener, useF, useList, useM, useMode, useR, useRerender, useTimeout, useToggle } from '../lib/hooks';
import { useAuth, usePathState, useSave } from '../lib/hooks_ext';
import { meta } from '../lib/meta';
import { S, group, list, named_log, randAlphanum, set } from '../lib/util';
import { useSocket } from '../lib/socket';
import { Scroller } from 'src/components/Scroller';
import { store } from 'src/lib/store';
import { parseSubdomain } from 'src/lib/page';


const log = named_log('txt')
const txt_url = parseSubdomain() === 't' ? 't' : 'txt'
const is_txt_subdomain = set('t txt').has(parseSubdomain())

const host = 'f3n.co'
const short = (window.location.hostname === 'localhost')
  ? window.location.origin : 'https://' + host

enum Rule {
  narrow = 'narrow',
  college = 'college',
  wide = 'wide',
}

// const validHash = str => true // !/[^\w\d .]/.test(str)
const validHash = str => !/\//.test(str)

export default ({short=false}) => {
  const auth = useAuth()
  const [_items, setItems, addItems] = useList<{
    hash:string, t:number,
    public:boolean,
    rule:string,
    user:string,
    value?:string,
  }>()

  const [[view, hash], setParts] = usePathState({
    prefix: '',
    from: path => {
      if (short) {
        let naked = path.replace(/^\//, '')
        return [naked[0] === 'p', naked.replace(/^[tp]-/, '')]
      }

      // split paper/na+me into [true, 'na me']
      const parts = path.split('/').concat([''])
      if (parts[1] === 'paper' && is_txt_subdomain) parts.shift()
      return [parts[0] === 'paper', parts[1]].map(x => x === 'false' ? false : x || undefined)
    },
    to: ([view, hash='']) => {
      if (short) {
        return `${view ? 'p' : 't'}-${hash}`
      }
      
      return [view ? 'paper' : txt_url, hash||'']
    },
    push: true,
  })
  const setHash = hash => setParts([view, hash])
  const setView = view => setParts([view, hash])
  useF(hash, () => meta.title.set(hash ? `${hash} (txt)` : 'txt'))

  const [_0, _1, handleError, errorRender] = useError(3000)

  const handle = {
    load: () => {
      api.get(`/txt/`).then(({ list }) => {
        setItems(list)
      }).catch(handleError)
    },
    new: () => {
      setHash(randAlphanum(7))
    }
  }

  useF(auth.user, hash, handle.load)
  // useF(hash, view, () => hash && setPaper(view))
  useE(view, hash, () => meta.manifest.set({
    name: `/${view ? 'paper' : txt_url}/${hash}`,
    display: `standalone`,
    start_url: `${window.origin}/${view ? 'paper' : txt_url}/${hash}`,
  }))
  const to_hash = hash => is_txt_subdomain ? `/${hash}` : `/${view ? 'paper' : 'txt'}/${hash||''}`

  const [sort, setSort, sort_options] = asMode(store.use('txt-sort'), list('name newest oldest'), true)
  const sort_bind = asInput([sort, setSort])[2]
  const items = useM(_items, sort, () => (compare => _items.slice().sort(compare))({
    oldest: (a, b) => ((a.t||0) - (b.t||0)) || a.hash.localeCompare(b.hash),
    newest: (a, b) => ((b.t||0) - (a.t||0)) || a.hash.localeCompare(b.hash),
  }[sort] || ((a, b) => a.hash.localeCompare(b.hash))))
  console.debug(items, log)

  const labels = [
    // 'txts',
    // { text: 'new', func: handle.new },
    view ? 'papers' : 'txts',
    {
      element: <InfoSelect label={'sort'} options={sort_options} {...sort_bind} />,
    },
    !view && { text: 'view', func: () => setView(true) },
    view
    ? { text: 'edit', func: () => setView(false) }
    : { text: 'new', func: handle.new },
  ]
  return <Style>
    {hash
    ? <TxtEditBody {...{ hash, setHash, view, setView }}/>
    : <InfoBody>
      {errorRender}
      {items
      ? <>
        {/* <InfoFuncs labels={labels}
        entries={items.filter(item => !item.public).map(item => item.hash)}
        entryFunc={hash => setHash(hash)} /> */}
        <InfoSection labels={labels}>
          {items.filter(item => !item.public || item.user === auth.user).map(item => item.hash).map(hash => <a key={hash} onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            if (e.metaKey) {
              open(to_hash(hash), '_blank')
            } else {
              setHash(hash)
            }
          }}>{hash}</a>)}
        </InfoSection>
        <InfoSection labels={['public']}>
          {items.filter(item => item.public).map(item => item.hash).map(hash => <a key={hash} onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            if (e.metaKey) {
              open(to_hash(hash), '_blank')
            } else {
              setHash(hash)
            }
          }}>{hash}</a>)}
        </InfoSection>
      </>
      : <InfoSection labels={labels}>
        {items === undefined ? '' : '(empty)'}
      </InfoSection>}
    </InfoBody>}
  </Style>
}

const TxtEditBody = ({ hash, setHash, view, setView }: {
  hash, setHash, view, setView
}) => {
  const auth = useAuth()
  const [error, setError, handleError, errorRender] = useError(3000)
  const [txt, setTxt]: any[] = useState(false)
  const lines = useM(txt.value, () => (txt.value || '').split('\n').filter(l=>l))
  const author = auth.user && auth.user === txt.user
  const [copied, setCopied] = useState(false)
  const [confirm, toggleConfirm] = useToggle(false)
  const [saved, setSaved] = useState(true)
  const [update, setUpdate] = useState(false)
  const [toggled, setToggled] = useState(new Set())
  useF(lines, () => {
    lines.map(line => {
      if (line.startsWith('- ')) toggled.delete(line)
      if (line.startsWith('x ')) toggled.add(line)
    })
    setToggled(new Set(toggled))
  })

  const textarea = useR()
  const [find, setFind] = useState<false | string>(false)
  const [replace, setReplace] = useState<false | string>(false)
  let findMatches = useR()
  useTimeout(find, () => handle.find(), 500)

  const socket = useSocket({
    on: {
      'emit:txt': (type, _hash) => _hash === hash && {
        'update': () => setUpdate(true),
      }[type](),
    },
    connect: socket => socket.emit('emit', 'txt'),
  })

  const handle = {
    load: () => {
      setToggled(new Set())
      api.get(`/txt/${hash}`).then(({ txt }) => {
        setTxt(txt)
        setSaved(true)
        setUpdate(false)
        if (!txt.value) {
          setView(false)
        }
      }).catch(handleError)
    },
    save: () => {
      if (hash != txt.hash) {
        api.delete(`/txt/${hash}`).catch(handleError)
      }
      socket.emit('emit', 'txt', 'update', hash)
      api.post(`/txt/${txt.hash}`, txt).then(() => {
        setSaved(true)
        setUpdate(false)
        setHash(txt.hash)
      }).catch(handleError)
    },
    copy: () => {
      const copyTxt = { ...txt, hash: `${txt.hash} copy` }
      api.post(`/txt/${copyTxt.hash}`, copyTxt).then(() => {
        setHash(copyTxt.hash)
      }).catch(handleError)
    },
    delete: () => {
      api.delete(`/txt/${hash}`).then(() => setHash(false)).catch(handleError)
    },
    set: (obj) => {
      if (!author) return
      if (obj.hash && !validHash(obj.hash)) return
      console.debug('TXT SET', obj)
      setTxt({ ...txt, ...obj })
      setSaved(false)
    },
    find: () => {
      console.debug('TXT FIND', find, replace)
      if (find !== false) {
        findMatches.current = Array
          .from<RegExpMatchArray>(textarea.current.value.matchAll(new RegExp(find, 'g')))
          .map(x => [x.index, x[0].length])
        console.debug('TXT FIND MATCHES', findMatches.current)
        const L = textarea.current
        const matches = findMatches.current
        if (matches.length) {
          let i = 0
          while (i < matches.length && L.selectionStart > matches[i][0]) i += 1
          const match = matches[(i < matches.length) ? i : 0]
          L.selectionStart = match[0]
          L.selectionEnd = match[0] + match[1]
        }
      }
    },
  }

  useF(hash, handle.load)
  useSave(handle.save)

  const splitLines = useR({})
  const ref = useR()
  const resize = async () => {
    if (ref.current) {
      ref.current.style.display = ''
      ref.current.style.wordBreak = 'break-all'
      ref.current.textContent = 'w'
      const height = ref.current.clientHeight
      while (ref.current.clientHeight === height) ref.current.textContent += '—'
      const minLineLength = ref.current.textContent.length - 1
      console.debug('TXT max line length', minLineLength)

      splitLines.current = {}
      await Promise.all(Array.from(document.querySelectorAll('.paper-line')).map(async x => {
        const text = x.textContent
        const prefix = (/^[ -]+/.exec(text) || [''])[0].replaceAll('-', ' ')
        ref.current.textContent = text.slice(0, minLineLength)
        let height = ref.current.clientHeight
        let h_i = 0
        const lines = []
        const _add = (s, e=undefined) => lines.push((lines.length ? prefix : '') + text.slice(s, e))
        for (let i = minLineLength; i < text.length; i++) {
          // add next word (with space after)
          let s = i
          while (i < text.length - 1 && text[i] !== ' ') i += 1
          ref.current.textContent += text.slice(s, i + 1)
          if (ref.current.clientHeight !== height) {
            if (text[i] === ' ') ref.current.textContent = text.slice(0, i - 1)
            i -= 1
            if (ref.current.clientHeight === height) {
              ref.current.textContent += ' '
            } else while (text[i] !== ' ') i -= 1
            height = ref.current.clientHeight
            // add current line to end of word (not including space)
            _add(h_i, i)
            // increment past space & pre-fill #minLineLength characters
            i += 1
            h_i = i
            ref.current.textContent = text.slice(0, i - 1) + prefix + text.slice(i, i + minLineLength)
            i += minLineLength
          }
        }
        _add(h_i)
        splitLines.current[text] = lines
      }))
      ref.current.style.display = 'none'
    }
  }
  useF(txt.rule, txt.value, view, resize)
  useEventListener(window, 'resize', resize)

  return <InfoBody className='txt-edit'>
    {errorRender}
    {view
    ? <Modal><ModalStyle onClick={() => setView(false)}>
      {txt
      ? <InfoBody
      className={`paper ${txt.rule ?? Rule.college}-ruled`}
      onClick={e => e.stopPropagation()}>
        <InfoSection className='modal-top-line' labels={[
          {
            text: `${location.host}/paper/`,
            label: true,
            func: e => copy(`${short}/paper/${txt?.hash ?? hash}`, e.target),
          },
          txt?.user === auth.user && {
            edit: () => setView(false),
            style: `
            color: #fff;
            `,
          },
          {
            // text: <X size='.8em' fill='#0003' />,
            text: <X size='.74em' />,
            func: () => {
              setHash(false)
            }
          },
        ]}>
          <Scroller scrollBarSelector='.modal .body' />
          <div className={`txt-name ${copied ? '' : 'entry link'}`}>
            {txt?.hash ?? hash}
          </div>
          <div className={`value ${txt.rule ?? Rule.college}-ruled`}>
            {txt
            ? 
            txt.value
              .split('\n')
              .filter(l=>l)
              .concat(list(' '.repeat(100), ''))
              // .flatMap(x => splitLines.current[x] || [x])
              .flatMap((line, i) => {
                return (splitLines.current[line] || [line]).map((x, j) =>
                <div key={[i, j].join()}
                className={`paper-line toggled-${toggled.has(line)}`}
                onClick={() => {
                  if (/^[-x] /.test(line)) {
                    txt.value = txt.value.replace(line, line.replace(/^x /, 'X ').replace(/^- /, 'x ').replace(/^X /, '- '))
                    setTxt({ ...txt })
                    handle.save()
                  }
                  else {
                    toggled.has(line)
                      ? toggled.delete(line)
                      : toggled.add(line)
                    setToggled(new Set(toggled))
                  }
                }}>
                  {convertLinks(x) || ' '}
                </div>)
              })
            : ''}
            <div ref={ref} className={`paper-line`} />
          </div>
        </InfoSection>
      </InfoBody>
      : ''}
    </ModalStyle></Modal>
    : <InfoSection className='input-container' labels={[
      { text: '<', func: () => setHash(false) },
      { text: 'view', func: () => setView(true) },
      auth.user && { text: 'copy', func: handle.copy },
      !auth.user && 'log in to copy/edit',
      author && !saved && { text: 'cancel', func: handle.load },
      author && (saved ? 'saved' : { text: 'save', func: handle.save }),
      // { text: saved ? 'saved' : 'save', func: handle.save },
      author && !confirm && { text: 'delete', func: toggleConfirm },
      author && confirm && { text: 'cancel', func: toggleConfirm },
      author && confirm && { text: 'really delete', func: handle.delete },
      (update ? 'warning: new version available' : false),
    ]}>
      {txt ? <div className='inputs group full' onKeyDown={(e:any) => {
        const L = e.target
        if (e.metaKey && (['f', 'h'].includes(e.key))) {
          const replace = e.key === 'h' || (e.key === 'f' && e.altKey)
          if (replace) {
            e.preventDefault()
            if (find !== false) {
              setFind(false)
              textarea.current.focus()
            } else {
              setFind(L.value.slice(L.selectionStart, L.selectionEnd) || '')
              setReplace(e.key === 'h' || (e.key === 'f' && e.altKey) ? '' : false)
              setTimeout(() => {
                ;(document.querySelector('#find') as any).focus()
              })
            }
          }
        }
      }}>
        <div className='input inline-group'>
          <input
          type='text' spellCheck='false'
          value={txt.hash}
          onChange={e => handle.set({ hash: e.target.value })}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              textarea.current.focus()
            }
            if (e.key === ' ') {
              e.preventDefault()
            }
          }} />
          {/* <InfoCheckbox
          label='public'
          value={!!txt.public}
          onChange={e => handle.set({ public: !txt.public })} /> */}
        </div>
        <div className='input inline-group'>
          <InfoCheckbox
          label='public'
          value={!!txt.public}
          onChange={e => handle.set({ public: !txt.public })} />
          <InfoCheckbox
          label='hidden'
          value={!!txt.hidden}
          onChange={e => handle.set({ hidden: !txt.hidden })} />
          <InfoSelect
          value={txt.rule ?? Rule.college}
          options={Object.keys(Rule)}
          onChange={e => handle.set({ rule: e.target.value })}
          display={rule => `${rule}-ruled`} />
        </div>
        <textarea ref={textarea}
          className={`input ${txt.rule ?? Rule.college}-ruled`}
          spellCheck='false'
          value={txt.value}
          onKeyDown={(e:any) => {
            const L = e.target
            if (e.key === 'Enter') {
              const cursor = e.target.selectionStart
              let start = cursor
              let text = e.target.value
              while (start && text[start] !== '\n') start -= 1
              const line = text.slice(start, cursor)
              if (line.trim()) {
                e.preventDefault()
                const indentMatch = /^\s*/.exec(line)
                const colonMatch = /:\s*$/.exec(line)
                const indent = (indentMatch[0] || '\n') + (colonMatch ? '  ' : '')
                text = text.slice(0, cursor) + indent + text.slice(cursor)
                e.target.value = text
                // e.target.selectionStart = e.target.selectionEnd = cursor + indent.length
              }
            } else if (e.key === 'Tab' && !e.metaKey) {
              e.preventDefault()
              const text = L.value
              // indent from start of each selected line
              let start = L.selectionStart, end = L.selectionEnd
              const untab = e.shiftKey
              let i = Math.max(0, start - 1)
              while (i && text[i] !== '\n') i -= 1
              start = text[i] === '\n' ? i + 1 : i
              let indented = text.slice(0, i)
              for (; i <= L.selectionEnd; i++) {
                if (!i) {
                  if (untab) for (let j = 0; j < 2 && text[i] === ' '; i++, j++) {}
                  else indented += '  '
                }
                if (text[i]) indented += text[i]
                if (text[i] === '\n') {
                  i += 1
                  if (untab) for (let j = 0; j < 2 && text[i] === ' '; i++, j++) {}
                  else indented += '  '
                  i -= 1
                }
              }
              indented += text.slice(i)
              e.target.value = indented
              L.selectionEnd = Math.max(start, end + (indented.length - text.length))
              L.selectionStart = start === end ? L.selectionEnd : start
            } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
              const lines = L.value.split('\n')
              let start, end
              for (let i = 0, l = 0; i <= L.selectionEnd && l < lines.length; i += lines[l].length + 1, l += 1) {
                console.debug(i, L.selectionStart, L.selectionEnd, l, start, end)
                if (i <= L.selectionStart) start = l
                end = l
              }
              console.debug('SHIFT', start, end, L.selectionStart, L.selectionEnd, lines, L.value.slice(L.selectionStart, L.selectionEnd), lines.slice(start, end + 1))
              const up = e.key === 'ArrowUp'
              const valid = up ? start > 0 : end < lines.length - 1
              if (valid) {
                const selection = [L.selectionStart, L.selectionEnd].map(x => x + (up ? -1 : 1) * (lines[up ? start - 1 : end + 1].length + 1))
                if (up) {
                  lines.reverse()
                  ;[start, end] = [lines.length - 1 - end, lines.length - 1 - start]
                }
                lines.splice(start, 0, lines.splice(end + 1, 1))
                if (up) lines.reverse()
                const scroll = L.scrollTop
                L.value = lines.join('\n')
                console.debug(selection)
                setTimeout(() => {
                  L.selectionStart = selection[0]
                  L.selectionEnd = selection[1]
                  if (e.key === 'ArrowUp') L.scrollTop = scroll
                })
              }
            } else if (e.key === 'Backspace') {
              e.preventDefault()
              const selection = [L.selectionStart, L.selectionEnd]
              let newValue
              console.debug(selection)
              if (selection[0] === selection[1]) selection[0] -= 1
              newValue = L.textContent.slice(0, selection[0]) + L.textContent.slice(selection[1])
              handle.set({ value: newValue })
              setTimeout(() => {
                L.selectionStart = selection[0]
                L.selectionEnd = selection[0]
              })
            }
          }}
          onChange={e => handle.set({ value: e.target.value })} />
          {find !== false
          ?
          <>
            <input id='find'
            type='text' value={find}
            onChange={e => setFind(e.target.value)} />
            {replace !== false
            ?
            <input type='text' value={replace}
            onChange={e => setReplace(e.target.value)} />
            :''}
            <div style={{display:'flex'}} className='input input-line'>
              {/* <InfoButton onClick={e => handle.find()}>find</InfoButton> */}
              {replace !== false
              ? <>
                <InfoButton onClick={e => {
                  const L = textarea.current
                  const matches = findMatches.current
                  console.debug('TXT REPLACE', matches, find, replace)
                  if (matches.length) {
                    let i = 0
                    while (i < matches.length && L.selectionStart > matches[i][0]) i += 1
                    i %= matches.length
                    const match = matches[i]
                    const [start, end] = [match[0], match[0] + match[1]]
                    const slice = L.value.slice(start, end)
                    const replacement = slice.replace(new RegExp(find), replace)
                    console.debug('TXT REPLACE MATCH', match, slice, replacement)
                    L.value = L.value.slice(0, start) + replacement + L.value.slice(end)
                    L.selectionStart = start
                    L.selectionEnd = start + replacement.length - 1
                    handle.find()
                    handle.set({ value: L.value })
                  }
                }}>replace</InfoButton>
                <InfoButton onClick={e => {
                  textarea.current.value = textarea.current.value.replaceAll(new RegExp(find, 'g'), replace)
                  handle.find()
                  handle.set({ value: textarea.current.value })
                }}>replace all</InfoButton>
              </>
              :''}
            </div>
          </>
          :''}
      </div> : ''}
    </InfoSection>}
  </InfoBody>
}

const X = ({ size='1em', fill='currentcolor' }: {
  size?: string, fill?: string
}) => {
  return <svg className='x'
  xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img"
  width={size} height={size} preserveAspectRatio="xMidYMid meet"
  viewBox="0 0 460.775 460.775" fill={fill} stroke={fill} style={S(`
  stroke-width: 50;
  `)}>
  <path d="M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55
    c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55
    c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505
    c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55
    l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719
    c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z"/>
  </svg>
}

const Style = styled(InfoStyles)`
.txt-edit.body {
  display: flex;
  flex-direction: column;

  br { display: none; }

  .input-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    margin: 0;

    .input {
      width: 100%;
    }
    textarea.input {
      flex-grow: 1;
      user-select: text;
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

textarea.narrow-ruled {
  font-size: .8em !important;
}
textarea.wide-ruled {
  font-size: 1.2em !important;
}
`

const ModalStyle = styled(InfoStyles)`
border-radius: .2rem;

.button {
  // position: absolute !important;
  // right: 0.8rem !important;
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
// background: linear-gradient(15deg, #609e98, #e2d291) fixed;
background: var(--id-color);

border-radius: 0 !important;

.paper {
  // background: var(--id-color-text) !important;
  // color: var(--id-color-text-readable) !important;

  background: #fff;
  color: #000;
}

.body.body.body {
  min-height: calc(100% - .5em - 2px); margin-top: calc(-.5em + 2px) !important;
  min-width: calc(100% - 4px);
  min-width: calc(100% - .5em - 2px); margin-left: calc(-.5em + 2px) !important;
  padding-bottom: 0 !important;

  z-index: 2;
  white-space: pre-wrap;
  max-width: fit-content;
  max-width: calc(100% - 1em);
  flex-grow: 0;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0.2rem;
  border: 1px solid black;
  // overflow-y: auto;
  background: var(--id-color-text-readable) !important;
  color: var(--id-color-text) !important;

  max-height: calc(100% - 2rem);

  @keyframes appear {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  position: relative;
  .badges {
    align-items: stretch !important;
  }

  .txt-name {
    // padding-left: 1rem;
    line-height: 2rem;
    border-bottom: 2px solid #0002;

    // notebook style
    width: calc(100% + 1rem);
    margin-left: -0.5rem;
    // padding-left: 1.5rem;
    border-bottom: 2px solid #02f4;
    // padding-top: .7rem;
    // padding-bottom: .2rem;


    font-weight: bold;
  }
  .txt-name, .value > div {
    padding-left: calc(1.5rem + .33em); !important;
  }
  .value {
    overflow-y: auto;
    text-shadow: none;
    // min-height: fit-content;

    // notebook style
    position: relative;
    // overflow-y: initial;
    left: -0.5rem;
    width: calc(100% + 1rem);
  }
  // &.narrow-ruled .txt-name,
  &.narrow-ruled .value > div {
    line-height: 1rem;
    // font-size: 1rem;
    // // padding-top: 0;
    // margin-bottom: 0;
  }
  // &.college-ruled .txt-name,
  &.college-ruled .value > div, .value > div {
    line-height: 2rem;
    // line-height: 1rem;
    // font-size: 1rem;
    // // padding-top: .7rem;
    // margin-bottom: .7rem;
  }
  // &.wide-ruled .txt-name,
  &.wide-ruled .value > div {
    line-height: 2.5rem;
    // line-height: 1rem;
    // font-size: 1.1rem;
    // // padding-top: 1.2rem;
    // margin-bottom: 1.2rem;
  }
  .value > div {
    border-bottom: 1px solid #0001;
    display: inline-block;
    width: 100%;
    // line-height: 2rem;
    line-height: 1rem;
    &:last-child {
      margin-bottom: 0;
    }
    cursor: pointer;

    // notebook style
    // width: calc(100% + 1rem);
    // margin-left: -0.5rem;
    // padding-left: calc(1.5rem + .5em); !important;
    border-bottom: 1px solid #02f3;

    &:first-child {
      // border-top: 2px solid #0002;
      margin-top: .4rem;

      // notebook style
      margin-top: 0;
    }
    &.toggled-true {
      color: #0001;

      // notebook style
      color: #0003;
      text-decoration: line-through;
    }
    &:hover {
      // background: linear-gradient(15deg, #0000 90%, #609e98 90%, #e2d291) fixed;
      // border-right: 2px solid #000;
      // border-bottom-color: transparent;
    }

    position: relative;
    // &:hover::after {
    //   background: linear-gradient(15deg,#609e9880,#e2d29180) fixed;
    //   content: "";
    //   height: 0.2rem;
    //   width: 100%;
    //   position: absolute;
    //   left: 0;
    //   bottom: 0;
    //   z-index: -1;
    // }
    // &:hover::before {
    //   background: linear-gradient(15deg,#609e9810,#e2d29110) fixed;
    //   content: "";
    //   height: 100%;
    //   width: 100%;
    //   position: absolute;
    //   left: 0;
    //   bottom: 0;
    //   z-index: -1;
    // }

    // &:hover::after {
    //   background: linear-gradient(15deg,#609e9880,#e2d29180) fixed;
    //   border-radius: .2rem;
    //   border-radius: 50%;
    //   position: absolute;
    //   top: 50%; right: .15rem;
    //   content: "";
    //   height: 1rem; width: 1rem;
    //   margin-top: -.5rem;
    //   // z-index: -1;
    // }
    // &.toggled-true:hover::after {
    //   background: linear-gradient(15deg,#609e9820,#e2d29120) fixed;
    //   // border-radius: .2rem;
    //   // border-radius: 50%;
    // }

    .line-x {
      display: none;
    }
    // &:hover .line-x {
    //   border: none;
    //   background: #f75454;
    //   background: #f17a7a;
    //   background: linear-gradient(15deg,#609e9880,#e2d29180) fixed;
    //   border-radius: .3rem;
    //   font-size: .5rem; color: #0002; text-shadow: none;
    //   width: 1.2rem; height: 1.2rem;
    //   display: inline-flex; align-items: center; justify-content: center;
    //   position: absolute;
    //   top: 50%; right: 0;
    //   margin-top: -.6rem;
    //   border-radius: 50%;
    // }
    // &.toggled-true:hover .line-x {
    //   background: linear-gradient(15deg,#609e9820,#e2d29120) fixed;

    //   svg {
    //     display: none;
    //   }
    // }
  }

  // // notebook style
  // .value::after {
  //   content: "";
  //   width: 0;
  //   height: calc(100% + 2rem);
  //   display: block;
  //   border-left: 2px solid #0002;
  //   bottom: -.5rem;
  //   left: .5rem;
  //   position: absolute;
  // }

  // notebook style
  &::after {
    // content: "";
    // width: 0;
    // height: calc(100% + 2rem);
    // display: block;
    // border-left: 2px solid #0002;
    // bottom: -.5rem;
    // left: .5rem;
    // position: absolute;
    content: "";
    width: 0;
    height: calc(100% - 2rem);
    display: block;
    border-left: 2px solid #0002;
    border-left: 2px solid #f004;
    top: 2rem;
    left: 1.5rem;
    position: absolute;
  }
  &.narrow-ruled::after {
    // height: calc(100% - 3.3rem);
    // top: 2.5rem;
  }
  &.college-ruled::after {
    // height: calc(100% - 3.3rem);
    // top: 2.5rem;
  }
  &.wide-ruled::after {
    // height: calc(100% - 3.3rem);
    // top: 2.7rem;
  }

  .modal-top-line {
    max-height: 100%;
    display: flex;
    flex-direction: column;
    > br { display: none; }
  }

  .modal-top-line .badges {
    // display: inline-flex;
    // width: calc(100% + 0.5rem);
    // justify-content: space-between;
    // align-items: center;

    // X
    > :last-child {
      border: none;
      background: #f75454;
      background: #f17a7a;
      color: #0002; text-shadow: none;
      width: 1.2rem; height: 1.2rem;
      // width: 2rem; height: 2rem; position: absolute; right: .8rem;
      display: flex; align-items: center; justify-content: center;
      svg {
        // width: 1rem; height: 1rem;
      }
      // display: none;

      background: #000;
      color: #fff;
    }
  }

  .pencil {
    display: none;
    position: absolute;
    right: -.1rem;
    top: 50%; margin-top: -.75rem;
  }
}
`