import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoLabel, InfoLink, InfoLoginBlock, InfoSection, InfoStyles } from '../../components/Info'
import api from '../../lib/api'
import { useCached, useF, useStyle } from '../../lib/hooks'
import { useAuth } from '../../lib/hooks_ext'
import { meta } from '../../lib/meta'
import { truthy } from '../../lib/types'
import { theme } from './common'
import { profile } from '../../lib/user'
import url from '../../lib/url'
import { layerBackground } from '../../lib/util'
import { Scroller } from 'src/components/Scroller'

export const WordbaseStats = ({ user, open, popup, loaded: outerLoaded, others=[], setFilter }: {
  user: string | boolean, open?: any, popup?: boolean, loaded, others?: string[], setFilter?
}) => {
  const auth = useAuth()
  const history = useHistory()
  let [stats, setStats] = useState(undefined)
  const [friends, setFriends] = useState([])
  const [follows, setFollows] = useState(new Set())
  const [notified, setNotified] = useState(undefined)

  user = (user === true) ? auth.user || '' : user || stats?.user || ''
  const [displayUser, setDisplayUser] = useState(user)
  useF(user, () => setDisplayUser(user))
  open = open ?? ((_, stats) => {
    setDisplayUser(stats === true ? auth.user : stats)
  })

  const [users, setUsers] = useState([displayUser, ...others])
  useF(auth.user, displayUser, friends, () => {
    if (auth.user && friends) {
      setUsers([...new Set([auth.user, ...friends, ...users, displayUser])])
    } else {
      setUsers([])
    }
  })

  const handle = {
    loadStats: () => {
      setStats(undefined)
      if (auth.user && displayUser) {
        setNotified(undefined)
        Promise.all<any>([
          api.get(`/wordbase/stats/${displayUser}`),
          auth.user === 'cyrus' ? api.get(`/notify/sub/wordbase/${displayUser}`) : {},
          stats?.global || api.post('/i/batch/wordbase', { keys: ['active', 'total', 'words', 'letters']}),
        ]).then(([{stats}, {set}, global]) => {
          stats.user = displayUser
          stats.global = global
          setStats(stats)
          setNotified(set)
        }).catch(() => {
          open(false, true)
          setNotified(false)
        }).finally(outerLoaded)
      } else {
        if (stats?.global) {
          setStats({ global: stats.global })
        } else {
          setStats(undefined)
          api.post('/i/batch/wordbase', {
            keys: ['active', 'total', 'words', 'letters'],
          }).then(global => {
            setStats(Object.assign({}, stats, { global }))
          }).finally(outerLoaded)
        }
      }
    },
  }
  profile.use(() => {
    if (auth.user) {
      setFriends(profile.friends)
      setFollows(new Set(profile.follows))
    } else {
      setFriends([])
      setFollows(new Set())
    }
  })

  useF(auth.user, displayUser, handle.loadStats)
  const [iconHref] = meta.icon.use()
  // const users: string[] = [...new Set([auth.user, ...friends, ...extra.current])]
  // const users = [auth.user, ...friends]

  const statEntries: [string, any][] = [
    ['longest word', stats?.longestWord?.toUpperCase() || 'none'],
    ['longest game', stats?.longestGame ? `${stats?.longestGame} words` : 'none'],
    ['average word length', stats?.wordsPlayed ? `${
      (stats?.lettersPlayed / stats?.wordsPlayed).toFixed(2)
    } letters` : 'none'],
    ['words played', stats?.wordsPlayed || 0],
    ['games played', stats?.gamesPlayed || 0],
  ]

  const [cost]: any = useCached('cost/month', () => api.get('cost/month'))
  const isSupporter = cost?.supporters?.includes(user) || user === 'cyrus'

  useStyle(`
  .modal-main:has(.wordbase-stats) {
    padding: .25em;
    overflow: auto;
  }
  .modal-main:has(.wordbase-stats) :is(.content, .info, .body, .wordbase-stats) {
    overflow: visible !important;
    padding: 0;
  }
  `)
  
  return <Style className='wordbase-stats'>
    <InfoBody>
      <div className='stats-container'>
        <InfoLoginBlock inline to={'view stats\n'}>
          <InfoBadges id='stats-header' labels={[
            popup ? undefined :
            {
              text: 'CLOSE',
              func: () => open(false, false),
              style: `
              color: ${theme.tile} !important;
              background: theme.bomb;`,
            },
            // 'view',
            ...users
              .filter(truthy)
              // .filter(u => user !== u)
              .map(u => u === (stats?.user ?? displayUser)
                ? u
                : { text: u, func: () => open(false, u) })
          ]}/>
          <HalfLine/>
          <InfoSection labels={[
            stats?.friend && auth.user !== stats.user ? 'friend' : 'user',
            notified === true && auth.user === 'cyrus' ? 'notified' : '',
            isSupporter && { text: 'supporter', style: { background: 'gold' }, func: () => url.push('/coffee') },
            // (auth.user === displayUser && notified === false)
            //   ? { text: 'enable notifications', func: () => history.push('/notify')}
            //   : '',
            auth.user && stats && auth.user !== stats.user
              ? stats.friend
                ? false
                : !follows.has(stats.user)
                  ? {
                    text: 'add friend',
                    func: () => api
                    .post(`/profile/${stats.user}/follow`, {})
                    .then(x => profile.refresh())
                    .then(x => handle.loadStats())
                  }
                  : {
                    text: 'cancel request',
                    func: () => api
                    .post(`/profile/${stats.user}/unfollow`, {})
                    .then(x => profile.refresh())
                    .then(x => handle.loadStats())
                  }
              : '',
            auth.user !== stats?.user && { 'view games': () => {
              setFilter(stats.user)
              open(false, false)
            } },
            ].filter(l=>l)} style={{ position: 'relative' }}>
            {auth.user
            ? (stats?.user
              ? <InfoLink to={`/u/${stats.user}`} text={stats.user} />
              // ? <InfoLine labels={[
              //   stats && !stats.friend
              //   ? { text: 'add friend', func: () => history.push(`/u/${stats.user}`) }
              //   : '',
              // ]}>
              //   <InfoLink local={`/u/${stats.user}`} text={stats.user} />
              // </InfoLine>
              : '\xa0')
            : <InfoLoginBlock to='view stats' inline />}
          </InfoSection>
          {statEntries.map(([ label, stat ], i) =>
          <InfoSection key={i} label={label} id={label.replace(/ /g, '-')}>
            {stats?.user
            ? label === 'longest word'
              ? <span className={`stat last user-alternate-${users.indexOf(stats?.user) % 2} ${stats?.longestWord?'':'skip'}`}>{stat}</span>
              : <span className={`stat last`}>{stat}</span>
            : <span className='stat stat-empty'>&nbsp;</span>}
          </InfoSection>)}
          <br />
        </InfoLoginBlock>
        <br />
        <InfoSection label={'ALL PLAYERS'}></InfoSection>
        {[
          ['active games', stats?.global.active],
          // ['total games', stats?.global.total],
          // ['words played', stats?.global.words],
          // ['average word length', `${(stats?.global.letters / (stats?.global.words || 1)).toFixed(2)} letters`],
          ['total letters played', stats?.global.letters],
        ].filter(x=>x).map((entry, i) => <InfoSection label={entry[0]} key={i}>
          {stats ? entry[1] : ''}&nbsp;
        </InfoSection>)}
      </div>
      <div className='img-container'>
        <img src={iconHref as string} />
      </div>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
width: 100%;
min-width: 20em;
.body {
  position: relative;
  display: flex;
  flex-direction: row;
  min-width: 100%;

  > * { flex-shrink: 0 }
  .img-container {
    position: sticky;
    right: 0;
    border-radius: 0.8rem;
    background: ${theme.bomb};
    padding: .2rem;
    height: 5.6rem;
    width: 5.6rem;
    margin-left: -5.6rem;
    img {
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      z-index: 1;
    }
  }
  .stats-container {
    flex-grow: 1;
    max-width: 100%;
    #stats-header {
      max-width: calc(100% - 5.6rem - 0.25rem);
    }
    #longest-word {
      min-width: 25em;
    }
  }
}

#stats-header {
  position: relative;

  .badges {
    max-width: calc(100% - 5.6rem);
  }
}

#longest-word .stat {
  display: inline-block;
  min-height: 2.2rem;
  padding: 0 0.3rem;
  border-radius: 0.3rem;
  text-transform: uppercase;
  &:not(.stat-empty) {
    background: ${theme.blue};
    &.user-alternate-1 { background: ${theme.orange} }
  }
  &.skip {
    background: ${layerBackground(theme.bomb_5, theme.tile_9)} !important;
    color: ${theme.bomb_3} !important;
  }
  color: ${theme.bomb};
  font-size: 2rem;
  line-height: 2.2rem;
  text-shadow: none;
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
}
`