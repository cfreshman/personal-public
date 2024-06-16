import React from 'react'
import styled from 'styled-components'
import { A, InfoBody, InfoSection, InfoStyles, Markdown, Multiline } from '../components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { asInput, useEventListener, useF, useM, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { Dangerous } from 'src/components/individual/Dangerous'
import { S } from 'src/lib/util'
import { message } from 'src/lib/message'

const NAME = 'printgames'
const { named_log, list, devices } = window as any
const log = named_log(NAME)

type print_item = {
  id?: string,
  name: string,
  url: string,
  description: string,
  submit: string,
  media: any[],
  color?: string,
  t?: number,
}
const example_prints: print_item[] = [{
  name: 'example',
  url: '/printgames',
  description: '3D print board games!',
  submit: 'cyrus',
  media: [],
}, {
  name: 'example',
  url: '/printgames',
  description: '3D print board games!',
  submit: 'cyrus',
  media: [],
}, {
  name: 'example',
  url: '/printgames',
  description: '3D print board games!',
  submit: 'cyrus',
  media: [],
}, {
  name: 'example',
  url: '/printgames',
  description: '3D print board games!',
  submit: 'cyrus',
  media: [],
}]

const PrintItem = ({ item, set_edit }: { item:print_item, set_edit }) => {
  const [{user:viewer}] = auth.use()
  const self = item.submit === viewer
  const editable = self && item.id

  return <div className='print-item column gap' style={S(`
  ${item.color ? `background: ${item.color};` : ''}
  `)}>
    <div className='print-item-title row'>
      <span><b><A tab={item.url}>{item.name}</A></b></span>
      <span className='spacer'>&nbsp;</span>
      <span>from <A tab={`/u/${item.submit}`}>{self ? 'you' : <>@{item.submit}</>}</A>{editable
      ? <> (<a onClick={() => set_edit(item)}>edit</a>)</>
      : null}</span>
    </div>
    <div className='print-item-description'>
      <Markdown text={item.description} />
    </div>
    <div className='print-item-media row wide gap wrap'>
      {item.media.map(x => <Dangerous html={x} />)}
    </div>
  </div>
}
const PrintEdit = ({ item:initial_item, set_edit }: { item?:print_item, set_edit }) => {
  const [item, set_item] = useS(initial_item || {
    name: '',
    url: '',
    description: '',
    media: [],
    color: '',
  })
  useF(item, () => set_edit(item))

  const [name, set_name, fill_name] = asInput([item.name, x => set_item({ ...item, name:x })])
  const [url, set_url, fill_url] = asInput([item.url, x => set_item({ ...item, url:x })])
  const [description, set_description, fill_description] = asInput([item.description, x => set_item({ ...item, description:x })])

  return <div className='print-item column gap' style={S(`
  ${item.color ? `background: ${item.color};` : ''}
  `)}>
    <div className='print-item-title'>
      <span><input {...fill_name} placeholder='name' style={S(`
      ${devices.is_mobile ? '' : 'max-width:20em'}
      `)} /></span>
    </div>
    <div className='print-item-title'>
      <span><input {...fill_url} placeholder='url' /></span>
    </div>
    <div className='print-item-description'><Multiline {...fill_description} placeholder='description' rows={5} /></div>
    {description ? <div className='print-item-description'>
      <Markdown text={description} />
    </div> : null}
    {/* <div className='print-item-media row wide gap wrap'>
      {item.media.map(x => <Dangerous html={x} />)}
    </div> */}
  </div>
}

export default () => {

  const [prints, set_prints] = useS(example_prints)

  const [edit, set_edit] = useS(undefined)
  const [confirm, set_confirm] = useS(false)
  useEventListener(window, 'keydown', e => {
    if (e.key === 's' && e.metaKey) {
      e.preventDefault()
      handle.save()
    }
  })

  const handle = {
    load: async () => {
      const { list } = await api.get('/printgames')
      set_prints(list.concat(example_prints))
    },
    cancel: async () => {
      if (confirm) {
        set_confirm(false)
      } else {
        set_edit(false)
      }
    },
    save: async () => {
      const missing = list('name url description').filter(key => !edit[key])
      if (missing.length) {
        alert(`missing ${missing.join(', ')}`)
        return
      }

      message.trigger({
        text: `submitting "${edit.name}"`,
        id: 'printgame-submit',
      })
      try {
        const { item } = await api.post('/printgames', { item:edit })
        await handle.load()
        message.trigger({
          text: `submitted "${item.name}"`,
          id: 'printgame-submitted', delete: 'printgame-submit',
          ms: 5_000,
        })
        set_edit(false)
      } catch (e) {
        // alert(e.rror || e)
        message.trigger({
          text: `error submitting "${edit.name}"\n${e.rror}`,
          id: 'printgame-submitted', delete: 'printgame-submit',
          ms: 5_000,
        })
      }
    },
  }
  useF(async () => await handle.load())
  useF(prints, () => log({prints}))

  const display_prints = useM(prints, () => {
    return prints.slice().sort((a, b) => (b.t || 0) - (a.t || 0))
  })

  return <Style id='printgames'>
    <InfoBody>
      <InfoSection labels={[
          NAME,
          !edit && { 'submit new': () => set_edit(true) },
          edit && { 'cancel': () => handle.cancel() },
          edit && { 'submit': async () => handle.save() },
          ...(edit?.id ? confirm ? [
            { 'cancel delete': () => handle.cancel() },
            { 'confirm delete': async () => {
              message.trigger({
                text: `deleting "${edit.name}"`,
                id: 'printgame-delete',
              })
              try {
                await api.delete(`/printgames/${edit.id}`)
                await handle.load()
                message.trigger({
                  text: `deleted "${edit.name}"`,
                  id: 'printgame-deleted', delete: 'printgame-delete',
                  ms: 5_000,
                })
                set_edit(false)
              } catch (e) {
                // alert(e.rror || e)
                message.trigger({
                  text: `error deleting "${edit.name}"\n${e.rror}`,
                  id: 'printgame-deleted', delete: 'printgame-delete',
                  ms: 5_000,
                })
              }
            } },
          ] : [
            { 'delete': () => set_confirm(true) },
          ] : []),
        ]}>
        <div>3D print board games!</div>
        <div className='column wide gap'>
          {edit ? <PrintEdit {...{ item: edit.id && edit, set_edit }} /> : display_prints.map(item => <PrintItem {...{ item, set_edit }} />)}
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`&#printgames{
  .print-item {
    border: 1px solid currentcolor;
    padding: .25em .5em;
    border-radius: .25em;
    width: 100%;
    background: gold;
    &:nth-child(3n + 1) {
      background: #0e8dff;
    }
    &:nth-child(3n + 2) {
      background: #ff3f3f;
    }
    &:nth-child(3n + 3) {
      background: #ffd90c;
    }

    > * {
      width: 100%;
    }
    .print-item-description {
      font-size: .8em;
      display: flex;
      max-height: 30em;
      overflow-y: auto;

      img {
        max-height: 20em;
      }
      p {
        margin: 0;
      }
    }

    a {
      cursor: pointer !important;
    }
    textarea {
      width: 100%;
      background: var(--id-color-text);
      color: var(--id-color-text-readable);
      border: 0;
      border-radius: 0;
    }

    *::placeholder {
      color: inherit;
      opacity: .8;
    }
  }
}`