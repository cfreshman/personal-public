import React, { useState } from 'react'
import styled from 'styled-components'
import { A, CodeBlock, HalfLine, InfoBody, InfoLabel, InfoSection, InfoSelect, InfoStyles } from '../components/Info'
import { useF, useM, useRerender, useScript, useStyle, useToggle } from '../lib/hooks'
import { usePageSettings } from '../lib/hooks_ext'
import { store } from '../lib/store'
import { JSX } from '../lib/types'
import { isMobile, list, named_log, node, toYearMonthDay, unpick } from '../lib/util'

const log = named_log('wwl-builder')


const META_DEFAULTS = {
  title: 'wwl-builder',
  subtitle: 'something something',
  author: 'you@example.com',
  icon: 'https://freshman.dev/raw/wwl/icon-js.png',
}
const OPTION_DEFAULTS = {
  // 'labelled states': false,
}
const Example = window['Example'] = {
  GUIDE: '/raw/wwl/builder/example/guide.js',
  HELLO: { states: ['hello world'] },
  BASIC: {
    states: [
      '<button id=1>off</button>',
      {
        html: '<button id=0>on</button>',
        style: 'filter: invert(1)',
      },
    ],
  },
  NAMED: '/raw/wwl/builder/example/named.js',
  SESSION: '/raw/wwl/builder/example/session.js',
  GAME: {
    full: '/raw/wwl/app/tappy',
    title: 'tappy', subtitle: '', author: 'cyrus@freshman.dev', icon: '',
  },
}
Object.keys(Example).map(k => {
  const v = Example[k]
  const href = v.full || v
  if (typeof(href) === 'string') {
    Example[k] = 
    fetch(href)
    .then(x=>x.text())
    .then(text => Example[k] = !href.endsWith('.js') ? { ...v, full: text } : { eval: text.split('\n').slice(1, -1).join('\n') })
    .catch(e => log(e))
  }
})


export default () => {
  usePageSettings({
    checkin: 'wwl-builder',
    icon: '/raw/wwl/icon-js.png',
    background: '#fff',
  })
  const script = useScript('/lib/2/wwl/script.js')
  const [loaded, setLoaded] = useState(false)
  useF(() => {
    script.current.onload = () => {
      log('wwl.js loaded')
      setLoaded(true)
    }
  })
  const rerender = useRerender()

  const [meta, setMeta] = store.local.use('wwl-builder-meta', { default: META_DEFAULTS })
  const [options, setOptions] = store.local.use('wwl-builder-options', { default: OPTION_DEFAULTS })
  const [example, setExample] = store.local.use('wwl-builder-example', { default: 'HELLO' })
  const [mode, setMode]: ['preview'|'source', any] = store.local.use('wwl-builder-mode', { default: 'preview' })

  useF(options, () => location.hash = '')
  const [skeleton, watchOS] = useM(loaded, meta, example, () => {
    if (!loaded) return []
    location.hash = ''

    const example_definition = Example[example] || {}
    if (example_definition.then) {
      log('wwl-builder wait for')
      example_definition.then(() => rerender())
      return []
    }

    const example_evalled = example_definition.eval ? new Function(`return { ${example_definition.eval} }`)() : {}
    const app_definition = {
      state: 0,
      ...example_definition,
      ...example_evalled,
      at: "#wwl-target",
      ...meta,
    }

    log('wwl.js definition', app_definition)
    setTimeout(() => {
      if(0)0
      // else if (app_definition.eval) Object.assign(app_definition, new Function(`return { ${app_definition.eval} }`)())
      else if (app_definition.full) {
        // replace #wwl-target with iframe instead
        const target = document.querySelector('#wwl-target')
        target.innerHTML = ''
        const frame = node(`<iframe style="
        width: 100%;
        min-height: 40vh;
        "></iframe>`) as HTMLIFrameElement
        frame.srcdoc = example_definition.full
        target.append(frame)
        return
      }

      const wwl = window['wwl']
      const app = window['app'] = wwl.attach(app_definition)
      log('wwl.js attached', app)
    })

    return [example_definition.full || 
`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${meta.title}</title>
  <meta name="description" content="${meta.subtitle}" />
  <meta name="author" content="${meta.author}">
  <link rel="icon" href="${meta.icon}">
</head>
<body>
  <script src="https://freshman.dev/lib/2/wwl/script.js"></script>
  <script>
    wwl.attach(${JSON
      .stringify(unpick(app_definition, 'at title subtitle author icon eval ' + (example_evalled ? Object.keys(example_evalled).join(' ') : '')), null, 2)
      .replace(/"\\n([^"]+)"/g, '`\n$1`')
      .replaceAll('\\n', '\n')
      .replaceAll('\n', '\n'+'  '.repeat(2))
      .replace(/"([^" ]+)":/g, '$1:')
      .replace(/\}$/, example_definition.eval ? example_definition.eval.replaceAll('\n', '\n'+'  '.repeat(2))+'}' : '}')})
  </script>
</body>
</html>
`,
`//
//  app.swift
//  ${meta.title} (wwl-watchOS)
//
//  Created by ${meta.author} on ${toYearMonthDay(new Date())}.
//
import SwiftUI
import AuthenticationServices

let APP_NAME = "${meta.title}"
let APP_AUTHOR = "${meta.author}"
let APP_ICON = "${meta.icon}"
let APP_URL = "<enter your .html upload URL here>"

let vh: CGFloat = WKInterfaceDevice.current().screenBounds.height / 100
let SizedText = {(text: String, size: CGFloat) in Text(text).font(.system(size:size))}
struct web: View { let name: String, author: String, icon: String, url: String; let open = {{ $0.prefersEphemeralWebBrowserSession = true; $0.start() }(ASWebAuthenticationSession(url: URL(string: $0)!, callbackURLScheme: nil) { _,_ in })}; var body: some View {
    VStack {
        SizedText("", 20*vh)
        SizedText("(tap to start)", 5*vh)
        AsyncImage(
            url: URL(string: icon),
            content: { image in image.resizable().aspectRatio(contentMode: .fit).frame(height: 50*vh).scaledToFill() },
            placeholder: {})
        SizedText("", 10*vh)
        SizedText(name.uppercased(), 10*vh)
        SizedText("by " + author, 5*vh)
    }
    .onTapGesture{open(url)}
    .onAppear{open(url)}
} }

let APP = web(name:APP_NAME, author:APP_AUTHOR, icon:APP_ICON, url:APP_URL)
@main struct wwlApp: App { var body: some Scene { WindowGroup { APP } } }
struct preview: PreviewProvider { static var previews: some View { APP } }
`]
})

  const [wishmode, toggleWishmode] = useToggle(false)
  useStyle(wishmode, wishmode ? `
  .wwl-body .wwl-close {
    display: none !important;
  }
  .wwl-body .wwl-app-root {
    flex-grow: 1;
  }
  ` : ``)
  
  const modes = useM(mode, () => list('preview source watchOS').map(x => mode === x ? x : { [x]: () => setMode(x as any) }))
  return <Style>
    <InfoBody className='vertical'>
      <InfoSection>
        <span>Generate a <A href='/lib/2/wwl/script.js' tab>wwl.js</A> app skeleton</span>
        <HalfLine />
      </InfoSection>
      <InfoSection labels={[
        'definition', 
        // { reset: () => {
        //   setMeta(META_DEFAULTS)
        //   setMode('preview')
        // } }
      ]}>
        <form>
          {
          // list('title subtitle author')
          Object.keys(meta)
          .map(x => <input type="text" disabled={Example[example].full} key={x} value={(Example[example].full ? Example[example][x] : undefined) ?? meta[x]} onInput={e => {
            const value = e.currentTarget.value
            setTimeout(() => setMeta({
              ...meta,
              [x]: value,
            }))
          }}/> )}
          <div className='center-vertical'><InfoSelect label='skeleton' value={example} options={Object.keys(Example)} setter={setExample} />
          {/* &nbsp;{Example[example].full ? <span style={toStyle(`font-size: .7em`)}>(ignores definition)</span> : ''} */}
          </div>
        </form>
      </InfoSection>

      {/* <InfoSection labels={['options']}>
        <form>
          {Object.keys(options).map(x => <label><input type="checkbox" key={x} checked={options[x]} onChange={e => {
            const value = e.currentTarget.checked
            setTimeout(() => setOptions({
              ...options,
              [x]: value,
            }))
          }}/>{x}</label> )}
          <InfoSelect label='skeleton' value={example} options={Object.keys(Example)} setter={setExample} />
        </form>
      </InfoSection> */}
      {/* <InfoSection labels={[]}>
        {Object.entries({
          preview: <div id="wwl-target" className='full'></div>,
          source: <CodeBlock>{skeleton}</CodeBlock>,
        }).map(([k, v]) => <div key={k} style={{display:k===mode?'':'none'}}>{v}</div>)}
      </InfoSection>
      <InfoSection labels={modes} className='full'></InfoSection>

      <br/>

      <InfoSection labels={['then what?']}>
        <div className="pre-space">{`1. upload somewhere\n2. open on your computer\n3. open on your phone\n4. open on your watch (Apple Watch - install `}<a href="https://freshman.dev/.watchOS-wwl-install">wwl-watchOS</a>{`)`}</div>
      </InfoSection> */}
      <InfoSection labels={[
        ...modes,
      ]} className="full">
        {Object.entries({
          preview: <>
            <div id="wwl-target" className='full'></div>
            <InfoLabel labels={[!Example[example].full && { 'wish mode': toggleWishmode }, wishmode ? '(full-screen browser)' : '']} />
            <HalfLine />
          </>,
          source: <>
            <CodeBlock download='index.html'>{skeleton}</CodeBlock>
            <InfoLabel labels={['then what?']} />
            <div className="pre-space">{
            `1. upload somewhere\n`+
            `2. open on your computer\n`+
            `3. open on your phone\n`+
            `4. open on your watch\n`+
            `   Apple Watch\n`+
            `   a) message to yourself\n`+
            `   b) install `}<a href="https://freshman.dev/.watchOS-wwl-install">wwl-watchOS</a>{`\n`+
            `5. create a standalone app with `}<a onClick={() => setMode('watchOS')}>watchOS</a>{`\n`}</div>
          </>,
          watchOS: <>
            <CodeBlock download={'app.swift'}>{watchOS}</CodeBlock>
            <InfoLabel labels={['then what?']} />
            <div className="pre-space">{
            `1. Xcode → File → New → Project\n`+
            `2. watchOS → App → Watch-only App\n`+
            `3. Replace .swift files with app.swift`}</div>
        </>,
        }).map(([k, v]) => <div className='full' key={k} style={{display:k===mode?'':'none'}}>{v}</div>)}
      </InfoSection>
      {/* <InfoLabel labels={modes} /> */}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.vertical {
  display: flex; flex-direction: column;
}
.full {
  flex-grow: 1;
}
.pre-space {
  white-space: pre-wrap;
}
form {
  display: flex; flex-direction: column;
  gap: .25em;
  user-select: none;
  * {
    display: flex; flex-direction: row;
    align-items: center;
  }
}
.section {
  align-items: stretch;
}
${isMobile ? `
.wwl-body {
  scale: .9;
}
`:''}
`