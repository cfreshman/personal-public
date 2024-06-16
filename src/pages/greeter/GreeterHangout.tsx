import React from 'react'
import { InfoBadges } from 'src/components/Info'
import { WebsiteIcon, WebsiteTitle } from 'src/components/website_title'
import { useM } from 'src/lib/hooks'
import { S } from 'src/lib/util'

const { datetime } = window as any

export default ({ user, hangout, func=undefined }) => {
  const others = useM(user, hangout, () => hangout.users.filter(item_user => item_user !== user))
  return <InfoBadges labels={[
    {
      href: `/greeter/hangout/${hangout.id}`, func,
      text: <>
        {/* {hangout.title || (others.length < 3 ? others.join(' & ') : datetime.yyyymmdd(hangout.t + datetime.duration({ h:12 }))) || 'self'} */}
        {hangout.title || hangout.location || datetime.yyyymmdd(hangout.t + datetime.duration({ h:1 })) + (others.length < 3 ? ' ' + (others.join(' & ')||'self') : '')}
        {hangout.icon ? <>
          &nbsp;
          <img src={hangout.icon} style={S(`
          height: 1.4em;
          width: 1.4em;
          `)} />
        </> : null}
      </>,
    },
  ]} />
}
