import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { JSX, anyFields, pass, truthy } from 'src/lib/types'
import { usePageSettings, usePathState, useSave } from 'src/lib/hooks_ext'
import { currency } from './money.com'
import { asInput, asList, useCached, useCachedSetter, useF, useR, useRerender, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { openLogin } from 'src/lib/auth'
import { defer, logged_handle, named_log, randAlphanum } from 'src/lib/util'


const log = named_log('money-run')

const ProgressMeter = ({ value=0, total=1, display=pass, color='#8f4', orientation='horizontal', drain=false, reverse=false }:{
  value: number, total: number, display: (x:number)=>string,
  color?: string,
  orientation?: 'horizontal'|'vertical',
  drain?: boolean, reverse?: boolean,
}) => {
  const ratio = value / total
  const percent = Math.ceil(ratio*100)
  return <ProgressMeterStyle className={`progress-meter ${orientation} drain-${drain} reverse-${reverse}`}>
    <div className='fill' style={{
      background: color,
      height: `${percent}%`,
      width: `${percent}%`,
    }}><span className='text'>{display(value)}</span></div>
    <span style={{flexGrow:1}} />
    <span className='total text'>{display(total)}</span>
  </ProgressMeterStyle>
}
const ProgressMeterStyle = styled.div`
&.progress-meter {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  background: #f8f8ff;
  border: 1px solid currentcolor;
  position: relative;
  border-radius: 1e9em !important; overflow: hidden;

  .fill {
    display: flex;
    justify-items: flex-end;
  }
  .total {
    
  }
  .text {
    padding: 0 .25em;
  }

  &.horizontal {
    width: 100%;
    height: 2em;
    > .fill {
      height: 100% !important;
      flex-direction: row;
    }
  }
  &.vertical {
    height: 100%;
    width: 2em;
    > .fill {
      width: 100% !important;
      flex-direction: column-reverse;
    }
  }
}
`

type Entry = {
  name:string, id?:string,
  value:number, total:number,
  donate?:string,
}
const EXAMPLES: Entry[] = [{
  name: 'climb Hyperion',
  value: 200, total: 5_000_000,
}]

export default () => {
  usePageSettings({
    professional: true,
  })
  
  const [runs, setRuns] = useS([])
  const [_id, reloadId] = useCached('/user_id')
  const id = _id && `run-${_id}`
  const [sync={}, setSync, reloadSync] = useCachedSetter({
    name: 'run-sync',
    fetcher: () =>
      id && api
      .post('/state', { id })
      .with(x => log('synced fetch', x)),
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
    entries: Entry[],
  }
  const _setEntries = (entries) => setSync({ update:{entries} })
  const [entries, setEntries, addEntries] = asList([_entries, _setEntries])
  const [edit, setEdit] = useS(undefined)
  const entry = entries.find(x => x.id === edit?.id)
  const [_path, _setPath] = usePathState({
    from: (x) => x,
    to: (x) => x,
  })
  const path_loaded = useR()
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
        name: '',
        value: 0, total: 100,
      }])
      defer(() => handle.edit(id), 1)
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

  return <Style>
    <InfoBody>
      <InfoSection labels={[
        'do difficult thing for money for something',
        auth.user ? { new: () => handle.new() } : { 'log in': openLogin },
      ]}>
      </InfoSection>

      <br/>
      {auth.user ? null : <InfoSection labels={['demo']} />}
      {(auth.user ? entries : EXAMPLES).map(x =>
      <InfoSection labels={auth.user ? [
        x.name || 'new',
        { edit: handle.edit(x.id) },
      ] : [
        {[x.name]:pass},
        // 'example',
      ]}>
        {/* {edit?.id === x.id
        ?
        <InfoBadges labels={[
          {
            text: <input {...asInput([x.name, value => handle.draft(id, {...x, name:value })])[2]}></input>,
          }
        ]} />
        :null} */}
        <ProgressMeter value={x.value} total={x.total} display={x => currency(x).display} />
      </InfoSection>)}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`