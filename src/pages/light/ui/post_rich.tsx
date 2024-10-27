import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from 'src/components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useE, useF, useM, useR, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import url from 'src/lib/url'
import { RawWebsiteIcon, use_is_website, WebsiteTitle } from 'src/components/website_title'
import { S } from 'src/lib/util'
import { Post } from './post'

const { named_log, QQ } = window as any
const NAME = 'light post image'
const log = named_log(NAME)

export const PostRich = ({ href, handle, large=false, level=1, no_new=false, userpage=false }) => {
  const full_href = (`https://`+href.replace(/^\//, location.origin+'/')).replace('https://http', 'http')
  const site_href = full_href.replace(location.origin, '').replace(location.host, '')

  const mode = useM(site_href, () => {
    if (/^\/light\/post\/[^/]+$/.test(site_href)) {
      return 'post'
    } else if (/(\.(jpg|jpeg|png|gif))|gstatic.com\/images|pbs.twimg.com\/media/.test(site_href)) {
      return 'image'
    } else if (/(\.(mp3|wav))/.test(site_href)) {
      return 'audio'
    } else if (/(\.(mp4))/.test(site_href)) {
      return 'video'
    }
    return undefined
  })

  const ref = useR()
  useE(full_href, () => {
    if (window['hydrate'] && ref.current) {
      const { hydrate, hydrates } = window as any
      const parent = ref.current.parentNode
      hydrate(QQ(parent, 'audio'), hydrates.audio)
      return () => QQ(parent, '.audio_visual').map(l => l.remove())
    }
  })

  const is_website = use_is_website({ href:full_href })

  return !href ? null : <div ref={ref} className='light-post-rich' style={S(`
  display: flex;
  `)}>
    {mode === 'post' ? <Post {...{ id:href.replace('/light/post/', ''), handle, userpage, no_new, level: level + 1 }} />
    : mode === 'image' ? <img src={full_href} style={S(`width:100%; max-height:30em; object-fit:contain; background: var(--id-color-label); ${large?'':'aspect-ratio: 2/1;'}`)} />
    : mode === 'audio' ? <div className='middle-row wide'>
      {/* <audio src={full_href} controls style={S(`border-radius:10em; border: 1px solid currentcolor`)} /> */}
      <audio src={full_href} controls />
    </div>
    : mode === 'video' ? <video src={full_href} controls playsInline style={S(`width:100%; max-height:30em; object-fit:contain; background: var(--id-color-label); ${large?'':'aspect-ratio: 2/1;'}`)} />
    : is_website ? <div className='middle-row wide' style={S(`
    background: var(--id-color-label);
    `)}>
      <div style={S(`
      width: 100%;
      position: relative;
      max-width: min(15em, 50%);
      overflow: hidden;
      `)}>
        <RawWebsiteIcon href={href} style={S(`
        width: 100%;
        height: auto;
        object-fit: cover;
        ${large ? `` : `
        // aspect-ratio: 2/1;
        `}
        `)} fallback={'/raw/images/internet-icon-solarized.png'} />
        <div className='light-post-rich-title'><WebsiteTitle href={href} /></div>
      </div>
    </div>
    : null}
  </div>
}
