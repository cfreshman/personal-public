import React from 'react'
import styled from 'styled-components'
import { Countdown, InfoBody, InfoSection, InfoStyles } from '../../components/Info'
import api, { auth } from '../../lib/api'
import { openLogin } from '../../lib/auth'
import { copy } from '../../lib/copy'
import { useCached, useCachedSetter, useM } from '../../lib/hooks'
import { meta } from '../../lib/meta'
import { useSocket } from '../../lib/socket'
import { JSX } from '../../lib/types'
import { Bracket } from '../bracket'
import { theme } from './common'

export const WordbaseCompete = ({ open, popup, loaded: outerLoaded }: {
  open?: any, popup?: boolean, loaded
}) => {
  outerLoaded()
  const [{ user }] = auth.use()
  const [iconHref] = meta.icon.use()

  const competeIndex = 2
  const [compete, postCompete, reloadCompete]: any = useCachedSetter({
    name: `wordbase-compete-${competeIndex}`,
    setter: (args) => api.post(`wordbase/compete/${competeIndex}`, args),
    fetcher: () => api.post(`wordbase/compete/${competeIndex}`),
  })
  const joined = compete?.joined
  console.debug('USER JOINED', user, joined)

  const [competition, loadCompetition] = useCached<any>(`wordbase-compete-${competeIndex}-bracket`, () => api.get(`wordbase/compete/${competeIndex}/bracket`))
  const { bracket=[], games={}, settings={}, start=false, active=false, round=0 } = competition ?? {}
  useSocket({
    on: {
      'wordbase:compete': loadCompetition,
    }
  })
  console.debug(competition)
  const roundToGames = useM(games, () => {
    const value = {}
    games && Object.values<any>(games).forEach(x => {
      value[x.round] = value[x.round] ?? []
      value[x.round].push(x)
    })
    console.debug('GAMES PER ROUND', bracket[round+1], value)
    return value
  })
  const matchDurationMs = useM(bracket, games, () => {
    if (!roundToGames[round]) return 1
    return competition.gameDurationMs * (roundToGames[round].length / bracket[round+1].length)
  })

  const handle = {
    signup: () => {
      if (user) {
        !joined && postCompete({ join: true })
      } else {
        openLogin()
      }
    },
    revoke: () => {
      user && joined && postCompete({ leave: true })
    },
  }

  return <Style className='wordbase-game'>
    <InfoBody>
      {/* <h2>Competitive wordbase.app</h2> */}
      <div className='img-container' style={{ position: 'absolute', top: '2px', right: 0 }}>
        <img src={iconHref as string} />
      </div>
      {/* <InfoLoginBlock inline to={'sign up'}> */}
        <InfoSection id='stats-header' labels={[
          popup ? undefined : {
            text: 'MENU',
            func: () => open(false, false, false),
            style: { color: theme.tile, background: theme.bomb },
          }
        ]}>
          <i>Weekend Tournament #3</i>
          <p>{
`Saturday, 9am EST (December 31st)
1-2 hours
Earn a badge on your stats page for finishing 1st, 2nd or 3rd!
`}</p>
          {/* <div style={{display:'flex'}}>
            <a className='control' href='https://partiful.com/e/8Jbrwz4nx89wHOlvhCpQ' target='_blank' rel='noreferrer'>
              Add event on Partiful
            </a> */}
            {/* &nbsp;&nbsp;&nbsp;
            <div className='control' onClick={(e : any) => {
              copy('https://partiful.com/e/wzCArN3joSuxpHcW6UIp').then(x => {
                const save = e.target.textContent
                e.target.textContent = 'Copied link'
                setTimeout(x => e.target.textContent = save, 1500)
              })
            }}>
              Share
            </div> */}
          {/* </div> */}
          {active
          ? ''
          :
          <div style={{display:'flex'}}>
            <div className={`control ${joined ? 'disabled' : ''}`} onClick={handle.signup}>
              {joined ? `You're signed up` : 'Join'}
            </div>
            &nbsp;&nbsp;&nbsp;
            {joined
            ?
            <>
              <div className='control' onClick={handle.revoke}>
                Cancel
              </div>
              &nbsp;&nbsp;&nbsp;
              <div className='control' onClick={(e : any) => {
                copy(location.origin).then(x => {
                  const save = e.target.textContent
                  e.target.textContent = 'Link copied'
                  setTimeout(x => e.target.textContent = save, 1500)
                })
              }}>
                Share
              </div>
            </>
            :''}
          </div>
          }
          {joined
          ?
          <p style={{whiteSpace:'pre-wrap'}}>{
`Details:
Two 10-minute games per opponent, single-elimination
English, Default settings

Your first game will appear at the start time.
This page will update to show the tournament bracket.
Each round lasts 20 minutes, with a 5 minute break between rounds.

Ties are broken by the fewest words played to win, cummulative board position, and most letters played.
`}
          </p>
          :''}
          {active
          ?
          <InfoSection labels={['TOURNAMENT PROGRESS']}>
            {Date.now() > competition.roundStart + matchDurationMs
            ? <>
              Round #{round+1} is complete<br/>
            </>
            : <>
              Round #{round+1} ends in <Countdown timestamp={competition.roundStart + matchDurationMs} />, {bracket[round].length} players left<br/>
            </>}
            {round < bracket.length-2
            ? <>
              Next round starts in <Countdown timestamp={competition.roundStart + matchDurationMs + competition.breakDurationMs} />
            </>
            : '(Final round)'}<br/>
          </InfoSection>
          :''}
          {active
          ?
          <Bracket bracket={bracket} round={competition.round} />
          :''}
          <br /><br />
          <i>Ranked matches</i>
          <p>Coming soon</p>
        </InfoSection>
      {/* </InfoLoginBlock> */}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.body {
  position: relative;
  background: ${theme.tile};
  p {
    white-space: pre-wrap;
    font-weight: normal;
    font-family: system-ui, sans-serif;
    font-size: .9em;
  }
  i {
    // text-decoration: underline;
    font-style: normal;
    font-size: 1.1em;
  }
}
.img-container {
  position: absolute;
  top: 0; right: 0;
  margin: .8em 1em;
  border-radius: 0.8rem;
  padding: 0.2rem;
  background: ${theme.bomb};
  height: 5.6rem;
  width: 5.6rem;
  img {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    z-index: 1;
  }
}

#stats-header {
  position: relative;

  .badges {
    max-width: calc(100% - 5.6rem);
  }
}

// hacky for now, track down all UI elements we need to style
& {
  background: ${theme.tile};
  color: ${theme.bomb};
  .label {
    // opacity: 1 !important;
    background: ${theme.bomb_1} !important;
  }
  .button {
    border-color: ${theme.bomb} !important;
  }
  .action {
    background: ${theme.bomb_1} !important;
  }
  a {
    color: ${theme.bomb};
  }
}


.control {
  color: ${theme.tile};
  background: ${theme.bomb};
  text-shadow: none;
  &.inverse { color: ${theme.bomb}; background: ${theme.tile}; border: solid 2px ${theme.bomb}; }
  padding: 0 .3rem;
  min-width: 1.5rem;
  width: fit-content;
  border-radius: .3rem;
  cursor: pointer;
  user-select: none;
  display: flex; justify-content: center;
  text-decoration: none;
  height: 2.25rem;
  display: flex;
  align-items: center;
  width: fit-content;
  white-space: pre;
  margin-bottom: .75rem;
  font-size: 1.5rem;
  cursor: pointer;
  &.placeholder {
    opacity: .5;
  }
  &.disabled {
    opacity: .3;
    pointer-events: none;
    cursor: default;
  }
}
`