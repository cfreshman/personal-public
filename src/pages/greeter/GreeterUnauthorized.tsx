import React from 'react'
import { InfoBadges } from 'src/components/Info'
import { useF, useS } from 'src/lib/hooks'

const { named_log, Q, defer, sleep, range, rand, devices, copy, display_status } = window as any
const log = named_log('greeter-unauthorized')

export default ({ viewer, users, style={} }) => {
  const [copied, set_copied] = useS(false)
  useF(copied, () => copied && setTimeout(() => set_copied(false), 1_500))
  return <div style={style}>
    {users.length > 1 ? <div>neither {users.join(' or ')} follow you</div> : <div>{users[0]} doesn't follow you</div>}
    {viewer ? <div>send them your greeter: <InfoBadges labels={[
      // {
      //   href: `/greeter/${viewer}/greet`,
      //   text: `greet u/${viewer}`,
      // }
      {
        func: e => {
          const share_url = location.origin + `/greeter/${viewer}/greet`
          copy(share_url)
          display_status(e.target, 'copied!')
          set_copied(true)

          // try share
          navigator.share({
            url: share_url,
          })
          .then(() => log('successful share'))
          .catch(er => log('error sharing:', er))
        },
        text: copied ? 'copied!' : `copy your link`,
      }
    ]} /></div> : null}
  </div>
}
