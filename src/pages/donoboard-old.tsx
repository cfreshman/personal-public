import React from 'react'
import styled from 'styled-components'
import { A, External, HalfLine, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useR, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S } from 'src/lib/util'
import { use_sponsor_slots, use_sponsors } from 'src/components/individual/sponsors'
import { store } from 'src/lib/store'

const { named_log, strings, maths, objects, lists } = window as any
const log = named_log('donoboard')

type sponsor = {
  slots: number,
  source: 'github.com'|'freshman.dev',
  name?: string,
  url?: string,
  u?: string,
}

export default () => {
  const [chart_lib_ready, set_chart_lib_ready] = useS(false)
  const chart_ref = useR()
  useCachedScript('/lib/chart.js', () => {
    log('loaded chart.min.js')
    set_chart_lib_ready(true)
  })

  const sponsors = use_sponsors()
  const slots = use_sponsor_slots()
  useF('sponsors', sponsors, slots, log)

  const handle = {
    detail: (...x) => {

    },
  }

  // const [mode, set_mode] = useS('all')
  const [mode, set_mode]: ['claimed'|'all', any] = store.use('donoboard-mode', { default: 'all' })

  const chart_inst_ref = useR()
  const last_mode = useR()
  useF(chart_lib_ready, sponsors, slots, mode, () => {
    if (chart_lib_ready && sponsors && slots) {
      if (last_mode.current === mode) return
      last_mode.current = mode

      const me = sponsors.find(x => x.name === 'cyrus')
      const actual_sponsors = sponsors.filter(x => x !== me)

      const l_chart = chart_ref.current
      const { Chart, ChartDataLabels } = window as any
      let labels = actual_sponsors.map(x => x.name||'anonymous').concat(mode === 'all' ? ['unclaimed'] : [])
      const dataset = {
        data: actual_sponsors.map(x => x.slots).concat(mode === 'all' ? [Math.min(me.slots)] : []),
        backgroundColor: actual_sponsors.map((x, i) => `hsl(${i / actual_sponsors.length * 360}deg 100% 60%)`).concat(mode === 'all' ? ['#222'] : []),
        // hoverOffset: 4
      }
      if (mode === 'all') {
        labels = labels.map(x => `${x} %`)
        dataset.data = dataset.data.map(x => x && Math.ceil(100 * x / slots.total))
      }
      log('chart', {labels, dataset, slots})
      let first = !chart_inst_ref.current
      if (chart_inst_ref.current) {
        chart_inst_ref.current.destroy()
      }
      chart_inst_ref.current = new Chart(l_chart, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [dataset],
        },
        options: {
          plugins: {
            legend: {
              display: false,
            },
            // ChartDataLabels,
            // datalabels: {
            //   formatter: (value, ctx) => {
            //     return `${Math.ceil(value)}%`
            //   },
            //   color: '#fff',
            // },
          },
          elements: {
            arc: {
              borderWidth: 0,
              // borderWidth: 1,
              // borderColor: '#000',
            }
          },
          animation: first ? {
            // duration: 0
          } : {
            duration: 0,
          },
        }
      })
    }
  })


  usePageSettings({
    professional: true,
    uses: objects.new('chart.js'),
  })
  return <Style>
    <InfoBody>
      {/* <InfoSection labels={['8334 sponsor slots']}>
        <pre>{strings.json.pretty(sponsors)}</pre>
      </InfoSection> */}
      <InfoSection id='leaderboard-section' labels={[
        'leaderboard',
        slots && slots.taken && slots.unclaimed ? `${slots.taken}/6000 $1 slots` : '6000 $1 slots',
        // { 'claim a slot': () => parent.open('https://freshman.dev/1', '_blank') },
        // { 'acquire slot(s)': () => parent.open('https://freshman.dev/github-sponsors', '_blank') },
        { text: 'acquire slot(s)', href: '/coffee/monthly' },
      ]}>
        <table>
          <thead>
            <tr>
              <td></td>
              <td>name</td>
              <td>source</td>
              <td>slots</td>
              <td>link</td>
            </tr>
          </thead>
          <tbody>
          {sponsors ? sponsors.map((entry, i) => {
            const rank = i + 1
            const entry_source_url = {
              'github.com': 'https://github.com/sponsors/cfreshman?frequency=recurring&sponsor=cfreshman',
            }[entry.source]
            return <>
              <tr className={`entry`}>
                <td className='entry-rank'>{rank}</td>
                <td className='entry-name'>{entry.u ? <A href={`/u/${entry.u}`} /> : entry.name || 'anonymous'}</td>
                <td className='entry-source'>{entry_source_url ? <A href={entry_source_url}>{entry.source}</A> : entry.source}</td>
                <td className='entry-slots'>{entry.slots || ''}</td>
                <td className='entry-url'>{entry.url ? <External href={entry.url} /> : null}</td>
              </tr>
            </>
          }) : <tr><td colSpan={5}>loading</td></tr>}
        </tbody></table>
      </InfoSection>
      <InfoSection labels={[]}>
        <div><b><A href='/contact' /> me to set your entry link!</b></div>
        <div>not to be confused with <A href='/dinoboard' /> or <A href='/dodoboard' /></div>
      </InfoSection>
      <InfoSection id='chart-section' labels={[
        'chart',
        // 'view:',
        { 'all': () => set_mode('all'), label: mode === 'all' },
        { 'claimed': () => set_mode('claimed'), label: mode === 'claimed' },
      ]}>
        <div className='chart-container'>
          <canvas ref={chart_ref} />
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
#leaderboard-section {
  table {
    width: 100%;
    background: gold !important;
    border-collapse: collapse;
    thead {
      font-weight: bold;
      border-bottom: 1px solid currentcolor;
    }
    tbody tr:not(:first-child).entry {
      // border-top: .5px solid currentcolor;
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
  }
}
#leaderboard-section table, #chart-section .chart-container {
  background: var(--id-color-text-readable);
  border: 1px solid currentcolor;
}
#chart-section .chart-container {
  width: 100%;
  padding: .5em;
  background: var(--id-color-text);
  color: var(--id-color-text-readable);
  border: 1px solid var(--id-color-text);
}
`