import React from 'react'
import { A } from 'src/components/A'
import { Modal, openPopup } from 'src/components/Modal'
import { S } from 'src/lib/util'
import { Style } from './style'
import { HalfLine, InfoBody, InfoButton } from 'src/components/Info'
import { is_local_player } from './data'
import { is_ai } from './ai'
import api from 'src/lib/api'
import user from 'src/lib/user'
import url from 'src/lib/url'

const { named_log, rand, set, maths, keys, values, list } = window as any
const log = named_log('capitals util')


export const named_colors = {
  red: '#ff4243',
  orange: '#ff8601',
  yellow: '#ffcd3f',
  green: '#69e100',
  blue: '#33b6e7',
  dark_blue: '#44f',
  purple: '#8b36bb',
  pink: '#ff41e8',
}
export const named_icons = {
  dog: '🐶',
  cat: '🐱',
  fox: '🦊',
  fish: '🐟',
  frog: '🐸',
  ladybug: '🐞',
}
export const default_player_profiles = [{
  color: named_colors.dark_blue,
  icon: named_icons.dog,
}, {
  color: named_colors.red,
  icon: named_icons.cat,
}]

export const PlayerName = ({ name, profile, arrow=false, zoom=1, stats=false, icon_only=false, icon_click=undefined, handle=undefined, info_id=undefined, do_reaction=undefined, reaction=undefined }) => {
  // const base_jsx = name ? <A href={stats ? `/capitals/stats/${name}` : `/u/${name}`}>{name}</A> : 'invite'
  const [settings] = user.settings.use()

  const base_jsx = name 
  ? 
    is_local_player(name)
    ? name
    : is_ai(name) && !handle
    ? name // `bot: ${name}`
    : stats && handle 
    ? 
      info_id
      ? <A href={`/capitals/game-stats/${info_id}/${name}`}>{name}</A>
      : <a onClick={e => handle.open_stats(name)}>{name}</a>
    : <A href={stats ? `/capitals/stats/${name}` : `/u/${name}`}>{name}</A>
  : 'invite'
  const name_jsx = arrow ? <span>{'>'} {base_jsx} {'<'}</span> : base_jsx
  return <div className='capitals-player-name grow middle-column' style={S(`
  font-size: ${zoom}em;
  `)}>
    {icon_only ? null : name_jsx}
    <span className={`player-icon ${icon_click||do_reaction?'click':''}`} style={S(`
    background: ${profile.color};
    position: relative;
    `)} onClick={do_reaction ? e => {
      open_popup(close => {
        return <div>
          <div className='middle-column' style={S(`
          height: 16em;
          width: 16em;
          position: relative;
          border: 1px solid #fff;
          border-radius: 50%;
          user-select: none;
          `)}>
            <span>emote!</span>
            {[...(settings?.capitals?.reacts || '😀😎😭🫠😈')].map((reaction, i, ar) => {
              const angle = i / ar.length * maths.TAU - maths.TAU / 4
              const x = Math.cos(angle) * 1.25 + 2
              const y = Math.sin(angle) * 1.25 + 2
              return <div style={S(`
                font-size: 4em;
                position: absolute;
                left: ${x}em; top: ${y}em;
                height: 0; width: 0;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer;
                text-transform: uppercase; font-weight: bold;
                `)} onClick={x => {
                  close()
                  do_reaction(reaction)
                }}>{reaction}</div>
            })}
          </div>
          <br />
          <div className='row wide' style={S(`
          justify-content: space-between;
          `)}>
            <InfoButton onClick={e => {
              close()
              url.push('/settings/capitals')
            }}>edit</InfoButton>
            <InfoButton onClick={close}>close</InfoButton>
          </div>
        </div>
      })
    } : icon_click}>
      {profile.icon}
      {reaction ? <div style={S(`
      position: absolute;
      bottom: calc(100% - .25em); left: calc(100% - .25em);
      height: 0; width: 0; display: flex; align-items: center; justify-content: center;
      pointer-events: none;
      `)}>{reaction}</div> : null}
    </span>
  </div>
}
export const PlayerNameFromInfo = ({ owner, info, display_turn:display_turn_i, played, display_owner=undefined, gameover, profiles, icon_click=undefined, handle, no_arrow=false, do_reaction=undefined }) => {
  const display_turn = display_turn_i ? info.turns.at(display_turn_i - 1) : undefined
  display_owner = display_owner || (info.turns.at(display_turn_i)?.owner||info.owner)
  log({display_turn,display_owner}, display_turn_i, info.turns)
  
  return <PlayerName {...{
    name: info[`p${owner}`],
    profile: profiles[owner],
    arrow: !no_arrow && !gameover && (display_owner === owner),
    stats: true,
    // info_id: info.id,
    reaction: display_turn?.owner === owner && display_turn?.reaction,
    icon_click: !do_reaction && icon_click, handle, do_reaction: do_reaction && (reaction => {
      api.post(`/capitals/game/${info.id}/react`, { reaction })
    }),
  }} />
}

export const open_popup = (closable_jsx) => openPopup(close => <Style>
  {closable_jsx(close)}
</Style>, `
height: max-content;
width: max-content;
`)
export const open_about = () => open_popup(close => <>
  <InfoBody id='capitals-menu-about' className='middle-column'>
    <img src='/raw/capitals/icon.png' width={128} />
    <div>Capitals was an iOS word strategy game released in 2015 by <a href='https://en.wikipedia.org/wiki/NimbleBit'>NimbleBit</a>, but has since been discontinued</div>
    <HalfLine />
    <div>Video: <a href='https://www.youtube.com/watch?v=vckV_9Qb9uE'>Capitals - Free Word Battle</a></div>
    <HalfLine />
    <HalfLine />
    <div>Music for this remake was found on <a href='https://www.chosic.com/free-music/lofi/?sort=&attribution=no&duration='>Chosic</a></div>
    <div>
      (you can turn it off too: <InfoButton onClick={e => {
        close()
        url.push('/settings/capitals')
      }}>settings</InfoButton>)
    </div>
    <div className='row wide end'>
      <InfoButton onClick={close}>close</InfoButton>
    </div>
  </InfoBody>
</>)
export const open_howto = () => open_popup(close => <>
  <InfoBody id='capitals-menu-howto' className='middle-column'>
    <div><b>capitals - word strategy game</b></div>
    <HalfLine />
    <div className='center-column' style={S(`font-size: .8em`)}>
      <div>expand your territory and eliminate your opponent to win!</div>
      <HalfLine />
      <div>spell words using any tiles on the board - you'll keep tiles which connect back to your territory. your opponent will lose any tiles touching your new territory</div>
      <HalfLine />
      <div>take your opponent's capital for an extra turn (and make sure to protect your own)</div>
    </div>
    <HalfLine />
    <div className='center-column' style={S(`font-size: .8em`)}>
      <b>install:</b>
      <span className='center-row'>
        iOS Safari →
        {/* https://www.svgrepo.com/svg/343284/share-alt */}
        <svg width="1.5em" height="1.5em" style={{ margin: '0 .25rem' }}
        viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" transform="translate(4 2)">
            <path d="m8.5 2.5-1.978-2-2.022 2"/>
            <path d="m6.5.5v9"/>
            <path d="m3.5 4.5h-1c-1.1045695 0-2 .8954305-2 2v7c0 1.1045695.8954305 2 2 2h8c1.1045695 0 2-.8954305 2-2v-7c0-1.1045695-.8954305-2-2-2h-1"/>
          </g>
        </svg>→ Add to Home Screen
      </span>
      <span className='center-row'>
        Android Chrome →
        {/* https://www.svgrepo.com/svg/345223/three-dots-vertical */}
        <svg width="1em" height="1em" style={{ margin: '0 .25rem' }}
        viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
        </svg>→ Add to Home Screen
      </span>
    </div>
    <HalfLine />
    <div className='row wide end'>
      <InfoButton onClick={close}>close</InfoButton>
    </div>
  </InfoBody>
</>)

export const NiceModal = ({ children, on_close=undefined, block=true }) => {
  return <Modal outerClose={on_close} block={block}>
    <div id='game-modal'>
      <Style>
        <InfoBody>
          {children}
        </InfoBody>
      </Style>
    </div>
  </Modal>
}

export const create_tile_bag = (state={tiles:[]}) => {
  // bananagrams
  // const bag = {
  //   a: 13,
  //   b: 3,
  //   c: 3,
  //   d: 6,
  //   e: 18,
  //   f: 3,
  //   g: 4,
  //   h: 3,
  //   i: 12,
  //   j: 2,
  //   k: 2,
  //   l: 5,
  //   m: 3,
  //   n: 8,
  //   o: 11,
  //   p: 3,
  //   q: 2,
  //   r: 9,
  //   s: 6,
  //   t: 9,
  //   u: 6,
  //   v: 3,
  //   w: 3,
  //   x: 2,
  //   y: 3,
  //   z: 2,
  // }
  const bag = {
    letters: {
      // scrabble
      // a: 9,
      // b: 2,
      // c: 2,
      // d: 4,
      // e: 12,
      // f: 2,
      // g: 3,
      // h: 2,
      // i: 9,
      // j: 1,
      // k: 1,
      // l: 4,
      // m: 2,
      // n: 6,
      // o: 8,
      // p: 2,
      // q: 1,
      // r: 6,
      // s: 4,
      // t: 6,
      // u: 4,
      // v: 2,
      // w: 2,
      // x: 1,
      // y: 2,
      // z: 1,

      // custom
      a: 9,
      b: 2,
      c: 2,
      d: 4,
      e: 12,
      f: 2,
      g: 3,
      h: 2,
      i: 9,
      j: 1,
      k: 1,
      l: 4,
      m: 2,
      n: 6,
      o: 8,
      p: 2,
      q: 1,
      r: 6,
      s: 4,
      t: 6,
      u: 4,
      v: 2,
      w: 2,
      x: 1,
      y: 2,
      z: 1,
    },
    pick: () => {
      const letter = rand.weighted(bag.letters)
      bag.letters[letter] -= 1
      update_total()
      return letter
    },
    total: undefined,
  }
  keys(bag.letters).map(k => bag.letters[k] += .5)

  state.tiles.map(tile => {
    if (tile.letter) {
      bag.letters[tile.letter] = Math.max(0, (bag.letters[tile.letter]||0) - 1)
    }
  })

  const update_total = () => {
    bag.total = maths.sum(values(bag.letters))
  }
  update_total()

  return bag
}
window['create_tile_bag'] = create_tile_bag
