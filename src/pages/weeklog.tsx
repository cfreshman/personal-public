import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useS, useStyle } from 'src/lib/hooks'
import api from 'src/lib/api'
import { convertLinks } from 'src/lib/render'

const { named_log } = window as any
const log = named_log('template')

export default () => {
  usePageSettings({
    background: '#eee',
  })
  useStyle(`
  #inner-index#inner-index#inner-index {
    // border: 1px solid #fff !important;
  }
  `)
  return <Style>
    <InfoBody>
      <InfoSection labels={[]}>{convertLinks(`weeks starting Monday - send feedback! /feedback`, { new_tab:true })}</InfoSection>
      <InfoSection id='2024-06-10' labels={['2024-06-10']}>{convertLinks(`
      DOING
      - site-wide left dropdown - new item to open other page in curr category (e.g. another game)
      - /chat - parse 'watchlist' 'dolist' etc to get compiled list, formalize /selfchat
      - /plat - message people based on license plate
      - /slash - open-source base framework for website
      - /fours - score tracker for matches of sets of games to 4 win by 2 (e.g. tennis)
      - /scorekeeper - track records against others
      - /bento - view multiple apps at once
      - /new - list of new apps on freshman.dev (similar to this but just releases)
      - /inventory “here have a beer (take beer)”
      `, { new_tab:true })}</InfoSection>
      <InfoSection id='2024-06-03' labels={['2024-06-03']}>{convertLinks(`
      (no logs)
      `, { new_tab:true })}</InfoSection>
      <InfoSection id='2024-05-27' labels={['2024-05-27']}>{convertLinks(`
      DOING
      - site-wide left dropdown - new item to open other page in curr category (e.g. another game)
      - /chat - parse 'watchlist' 'dolist' etc to get compiled list
      MAYBE
      - /twitter - freshman.dev version of twitter (X/Threads clone)
      - /dating - TBA, may involve /twitter
      DONE
      - /weeklog - this
      - /donoboard - added chart
      - /greeter LLM hangout suggestions!
      `, { new_tab:true })}</InfoSection>
      <InfoSection id='2024-05-20' labels={['2024-05-20']}>{convertLinks(`
      - /optimal-maps - country’s best angle to fit on screen or print out
      - /donoboard - sponsors leaderboard w 6000 $1 slots
      - /linktree - like linktr.ee, list of links to other things
      - /link-timer - open a link later (set 1h timer)
      - placeholder /proses - poetry dating app? saw post on Threads asking for it and said i’d make it. i think i’ll combine with /twitter (/proses will be the same thing but diff background color and requirement that all posts are poetry) (could be good to set up common code b/n /twitter /proses /<whatever> where user accounts are shared but only that platform’s media focus is visible
      - fixed /fishbowl - /fishbowl-landing bowl.fish
      - /bestlist - nice little file of best things. save & edit
      `, { new_tab:true })}</InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
font-size: .8em;
font-weight: bold;
.body {
  .section {
    display: block !important;
    white-space: pre-line;

    .badges {
      font-size: 1.5em !important;
    }
  }
}
`