import React from 'react'
import { A } from 'src/components/A'
import { Modal, openPopup } from 'src/components/Modal'
import { S } from 'src/lib/util'
import { Style } from './style'
import { HalfLine, InfoBody, InfoButton } from 'src/components/Info'
import { Info, State, Tile, create_game, get_n_users, is_local_player } from './data'
import { is_ai } from './ai'
import api from 'src/lib/api'
import user from 'src/lib/user'
import url from 'src/lib/url'
import { store } from 'src/lib/store'

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
}, {
  color: named_colors.green,
  icon: named_icons.fox,
}, {
  color: named_colors.yellow,
  icon: named_icons.fish,
}, {
  color: named_colors.purple,
  icon: named_icons.frog,
}, {
  color: named_colors.orange,
  icon: named_icons.ladybug,
}]

export const PlayerName = ({ name, profile, arrow=false, strike=false, zoom=1, stats=false, icon_only=false, icon_click=undefined, handle=undefined, info_id=undefined, do_reaction=undefined, reaction=undefined }) => {
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
      ? <A href={`/lettercomb/game-stats/${info_id}/${name}`}>{name}</A>
      : <a onClick={e => handle.open_stats(name)}>{name}</a>
    : <A href={stats ? `/lettercomb/stats/${name}` : `/u/${name}`}>{name}</A>
  : 'invite'
  const name_jsx = strike ? <span style={S(`text-decoration:line-through`)}>{base_jsx}</span> : arrow ? <span>{'>'} {base_jsx} {'<'}</span> : base_jsx
  return <div className='capitals-player-name grow middle-column' style={S(`
  font-size: ${zoom}em;
  `)}>
    {icon_only ? null : name_jsx}
    <span className={`player-icon ${icon_click||do_reaction?'click':''}`} style={S(`
    background: ${profile?.color||'#000'};
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
      {profile?.icon||'👶'}
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
    strike: info.out ? info.out[info[`p${owner}`]] <= display_turn_i : (display_turn_i === info.turn && info.status > -1 && owner !== info.status),
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
  <InfoBody id='capitals-menu-about'>
    <div className='column gap' style={S(`gap:2em;`)}>
      <div className='row gap wide between' style={S(`align-items:center;gap:1em;justify-content:space-between`)}>
        <div className='column start'>
          <div><A tab href='https://en.wikipedia.org/wiki/NimbleBit'>NimbleBit</A> released Capitals for iOS in 2015: <A tab href='https://www.youtube.com/watch?v=vckV_9Qb9uE'>Capitals - Free Word Battle (YouTube)</A></div>
          {/* <div><A tab href='https://www.youtube.com/watch?v=vckV_9Qb9uE'>Capitals - Free Word Battle (YouTube)</A></div> */}
        </div>
        <img src='/raw/capitals/original-logo.png' style={S(`width: 4em;`)}/>
      </div>
      <div className='row gap wide between' style={S(`align-items:center;gap:1em;justify-content:space-between`)}>
        <div className='column start'>
          <div>but <A tab href='https://support.nimblebit.com/support/solutions/articles/150000013114-retired-games'>they retired it</A> so I remade it - for the web! (March 2024)<br/>(similar to <A tab href='/wordbase'/>)</div>
          {/* <div></div> */}
        </div>
        <img src='/raw/capitals/icon.png' style={S(`width: 4em;`)} />
      </div>
      <HalfLine />
      <div className='row gap' style={S(`align-items:center;gap:1em;`)}>
        <div className='column start'>
          <div>June 2024 update: they just <A tab href='https://apps.apple.com/us/app/capitals-word-game/id6499354232?uo=2'>re-released it</A> across iOS/iPad/macOS!?</div>
          {/* <A tab href='https://apps.apple.com/us/app/capitals-word-game/id6499354232'><img src='/raw/capitals/actual_new_version.png' style={S(`height: 10em; border-radius: .25em; border:1px solid currentcolor`)}/></A> */}
          
          <HalfLine />
          <div>I do like my version:</div>
          <div style={S(`text-align:left;border:1px solid currentcolor;padding:.25em;border-radius:.25em;`)}>
            <div>- cross-platform web app</div>
            <div>- 3-try limit, not disabled submit</div>
            <div>- <A tab href='/notify'>cross-platform Telegram notifs</A></div>
            <div>- chat</div>
          </div>
          <div>but it's officially back! I reached out and had to change this from <A tab href='/capitals'/> to <A tab href='/lettercomb'/></div>
        </div>
      </div>
    </div>
    <HalfLine />
    <HalfLine />
    {/* <div>June 2024 update: um they just <a href='https://apps.apple.com/us/app/capitals-word-game/id6499354232?uo=2'>re-released it</a> across iOS/iPad/macOS!?<br/><br/>i do actually like mine better bc it works across my phone/laptop and does a try limit instead requiring actual words to submit but you can play an official again now</div> */}
    
    {/* <div>Music for this remake was found on <a href='https://www.chosic.com/free-music/lofi/?sort=&attribution=no&duration='>Chosic</a></div>
    <div>
      (you can turn it off too: <InfoButton onClick={e => {
        close()
        url.push('/settings/capitals')
      }}>settings</InfoButton>)
    </div> */}
    <div className='row wide end'>
      <InfoButton onClick={close}>close</InfoButton>
    </div>
  </InfoBody>
</>)
export const open_howto = ({ handle, hf, viewer }) => open_popup(close => <>
  <InfoBody id='capitals-menu-howto' className='column'>
    <div><b>/lettercomb - word strategy game</b></div>
    {/* <div><b>/lettercomb</b></div> */}
    <HalfLine />
    <div className='column' style={S(`font-size: .8em`)}>
      {/* <div><i>turn-based word spelling</i></div> */}
      {/* <div><i>it's kinda like Scrabble</i></div> */}
      {/* <HalfLine /> */}
      {/* <HalfLine /> */}
      {/* <div><b>2-player, turn-based, untimed</b> (timed → soon)</div> */}
      {/* <div>2-player, turn-based, untimed</div> */}
      {/* <HalfLine /> */}
      {/* <div>board of hex 45 tiles, start in opposite corners</div> */}
      {/* <div>expand your territory and</div> */}
      <div><b>eliminate your enemy's tiles to win</b></div>
      <div>(turn-based)</div>
      <HalfLine />
      <div>play words using any letters on the board</div>
      <div
      // style={S(`text-align:left;border:1px solid currentcolor;padding:.25em;border-radius:.25em;`)}
      style={S(`text-align:left;`)}
      >• you'll keep tiles connected to yours<br/>• enemy will lose any touching those</div>
      <HalfLine />
      <div>remove other capital for extra turn</div>
      {/* <div>- that's usually the end of the game!</div> */}
      <HalfLine />
      {/* <HalfLine /> */}
      {/* <InfoButton disabled>tutorial (coming soon)</InfoButton> */}
      <InfoButton onClick={async e => {
        store.set('capitals-ai-speedy-ms', 100)
        handle.open(await create_game(hf, [viewer, 'speedy'], true))
        close()
      }}>play 'speedy' on easy</InfoButton>
      {/* <HalfLine />
      <HalfLine />
      <div>tripitals for 3-player games. hexitals for 6</div> */}
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

export const create_tile_bag = (state:{tiles:Tile[]},info:Info) => {
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

  const n_users = get_n_users(info)
  const bag = {
    letters: n_users === 6 ? {
      a: 13,
      b: 3,
      c: 3,
      d: 6,
      e: 18,
      f: 3,
      g: 4,
      h: 3,
      i: 12,
      j: 2,
      k: 2,
      l: 5,
      m: 3,
      n: 8,
      o: 11,
      p: 3,
      q: 2,
      r: 9,
      s: 6,
      t: 9,
      u: 6,
      v: 3,
      w: 3,
      x: 2,
      y: 3,
      z: 2,
    } : {
      // scrabble
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
  // custom reweighting to spawn more uncommon tiles
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
