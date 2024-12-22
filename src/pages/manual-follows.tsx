import React from 'react'
import styled from 'styled-components'
import { External, InfoBadges, InfoBody, InfoSection, InfoSelect, InfoStyles, Multiline } from '../components/Info'
import { asInput, asList, useCached, useCachedSetter, useF, useInput, useM, useR, useRerender, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { Q, S, defer, deletion, from, logged_handle, merge, named_log, pick, randAlphanum, randi, sample } from 'src/lib/util'
import { JSX, anyFields, truthy } from 'src/lib/types'
import { copy } from 'src/lib/copy'
import { usePageSettings, usePathState, useSave } from 'src/lib/hooks_ext'
import { Description } from 'src/components/base/old/Base'
import { V } from 'src/lib/ve'
import url from 'src/lib/url'


const log = named_log('uh')

const BUGS = [
`"•"`,
`}.{`,
'.=.=."',
]

type Entry = {
  id:string,
  bug:string,
  votes:number,
  name?:string,
  link?:string,
  description?:string,
}

export default () => {
  usePageSettings({
    expand: true,
  })

  const [_id, reloadId] = useCached('/user_id')
  const id = _id && `follows-${_id}`
  const [sync={empty:true}, setSync, reloadSync] = useCachedSetter({
    name: 'follows-sync',
    fetcher: () => id && api.post('/state', { id }).with(x => log('synced fetch', x)),
    setter: (
      x: {state?:anyFields,update?:anyFields,delete?:{[key:string]:boolean}}
    ) => 
      api
      .post('/state', {
        ...x, id,
      })
      .with(x => log('synced set', x)),
  })
  useF(id, reloadSync)

  const { entries:_entries } = sync as {
    entries: Entry[],
  }
  const _setEntries = (entries) => setSync({ update:{entries} })
  const [entries, setEntries, addEntries] = asList([_entries||[], _setEntries])
  const [edit, setEdit] = useS(undefined)
  const entry = entries.find(x => x.id === edit?.id)
  const [_path, _setPath] = usePathState({
    from: (x) => x, //x.split('/')[0],
    to: (x) => x, //[x.id, x.name].filter(truthy).join('/'),
  })
  const path_loaded = useR()
  // useF(_path, () => path_loaded.current = false)
  useF(_path, entries, () => {
    const path_entry_id = _path.split('/')[0]
    if (!path_loaded.current && entries.length) {
      if (!path_entry_id || entries.some(x => x.id === path_entry_id)) {
        handle.edit(path_entry_id)
        path_loaded.current = true
      }
    } else if (!path_entry_id) {
      handle.edit(undefined)
    }
  })
  useF(entry, () => path_loaded.current && _setPath(entry ? [entry.id, entry.name].filter(truthy).join('/') : ''))

  const refresh = useRerender()

  const _handle = {
    _entry: (id) => entries.find(x => x.id === id),

    new: () => {
      const id = randAlphanum(8)
      addEntries([{
        id,
        bug: sample(BUGS),
        votes: 1,
        name: '',
        link: '',
        description: '',
      }])
      defer(() => handle.edit(id), 100)
      // setEdit(id)
    },
    refresh: () => {
      refresh()
      reloadSync()
    },
    delete: (id) => {
      setEntries(entries.filter(x => x.id !== id))
    },
    edit: (id) => {
      const new_edit = id === edit?.id ? undefined : entries.find(x => x.id === id)
      setEdit(new_edit)
      return new_edit
    },
    draft: (id=edit?.id, entry=edit) => {
      const new_edit = { id, ...entry }
      setEdit(new_edit)
      return new_edit
    },
    save: (id=edit?.id, entry=edit, close=true) => {
      const new_entries = entries.map(x => (x.id === id) ? { ...x, ...entry} as Entry : x)
      setEntries(new_entries)
      close && setEdit(undefined)
      return new_entries
    },
  }
  const handle = logged_handle(_handle)
  useSave(handle.save)

  const order = useM(entries.length, refresh, () => entries.map((e, i) => [i, e.votes]).sort((a,b)=>(b[1] - a[1])).smap('[0]'))

  const bug_positions = useM(entries.length, () => {
    return Object.fromEntries(entries.map(x => [x.id, V.ne(randi(100), randi(100))]))
  })
  const bug_field = useM(entries, bug_positions, edit, () => entries.map(x => {
    const p = bug_positions[x.id]
    return <span key={x.id} className='bug' onClick={e => handle.edit(x.id)} style={S(`
    top: ${p.y}px;
    left: calc(${p.x/100} * (100% - 1em));
    ${x.id === edit?.id ? `
    font-weight: bold;
    `:''}
    scale: ${Math.sqrt(x.votes + 1)/2};
    `)}>
      {x.bug}
    </span>
  }))

  useF(edit, () => {
    if (edit) Q(`#bug-${edit.id}`).scrollIntoView({block:'center'})
  })

  return <Style>
    <InfoBody>
      <InfoSection>
        <div style={S(`
        height: calc(100px + 1em); width: calc(100% + 1em);
        position: relative;
        `)}>
          {bug_field}
        </div>
      </InfoSection>
      <InfoSection labels={[
        <span><span style={{textDecoration:'line-through'}}>bugs</span> manual follows</span>,
        { 'open all': () => order.map(i => entries[i]).map(x => x.link && url.popup(x.link))},
        { new: handle.new },
        { refresh: handle.refresh },
      ]}>
        {order.map(i => entries[i]).map((x, i) => {
          const percent = (x, n) => (y => y > 50 ? Math.floor(y) : Math.ceil(y))((x/(n||1)) * 100)
          // const actual_percent = 
          return <>
            <InfoBadges labels={[
              { '☰': () => handle.edit(x.id) },
              {
                text: 'open',
                href: x.link,
                label: !x.link,
              },
              `#${i+1}`,
              { '+1': () => handle.save(x.id, {
                votes: x.votes + 1,
              }, false) },
              x.votes,
              x.bug,
              {
                text: x.name || (x => {
                  return x && x.pathname.replace(/^\//, '')
                })(x.link && new URL(x.link)) || x.id,
                label: true,
                func: e => copy([location.origin, 'uh', x.id, x.name].filter(truthy).join('/'), e.currentTarget),
              },
            ]} />
            {x.id === edit?.id ? <>
              <InfoBadges labels={[
                // { nvm: () => handle.edit(undefined) },
                x.votes ? { '-1': () => handle.save(x.id, {
                  votes: x.votes - 1,
                }, false) } : '-1',
                { reset: () => handle.save(x.id, {
                  votes: 1,
                }, false) },
                { delete: () => {
                  handle.edit(entries[i + 1]?.id)
                  handle.delete(edit.id)
                } },
                // edit.id,
                {
                  text:
                  <input type='text'
                  placeholder='(label)' className='uppercase' 
                  value={edit.name} onChange={e => {
                    handle.draft(x.id, { name:e.target.value||undefined })
                  }}/>,
                },
                { save: () => handle.save(edit.id, edit) },
              ]} />
              <input type='text'
              placeholder='(link)'
              value={edit.link} onInput={e => {
                handle.draft(edit.id, { link:e.currentTarget.value||undefined })
              }} />
              <Multiline type='text' id={`bug-${x.id}`}
              placeholder='(description)'
              value={edit.description} setValue={value => {
                handle.draft(edit.id, { description:value||undefined })
              }}/>
            </> : null}
          </>
        })}
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
max-width: unset !important;
.body * {flex-wrap:nowrap!important}

.bug {
  position: absolute;
  cursor: pointer;
  transition: left .2s, top: .2s;
  &:hover {
    font-weight: bold;
  }
}
`