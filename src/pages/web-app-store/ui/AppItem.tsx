import React from "react"
import { A } from "src/components/A"
import { InfoBadges } from "src/components/Info"
import url from "src/lib/url"
import { S } from "src/lib/util"
import { Rating, Stars, Title } from "./common"

const { range } = window as any

export default ({ app, users, handle }) => {
  const user = users[app.user]
  app.rating
  return <div className='app-item row' style={S(`
  gap: .5em;
  cursor: pointer;
  align-items: stretch;
  `)} onClick={e => {
    handle.nav(e, app.id, handle.option)
  }}>
    <div className='column'>
      <img src={app.icon} style={S(`
      height: 5em;
      width: 5em;
      `)} />
    </div>
    <div className='column grow'>
      <Title app={app} />
      {/* <div><b>{app.name}</b></div> */}
      <Rating rating={app.rating} />
      {/* <div className={S(`
      font-size: .67em;
      `)}>{app.title}</div> */}
      <div className='spacer' />
      <div>
        <InfoBadges labels={[
          { text: 'open app', href: app.url, func: e => e.stopPropagation() },
          // { text: 'review', href: `/web-app-store/${app.id}/review` },
        ]} />
      </div>
      {/* <div>by {user.name}</div> */}
      {/* <div>{app.description}</div> */}
    </div>
  </div>
}