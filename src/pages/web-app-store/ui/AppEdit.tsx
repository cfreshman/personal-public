import React from "react"
import { A, HalfLine, InfoBadges, InfoSection, Multiline } from "src/components/Info"
import api from "src/lib/api"
import { useE, useF, useS } from "src/lib/hooks"
import { store } from "src/lib/store"
import { S } from "src/lib/util"
import { Rating } from "./common"
import { InputLabelled } from "src/components/inputs"
import { openLogin } from "src/lib/auth"
const { named_log } = window as any
const log = named_log('was AppEdit')


export default ({ handle }) => {
  const { a } = handle
  const [app, set_app] = store.use('was-edit-app', { default: undefined })

  handle = {
    ...handle,
    load_edit: async (id) => {
      log('load_edit', id)
      if (id) {
        const app = handle.apps.find(app => app.id === id)
        set_app(app)
      } else {
        if (app === undefined) set_app({
          name: '',
          title: '',
          description: '',
          icon: '',
          url: '',
          rating: { total: 0, count: 0, value: 0 },
        })
      }
    },
    set: (ob) => {
      set_app({ ...app, ...ob })
    },
  }
  useF(handle.id, handle.apps, handle.load_edit)
  useE(app?.id, () => {
    if (app.id) return () => set_app(undefined)
  })

  return <>
    <InfoSection className='section-max'>
      <div className='row wide between'>
        <InfoBadges labels={[
          { '← back': () => handle.id ? handle.to(handle.id) : handle.to('') },
        ]} />
        <InfoBadges labels={[
          { 'save': async () => {
            if (!app.name) return alert('name required')
            // if (!app.title) return alert('title required')
            if (!app.icon) return alert('icon required')
            if (!app.url) return alert('url required')
            if (!a.user) return openLogin()
            
            const { item } = await api.post('/was/app', app)
            handle.set_app(item)
            // handle.to(item.id)
            handle.to('')
            set_app(undefined)
          } },
        ]} />
      </div>
      <div className='column gap app-tile' style={S(`
      width: 100%;
      align-items: stretch;
      `)}>
        {app ? <>
          <div style={S(`
          font-size: 1.25em;
          `)}><b>{app.name || '(unnamed)'}</b>: {app.title || '(untitled)'}</div>
          <div className='row wide' style={S(`
          gap: .5em;
          align-items: stretch;
          `)}>
            <div className='column'>
              {app.icon ? <img src={app.icon} style={S(`
              height: 10em;
              width: 10em;
              `)} /> : <div className='middle-row' style={S(`
              height: 10em;
              width: 10em;
              background: #ccc;
              `)}>no icon</div>}
            </div>
            <div className='column'>
              <Rating rating={app.rating} />
              <div>made by {a.user ? <A tab={`/u/${a.user}`}>{a.user}</A> : <a onClick={e => openLogin()}>(sign in)</a>}</div>
              <div>{app.description || '(no description)'}</div>
              <HalfLine />
            </div>
          </div>
        </> : null}
      </div>
      <HalfLine ratio={.25} />
      {app ? <>
        <div className='column gap app-edit' style={S(`
        width: 100%;
        align-items: stretch;
        `)}>
          <div className='row wide gap'>
            <InputLabelled label='name' value={app.name} onChange={e => handle.set({ name:e.target.value })} className='grow' />
            <InputLabelled label='title' value={app.title} onChange={e => handle.set({ title:e.target.value })} className='grow'  />
          </div>
          <InputLabelled label='app url' value={app.url} onChange={e => handle.set({ url:e.target.value })} />
          <InputLabelled label='icon url' value={app.icon} onChange={e => handle.set({ icon:e.target.value })} />
          <InputLabelled area min_rows={5} label='description' value={app.description} onChange={e => handle.set({ description:e.target.value })} />
        </div>
      </> : null}
    </InfoSection>
  </>
}