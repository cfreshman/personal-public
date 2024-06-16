import React from 'react'
import { A } from 'src/components/A'
import { WebsiteIcon, WebsiteTitle } from 'src/components/website_title'
import { S } from 'src/lib/util'

export default ({ href }) => {
  return <span className='center-row gap' style={S(`
  max-width: 100%;
  `)}>
        <A className='greeter-link' href={href}><WebsiteTitle href={href} /></A>
        <WebsiteIcon href={href} />
    </span>
}