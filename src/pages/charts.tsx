import React, { Fragment, useState } from 'react'
import { InfoBody, InfoLabel, InfoSection, InfoStyles, InfoRequireMe } from '../components/Info'
import api from '../lib/api'
import { useF } from '../lib/hooks'
import { useAuth } from '../lib/hooks_ext'
import { range, toStyle, toYearMonthDay } from '../lib/util'


export default () => {
  const auth = useAuth()
  const [counts, setCounts] = useState([])

  const handle = {
    load: async () => {
      setCounts(await Promise.all(
        `site/views site/views+${encodeURIComponent('/wordbase')} site/views+${encodeURIComponent('/wordle')} site/views+${encodeURIComponent('/wordle/#/leaderboard')}`
        .split(' ').map(spacekey => api.get(`/counter/${spacekey}`))))
    },
  }
  useF(handle.load)

  const [views, setViews] = useState({})
  useF(() => {
    const past = x => {
      const d = new Date()
      d.setDate(d.getDate() - x)
      return toYearMonthDay(d)
    }
    api.post('/i/batch/site', {
      keys: range(30).map(x => `views+${past(x)}`)
    }).then(data => {
      console.debug(data)
      delete data.user
      setViews(Object.assign({}, views, data))
    })
  })
  const orderedViews: any = views && Object
    .entries(views)
    .sort((a,b) => a[0].localeCompare(b[0]))
  const maxViews = orderedViews && Math.max(...orderedViews.map(x => x[1]))
  useF('VIEWS', maxViews, orderedViews, console.debug)

  return <InfoRequireMe>
    <InfoStyles>
      <InfoBody>
      {auth.user !== 'cyrus' ? `you aren't cyrus, sorry :/` : <>
      <InfoLabel labels={['only site/views is somewhat accurate - the other counts were started later']} />
        {counts.map((counter, i) =>
        <InfoSection key={i} labels={[
          `${counter.space === 'default' ? '' : counter.space + '/'}${counter.key}`,
          ]}>
          {counter.value}
          {i === 0
          ?
          <div style={toStyle(`
          width: 100%;
          height: 7rem;
          display: flex;
          align-items: flex-end;
          border: .25em solid black;
          border-radius: 2px;
          background: black;
          `)}>
            {orderedViews.map(e => <span key={e[0]} style={toStyle(`
            height: max(${e[1] ? '1px' : '0'}, calc(${100 * e[1] / maxViews}% - 1.5em));
            display: block;
            background: white;
            color: white;
            flex-grow: 1;
            position: relative;
            `)}><span style={toStyle(`
            position: absolute;
            bottom: calc(100% + 1px);
            width: 300%;
            left: -100%;
            text-align: center;
            font-size: ${e[1] === maxViews ? '.8em' : 'min(.5em, 1vw)'};
            `)}>{e[1] || ''}</span></span>)}
          </div>
          :''}
        </InfoSection>)}
      </>}
      </InfoBody>
    </InfoStyles>
  </InfoRequireMe>

}