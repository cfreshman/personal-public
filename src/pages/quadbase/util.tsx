import React from 'react'
import { A } from 'src/components/A'
import { Modal, openPopup } from 'src/components/Modal'
import { S } from 'src/lib/util'
import { Style } from './style'
import { HalfLine, InfoBody, InfoButton } from 'src/components/Info'
import { is_local_player } from './data'

const { rand, set, maths, keys, values } = window as any


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
}, {
  color: named_colors.green,
  icon: named_icons.frog,
}, {
  color: named_colors.yellow,
  icon: named_icons.fox,
}]

export const PlayerName = ({ name, profile, arrow=false, strike=false, zoom=1, stats=false, icon_only=false, icon_click=undefined, handle=undefined, info_id=undefined }) => {
  // const base_jsx = name ? <A href={stats ? `/quadbase/stats/${name}` : `/u/${name}`}>{name}</A> : 'invite'
  const base_jsx = name 
  ? 
    is_local_player(name)
    ? name
    // : is_ai(name) && !handle
    // ? name // `bot: ${name}`
    : stats && handle 
    ? 
      info_id
      ? <A href={`/quadbase/game-stats/${info_id}/${name}`}>{name}</A>
      : <a onClick={e => handle.open_stats(name)}>{name}</a>
    : <A href={stats ? `/quadbase/stats/${name}` : `/u/${name}`}>{name}</A>
  : 'invite'
  const name_jsx = strike ? <span style={S(`text-decoration:line-through`)}>{base_jsx}</span> : arrow ? <span style={S(`
  white-space: pre;
  display: flex;
  `)}>{'> '}<span style={S(`
  flex-shrink: 1;
  overflow: hidden;
  text-overflow: ellipses;
  `)}>{base_jsx}</span>{' <'}</span> : base_jsx
  return <div className='quadbase-player-name grow middle-column' style={S(`
  font-size: ${zoom}em;
  `)}>
    {icon_only ? null : name_jsx}
    <span className={`player-icon ${icon_click?'click':''}`} style={S(`
    background: ${profile.color};
    `)} onClick={icon_click}>{profile.icon}</span>
  </div>
}
export const PlayerNameFromInfo = ({ owner, info, gameover, profiles, icon_click, handle }) => {
  return <PlayerName {...{
    name: info[`p${owner}`],
    profile: profiles[owner],
    arrow: !gameover && info.owner === owner,
    strike: (info.out||{})[owner] <= info.turn,
    stats: true,
    // info_id: info.id,
    icon_click, handle,
  }} />
}

export const open_popup = (closable_jsx) => openPopup(close => <Style>
  {closable_jsx(close)}
</Style>, `
height: max-content;
width: max-content;
`)
export const open_about = () => open_popup(close => <>
  <InfoBody id='quadbase-menu-about' className='middle-column'>
    <img src='/raw/quadbase/icon.png' width={128} />
    <div>quadbase is an original game for 4 players based on two discontinued word games, Wordbase and Capitals</div>
    <HalfLine />
    <div className='row wide end'>
      <InfoButton onClick={close}>close</InfoButton>
    </div>
  </InfoBody>
</>)
export const open_howto = () => open_popup(close => <>
  <InfoBody id='quadbase-menu-howto' className='middle-column'>
    <div><b>quadbase - 4-player word strategy game</b></div>
    <HalfLine />
    <div className='center-column' style={S(`font-size: .8em`)}>
      <div>gain territory, cut off your opponents and take their bases to win!</div>
      <HalfLine />
      <div>you can spell words in any order as long as the new tiles connect back to your base (you can't use tiles you already own)</div>
      <HalfLine />
      <div>defend on all fronts. play a tile in an opponent's base to capture it. you are eliminated once you have no bases left</div>
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

      // double bananagrams
      a: 26,
      b: 6,
      c: 6,
      d: 12,
      e: 36,
      f: 6,
      g: 8,
      h: 6,
      i: 24,
      j: 4,
      k: 4,
      l: 10,
      m: 6,
      n: 16,
      o: 22,
      p: 6,
      q: 4,
      r: 18,
      s: 12,
      t: 18,
      u: 12,
      v: 6,
      w: 6,
      x: 4,
      y: 6,
      z: 4,
    },
    pick: () => {
      const letter = rand.weighted(bag.letters)
      bag.letters[letter] -= 1
      update_total()
      return letter
    },
    total: undefined,
  }
  // keys(bag.letters).map(k => bag.letters[k] += 1)

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
