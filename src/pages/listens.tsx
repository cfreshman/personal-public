import React from 'react'
import Calendar from 'src/components/Calendar'
import { dangerous } from 'src/components/individual/Dangerous'
import { useCached, useEventListener, useF, useInput, useM, useS } from 'src/lib/hooks'
import { Tabbed, usePageSettings } from 'src/lib/hooks_ext'
import { JSX } from 'src/lib/types'
import { S, duration, elapsed, from, fromYearMonthDay, getCssVar, list, named_log, values } from 'src/lib/util'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoRequireMe, InfoSection, InfoStyles, Multiline } from '../components/Info'
import queue from './queue'
import { useSocket } from 'src/lib/socket'
import { q_parse } from 'src/lib/queue'
import api, { auth } from 'src/lib/api'
import Vote, { useVote } from 'src/components/Vote'
import url from 'src/lib/url'
import { Scroller } from 'src/components/Scroller'


const log = named_log('listens')
const QUEUE = 'cyrus/listens'
const FILE = 'public-listens.js'
const RATE_LIMIT_PERIOD_MS = duration({ d: 1 })
const POSTS_PER_PERIOD = 3

export default () => {
  usePageSettings({
    expand: true,
    // background: '#eeebe6',
    // background: '#ff816b',
    background: '#ccc',
  })
  const [{user}] = auth.use()

  const [q, setQ]: any = useS({})
  const rateLimited = useM(
    q, 
    () => POSTS_PER_PERIOD <= (q.list?.filter(item => elapsed(item.t) > RATE_LIMIT_PERIOD_MS) || []).length)
  useF('requests', q, log)

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
  const [listens=[], reloadListens] = useCached('listens-definition', () => {
    return api.external(`https://freshman.dev/api/file/${FILE}`).then(r => {
      log(r)
      return r.text()
    }).then(definition => {
      log({definition})
      return eval(definition)
    })
  })
  // const listens = useM(() => [
  //   {
  //     name: '(about)', link: undefined,
  //     // date: '2023-07-12',
  //     notes: `
  //     listens through artist discography
  //     ${list('1) discography,2) top tracks,3? notes', ',').map(x => `<div style="
  //     background: #fff; color: #000;
  //     border-radius: 12px; padding: 4px; margin: 2px 0;
  //     width: fit-content; min-width: 60%;
  //     ">${x}</div>`).join('')}
  //     `,
  //   },
  //   {
  //     name: 'WILLOW', link: 'https://open.spotify.com/playlist/2FDBgtM4Vrb2OJFsEqdKXO?si=c60c9ad5323b4539lo',
  //     date: '2023-08-20',
  //     embed: [
  //       `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/3jLeAyXhg8wVg4qrr2kvsH?utm_source=generator" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  //       `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/artist/3rWZHrfrsPBxVy692yAIxF?utm_source=generator" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  //     ],
  //     notes: `
  //     not the entire discography but some good goddang stuff
  //     `,
  //   },
  //   {
  //     name: 'Lorde', link: 'https://open.spotify.com/playlist/2FDBgtM4Vrb2OJFsEqdKXO?si=c60c9ad5323b4539lo',
  //     date: '2023-08-18',
  //     embed: [
  //       `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/2FDBgtM4Vrb2OJFsEqdKXO?utm_source=generator" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  //       `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/artist/163tK9Wjr9P9DmM0AVK7lm?utm_source=generator" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  //     ],
  //     // notes: `
  //     // Cyber Stockholm Syndrome - biting the sh*t out of her soda
  //     // `,
  //   },
  //   {
  //     name: 'REI AMI', link: 'https://open.spotify.com/playlist/1fkIuHuQ4lFtWKdlNfxLKk?si=c60c9ad5323b4539lo',
  //     date: '2023-08-15',
  //     embed: [
  //       `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/1fkIuHuQ4lFtWKdlNfxLKk?utm_source=generator" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  //       `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/artist/6U1dV7aL68N7Gb0Naq34V5?utm_source=generator" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  //     ],
  //     // notes: `
  //     // Cyber Stockholm Syndrome - biting the sh*t out of her soda
  //     // `,
  //   },
  //   {
  //     name: 'Rina Sawayama', link: 'https://open.spotify.com/artist/2RqrWplViWHSGLzlhmDcbt?si=aYN8HToPRlC-9niGcfwiCQ',
  //     date: '2023-07-18',
  //     embed: [
  //       `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/0EJU3Ni1PLi0Y5qnZpgohg?utm_source=generator" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  //       `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/artist/2KEqzdPS7M5YwGmiuPTdr5?utm_source=generator" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  //     ],
  //     notes: `
  //     Cyber Stockholm Syndrome - biting the sh*t out of her soda
  //     `,
  //   },
  //   // '2023-07-14   Yaeji',
  //   {
  //     name: 'Yaeji', link: 'https://open.spotify.com/artist/2RqrWplViWHSGLzlhmDcbt?si=aYN8HToPRlC-9niGcfwiCQ',
  //     date: '2023-07-13',
  //     embed: [
  //       `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/3Dfi12DUxcG8Q2G38koCRe?utm_source=generator" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  //       `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/artist/2RqrWplViWHSGLzlhmDcbt?utm_source=generator" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  //     ],
  //     notes: `
  //     Happy @ :40 - "I think in circles" hell yeah good shit
  //     One More @ 2:30 - idk but hell yeah good shit
  //     `,
  //   },
  // ])
  const artists = useM(listens, () => from(listens.map(x => typeof(x) === 'string' ? undefined : [x.name, x])))
  useM(listens, () => {
    listens.map((x, i) => typeof(x) === 'string' ? listens[i] = (original => {
      return {
        ...original,
        date: x.split('   ')[0],
        embed: undefined,
        notes: `
        (again)
        (from <a href="#artist-${original.name}">${original.date}</a>)
        `,
      }
    })(artists[x.split('   ')[1]]) : 0)
  })
  const dates = useM(listens, () => from(listens.map(x => [x.date, x])))
  useF(listens, () => log('listens list', {listens,artists,dates}))

  const ListenTile = useM(() => ({ name, link, date, embed='', notes=undefined, close=undefined }) => {
    const rendered_embed = useM(embed, () => dangerous(`
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
  const ListenCalendar = useM(() => ({ list }) => {
    const [open, setOpen] = useS<number>(undefined)
    useF(open, () => {
      const listen = dates[open]
      location.hash = listen.embed ? `artist-${listen.name}` : ''
    })
    url.use(() => {
      const hash = location.hash.slice(1)
      log('listen calendar artist', {hash})
      if (hash.startsWith('artist-')) {
        const artist = hash.replace('artist-', '')
        setOpen(artists[artist].date)
      } else {
        setOpen(undefined)
      }
    })
    return <>
      <Calendar entries={list.filter(x=>x.date).map(({ name, link, date, embed }) => {
        return {
          date: fromYearMonthDay(date),
          // text: dangerous(embed),
          color: '#000',
          text: name,
          invert: true,
          func: () => setOpen(open === date ? false : date),
        }
      })} />
      {(x => <ListenTile close={open && (() => setOpen(undefined))} {...(x || {
        name: 'select date',
        embed: '<div style="min-height:152px"></div>'
      })} />)(list.find(x => x.date === open) || null)}
    </>
  })
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
        user === 'cyrus' && { X:()=>{ api.get(`/q/-/${QUEUE}?i=${i}`) } },
      ]}/>
    </div>
  })
  const ListenVotes = useM(() => ({ list }) => 
  <div className='column'>
    {list.map(x => <ListenVote {...x} />) || []}
  </div>)

  return <Style>
    <InfoBody className='column'>
      <Scroller />
      <InfoRequireMe>
        <InfoSection labels={[
          'admin panel',
          { edit: () => url.push(`/file/${encodeURIComponent(FILE)}`) },
        ]}></InfoSection>
      </InfoRequireMe>
      <InfoSection labels={[
        'suggestions',
        q?.list?.length && user === 'cyrus' && { clear:()=>{ api.get(`/q/flush/${QUEUE}`) } },
      ]}>
        {/* {<InfoBadges labels={q?.list?.map(x => x.msg?.request) || []} />} */}
        <ListenVotes list={q?.list || []} />
        <input placeholder='suggest an artist' {...bindRequest} onKeyDown={e => {
          if (e.key === 'Enter') {
            handle.add()
          }
        }} />
      </InfoSection>
      <HalfLine />
      <Tabbed style={S(`flex-grow:1`)}
      options={{

        listens: 
        <div style={S(`
        display: grid;
        width: 100%;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5em;
        `)}>
          {listens.map(listen => <ListenTile {...listen} />)}
        </div>,

        calendar: <ListenCalendar list={listens} />

      }} />
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