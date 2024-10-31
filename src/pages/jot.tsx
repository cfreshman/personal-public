import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBody, InfoSection, InfoStyles, Multiline } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { asInput, useF, useM, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'

const { named_log } = window as any
const NAME = 'jot'
const log = named_log(NAME)

type jot = {
  id: string,
  t: number,
  name: string,
  content: string,
}
const MIN_ROWS = 5

const NewJot = ({ handle }) => {
  const [name, set_name, fill_name] = asInput(useS(''))
  const [content, set_content] = useS('')
  return <>
    <div className='inputs-container column wide'>
      <input type='text' placeholder='name' {...fill_name} />
      <Multiline placeholder='content' value={content} setValue={set_content} min_rows={MIN_ROWS} style={S(`max-height: 50vh`)} />
    </div>
    <div className='row wide end'>
      <button onClick={e => {
        handle.new({ name, content })
        set_name('')
        set_content('')
      }}>create</button>
    </div>
  </>
}
const Jot = ({ jot, handle }) => {
  const [name, set_name, fill_name] = asInput(useS(''))
  const [content, set_content] = useS('')
  useF(jot, () => {
    set_name(jot.name)
    set_content(jot.content)
  })
  const changed = useM(name, content, () => name !== jot.name || content !== jot.content)
  return <>
    <div className='inputs-container column wide'>
      <input type='text' placeholder='name' {...fill_name} />
      <Multiline placeholder='content' value={content} setValue={set_content} min_rows={MIN_ROWS} style={S(`max-height: 50vh`)} />
    </div>
    <div className='row wide between'>
      <button onClick={e => {
        handle.delete(jot)
      }}>delete</button>
      <div className='row gap'>
        <button onClick={e => {
          handle.set_id('')
        }}>{changed ? 'cancel' : 'close'}</button>
        {changed ? <button onClick={e => {
          handle.edit({ id: jot.id, name, content })
        }}>update</button> : null}
      </div>
    </div>
  </>
}

export default () => {
  const [jots, set_jots] = store.use('jot-jots', { default: [] as jot[] })

  const [id, set_id] = usePathState()
  const jot = useM(id, jots, () => jots.find(x => x.id === id))

  const handle = {
    set_id,
    new: async ({ name, content }) => {
      const jot = {
        id: rand.alphanum(8),
        t: Date.now(),
        name, content,
      }
      set_jots([...jots, jot])
    },
    edit: async ({ id, name, content }) => {
      const jot = jots.find(x => x.id === id)
      jot.name = name
      jot.content = content
      set_jots(jots.slice())
    },
    delete: async ({ id:delete_id }) => {
      set_jots(jots.filter(x => x.id !== delete_id))
      if (id === delete_id) {
        set_id('')
      }
    },
  }

  const [reverse_sort, set_reverse_sort] = store.use('jot-reverse_sort', { default:true })
  const time_sorted_jots = useM(jots, reverse_sort, () => jots.slice().sort((a, b) => reverse_sort ? b.t - a.t : a.t - b.t))

  usePageSettings()
  return <Style id='jot'>
    <InfoBody className='column'>
      <InfoSection labels={[
        'jots',
        { new: () => set_id('') },
        { reverse: () => set_reverse_sort(!reverse_sort) },
      ]}>
        <div className='row wide wrap gap'>
          {time_sorted_jots.map(jot => <button onClick={e => set_id(jot.id)}>{jot.name || jot.id}</button>)}
        </div>
      </InfoSection>
      <div className='spacer' />
      <InfoSection labels={[id ? 'edit jot' : 'new jot']}>
        {id ? <Jot {...{ jot, handle }} /> : <NewJot {...{ handle }} />}
      </InfoSection>
    </InfoBody>
  </Style>
}

const common_css = `
input, textarea, select {
  font-size: max(1em, 16px) !important;
  color: var(--id-color-text) !important;
  border: 1px solid currentcolor !important;
  background: var(--id-color) !important;
  background: var(--id-color-text-readable) !important;
  border-radius: 0 !important;
  &::placeholder {
    color: inherit !important;
    opacity: .5 !important;
  }
  &[type=number] {
    max-width: 5em;
  }
  &:is(input, select) {
    height: 1.5em;
  }
  + :is(input, textarea, select) {
    margin-top: -1px !important;
  }
}
.inputs-container {
  // border: 1px solid currentcolor !important;
  // margin-bottom: 2px;
  // box-shadow: 0 2px var(--id-color-text);
}

ul {
  padding-left: 1em;
}

button {
  color: var(--id-color-text);
  border-radius: 10em;
  border: 1px solid var(--id-color-text);
  box-shadow: 0 1px var(--id-color-text);
  min-width: 2em;
  display: flex; align-items: center; justify-content: center;
  translate: 0 -1px;
  &:not(:disabled) {
    cursor: pointer;
    &:active, &.active {
      translate: 0;
      box-shadow: none;
    }
  }
  &:disabled {
    cursor: default;
    color: #888;
    // background: #ccc;
  }
  line-height: 1.3em;
}

--id-color: #eee;
--id-color-text: #222;
--id-color-text-readable: #fff;
background: var(--id-color) !important;
color: var(--id-color-text) !important;
padding: .5em;
font-family: monospace;
`
const Style = styled(InfoStyles)`&#jot{
margin: .5em;
width: calc(100% - 1em);
height: calc(100% - 1em);
border: 1px solid #000;
border-radius: .25em;

${common_css}

box-shadow: none !important; /* to undo expand style (bad code) */
.body {
  padding: 0;
}

input, textarea {
  margin: 0 !important;
}

}`
const PopupStyle = styled(InfoStyles)`
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);
${common_css}
`