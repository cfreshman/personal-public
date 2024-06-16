import React from 'react'
import { message } from '../components/Messages'
import { domains } from '../pages/domains'
import api from './api'
import { useE, useEventListener } from './hooks'
import { useSocket } from './socket'
import { JSX } from './types'
import url from './url'

const Notification = ('Notification' in window) ? window.Notification : undefined

export function twitter(handle?) {
  return api.post(`notify/twitter`, { handle })
}

export function sub(page) {
  console.debug(Notification?.permission
    || 'notifications not supported')
  if (Notification && 'granted' !== Notification.permission) {
    Notification.requestPermission()
  }
  return api.put(`notify/sub/${page}`)
}
export function unsub(page) {
  return api.delete(`notify/sub/${page}`)
}
export function subbed(page) {
  return api.get(`notify/sub/${page}`)
}

let active = true
window.addEventListener('blur', e => active = false)
window.addEventListener('focus', e => active = true)

const notifyFilters = []
export function useNotify(history) {
  // useE(() => {
  //   if ('default' === Notification?.permission) {
  //     message.trigger({
  //       text: <a onClick={e => Notification.requestPermission()}>Enable notifications for this browser</a>,
  //       id: 'device-notifications',
  //       once: true,
  //     })
  //   }
  // })
  const socket = useSocket({
    on: {
      'notify:msg': async (id, msg: { [key: string]: string[] }) => {
        console.debug('MSG', id, msg)
        if ('granted' === Notification?.permission) {
          socket.emit(`confirm:${id}`)
          Object.entries(msg).forEach(async entry => {
            const [app, list] = entry
            list
            .filter(text => !(active && notifyFilters.some(f => f(app, text))))
            .forEach(text => {
              console.debug('NOTIFICATION', text)
              // <text message> - <link> OR <text message> <link>
              const match = text.match(/^(.+)( –)?[\n ]([^\n ]+)$/)
              let body, link
              if (match) {
                [body, link] = [match[1], match[3]]
              } else {
                [body, link] = [text, undefined]
              }
              console.debug(body, link)
              const notif = new Notification(`/${app}`, {
                body,
                tag: link || app
              })
              notif.onclick = () => {
                let plain = link || `/${app}`
                domains.forEach(x => plain = plain.replace(x.text, ''))
                console.debug('NOTIFICATION CLICK', link, plain)
                url.push(plain)
                // url.push(link?.match('^freshman.dev') ? link.replace('freshman.dev', '') : `/${app}`)
                window.focus()
              }
            })
          })
        }
      }
    }
  })
}
// export function useNotify(history) {
//   useInterval(() => {
//     auth.user && api.get('notify/msg').then(
//       ({msg}: {msg: { [key: string]: string[] }}) => {
//       // console.log(msg)
//       Object.entries(msg)
//         .forEach(async entry => {
//           if ('default' === Notification.permission) {
//             await Notification.requestPermission()
//           }
//           let [app, list] = entry
//           list
//           .filter(text => !notifyFilters.some(f => f(app, text)))
//           .forEach(text => {
//             let [body, link] = text.split(' – ')
//             console.log(body, link, history)
//             let notif = new Notification(`/${app}`, {
//               body,
//               tag: link
//             })
//             notif.onclick = () => {
//               history.push(link.replace('freshman.dev', ''))
//             }
//           })
//         })
//     })
//   }, 3000);
// }
export function useNotifyFilter(filter: (app: string, text: string) => boolean) {
  useE(filter, () => {
    notifyFilters.push(filter)
    return () => {
      notifyFilters.splice(notifyFilters.indexOf(filter), 1)
    };
  })
}