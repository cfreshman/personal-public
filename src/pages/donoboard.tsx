import React from 'react'
import styled from 'styled-components'
import { A, External, HalfLine, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useR, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S } from 'src/lib/util'
import { RATE, SLOTS, Sponsor, use_sponsor_slots, use_sponsors } from 'src/components/individual/sponsors'
import { store } from 'src/lib/store'
import { PieChart, PieChartProps } from 'react-minimal-pie-chart'
import { Tooltip as ReactTooltip } from 'react-tooltip'

const { named_log, strings, maths, objects, lists, colors, list } = window as any
const log = named_log('donoboard')

export default () => {
  const sponsors = use_sponsors()
  const slots = use_sponsor_slots()
  useF('sponsors', sponsors, slots, log)

  const handle = {
    detail: (...x) => {

    },
  }

  // const [mode, set_mode] = useS('all')
  const [mode, set_mode]: ['claimed'|'all', any] = store.use('donoboard-mode', { default: 'claimed' })
  const last_mode = useR()
  const chart_data = useM(sponsors, slots, mode, () => {
    if (sponsors && slots) {
      const indexed_sponsors = sponsors.map((x, i) => ({
        i,
        ...x
      }))
      const me = indexed_sponsors.find(x => x.name === 'cyrus')
      const actual_sponsors = indexed_sponsors.filter(x => x !== me)

      const data = actual_sponsors.map((x, i) => {
        return {
          index: x.i,
          title: x.name || 'anonymous',
          value: x.slots,
          actual: x.slots,
          // color: `hsl(${i / actual_sponsors.length * 360}deg 100% 60%)`,
          color: colors.rgb_to_hex(...colors.hsl_object_to_rgb({ h: 1 - ((i+1) / actual_sponsors.length), s: 1, l: .6 })),
        }
      }).concat(mode === 'all' ? [{
        index: me.i,
        title: 'unclaimed',
        value: me.slots, actual: me.slots,
        color: '#222',
      }] : [])
      if (mode === 'all') {
        data.map(x => {
          // x.title = `${x.title} %`
          x.value = Math.ceil(100 * x.value / slots.total)
        })
      }
      return data
    }
  })
  useF('chart', chart_data, log)

  const actual_max = useM(sponsors, () => sponsors && lists.maxxing(sponsors, x => x.slots))
  const actual_sponsors = useM(sponsors, () => sponsors?.filter(x => x.name !== 'cyrus'))
  const max_sponsor = useM(actual_sponsors, () => actual_sponsors && lists.maxxing(actual_sponsors, x => x.slots))
  const second_sponsor = useM(actual_sponsors, () => actual_sponsors && lists.maxxing(actual_sponsors, x => x === max_sponsor ? 0 : x.slots))
  useF(max_sponsor, second_sponsor, () => log({max_sponsor, second_sponsor}))
  const needed_to_overtake = useM(max_sponsor, second_sponsor, () => {
    if (max_sponsor && second_sponsor) {
      const difference = max_sponsor.slots - second_sponsor.slots
      return difference
    }
  })
  // const max_actual_sponsor = useM(max_sponsor, second_sponsor, () => max_sponsor && (max_sponsor.name === 'cyrus' ? second_sponsor : max_sponsor))

  const me = useM(sponsors, () => sponsors?.find(x => x.name === 'cyrus'))

  usePageSettings({
    professional: true,
    uses: objects.new('chart.js'),
    expand: true,
  })
  return <Style>
    <InfoBody>
      {/* <InfoSection labels={['8334 sponsor slots']}>
        <pre>{strings.json.pretty(sponsors)}</pre>
      </InfoSection> */}
      <InfoSection id='leaderboard-section' labels={[
        'leaderboard',
        (slots && slots.taken && slots.unclaimed ? `${slots.taken}/` : '') + `${SLOTS} slots taken`,
        // { 'claim a slot': () => parent.open('https://freshman.dev/1', '_blank') },
        // { 'acquire slot(s)': () => parent.open('https://freshman.dev/github-sponsors', '_blank') },
        // { text: 'acquire slot(s)', href: '/coffee/monthly' },
        // { text: 'acquire slot', href: '/coffee/monthly' },
        { text: 'acquire slot', href: 'https://freshman.dev/slot' },
      ]}>
        {false && max_sponsor
        ? <div className='pre-line'>
          {actual_max?.name === 'cyrus' ? <span>after me (<b>USERS: UPSURP ME!</b>),&nbsp;</span> : null}
          <b><Sponsor sponsor={max_sponsor} /></b> leads by {needed_to_overtake}
        </div>
        : null}
        {me ? <div>
          <span>{Math.floor(me.slots)} $2/mo slots to go!</span>
        </div> : null}
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
          {sponsors ? sponsors.filter(x => x.name !== 'cyrus').map((entry, i) => {
            const rank = i + 1
            const entry_source_url = {
              'github.com': 'https://github.com/sponsors/cfreshman?frequency=recurring&sponsor=cfreshman',
            }[entry.source]
            return <>
              <tr className={`entry`}>
                <td className='entry-rank'>{rank}</td>
                <td className='entry-name'><Sponsor sponsor={entry} bold={!!entry.name} /></td>
                <td className='entry-source'>{entry_source_url ? <A href={entry_source_url}>{entry.source}</A> : entry.source}</td>
                <td className='entry-slots'>{entry.slots || ''}</td>
                <td className='entry-url'>{entry.url ? <External href={entry.url} /> : null}</td>
              </tr>
            </>
          }) : <tr><td colSpan={5}>loading</td></tr>}
        </tbody></table>
      </InfoSection>
      <InfoSection labels={[]}>
        <div><b><A href='/contact' /> me to set your link!</b></div>
        <div>not to be confused with <A href='/dinoboard' /> or <A href='/dodoboard' /></div>
        {/* {max_sponsor
        ? <div className='pre-line'>
            {actual_max?.name === 'cyrus' ? <span>i'm still #1 - <b>USERS: UPSURP ME!</b>{'\n'}then:&nbsp;</span> : null}
            <Sponsor sponsor={max_sponsor} /> leads by {needed_to_overtake}
        </div>
        : null} */}
      </InfoSection>
      <InfoSection id='chart-section' labels={[
        'chart',
        // 'view:',
        ...list('claimed all').map(x => mode === x ? `viewing ${x}` : { [x]: () => set_mode(x) }),
      ]}>
        <div className='chart-container'>
          {chart_data ? <div data-tip="" data-for="chart">
            <PieChart {...{
              data: chart_data,
              startAngle: -90,
              // lengthAngle: -360,
              animate: true,
              animationDuration: 200,
              // label: (props: any) => `${props.dataEntry.index + 1}`,
              label: (props: any) => `${props.dataEntry.value > 1 ? props.dataEntry.title : props.dataEntry.index + 1}`,
              labelStyle: S(`
              font-size: 3px;
              font-family: monospace;
              padding: 0 .25em;
              border-radius: 99em;
              text-shadow: .2em .2em #000, -.2em -.2em #000, -.2em .2em #000, .2em -.2em #000;
              fill: #fff;
              `),
              radius: 45,
              labelPosition: 105,
            }} />
            {/* <ReactTooltip id="chart" getContent={() =>
              typeof hovered === 'number' ? makeTooltipContent(chart_data[hovered]) : null
            } /> */}
          </div>
          : null}
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
      // border-top: 1px solid currentcolor;
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