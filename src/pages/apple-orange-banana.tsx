/*

u get up to 8 fruits per day. based on what u planted on ur 8 plots of land. can only bring one type to market per day.
open (to other players) any price. closed (to the local lord) 100 gold or 1 min per fruit type. unless only seller, then always 1
fruits keep 1 week. get the most gold. public leaderboard
*/

import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { dev, S } from 'src/lib/util'
import { openLogin } from 'src/lib/auth'
import { Modal, openPopup } from 'src/components/Modal'
import { store } from 'src/lib/store'
import { useRoom } from 'src/lib/socket'

const { named_log, entries, values, strings, Q, range:list_range, V, rand, list, set, range, lists, maths } = window as any
const NAME = 'AOB'
const log = named_log(NAME)

const open_popup = (closer) => openPopup(close => <PopupStyle>{closer(close)}</PopupStyle>, `height: fit-content; width: fit-content; padding: 0; border: 0; box-shadow: 0 2px currentcolor !important;`)

const AOB_Section = ({ label, children, collapsable, close }: { children, label?, collapsable?, close? }) => {
  const [collapsed, set_collapsed] = typeof collapsable === 'string' ? store.use(`aob-collapsable-${collapsable}`, { default:false }) :  useS(false)

  return  <div className={`section collapsed-${collapsed}`}>
    <div className='section-header'>
      {label ? <label className='section-label'>{label}</label> : null}
      {collapsable ? <button className='section-collapse' onClick={e => set_collapsed(!collapsed)}>{collapsed ? `↓` : '↑'}</button> : null}
      {close ? <>
        <div className='spacer' />
        <button onClick={e => close()}>close</button>
      </> : null}
    </div>
    {collapsed ? null : children}
  </div>
}

const PLOTS = ['NW', 'N', 'NE', 'W', 'E', 'SW', 'S', 'SE']
const plot_i_to_k = (i) => PLOTS[i]
const plot_k_to_i = (k) => PLOTS.indexOf(k)

const ACTIONS = {
  HARVEST: 'harvet',
  PLANT: 'plant',
  SELL: 'sell',
  BULK: 'bulk',
  MARKET: 'market',
  VIEW: 'view',
  FARM: 'farm',
  BOARD: 'board',
}

const COLORS = {
  DIRT: 'var(--abo-dirt)',
  WATER: 'var(--abo-water)',
}

const CHOICES = {
  APPLE: 'apple',
  ORANGE: 'orange',
  BANANA: 'banana',
  NEW: 'new',
}

const DEFAULT_FRUITS = {
  apple: { name:'apple', emoji:'🍎', angle:0 },
  orange: { name:'orange', emoji:'🍊', angle:120 },
  banana: { name:'banana', emoji:'🍌', angle:240 },
}
const FruitWheel = ({ fruits, style, ...props }) => {
  const single = fruits.length === 1 ? fruits[0] : false
  return <div {...props} style={S(`
  margin: 1.5em;
  border: 1px solid currentcolor;
  border-radius: 50%;
  position: relative;
  ${style};
  aspect-ratio: 1/1;
  display: flex; align-items: center; justify-content: center;
  `)}>
    {/* {single ? <div style={S(`
    position: absolute;
    width: 50%; height: 1px;
    left: 50%; top: calc(50% - .5px);
    background: var(--id-color-text);
    transform-origin: 0;
    rotate: ${single.angle - 90}deg;
    opacity: .2;
    `)}></div> : null} */}
    {range(3).map(i => {
      return <div style={S(`
      position: absolute;
      width: 50%; height: 1px;
      left: 50%; top: calc(50% - .5px);
      background: var(--id-color-text);
      transform-origin: 0;
      rotate: ${i * 120 - 90}deg;
      opacity: .33;
      `)}></div>
    })}
    {[DEFAULT_FRUITS.apple, DEFAULT_FRUITS.orange, DEFAULT_FRUITS.banana, ...fruits].map((x, i) => {
      const is_default = i < 3
      const o = V.p((x.angle - 90) * Math.PI / 180, is_default ? 25 : 50).ad(V.ne(50, 50))
      return <div style={S(`
      font-size: 2em;
      // border: 1px solid currentcolor;
      height: 1.5em; width: 1.5em;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      position: absolute;
      top: calc(${o.y}% - .75em);
      left: calc(${o.x}% - .75em);
      background: var(--id-color);
      border: 1px solid currentcolor;
      `)}>{x.emoji||'📦'}</div>
    })}
    {/* {single ? <div style={S(`
    rotate: ${single.angle - 90}deg;
    font-size: 1em;
    `)}>→</div> : null} */}
  </div>
}

const Onboarding = ({ viewer, data, handle }) => {
  const [choice, set_choice] = useS(undefined)
  const fill_choice = (value) => ({ type:'radio', name:'actions', onChange:(e => set_choice(e.target.value)), checked:choice===value, value })

  const [custom, set_custom] = useS({
    name: '',
    emoji: '',
    angle: 0,
  })
  const [taken, set_taken] = useS({
    name: false,
    emoji: false,
  })
  useF(custom.name, custom.emoji, async () => {
    const { taken } = await api.post('/aob/taken', { fruit:custom })
    set_taken(taken)
  })

  return <>
    <AOB_Section label='select your starter'>
      <div className='column gap'>
        <label className='action-option'><input {...fill_choice(CHOICES.APPLE)} />&nbsp;<span>
          apple 🍎
        </span></label>
        <label className='action-option'><input {...fill_choice(CHOICES.ORANGE)} />&nbsp;<span>
          orange 🍊
        </span></label>
        <label className='action-option'><input {...fill_choice(CHOICES.BANANA)} />&nbsp;<span>
          banana 🍌
        </span></label>
        <label className='action-option'><input {...fill_choice(CHOICES.NEW)} />&nbsp;<span>
          {custom.name && custom.emoji && custom.angle ? `${custom.name} ${custom.emoji}` : 'new fruit 📦'}
        </span></label>
        <button disabled={!choice || (taken.name || taken.emoji)} onClick={async e => {
          if (!viewer) {
            openLogin()
            return
          }
          let starter = {
            ...(DEFAULT_FRUITS[choice] || custom),
            type: 'fruit',
          }
          data.inventory.push(starter)
          data.started = true
          handle.save_data(data)
          await api.post('/aob/fruit', { fruit:custom })
        }}>continue with selected fruit</button>
      </div>
    </AOB_Section>
    <HalfLine />
    <AOB_Section label='new fruit editor'>
      <div className='column wide gap'>
        <div>
          <input placeholder='name new fruit' value={custom.name} onChange={e => set_custom({ ...custom, name:e.target.value.toLowerCase() })} />
          {taken.name ? <>&nbsp;<span>taken :/</span></> : null}
        </div>
        <div>
          <input placeholder='emoji for new fruit' value={custom.emoji} onChange={e => set_custom({ ...custom, emoji:[...e.target.value].slice(-1)[0]||'' })} />
          {taken.emoji ? <>&nbsp;<span>taken :/</span></> : null}
        </div>
        drag to place on fruit continuum:
        <input type='range' style={S(`
        width: min(30em, 100%);
        `)} value={custom.angle} min={0} max={360} onChange={e => set_custom({ ...custom, angle:Number(e.target.value) })} />
        <FruitWheel {...{ fruits:[custom], style:`
        width: min(30em, calc(100% - 3em));
        ` }} />
      </div>
    </AOB_Section>
  </>
}

const MODALS = {
  MARKET: 'market',
  VIEW: 'view',
  BOARD: 'board',
}
const Market = ({ data, fruits, gold, handle, close }) => {
  const [tab, set_tab] = store.use('aob-tab', { default:0 })

  const [name, set_name] = useS(fruits[0])
  const [price, set_price] = useS(1)
  const fruit = useM(name, () => data.inventory.find(x => x.name === name))

  const [market, set_market] = useS(undefined)

  handle = {
    ...handle,
    load_market: async () => {
      const { list } = await api.get('/aob/market')
      set_market(list.filter(x => x.fruit))
    },
  }

  useF(tab, () => {
    if (tab === 0) {
      handle.load_market()
    }
  })

  return <div style={S(`
  width: min(300px, 90vw);
  min-width: max-content;
  max-width: 90vw;
  min-height: min(400px, 90vh);
  `)}>
    <div className='row wide' style={S(`
    justify-content: center;
    gap: .5em;
    
    justify-content: flex-end;
    `)}>
      {/* {['BUY', 'SELL'].map((x, i) => i === tab ? <div>{x}</div> : <button>{x}</button>)} */}
      <div>{gold} gold 🟡</div>
      <div className='spacer' />
      {/* {['BUY', 'SELL'].map((x, i) => i !== tab ? <button>{x}</button> : null)} */}
      {['buy', 'sell'].map((x, i) => <button className={i === tab ? 'on' : ''} onClick={e => set_tab(i)}>{x}</button>)}
    </div>
    <HalfLine />
    {tab === 0 ? <>
      <AOB_Section label='market' close={close}>
        {!market ? 'loading...'
        : !market.length ? 'no items today'
        : <div className='column gap'>
          {market.map(x => {
            return <div className='row wide gap'>
              <button disabled={x.price > gold} onClick={async e => {
                data.inventory.push(x.fruit)
                let pay = x.price
                data.inventory = data.inventory.slice().reverse().filter(x => {
                  if (pay && x.name === 'gold') {
                    pay -= 1
                    return false
                  }
                  return true
                }).reverse()
                await api.get(`/aob/buy/${x.id}`)
                await handle.save_data(data)
                await handle.load_market()
              }}>
                buy {x.fruit.name} {x.fruit.emoji} for {x.price} gold
              </button>
              <button onClick={() => {
                open_popup(close_2 => <FruitsViewer {...{ fruits:[x.fruit], close:close_2 }} />)
              }}>wheel</button>
            </div>
          })}
        </div>}
      </AOB_Section>
    </> : <>
      <AOB_Section label='sell a fruit' close={close}>
        {0 ? 'coming soon'
        : data.sold ? `you've already sold fruit today`
        : <div className='column gap'>
          <HalfLine />
          <div><span>
            <select id='abo-market-fruit' value={name} onChange={e => set_name(e.target.value)}>{fruits.map(x => <option value={x}>{x}</option>)}</select> for <input id='abo-market-price' type='number' min={1} max={1e9} value={price} onChange={e => set_price(Number(e.target.value))}></input> gold
          </span></div>
          <HalfLine />
          <button disabled={!fruit} onClick={async e => {
            let sell = 1
            data.inventory = data.inventory.slice().reverse().filter(x => {
              if (sell && x.name === fruit.name) {
                sell -= 1
                return false
              }
              return true
            }).reverse()
            const { listing } = await api.post('/aob/sell', { fruit, price })
            data.sold = listing.id
            await handle.save_data(data)
            close()
          }}>send to market {fruit?.emoji}</button>
        </div>}
      </AOB_Section>
    </>}
  </div>
}
const Leaderboard = ({ data, handle, close }) => {
  const [board, set_board] = useS(undefined)

  handle = {
    ...handle,
    load_board: async () => {
      const { board } = await api.get('/aob/board')
      set_board(board)
    },
  }
  useF(handle.load_board)

  return <div style={S(`
  width: min(300px, 90vw);
  min-height: min(400px, 90vh);
  `)}>
    <AOB_Section label='leaderboard' close={close}>
      {!board ? 'loading...'
      : <div className='column gap'>
        {board.map(x => {
          return <div>{x.user} has {x.gold} gold 🟡</div>
        })}
      </div>}
    </AOB_Section>
  </div>
}
const FruitsViewer = ({ fruits, close }) => {
  const fruit = fruits.length === 1 ? fruits[0] : false
  return <div style={S(`
  // min-height: 400px;
  min-width: 300px;
  `)}>
    <AOB_Section label={fruit ? `${fruit.name} ${fruit.emoji}` : 'fruit wheel'} close={close}>
      <div className='column wide gap'>
        <FruitWheel {...{ fruits, style:`
        width: min(30em, calc(100% - 3em));
        ` }} />
      </div>
    </AOB_Section>
  </div>
}
const Game = ({ data, handle }) => {
  const [counts, items] = useM(data, () => {
    const counts = {gold:0}
    const items = {gold:{emoji:'🟡'}}
    data.inventory.slice().reverse().map(x => {
      if (!counts[x.name]) counts[x.name] = 0
      counts[x.name] += 1
      items[x.name] = x
    })
    return [counts, items]
  })
  const fruits = useM(items, () => {
    // return values(items).filter(x => x.type === 'fruit').map(x => x.name)
    return values(items).filter(x => x.name !== 'gold').map(x => x.name)
  })
  const plot_fruits = useM(data, () => {
    const set = new Set()
    data.plots.map(x => x.fruit && set.add(x.fruit.name))
    return [...set]
  })

  const [action, set_action] = store.use('aob-action', { default:undefined })
  const fill_action = (value) => ({ type:'radio', name:'actions', onChange:(e => set_action(e.target.value)), checked:action===value, value })
  useF(() => {
    Q('[name=actions]').click()
    Q('#abo-sell-count').value = 1
  })

  const [modal, set_modal] = useS(undefined)
  const [view_fruits, set_view_fruits] = useS(undefined)
  useF(view_fruits, () => set_modal(view_fruits ? MODALS.VIEW : undefined))
  useF(modal, () => !modal && set_view_fruits(undefined))

  const [sel_plot, set_sel_plot] = useS(-1)
  const sel_fruit = useM(sel_plot, data.plots, () => {
    const { fruit } = data.plots[sel_plot] || {}
    return fruit
  })
  const has_sel_plot = sel_plot > -1

  const view_fruits_objects = useM(data, () => {
    const fruits = {}
    data.plots.map(x => {
      if (x.fruit) {
        fruits[x.fruit.name] = x.fruit
      }
    })
    data.inventory.map(x => {
      if (x.type === 'fruit') {
        fruits[x.name] = x
      }
    })
    return values(fruits)
  })

  const { bulk_gold, bulk_bonus } = useM(items, counts, fruits, () => {
    if (!fruits.length) return { bulk_gold:0, bulk_bonus:0 }
    const fruit_objects = fruits.map(name => items[name])
    // give bonus based on percent of circle covered by fruits
    // basically, keep track of count over 360deg - 1/8
    // if 8 fruits perfectly cover circle, 7 bonus
    // 16 perfectly cover - 14 bonus
    
    const degrees = range(360).map(i => 0)
    fruit_objects.map(x => {
      const start = (Math.round(x.angle - 360/16) + 360) % 360
      const end = start + 360/8
      for (let i = start; i < end; i++) {
        degrees[i % 360] += counts[x.name]
      }
    })
    const raw_total = maths.sum(degrees)
    const max_fruit = lists.maxxing(fruits, x => counts[x])
    const minus_max = raw_total - counts[max_fruit] * 360/8
    const circles_covered = minus_max / (360 * 7/8)
    const bonus = Math.floor(circles_covered * 7)

    const total_fruit = maths.sum(fruits.map(x => counts[x]))
    const gold = total_fruit + bonus
    
    return {
      bulk_gold: gold,
      bulk_bonus: bonus,
    }
  })

  return <>
    {modal ? <Modal outerClose={e => set_modal(undefined)}><PopupStyle>{
      modal === MODALS.MARKET ? <Market {...{ data, gold:counts.gold, fruits, handle, close:()=>set_modal(undefined) }} />
      : modal === MODALS.VIEW ? <FruitsViewer {...{ fruits:view_fruits, close:()=>set_modal(undefined) }} />
      : modal === MODALS.BOARD ? <Leaderboard {...{ data, handle, close:()=>set_modal(undefined) }} />
      : null
    }</PopupStyle></Modal> : null}
    <div className='row wide' style={S(`
    gap: 1em;
    `)}>
      <div className='row wrap' style={S(`
      font-size: 3em;
      line-height: .6;
      gap: 1px;
      max-width: calc(3em + 2px);
      user-select: none;
      `)}>
        {data.plots.map((plot, i) => {
          plot = {
            ready: false,
            ...(plot||{}),
          }
          const fruit = {
            emoji: '',
            ...(plot.fruit||{})
          }
          // return <div style={S(`
          // color: ${plot.color};
          //   `)}>{plot.text}</div>
          return <>
            {i === 4 ? <div className='middle-row' style={S(`
            background: ${COLORS.WATER};
            height: 1em;
            width: 1em;
            `)} /> : null}
            <div className='middle-row' style={S(`
            background: ${COLORS.DIRT};
            color: #fff;
            height: 1em;
            width: 1em;
            cursor: pointer;
            `)}
            onClick={e => set_sel_plot(sel_plot === i ? -1 : i)}
            >
              <span style={S(`
              font-size: .8em;
              ${!plot.ready ? `
              opacity: .5;
              filter: grayscale(1);
                ` : ''}
              `)}>{fruit.emoji}</span>
            </div>
          </>
        })}
      </div>
      {0&&has_sel_plot ? <div className='column gap' style={S(`
      // flex-grow: 1;
      // border: 1px solid currentcolor;
      // border-radius: .25em;
      // padding: .5em;
      // align-self: stretch;
      // padding: 0 .25em;
      `)}>
        {/* <div><b>{plot_i_to_k(sel_plot)} plot</b></div> */}
        {/* <div>{sel_fruit ? <>{sel_fruit.name} {sel_fruit.emoji}</> : 'nothing planted here'}</div> */}
        <button disabled={!sel_fruit?.ready}>{sel_fruit ? <>harvest {sel_fruit.name} {sel_fruit.emoji}</> : 'nothing planted here'}</button>
        {sel_fruit ? <button>dig up {sel_fruit.name} {sel_fruit.emoji}</button>
        : null}
      </div> : null}
      {0&&has_sel_plot ? <div style={S(`
      flex-grow: 1;
      align-self: stretch;
      // border: 1px solid currentcolor;
      // border-radius: .25em;
      // padding: .5em;
      // padding: 0 .25em;
      `)}>
        <AOB_Section label={!sel_fruit ? `${plot_i_to_k(sel_plot)} plot` : <span className='pre'>{plot_i_to_k(sel_plot)} plot: {sel_fruit.name} {sel_fruit.emoji}</span>}>
          <div className='column gap'>
            {!sel_fruit ? 'nothing planted here' : <>
              <button disabled={!sel_fruit?.ready}>{sel_fruit ? <>harvest</> : 'nothing planted here'}</button>
              {/* <button>dig up</button> */}
            </>}
          </div>
        </AOB_Section>
      </div> : null}
      {has_sel_plot ? <div className='column gap' style={S(`
      // flex-grow: 1;
      // border: 1px solid currentcolor;
      // border-radius: .25em;
      // padding: .5em;
      align-self: stretch;
      padding: 0 .25em;
      `)}>
        <div>{sel_fruit ? <>{sel_fruit.name} {sel_fruit.emoji}</> : <>nothing</>} planted {plot_i_to_k(sel_plot)}</div>
        {/* {sel_fruit && !values(DEFAULT_FRUITS).some(x => x.name === sel_fruit.name) ? <div style={S(`
        font-size: .67em;
        margin: 1.5em;
        height: min(30em, calc(100% - 3em)); aspect-ratio: 1/1;
        border: 1px solid currentcolor;
        border-radius: 50%;
        position: relative;
        `)}>
          {[DEFAULT_FRUITS.apple, DEFAULT_FRUITS.orange, DEFAULT_FRUITS.banana, sel_fruit].map(x => {
            const o = V.p((x.angle - 90) * Math.PI / 180, 50).ad(V.ne(50, 50))
            return <div style={S(`
            font-size: 2em;
            // border: 1px solid currentcolor;
            height: 1.5em; width: 1.5em;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
            position: absolute;
            top: calc(${o.y}% - .75em);
            left: calc(${o.x}% - .75em);
            background: var(--id-color);
            border: 1px solid currentcolor;
            `)}>{x.emoji||'📦'}</div>
          })}
        </div> : null} */}
      </div> : null}
    </div>
    {/* <div>+{Math.max(0, plot_fruits.length - 1)} bonus</div> */}
    <HalfLine />
    <AOB_Section label='inventory' collapsable='inventory'>
      {entries(counts).map(([name, count]) => {
        const item = items[name]||{}
        return <div>{count} {name} {item.emoji||''}</div>
      })}
    </AOB_Section>
    <AOB_Section label='actions'>
      <div className='column gap'>
        <button disabled={!action} onClick={async e => {
          if (action === ACTIONS.HARVEST) {
            const harvest = []
            data.plots.map(x => {
              if (x.ready) {
                harvest.push(strings.json.clone(x.fruit))
                x.ready = false
              }
            })
            data.inventory.push(...harvest)
            handle.save_data(data)
            await api.post('/aob', { data })
          } else if (action === ACTIONS.PLANT) {
            const fruit = Q('#abo-plant-fruit').value
            const plot = Q('#abo-plant-plot').value
            if (!fruit || !plot) return
            const instance = data.inventory.find(x => x.name === fruit)
            data.inventory = data.inventory.filter(x => x !== instance)
            const plot_i = plot_k_to_i(plot)
            data.plots[plot_i] = { ready:false, fruit:instance }
            log(fruit, plot, data)
            handle.save_data(data)
          } else if (action === ACTIONS.SELL) {
            const count = Number(Q('#abo-sell-count').value)
            const fruit = Q('#abo-sell-fruit').value
            if (!count || !fruit) return
            const actual_count = Math.min(count, counts[fruit])
            let sell = actual_count
            data.inventory = data.inventory.slice().reverse().filter(x => {
              if (sell && x.name === fruit) {
                sell -= 1
                return false
              }
              return true
            }).reverse()
            data.inventory.push(...list_range(actual_count).map(i => ({ name:'gold', emoji:'🟡' })))
            data.sold = true
            handle.save_data(data)
          } else if (action === ACTIONS.BULK) {
            const fruit_set = set(fruits)
            data.inventory = data.inventory.filter(x => !fruit_set.has(x.name))
            data.inventory.push(...list_range(bulk_gold).map(i => ({ name:'gold', emoji:'🟡' })))
            data.sold = true
            handle.save_data(data)
          } else if (action === ACTIONS.MARKET) {
            set_modal(MODALS.MARKET)
          } else if (action === ACTIONS.BOARD) {
            set_modal(MODALS.BOARD)
          } else if (action === ACTIONS.VIEW) {
            // set_modal(MODALS.VIEW)
            
            const fruit = Q('#abo-view-fruit').value
            set_view_fruits([view_fruits_objects.find(x => x.name === fruit)])
          } else if (action === ACTIONS.FARM) {
            const fruit_names = set(data.plots.map(x => x.fruit && x.fruit.name))
            set_view_fruits(view_fruits_objects.filter(x => fruit_names.has(x.name)))
          }
        }}>do selected action</button>
        <label className='action-option'><input {...fill_action(ACTIONS.HARVEST)} />&nbsp;<span>
          harvest fruits
        </span></label>
        {/* <label className='action-option'><input {...fill_action(ACTIONS.VIEW)} />&nbsp;<span>
          view <select id='abo-view-fruit'>{view_fruits_objects.map(x => x.name).map(x => <option value={x}>{x}</option>)}</select> profile
        </span></label>
        <label className='action-option'><input disabled={data.sold} {...fill_action(ACTIONS.SELL)} />&nbsp;<span>
          sell <input id='abo-sell-count' type='number' min={1}></input> <select id='abo-sell-fruit'>{fruits.map(x => <option value={x}>{x}</option>)}</select> for 1 gold each
        </span></label> */}
        <label className='action-option'><input {...fill_action(ACTIONS.FARM)} />&nbsp;<span>
          view farm on fruit wheel
        </span></label>
        <label className='action-option'><input disabled={data.sold} {...fill_action(ACTIONS.BULK)} />&nbsp;<span>
          sell all fruits for {bulk_gold} gold ({bulk_bonus} variety bonus)
        </span></label>
        {/* <label className='action-option'><input disabled={data.sold} {...fill_action(ACTIONS.SELL)} />&nbsp;<span>
          sell <input id='abo-sell-count' type='number' min={1}></input> <select id='abo-sell-fruit'>{fruits.map(x => <option value={x}>{x}</option>)}</select> for 1 gold each
        </span></label> */}
        <label className='action-option'><input {...fill_action(ACTIONS.MARKET)} />&nbsp;<span>
          go to market
        </span></label>
        <label className='action-option'><input {...fill_action(ACTIONS.VIEW)} />&nbsp;<span>
          view <select id='abo-view-fruit'>{fruits.map(x => <option value={x}>{x}</option>)}</select> on fruit wheel
        </span></label>
        <label className='action-option'><input {...fill_action(ACTIONS.PLANT)} />&nbsp;<span>
          plant <select id='abo-plant-fruit'>{fruits.map(x => <option value={x}>{x}</option>)}</select> on <select id='abo-plant-plot'>{[
            'NW', 'N', 'NE', 'W', 'E', 'SW', 'S', 'SE',
          ].map(x => <option value={x}>{x}</option>)}</select> plot
        </span></label>
        <label className='action-option'><input {...fill_action(ACTIONS.BOARD)} />&nbsp;<span>
          view leaderboard
        </span></label>
      </div>
      <HalfLine />
      <ul>
        <li>your fruits expire after 7 days</li>
        <li>the local lord will buy for 1 gold each. sell to other players for more</li>
        <li>you may only sell once per day</li>
      </ul>
    </AOB_Section>
  </>
}

export default () => {
  const [{user:viewer}] = auth.use()

  // const [data, set_data] = useS(undefined && {
  //   user: 'cyrus',
  //   plots: [{ ready:false, fruit:{ name:'apple', type:'fruit', emoji:'🍎' } }, 0, 0, 0, 0, 0, { ready:true, fruit:{ name:'banana', type:'fruit', emoji:'🍌' }}, 0] as any,
  //   inventory: [{ name:'apple', type:'fruit', emoji:'🍎' }, { name:'apple', type:'fruit' }, { name:'apple', type:'fruit', emoji:'🍎' }, { name:'orange', type:'fruit', emoji:'🍊' }, { name:'banana', type:'fruit', emoji:'🍌' }],
  // })
  const [data, set_data] = useS(undefined)

  const handle = {
    load_data: async () => {
      const { data } = await api.get('/aob')
      set_data(data)
      log('loaded data', data)
    },
    save_data: async (new_data) => {
      set_data({...new_data})
      await api.post('/aob', { data:new_data })
      log('set data', new_data)
    },
  }
  useF(viewer, () => handle.load_data())

  // useF(data, () => data && open_popup(close => <Market {...{ data, gold:3, fruits:['kiwi'], close, handle }} />))

  useRoom({
    room: 'aob',
    on: {
      'aob:update': () => handle.load_data(),
    }
  })

  usePageSettings({
    // background: '#eee',
    title: 'A-O-B',
    professional: true,
  })
  return <Style>
    {/* <div><b>(apple-orange-banana)</b> <i>grow fruit and collect gold</i></div> */}
    <div><b>apple-orange-banana</b></div>
    <HalfLine />
    {!data ? 'loading...' : data.started ? <Game {...{ data, handle }} /> : <Onboarding {...{ viewer, data, handle }} />}
  </Style>
}

const ABO_bg = '#eee'
const common_css = `

.section {
  padding: .5em calc(.33em + 1px + .25em);

  &:has(.section-header) {
    border-top: 1px solid #000;
    &:has(.section-label) {
      position: relative;
      margin-top: calc(1px + .75em);
      padding-top: calc(.5em + 1px + .75em);
    }
    &.collapsed-true {
      padding-bottom: 0;
    }
  }
  .section-header {
    position: absolute;
    top: -.75em; left: .33em;
    width: calc(100% - .66em);
    height: 1.5em;
    display: flex;
    align-items: center;
    gap: .33em;

    > .section-label {
      height: 100%;
      display: flex;
      align-items: center;
      padding: 0 .25em;
      
      &.section-label {
        background: var(--id-color);
        border: 1px solid currentcolor;
        border-radius: .25em;
      }
    }
  }
}

.action-option {
  height: 1.5em;
  display: flex;
  align-items: center;
  input, select {
    height: 1.5em;
    font-size: 1em;
    border: 1px solid currentcolor;
    border-radius: .25em;
    &[type=number] {
      max-width: 5em;
    }
  }
}

input, select {
  height: 1.5em;
  font-size: 1em;
  border: 1px solid currentcolor;
  border-radius: .25em;
  &[type=number] {
    max-width: 5em;
  }
}

ul {
  padding-left: 1em;
}

button {
  color: var(--id-color-text);
  border-radius: 10em;
  border: 1px solid var(--id-color-text);
  box-shadow: 0 1px var(--id-color-text);
  min-width: 2em;
  display: flex; align-items: center; justify-content: center;
  translate: 0 -1px;
  &:not(:disabled) {
    cursor: pointer;
    &:active {
      translate: 0;
      box-shadow: none;
    }
  }
  &:disabled {
    cursor: default;
    color: #888;
    // background: #ccc;
  }
  &.on {
    background: var(--id-color-text);
    color: var(--id-color-text-readable);
    translate: 0;
    box-shadow: none;
  }
  line-height: 1.3em;
}

--id-color: #eee;
--id-color-text: #222;
--id-color-text-readable: #eee;
background: var(--id-color) !important;
color: var(--id-color-text) !important;
padding: .5em;
font-size: .8em;
font-family: monospace;
`
const Style = styled.div`
--abo-dirt: #3b342f;
--abo-water: #7abcff;
width: 100%;
margin: .5em;
border: 1px solid #000;
border-radius: .25em;

${common_css}

box-shadow: none !important; /* to undo expand style (bad code) */
`
const PopupStyle = styled.div`
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);
${common_css}
`