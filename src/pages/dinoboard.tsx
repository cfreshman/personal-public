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
  url: string,
  reason: string,
}

export default () => {
  const dinos = [
    {
      name: 'Archaeopteryx',
      url: 'https://en.wikipedia.org/wiki/Archaeopteryx',
      reason: 'uh spawned all birds? so furiken #1 bc i love birds',
    },
    {
      name: 'Stegosaurus',
      url: 'https://en.wikipedia.org/wiki/Stegosaurus',
      reason: 'just love this little guy',
    },
    {
      name: 'Pteranodon',
      url: 'https://en.wikipedia.org/wiki/Pteranodon',
      reason: 'not much can compete with the ability to fly',
    },
    {
      name: 'Dimetrodon',
      url: 'https://en.wikipedia.org/wiki/Dimetrodon',
      reason: 'technically came before dinosaurs, had a really cool sail thing (it used it for temp control maybe)',
    },
    {
      name: 'Brontosaurus',
      url: 'https://en.wikipedia.org/wiki/Brontosaurus',
      reason: 'sooooo big',
    },
    {
      name: 'Parasaurolophus',
      url: 'https://en.wikipedia.org/wiki/Parasaurolophus',
      reason: 'this guy had a crest on its head it could use to make horn sounds',
    },
    {
      name: 'Velociraptor',
      url: 'https://en.wikipedia.org/wiki/Velociraptor',
      reason: 'hunted in packs - cooler than T-Rex',
    },
    {
      name: 'Ankylosaurus',
      url: 'https://en.wikipedia.org/wiki/Ankylosaurus',
      reason: 'living tank',
    },
    {
      name: 'Spinosaurus',
      url: 'https://en.wikipedia.org/wiki/Spinosaurus',
      reason: 'the longest known terrestrial carnivore!'
    },
    {
      name: 'Tyrannosaurus Rex',
      url: 'https://en.wikipedia.org/wiki/Tyrannosaurus',
      reason: "most classic dinosaur. had to include. sorry it's so far down",
    },
    {
      name: 'Triceratops',
      url: 'https://en.wikipedia.org/wiki/Triceratops',
      reason: "idk it's just ok",
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
      {/* <InfoSection labels={['8334 sponsor slots']}>
        <pre>{strings.json.pretty(sponsors)}</pre>
      </InfoSection> */}
      <InfoSection id='leaderboard-section' labels={[
        'leaderboard',
        'best dinosaurs',
      ]}>
        <table>
          <thead>
            <tr>
              <td></td>
              <td>dinosaur</td>
              <td></td>
            </tr>
          </thead>
          <tbody>
          {dinos.map((entry, i) => {
            const rank = i + 1
            const show_detail = detail.has(entry.name)
            return <>
              <tr className={`entry`} onClick={e => handle.detail(entry.name)}>
                <td className='entry-rank'>{rank}</td>
                <td className='entry-name'>{entry.name}</td>
                <td className='entry-url'>{entry.url ? <External href={entry.url} /> : null}</td>
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
      cursor: pointer;
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
  }
}
`