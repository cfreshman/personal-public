import React from 'react'
import { InfoBadges } from 'src/components/Info'
import { WebsiteIcon, WebsiteTitle } from 'src/components/website_title'
import { copy } from 'src/lib/copy'
import { useF, useS } from 'src/lib/hooks'
import { S } from 'src/lib/util'

export default ({ viewer, users }) => {
  const [copied, set_copied] = useS(false)
  useF(copied, () => copied && setTimeout(() => set_copied(false), 1_500))
  return <>
    {users.length > 1 ? <div>neither {users.join(' or ')} follow you</div> : <div>{users[0]} doesn't follow you</div>}
    {viewer ? <div>send them your greeter: <InfoBadges labels={[
      // {
      //   href: `/greeter/${viewer}/greet`,
      //   text: `greet u/${viewer}`,
      // }
      {
        func: () => {
          copy(location.origin + `/greeter/${viewer}/greet`)
          set_copied(true)
        },
        text: copied ? 'copied!' : `copy your link`,
      }
    ]} /></div> : null}
  </>
}
