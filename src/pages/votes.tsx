import React, { useState } from 'react'
import styled from 'styled-components'
import { InfoBody, InfoEntry, InfoSection, InfoStyles } from '../components/Info'
import Vote, { countsToVote } from '../components/Vote'
import api, { auth } from '../lib/api'
import { useCached, useF } from '../lib/hooks'
import { range } from '../lib/util'


export default () => {
  const [counts] = useCached<any>('votes', () => api.get(`i/vote-/op/prefix`)) ?? [{}]
  const names = counts ? [...new Set(counts.map(x => x.space))].map((x: string) => /vote-(.+)/.exec(x)[1]) : []

  const [{ user }] = auth.use()
  const [order, setOrder] = useState([])
  useF(counts, async () => {
    const totals = names.map(x => {
      const key = `vote-${x}`
      const items = counts.filter(x => x.space === key)
      const y = items.find(x => x.key === `y`)
      const n = items.find(x => x.key === `n`)
      const vote = countsToVote({
        y: y.value,
        n: n.value,
        user: {
          y: y.user[user],
          n: n.user[user],
        },
      })
      return {
        name: x,
        total: vote.total,
      }
    })
    console.debug('TOTALS', totals)
    setOrder(totals.sort((a, b) => b.total - a.total).map(x => x.name))
  })

  return <Style>
    <InfoBody>
      <InfoSection label='all active votes'>
        {order.map(x =>
        <InfoEntry key={x}>
          <Vote name={x} hideLabel />
          &nbsp;
          {x}
        </InfoEntry>)}
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.entry {
  margin-top: .5em;
}
`