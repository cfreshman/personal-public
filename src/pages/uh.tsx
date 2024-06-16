import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoSelect, InfoStyles } from '../components/Info'
import { asList, useCached, useCachedSetter, useF, useInput, useR, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S, deletion, logged_handle, merge, named_log, randAlphanum } from 'src/lib/util'
import { JSX, anyFields, truthy } from 'src/lib/types'
import { copy } from 'src/lib/copy'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'


const log = named_log('uh')

type UhEntry = {
  id:string,
  x:number,
  n:number,
  g:number,

  name?:string,
}

export default () => {
  usePageSettings({
    expand: true,
  })

  const [_id, reloadId] = useCached('/user_id')
  const id = _id && `uh-${_id}`
  const [sync={}, setSync, reloadSync] = useCachedSetter({
    name: 'uh-sync',
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

  const { entries:_entries=[] } = sync as {
    entries: UhEntry[],
  }
  const _setEntries = (entries) => setSync({ update:{entries} })
  const [entries, setEntries, addEntries] = asList([_entries, _setEntries])
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

  const _handle = {
    _entry: (id) => entries.find(x => x.id === id),

    new: () => {
      addEntries([{
        id: randAlphanum(8),
        x: 0,
        n: 0,
        g: 0,
      }])
    },
    delete: (id) => {
      setEntries(entries.filter(x => x.id !== id))
    },
    count: (id, count, n_count=1) => {
      setEntries(entries.map(x => {
        if (x.id === id) {
          x.n += n_count
          x.x = Math.min(x.n, x.x + count)
        }
        return x
      }))
    },
    guess: (id, count=1) => {
      setEntries(entries.map(x => {
        if (x.id === id) x.g = Math.min(x.n, x.g + count)
        return x
      }))
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
      const new_entries = entries.map(x => (x.id === id) ? { ...x, ...entry} as UhEntry : x)
      setEntries(new_entries)
      close && setEdit(undefined)
      return new_entries
    },
  }
  const handle = logged_handle(_handle)

  return <Style>
    <InfoBody>
      <InfoSection labels={[
        'uh',
        { new: handle.new },
        { refresh: reloadSync },
      ]}>
        {entries.map((entry, i) => {
          const percent = (x, n) => (y => y > 50 ? Math.floor(y) : Math.ceil(y))((x/(n||1)) * 100)
          // const actual_percent = 
          return <>
            <InfoBadges labels={[
              { '☰': () => handle.edit(entry.id) },
              `#${i+1}`,
              { 'guess': () => handle.guess(entry.id) },
              { '+0': () => handle.count(entry.id, 0) },
              { '+1': () => handle.count(entry.id, 1) },
              `${percent(entry.g, entry.n)}% (${entry.g}/${entry.n})`,
              `${entry.g === entry.x ? '=' : entry.g < entry.x ? '<' : '>'}`,
              `${percent(entry.x, entry.n)}% (${entry.x}/${entry.n})`,
              {
                text: entry.name || entry.id,
                label: true,
                func: e => copy([location.origin, 'uh', entry.id, entry.name].filter(truthy).join('/'), e.currentTarget),
              },
            ]} />
            {entry.id === edit?.id ? <>
              <InfoBadges labels={[
                // { nvm: () => handle.edit(undefined) },
              entry.g ? { '-g': () => handle.guess(entry.id, -1) } : '-g',
              entry.n && entry.x < entry.n ? { '-0': () => handle.count(entry.id, 0, -1) } : '-0',
              entry.x ? { '-1': () => handle.count(entry.id, -1, -1) } : '-1',
                { reset: () => handle.save(entry.id, {
                  x: 0,
                  n: 0,
                  g: 0,
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
                    handle.draft(entry.id, { name:e.target.value||undefined })
                  }}/>,
                },
                { save: () => handle.save(edit.id, edit) },
              ]} />
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
`