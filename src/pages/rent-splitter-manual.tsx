import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S } from 'src/lib/util'

const { named_log } = window as any
const NAME = 'rent-splitter'
const log = named_log(NAME)

export default () => {
  usePageSettings({
    expand: true,
  })
  return <Style>
    <InfoBody>
      <InfoSection labels={[NAME]}>
        <div className='bordered-paragraph'>
          <div>
            renting with roommates and need to assign rooms? use this!
          </div>
          <HalfLine />
          <div>
            rooms will rent based on how desired they are, so everyone is happy - you get a nicer room or cheaper rent
          </div>
          <HalfLine />
          {/* <div>
            <b>INTERACTIVE VERSION COMING SOON (maybe)</b>
          </div>
          <HalfLine /> */}
          <div>
            interactive version here: <A href='/rent-splitter' />
          </div>
        </div>
      </InfoSection>
      <InfoSection labels={['how to run with pen & paper']}>
        <ol className='rule-list'>
          <li>
            calculate the average rent, rounded to 10
          </li>
          <li>
            on a piece of lined paper, write the avg rent on the line halfway down the page
          </li>
          <li>
            write $10 increments/decrements on lines before and after. for example, if avg rent is $650, write 500, 510, ... 790, 800
          </li>
          <li>
            label the rooms A, B, C, etc. create a marker for each room letter, such as a small square of paper. place these spaced out on the avg rent line
          </li>
          <li>
            now the game begins! each player needs a piece of paper
          </li>
          <li>
            REPEAT UNTIL EVERY PLAYER MARKER IS ON A DIFFERENT ROOM:
            <ol className='rule-list'>
              <li>
                players write their preferred room letter on their paper
              </li>
              <li>
                when everyone is ready, reveal papers. move each marker up by <b># players who chose it - 1</b>. so for 1 player, no move. 3, up 2. 0, down 1
              </li>
              <li>
                the rooms now have new rents and player's preferences may change. if the game stalls at the end, stop and rock-paper-scissors to break the remaining conflicts
              </li>
            </ol>
          </li>
          <li>
            adjust rents by amount rounded in step 1 so actual total is reached
          </li>
        </ol>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.bordered-paragraph {
  width: 100%;
  padding: .25em;
  border-radius: .25em;
  border: 1px solid currentcolor;
}
.rule-list {
  li {
    margin-bottom: .25em;
  }
}
`