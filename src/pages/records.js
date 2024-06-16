import React, { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { InfoBody, InfoLine, InfoLoginBlock, InfoSection, InfoStyles } from '../components/Info';
import api from '../lib/api';
import { useF } from '../lib/hooks';
import { useAuth, usePageSettings, usePathState } from '../lib/hooks_ext';

const ScoreEntry = ({entry, handle}) => {
  return (
    <InfoLine className={
      (entry.openApp ? 'record entry link' : 'record')
      + (entry.isMember ? ' member' : '')
      } onClick={entry.openApp}>
      <span className='app'>
        {entry.label}
      </span>
      {entry.isGroup ? '' : <>
        {entry.openApp ?
        <span className='user'>
          {entry.user}
        </span>
        :
        <Link className='user entry link' to={`/u/${entry.user}`}>
          {entry.user}
        </Link>
        }
        <span className='score'>
          {entry.score}
        </span>
      </>}
    </InfoLine>
    // <InfoLine label={first.user}>
    //   <div className='record'>
    //     {`${record.app}: ${first.score}`}
    //   </div>
    // </InfoLine>
  )
}
const ScoreList = ({records, app, handle}) => {
  let entries;
  if (app) {
    let record = records.find(r => r.app === app.replace(/ /g, '+'))
    entries = record?.scores.map((s, i) => ({
      label: `${i+1}${i<1?'st' :i<2?'nd' :i<3?'rd' :'th'}`,
      user: s.user,
      score: s.score
    }))
  } else {
    let counts = {}
    records.forEach(r => {
      let page = r.app.split('+')[0]
      counts[page] = (counts[page] || 0) + 1
    })
    entries = []
    let grouped = {}
    records.forEach(r => {
      let page = r.app.split('+')[0]
      let label = r.app.replace(/\+/g, ' ')
      if (counts[page] > 1) {
        label = label.replace(`${page}`, ' ').trim()
        if (!grouped[page]) {
          grouped[page] = true
          if (label) {
            entries.push({
              label: page,
              isGroup: true,
            })
          }
        }
      }
      entries.push({
        label: label || page,
        user: r.scores[0].user,
        score: r.scores[0].score,
        openApp: () => {
          handle.setApp(r.app)
          window.getSelection().removeAllRanges()
        },
        isMember: counts[page] > 1 && label,
      })
    })
    // entries = records.map(r => ({
    //   app: r.app,
    //   label: r.app.replace(/\+/g, ' '),
    //   user: r.scores[0].user,
    //   score: r.scores[0].score,
    //   openApp: () => {
    //     handle.setApp(r.app)
    //     window.getSelection().removeAllRanges()
    //   },
    // }))
  }
  return <>
    {entries
    ? entries.map((entry, i) => <ScoreEntry key={i} {...{ entry, handle }} />)
    : `no records for '${app.replace(/\+/g, ' ')}'`}
  </>
}

export default () => {
  const auth = useAuth()
  const [records, setRecords] = useState(undefined)
  const [app, setApp] = usePathState({ prefix: 'records' })

  const handle = {
    setApp,
    load: () => {
      api.get('scores/').then(data => {
        console.debug(data)
        setRecords(data)
      })
    },
  }

  useF(auth.user, handle.load)

  const appBadges = [
    app ? app.replace(/\+/g, ' ') : '',
    app ? { text: 'view all', func: () => setApp('') } : ''
  ];
  usePageSettings({
    background: '#000',
  })
  return (
  <Style>
    <InfoBody className={app ? 'app' : ''}>
      {records ? <>
        <InfoSection labels={[
          'global',
          ...appBadges
        ]}>
          <ScoreList records={records.global} {...{ app, handle }} />
        </InfoSection>
        {records.user ?
        <InfoSection labels={[
          'personal',
          ...appBadges
        ]}>
          <ScoreList records={records.user} {...{ app, handle }} />
        </InfoSection>
        :
        <InfoSection label='personal'>
          <InfoLoginBlock inline to='view personal records' />
        </InfoSection>
        }
      </>
      :
      ''}
    </InfoBody>
  </Style>
  )
}


const Style = styled(InfoStyles)`
  .body {
    background: black;
    height: 100%;
    > * {
      min-height: 42%;
    }
    *, .entry-line > *:not(.button), .entry-line .entry.link {
      color: white;
      color: #67e3ff; // blue
      color: #74f77f; // green 67ff74 99ff99
      // text-shadow: 0 0 1px #67ff74, 0 0 1px #67ff74;
      // font-weight: bold;
    }
    &.app .record *, &.app .record .entry.link {
      color: #ffffffe0;
      // color: #67e3ff; // blue 67e3ff 99d9ff
      // color: blue;
    }
    &.app .record:nth-of-type(2) * {
      color: #ffffffe0 !important;
    }
    &.app .record:nth-of-type(3) * {
      color: #ff6767; // red ff6767 ff9999
      color: #74f77f !important;
    }
    &.app .record:nth-of-type(4) * {
      color: #ffd767 !important; // yellow ffd767 fe9
    }
    &.app .record:nth-of-type(5) * {
      color: #67ceff; // blue
      // color: #74f77f; // green
      color: #ff6767 !important;
    }
    &.app .record:nth-of-type(5) ~ .record * {
      color: #4473ff !important;
    }
    // &.app .record:nth-of-type(6) * {
    //   color: #67e3ff; // blue
    // }
    // &.app .record:nth-of-type(7) * {
    //   color: #67e3ff; // blue
    // }
    .label {
      border: 2px solid white;
      opacity: .95;
      color: black;
      background: white;
    }
    .button {
      opacity: .95;
      border-color: white;
      color: white;
      align-self: center;
    }
  }
  .record {
    white-space: pre;
    // width: 100%;
    width: fit-content;
    display: flex;
    > * {
      display: inline-block;
    }
    &.member .app {
      padding-left: 1rem;
    }
    .app {
      min-width: 8rem;
    }
    .user {
      min-width: 7rem;
    }
    // .app, .user {
    //   min-width: 9rem;
    // }
    &.entry:hover * {
      text-decoration: underline;
    }
  }
`