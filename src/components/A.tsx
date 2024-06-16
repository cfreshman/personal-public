import React from 'react'
import { useM } from '../lib/hooks'
import { truthy } from '../lib/types'
import url from '../lib/url'
import { openFrame } from './Modal'
import { S } from 'src/lib/util'


export const A = ({ href=undefined, func=undefined, frame=undefined, tab=undefined, close=undefined, bold=false, ...props }) => {
  href = href || (typeof(tab) === 'string' ? tab : undefined)
  href = useM(href, () => href.replace(/^(https?:\/\/)+/, 'http://'))
  if (!func) func = tab ? url.new : (href) => {
    const local_href = href.replace(location.origin, '')
    if (location.pathname === local_href) location.reload()
    else url.push(local_href)
  }

  // defined frame options for certain internal sites
  useM(frame, () => {
    if (typeof(frame) === 'boolean') {
      frame = {
        'coffee': {
          href: href.replace('coffee', '-coffee'),
          // options: { scale: .9, height: '700px', width: '520px' } // width: '372px'
          options: { scale: .9, height: '586px', width: '327px' } // width: '372px'
        }
      }[href.split('/').filter(truthy)[0]] || frame
    }
  })

  return <a {...props} href={href.replace(/^(https?:\/\/)+/, 'http://')} onClickCapture={e => {
    console.debug('CLICK', href)
    ;(props.onClick || props.onClickCapture || (x=>{}))(e)
    if (!e.defaultPrevented && !e.metaKey) {
      e.stopPropagation()
      e.preventDefault()
      close && close()
      if (frame) {
        openFrame((typeof(frame) === 'boolean') ? {
          href,
          options: { force: true },
        } : {
          href,
          ...frame,
          options: { force: true, ...(frame.options || {}) }
        })
      } 
      else if (href[0] === '/' || new URL(href).origin === location.origin) setTimeout(() => func(href))
      else if (href[0] === '#') location.hash = href
      else url.new(href)
    }
  }} style={{ ...S(`
  ${bold ? `font-weight: bold` : ''}
  `), ...(props.style||{}) }}>{props.children || href.replace(/^(https?:\/\/)+/, '')}</a>
}
