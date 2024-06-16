import React from 'react'
import styled from 'styled-components'
import { A, External, HalfLine, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'

const { named_log, strings, range } = window as any
const log = named_log('donoboard')

type dino = {
  name: string,
  status?: string,
  reason?: string,
}

export default () => {
  const dodos = [
    {
      name: 'dorothy',
      status: '',
      reason: '',
    },
    {
      name: 'drew',
      status: '',
      reason: '',
    },
    {
      name: 'doda',
      status: '',
      reason: '',
    },
    {
      name: 'dilbert',
      status: '',
      reason: '',
    },
    {
      name: 'dan',
      status: '',
      reason: '',
    },
    {
      name: 'dakota',
      status: '',
      reason: '',
    },
    {
      name: 'daisy',
      status: '',
      reason: '',
    },
    {
      name: 'dominic',
      status: '',
      reason: '',
    },
    {
      name: 'dingo',
      status: '',
      reason: '',
    },
    {
      name: 'delilah',
      status: '',
      reason: '',
    },
    {
      name: 'declan',
      status: '',
      reason: '',
    },
    {
      name: 'diana',
      status: '',
      reason: '',
    },
    {
      name: 'derek',
      status: '',
      reason: '',
    },
    {
      name: 'diego',
      status: '',
      reason: '',
    },
    {
      name: 'darcy',
      status: '',
      reason: '',
    },
    {
      name: 'daniel',
      status: '',
      reason: '',
    },
  ]

  const [detail, set_detail] = useS(new Set())

  const handle = {
    detail: (id) => {
      if (detail.has(id)) detail.delete(id)
      else detail.add(id)
      set_detail(new Set(detail))
    },
  }

  return <Style>
    <InfoBody>
      <InfoSection id='leaderboard-section' labels={[
        'leaderboard',
        'various dodos',
      ]}>
        <table>
          <thead>
            <tr>
              <td></td>
              <td>name</td>
              <td>status</td>
            </tr>
          </thead>
          <tbody>
          {dodos.map((entry, i) => {
            const rank = i + 1
            const show_detail = detail.has(entry.name)
            return <>
              <tr className={`entry`} onClick={e => entry.reason && handle.detail(entry.name)}>
                <td className='entry-rank'>{rank}</td>
                <td className='entry-name'>{entry.name}</td>
                <td className='entry-status'>{entry.status || 'deceased'}</td>
              </tr>
              {show_detail ? <>
              <tr></tr>
              <tr className='detail'><td colSpan={3}>
              <div className='detail-inner-container'><div className='detail-inner'>{entry.reason}</div></div>
              </td></tr>
              </> : null}
            </>
          })}
          <tr className='entry'>{range(3).map(i => <td></td>)}</tr>
        </tbody></table>
      </InfoSection>
      <InfoSection labels={[]}>
        <div>not to be confused with <A href='/donoboard' /></div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
#leaderboard-section {
  table {
    width: 100%;
    background: var(--id-color-text-readable);
    border: 1px solid currentcolor;
    thead {
      font-weight: bold;
    }
    tbody tr.entry {
      border: 1px solid currentcolor;
    }
    tbody tr:nth-child(2n - 1) {
      background: #0002;
    }
    td {
      vertical-align: middle;
    }
    td:first-child {
      padding-left: .25em;
    }
    td:last-child {
      padding-right: .25em;
    }
    tr.detail {
      background: var(--id-color) !important;    
      .detail-inner-container {
        display: flex; text-align: center;
        height: 100%; width: 100%;
        .detail-inner {
          width: 0;
          flex-grow: 1
        }
      }  
    }

    .entry-name {
      text-transform: capitalize;
    }
  }
}
`