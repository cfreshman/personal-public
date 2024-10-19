import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from 'src/components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import url from 'src/lib/url'
import { RawWebsiteIcon, WebsiteTitle } from 'src/components/website_title'
import { S } from 'src/lib/util'

const { named_log } = window as any
const NAME = 'light post image'
const log = named_log(NAME)

export const PostRich = ({ href, single }: { href, single? }) => {
  const mode = useM(href, () => {
    if (/(\.(jpg|jpeg|png|gif))|gstatic.com\/images|pbs.twimg.com\/media/.test(href)) {
      return 'image'
    } else if (/(\.(mp3|wav))/.test(href)) {
      return 'audio'
    } else if (/(\.(mp4))/.test(href)) {
      return 'video'
    }
    return undefined
  })
  const full_href = (`https://`+href).replace('https://http', 'http')

  return !href ? null : <div className='light-post-rich' style={S(`
  ${single && !mode ? `
  max-width: max(10em, min(20em, 50%));
  ` : ''}
  `)}>
    {mode === 'image' ? <img src={full_href} style={S(`width:100%; max-height:30em; object-fit:contain; ${single?'':'aspect-ratio: 2/1;'}`)} />
    : mode === 'audio' ? <audio src={full_href} controls />
    : mode === 'video' ? <video src={full_href} controls playsInline style={S(`width:100%; max-height:30em; object-fit:contain; ${single?'':'aspect-ratio: 2/1;'}`)} />
    : <>
      <RawWebsiteIcon href={href} style={S(`
      width: 100%;
      height: auto;
      object-fit: cover;
      ${single ? `` : `
      aspect-ratio: 2/1;
      `}
      `)} />
      <div className='light-post-rich-title'><WebsiteTitle href={href} /></div>
    </>}
  </div>
}
