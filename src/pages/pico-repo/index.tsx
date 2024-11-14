import React, { useState } from 'react';
import { A } from '../../components/A';
import { openFeedback, openFrame, openPopup, Tooltip } from '../../components/Modal';
import Vote, { useVotes } from '../../components/Vote';
import api, { auth } from '../../lib/api';
import { useBasicDropdown } from '../../lib/auth';
import { copy } from '../../lib/copy';
import { usePageSettings, useTypedPathState } from '../../lib/hooks_ext';
import { meta } from '../../lib/meta';
import { parseLogicalPath, parseSubpath } from '../../lib/page';
import { JSX, truthy } from '../../lib/types';
import { equal, isMobile, keyOf, node, pick, set, toStyle } from '../../lib/util';
import styled from 'styled-components';
import { Bookmark, Comment, DarkMode, External, ExternalIcon, HalfLine, Help, InfoBody, InfoCheckbox, InfoGroup, InfoLoginBlock, InfoSection, Markdown, ScrollText, Select, Share, Sponsor, Verified } from '../../components/Info';
import { Scroller } from '../../components/Scroller';
import { useCached, useE, useEventListener, useF, useI, useM, useR, useRerender, useStyle, useTimed, useToggle } from '../../lib/hooks';
import { SettingStyles } from '../settings';
import { theme } from '../wordbase/common';


enum PicoTarget {
  PICO = 'Pico',
  PICO_W = 'Pico W',
}
enum PicoFormat {
  ANY = 'any format',
  UF2 = '.uf2',
  MICROPYTHON = 'MicroPython',
  C = 'C/C++',
  OTHER = 'other',
}
enum PicoPhysical {
  ANY = 'any',
  NO = 'no',
  BASIC = 'basic',
  YES = 'yes',
}

enum SortMode {
  RANK = 'rank',
  NEW = 'new',
  NAME = 'name',
}

enum Preface {
  RUN = 'how to run',
  PURCHASE = 'how to purchase',
}
enum Mode {
  BROWSE = 'browse',
  VIEW = 'view',
  COLLECTION = 'saved',
  EDIT = 'share',
}

const ENTRY_DEFAULTS = {
  name: '', author: '', link: '', short: '', user: '',
  count: 1, targets: [], formats: [], physical: [], tags: [],
  content: '', downloads: {}, images: [],
}

export default () => {
  const [darkMode, setDarkMode] = useState(false)
  const accent = darkMode ? '#d0b4b4' : '#444' // '#cd2355' // #bbbbbb
  // useE(() => meta.icon.set(darkMode ? accent : '#fd6464'))
  usePageSettings({
    checkin: 'pico-repo',
    basicDropdown: true,
    background: darkMode ? '#222' : '#fff', text_color: darkMode ? accent : '#000'
  })

  const rerender = useRerender()
  const [{ user }] = auth.use()
  const [entries, setEntries] = useState([])
  const [count, setCount] = useState<number>(0)
  const [target, setTarget] = useState<string>(PicoTarget.PICO_W)
  const [format, setFormat] = useState<string>(PicoFormat.ANY)
  const [physical, setPhysical] = useState<string>(PicoPhysical.ANY)
  const [tags, setTags] = useState<string[]>([])

  const prevMode = useR<string>(undefined)
  const appToLoad = useR(parseLogicalPath().split('/').filter(x => x && !['pico-repo', 'view', 'browse', 'share', 'saved'].includes(x))[0])
  useF(entries, () => {
    if (entries.length && appToLoad.current) {
      const app = appToLoad.current
      appToLoad.current = false
      const entry = entries.find(x => x.id === app || x.name.includes(app))
      console.debug('PICO APP', app, entry, entries)
      entry && setTimeout(() => setDetail(entry.id), 500)
    }
  })
  const [{ id:detail=undefined, mode=undefined }={}, setPathState] = useTypedPathState<{ id:string, mode:string }>({
    from: path => {
      const match = /^([^\/]+)\/([^\/]+)/.exec(path) || /^([^\/]+)/.exec(path)
      let mode, id
      if (match) {
        mode = Object.values(Mode).includes(match[1]) && match[1]
        id = mode ? match[2] : match[1]
        console.debug(
          entries.find(x => x.id === id),
          entries.find(x => x.name === id),
          entries.map(x => pick(x, 'id name')))
        if (!entries.find(x => x.id === id)) {
          id = entries.find(x => x.name === id)?.id || id
        }
      }
      mode = mode || ((id && !prevMode.current) || prevMode.current === Mode.VIEW ? Mode.VIEW : Mode.BROWSE)
      prevMode.current = mode
      console.debug('PARSE PICO-REPO PATH', path, mode, id, match)
      return { mode, id }
    },
    to: ({ id, mode }) => {
      console.debug('FORMAT PICO-REPO PATH', id, mode)
      prevMode.current = mode
      return `${
        [
          Mode.BROWSE,
          Mode.VIEW,
        ].includes(mode) ? '' : mode + '/'
      }${
        id ? '/'+(entries.find(x => x.id === id)?.name || '') : ''
      }`
    },
  })
  const _mode_detail = useR({ mode, detail })
  const setMode = mode => {
    prevMode.current === Mode.VIEW
    _mode_detail.current.mode = mode
    setPathState({ mode, id:_mode_detail.current.detail })
  }
  const setDetail = detail => {
    _mode_detail.current.detail = detail
    setPathState({ mode:_mode_detail.current.mode, id:detail })
  }
  const opened = useM(() => new Set())
  window['opened'] = opened
  useI(mode, () => {
    opened.current?.clear()
    detail && opened.current?.add(detail)
  })

  const [edit, setEdit] = useState<any>(undefined)
  const [collection=new Set(), reloadCollection] =
    useCached<Set<string>>('pico-repo-collection', async () => {
      const { collection: { ids }={ ids:[] } } = await api.get('pico-repo/collection')
      console.debug('PICO-REPO COLLECTION', ids)
      return new Set<string>(ids)
    })
  const [error, setError] = useState('')  

  const filterSave = useR(undefined)
  const handle = {
    edit: (id=undefined) => {
      if (!user) {
        console.debug('PICO-REPO EDIT user not signed in')
        setEdit({})
        return
      }
      return handle.load(id, Mode.EDIT)
    },
    save: (_entry) => {
      api
      .post(`pico-repo/app/${_entry.id}`, _entry)
      .then(entry => {
        handle.load(_entry.id, Mode.VIEW)
      })
      .catch(e => setError(e.error || e))
    },
    load: (_detail=detail, _mode=mode) => {
      return ([Mode.BROWSE, Mode.COLLECTION].includes(_mode)
      ? api.get('pico-repo/app').then(list => {
        console.debug('PICO-REPO ALL', list)
        return { list, entry: list.find(x => x.id === _detail || x.name === _detail) }
      })
      : (detail
        ? api.get(`pico-repo/app/${detail}`) 
        : api.post(`pico-repo/app`))
        .then(({ entry }) => {
          const editMode = mode === Mode.EDIT
          if (!entry || (editMode && entry.user !== user)) {
            return { entry: undefined, list: [] }
          }

          if (editMode) {
            setEdit(entry)
            if (!filterSave.current) filterSave.current = { count, target, format, physical, tags }
            setCount(entry.count)
            entry.targets && setTarget(PicoTarget[entry.targets[0]] || entry.targets[0])
            entry.formats && setFormat(PicoFormat[entry.formats[0]] || entry.formats[0])
            entry.physical && setPhysical(PicoPhysical[entry.physical[0]] || entry.physical[0])
            entry.tags && setTags(entry.tags)
          } else if (filterSave.current) {
            const { count, target, format, physical, tags } = filterSave.current
            filterSave.current = undefined
            setCount(count)
            setTarget(target)
            setFormat(format)
            setPhysical(physical)
            setTags(tags)
          }
          
          return {
            entry,
            list: [entry],
          }
        })
      )
      .then(({ list, entry }) => {
        list.map(x => Object.assign(x, {
          ...ENTRY_DEFAULTS,
          ...x,
        }))
        const listIds = new Set(list.map(x => x.id))
        setEntries([].concat(list, entries.filter(x => !listIds.has(x.id))))
        if (_lastDetail.current === _detail) {
          setDetail(entry?.id)
        }
        setMode(_mode)
        return { list, entry}
      })
      .catch(e => setError(e.error || e))
    },
    collect: async (id, state=true, voteHandle=undefined) => {
      if (state) {
        collection.add(id)
        voteHandle?.yes && voteHandle.yes()
        rerender()
        await api.post(`pico-repo/app/${id}/collect`)
      } else {
        collection.delete(id)
        rerender()
        await api.delete(`pico-repo/app/${id}/collect`)
      }
      reloadCollection()
    },
    copy: (entry, target=undefined) => {
      copy(
        location.origin
        + parseSubpath(`/pico-repo/${entry.name.replace(/^pico-/, '')}`),
        target)
    },
    reset: () => {
      setCount(0)
      setTarget(PicoTarget.PICO_W)
      setFormat(PicoFormat.ANY)
      setPhysical(PicoPhysical.ANY)
      setTags([])
      setSortMode(SortMode.RANK)
    },
  }
  useF(mode, handle.load)
  useF(mode, () => {
    if (mode !== Mode.EDIT) setEdit(undefined)
  })
  useF(detail, entries, () => {
    detail && entries.length && setTimeout(() => {
      document.querySelector(`#repo-item-${detail}`)?.scrollIntoView({ block:'nearest' })
      document.querySelector('#main').scrollIntoView({ block:'end' })
    })
  })
  useF(entries, () => {
    if (detail && entries.length && !entries.find(x => x.id === detail)) {
      setDetail(undefined)
    }
  })

  useStyle((darkMode ? `
  :root {
    --accent: ${accent};
    --accent-text: #333;
    --accent-text-fade: #3334;
    --accent-background: var(--accent);
    --accent-underline: linear-gradient(0deg, var(--accent) 2px, transparent 2px);

    --background: #2f2f2f;
    --base: #222;
    --text: #ff5959bb;
    --alt: #333;
  }
  .repo-item-vote {
    // filter: invert(1);
  }
  #header {
    background: var(--base);
    color: var(--text);
  }
  #header .dropdown {
    background: var(--accent);
    color: var(--accent-text);
    margin: 0 .25em;
  }
  #header #crumbs a {
    color: var(--accent);
  }
  `:`
  :root {
    --accent: ${accent};
    --accent-light: #888;
    --accent-text: #fff;
    --accent-text-fade: #fff4;
    --background: #f6f3ed;
    --accent-background: linear-gradient(15deg, var(--accent), var(--accent-light));
    --accent-underline: linear-gradient(0deg, var(--accent), var(--accent-light) 2px, transparent 2px);

    --base: white;
    --text: black;
    --alt: #eee;

    // --base: #f2efeb;
    // --background: #fff;
  }
  `) + `
  #home * {
    display: none;
  }
  #header #badges > a:not(.expand-true) {
    background: none;
  }
  #name:not(:hover)::before, #name::after {
    content: "" !important;
  }
  #header .dropdown {
    box-shadow: none;
    border-radius: .5em;
    border-radius: .25em;
  }
  #header .dropdown.out {
    padding: 0 .25em;
  }
  #header .dropdown.in .item:hover {
    // text-decoration: none;
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  #main {
    background: var(--background) !important;
  }
  #main > :last-child {
    background: var(--base) !important;
  }
  #inner-index {
    border-width: .5px !important;
  }

  .filters, .repo-item {
    // background: var(--background) !important;
    background: var(--base) !important;
  }
  .description {
    width: unset !important;
    position: relative;
  }
  .description .expand-how-to {
    margin: 0;
  }

  .repo-item-list {
    margin: -1px -.5em;
    padding: 1px .5em;
  }
  .filters {
    z-index: 2;
    margin-bottom: .25em;
  }
  .repo-item {
    position: relative;
    z-index: 1;
    background: var(--background) !important;
    margin-bottom: .25em;
  }
  .repo-item::before, .repo-item::after {
    z-index: -1;
    content: "";
    position: absolute;
    height: calc(100% + 1em);
    width: 100%;
    border-radius: inherit;
  }
  .repo-item::after {
    background: inherit;
    top: -1em; left: 0;
    border-bottom: inherit; border-right: inherit;
  }
  .repo-item::before {
    background: ${darkMode ? 'black' : 'linear-gradient(#fff4 0 0), var(--accent-background) fixed'};
    top: calc(.125em - 1em); left: .125em;
  }
  .repo-item:hover, .repo-item-open {
    // top: -1px;
    // left: -1px;
  }
  .repo-item:hover::before, .repo-item-open::before {
    // translate: 1.5px 1.5px;
    bottom: 0; left: 0;
    box-shadow: 0 0 .2em 1px ${darkMode ? 'black' : 'var(--accent)'};
  }

  #tooltip {
    background: var(--background) !important;
    color: var(--text) !important;
    padding: .5em;
  }
  `)

  const [votes] = useVotes('pico-repo-')
  useF('VOTES', votes, console.debug)
  const [sortMode, setSortMode] = useState(SortMode.RANK)
  const view = mode === Mode.VIEW && entries.find(x => x.id === detail)
  const saved = mode === Mode.COLLECTION
  const simple = view || edit || saved || true
  const filtered = useM(count, target, format, physical, tags, sortMode, () => !equal({
    count, target, format, physical, tags, sortMode
  }, {
    count: 0,
    target: PicoTarget.PICO_W,
    format: PicoFormat.ANY,
    physical: PicoPhysical.ANY,
    tags: [],
    sortMode: SortMode.RANK,
  }))
  let shown = useM(mode, edit, view, entries, votes, collection, count, target, format, physical, tags, sortMode, () => {
    let shown = edit ? [] : view ? [view] : entries.filter(x => {
      return (
        x.targets.includes(keyOf(PicoTarget, target))
        && (!x.count || !count || count >= x.count)
        && (format === PicoFormat.ANY || x.formats.includes(keyOf(PicoFormat, format)))
        && (physical === PicoPhysical.ANY || x.physical.includes(keyOf(PicoPhysical, physical)))
        && (!tags.length || tags.some(tag => x.tags.includes(tag))))
        && (mode !== Mode.COLLECTION || collection.has(x.id))
    })
    console.debug('PICO-REPO SHOWN', detail, shown, entries)
    if (votes) {
      console.debug('SORT', shown.map(x => `${x.id} ${(votes[`pico-repo-${x.id}`]?.relative || 0)}`))
      const official = {
        'MicroPython': 1000,
        'rshell': 999,
      }
      shown = shown.sort({
        [SortMode.RANK]:
        (a, b) => (official[b.name] || votes[`pico-repo-${b.id}`]?.relative || 0) - (official[a.name] || votes[`pico-repo-${a.id}`]?.relative || 0),

        [SortMode.NEW]:
        (a, b) => b.created - a.created,

        [SortMode.NAME]:
        (a, b) => a.name.localeCompare(b.name),
      }[sortMode])
    }
    return shown
  })
  const _lastDetail = useR()
  useI(detail, shown, () => {
    if (detail) {
      if (shown.find(x => x.id === detail)) opened.add(detail)
      _lastDetail.current = detail
    } else if (_lastDetail.current) {
      opened.delete(_lastDetail.current)
      _lastDetail.current = undefined
    }
  })
  useI(shown, () => {
    const shownIds = new Set(shown.map(x => x.id))
    opened.forEach(x => {
      if (!shownIds.has(x)) opened.delete(x)
    })
  })
  useF(detail, entries, () => {
    if (detail && entries.length && !entries.find(x => x.id === detail)) setDetail(undefined)
  })

  useF('EDIT', edit, console.debug)
  const editSave = useR({})
  useI(edit, () => {
    // clear editSave if edit changed (and wasn't cleared)
    if (JSON.stringify(edit) !== '{}') editSave.current = {}
  })
  if (edit) {
    const _prevEditStr = JSON.stringify(edit)
    console.debug('EDIT-SAVE', Object.keys(editSave.current), editSave.current, edit)
    Object.assign(edit, editSave.current)
    Object.keys(edit).filter(x => x.includes('.')).map(x => {
      const [outer, inner] = x.split('.')
      console.debug(x, outer, inner, JSON.stringify(edit[outer]), JSON.stringify(edit[x]))
      edit[outer] = edit[outer] || {}
      edit[outer][inner] = edit[x]
      delete edit[x]
      console.debug(x, outer, inner, JSON.stringify(edit[outer]), JSON.stringify(edit[x]))
    })
    editSave.current = edit
    const _newEditStr = JSON.stringify(edit)
    if (_prevEditStr !== _newEditStr) setEdit({ ...edit })
  }
  useF(mode, () => editSave.current = {})

  useF(!edit, count, target, format, physical, tags, () => {
    if (edit) {
      // setEdit({
      //   ...edit,
      //   count,
      //   targets: [...new Set((edit.targets || []).concat(target))],
      //   formats: [...new Set((edit.formats || []).concat(format))],
      //   physical: [physical],
      //   tags: [...new Set((edit.tags || []).concat(tags))],
      // })
      editSave.current = {
        ...edit,
        count: count || 1,
        targets: target === PicoTarget.PICO ? ['PICO', 'PICO_W'] : [keyOf(PicoTarget, target)],
        formats: format === PicoFormat.ANY ? [] : [keyOf(PicoFormat, format)],
        physical: physical === PicoPhysical.ANY ? [] : [keyOf(PicoPhysical, physical)],
        tags,
      }
      setEdit(editSave.current)
    }
  })

  const entryBind = entry => {
    const entryElementId = `repo-item-${entry.id}`
    // const isOpen = detail === entry.id
    const isOpen = opened.has(entry.id)
    return {
      id: entryElementId,
      className:  `repo-item repo-item-icon-${!edit && !!entry.icon} ${isOpen?'repo-item-open':''} ${edit ? 'repo-item-open' : ''}`,
      onClick: e => {
        if (isOpen) return
        if (e.metaKey) {
          window.open(`/pico-repo/view/${entry.id}`)
        } else {
          setDetail(entry.id)
        }
      }
    }
  }

  const renderFilters = (entry, vote=null) => {
    const detailed = opened.has(entry.id)
    return <div className='repo-list wrap'>
    {/* {entry.public && <div className='repo-item-vote repo-item-vote-tag'>{vote}</div>} */}
    {entry.count !== undefined && (detailed || (!count && entry.count > 1))
    ?
    <>
      {[entry.count].map(x => <span className='repo-item-count-item repo-list-item'>{x >= 9 ? '≥9' : x >= 4 ? '≥4' : x} device{entry.count === 1 ? '':'s'}</span>)}
    </>
    :''}
    {detailed
    ? <>
      {entry.targets?.length
      ?
      <>
        {entry.targets?.filter(truthy).map(x => <span className='repo-item-target-item repo-list-item'>{PicoTarget[x] || x}</span>)}
      </>
      :''}
    </>
    :''}
    {entry.formats?.length && (detailed || format === PicoFormat.ANY)
    ?
    <>
      {entry.formats?.filter(truthy).map(x => <span className='repo-item-format-item repo-list-item'>{PicoFormat[x] || x}</span>)}
    </>
    :''}
    {entry.physical?.length && (detailed || physical === PicoPhysical.ANY)
    ?
    <>
      {entry.physical?.filter(truthy).map(x => <span className='repo-item-physical-item repo-list-item'>physical/{PicoPhysical[x] || x}</span>)}
    </>
    :''}
    {entry.tags?.length
    ?
    <>
      {entry.tags?.filter(truthy).map(x => <span className='repo-item-tag-item repo-list-item' onClick={e => {
        e.stopPropagation()
        tags.includes(x) ? setTags(tags.filter(y => y !== x)) : setTags(tags.concat(x))
      }}>#{x}</span>)}
    </>
    :''}
  </div>
  }

const renderImages = entry => {
    const images_n = entry.images?.length
    return images_n ? <div className='repo-item-image-list repo-list'>
      {entry.images?.map((x, i) =>
      <img src={x} key={i}
      className='repo-item-image-item repo-list-item' style={{cursor:'pointer'}}
      onClick={e => {
        e.stopPropagation()
        const openImage = async (j, previous=undefined) => new Promise<void>(resolve => {
          const imgTag = document.createElement('img')
          imgTag.onload = () => {
            resolve()
            openPopup(close => <Style style={toStyle(`
              display: flex;
              align-items: center;
              max-width: 100%;
              max-height: 100%;
              cursor: pointer;
              display: none;
              `)}>
                <div style={toStyle(`
                position: absolute;
                bottom: calc(100% + 1em);
                pointer-events: none;
                padding: 0 0.25em;
                border-radius: 2px;
                margin: 0.25em;
                background: var(--accent-background) fixed; color: var(--accent-text);
                color: white;
                bottom: calc(100% + .25em);
                // font-weight: bold;
                `)}><b>{entry.name}</b></div>
                <img src={entry.images[j]} style={{maxWidth:'100%',maxHeight:'100%'}} onLoad={(e:any) => {
                  e.target.parentNode.style.display = ''
                  previous && previous()
                }}/>
                <div style={toStyle(`
                position: absolute;
                padding: 0 0.25em;
                border-radius: 2px;
                margin: 0.25em;
                background: var(--accent-background) fixed; color: var(--accent-text);
                color: white;
                top: calc(100% + .75em);
                white-space: pre;
                `)}>{
                images_n > 1 
                ?
                <>
                  <span onClick={async e => {
                    openImage(((j - 1) + images_n) % images_n, close)
                  }} >← </span>{j+1}/{images_n}<span onClick={async e => {
                    openImage(((j + 1) + images_n) % images_n, close)
                  }} > →</span>
                </>
                : `${j+1}/${images_n}`}</div>
                <div style={toStyle(`
                position: absolute;
                width: 50%; height: 100%;
                top: 0; left: 0;
                `)} onClick={async e => {
                  openImage(((j - 1) + images_n) % images_n, close)
                }} />
                <div style={toStyle(`
                position: absolute;
                width: 50%; height: 100%;
                top: 0; right: 0;
                `)} onClick={async e => {
                  openImage(((j + 1) + images_n) % images_n, close)
                }} />
              </Style>, `
              width: fit-content;
              height: fit-content;
              padding: 0;
              overflow: visible;
              display: flex;
              align-items: center;
              justify-content: center;
              `, {
                outerStyle: `background: #fffc;`,
              })
          }
          imgTag.src = entry.images[j]
        })
        openImage(i)
      }} />)}
    </div> : null
  }

  const clickStart = useR(0)
  useEventListener(window, 'pointerdown', e => clickStart.current = Date.now())
  useEventListener(window, 'click', e => {
    if (Date.now() - clickStart.current > 250) return

    let node = e.target
    while (node && node.tagName !== 'PRE') node = node.parentNode
    if (node) {
      copy(node.textContent)
      node.classList.add('copied')
      setTimeout(() => {
        node.classList.remove('copied')
      }, 1500)
    }
  })

  const [compactView, setCompactView] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const compactViewToggle = <span className='repo-icon' onClick={e => setCompactView(!compactView)}>
    {compactView
    ?
    <svg width="1em" height="1em" viewBox="0 0 24 24"
    fill="none" stroke="currentcolor"
    xmlns="http://www.w3.org/2000/svg">
      <path d="M17.8 10C18.9201 10 19.4802 10 19.908 9.78201C20.2843 9.59027 20.5903 9.28431 20.782 8.90798C21 8.48016 21 7.92011 21 6.8V6.2C21 5.0799 21 4.51984 20.782 4.09202C20.5903 3.7157 20.2843 3.40973 19.908 3.21799C19.4802 3 18.9201 3 17.8 3L6.2 3C5.0799 3 4.51984 3 4.09202 3.21799C3.71569 3.40973 3.40973 3.71569 3.21799 4.09202C3 4.51984 3 5.07989 3 6.2L3 6.8C3 7.9201 3 8.48016 3.21799 8.90798C3.40973 9.28431 3.71569 9.59027 4.09202 9.78201C4.51984 10 5.07989 10 6.2 10L17.8 10Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M17.8 21C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V17.2C21 16.0799 21 15.5198 20.782 15.092C20.5903 14.7157 20.2843 14.4097 19.908 14.218C19.4802 14 18.9201 14 17.8 14L6.2 14C5.0799 14 4.51984 14 4.09202 14.218C3.71569 14.4097 3.40973 14.7157 3.21799 15.092C3 15.5198 3 16.0799 3 17.2L3 17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21H17.8Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    :
    <svg width="1em" height="1em" viewBox="0 0 24 24"
    fill="none" stroke="currentcolor"
    xmlns="http://www.w3.org/2000/svg">
      <path d="M21 10H3M21 18H3M21 6H3M21 14H3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    // <svg width="1em" height="1em" viewBox="0 0 24 24"
    // fill="none" stroke="currentcolor"
    // xmlns="http://www.w3.org/2000/svg">
    //   <path d="M8.4 3H4.6C4.03995 3 3.75992 3 3.54601 3.10899C3.35785 3.20487 3.20487 3.35785 3.10899 3.54601C3 3.75992 3 4.03995 3 4.6V8.4C3 8.96005 3 9.24008 3.10899 9.45399C3.20487 9.64215 3.35785 9.79513 3.54601 9.89101C3.75992 10 4.03995 10 4.6 10H8.4C8.96005 10 9.24008 10 9.45399 9.89101C9.64215 9.79513 9.79513 9.64215 9.89101 9.45399C10 9.24008 10 8.96005 10 8.4V4.6C10 4.03995 10 3.75992 9.89101 3.54601C9.79513 3.35785 9.64215 3.20487 9.45399 3.10899C9.24008 3 8.96005 3 8.4 3Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    //   <path d="M19.4 3H15.6C15.0399 3 14.7599 3 14.546 3.10899C14.3578 3.20487 14.2049 3.35785 14.109 3.54601C14 3.75992 14 4.03995 14 4.6V8.4C14 8.96005 14 9.24008 14.109 9.45399C14.2049 9.64215 14.3578 9.79513 14.546 9.89101C14.7599 10 15.0399 10 15.6 10H19.4C19.9601 10 20.2401 10 20.454 9.89101C20.6422 9.79513 20.7951 9.64215 20.891 9.45399C21 9.24008 21 8.96005 21 8.4V4.6C21 4.03995 21 3.75992 20.891 3.54601C20.7951 3.35785 20.6422 3.20487 20.454 3.10899C20.2401 3 19.9601 3 19.4 3Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    //   <path d="M19.4 14H15.6C15.0399 14 14.7599 14 14.546 14.109C14.3578 14.2049 14.2049 14.3578 14.109 14.546C14 14.7599 14 15.0399 14 15.6V19.4C14 19.9601 14 20.2401 14.109 20.454C14.2049 20.6422 14.3578 20.7951 14.546 20.891C14.7599 21 15.0399 21 15.6 21H19.4C19.9601 21 20.2401 21 20.454 20.891C20.6422 20.7951 20.7951 20.6422 20.891 20.454C21 20.2401 21 19.9601 21 19.4V15.6C21 15.0399 21 14.7599 20.891 14.546C20.7951 14.3578 20.6422 14.2049 20.454 14.109C20.2401 14 19.9601 14 19.4 14Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    //   <path d="M8.4 14H4.6C4.03995 14 3.75992 14 3.54601 14.109C3.35785 14.2049 3.20487 14.3578 3.10899 14.546C3 14.7599 3 15.0399 3 15.6V19.4C3 19.9601 3 20.2401 3.10899 20.454C3.20487 20.6422 3.35785 20.7951 3.54601 20.891C3.75992 21 4.03995 21 4.6 21H8.4C8.96005 21 9.24008 21 9.45399 20.891C9.64215 20.7951 9.79513 20.6422 9.89101 20.454C10 20.2401 10 19.9601 10 19.4V15.6C10 15.0399 10 14.7599 9.89101 14.546C9.79513 14.3578 9.64215 14.2049 9.45399 14.109C9.24008 14 8.96005 14 8.4 14Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    // </svg>

    }
  </span>

  const tagSet = useM(tags, () => new Set(tags))
  const tagOptions = useM(mode, entries, shown, tags, () => [...new Set((mode === Mode.EDIT ? entries : shown).flatMap(x => x.tags))].filter(x => !tagSet.has(x)))
  const filterBar = <div className='filters'>
    {/* {edit
    ?
    <span className='action repo-edit-target-add' onClick={e => {
      setEdit({
        ...edit,
        count,
        targets: [...new Set((edit.targets || []).concat(target))],
        formats: [...new Set((edit.formats || []).concat(format))],
        physical: [physical],
        tags: [...new Set((edit.tags || []).concat(tags))],
      })
    }}>+</span>
    :''} */}
    <span className='action'>
      target/
      <Select label='count' value={count}
      onChange={e => setCount(Number(e.target.value))}
      options={[0, 1, 2, 3, 4, 9]} display={x => x >= 9 ? '≥9' : x >= 4 ? '≥4' : x || '≥1'} />
      <Select label='target' value={target} onChange={e => setTarget(e.target.value)} options={Object.values(PicoTarget)} />
      <Select label='format' value={format} onChange={e => setFormat(e.target.value)}
      options={Object.values(PicoFormat)}
      display={x => edit && x === PicoFormat.ANY ? '(select)' : x} />
    </span>
    <span className='action'>
      physical/
      <Select value={physical} onChange={e => setPhysical(e.target.value)}
      options={Object.values(PicoPhysical)}
      display={x => edit && x === PicoPhysical.ANY ? '(select)' : x} />
    </span>
    <span className='action' id='repo-tag-list'>
      tags/
      <span className='tag-list' style={{display:'inline-flex'}}
      onBlur={(e:any) => {
        setTags([...new Set<string>(Array.from<any>(e.currentTarget.children).map(x => (x.dataset['tag'] ? x : x.querySelector('[data-tag]'))?.textContent.trim()).filter(truthy))])
      }}
      onKeyDown={(e:any) => {
        const node = e.target.parentElement
        if (e.key === 'Enter') {
          e.preventDefault()
          e.target.blur()
          setTimeout(() => Array.from<any>(node.children).slice(-1)[0].focus())
        }
        const isLastElement = e.target === node.lastElementChild
        if (e.key === 'Backspace' && e.target.textContent.trim() === '') {
          const i = isLastElement ? -1 : tags.indexOf(e.target.dataset['tag'])
          tags.splice(i, 1)
          setTags(tags.slice())
          const nextTagToFocus = tags.concat([' ']).slice(i > 0 ? i - 1 : i)[0] || ' '
          console.debug(['ERASE TAG', i, e.target.dataset['tag'], nextTagToFocus])
          setTimeout(() => node.querySelector(`[data-tag="${nextTagToFocus}"]`)?.focus())
        }
      }}>
        {tags.concat([' ']).map((x,i) => {
          const tagElement = <span data-tag={x}
          className='select' contentEditable suppressContentEditableWarning
          onFocus={e => {
            const range = document.createRange()
            range.setStart(e.target, 0)
            range.setEnd(e.target, Math.min(1, e.target.textContent.length))
            const selection = window.getSelection()
            selection.removeAllRanges()
            selection.addRange(range)
          }}
          >{x}</span>

          return <>
          {x === ' ' && tagOptions.length
          ?
          <Tooltip focus of={<div style={toStyle(`
          display: flex;
          flex-wrap: wrap;
          max-width: 20em;
          max-height: 40em;
          row-gap: .25em;
          `)}>
            {tagOptions.map(y => <span className='select' onClick={() => {
              setTags([...tags, y])
              setTimeout(() => (document.querySelector(`[data-tag=" "]`) as any)?.focus())
            }}>{y}</span>)}
          </div>}>{tagElement}</Tooltip>
          : tagElement
          }{'\n'}
        </>
        })}
      </span>
      {/* <div id='repo-input-tags' onKeyDown={e => {
        setTimeout(() => {
          setTags(e.currentTarget.textContent.split(' '))
        })
      }}> */}
        {/* {tags.map(x => <div className='button' contentEditable>{x}</div>)}
        <div className='button' contentEditable> </div> */}
      {/* </div> */}
      {/* <input type='text' value={tags.join(' ')} onChange={e => {
        setTags(e.target.value.split(' '))
      }} /> */}
    </span>
    {edit
    ? <sup>*</sup>
    : <>
      {/* TODO */}
      {/* <span className='action'>
        {compactViewToggle}
      </span> */}
      <span className='action'>
        sort/
        <Select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}
        options={Object.values(SortMode)} />
      </span>
      <span className='action'>
        <span
        className={`select ${filtered ? '' : 'disabled'}`}
        onClick={e => handle.reset()}>RESET</span>
      </span>
    </>}
  </div>
  const [showHowToRun, toggleShowHowToRun] = useToggle(location.hash.includes('how-to'))
  // useF(showHowToRun, () => url.silent(location.pathname + location.search + (showHowToRun ? '#how-to' : '')))
  const sponsor = <Sponsor hideForSupporter dark={theme.invert} />
  const openPinout = () => openFrame({
    href: 'https://pico.pinout.xyz',
    options: { force: true, height: '580px', width: '800px', scale: .7 },
  })
  const howToContent = <>
    <b><External spaced href='https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html#documentation'>Official Pico documentation</External><div/></b>
    {/* <b>.uf2</b>: Hold BOOTSEL and plug in as a USB, then drag-n-drop the .uf2<div/>
    <b>MicroPython</b>: Run the MicroPython .uf2 (<External href='https://www.raspberrypi.com/documentation/microcontrollers/micropython.html#drag-and-drop-micropython'>source</External>: <a href='https://micropython.org/download/rp2-pico-w/rp2-pico-w-latest.uf2'>Pico W</a>, <a href='https://micropython.org/download/rp2-pico/rp2-pico-latest.uf2'>Pico</a>), then use <a href='https://github.com/dhylands/rshell'>rshell</a> to copy the files over and reboot<div/>
    <b>Physical parts required</b>: 'no', 'basic' (1-2 LEDs, a button, etc), or 'yes'<div/> */}
    <div>
      <span className='action button rounded' onClick={() => setFormat(format === PicoFormat.UF2 ? PicoFormat.ANY : PicoFormat.UF2)}>{PicoFormat.UF2}</span> - Hold BOOTSEL and plug in as a USB, then drag-n-drop the .uf2
    </div>
    <div>
      <span className='action button rounded' onClick={() => setFormat(format === PicoFormat.MICROPYTHON ? PicoFormat.ANY : PicoFormat.MICROPYTHON)}>{PicoFormat.MICROPYTHON}</span> - Run the MicroPython .uf2 (<External href='https://www.raspberrypi.com/documentation/microcontrollers/micropython.html#drag-and-drop-micropython'>source</External>: <a href='https://micropython.org/download/rp2-pico-w/rp2-pico-w-latest.uf2'>Pico W</a>, <a href='https://micropython.org/download/rp2-pico/rp2-pico-latest.uf2'>Pico</a>), then use <a href='https://github.com/dhylands/rshell'>rshell</a> to copy the files over and reboot
    </div>
    <div style={{display:'none'}}>
      <i>Some MicroPython apps also provide a .uf2 option.<br/>
      Or, once you've made edits, zip and convert to a .uf2 here:</i>
      &nbsp;<span className='inline-group' style={toStyle(`
      display: inline-flex;
      align-items: center;
      white-space: pre;
      `)}>
        {['PICO', 'PICO_W'].map(x => <span key={x} className='action button' onClick={(e0: any) => {
        const fileInput = node(`<input type='file' accept='.zip' />`)
        fileInput.onchange = (e: any) => {
          if (e.target.files.length) {
            console.debug(e.target.files)
            e0.target.textContent = '(please wait)'
            const name = e.target.files[0].name.replace('.zip', '')
            const query = new URLSearchParams()
            query.set('name', name)
            api.post(`/pico-repo/scripts/micropython-uf2/${x}?${query.toString()}`, e.target.files[0], {
              headers: {
                'Content-Type': 'application/zip',
              },
            })
            .then(res => {
              console.debug(res)
              if (!res.ok) throw res.statusText
              return res
            })
            .then(res => res.blob())
            .then(blob => {
              const blobUrl = URL.createObjectURL(blob)
              const fileDownload = node(`<a href='${blobUrl}' download='${name}.uf2' />`)
              fileDownload.click()
            })
            .catch(async e => {
              console.error(e)
              e0.target.textContent = 'error'
              await new Promise(res => setTimeout(res, 2500))
            })
            .finally(() => e0.target.textContent = PicoTarget[x])
          }
          fileInput.remove()
        }
        fileInput.click()
      }}>{PicoTarget[x]}</span>)}
      </span>
    </div>
    <div>
      <span className='action button rounded' onClick={() => setFormat(format === PicoFormat.C ? PicoFormat.ANY : PicoFormat.C)}>{PicoFormat.C}</span> - Follow <External href='https://www.raspberrypi.com/documentation/microcontrollers/c_sdk.html'>Raspberry Pi's instructions</External> to build a .uf2
    </div>
    <div>
      <b>Physical parts required</b>: <span className='action button rounded' onClick={() => setPhysical(physical === PicoPhysical.NO ? PicoPhysical.ANY : PicoPhysical.NO)}>{PicoPhysical.NO}</span>, <span className='action button rounded' onClick={() => setPhysical(physical === PicoPhysical.BASIC ? PicoPhysical.ANY : PicoPhysical.BASIC)}>{PicoPhysical.BASIC}</span> (1-2 LEDs, a button, etc), or <span className='action button rounded' onClick={() => setPhysical(physical === PicoPhysical.YES ? PicoPhysical.ANY : PicoPhysical.YES)}>{PicoPhysical.YES}</span>
    </div>
    <div className='half'/>
    <div className='inline-group' style={{flexWrap:'wrap', rowGap:'.15em'}}>
      <a className='action button' href='https://buy.stripe.com/cN26pRf2Rgns3ni7ss'
      >Pico W Starter Kit</a>
      <a className='action button' href='https://buy.stripe.com/14k29BbQF5IO9LG28g'
      >with add-on options</a><Help linger><A tab href='/ly/starter-reference' >component reference</A></Help>
      <div style={{flexBasis:'100%'}}/>
      <a className='action button' onClick={e => {
        if (!e.metaKey) {
          e.preventDefault()
          e.stopPropagation()
          openPinout()
        }
      }}>Pinout Reference</a>
      <div/>
    </div>
  </>
  const howToContainer = showHowToRun
  ? <div style={toStyle(`
  font-size: .85em;
  padding: .5em;
  font-family: system-ui;
  border-radius: 2px;
  margin-bottom: .25em;
  row-gap: .25em;
  position: relative; z-index: 100; background: var(--background);
  `)}>
    {howToContent}
    {/* {!isMobile && showHowToRun
    ?
    <span
    className='action button expand-how-to'
    onClick={toggleShowHowToRun}
    style={toStyle(`
    position: absolute;
    top: 0; right: 0; margin: .5em;
    `)}>collapse how-to</span>
    :''} */}
  </div>
  : ''

  return <Style className={`${edit ? 'edit' : ''}`}>
    <InfoBody style={{position:'relative'}}>
      <Scroller />
      {/* <img src='/raw/pico-repo/icon.png' style={toStyle(`
      height: 4.875em; width: 4.875em;
      object-fit: contain;
      border-radius: 2px;
      position: absolute; top: .5em; right: .5em;
      image-rendering: pixelated;
      `)} /> */}
      {/* {isMobile?<div className='pico-scroller' onClick={(e:any) => {
        globalThis['_pico_scroll'] = !(globalThis['_pico_scroll'] ?? true)
        e.target.style.animationPlayState = globalThis['_pico_scroll'] ? 'running' : 'paused'
      }}>
        <Comment text='https://www.reddit.com/r/raspberrypipico/comments/y5l0hp/i_drew_a_pixel_art_image_of_a_raspberry_pi_pico/' />
      </div>:''} */}
      {view || edit || saved ? '' : <>
      <div style={{
        display:'flex',
        // maxWidth:'calc(100% - 4.875em - .5em)'
        }}>
        <span className='title'>Unofficial 'App Store' for {isMobile?'':'Raspberry Pi '}Pico</span>
        {isMobile?'': <>
          <Comment text='https://www.reddit.com/r/raspberrypipico/comments/y5l0hp/i_drew_a_pixel_art_image_of_a_raspberry_pi_pico/' />
          <Tooltip of='View pinout' style={{fontSize:'.6em'}}>
            <a href='https://pico.pinout.xyz' onClick={e => {
              if (!e.metaKey) {
                e.preventDefault()
                e.stopPropagation()
                openPinout()
              }
            }} style={{display:'inline-flex'}}>
              <img src='/raw/pico-repo/pixel-pico-crop.png' style={{height:'calc(1.8em / .7)'}}/>
            </a>
          </Tooltip>
        </>}
        &nbsp;
        <DarkMode setDarkMode={setDarkMode} style={{marginLeft:'auto'}} />
      </div>
      </>}
      <p id='how-to' className='description' style={{width:'fit-content'}}>
        {/* At $6, the Pico W is quite handy for low-powered projects<br/> */}
        {/* But it can still be difficult to get started<br/> */}
        {/* Get the most out of your Pico(s)!<br/> */}
        {simple ? '' : <>
        <span style={toStyle(`
        display: inline-flex;
        justify-content: space-between;
        ${isMobile ? 'width: 100%;' : ''}
        `)}>
          Discover & share ready-made Pico apps&nbsp;{isMobile || showHowToRun ? '' : <Help func={toggleShowHowToRun} linger>
            {howToContent}
          </Help>}
          {isMobile
          ?
          <span className='action button expand-how-to' onClick={toggleShowHowToRun}>{showHowToRun ? `collapse${isMobile?'':' how-to'}` : `${isMobile?'':'expand '}how-to`}</span>
          :''}
        </span>
        <div className='half'/>
        </>}
      </p>
      <InfoSection id='list' labels={[
        Mode.BROWSE,
        // mode === Mode.BROWSE && { text: compactViewToggle },
        Mode.COLLECTION,
        Mode.EDIT,
      ].map(x => typeof(x) !== 'string' || x === mode ? x : { [(
        isMobile ? {
          [Mode.BROWSE]: 'browse',
          [Mode.COLLECTION]: 'saved',
          [Mode.EDIT]: view?.user === user ? 'edit' : 'share',
        } : {
          [Mode.BROWSE]: 'browse projects',
          [Mode.COLLECTION]: 'view saved',
          [Mode.EDIT]: view?.user === user ? 'edit' : 'share a new project',
        }
      )[x] || x]: () => {
        switch (x) {
          case Mode.EDIT:
            handle.edit()
            break
          default:
            setMode(x)
            break
        }
      } } as any).concat([
        simple && { [showHowToRun ? 'hide how-to' : 'how-to']: toggleShowHowToRun },
        {
          text: <span id='send-feedback'>send feedback</span>,
          func: openFeedback,
        },
      ])}>
        {/* {view || edit || saved
        ? <DarkMode setDarkMode={setDarkMode} style={toStyle(`
        position: absolute; top: 0; right: 0; padding-right: .25em;
        z-index: 100;
        `)}/> 
        :''} */}
        {showHowToRun ? howToContainer : ''}
        {edit || view ? '' : filterBar}
        {edit
        ?
        !user
        ? <div><br/><InfoLoginBlock inline to='share a project' className='action button' /></div>
        :
        <div className='repo-item-list' style={{minWidth:'min(60em, calc(100vw - 3em))'}}>
          {[edit].map((entry, i) => {
            const detailed = true
            const _editSave = editSave.current
            const bindSaveField = (Element, field, { multiline=false, markdown=false, list=false }={}) => {
              multiline = multiline || markdown
              // element.contentEditable = true
              // element.onInput = e => {
              //   _editSave[field] = e.currentTarget.textContent
              //   if (!_editSave[field]) setEdit({ ...edit, ..._editSave })
              // }
              // element.textContent = e => {
              //   e.currentTarget.textContent = _editSave[field] || `(enter ${{
              //     short: 'tagline',
              //     content: 'description',
              //   }[field] || field})`
              // }
              // return element

              // return <Element></Element>
              // return null

              const pastes = set('link author downloads.PICO_W downloads.PICO images payment.link icon')
              const labelled = {
                name: 'name',
                short: 'tagline',
                content: 'description - e.g. how to install, list of physical parts required',
                // 'downloads.PICO_W': 'Pico W download link',
                // 'downloads.PICO': 'Pico download link',
              }[field]
              const placeholder = pastes.has(field) ? '(paste URL)' : `(enter${labelled ? ' '+labelled:''})`
              if (field.includes('.')) {
                const [outer, inner] = field.split('.')
                _editSave[field] = (_editSave[outer] || {})[inner] || (list ? [] : '')
              } else {
                _editSave[field] = _editSave[field] || (list ? [] : '')
              }
              return list
              ?
              <span className='editable-list'
              onFocus={(e:any) => {
                if (e.target.textContent === placeholder) {
                  e.target.textContent = '  '
                  const range = document.createRange()
                  range.selectNodeContents(e.target)
                  const selection = window.getSelection()
                  selection.removeAllRanges()
                  selection.addRange(range)
                }
              }}
              onBlur={(e:any) => {
                let node = e.target
                if (!node.textContent.trim()) node.textContent = placeholder
                while (!node.classList.contains('editable-list')) node = node.parentElement
                _editSave[field] = node.textContent.replaceAll(placeholder, '').split(/ +/).filter(truthy)
                setEdit({ ...edit, ..._editSave })
              }}
              onKeyDown={(e:any) => {
                const node = e.target.parentElement
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.target.blur()
                  setTimeout(() => Array.from<any>(node.children).slice(-1)[0].focus())
                }
                const isLastElement = e.target === node.lastElementChild
                if (e.key === 'Backspace' && e.target.textContent.trim() === '') {
                  const values = _editSave[field]
                  const i = isLastElement ? -1 : values.indexOf(e.target.dataset['value'])
                  values.splice(i, 1)
                  setEdit({ ...edit, ..._editSave })
                  console.debug('ERASE TAG', i, e.target.dataset['value'])
                  const nextValueToFocus = values.concat([placeholder]).slice(i > 0 ? i - 1 : i)[0]
                  setTimeout(() => Array
                    .from<any>(node.children)
                    .find(x => x.dataset['value'] === nextValueToFocus)
                    ?.focus())
                }
              }}>
                {_editSave[field].concat([placeholder]).map((x,i) => <>{i > 0 ? <span> </span> : ''}<a contentEditable suppressContentEditableWarning data-value={x}>{x}</a></>)}
                {/* {tags.concat([' ']).map((x,i) => <JSX key={[x, i].join()}><span style={{display:'none'}}> </span><span className='select' contentEditable suppressContentEditableWarning
                data-tag={x}
                onFocus={e => {
                  const range = document.createRange()
                  range.setStart(e.target, 0)
                  range.setEnd(e.target, 1)
                  const selection = window.getSelection()
                  selection.removeAllRanges()
                  selection.addRange(range)
                }}
                >{x}</span>{'\n'}</>)} */}
              </span>
              // ? <span key={i} className='editable-list' style={{display:'inline-flex'}}
              // onFocus={(e:any) => {
              //   if (e.target.textContent === placeholder) e.target.textContent = ''
              // }}
              // onBlur={(e:any) => {
              //   let node = e.target
              //   while (!node.classList.contains('editable-list')) node = node.parentElement
              //   _editSave[field] = node.textContent.replace(placeholder, '').split(/ +/).filter(truthy)
              //   setEdit({ ...edit, ..._editSave })
              // }}
              // onKeyDown={(e:any) => {
              //   if (e.key === 'Enter') {
              //     e.preventDefault()
              //     e.target.blur()
              //   }
              // }}
              // onInput={(e:any) => {
              //   // pass
              // }}>
              //   {_editSave[field].concat([placeholder]).map((x,i) => <JSX key={i}>{i > 0 ? <span> </span> : ''}<a contentEditable suppressContentEditableWarning>{x}</a></>)}
              // </span>
              : <Element contentEditable suppressContentEditableWarning style={{
                whiteSpace: 'pre-wrap',
                display: 'inline-block',
                width: multiline ? '-webkit-fill-available' : '',
                height: multiline ? '100%' : '',
                marginRight: multiline ? '' : 0,
              }} onFocus={e => {
                e.currentTarget.textContent = _editSave[field]
                if (!multiline) e.currentTarget.style.minWidth = '5em'
              }} onBlur={e => {
                if (!_editSave[field]) e.currentTarget.textContent = placeholder
                // else if (markdown) e.currentTarget.innerHTML = `<div style="
                // white-space: pre-wrap;
                // ">${DOMPurify.sanitize(marked.parse(_editSave[field]))}</div>`

                if (!multiline) e.currentTarget.style.minWidth = ''
                setEdit({ ...edit }) // trigger update to overwrite w/ editSave values
              }} onKeyDown={e => {
                if (e.key === 'Enter' && !multiline) {
                  e.preventDefault()
                  e.currentTarget.blur()
                }
              }} onInput={e => {
                _editSave[field] = e.currentTarget.textContent
                // if (!_editSave[field]) setEdit({ ...edit, ..._editSave })
              }}>{_editSave[field] || placeholder}</Element>
            }

            // downloads { string:string-url }
            // images string-url[]

            // user: string-user
            // public: boolean
            return <fieldset key={i} {...entryBind(entry)}>
              <legend className='repo-item-legend'>
                <span>
                  <span className='repo-item-name'>{bindSaveField(BL, 'name')}</span><sup>*</sup>&nbsp;
                  <span className='repo-item-short'>{bindSaveField(IL, 'short')}</span>&nbsp;
                </span>
              </legend>
              <b className='repo-edit-required'><sup>*</sup>required</b>
              {filterBar}
              <div className='repo-edit-group'>
                {/* <b>URLs</b> */}
                <span className='repo-item-entry repo-item-url-link'>Project<sup>*</sup>: {bindSaveField(AL, 'link')}</span>
                <span className='repo-item-entry repo-item-url-author'>Author<sup>*</sup>: {bindSaveField(AL, 'author')}</span>
                <InfoCheckbox label='I am the author' initial={edit.verified} onChange={e => {
                  console.debug(edit.verified, e.target.checked)
                  setEdit({ ...edit, verified: e.target.checked })
                }}/>
                {edit.verified
                ? <>
                  <span className='repo-item-entry repo-item-url-payment'>{edit.payment?.required ? 'Payment & Download' : 'Donations'}: {bindSaveField(AL, 'payment.link')}</span>
                  {edit.payment?.link
                  ? <>
                    <span className='repo-item-entry repo-item-payment-suggested-amount'>
                      $<input type='number' value={edit.payment?.amount} onChange={e => setEdit({ ...edit, payment: { ...edit.payment, amount: Number(e.target.value) }})}></input>{edit.payment?.required ? <sup>*</sup> : ''} USD <InfoCheckbox label='suggested' group='edit-payment-required' initial={!edit.payment?.required} onChange={e => {
                        setEdit({ ...edit, payment: { ...edit.payment, required: !e.target.checked } })
                      }}/> <InfoCheckbox label='required' group='edit-payment-required' initial={edit.payment?.required} onChange={e => {
                        setEdit({ ...edit, payment: { ...edit.payment, required: e.target.checked } })
                      }}/>
                    </span>
                  </>
                  :''}
                  {edit.payment?.required
                  ? <>
                    <span className='repo-item-entry repo-item-url-payment-required'><i>Downloads must be provided automatically after payment</i></span>
                    <span className='repo-item-entry repo-item-url-payment-required'><i>Given enough interest, pico-repo may provide a way to do that in the future (<a onClick={e => openFeedback()}>send feedback</a>)</i></span>
                  </>
                  :''}
                </>
                :''}
                <HalfLine />
                {/* {renderFilters(entry)} */}
                {edit.payment?.required ? '' : <>
                  <span className='repo-item-url-pico-w'>Pico W download: {bindSaveField(AL, 'downloads.PICO_W')}&nbsp;{
                  format === PicoFormat.MICROPYTHON
                  ? <>
                    <span className='action button' onClick={(e0:any) => {
                      const fileInput = node(`<input type='file' accept='.zip' />`)
                      fileInput.onchange = (e: any) => {
                        if (e.target.files.length) {
                          console.debug(e.target.files)
                          e0.target.textContent = '(please wait)'
                          api.post(`/pico-repo/scripts/micropython-uf2/${edit.id}/PICO_W`, e.target.files[0], {
                            headers: {
                              'Content-Type': 'application/zip',
                            },
                          })
                          .then(() => e0.target.textContent = 'built')
                          .catch(() => e0.target.textContent = 'error')
                          .finally(async () => {
                            await new Promise(res => setTimeout(res, 2500))
                            e0.target.textContent = 'and upload .zip to generate .uf2'
                          })
                        }
                        fileInput.remove()
                      }
                      fileInput.click()
                    }}>and upload .zip to generate .uf2</span>
                    <Help>pico-repo will build your MicroPython app into a drag-n-drop .uf2</Help>
                  </>
                  : ''}</span>
                  {entry.targets?.includes('PICO')
                  ? <span className='repo-item-url-pico'>Pico download (if different): {bindSaveField(AL, 'downloads.PICO')}&nbsp;{
                    format === PicoFormat.MICROPYTHON
                    ? <>
                      <span className='action button' onClick={(e0:any) => {
                        const fileInput = node(`<input type='file' accept='.zip' />`)
                        fileInput.onchange = (e: any) => {
                          if (e.target.files.length) {
                            console.debug(e.target.files)
                            e0.target.textContent = 'uploaded'
                            api.post(`/pico-repo/scripts/micropython-uf2/${edit.id}/PICO`, e.target.files[0], {
                              headers: {
                                'Content-Type': 'application/zip',
                              },
                            })
                            .then(() => e0.target.textContent = 'built')
                            .catch(() => e0.target.textContent = 'error')
                            .finally(async () => {
                              await new Promise(res => setTimeout(res, 2500))
                              // e0.target.textContent = 'and upload .zip to generate .uf2'
                            })
                          }
                          fileInput.remove()
                        }
                        fileInput.click()
                      }}>and upload .zip to generate .uf2</span>
                      <Help>pico-repo will build your MicroPython app into a drag-n-drop .uf2</Help>
                    </>
                    : ''}</span>
                  :''}
                </>}
                <span className='repo-item-url-icon'>Icon: {bindSaveField(AL, 'icon')}</span>
                <span style={{marginBottom:'-.5em'}}>Description: <InfoGroup>
                  <InfoCheckbox label='edit' group='edit-content' initial={!edit.contentPreview} onChange={e => {
                    setEdit({ ...edit, contentPreview: !e.target.checked })
                  }}/>
                  <InfoCheckbox label='preview' group='edit-content' initial={edit.contentPreview} onChange={e => {
                    setEdit({ ...edit, contentPreview: e.target.checked })
                  }}/>
                </InfoGroup></span>
              </div>
              {/* <span><Vote name={`pico-repo-${entry.id}`} hideLabel /></span> */}
              {/* <span className='repo-item-name'><b>{entry.name}</b></span> */}
              <div className='repo-item-content'>
                {edit.contentPreview
                ? <Markdown text={edit.content} />
                : bindSaveField(DivL, 'content', { markdown: true })}
              </div>
              <div className='repo-edit-group'>
                <span className='repo-item-url-images'>Images: {bindSaveField(DivL, 'images', { list: true })}</span>
              </div>
              {renderImages(entry)}
              <span className='repo-item-edit-controls repo-list'>
                <span className='repo-item-publish button repo-list-item' onClick={e => handle.save({ ...edit, public: true })}>{edit.public ? 'save' : 'publish'}</span>
                <span className='repo-item-save button repo-list-item' onClick={e => handle.save({ ...edit, public: false })}>{edit.public ? 'unpublish' : 'save draft'}</span>
                {confirmDelete
                ?
                <span className='repo-item-cancel-delete button repo-list-item' onClick={e => {
                  setConfirmDelete(false)
                }}>cancel delete</span>
                : ''}
                <span className='repo-item-delete button repo-list-item' onClick={async e => {
                  if (confirmDelete) {
                    opened.current?.clear()
                    setDetail(undefined)
                    setMode(Mode.BROWSE)
                    await api.delete(`pico-repo/app/${entry.id}`)
                  }
                  setConfirmDelete(!confirmDelete)
                }}>{confirmDelete ? 'confirm' : 'delete'}</span>
                {confirmDelete ? '' :
                <span className='repo-item-cancel button repo-list-item' onClick={e => {
                  setMode(Mode.BROWSE)
                }}>cancel</span>
                }
              </span>
              {error
              ? <div>
                <span className='repo-item-error repo-list-item' ><span style={{color:'red'}}>!!</span> {error}</span>
              </div>
              :''}
            </fieldset>
          })}
        </div>
        : <>
        <div className={`repo-item-list repo-item-list-compact-${mode === Mode.BROWSE && compactView}`}>
          <Scroller deps={[shown]} />
          {shown.length === 0 ? <div style={{marginTop:'1em'}}>nothing here{{
            [Mode.BROWSE]: ' - try a different filter',
            [Mode.COLLECTION]: ' - try a different filter or go collect some projects',
          }[mode] || ''}</div> : ''}
          {shown.map(entry => {
            const voteHandle:any = {}
            const vote = entry.public
            ?
            <span style={{display:'none'}}>
              <Vote name={`pico-repo-${entry.id}`} hideLabel nonNegative voteHandle={voteHandle} />
            </span>
            // green={accent} yellow='#8880' white='#8880'
            // {...(darkMode ? {
            //   red: '#000',
            // } : {
            //   red: '#888',
            // })}
            // {...(darkMode ? {
            //   green: accent,
            //   yellow: '#b7534f',
            //   red: 'black',
            //   white: '#b7534f',
            // } : {
            //   green: '#fd6464',
            //   yellow: 'white',
            //   red: 'white',
            //   // yellow: '#b7534f',
            //   // red: '#66c',
            //   // white: '#b7534f',
            //   // green: accent,
            //   // yellow: 'white',
            //   // red: 'white',
            //   // white: 'white',
            // })}
            :null

            // const detailed = detail === entry.id
            const detailed = opened.has(entry.id)
            // name likes targets formats physical link tags short contents downloads
            const targetKey = keyOf(PicoTarget, target)
            const downloadItems = {}
            entry.downloads && Object.keys(entry.downloads).filter(x => entry.downloads[x]).map(x => {
              downloadItems[x] = <><a
              target='_blank' rel='noreferrer' href={entry.downloads[x]}
              onClick={e => {
                handle.collect(entry.id, true, voteHandle)
                setDetail(entry.id)
                if (!e.metaKey) {
                  // e.stopPropagation()
                  // e.preventDefault()
                  // url.popup(entry.downloads[x])
                }
                console.debug('DONATION?', entry.payment)
                if (entry.payment?.link && !entry.payment.required) {
                  e.stopPropagation()
                  e.preventDefault()
                  openPopup(close => <Style>
                    <InfoBody style={{height:'unset'}}>
                      <InfoSection labels={[
                        `download ${entry.name}`,
                        { close },
                      ]}>
                        {entry.payment.required
                        ? <>
                          Price: ${entry.payment.amount} USD
                          <div style={toStyle(`
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          justify-content: center;
                          font-size: 1.5em;
                          `)}>
                            <a
                            target='_blank' rel='noreferrer' href={entry.downloads[x]}
                            className={`repo-item-download-item repo-list-item button`}
                            onClick={close}
                            >purchase</a>
                          </div>
                        </>
                        :
                        <>
                          <div style={toStyle(`
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          justify-content: center;
                          font-size: 1.5em;
                          `)}>
                            <HalfLine />
                            <a
                            target='_blank' rel='noreferrer' href={entry.downloads[x]}
                            className={`repo-item-download-item repo-list-item button`}
                            onClick={close}
                            >{PicoTarget[x] || x} download</a>
                            <HalfLine />
                            {/* <a
                            target='_blank' rel='noreferrer' href={entry.payment?.link}
                            className={`repo-item-download-item repo-list-item button`}
                            onClick={close}
                            >Support {entry.author.replace(/(https?:\/\/)?(www.)?/, '')}</a> */}
                            <a
                            target='_blank' rel='noreferrer' href={entry.payment?.link}
                            className={`repo-item-download-item repo-list-item button`}
                            onClick={close}
                            >Support the author</a>
                          </div>
                          {entry.payment.amount
                          ? <div style={toStyle(`
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          margin-top: 0.25em;
                          `)}>
                            <span style={toStyle(`
                            font-size: .9em;
                            background: #eee;
                            padding: 0 .3em;
                            border-radius: 2px;
                            opacity: .7;
                            `)}>${entry.payment.amount} suggested donation</span>
                          </div>
                          :''}
                          <br/>
                        </>}
                      </InfoSection>
                    </InfoBody>
                  </Style>, `
                  width: fit-content;
                  padding: 0;
                  overflow: visible;
                  `, {
                    outerStyle: `background: #fffc;`,
                  })
                }
              }}
              className={`
              repo-item-download-item repo-list-item button`}
              >
                {/* {PicoTarget[x] === target ? 'download' : `${PicoTarget[x] || x}`}
                {PicoTarget[x] || x} download */}
                {entry.payment?.required ? `$${entry.payment.amount} ` : ''}{detailed ? `${PicoTarget[x] || x} download` : 'download'}
              </a>
              {entry.builds?.includes(x)
              ?
              <a className='repo-list-item button' download={`${entry.name.replace(' ', '_')}_${x}.uf2`} href={`/api/pico-repo/scripts/micropython-uf2/${entry.id}/${x}`}>
                .uf2
              </a>
              : ''}
              </>
            })
            let download = downloadItems[targetKey]
            const fallbacks = {
              [PicoTarget.PICO_W]: [PicoTarget.PICO],
            }[targetKey]
            while (!download && fallbacks?.length) download = downloadItems[fallbacks.shift()]
            const alternativeDownloads = Object.keys(downloadItems).filter(x => x !== targetKey).map(x => downloadItems[x])
            // entry.downloads = entry.downloads && entry.downloads[targetKey] ? {
            //   [targetKey]: entry.downloads[targetKey],
            //   ...entry.downloads
            // } : entry.downloads
            const bookmarked = collection.has(entry.id)
            return <fieldset key={entry.id} {...entryBind(entry)} style={opened.size && !opened.has(entry.id) ? { opacity: .5 } : {}}>
              <legend className='repo-item-legend'>
                <a target='_blank' rel='noreferrer' href={entry.link} onClick={e=>e.stopPropagation()}>
                  {entry.icon ? <img className='repo-item-icon' src={entry.icon} /> : ''}
                  {!entry.public ? <i className='repo-item-unpublished'>DRAFT&nbsp;</i> : ''}
                  <ScrollText ms={10} buffer={0}>
                    <span className='repo-item-name'><b>{entry.name}</b></span>&nbsp;
                    {entry.short ? <>
                      <span className='repo-item-short'><i>{entry.short}</i></span>&nbsp;
                    </> : ''}
                  </ScrollText>
                  <span className='repo-item-link'><a target='_blank' rel='noreferrer' href={entry.link}><ExternalIcon alt/></a></span>
                </a>
              </legend>
              {vote}
              {/* {detailed ? null :
              <span className='repo-item-vote repo-item-vote-top'>
                {vote}
              </span>} */}

              {/* <Tooltip of='bookmark' position='bottom'> */}
                <span className={'repo-icon repo-item-bookmark' + (bookmarked ? ' repo-icon-filled' : '')}
                // style={{ clipPath: `url(#pico-repo-bookmark-${entry.id})` }}
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                >
                  <Bookmark
                  value={bookmarked}
                  setValue={async value => handle.collect(entry.id, value, voteHandle)} />
                </span>
              {/* </Tooltip> */}
              {/* <PicoRepoItemShare entry={entry} /> */}
              {/* <span><Vote name={`pico-repo-${entry.id}`} hideLabel /></span> */}
              {/* <span className='repo-item-name'><b>{entry.name}</b></span> */}
              <div className='repo-item-first-line'>
                {download && !detailed
                ?
                download
                :''}
                {entry.author
                ?
                <span className='repo-item-author'>
                  by <External href={entry.author}>
                    {entry.author.replace(/https?:\/\//, '')}
                  </External>
                </span>
                :''}
                {entry.verified
                ? <Verified reason={entry.author === 'raspberrypi.com' ? 'Official Raspberry Pi website' : 'Shared by the author'} />
                : ''}
              </div>
              {renderFilters(entry, vote)}
              {detailed
              ?
              <div className='repo-item-content'>
                <Markdown text={entry.content} />
              </div>
              :''}
              {renderImages(entry)}
              {detailed
              ?
              <div className='repo-item-expanded-downloads'>
                {Object.values(downloadItems)}
                {entry.user === user
                ? <span className='repo-browse-share button repo-list-item' onClick={e => handle.edit(entry.id)}>edit</span>
                :''}
                <span className='button repo-item-download-item repo-list-item' onClick={(e: any) => {
                  handle.copy(entry, e.target)
                }}>share</span>
                {view ? '' :
                <span className='repo-item-collapse button repo-item-download-item repo-list-item' onClick={e => {
                  opened.delete(entry.id)
                  setDetail(opened.size ? [...opened].slice(-1)[0] : undefined)
                }}>hide details</span>
                }
              </div>
              :
              null
              // <div className='repo-item-expand button' onClick={e => {
              //   if (e.metaKey) {
              //     window.open(`/pico-repo/${entry.id}`)
              //   } else {
              //     setDetail(entry.id)
              //     setTimeout(() => {
              //       document.querySelector(`#${entryElementId}`).scrollIntoView({ block:'start' })
              //       document.querySelector('#main').scrollIntoView({ block:'end' })
              //     })
              //   }
              // }}>view details</div>
              }
            </fieldset>
          })}
          {mode === Mode.BROWSE
          ? <>
            &nbsp;
            <span className='repo-item-singleton-list repo-list large centered' style={{flexShrink:0}}>
              <span className='repo-browse-share button repo-list-item' onClick={e => handle.edit()}>share a new project</span>
            </span>
            {/* &nbsp;
            <div style={toStyle(`
            color: rgba(0, 0, 0, .7);
            text-align: center;
            `)}>
              <i>"pico-fi was really rad, the website has lots of helpful stuff
                &nbsp;[<Tooltip
                position='top'
                of="i saw the “pico-led-indicator” project and assumed that’d light up the led noodle. reading the readme I saw I needed rshell setup. after a bit of searching i found the “how-to” section linked to rshell’s github. using that readme, then followed the pico-led-indicator read me which went pretty smoothly! the pico-fi process was super cool">...</Tooltip>]
                "
              </i>
              &nbsp;
              (<a id='send-feedback' onClick={e => openFeedback()}>send feedback</a>)
            </div> */}
            &nbsp;
            {sponsor}
            <p>
              by <a href='https://twitter.com/__freshman'>
                @__freshman
              </a> &nbsp;(<A
              href={`https://twitter.com/messages/compose?recipient_id=1351728698614042626&text=${
                encodeURIComponent(`(wordbase.app) `)
                }`}>
                DM
              {/* </a>) &nbsp;(<A href="/coffee">buy me a coffee</A>) */}
              </A>)
              {/* &nbsp;&nbsp;(<A frame href="/coffee">buy me a coffee</A>) */}
            </p>
            &nbsp;
          </>
          :''}
        </div>
        </>}
      </InfoSection>
    </InfoBody>
  </Style>
}

const PicoRepoItemShare = entry => {
  return <span className='repo-icon repo-item-share'
  onClick={(e:any) => {
    e.preventDefault()
    e.stopPropagation()
    copy(location.origin + parseLogicalPath(`/pico-repo/view/${entry.id}`),
      e.target)
  }}
  >
    <Tooltip of='share' position='bottom'><Share /></Tooltip>
  </span>
}


const DivL = styled.div``
const AL = styled.a``
const BL = styled.b``
const IL = styled.i``

const fonts = 'Jetbrains Mono,ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace'
const iconSize = '3.75em'
const legendPad = '.25em'
const Style = styled(SettingStyles)`
font-family: ${fonts};
font-size: max(1rem, min(2.5vw, 20px));
white-space: pre-wrap;
background: var(--base) !important; color: var(--text) !important;
${isMobile ? '' : 'min-width: 30em;'}
.body {
  // padding: .75em;
  // padding: 1em;
  padding: .5em;
  padding-bottom: 0;
  overflow: hidden;
  // background: var(--background);
}

a {
  color: var(--accent);
  // background: var(--accent-background) fixed !important; color: white;
  // background: var(--accent-underline);
}
.badges {
  // margin-left: -.25em !important;
  // display: inline-flex;
  position: sticky; top: -.75em;
  > .label, > .button {
    margin-top: 0;
    border-radius: 2px !important;
    opacity: 1 !important;
    // background: var(--accent) !important; color: var(--accent-text) !important;
    background: var(--text) !important; color: var(--base) !important;
    border: 0 !important;
    &.inline {
      margin-left: .25em;
    }
    &.button {
      background: var(--accent) !important;
      background: var(--accent-background) fixed !important;
      color: var(--accent-text) !important;
    }
  }
}
.title {
  width: fit-content;
  font-size: 1em;
  border-bottom: 2px solid var(--accent);

  border: 0;
  border-radius: 2px;
  background: var(--accent); color: var(--accent-text) !important;
  background: var(--accent-background) fixed !important;
  padding: 0 .2em;
  margin-right: .25em;
}
.description {
  &.description { font-size: max(.7em, 12px) }
  // background: #8881;
  // border-radius: 2px;
  // padding: 0.5em;
}
.repo-item {
  // background: var(--background)ee, var(--accent-background) fixed;
  background: var(--background);
}
.select {
  background: var(--accent);
  background: var(--accent-background) fixed !important;
  color: var(--accent-text) !important;
  outline: none !important;
  &.disabled {
    background: var(--alt) !important;
    color: var(--text) !important;
  }
}
.tag-list {
  outline: none !important;
  > * + * {
    margin-left: .25em;
    // margin-right: .3em;
    // min-width: 0;
    // margin: 0 .1em 0 0;
  }
}
input {
  display: inline-block;
  font-size: .9em !important;
  border: 1px solid var(--text) !important;
  padding: 0 .3em !important;
  border-radius: 2px;
  &[type=text] {
    margin: 0 -.15em !important;
  }
  &[type=number] {
    max-width: 5em;
  }
}
.action {
  border-radius: 2px !important;
  background: var(--base) !important; color: var(--text);
  border: 1px solid var(--text);
  flex-wrap: nowrap;
  white-space: pre;

  *:is(.select, .repo-icon, .tag-list) {
    margin: .05em !important;
  }
  > *:is(.select, .repo-icon, .tag-list) {
    &:first-child { margin-left: -.2em !important }
    &:last-child { margin-right: -.2em !important }
  }
}
.button {
  font-size: 1em;
  // height: 1.5em;
  background: var(--accent-background) fixed !important;
  color: var(--accent-text) !important;
  text-decoration: none;
  border: none !important;
  border-radius: 2px;
  margin-bottom: 0;
  font-family: ${fonts};
}

.button:has(#send-feedback) {
  background: none !important;
  color: var(--accent) !important;
  opacity: .8 !important;
  font-size: .6em !important;
  margin: 0.25em 0.75em;
  &:hover {
    text-decoration: underline;
  }
}

.filters {
  display: inline-flex;
  flex-wrap: wrap;
  row-gap: .25em;
  position: sticky; top: 1.25em; z-index: 100;
  > div {
    display: inline-flex;
    flex-wrap: wrap;
    row-gap: .25em;
  }

  // font-size: .8em;
  font-size: 1rem;
  // background: #8881;
  border-radius: 2px;
  border: 1px solid var(--text);
  width: fit-content;
  padding-top: .2em;
  .action {
    margin: 0;
    margin-bottom: .2em;
    border: none;
    font-size: .9em;
    // background: none !important;
    background: var(--accent) !important;
    .select, .tag-list {
      border-radius: 1em;
      margin: 0 .05em !important;
      &:last-child { margin-right: 0 !important }
    }
    .select {
      padding: 0 .5em;
    }

    input, .select, [contenteditable] {
      background: var(--info-background) !important;
      color: var(--accent) !important;
      border-radius: 0; margin: 0;
    }
  }

  padding: 0; border: 0;
  background: #0000 !important; gap: .25em;
}

.repo-icon, .repo-item-legend {
  z-index: 100;
  background: var(--accent-background) fixed;
  border-radius: 2px;
  padding: 0 0.3em;
  min-height: 1.5em;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  cursor: pointer;
  .tooltip-target {
    margin: 0;
  }
  svg {
    margin: 0 !important;
  }
  &:hover {
    svg {
      // animation: hop .5s linear;
      position: relative;
      // @keyframes hop {
      //   50% { top: -2px }
      // }
    }
  }
  &:not(.repo-icon-filled) {
    &:hover {
      svg {
        // fill: var(--accent-text-fade);
      }
    }
  }
  &.repo-item-bookmark {
    svg {
      margin: 0 !important;
      stroke: none !important;
      fill: var(--text) !important;
      opacity: .33 !important;
      stroke: var(--text) !important;
    }
    // &:hover {
    //   svg {
    //     // opacity: .5 !important;
    //     stroke: var(--text) !important;
    //     fill: none !important;
    //     opacity: 1 !important;
    //   }
    // }
    &.repo-icon-filled {
      svg {
        fill: var(--text) !important;
        opacity: 1 !important;
      }
    }
  }
}

.body, #list {
  position: relative;
  display: flex;
  flex-direction: column;
  flex-shrink: 1;
  flex-grow: 1;
  // padding-bottom: .25em;
  padding-bottom: 0;
  > .badges {
    // display: inline-block;
    z-index: 100;
  }
  > br { display: none }
  > * { flex-shrink: 0; width: 100% }
}

.repo-item-list {
  flex-grow: 1 !important;
  overflow-y: auto;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  font-size: .7em;
  > * {
    margin: 0;
    margin-top: .5em;
  }
  &.repo-item-list-grid-true {
    flex-direction: row;
    align-items: flex-start;
    flex-wrap: wrap;
    row-gap: .25em;
  }

  .repo-item {
    align-self: stretch;
    max-width: 100%;
    max-height: calc(100% - .5em);
    height: fit-content;
    flex-shrink: 1;
    flex-grow: 0;
    * { flex-shrink: 0 }
    .repo-item-content { flex-shrink: 1; overflow-y: auto; }

    position: relative;
    flex-shrink: 0;
    border: 1px solid var(--text);
    border-radius: 2px;
    padding: calc(${legendPad} + .05em);
    cursor: pointer;
    &.repo-item-open {
      cursor: default;
    }

    display: flex;
    flex-direction: column;
    > :not(legend) {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
      // overflow-y: auto;
      max-width: 100%;
      &:not(:last-child) {
        margin-bottom: .5em;
      }
      > * + * {
        flex-shrink: 0;
        margin-left: .25em;
      }
      sup {
        margin: 0 0.25em;
      }
      // &::after {
      //   content: "";
      //   display: block;
      //   width: 100%;
      //   flex-shrink: 1;
      // }
    }
    > * {
      white-space: pre-wrap;
      word-break: break-word;
    }

    position: relative;
    .repo-item-legend {
      // padding: 0 .3em;
      white-space: pre;
      width: fit-content;
      &, a {
        color: var(--accent-text) !important;
        text-decoration: none;
        display: flex;
        align-items: center;
      }
      > *:first-child {
        display: flex; align-items: center;
        overflow: auto;
        max-width: calc(100vw - 10.825em);
        &::-webkit-scrollbar { display: none }
      }
      background: var(--accent-background) fixed !important;
      // border: 1px solid var(--accent);
      border-radius: 2px;
      padding: 0 .3em;
      margin-right: 2.5em;
    }

    .repo-item-vote {
      color: black;
      font-size: 1.15em;
      margin-right: .25em;
      &.repo-item-vote-top {
        position: absolute;
        top: -1.9em; right: .5em;
        right: 4.5em;
      }
      .vote {
        min-width: calc(${iconSize} / 1.15 / .9 * 1.1 + 1px);

        color: var(--text);
        &, .vote-value {
          background: var(--base) !important;
        }
      }
      // .vote-button:not(:hover) {
      //   color: #0006;
      // }
      // .vote-button:hover {
      //   background: var(--accent-background) fixed !important;
      //   color: var(--accent-text);
      //   opacity: 1;
      // }
    }
    .repo-item-bookmark, .repo-item-share {
      font-size: calc(1.1em * 1.4);
      position: absolute;
      top: -1.5em; right: 2.125em;
      top: .25em; right: .25em;
      top: -.825em; right: -.25em;
      background: none;
      svg {
        // fill-style: var(--accent);
      }
    }
    .repo-item-share {
      top: calc(-1.375em - 2px); right: ${legendPad};
      z-index: 100100;
    }

    // TODO decide on share icon or not, remove excess code
    .repo-item-vote-top { right: calc(2.5em + ${legendPad}) !important; }
    // .repo-item-bookmark { right: ${legendPad}; }

    .repo-item-entry {
      display: inline-flex;
      align-items: center;
      .action {
        margin-bottom: 0;
      }
    }

    .repo-item-legend {
      position: relative;
    }
    .repo-item-icon {
      height: calc(${iconSize} + 1px);
      width: calc(${iconSize} + 1px);
      object-fit: contain;
      background: var(--base);
      border: 1px solid black;
      border-radius: 2px;
      position: absolute;
      // top: -1px;
      // left: ${legendPad};
      // bottom: calc(100% - ((${iconSize} + 1px)/2 - ${legendPad}));
      top: 0;
      right: calc(100% + ${legendPad});
      image-rendering: pixelated;
    }
    &.repo-item-icon-true {
      .repo-item-legend {
        margin-left: calc(${iconSize} + ${legendPad} + .05em);
      }
      .repo-item-first-line {
        margin-left: calc(${iconSize} + .3em);
      }
    }

    .repo-item-name {
      font-size: 1.4em;
      font-weight: bold;
      // background: var(--accent-underline) !important;
    }
    .repo-item-short {
      font-style: italic;
    }

    .repo-item-first-line .button + :not(.button) {
      margin-left: .5em;
    }
    .repo-item-author {
      a {
        text-decoration: none;
        &:hover {
          text-decoration: underline;
        }
      }
    }

    .repo-item-link {
      // background: var(--accent-background) fixed !important;
      border-radius: 2px;
      height: fit-content;
      display: inline-flex;
      align-items: center;
      a { display: flex }
    }

    .repo-item-content {
      display: grid;
      white-space: pre-wrap;
      overflow: auto;
      max-width: 100%;
      min-height: 5em;
      // max-height: 80vh;
      // margin: .5em 0 !important;
      > div {
        width: 100%; padding-right: 1em; // scrollbar
        // max-height: 80vh;
        overflow: auto;
        display: flex;
        flex-direction: column;
        font-size: .9em;
        height: 100%;
        > * {
          margin-bottom: .25em;
        }
        ol, ul {
          display: flex;
          flex-direction: column;
          margin-bottom: .5em;
        }
        h1, h2, h3, h4, h5, h6, h7, h8, h9 {
          margin: .5em 0;
        }
        img {
          max-width: 100%;
          max-height: 25em;
        }
        pre {
          background: var(--base);
          padding: 1em;
          font-family: monospace;
          position: relative;
          cursor: pointer;
          display: block;
          height: fit-content;
          overflow: auto;
          &::after {
            content: 'copy';
            position: absolute; top: 1em; right: 1em;
            background: var(--base);
            color: var(--text);
            padding: 0 .3em;
            border-radius: 2px;
            font-family: ${fonts};
            user-select: none;
          }
          &:not(.copied):hover::after {
            background: var(--accent-background) fixed; color: var(--accent-text);
          }
          &.copied::after {
            content: 'copied';
          }
        }
      }
    }

    .repo-item-image-list {
      max-width: calc(100vw - 4.1em);
      overflow: auto;
      padding-bottom: 1px;
      &::-webkit-scrollbar { display: none }
    }
    .repo-item-image-item {
      height: 8em;
      padding: 0;
      border: .5px solid black;
    }

    .repo-item-expand, .repo-item-collapse {
      background: var(--base) !important; color: var(--text) !important;
      border: 1px dashed var(--text) !important;
      // margin-top: -1px;
      // position: relative; top: -1px;
      // padding: calc(.15em - 1px) calc(.3em - 1px);
      font-style: italic;
      // height: 1.5em;
      height: calc(1.5em - .25px);
      display: flex; align-items: center;
      line-height: 1;
    }
    .repo-item-expand {
      width: 100%;
      justify-content: center;
    }

    .repo-item-edit-controls, .repo-item-expanded-downloads {
      font-size: 1.15em !important;
      flex-wrap: wrap;
      row-gap: 0.25em;
    }
  }

  .repo-edit-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start !important;
    > * {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
    }
  }
  .editable-list {
    flex-wrap: wrap;
    row-gap: .25em;
    max-width: 100%;
  }
  *[contentEditable] {
    outline: none !important;
    cursor: pointer;
  }
  .repo-edit-required {
    position: absolute;
    right: .5em;
    top: 0;
    font-size: .7em;
    color: var(--text);
  }

  &.repo-item-list-compact-true {
    border: 1px solid black;
    border-radius: 2px;
  }
}

.repo-list {
  display: flex;
  align-items: center;
  font-size: .9em;
  overflow: auto;
  overflow-wrap: nowrap;
  &.wrap { flex-wrap: wrap !important; row-gap: .25em; }

  // width: 0;
  // flex-grow: 1;

  label {
    font-style: italic;
    margin-left: -.5em;
    opacity: .5;
    &::before, &::after {
      content: "/";
    }
  }
  .repo-list-item {
    flex-shrink: 0;
    display: inline-block;
    background: var(--base);
    border-radius: 2px;
    padding: .15em .3em;

    & + .repo-list-item {
      margin-left: .25em;
    }
  }
}

.repo-edit-target-add {
  // border-radius: 50% !important;
  width: 1.65em !important; height: 1.65em !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.large {
  font-size: 1.5em !important;
}
.centered {
  display: flex;
  align-items: center;
  justify-content: center;
}

div.half {
  font-size: .5em;
  height: 1em;
}

sup {
  align-self: flex-start !important;
  font-weight: bold;
}

@keyframes scroll-background-x {
  0% { background-position: 0 0 }
  100% { background-position: 100% 0 }
}

.pico-scroller {
  background: url(/raw/pico-repo/pixel-pico-crop.png);
  background-repeat-x: repeat;
  background-size: contain;
  width: 100%; height: 1em;
  animation: scroll-pico 60s linear infinite;
  cursor: pointer;
  // &:hover {
  //   animation-play-state: paused;
  // }
  @keyframes scroll-pico {
    0% { background-position: 0 0 }
    100% { background-position: calc(1.8em * 291 / 116) 0 }
  }
}

#how-to {
  > div {
    margin-bottom: .25em;
  }
  .button.rounded {
    border-radius: 1em !important;
    padding: 0 .5em !important;
    margin: 0 !important;
    text-transform: uppercase;
  }
}


.body:has(.repo-item-open) {
  &::after {
    content: "";
    position: fixed; top: -1px; left: -1px;
    height: 100%; width: 100%;
    background: var(--accent-background) fixed; color: var(--accent-text);
    opacity: .3;
    z-index: 1;
    pointer-events: none;
  }
  .repo-item-open, :hover {
    z-index: 2;
  }
}

.repo-item-first-line > * {
  // margin-right: .25em !important;
}

.repo-item-url-images .editable-list {
  display: block;
  word-break: break-all;
  max-height: 5em;
  overflow: auto;
}

&.edit {
  .repo-item-image-list {
    font-size: .5em;
  }
}
`
