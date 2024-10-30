import React from 'react'
import styled from 'styled-components'
import { CodeBlock, InfoBadges, InfoBody, InfoButton, InfoCheckbox, InfoFile, InfoLabel, InfoSection, InfoSelect, InfoStyles, Multiline } from '../components/Info'
import { Dangerous } from 'src/components/individual/Dangerous'
import { asInput, useCached, useCachedSetter, useEventListener, useF, useM, useR, useRerender, useS, useStyle } from 'src/lib/hooks'
import { openFrame, openPopup } from 'src/components/Modal'
import { store } from 'src/lib/store'
import { JSX, anyFields } from 'src/lib/types'
import { copy } from 'src/lib/copy'
import { download, download_text } from 'src/lib/download'
import { Scroller } from 'src/components/Scroller'
import { usePageSettings } from 'src/lib/hooks_ext'
import { Column, Row } from 'src/components/Common'
import { S, set } from 'src/lib/util'
import { message } from 'src/lib/message'
import api, { auth } from 'src/lib/api'


const { named_log, Q, QQ, pass, range, list, object, entries, strings, lists, merge } = window as any
const log = named_log('html-resume')
const format_line = ({
  separator='',
  margin='0',
  highlight=false, spaced=false, section=false
}={}, ...xs) => `<div class="resume-row row" style="
gap: .67em;
margin-left: ${margin};
margin-top: ${spaced ? '.67em' : '0'};
">${xs.flat().filter(pass).map((x,i) => `<span class="resume-row-item ${(highlight && i === 0) || x.options?.highlight ? 'highlight' : ''}" style="
${i === 0 ? 'font-weight: bold;' : ''}
">${x}</span>`).join(separator)}</div>`

const DEFAULT_RESUME_POSITION = {
  title: 'TITLE',
  // time: [2023] as ([number]|[string, number]|[number, number]|[[[string, number], [string, number]]]|[string, [number, number]]),
  time: '2023',
  description: [''] as (string|{project:string,description:string}|{description:string,link:string})[] | {number:string,name:string}[] | string[][],
}
const DEFAULT_RESUME_ITEM = {
  entity: 'ENTITY' as (string|[string, string]),
  location: 'LOCATION',
  rating: '', scale: undefined,
  positions: [DEFAULT_RESUME_POSITION],

  options: {
    'highlight': false,
    'spaced': false,
    'section': false,
  },
  hidden: false, simple: false,
}
const DEFAULT_RESUME = {
  built_with: 'https://freshman.dev/html-resume',
  name: 'NAME',
  location: 'LOCATION',
  email: 'EMAIL@EXAMPLE.COM',
  // links: [] as string[],
  github: '',
  items: [DEFAULT_RESUME_ITEM],

  options: {
    'variable font': true,
    // 'legal size': false,
  },
  height: 11, width: 8.5,
}

const render = {
  rating: ({ rating, scale, highlight }) => rating || typeof(rating) === 'number' ? `<div>
    ${scale ? `
    <span>${scale}\\</span>
    ` : ''}
    <span style="
    font-weight: bold;
    ${highlight ? `
    background: #000; color: #fff; display: inline-block;
    ` : ''}
    ">${rating}</span>
  </div>` : '',
  filename: (resume) => `resume-${
    resume.name.split(' ')
    .map(x => x && x[0].toLocaleUpperCase() + x.slice(1))
    .filter(pass)
    .join('')
  }.html`
}

export default () => {

  usePageSettings({
    checkin: true,
    // background: '#20e586',
    // background: '#6bffb8',
    // background: '#dae4ae',
    // background: '#abf2b9',
    // background: '#f6b98c',
    // background: '#a5c1df',
    background: '#9dbbf1',
    expand: true,
    // background: '#cdc', text_color: '#343',
    // background: '#000', text_color: '#fff',
  })

  const [_resume, setResume] = store.local.use('html-resume-data', { default: DEFAULT_RESUME })
  const resume = merge(DEFAULT_RESUME, _resume)
  // const rerender = useRerender()
  // useF(resume, rerender)

  // const [_id, reloadId] = useCached('/user_id')
  // const id = _id && `htmlresume-${_id}`
  // const loaded_user = useR()
  // const [sync={}, setSync, reloadSync] = useCachedSetter({
  //   name: 'htmlresume-sync',
  //   fetcher: () => id && api.post('/state', { id }).with(x => {
  //     log('synced fetch', x)
  //     loaded_user.current = auth.user
  //     setResume(x.resume)
  //   }),
  //   setter: (
  //     x: {state?:anyFields,update?:anyFields,delete?:{[key:string]:boolean}}
  //   ) => 
  //     api
  //     .post('/state', {
  //       ...x, id,
  //     })
  //     .with(x => log('synced set', x)),
  // })
  // const sync_save = useR()
  // auth.use(async ({user}) => {
  //   if (loaded_user.current !== user) {
  //     sync_save.current = (loaded_user.current) ? undefined : sync
  //     await reloadId()
  //   }
  // })
  // useF(id, reloadSync)
  // useF(() => {
  //   if (sync_save.current) {
  //     setSync(sync_save.current)
  //     sync_save.current = undefined
  //   }
  // })
  // useF(resume, () => setSync({ state: {resume} }))

  const heading_lines = [
    resume.name, 
    resume.location, 
    (([user, domain]) => `<a href="mailto:${user}@${domain}">${user}@</a>(<a href="http://${domain}">${domain}</a>)`)(resume.email.split('@')),
  ]
  if (resume.github) heading_lines.push((x => `<a href="https://github.com/${x}">github.com/${x.toUpperCase()}</a>`)(resume.github))

  const resume_html_filename = useM(JSON.stringify(resume), () => render.filename(resume))
  const html = useM(resume, () => {
    let rating_i = -1
    return `
<!DOCTYPE html>
<html class="preserve-links">
  <head>
    <title>${resume.name}</title>
    <link rel="icon" href="https://freshman.dev/raw/html-resume/resume-icon.png" />
    <meta charset=utf-8><meta name="viewport" content="width=device-width,initial-scale=1" />
    <script src="https://freshman.dev/copyright.js"></script>
    <style> * { box-sizing: border-box; } :root { --filter-b: 1; --filter-c: 1; --filter-s: 1; --filter: brightness(var(--filter-b)) contrast(var(--filter-c)) saturate(var(--filter-s)); --filter-invert: brightness(calc(1/var(--filter-b))) contrast(calc(1/var(--filter-c))) saturate(calc(1/var(--filter-s))); } html, body { margin: 0; height: 100%; width: 100%; } body { font-family: 'Duospace', monospace; font-family: monospace; filter: var(--filter); filter: none; } iframe { filter: var(--filter-invert); } .relative{ position: relative;}.absolute{ position: absolute;}.left{ text-align: left;}.right{ text-align: right;}.wide{ width: -webkit-fill-available;}.tall{ height: -webkit-fill-available;}.full{ margin: 0; height: 100%; width: 100%;}.fill{ margin: 0; height: 100%; width: 100%; position: absolute; top: 0; left: 0;}.flex{ display: flex; align-items: flex-start; justify-content: flex-start;}.row{ display: flex; align-items: flex-start; justify-content: flex-start; flex-direction: row;}.column{ display: flex; align-items: flex-start; justify-content: flex-start; flex-direction: column;}.center{ display: flex; align-items: flex-start; justify-content: flex-start; align-items: center; text-align: center;}.center-row{ display: flex; align-items: flex-start; justify-content: flex-start; flex-direction: row; display: flex; align-items: flex-start; justify-content: flex-start; align-items: center; text-align: center;}.center-column{ display: flex; align-items: flex-start; justify-content: flex-start; flex-direction: column; display: flex; align-items: flex-start; justify-content: flex-start; align-items: center; text-align: center;}.middle{ display: flex; align-items: flex-start; justify-content: flex-start; align-items: center; text-align: center; justify-content: center; text-align: center;}.middle-row{ display: flex; align-items: flex-start; justify-content: flex-start; flex-direction: row; display: flex; align-items: flex-start; justify-content: flex-start; align-items: center; text-align: center; justify-content: center; text-align: center;}.middle-column{ display: flex; align-items: flex-start; justify-content: flex-start; flex-direction: column; display: flex; align-items: flex-start; justify-content: flex-start; align-items: center; text-align: center; justify-content: center; text-align: center;}.inline{ display: inline-flex;}.gap{ display: flex; align-items: flex-start; justify-content: flex-start; gap: .25em;}.wrap{ display: flex; align-items: flex-start; justify-content: flex-start; flex-wrap: wrap;}.start{ display: flex; align-items: flex-start; justify-content: flex-start; justify-content: flex-start;}.end{ display: flex; align-items: flex-start; justify-content: flex-start; justify-content: flex-end}.grow{ flex-grow: 1;}.shrink{ flex-shrink: 1;}.monospace{ font-family: 'Duospace', monospace; font-family: monospace;}.uppercase{ text-transform: uppercase;}.lowercase{ text-transform: lowercase;}.capitalize{ text-transform: capitalize;}.solarize{ --filter-b: 1.2; --filter-c: .8; --filter-s: .975; --filter: brightness(var(--filter-b)) contrast(var(--filter-c)) saturate(var(--filter-s)); --filter-invert: brightness(calc(1/var(--filter-b))) contrast(calc(1/var(--filter-c))) saturate(calc(1/var(--filter-s))); filter: var(--filter);} .spacer { flex-grow: 1; } .description { font-size: .7em; } :root{ --filter-b: 1.2; --filter-c: .8; --filter-s: .975; --filter: brightness(var(--filter-b)) contrast(var(--filter-c)) saturate(var(--filter-s)); --filter-invert: brightness(calc(1/var(--filter-b))) contrast(calc(1/var(--filter-c))) saturate(calc(1/var(--filter-s))); filter: var(--filter);--background:#fdfcfa;--color:#101010;--button:#eee;}*{box-sizing:border-box;font-family:SFMono-Regular,Menlo,Monaco,Consolas,"LiberationMono","CourierNew",monospace;}html,body{display:flex;flex-direction:column;align-items:flex-start}html{height:100%;background:var(--background);color:var(--color);font-size:12px;}body{flex-grow:1;padding:.5em;}iframe{border:0;display:block;}a{color:inherit;text-decoration:underline;}a:hover{background:var(--color);color:var(--background);}button,a,input,*[onclick]{font-size:1em;cursor:pointer;touch-action:manipulation;}button,input:is(:not([type]),[type=text],[type=password],[type=email]){border:1px solid currentColor;border-radius:10em;padding:.1667em.67em;height:calc(100%-1px);margin:.5px 0;}button{background:var(--button);user-select:none;}input:is(:not([type]),[type=text]){background:none;}input:is(:not([type]),[type=text],[type=password],[type=email])::placeholder{opacity:.425;}:root{--background:#fdfcfa;--color:#101010;--button:#eee;}*{box-sizing:border-box;font-family:SFMono-Regular,Menlo,Monaco,Consolas,"LiberationMono","CourierNew",monospace;}html,body{display:flex;flex-direction:column;align-items:flex-start}html{height:100%;background:var(--background);color:var(--color);font-size:12px;}body{flex-grow:1;padding:.5em;}iframe{border:0;display:block;}a{color:inherit;text-decoration:underline;}a:hover{background:var(--color);color:var(--background);}button,a,input,*[onclick]{font-size:1em;cursor:pointer;touch-action:manipulation;}button,input:is(:not([type]),[type=text],[type=password],[type=email]){border:1px solid currentColor;border-radius:10em;padding:.1667em.67em;height:calc(100%-1px);margin:.5px 0;}button{background:var(--button);user-select:none;}input:is(:not([type]),[type=text]){background:none;}input:is(:not([type]),[type=text],[type=password],[type=email])::placeholder{opacity:.425;}</style>

    <style>
      :root, html, body {
        // overflow-y: hidden;
        height: 100vh;
        --filter-b: 1.05; --filter-c: .95; --filter-s: .975;
      }
      * {
        flex-shrink: 0;
        font-family: inherit;
      }
      a {
        text-decoration: none !important;
      }
      a:not(:has(button)) {
        color: #1155cc !important;
        text-decoration: none !important;
      }
      a:not(:has(button)):hover {
        background: #1155cc !important; color: #fff !important;
        box-shadow: 0 .25px #1155cc;
        text-decoration: none !important;
      }
      a:has(button) {
        background: none !important;
      }

      body {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000;
        min-height: 400px;
        height: max-content;
      }
      #resume-container {
        --font-size-px: min(75px, 11vw);
        --font-size-px: 1in;
        font-size: var(--font-size-px);
        height: 11em;
        width: 8.5em;

        height: ${resume.height}in;
        width: ${resume.width}in;
        ${resume.options['legal size'] ? `
        height: 14in;
        width: 8.5in;
        ` : ''}
      }
      #resume-controls {
        position: fixed; top: 0; left: 0;
      }
      #resume {
        font-size: calc(100% / 8.5);
        height: 100%;
        width: 100%;

        background: #eeebe6;
        padding: calc(60% / 11) calc(17% / 8.5);
        box-sizing: border-box;
        line-height: 1.3 !important;
        font-family: 'Roboto Mono', monospace;
      }
      #resume > * {
        font-size: 1.35em;
      }
      #resume * {
        vertical-align: baseline;
      }
      .resume-row {
        text-transform: uppercase;
      }
      .resume-row-item:first-child {
        font-weight: bold;
      }
      .resume-description {
        width: -webkit-fill-available;
      }
      .resume-description > * {
        flex-grow: 1;
        white-space: pre-wrap !important;
        margin-left: 1em;
        ${resume.options['variable font'] ? `
        font-size: .85em;
        ` : ''}
      }
      // .resume-section:first-child .resume-row > :first-child {
      //   background: #000; color: #fff; display: inline-block;
      // }
      .resume-section .resume-row > .highlight {
        background: #000; color: #fff; display: inline-block;
      }
      .resume-section:not(:last-child)::after {
        content: "";
        display: block;
        white-space: pre;
      }
      .resume-spacer {
        content: "";
        display: block;
        height: 0;
        flex-grow: 1;
      }
      .resume-spacer:last-child:nth-child(n+3 of .resume-spacer) {
        display: none;
      }
      @page {
        size: ${resume.width}in ${resume.height}in;
        margin: .5in .5in .5in .5in;
      }
      @media print {
        * {
          print-color-adjust: exact;
        }
        .no-print, .no-print * {
          display: none !important;
        }
      }
      .mobile #resume-container {
        transform: scale(.45);
        transform-origin: top;
      }
    </style>
    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" integrity="sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
  </head>
  <body>
    <div id=resume-container>
      <div id=resume class=column>${
        // [
        //   ...resume.items?.map(x =>
        //   `${format_line(x.entity, x.location)}
        //   ${x.positions?.map(x => `<div>
        //     <div style="
        //     display: flex;
        //     justify-content: space-between;
        //     "><span>${x.title}</span><span>${
        //       // x.time.map(x => (Array.isArray(x) ? x : [x]).join(' '))
        //       x.time
        //     }</span></div>
        //     ${x.description.map(y => `<div style="
        //     margin-left: 1em;
        //     ">${y}</div>`).join('\n')}
        //   </div>`).join('\n')}`).join('\n'),
        //   format_line(resume.name, resume.location, (([user, domain]) => `${user}@(${domain})`)(resume.email.split('@'))),
        // ].map(x => `<div class=resume-section>${x}</div>`).join('\n')

        [

          format_line({
            separator: '•',
          }, ...heading_lines),

          // resume.links.length
          // ? `<div style="margin-top:-1em;display:flex;gap:.67em">${resume.links.map(x => `<a href="https://${x}">${x.toUpperCase()}</a>`).join('•')}</div>`
          // : '',

          // '<br/>',

          ...resume.items?.filter(x => !x.hidden).map((x,i) =>
          `<div class="row wide" style="
          justify-content: space-between;
          ">
            ${format_line({
              separator: '•',
              // highlight: i === 0,
              highlight: x.options?.highlight || x.options?.section,
              spaced: x.options?.spaced || x.options?.section,
              section: x.options?.section,
            }, x.entity, x.detail, x.location)}
            ${render.rating(merge(x, { highlight: 0 === (rating_i += x.rating ? 1 : 0) }))}
          </div>
          ${x.positions?.map(y => `<div class="resume-position column wide" style="
          margin-bottom: .2em;
          ">
            <div style="
            width: 100%;
            display: flex; justify-content: space-between;
            ">
              <span>${y.title}</span>
              <span style="
              font-weight: bold;
              ">${
                // x.time.map(x => (Array.isArray(x) ? x : [x]).join(' '))
                y.time
              }</span>
            </div>
            <div class="resume-description column wide">
              ${y.description?.filter(x => !x.hidden).map(z => `<div>${z}</div>`).join('\n')}
            </div>
          </div>`).join('\n')}`),

          // format_line({
          //   separator: '•'
          // }, resume.name, resume.location, (([user, domain]) => 
          // `<a href="mailto:${user}@${domain}">${user}@</a>(<a href="http://${domain}">${domain}</a>)`)(resume.email.split('@'))),

        ]
        .map((x,i) => 
          `<div class="resume-section column wide">${x}</div>`
          + (!(resume.items[i-1]||{}).options?.section ? '<div class=resume-spacer></div>' : ''))
        .join('')
        .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2">$1</a>')
        .replace(/\*([^*]]*)\*/g, '<b>$1</b>')
      }</div>
    </div>

    <script>{
const href = location.href
const container = Q('#resume-container')
const resume = Q('#resume')

// const pdf = href.replace('.html', '.pdf')
const outer = node('<div class="no-print row gap" style="position:fixed;top:0;left:0;margin:.5em"></a>')
document.body.append(outer)
// fetch(pdf)
// .then(r => {
//   outer.append(
//     Object.assign(
//       node('<a><button>pdf</button></a>'),
//       {
//         href: pdf
//       },
//     )
//   )
// })
// outer.append(
  Object.assign(
    node('<button>.html-resume.json</button>'),
    {
      onclick: () => download(\`${strings.json.pretty(resume)}\`, 'resume-${resume.name.replace(' ', '')}.html-resume.json')
    },
  )
// )
outer.append(
  Object.assign(
    node('<button>.pdf</button>'),
    {
      onclick: async () => {
        container.style.transform = 'none'
        await html2pdf().set({
          filename: 'resume-${resume.name.replace(' ', '')}.pdf',
          margin: 0,
          // html2canvas: { scale: .25 },
          jsPDF: {
            orientation: 'portrait',
            unit: 'in',
            format: [${resume.width}, ${resume.height}]
          },
        }).from(container).save()
        container.style.transform = ''
      }
    },
  )
)
outer.append(
  Object.assign(
    node('<button>.png</button>'),
    {
      onclick: async () => {
        container.style.transform = 'none'
        await html2canvas(container).then(canvas => download_canvas(canvas, 'resume-${resume.name.replace(' ', '')}.png'))
        container.style.transform = ''
      }
    },
  )
)

// const resize = () => {
//   const style = node('style')
//   head.append(style)
//   let font_size_px = 1
//   style.innerHTML = \`#resume-container{--font-size-px:\${font_size_px}px}\`
//   while (container.clientWidth < innerWidth && container.clientHeight < innerHeight && font_size_px < 100) style.innerHTML = \`#resume-container{--font-size-px:\${font_size_px += 1}px}\`
//   while (!(container.clientWidth < innerWidth && container.clientHeight < innerHeight && font_size_px < 100)) style.innerHTML = \`#resume-container{--font-size-px:\${font_size_px -= .1}px}\`
//   style.innerHTML = \`#resume-container{--font-size-px:\${font_size_px * .95}px}\`
//   console.debug(font_size_px)
// }
// resize()
// on(window, 'resize deviceorientation', resize)
    }</script>
  </body>
</html>`
  })
  useF(html, () => log({ html }))

  const handle = {
    save: () => download_text(html, resume_html_filename),
  }

  // const src = useM(html, () => `data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  const ref = useR() as { current:HTMLIFrameElement }
  useF(html, () => {
    // ref.current.contentDocument.write(html || '')
    // ref.current.contentDocument.close()
    ref.current.contentDocument.documentElement.innerHTML = html
  })

  useEventListener(window, 'keydown', e => {
    if (e.metaKey && e.key === 's') {
      e.preventDefault()
      handle.save()
    }
  })

  const jump_back = useR('#resume-definition')
  // const jump = 
  // (back) => <InfoSelect label='jump to' value={undefined} options={list('top view')} setter={x => {
  //   jump_back.current = location.hash
  //   location.hash = jump_back.current = back

  //   Q({
  //     'top': '#resume-definition',
  //     'view': '#resume-view',
  //   }[x])?.scrollIntoView()
  // }} />
  const jump = 
  (back) => <div className='action'>
    jump to <InfoBadges labels={list('top view').map(x => ({
      [x]: () => {
        jump_back.current = location.hash
        location.hash = jump_back.current = back
        Q({
          'top': '#resume-definition',
          'view': '#resume-view',
        }[x])?.scrollIntoView()
      }
    }))} />
  </div>
  // <InfoSelect label='jump to' value={undefined} options={list('top view')} setter={x => {
  //   jump_back.current = location.hash
  //   location.hash = jump_back.current = back

  //   Q({
  //     'top': '#resume-definition',
  //     'view': '#resume-view',
  //   }[x])?.scrollIntoView()
  // }} />
  const insert =
  (array, i, default_item, type='new') => <InfoSelect label={'new '+type} value={undefined} options={list('before after first last')} setter={x => {
    array.splice({ 'first': 0, 'before': i, 'after': i + 1, 'last': array.length }[x], 0, default_item)
    setResume(merge({}, resume))
  }} />
  const position_template =
  () => <InfoSelect value={0} options={range(3)} display={i => list('empty website linked courses')[i]} setter={x => {
    message.trigger({
      text: 'templates coming soon',
      ms: 3_000,
    })
  }} />

  useStyle(`
  html.mobile :is(textarea, input) {
    font-size: max(1em, 16px)
  }
  html.desktop .body {
    // font-size: 12px;
  }
  `)
  const [confirm, setConfirm] = useS(undefined)
  return <Style id='html-resume'>
    <InfoBody>
      <Scroller />
      <InfoSection id='resume-definition' labels={[
        'html-resume',
        { 'jump to view': () => Q('#resume-view')?.scrollIntoView() },
        { save: handle.save },
        { export: e => {
          download_text(strings.json.pretty(resume), resume_html_filename + '-resume.json', e.target, undefined, 'exported!')
        } },
        { import: e => {
          openPopup(close => {
            const HtmlResumeImport = () => {
              const [text, setText] = useS(undefined)
              const [json, setJson] = useS(undefined)
              return <Style>
              <InfoBody>
                <InfoSection style={S(`height:calc(100% - .5em)`)} labels={[
                  'import .html-resume',
                  ...(
                    text
                    ? 
                    [
                      // json && { [`import ${render.filename(json)}`]: () => setResume(json) },
                      { reset: () => {
                        setText(undefined)
                        setJson(undefined)
                      } },
                    ]
                    :
                    [
                      <InfoFile accept={['**/*.html-resume', '**/*.html-resume.json']} setValue={async file => {
                        const text = await file.text()
                        try {
                          setJson(strings.json.parse(text))
                          setText(text)
                        } catch (e) {
                          setJson(undefined)
                          setText(e.toString())
                        }
                      }} />,
                      { cancel: close },
                    ]
                  ),
                ]}>
                  {json
                  ?
                  <InfoBadges labels={[
                    { [`import ${render.filename(json)}`]: () => {
                      setResume(json)
                      close()
                    } },
                  ]} />
                  : null}
                  {text ? <CodeBlock style={S('font-size:.5em;flex-shrink:1')}>{text}</CodeBlock> : null}
                </InfoSection>
              </InfoBody>
            </Style>
            }
            return <HtmlResumeImport />
          }, `
          padding: 0;
          height: fit-content;
          `)
        } },
        // <InfoSelect label={'more'} value={undefined} options={list('load example,clear', ',')} setter={x => {
        //   ({ 
        //     'load example': async () => {
        //       const json = await fetch('/raw/html-resume/example.html.resume').then(r=>r.json())
        //       setResume(json)
        //     },
        //     clear: () => setResume(DEFAULT_RESUME),
        //   })[x]()
        // }} />,
        { 'load example': async e => {
          const json = await fetch('/resume-CyrusFreshman.html-resume.json').then(r=>r.json())
          setResume(json)
        } },
        { clear: () => setResume(DEFAULT_RESUME) },
      ]}>
        {list('name location email github').map(k => <Row><input placeholder={k} {...asInput([resume[k], v => {
          resume[k] = v
          setResume(merge({}, resume))
        }])[2]} /></Row>)}
        {/* <textarea rows={3} style={S(`min-height: unset`)} value={resume.links.join('\n')} onInput={e => {
          resume.links = e.currentTarget.value.split('\n')
          setResume(merge({}, resume))
        }}/> */}
        <Row className='partial'>
          {entries(resume.options||{}).map(([k, v]) => <InfoCheckbox label={k} value={v} setter={e => {
            resume.options[k] = !resume.options[k]
            setResume(merge({}, resume))
          }}/>)}
        </Row>
        {/* <InfoBadges labels={[
          // { 'new item': () => setResume(merge(resume, { items: [].concat([DEFAULT_RESUME_ITEM], resume.items) })) }
        ]} /> */}
        {resume.items?.map((item, item_i) => {
          const id = `item-${item_i}`
          return <>
            <Row id={id} className='item-header'>
              <InfoBadges labels={[
                // `#${item_i + 1}`,
                <InfoSelect value={item_i} options={range(resume.items.length)} display={i => `#${i+1}`} setter={i => {
                  ;[resume.items[i], resume.items[item_i]] = [resume.items[i], resume.items[item_i]].reverse()
                  setResume(merge({}, resume))
                }} />,
                !confirm && { x: () => {
                  setConfirm(item)
                } },
                item === confirm && { 'delete': () => {
                  lists.remove(resume.items, item)
                  setResume(merge({}, resume))
                } },
                item === confirm && { 'cancel': () => {
                  setConfirm(undefined)
                } },
                // { [item.hidden ? 'show' : '–']: () => {
                //   item.hidden = !item.hidden
                //   setResume(merge({}, resume))
                // } },
                { [item.simple ? 'complex' : '^']: () => {
                  item.simple = !item.simple
                  setResume(merge({}, resume))
                } },
                insert(resume.items, item_i, DEFAULT_RESUME_ITEM, 'item'),
                jump('#'+id),
                // <InfoSelect value={undefined} options={moves} />,
              ]} />
              {/* {list('entity').map(k => <input {...asInput([item[k], v => {
                item[k] = v
                setResume(merge({}, resume))
              }])[2]} />)} */}
            </Row>
            {/* <div className='row'>
              {list('detail location').map(k => <input {...asInput([item[k], v => {
                item[k] = v
                setResume(merge({}, resume))
              }])[2]} />)}
            </div> */}
            {/* {list('entity detail location').map(k => <input placeholder={k} {...asInput([item[k], v => {
                item[k] = v
                setResume(merge({}, resume))
              }])[2]} />)} */}
            <Row>
              {list('entity').map(k => <input placeholder={k} {...asInput([item[k], v => {
                item[k] = v
                setResume(merge({}, resume))
              }])[2]} />)}
            </Row>
            {/* <Row className='partial'>
              {entries({highlight:false,spaced:false,...(item.options||{})}).map(([k, v]) => <InfoCheckbox label={k} value={v} setter={value => {
                item.options = item.options||{}
                item.options[k] = value
                setResume(merge({}, resume))
              }}/>)}
            </Row> */}
            {item.simple ? null : <Row>
              {list('detail location').map(k => <input placeholder={k} {...asInput([item[k], v => {
                item[k] = v
                setResume(merge({}, resume))
              }])[2]} />)}
            </Row>}
            <Row>
              {item.simple ? null : list('rating scale').map(k => <input placeholder={k} {...asInput([item[k], v => {
                item[k] = v
                setResume(merge({}, resume))
              }])[2]} />)}
              {/* {entries({highlight:false,spaced:false,section:false,...(item.options||{})}).map(([k, v]) => <InfoCheckbox label={k} value={v} setter={value => {
                item.options = item.options||{}
                item.options[k] = value
                setResume(merge({}, resume))
              }}/>)} */}
              {entries({highlight:false,spaced:false,section:false,...(item.options||{})})
              .filter(([k,v]) => set('section spaced').has(k))
              .map(([k, v]) => <InfoCheckbox label={k} value={v} setter={value => {
                item.options = item.options||{}
                item.options[k] = value
                setResume(merge({}, resume))
              }}/>)}
            </Row>
            <Column>
              {/* <InfoBadges labels={[
                { 'new detail': () => {
                  item.positions = [].concat([DEFAULT_RESUME_POSITION], item.positions)
                  setResume(merge({}, resume))
                } }
              ]} /> */}
              {item.positions.map((position, position_i) => {
                const position_id = `item-${item_i}-position-${position_i}`
                return <>
                  <Row className='row' id={position_id}>
                    <InfoBadges labels={[
                      // `#${item_i + 1}`,
                      <InfoSelect value={position_i} options={range(item.positions.length)} display={i => `${item_i+1}-${i+1}`} setter={i => {
                        ;[item.positions[i], item.positions[position_i]] = [item.positions[i], item.positions[position_i]].reverse()
                        setResume(merge({}, resume))
                      }} />,
                      { x: () => {
                        lists.remove(item.positions, position)
                        setResume(merge({}, resume))
                      } },
                      { hide: () => {
                        position.hidden = true
                        setResume(merge({}, resume))
                      }},
                      insert(item.positions, position_i, DEFAULT_RESUME_POSITION, 'role'), position_template(),
                      jump('#'+position_id),
                      // <InfoSelect value={undefined} options={moves} />,
                    ]} />
                    {/* {list('title time').map(k => <input {...asInput([position[k], v => {
                      position[k] = v
                      setResume(merge({}, resume))
                    }])[2]} />)} */}
                  </Row>
                  {list('title').map(k => <input {...asInput([position[k], v => {
                      position[k] = v
                      setResume(merge({}, resume))
                    }])[2]} />)}
                  {list('time').map(k => <input {...asInput([position[k], v => {
                      position[k] = v
                      setResume(merge({}, resume))
                    }])[2]} />)}
                  {position.description.map((x, description_i) => <textarea {...asInput([x, v => {
                    position.description[description_i] = v
                    setResume(merge({}, resume))
                  }])[2]}/>)}
                </>
              })}
            </Column>
          </>
        })}
      </InfoSection>
      <InfoSection id='resume-view' labels={[
        'html-resume',
        { 'jump back': () => Q(jump_back.current).scrollIntoView() },
        // { download: ()=>{} },
        {
          copy: e => {
            copy(html, e.currentTarget, undefined, 'copied!')
          },
          label: !html,
        },
        {
          save: handle.save,
          label: !html,
        },
        { reset: () => setResume(DEFAULT_RESUME) },
      ]}>
        {/* <Dangerous html={`<iframe height=760 width=550 src=${src}></iframe>`} /> */}
        <Row style={resume.options['legal size'] ? S(`opacity:.5;pointer-events:none`) : null}>
          {list('height width').map(k => <input placeholder={k} {...asInput([resume[k], v => {
            resume[k] = v
            setResume(merge({}, resume))
          }])[2]} />).map((x,i) => i ? <>×{x}</> : x)}
        </Row>
        <iframe ref={ref} />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
&#html-resume {
  .body {
    display: flex;
    flex-direction: column;
    gap: .67em;
  }
  .row, .column {
    width: -webkit-fill-available;
    gap: 2px;
  }
  .row {
    flex-wrap: nowrap;
    overflow: auto;
    > input {
      flex-shrink: 0;
    }
    > input {
      flex-grow: 1;
      width: unset !important;
    }
    &.item-header {
      margin-top: .67em;
    }
  }
  .column {
    margin-left: 1em;
  }
  textarea {
    background: var(--id-color-text); color: var(--id-color-text-readable);
    border: 0; border-radius: 0;
    resize: none;
    font-size: calc(1em * (10 / 14));
    min-height: 12em;
  }
  .row:not(.partial) > * {
    flex: 1 1;
    align-self: stretch;
    min-width: 4em;
    &:is(input, .action) {
      border: none !important;
      padding: 1.5px 4px;
    }
  }
  *:not(.badges) > :is(textarea, input, select, label, .button, .action, .label) {
    // border-radius: .75em !important;
    // padding: 0 .25em !important;
  }
  iframe {
    min-height: 100vh !important;
  }
  .badges {
    align-items: stretch;
    font-size: .8em;
    > * {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 2em;
    }
    > .action > .badges {
      filter: invert(1);
    }
  }
}
`