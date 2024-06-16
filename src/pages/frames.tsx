import React from 'react'
import { store } from '../lib/store'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoSelect, InfoStyles, Select } from '../components/Info'
import { openFrame } from '../components/Modal'
import { asList, useF, useS } from '../lib/hooks'
import { defer, merge, named_log, pick, range, remove } from '../lib/util'


const log = named_log('frames')

export default () => {
  const [urls, setUrls, addUrls] = asList(store.local.use('popup-urls', { default: [] }))
  const [opens, setOpens, addOpens] = asList(store.local.use('popup-urls-open', { default: [] }))
  const [urlToFrameParameters, setUrlToFrameParameters] = store.local.use('popup-frame-parameters', { default: {} })

  // const [saves, setSaves, addSaves] = asList<any>(store.local.use('popup-urls-saves', { default: [] }))
  // const [save_i, setSaveIndex] = useS(-1)

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

      openFrame({
        href: url.replace(/^\/?([^-])/, '/-$1'),
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
            setUrlToFrameParameters(merge(store.local.get('popup-frame-parameters')||{}, { [url]: pick(rect, 'x y height width') }))
          },
        },
      })
    },
    // save: (i=undefined) => {
    //   setSaveIndex(i)
    //   if (i >= saves.length) {
    //     addSaves[[opens] as any]
    //   } else {
    //     setOpens([])
    //     defer(() => {
    //       saves[i].map(x => {
    //         handle.open(x)
    //         // addOpens([x])
    //       })
    //     })
    //   }
    // },
  }
  useF(() => {
    opens.map(x => {
      handle.open(x)
      // addOpens([x])
    })
  })
  // useF(save_i, () => save_i > 0 && handle.save(save_i))
  // useF(saves, () => save_i >= saves.length && setSaveIndex(-1))

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
        // opens.length ? { 
        //   save: () => {
        //     if (save_i < 0) {
        //       handle.save(0)
        //     } else {
        //       saves[save_i] = opens
        //       setSaves(saves.slice())
        //     }
        //   },
        // } : 'save',
        // saves.length && <InfoSelect
        // value={save_i}
        // // onChange={e => handle.save(e.target.value)}
        // options={range(saves.length + 2).map(i => i-1)} 
        // setter={setSaveIndex}
        // display={i => i < 0 ? 'load save' : i < saves.length ? `#${i+1}` : 'new save'} />,
        // save_i > -1 && { delete: () => setSaves([ ...saves.slice(0, save_i), ...saves.slice(1 + save_i) ]) }
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