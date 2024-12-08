import React from 'react'
import styled from 'styled-components'
import { A, Checkbox, ExternalIcon, InfoBadges, InfoBody, InfoCheckbox, InfoSection, InfoStyles, Multiline, Select } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useE, useF, useM, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'
import { openLogin } from 'src/lib/auth'
import url from 'src/lib/url'

const { named_log, truthy, copy, display_status } = window as any
const NAME = 'paste'
const log = named_log(NAME)

const EXTS = {
  TXT: 'txt',
}

const new_blank_edit = (user) => {
  log('new blank edit', user)
  return {
    title: '',
    text: '',
    ext: 'txt',
    public: true, // !user || store.get('paste-public-default'),
    saved: false,
  }
}

const LIMIT_STR = 'over 10KB limit'
const is_over_limit = (data) => data?.text && data.text.length > 1024 * 10

export default () => {
  // useE(() => {
  //   const a = auth.get()
  //   auth.set({ ...a, expand:true })
  //   return () => auth.set({ ...auth.get(), expand:a.expand })
  // })
  const [a] = auth.use()
  const [id, set_id] = usePathState()
  
  const [edit, set_edit] = useS(undefined) // store.use('paste-edit', { default: new_blank_edit() })

  const [paste, set_paste] = useS(undefined)
  const [list, set_list] = useS(undefined)

  const modes = useM(id, edit, () => {
    const is_list = id === 'list'
    const is_edit = !!edit && !is_list
    return {
      view: !is_edit && !is_list,
      edit: is_edit,
      list: is_list,
    }
  })

  useF(edit, paste, modes, log)

  const handle = {
    load_list: async () => {
      const { list } = await api.get('paste')
      log({ list })
      set_list(list.filter(x => x?.text))
    },
    load: async () => {
      if (id === 'list') {
        // pass
      } else if (id) {
        const { item } = await api.get(`paste/${id}`)
        set_paste(item)
        set_edit(null)
        log('paste', item)
      } else {
        handle.edit(null)
      }
      await handle.load_list()
    },
    save: async (data=edit) => {
      log('save', data)
      if (!data.text) {
        alert('paste is empty')
        return
      }
      if (is_over_limit(data)) {
        alert(LIMIT_STR)
        return
      }
      const { item } = await api.put(`paste/${data.id}`, data)
      if (id) {
        set_paste(item)
        set_edit(null)
      } else {
        set_id(item.id)
      }
    },
    new: async () => {
      const { item } = await api.post('paste')
      handle.save({
        ...edit,
        ...item,
      })
    },
    del: async () => {
      await api.delete(`paste/${id}`)
      handle.edit(null)
    },
    list: async () => {
      set_id('list')
      set_paste(null)
    },
    view: async (id='') => {
      set_id(id)
    },
    edit: async (data=paste) => {
      if (data) {
        const { item } = await api.get(`paste/${data.id}`)
        set_edit(item)
      } else {
        url.push('/paste')
        set_edit(new_blank_edit(a.user))
      }
    },
  }
  useF(id, handle.load)

  usePageSettings({
    professional:true,
    background: '#eeebe6', text_color: '#222',
  })
  useStyle(`
  #index#index {
    margin: 0 !important;
    height: 100% !important;
    width: 100% !important;
  }
  #inner-index#inner-index {
    border: 0 !important;
  }`)
  return <Style id='paste'>
    <InfoBody className='column h100'>
      <InfoSection>
        <InfoBadges labels={[
          a.user ? !modes.list && { '← all': () => handle.list() } : modes.view && { 'new': () => { handle.edit(null) } },
          modes.list && 'pastes',
          // modes.view && 'view',
          modes.edit && 'edit',
          modes.list && { 'new': () => handle.edit(null) },
          modes.view && a.user && paste?.user === a.user && { 'edit': () => handle.edit() },
          modes.edit && edit.id && { 'cancel': () => {
            set_edit(null)
          } },
          modes.edit && (edit?.saved ? 'saved' : { 'save': () => edit.id ? handle.save() : handle.new() }),
          modes.edit && !edit.text && { 'paste': () => {
            navigator.clipboard.readText().then(text => {
              set_edit({...edit, text })
            })
          } },
          modes.edit && edit.id && { 'delete': () => {
            if (confirm('are you sure?')) {
              handle.del()
            }
          } },
          modes.edit && is_over_limit(edit) && <A tab='https://pastebin.com' className='center-row' style={S(`
          background: #f00; color: #fff; padding: 0 .33em;
          `)}>{LIMIT_STR} - use pastebin<ExternalIcon /></A> as any,
          modes.view && { 'share': e => {
            const href = location.href
            copy(href)
            display_status(e.target, `copied!`)
            navigator.share({ title: 'paste', text: paste.text, url: href })
          } },
          modes.view && { 'copy': e => {
            copy(paste.text)
            display_status(e.target, `copied!`)
          } },
        ]} />
      </InfoSection>
      {modes.view ? <>
        <InfoSection className='grow column gap'>
          {/* <div><b>{paste?.title ?? 'untitled'}</b> {paste ? '#'+paste.id : ''}</div> */}
          <div id='paste-text' className='paste-content grow column'>
            <table style={S(`
            height: 100%;
            `)}>
              <tr style={S(`
              border-bottom: 1px solid currentcolor;
              `)}><td style={S(`
              padding-bottom: .25em;
              `)} colSpan={2}>
                {paste ? <div className='w100 row'>
                  <div><b>{paste.title || 'untitled'}</b> #{paste.id}</div>
                  <div className='spacer' />
                  <div>{paste.public ? 'public' : 'private'}</div>
                </div> : 'loading...'}
              </td></tr>
              {/* <tr style={S(`
              border-bottom: 1px solid currentcolor;
              `)}><td style={S(`
              padding-bottom: .25em;
              `)} colSpan={2}>
                <InfoBadges labels={paste ? [
                  paste.ext,
                ] : []} />
              </td></tr> */}
              {paste?.text?.split('\n').map((line, i) => <tr><td style={S(`
              text-align: right;
              border-right: 1px solid currentcolor;
              user-select: none; pointer-events: none;
              padding-right: .33em;
              `)}>{i+1}</td><td key={i} style={S(`
              padding-left: .33em;
              width: 100%;
              white-space: pre-wrap;
              word-break: break-word;
              `)}>{line}</td></tr>) ?? null}
            </table>
          </div>
        </InfoSection>
      </> : modes.edit ? <>
        <InfoSection className='grow column gap'>
          <div className='center-row wide gap'>
            <input placeholder='title' value={edit.title} onChange={e => set_edit({...edit, title:e.target.value })} style={S(`
            font-weight: bold;
            `)} />
            <div><label className='pre center-row' style={S(`
            padding: 0 .25em;
            border-radius: .5em;
            // border: 1px dashed currentcolor;
            // background: #8884;
            user-select: none;
            cursor: pointer;
            `)}><input type='checkbox' checked={edit.public} onChange={e => {
              if (!a.user) {
                openLogin()
              } else {
                store.set('paste-public-default', e.target.checked)
                set_edit({...edit, public:e.target.checked })
              }
            }} /> public</label></div>
          </div>
          <Multiline id='paste-text' className='paste-content' rows={-1} placeholder='paste' value={edit.text??''} setValue={text => {
            set_edit({...edit, text, saved:false })
          }} style={S(`
          height: 0; flex-grow: 1;
          margin-bottom: 0;
          `)} />
        </InfoSection>
      </> : modes.list ? <>
        <InfoSection className='grow column gap'>
          <div className='row wrap spaced' style={S(`
          // gap: .67em;
          `)}>
            {list ? list.length === 0 ? 'no pastes' : list.map(item => <a key={item.id} style={S(`
            cursor: pointer;
            color: #36f;
            `)} onClick={e => handle.view(item.id)}>{<><b>{item.title ? item.title : `[${(item.text||'').slice(0, 24)}]`}</b> #{item.id}</>}</a>) : 'loading...'}
          </div>
        </InfoSection>
      </> : null}
    </InfoBody>
  </Style>
}

const common_css = `
&#paste#paste#paste{
  max-width: unset;
  padding: .25em 0;
  width: 70em; max-width: 70em;
  // width: 100vw;

  .paste-content {
    background: #0001 !important;
    color: #111 !important;
    font-size: .8em !important;
    border: 1px solid #000 !important;
    font-family: consolas, monospace;
    line-height: 1.3;
    &#paste-text {
      &:not(textarea) {
        padding: .5em !important;
      }
      // border: 1px solid gold !important;
      // margin: 1px;
      // box-shadow: 0 0 0 1px #000 !important;
      // width: 100% !important;
      // width: min(70em, 100%) !important;
      width: 0;
      min-width: -webkit-fill-available;
      overflow: auto;
      
      table {
        td {
          padding: 0;
          vertical-align: top;
        }
        tr:last-child td {
          height: 100%;
        }
      }
    }
  }

  input:not([type=checkbox]), textarea {
    background: #0001 !important;
    color: #111 !important;
    border: 1px solid #000 !important;
    padding: 0 .25rem !important;
    font-family: consolas, monospace !important;
    font-size: 1em !important;
    &:is(input) {
      font-weight: bold !important;  
    }
    &:is(.mobile *) {
      font-size: max(1em, 16px) !important;
    }
    &::placeholder {
      color: inherit !important;
      opacity: .4 !important;
    }
  }
}

input:not([type=checkbox]), select {
  height: 1.5em;
  font-size: 1em;
  border: 1px solid currentcolor;
  &[type=number] {
    max-width: 5em;
  }
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
  min-height: 1.5em;
  padding: 0 .67em;
}

.section:is(.h100, :last-child) {
  margin: 0;
}
.section.grow.column {
  height: 0;
  flex-grow: 1;
}

.large {
  font-size: 1.5em;
}

// --id-color: #eee;
// --id-color-text: #222;
// --id-color-text-readable: #eee;
background: var(--id-color) !important;
color: var(--id-color-text) !important;
padding: .5em;
font-family: monospace;
`
const Style = styled(InfoStyles)`
// margin: .5em;
// width: calc(100% - 1em);
// height: calc(100% - 1em);
// border: 1px solid #000;
// border-radius: .25em;

${common_css}

box-shadow: none !important; /* to undo expand style (bad code) */
`
const PopupStyle = styled(InfoStyles)`
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);
${common_css}
`