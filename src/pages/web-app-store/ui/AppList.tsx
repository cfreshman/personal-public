import React from "react"
import { A, HalfLine, InfoBadges, InfoSection, Multiline } from "src/components/Info"
import api from "src/lib/api"
import { useEventListener, useF, useM, useR, useS } from "src/lib/hooks"
import { store } from "src/lib/store"
import { S } from "src/lib/util"
import { Rating } from "./common"
import { InputLabelled } from "src/components/inputs"
import AppItem from "./AppItem"
const { named_log } = window as any
const log = named_log('was AppEdit')


export default ({ handle }) => {
  const { a, id, option, modes, apps, users } = handle

  const app_view = useM(a.user, apps, id, option, () => {
    if (!apps) return []
    if (modes.manage) {
      return apps.filter(app => app.user === a.user)
    }
    if (modes.ranked) {
      return apps.slice().sort((a, b) => b.rating.value - a.rating.value)
    }
    if (modes.new) {
      return apps.slice().reverse()
    }
    return apps
  })

  const user_has_apps = useM(a.user, apps, () => {
    return apps?.some(app => app.user === a.user)
  })

  const r_apps = useR(), r_style = useR()
  const do_resize = () => {
    const width = r_apps.current.clientWidth
    const size = width < 700 ? 1 : width < 1200 ? 2 : 3
    r_style.current.innerHTML = `
    .app-item {
      --app-item-width: calc(${width / size}px - ${size/(size + 1)}rem);
    }
    `
  }
  useF(() => do_resize())
  useEventListener(window, 'resize', do_resize)
  
  return <>
    <InfoSection className='column spaced'>
      <style ref={r_style}></style>
      <div className='row wide between'>
        <InfoBadges labels={modes.manage ? [
          'your apps',
          { 'submit new': e => {
            handle.nav(e, 'edit')
          } },
        ] : modes.ranked ? [
          'ranked apps',
          { 'newest': e => {
            handle.nav(e, 'new')
          }}
        ] : [
          'new apps',
          { 'ranked': e => {
            handle.nav(e, '')
          }}
        ]} />
        <InfoBadges labels={modes.manage ? [
          { 'all apps': e => {
            handle.nav(e, '')
          } },
        ] : [
          { 'submit new': e => {
            handle.nav(e, 'edit')
          } },
          user_has_apps && { 'your apps': e => {
            handle.nav(e, 'manage')
          } },
        ]} />
      </div>
      <div ref={r_apps} className='app-grid row wide wrap spaced' style={S(`
      justify-content: center;
      `)}>
        {app_view.map(app => <AppItem key={app.name} {...{ app, users, handle }} />)}
      </div>
    </InfoSection>
  </>
}