import html2canvas from "html2canvas";
import { trigger } from "./trigger";
import { Q, defer, getCssVar, list, range, server, set } from "./util";
import { readable_text, with_opacity } from "./color";
import url from "./url";
import { parsePage } from "./page";
import api, { auth } from "./api";
import { setBackground, setTextColor } from "./hooks_ext";
import { draw } from "./draw";
import { none, pass } from "./types";
import { socket } from "./socket";

const { named_log } = window as any
const log = named_log('meta')

// https://github.com/microsoft/TypeScript/pull/40336
type Digit=0|1|2|3|4|5|6|7|8|9
type Join<T extends unknown[], D extends string> =
  T extends [] ? '' :
  T extends [string | number | boolean | bigint] ? `${T[0]}` :
  T extends [string | number | boolean | bigint, ...infer U] ? `${T[0]}${D}${Join<U, D>}` :
  string;
type Repeat<T> = Join<T[],''>
type Prefix<S extends string, T> = Join<['x',T],''>

type Icon = string|{[xDIM:Prefix<'x',Repeat<Digit>>]:(ctx:CanvasRenderingContext2D,canvas:HTMLCanvasElement)=>void}

export const defaultIcon = '/icon.png' // '#333'
const icon = Object.assign(trigger.value<Icon>(document.querySelector('head [rel=icon]')['href']), {
  draw: html => {
    html2canvas(html).then(canvas => icon.set(canvas.toDataURL()))
  },
  render: value => {
    if (value === location.origin + '/icon.png') value = window['icon'] ? window['icon']() : defaultIcon
    if (typeof value === 'string') {
      const color = /#.{3,8}/.exec(value)
      if (color) {
        // render circle icon for color
        const canvas = document.createElement('canvas')
        const SIZE = 256
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = color[0]
        ctx.beginPath()
        ctx.arc(SIZE/2, SIZE/2, SIZE/2 * 11.5/14, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
        return canvas.toDataURL()
      } else {
        if (!value.includes(':')) value = location.origin + '/' + value.replace(location.origin + '/', '')
        document.querySelector('head [rel=icon]')['href'] = value
        document.querySelector('head [rel=apple-touch-icon-precomposed]')['href'] = value
      }
    } else {
      // idk. draw 256x256 icon
      const SIZE = Math.max(...Object.keys(value).map(x => Number(x.slice(1))))
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = SIZE
      canvas.style.imageRendering = 'pixelated'
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = ctx.strokeStyle = '#000'
      value['x'+SIZE](ctx, canvas)
      console.debug('icon render', {canvas})
      return canvas.toDataURL()
    }

    return (value.includes('http')) ? value.replace(/(^|[^:])\/+/g, '$1/') : value
  },
})
let rendered = false
icon.add((value, oldValue) => {
  console.debug('SET ICON', value)
  // document.querySelector('head [rel=icon]')['href'] = value
  // const result = icon.render(value)
  // if (result !== value) setTimeout(() => icon.set(result))
  try {
    const result = icon.render(value)
    if (result !== icon.value) defer(() => {
      icon.set(result)
      rendered = true
    })
    else rendered = false
  } catch {}
}, true)

const title = trigger.value(document.title)
title.add(value => document.title = value)

const descriptionL = document.querySelector('head [name=description]') as HTMLMetaElement
const description = trigger.value(descriptionL.content)
description.add(value => descriptionL.content = value)

const default_theme_color = '#eeebe6'
const theme_color_l = Q('[name=theme_color]') as HTMLMetaElement
const theme_color = trigger.value(default_theme_color)
// theme_color.add(value => document.documentElement.style.background = value)
theme_color.add(value => [
  setBackground(value),
  setTextColor(readable_text(value)),
  (prev_theme_color => {
    theme_color_l.content = value
    return () => theme_color_l.content = prev_theme_color
  })(theme_color_l.content),
])

// see https://medium.com/@alshakero/how-to-setup-your-web-app-manifest-dynamically-using-javascript-f7fbee899a61
// replaced by manifest in copyright.js
const manifest = trigger.value<{
  name?, display?, start_url?, theme_color?, icons?: { src, sizes?, type?}[], description?, rendered?
}>({
  name: location.hostname,
  display: `standalone`,
  start_url: `${window.origin}`,
  // theme_color: theme_color.get(),
  theme_color: '#000',
  icons: [{
    src: `${window.origin}/icon.png`,
    sizes: `384x384`,
    type: `image/png`,
  }]
})
manifest.add(value => {
  const replace_manifest = (def={}) => 
    (x => { document.head.append(x); return x })
    (
      (x => Object.assign(x, { rel: 'manifest' }, def))
      (Q('head [rel=manifest]') || document.createElement('link'))
    )
  replace_manifest({
    href: URL.createObjectURL(new Blob([JSON.stringify(value)], { type: 'application/json' })),
  })

  // const element: HTMLLinkElement = document.querySelector('head [rel=manifest]')
  // const manifest_str = JSON.stringify(value)
  // const manifest_blob = new Blob([manifest_str], { type: 'application/json' })
  // const manifest_url = URL.createObjectURL(manifest_blob)
  // log('manifest', { manifest_url, manifest_blob, manifest_str, value })
  // element.href = manifest_url
  // element.dataset['keep'] = (!value.icons||value.icons[0].src !== defaultIcon) ? '' : undefined

  // console.debug('MANIFEST', value)

  // if (value.rendered) {
  //   delete element.dataset['keep']
  // } else {
  //   element.dataset['keep'] = 'true'
  // }
  // element.dataset['keep'] = 'true'
}, true)

// manifest updates
{
  const _preserve_page_icon = set('wordbase')
  const rerenderManifestIcon = async (value=icon.value, force=false) => {
    if (_preserve_page_icon.has(parsePage())) return
    await defer(none, 500)
    // return
    let rendered_manifest = manifest.get().rendered
    const manifest_src = (
      !value || force
      || value === defaultIcon 
      || value === location.origin+defaultIcon 
      || value === server+defaultIcon
      ) && title.get() !== '/home' ? icon.render({
      x256: (ctx:CanvasRenderingContext2D) => {
        rendered_manifest = true

        const [background, color] = 
        // list('var(--id-color-text) var(--id-color-text-readable)')
        list(`var(--id-color-text) var(--id-color-text-readable)`)
        .map((x,i,a) => {
          const y = getCssVar(x, 'color')
          // return ([
          //   'transparent',
          //   '#0000',
          //   '#fff0',
          // ].includes(y)) ? readable_text(getCssVar(a[(i+a.length-1)%a.length], 'color')) : y
          return y
        })

        console.debug('manifest icon colors', {color,background})

        ctx.fillStyle = background
        ctx.fillRect(0, 0, 256, 256)
        ctx.fillStyle = color
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.font = '32px monospace'
        ctx.fillText(`${(x=>!x||x==='home'?undefined:'/'+x)(parsePage()) || location.host}`, 0, 32, 256)

        ctx.fillStyle = with_opacity(color, .2)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'bottom'
        ctx.font = '16px monospace'
        ctx.fillText(location.host, 0, 32, 256)
      },
    }) : value

    const tab_icon = document.querySelector('head [rel=icon]')['href'] = rendered_manifest&&0 ? icon.render({
      x256: (ctx:CanvasRenderingContext2D) => {
        ctx.fillStyle = getCssVar('var(--id-color)', 'color')
        ctx.beginPath()
        ctx.arc(256/2, 256/2, 256/2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()

        // ctx.fillStyle = getCssVar('var(--id-color-text)', 'color')
        // ctx.textAlign = 'center'
        // ctx.textBaseline = 'top'
        // ctx.font = '32px monospace'
        // ctx.fillText(`${(x=>!x||x==='home'?undefined:'/'+x)(parsePage()) || location.host}`, 128, 128, 256)
      },
    }) : manifest_src

    // const icon_src = value
    const icon_src = !rendered ? icon.value : rendered_manifest ? icon.render({
        x256: (ctx:CanvasRenderingContext2D) => {
          let background = getCssVar('var(--id-color-text)', 'color')
          let color = getCssVar('var(--id-color-text-readable)', 'color')
          if ([
            'transparent',
            '#0000',
            '#fff0',
          ].includes(background)) background = readable_text(color)
  
          console.debug('manifest icon colors', {color,background})
  
          ctx.fillStyle = background
          ctx.beginPath()
          ctx.arc(256/2, 256/2, 256/2, 0, Math.PI * 2)
          ctx.closePath()
          ctx.fill()
        },
      }) : manifest_src
    // const icon_src = (
    //   !value 
    //   || value === defaultIcon 
    //   || value === location.origin+defaultIcon 
    //   || value === server+defaultIcon
    //   ) && title.get() !== '/home' ? document.querySelector('head [rel=icon]')['href'] : value
    console.trace('icon set', {value, manifest_src, defaultIcon, color:getCssVar('var(--id-color-text)', 'color')})
    manifest.set({ ...manifest.get(), rendered, /* theme_color: theme_color.value, */ icons: [{
      src: manifest_src, //tab_icon, // manifest_src,
      sizes: `256x256`,
      type: `image/png`,
    }] })
    // document.querySelector('head [rel=icon]')['href'] = manifest_src
    // icon.set(icon_src)
    // defer(() => meta.icon.set(manifest_src))
    
    if (rendered && (
      !icon.value || force
      || icon.value === defaultIcon 
      || icon.value === location.origin+defaultIcon 
      || icon.value === server+defaultIcon
      )) icon.set(manifest_src)
  }
  icon.add((value) => rerenderManifestIcon(value), true)
  title.add(value => {
    manifest.set({ ...manifest.get(), name: value==='/home'?location.host:value })
    rerenderManifestIcon()
  }, true)
  description.add(value => manifest.set({ ...manifest.get(), description:value }))
  theme_color.add(value => {
    manifest.set({ ...manifest.get(), /* theme_color:value */ })
    defer(() => rerenderManifestIcon())
  }, true)
  
  // url.add(() => defer(() => rerenderManifestIcon(), 100), true)
  let prev_page
  url.add(() => {
    // if (prev_page !== parsePage()) {
      defer(() => {
        prev_page = parsePage()
        // manifest.set({ ...mxanifest.get(), name: prev_page==='/home'?location.host:prev_page, rendered:false })
        console.debug('prev_page', prev_page)
        manifest.set({ ...manifest.get(),
          name: set('home download').has(prev_page)?location.host:prev_page,
          start_url: set('home download').has(prev_page)?location.origin: location.origin + location.pathname.replace(/^\/-?/, '/-'),
        })
        // meta.icon.set(defaultIcon)
        // rerenderManifestIcon(undefined, true)
        // defer(() => {
        //   // setBackground(theme_color.value)
        //   // setTextColor(readable_text(theme_color.value))
        // })
      })
    // }
  }, true)

  // let prev_page = parsePage()
  // // const renderApp = () => {
  // //   title.set('/' + (prev_page = parsePage()))
  // //   manifest.set({ ...manifest.get(), icons: [{
  // //     src: icon.render({
  // //       x256: (ctx:CanvasRenderingContext2D, canvas) => {
  // //         draw(ctx)
  // //         .fill(theme_color.value)
  // //         .square({ x: 128, y: 128, s: 128 })
  // //       }
  // //     }),
  // //     sizes: `256x256`,
  // //     type: `image/png`,
  // //   }] })
  // // }
  // url.add(() => {
  //   // renderApp()

  //   if (prev_page !== parsePage()) {
  //     prev_page = parsePage()
  //     // manifest.set({ ...manifest.get(), name: prev_page==='/home'?location.host:prev_page, rendered:false })
  //     // defer(() => rerenderManifestIcon())
  //     // meta.icon.set(defaultIcon)
  //     defer(() => {
  //       setBackground(theme_color.value)
  //       setTextColor(readable_text(theme_color.value))
  //     })
  //   }
  // }, true)
  // // title.add(renderApp, true)
  // // theme_color.add(renderApp, true)
}


// for display of external libraries used. dependencies are implicitly included (TODO show dependency tree? by parsing node_modules?)
const global_uses = { // [name, link, a public code repo if one exists]
  'create-react-app': ['create-react-app.dev', 'https://github.com/facebook/create-react-app'],
  'Socket.IO': 'https://socket.io/',
  'MongoDB': 'https://www.mongodb.com/',
}
const common_uses = {
  'Three.js': 'https://threejs.org/',
  'OpenLayers.js': 'https://openlayers.org/',
  'noise': 'https://github.com/mrowdy/noise_algorithms',
  'scrabble': {'Scrabble TWL06 dictionary': 'https://www.wordgamedictionary.com/twl06/download/twl06.txt'},
  'Chart.js': 'https://www.chartjs.org/',
}
Object.keys(common_uses).map(k => (ref => common_uses[k.toLowerCase()] = typeof(ref)==='string' ? [k, ref] : ref)(common_uses[k]))
console.debug({global_uses,common_uses})

const uses = trigger.value<{ [key:string]:boolean|string|(string[]) }>({})
uses.add(x => {
  const original = Object.assign({}, x)
  Object.assign(
    x,
    Object.fromEntries(Object.entries(global_uses).filter(([k, v]) => (x[k]??x[k.toLowerCase()]) !== false)),
    ...Object.keys(x).map(k => 
      (ref => {
        !x[k]
        ? {} :
        ref
        ? typeof(ref) === 'string' ? { [k]:ref } : ref :
        {}
      })(common_uses[k])
    ),
  )
  Object.keys(original).map(k => {
    if (!original[k]) delete x[k]
    if (x[k] === true) {
      const key = common_uses[k] ? k : common_uses[k.toLowerCase()] ? k.toLowerCase() : undefined
      const ref = common_uses[key]
      delete x[k]
      if (ref) {
        if (typeof(ref) === 'string') {
          x[key] = ref
        } else {
          x[ref[0]] = ref[1]
        }
      }
    }
    if (!x[k]) delete x[k]
  })
  console.debug('uses', {original,x})
}, true)

const embedded = trigger.value(null)


{/* <meta name="viewport" content="width=device-width,initial-scale=1" /> */}
const viewportL = Q('meta[name=viewport]') as HTMLMetaElement
const viewport = trigger.value(viewportL.content)
viewport.add(x => viewportL.content = x)
viewport.set("width=device-width,initial-scale=1")

let prev_id_color
const refresh_theme_color = () => {
  api
  .get('user_id_color')
  .then(id_color => {
    if ([default_theme_color, prev_id_color].includes(meta.theme_color.get())) {
      meta.theme_color.set(id_color)
      prev_id_color = id_color
    }
  })
}
auth.add(() => refresh_theme_color())
socket.add(instance => instance?.on('user:profile', refresh_theme_color))
url.add(() => refresh_theme_color())
refresh_theme_color()



const install = trigger.value(undefined)
!window.navigator?.standalone && addEventListener('beforeinstallprompt', (e:any) => {
  e.preventDefault()
  install.set(e)
})


export const meta = {
  icon,
  manifest,
  title,
  description,
  theme_color,
  uses,
  viewport,
  embedded,
  install,
}