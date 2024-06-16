import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { useS } from 'src/lib/hooks'
import { pass } from 'src/lib/types'
import { list, keys, sum, values, defer } from 'src/lib/util'
import { useCachedScript } from 'src/lib/hooks_ext'



export const currency = (x:number, symbol='$', suffix=false) => {
  return {
    value: x,
    render: () => String(x).split('').reverse().join('').replace(/(\d{3})/g, '$1,').split('').reverse().join('').replace(/^(-?),/, '$1').replace(suffix ? /()$/ : /^(-?)/, `$1${symbol}`),
    get display(){ return this.render() },
  }
}

export default () => {
  const [group, setGroup] = useS([
    {
      name: 'Jo',
      accounts: {
        savings: {
          balance: 1_000,
        },
        checking: {
          balance: 150,
        },
      },
    },
    {
      name: 'Jack',
      accounts: {
        investment: {
          balance: 100_000,
        },
      },
    },
    {
      name: 'Jandal',
      accounts: {
        credit: {
          balance: -500,
        },
      },
    }
  ])
  const handle = {

  }

  useCachedScript('/lib/2/hydrate-components/script.js')

  return <Style>
    <InfoBody>
      
      <InfoSection labels={[
        'overview',
      ]}>
        {/* <div>${sum(values(account.accounts).map(account => account.balance))} across {keys(account.accounts).length} accounts</div> */}
        Today's hint:{'\n'}
        Try earning a little more. Selling a kidney. Hm?
      </InfoSection>
      
      <br />
      <InfoSection labels={[
        'accounts',
      ]}>
        <HalfLine />
        {group
        .flatMap(account => [
          [
            account.name,
            { spacer:'—' },
            `total: `+currency(sum(values(account.accounts).map(account => account.balance))).display,
          ], 
          ...keys(account.accounts).map(name => [
            {[name]:pass},
            { spacer: '.' },
            currency(account.accounts[name].balance).display,
          ]), 
          [
            { spacer:'.' },
          ],
        ])
        .concat([
          [
            'grand total',
            { spacer:'—' },
            currency(sum(values(group.flatMap(x => values(x.accounts).map(account => account.balance))))).display,
          ]
        ])
        .map(labels => <InfoBadges nowrap full labels={labels} />)}
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.section {
  white-space: pre-line;
}
`