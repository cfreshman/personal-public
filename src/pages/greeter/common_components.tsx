import React from 'react'
import { ColorPicker, HalfLine, InfoBadges, InfoSection } from 'src/components/Info'
import GreeterLink from './GreeterLink'
import url from 'src/lib/url'
import { preventDefault } from 'ol/events/Event'
import { open_popup } from 'src/components/Modal'
import { useCached, useF, useM, useR, useS, useStyle } from 'src/lib/hooks'
import { S } from 'src/lib/util'
import { useCachedScript } from 'src/lib/hooks_ext'
const { named_log, list, strings, datetime, truthy, Q, QQ, node, entries, lists, merge, values, keys, qr, copy, colors, canvases } = window as any
const log = named_log('greeter common_components')


export const MODALS = {
  ICON_CREATE: 'icon-create',
}

export const IconCreate = ({ close, set_icon }) => {
  useCachedScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js')
  
  const [emoji, set_emoji] = useS('🏞️')
  const [color, set_color] = useS('#000000')
  const text_color = useM(color, () => colors.readable(color))
  
  const ref = useR()

  useStyle(`
  #icon-create {
    background: ${color} !important;
    color: ${text_color};
    font-size: 1px;
    height: 128px;
    width: 128px;
    display: flex; align-items: center; justify-content: center;
    text-align: center;
  }
  .info a:is(.button,.action) {
    color: var(--id-color-text-readable) !important;
  }
  `)

  const split_emoji = (str) => [...new Intl.Segmenter().segment(str)].map(x => x.segment)

  const n_emojis = useM(emoji, () => split_emoji(emoji).length)

  return <>
    <InfoSection labels={['create emoji icon']} className='column gap' style={S('height:100%; margin:0')}>
      <div className='row wide gap' style={S(`
      background: #fff;
      border-radius: .25em;
      padding: .25em;
      `)}>
        <div ref={ref}  id='icon-create'><span className='row wrap' style={S(`
        line-height: 1;
        font-size:calc((64em + 128em) / 2 / ${Math.ceil(Math.pow(n_emojis, .5))});
        display: flex; align-items: center; justify-content: center;
        gap: 2px;
        `)}>{split_emoji(emoji).map(x => <span>{x}</span>)}</span></div>
      </div>
      <HalfLine />
      <div className='middle-column gap wide'>
        <div>inputs:</div>
        <input type='text' value={emoji} onChange={e => set_emoji(split_emoji(e.target.value).slice(0, 4).join(''))}
        style={S(`font-size: 1.5em; width: 5em; text-align: center`)} />
        <ColorPicker value={color} setValue={set_color}  style={S(`font-size: 1.5em`)} />
      </div>
      <HalfLine />
      <div className='spacer' />
      <div className='row wide between'>
        {[
          { cancel: close },
          { save: () => {
            const { html2canvas } = window as any
            html2canvas(ref.current).then(canvas => {
              const scaled_canvas = node('canvas')
              scaled_canvas.width = scaled_canvas.height = 128
              const ctx = scaled_canvas.getContext('2d')
              ctx.imageSmoothingEnabled = false
              ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, scaled_canvas.width, scaled_canvas.height)
              set_icon(scaled_canvas.toDataURL())
              close()
            })
          } },
        ].map(x => <InfoBadges labels={[x]} />)}
      </div>
    </InfoSection>
  </>
}

export const NoteInput = ({ value, setter }) => {
  return <textarea placeholder='notes' rows={5} value={value} onKeyDown={e => {
    // theres a textarea bug which requires us to set the textContent manually
    // in order to have the right value in onChange - because value disappears on first backspace
    // after each enter keypress
    const l = e.target as HTMLTextAreaElement
    if (e.key === 'Backspace') {
      const [start, end] = [l.selectionStart, l.selectionEnd]
      const new_start = Math.max(0, start - 1)
      l.textContent = l.value.slice(0, new_start) + l.value.slice(end)
    }
  }} onChange={e => {
    const l = e.target as HTMLTextAreaElement
    setter(l.value || l.textContent)
  }} autoCapitalize='off'></textarea>
}

export const upload_icon_fill = ({ edit_data_view, set_edit_data, set_modal }) => {
  return [
    { 'upload icon': () => {
      log('upload icon')
      const node_file = node('<input type="file" accept="image/*" />')
      document.body.append(node_file)
      node_file.onblur = e => {
        node_file.remove()
      }
      node_file.onclick = e => {
        log('file input clicked')
        node_file.value = null
      }
      // for some reason, iOS safari requires addEventListener instead of onchange
      // https://stackoverflow.com/a/47665517
      node_file.addEventListener('change', e => {
        const file = node_file.files[0]
        log('uploaded icon', e, file)
        const img = node(`<img />`)
        img.onload = () => {
          const canvas = node('<canvas />')
          const IMG_SIZE = 128
          canvas.height = canvas.width = IMG_SIZE
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height)
          log('resized icon', canvas.toDataURL())
          set_edit_data({
            ...edit_data_view,
            icon: canvas.toDataURL(),
          })
        }
        img.src = URL.createObjectURL(file)
      })
      node_file.click()
    } },
    { 'create icon': () => {
      set_modal(MODALS.ICON_CREATE)
    } },
    edit_data_view.icon && { 'remove icon': () => {
      set_edit_data({
        ...edit_data_view,
        icon: false,
      })
    } }
  ]
}

export const LinkSection = ({ authorized, edit, links }) => {
  return <>
    {authorized && !edit && links?.length ? <>
      <InfoSection labels={['links']}>
        {links?.map(link => <GreeterLink href={link} />)}
      </InfoSection>
    </> : null}
  </>
}

export const PrintCertificateSection = ({ edit, member, meet, hangout }: { edit, member, meet?, hangout? }) => {
  // TODO rename bc greeter-ai is here too
  if (!meet == !hangout) throw 'either meet or hangout is required'
  const url_suffix = meet ? `/raw/greeter/display.html?meet=${meet.users.join('-')}` : `/raw/greeter/display.html?hangout=${hangout.id}`
  return <>
    {!edit && member ? <>
      <br />
      <InfoSection labels={[
        { 'print certificate': () => {
          url.new(location.origin + url_suffix)
        } },
        { 'AI suggestions': () => url.new('/greeter/ai') },
      ]} />
    </> : null}
  </>
}