import React from 'react'
import { InfoSection } from 'src/components/Info'
import GreeterLink from './GreeterLink'
import url from 'src/lib/url'
import { preventDefault } from 'ol/events/Event'
const { named_log, list, strings, datetime, truthy, Q, QQ, node, entries, lists, merge, values, keys, qr, copy } = window as any
const log = named_log('greeter common_components')

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

export const upload_icon_fill = ({ edit_data_view, set_edit_data }) => {
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