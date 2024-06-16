import React from 'react'
import { InfoBadges } from 'src/components/Info'
import { WebsiteIcon, WebsiteTitle } from 'src/components/website_title'
import { S } from 'src/lib/util'

export default ({ user, meet, func=undefined, href=undefined }) => {
  return <InfoBadges labels={[
    {
      href, func,
      text: <>
        {meet.users.filter(item_user => item_user !== user).join(' & ') || 'self'}
        {meet.icon ? <>
          &nbsp;
          <img src={meet.icon} style={S(`
          height: 1.4em;
          width: 1.4em;
          `)} />
        </> : null}
      </>,
    },
  ]} />
}
