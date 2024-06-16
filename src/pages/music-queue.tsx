import React from 'react'
import Calendar from 'src/components/Calendar'
import { dangerous } from 'src/components/individual/Dangerous'
import { useCachedSetter, useEventListener, useF, useInput, useM, useS } from 'src/lib/hooks'
import { Tabbed, usePageSettings } from 'src/lib/hooks_ext'
import { JSX, anyFields, truthy } from 'src/lib/types'
import { QQ, S, duration, elapsed, from, fromYearMonthDay, getCssVar, merge, named_log, values } from 'src/lib/util'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoSection, InfoStyles, Multiline } from '../components/Info'
import queue from './queue'
import { useSocket } from 'src/lib/socket'
import { q_parse } from 'src/lib/queue'
import api, { auth } from 'src/lib/api'
import Vote, { useVote } from 'src/components/Vote'
import url from 'src/lib/url'


const log = named_log('uh')
const QUEUE = 'cyrus/play-queue'
const RATE_LIMIT_PERIOD_MS = duration({ d: 1 })
const POSTS_PER_PERIOD = 3

export default () => {
  usePageSettings({
    expand: true,
    // background: '#eeebe6',
    background: '#ff816b',
  })
  const [{user}] = auth.use()

  const [q={list:[]}, setQ]: any = useS({})
  const rateLimited = useM(
    q, 
    () => POSTS_PER_PERIOD <= (q.list?.filter(item => elapsed(item.t) > RATE_LIMIT_PERIOD_MS) || []).length)
  useF('requests', q, log)

  const id = 'play-queue'
  const [sync={}, setSync, reloadSync] = useCachedSetter({
    name: 'player-sync',
    fetcher: () => id && api.post('/state', { id }).with(x => log('synced fetch', x)),
    setter: (
      x: {state?:anyFields,update?:anyFields,delete?:{[key:string]:boolean}}
    ) => 
      auth.user === 'cyrus' && api
      .post('/state', {
        ...x, id,
      })
      .with(x => log('synced set', x)),
  })
  useF(id, reloadSync)
  const { index=0 } = sync
  const setIndex = (index) => setSync({ update:{index} })
  // useSocket({
  //   // room:
  //   on: {
  //     [`state:${id}`]: (value) => log('socket /state', {id,value})
  //   },
  // })

  const played = useM(index, q, () => {
    const index_index = index // q?.list?.findIndex(x => x.i <= index)
    const value = [
      ...(q?.list?.slice(0, index_index).map(x => x.msg.request).map(x => `- ${x}`) || []).reverse(),
      `(queue music for ${location.host.split('.').slice(-2).join('.')} <a href=/livestream>/livestream</a>)`]
    log('played', {list:q?.list, index_index, value})
    return value
  })
  const queued = (q?.list || []).slice(index)
  // const queued = q?.list?.slice(q.list.length - played.length)

  const [request, setRequest, bindRequest] = useInput('')

  const handle = {
    parse: promise => 
      promise
      .then(raw => {
        console.debug(raw)
        const q = q_parse(raw)
        // HACKY ignore first item (to hide first doodle on freshman.dev)
        q.list = q.list.slice(1)
        setQ(q)
      })
      .catch(err => {
        console.debug(err)
        setQ(err)
      }),
    load: () => handle.parse(api.get(`/q/${QUEUE}`)),
    add: () => {
      if (rateLimited) return

      const info = {
        request,
      }
      const msg = JSON.stringify(info)
      handle.parse(api.post(`/q/${QUEUE}`, { msg }))
      setRequest('')
    },
  }
  useSocket({
    on: {
      q: key => {
        if (key.includes(QUEUE)) {
          handle.load()
        }
      },
    },
    connect: socket => socket.emit('join', 'q')
  })
  useF(handle.load)

  // const played = useM(() => [
  //   // '2023-07-14   Yaeji',
  //   // {
  //   //   name: 'Yaeji', link: 'https://open.spotify.com/artist/2RqrWplViWHSGLzlhmDcbt?si=aYN8HToPRlC-9niGcfwiCQ',
  //   //   date: '2023-07-13',
  //   //   embed: [
  //   //     `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/3Dfi12DUxcG8Q2G38koCRe?utm_source=generator" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  //   //     `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/artist/2RqrWplViWHSGLzlhmDcbt?utm_source=generator&theme=0" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  //   //   ],
  //   //   notes: `
  //   //   Happy @ :40 - "I think in circles" hell yeah good shit
  //   //   One More @ 2:30 - idk but hell yeah good shit
  //   //   `,
  //   // }, 
  //   {
  //     name: '(about)', link: undefined,
  //     // date: '2023-07-12',
  //     notes: `
  //     queue music
  //     `,
  //   }
  // ])
  // const artists = useM(played, () => from(played.map(x => typeof(x) === 'string' ? undefined : [x.name, x])))
  // useM(played, () => {
  //   played.map((x, i) => typeof(x) === 'string' ? played[i] = (original => {
  //     return {
  //       ...original,
  //       date: x.split('   ')[0],
  //       embed: undefined,
  //       notes: `
  //       (again)
  //       (from <a href="#artist-${original.name}">${original.date}</a>)
  //       `,
  //     }
  //   })(artists[x.split('   ')[1]]) : 0)
  // })
  // const dates = useM(played, () => from(played.map(x => [x.date, x])))
  // useF(played, () => log('listens list', {played,artists,dates}))

  const ListenTile = useM(() => ({ name, link, date, embed='', notes=undefined, close=undefined }) => {
    const rendered_embed = useM(embed, notes, () => dangerous(`
    <div ${name && embed ? `id="artist-${name}"` : ''}
    class="listen-tile-embed-list column" style="
    border-radius: 12px;
    padding: .25em; gap: .25em;
    background: #8882;
    ">
      ${Array.isArray(embed) ? embed.join('\n') : embed}
      ${notes ? `<div class="description" style="
      height: 152px; width: 100%;
      border-radius: 12px;
      padding: 1em;
      background: var(--id-color-text); color: var(--id-color-text-readable);
      white-space: pre-line;
      ">${notes.trim()}</div>` : ''}
    </div>`, {
      className: 'listen-tile-embed',
    }))
    return <div className='listen-tile column gap' key={date}>
      <InfoBadges labels={[
        name && {
          text: name,
          href: link,
        },
        date,
        close && { close },
      ]} />
      {rendered_embed}
    </div>
  })
  // const ListenCalendar = useM(() => ({ list }) => {
  //   const [open, setOpen] = useS<number>(undefined)
  //   useF(open, () => {
  //     const listen = dates[open]
  //     location.hash = listen.embed ? `artist-${listen.name}` : ''
  //   })
  //   url.use(() => {
  //     const hash = location.hash.slice(1)
  //     log('listen calendar artist', {hash})
  //     if (hash.startsWith('artist-')) {
  //       const artist = hash.replace('artist-', '')
  //       setOpen(artists[artist].date)
  //     } else {
  //       setOpen(undefined)
  //     }
  //   })
  //   return <>
  //     <Calendar entries={list.filter(x=>x.date).map(({ name, link, date, embed }) => {
  //       return {
  //         date: fromYearMonthDay(date),
  //         // text: dangerous(embed),
  //         color: '#000',
  //         text: name,
  //         invert: true,
  //         func: () => setOpen(open === date ? false : date),
  //       }
  //     })} />
  //     {(x => <ListenTile close={open && (() => setOpen(undefined))} {...(x || {
  //       name: 'select date',
  //       embed: '<div style="min-height:152px"></div>'
  //     })} />)(list.find(x => x.date === open) || null)}
  //   </>
  // })
  const ListenVote = useM(() => ({ i, msg:{request} }) => {
    const name = useM(i, () => `listens-${i}`)
    const [vote] = useVote(name)
    return <div style={S(`
    order: ${-vote?.y};
    margin-bottom: 2px;
    `)} >
      <InfoBadges style={{flexWrap:'nowrap'}} labels={[
        <span>
          <Vote name={name} hideLabel 
          green={getCssVar('var(--id-color-text)')}
          red={getCssVar('var(--id-color-text)')}
          yellow={getCssVar('var(--id-color-text)')}
          white={getCssVar('var(--id-color-text)')}
          />
        </span>,
        request,
        user === 'cyrus' && { X:()=>{ api.get(`/q/-/${QUEUE}?i=${i}`).then(reloadSync) } },
      ]}/>
    </div>
  })
  const ListenVotes = useM(() => ({ list }) => 
  <div className='column'>
    {list.map(x => <ListenVote {...x} />) || []}
  </div>)

  useF(() => QQ('input').find(truthy)?.focus())

  return <Style>
    <InfoBody className='column'>
      <InfoSection labels={[
        'queue',
        q?.list?.length && user === 'cyrus' && { shift:()=>setIndex(index+1) },
        q?.list?.length && user === 'cyrus' && { clear:()=>{
          // api.get(`/q/flush/${QUEUE}`)
          // setIndex(0)
          Promise.all(queued.map(e => api.get(`q/-/${QUEUE}?i=${e.i}`))).then(reloadSync)
        } },
      ]}>
        {/* {<InfoBadges labels={q?.list?.map(x => x.msg?.request) || []} />} */}
        <ListenVotes list={queued || []} />
        <input placeholder='' {...bindRequest} onKeyDown={e => {
          if (e.key === 'Enter') {
            handle.add()
          }
        }} />
      </InfoSection>
      <HalfLine />
      <InfoSection style={S(`flex-grow:1`)}
      labels={[
        'played',
        q?.list?.length && user === 'cyrus' && { clear:()=>{
          // api.get(`/q/flush/${QUEUE}`)
          setIndex(0)
          Promise.all(played.map((x,i) => api.get(`q/-/${QUEUE}?i=${q.list[i].i}`))).then(reloadSync)
        } },
      ]}>
        <div style={S(`
        display: grid;
        width: 100%;
        grid-template-columns: repeat(1, 1fr);
        gap: 0.5em;
        `)}>
          {/* {played.map(listen => <ListenTile {...listen} />)} */}
          {/* {played.map(listen => listen)} */}
          <ListenTile notes={played.join('\n')} />
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
max-width: unset !important;
.body > * {flex-wrap:nowrap!important}

.listen-tile {
  width: 100%;

  .listen-tile-embed-list {
    a { color:inherit !important }
  }
  .listen-tile-embed {
    width: 100%;
  }
}
.calendar-container {
  min-height: 7em;
}
`