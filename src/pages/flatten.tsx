/* (flatten)
flatten html imports
*/

import React from 'react'
import { store } from '../lib/store'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { openFrame, openPopup } from '../components/Modal'
import { asList, useF, useTimed } from '../lib/hooks'
import { defer, merge, named_log, node, pick, remove } from '../lib/util'
import { message } from 'src/lib/message'


const log = named_log('flatten')

export default () => {
  const [urls, setUrls, addUrls] = asList(store.local.use('flatten-urls', { default: [] }))
  const [opens, setOpens, addOpens] = asList(store.local.use('flatten-urls-open', { default: [] }))
  const [urlToFrameParameters, setUrlToFrameParameters] = store.local.use('flatten-frame-parameters', { default: {} })
  const [loading, setLoading] = useTimed(3_000, false)

  const handle = {
    open: url => {
      const parameters = urlToFrameParameters[url] || {
        x: undefined, y: undefined, // TODO tile next
        width: undefined,
        height: undefined,
        scale: 1,
      }
      setUrlToFrameParameters(merge(urlToFrameParameters, { [url]: parameters }))
      log('open', { url, parameters })

      const id = `flatten-${url}`
      const frame = node(`<iframe src=${url}></iframe>`) as HTMLIFrameElement
      message.trigger({
        text: <div>loading {url}</div>,
        id,
      })
      frame.onload = e => {
        defer(() => {
          message.trigger({ delete: id })
          console.debug(frame)
          openFrame({
            href: `data:text/plain;charset=utf-8,${frame.contentDocument.documentElement.outerHTML}`,
            options: {
              additive: true,
              ...parameters,
            },
            control: {
              closed: () => {
                setOpens(remove(opens, url))
              },
              resized: (rect) => {
                log('resized', rect)
                setUrlToFrameParameters(merge(store.local.get('flatten-frame-parameters'), { [url]: pick(rect, 'x y height width') }))
              },
            },
          })
        }, 5_000)
      }
      document.body.append(frame)
      setLoading(true)
    }
  }
  useF(() => {
    opens.map(handle.open)
  })

  return <Style>
    <InfoBody>
      <InfoSection><input onKeyDown={(e:any) => {
        if (e.key === 'Enter') {
          let url = e.target.value
          if(0)0
          else if (url.startsWith('/')) url = location.host + url.replace(/^\/-?/, '/-')
          else if (url.endsWith('.')) url = url + location.host
          else url = url.replace(/^(https?:\/\/)/, 'http://')
          
          addUrls([url])
          handle.open(url)
          addOpens([url])
        }
      }}></input></InfoSection>
      <InfoSection labels={[
        'history',
        { open: () => urls.map(handle.open) },
        { clear: () => setUrls([]) },
      ]}>
        <div className='column'>
          {urls.slice().reverse().map(x => <a onClick={e => handle.open(x)}>{x}</a>)}
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`