import React from 'react'
import { A } from 'src/components/A'
import { Modal, openPopup } from 'src/components/Modal'
import { S } from 'src/lib/util'
import { Style } from './style'
import { HalfLine, InfoBody, InfoButton } from 'src/components/Info'
import { create_game, is_local_player } from './data'
import { is_ai } from './ai'
import api from 'src/lib/api'
import user from 'src/lib/user'
import url from 'src/lib/url'
import { store } from 'src/lib/store'

const { named_log, rand, set, maths, keys, values, list, defer } = window as any
const log = named_log('petals util')


export const named_colors = {
  red: '#ff4243',
  orange: '#ff8601',
  yellow: '#ffcd3f',
  green: '#69e100',
  blue: '#33b6e7',
  dark_blue: '#4444ff',
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
  icon: named_icons.fox,
}]

export const PlayerName = ({ name, profile, arrow=false, zoom=1, stats=false, icon_only=false, icon_click=undefined, handle=undefined, info_id=undefined, do_reaction=undefined, reaction=undefined }) => {
  // const base_jsx = name ? <A href={stats ? `/petals/stats/${name}` : `/u/${name}`}>{name}</A> : 'invite'
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
      ? <A href={`/petals/game-stats/${info_id}/${name}`}>{name}</A>
      : <a onClick={e => handle.open_stats(name)}>{name}</a>
    : <A href={stats ? `/petals/stats/${name}` : `/u/${name}`}>{name}</A>
  : 'invite'
  const name_jsx = arrow ? <span>{'>'} {base_jsx} {'<'}</span> : base_jsx
  return <div className='petals-player-name grow middle-column' style={S(`
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
            {[...(settings?.petals?.reacts || '😀😎😭🫠😈')].map((reaction, i, ar) => {
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
              url.push('/settings/petals')
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
      api.post(`/petals/game/${info.id}/react`, { reaction })
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
  <InfoBody id='petals-menu-about' className='middle-column'>
    <img src='/raw/images/icon-petals.png' width={128} style={S(`
    border: 1px solid #000;
    image-rendering: pixelated;
    `)} />
    <HalfLine />
    <div>petals: a turn-based word game developed by me!</div>
    <HalfLine />
    <div className='row wide end'>
      <InfoButton onClick={close}>close</InfoButton>
    </div>
  </InfoBody>
</>)
export const open_howto = ({ handle, viewer }) => open_popup(close => <>
  <InfoBody id='petals-menu-howto' className='column'>
    <div><b>/petals - word strategy game</b></div>
    <HalfLine />
    <div className='column' style={S(`font-size: .8em`)}>
      {/* <div><b>2-player, turn-based, untimed</b> (timed → soon)</div> */}
      {/* <HalfLine /> */}
      {/* <div>capture more tiles than your opponent to win!</div> */}
      <div>to win, <b>get 11 points without going over!</b></div>
      {/* <div>5x5 board of letters</div> */}
      {/* <HalfLine /> */}
      {/* <div>spell words using any tiles on the board. keep any 'unlocked' tiles. lock a tile by owning it and surrounding tiles</div> */}
      {/* <div>spell words using any tiles on the board</div>
      <div>keep any 'unlocked' tiles</div>
      <div>lock a tile by owning it and surrounding tiles</div> */}
      <HalfLine />
      <div
      // style={S(`text-align:left;border:1px solid currentcolor;padding:.25em;border-radius:.25em;`)}
      style={S(`text-align:left`)}
      >
        <div>• spell words using any tiles on the board</div>
        <div>• you score a point for each group you own</div>
        <div>• you go back to 5 if you go over 11</div>
        <div>• unused tiles get randomized</div>
      </div>
      {/* <HalfLine /> */}
      {/* <HalfLine /> */}
      {/* <InfoButton disabled>tutorial (coming soon)</InfoButton> */}
      {/* <InfoButton onClick={async e => {
        store.set('petals-ai-speedy-ms', 100)
        store.set('petals-tutorial-start', true)
        handle.open(await create_game(undefined, [viewer, 'speedy'], true))
        close()
      }}>play tutorial</InfoButton> */}
      {/* <HalfLine />
      <HalfLine />
      <div>triplepress for 3-player games</div> */}
    </div>
    <HalfLine />
    <div className='column' style={S(`font-size: .8em; border: 1px solid currentcolor; padding: .5em; border-radius: .25em;`)}>
      <b>install</b>
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
      {/* <span className='center-row'>use Telegram for native notifs (@&nbsp;<A tab href='/notify' />)</span> */}
      <span className='center-row'><b>use Telegram for native notifications</b></span>
      <span className='center-row'>(set up at&nbsp;<A tab href='/notify' />)</span>
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
    pick: (pick=undefined) => {
      const letter = pick || rand.weighted(bag.letters)
      bag.letters[letter] -= 1
      update_total()
      return letter
    },
    total: undefined,
  }
  // keys(bag.letters).map(k => bag.letters[k] += .5)
  // keys(bag.letters).map(k => bag.letters[k] = Math.pow(bag.letters[k], .875))
  keys(bag.letters).map(k => bag.letters[k] = 2 * Math.pow(bag.letters[k], .5))

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
