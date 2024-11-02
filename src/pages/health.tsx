import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoFile, InfoSection, InfoStyles } from '../components/Info'
import { asObject, useF, useM, useObject, useS, useTimed } from 'src/lib/hooks'
import { S, elapsed, from, keys, list, named_log, sum } from 'src/lib/util'
import { couple } from 'src/lib/types'


const log = named_log('health')

type SleepDatum = {
  duration:number,
}

export default () => {
  const [data, setData] = useS()
  const [summary, setSummary] = useS() 

  const [categories, setCategories, mergeCategories] = useObject<{
    sleep: SleepDatum[],
  }>({
    sleep: [{duration:0}] as SleepDatum[],
  })
  const max = useM(categories, () => {
    return from(keys(categories).map(c => {
      return [c, {
        data,
        max: categories[c].reduce((a,v) => keys(v).reduce(k => {a[k] = Math.max(a[k], v[k]);return a})),
      }] as any /* heck u to heck */
    }))
  }) as {sleep:SleepDatum}
  const { sleep } = categories

  const [importing, setImporting] = useS(false)

  useF(summary, categories, max, log)

  return <Style>
    <InfoBody>
      <InfoSection labels={[
        'import',
      ]}>
        <InfoBadges labels={[
          <InfoFile accept='.xml' setValue={async file => {
            setImporting(true)
            const xml = new DOMParser().parseFromString(await file.text(), 'application/xml')
            log(xml)

            const recursive_xml_summarize = (node:Element, parses=[], prefix=undefined, summary={}, categories={}) => {
              const attributes = from(node.getAttributeNames().map(x => [x, node.getAttribute(x)] as couple<string>))
              const { type='-' } = attributes
              prefix += '.' + type
              summary[prefix] = {
                attributes,
                nodes: (summary[prefix]?.nodes || []).concat(node)
              }
              parses.map(x => {
                categories[x.name] = (categories[x.name] || []).concat(x.parse(node))
              })
              list(node.children).map(x => recursive_xml_summarize(x, parses, prefix, summary))
              return {summary,categories}
            }
            const {summary,categories} = recursive_xml_summarize(xml.documentElement, [
              {
                name: 'sleep',
                type: '-.-.HKCategoryTypeIdentifierSleepAnalysis',
                parse: x => {
                  return {
                    duration: elapsed(x.startDate, x.endDate),
                  }
                },
              }
            ])
            // setSummary(summary)
            setCategories(categories as any)

            // mergeCategories(from([
            //   {
            //     name: 'sleep',
            //     type: '-.-.HKCategoryTypeIdentifierSleepAnalysis',
            //     parse: x => {
            //       return {
            //         duration: elapsed(x.startDate, x.endDate),
            //       }
            //     },
            //   }
            // ].map(e => {
            //   const data = summary[e.type].nodes.map(e.parse)
            //   return [e.name, {
            //     data,
            //     max: data.reduce((a,v) => keys(v).reduce(k => {a[k] = Math.max(a[k], v[k]);return a})),
            //   }] as any /* heck u to heck */
            // })))

            setImporting(false)
          }} /> as any,
          importing && 'importing',
        ]} />
        
        {data}

        {/* {sleep
        ? 
        <div style={S(`
        width: 100%;
        height: 7rem;
        display: flex;
        align-items: flex-end;
        border: .25em solid black;
        border-radius: 2px;
        background: black;
        `)}>
          {sleep.map(({duration},i) => <span key={i} style={S(`
          height: max(${i ? '1px' : '0'}, calc(${100 * duration / max.sleep.duration}% - 1.5em));
          display: block;
          background: white;
          color: white;
          flex-grow: 1;
          position: relative;
          `)}><span style={S(`
          position: absolute;
          bottom: calc(100% + 1px);
          width: 300%;
          left: -100%;
          text-align: center;
          font-size: ${duration === max.sleep.duration ? '.8em' : 'min(.5em, 1vw)'};
          `)}>{duration || ''}</span></span>)}
        </div>
        :null} */}
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`