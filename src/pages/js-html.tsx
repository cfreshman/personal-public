import React from 'react'
import styled from 'styled-components'
import { CodeBlock, InfoBadges, InfoBody, InfoSection, InfoStyles, Multiline } from '../components/Info'
import { Dangerous, dangerous } from 'src/components/individual/Dangerous'
import { asInput, useF, useM, useRerender, useS } from 'src/lib/hooks'
import { openFrame } from 'src/components/Modal'
import { store } from 'src/lib/store'
import { Tabbed, useCachedScript } from 'src/lib/hooks_ext'
import { S, defer } from 'src/lib/util'
import { copy } from 'src/lib/copy'
import { blob_href, dataurl_href, download, download_text } from 'src/lib/download'


export default () => {
  const { named_log, xhr, css, js_html } = window as any
  const log = named_log('js-html')

  const [script, setScript] = useS()
  const [readme, setReadme] = useS()
  const handle = {
    script: () => {
      if (script_src) {
        try{setScript(xhr(script_src))}catch{setScript(`(unable to load ${script_src})`)}
      } else {
        setScript(script_text)
      }
    },
    readme: () => {
      if (readme_src) {
        try{setReadme(xhr(readme_src))}catch{setReadme(`(unable to load ${readme_src})`)}
      } else {
        setReadme(readme_text)
      }
    },
  }
  const [script_src, setScriptSrc, script_src_bind] = asInput(store.local.use('js-html-script_src', { default:'' }), handle.script)
  const [script_text, setScriptText, script_text_bind] = asInput(store.local.use('js-html-script_text', { default:`
const hello = () => alert('world')
`.trim() 
  }))
  const [readme_src, setReadmeSrc, readme_src_bind] = asInput(store.local.use('js-html-readme_src', { default:'' }), handle.readme)
  const [readme_text, setReadmeText, readme_text_bind] = asInput(store.local.use('js-html-readme_text', { default:`
### script.js
Usage
\`\`\`
hello()
\`\`\`
`.trim()
  }))
  useF(script_src, script_text, handle.script)
  useF(readme_src, readme_text, handle.readme)

  const rerender = useRerender()
  useF(() => defer(rerender, 100))

  const [name, setName, name_bind] = asInput(store.local.use('js-html-name', { default:'https://freshman.dev/lib/script.js.html' }))
  const [version, setVersion, version_bind] = asInput(store.local.use('js-html-version', { default:'0.0.1' }))
  useF(script_src, () => script_src && setName(script_src.split('/').slice(-1)[0]))
  const [detail, setDetail, detail_bind] = asInput(store.local.use('js-html-detail', { default:`
- import as javascript
- view as html`.trim() }))

  const js_html_loaded = useCachedScript('/lib/2/js.html')
  const html = useM(script, readme, name, detail, js_html_loaded, rerender, () => js_html && js_html({
    script: blob_href(script, 'text/javascript'),
    readme: blob_href(readme, 'text/plain'),
    name, version, detail,
  }))
  const src = '' // useM(html, () => blob_href(html))
  log({html,src})
  // const src = useM(html, () => blob_href(html))

  return <Style>
    <InfoBody className='column'>
      <InfoSection labels={[
        'js-html',
      ]}>

        <div className='wide row gap'>
          <input className='grow' {...name_bind}></input>
          <input className='shrink' style={{width:'min(8em, 25%)'}} {...version_bind}></input>
        </div>
        <Multiline {...detail_bind} rows={3} />

        <InfoBadges labels={[
          'script'
        ]} />
        <input placeholder='load url' {...script_src_bind}></input>
        {script_src ? <CodeBlock className='code-source'>{script}</CodeBlock> : <Multiline {...script_text_bind} rows={8} />}

        <InfoBadges labels={[
          'readme'
        ]} />
        <input placeholder='load url' {...readme_src_bind}></input>
        {readme_src ? <CodeBlock className='code-source'>{readme}</CodeBlock> : <Multiline {...readme_text_bind} rows={8} />}

      </InfoSection>
      <Tabbed className='grow' options={{
        'preview': dangerous(`<iframe style="border:1px solid #000;background:#fff;height:100%;width:100%" src=${useM(html, () => blob_href(html))}></iframe>`, {
          style: S(`
          flex-grow: 1;
          width: 100%;
          `)
        }),
        'source': <CodeBlock>{html}</CodeBlock>,
      }} style={S(`
      ${css.mixin.column}
      `)} labels={[
        html ? { copy: e => copy(html, e.currentTarget, 1_000),  } : 'copy',
        html ? { download: e => download_text(html, name, e.currentTarget, 1_000),  } : 'download',
      ]} />
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.code-source {
  max-height: 10em;
}
`