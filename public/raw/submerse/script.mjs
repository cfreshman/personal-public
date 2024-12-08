import { draw_body, draw_polygon, set_engine, set_sheet } from './mjs/common.mjs'
import { generate } from './mjs/caves.mjs'
import { get_height } from './mjs/islands.mjs'

import { Anim } from './mjs/anim.mjs'
import { Entity } from './mjs/entity.mjs'
import { SHIPS, Player } from './mjs/entities/player.mjs'
import { Anglerfish } from './mjs/entities/species/anglerfish.mjs'
import { MantaRay } from './mjs/entities/species/manta_ray.mjs'
import { Sunfish } from './mjs/entities/species/sunfish.mjs'
import { Whale } from './mjs/entities/species/whale.mjs'
import { Lionfish } from './mjs/entities/species/lionfish.mjs'
import { Urchin } from './mjs/entities/species/urchin.mjs'
import { Anemone } from './mjs/entities/species/anemone.mjs'
import { Coin } from './mjs/entities/coin.mjs'
import { Shops } from './mjs/entities/shops.mjs'
import { Shark } from './mjs/entities/species/shark.mjs'
import { Trop0 } from './mjs/entities/species/trop0.mjs'
import { Trop1 } from './mjs/entities/species/trop1.mjs'
import { MidnightParrotfish } from './mjs/entities/species/mid_parrot.mjs'
import { Gem } from './mjs/entities/gem.mjs'

const log = named_log('submerse')

const WIDTH = 400
const HEIGHT = 250
const SCALE = 4
const FPS = 30
const debug = window.debug = {
  boxes: 0,
  preserve_ui: 0,
  stage: (i) => {
    M.Body.set(state.player.body, {
      position: i === 0 ? { x:0, y:0 } : { x: state.cave_metas[i - 1].right + WIDTH, y:0 },
      velocity: { x: 0, y: 0 },
    })
  }
}

const width = WIDTH * SCALE
const height = HEIGHT * SCALE

const sheet = await arc.a_sheet('sheet.png', [
  ['title', 1, 1, 33, 14],
  ['sub0', 1, 16, 11, 6], // BUOY
  ['sub1', 1, 23, 46, 15], // RIPTIDE
  ['sub2', 1, 39, 36, 17], // DREDGER

  ['angler', 1, 57, 16, 10, 2, 17, 0],
  ['manta', 1, 68, 31, 12, 6, 32, 0],
  ['sunfish', 1, 81, 33, 51, 4, 34, 0],
  ['whale', 1, 170, 72, 25, 6, 73, 0],
  ['lionfish', 1, 160, 16, 9, 2, 16, 0],
  ['urchin', 1, 135, 9, 6, 4, 10, 0],
  ['anemone', 1, 143, 17, 15, 4, 18, 0],
  ['shark', 1, 197, 30, 9, 2, 0, 10],
  ['trop0', 1, 218, 5, 3, 2, 0, 4],
  ['trop1', 8, 218, 5, 3, 2, 0, 4],
  ['midparrot', 1, 227, 24, 10, 2, 0, 11],

  ['bubble0', 35, 1, 3, 3],
  ['bubble1', 35, 5, 3, 3],
  ['bubble2', 35, 9, 2, 2],
  ['bubble3', 35, 12, 2, 2],
  ['bubble4', 35, 15, 1, 1],

  ['torpedo', 39, 1, 3, 1],

  ['coin', 51, 1, 6, 7, 4, 7, 0],
  ['gem', 51, 29, 6, 6, 5, 7, 0],
  ['shops', 79, 1, 29, 7],
  // ['bottom', 110, 1, 25, 5],
  ['bottom', 137, 3, 50, 8],

  ['heart', 51, 10, 9, 8],
  ['heart_gone', 51, 19, 9, 8],
  ['armor', 62, 10, 9, 8],
  ['armor_gone', 62, 19, 9, 8],
], {
  scale: 1,
})
log({ sheet })
set_sheet(sheet)

const BOTTOM = new Anim({
  sheet,
  names: ['bottom'],
})

const { Engine, Render, Runner, Bodies, Composite } = Matter
const engine = Engine.create({
  gravity: { scale: 0 },
})
set_engine(engine)
// const engine = Engine.create(canvas, {
//   render: {
//     controller: renderer(),
//     options: {
//       width: width,
//       height: height,
//       wireframes: false
//     },
//   }
// })
// const render = Render.create({
//   element: Q('#root'),
//   engine: engine,
//   options: {
//     wireframes: false,
//   },
// })
// const render = renderer()

// var boxA = Bodies.rectangle(400, 200, 80, 80)
// var boxB = Bodies.rectangle(450, 50, 80, 80)
// var ground = Bodies.rectangle(400, 610, 810, 60, { isStatic: true })

// add all of the bodies to the world
// Composite.add(engine.world, [boxA, boxB, ground])
// Render.run(render)
var runner = Runner.create()
Runner.run(runner, engine)

const root = Q('#root')
const canvas = Q('#root #canvas')
const ctx = canvas.getContext('2d')
{
  canvas.width = width
  canvas.height = height
  ctx.imageSmoothingEnabled = false
}
const ui = Q('#root #ui')

const COLORS = {
  SKY: '#a8cdf3',
  OCEAN: '#2f4c89',
  LAND: ['#202020', '#181818', '#101010'],
}

const do_resize = () => {
  document.body.style.width = '100%'
  const outer = root.parentElement.getBoundingClientRect()
  const outer_aspect = outer.width / outer.height
  const inner_aspect = WIDTH / HEIGHT
  const scale = inner_aspect > outer_aspect
    ? outer.width / WIDTH
    : outer.height / HEIGHT
  root.style.width = `${WIDTH * scale}px`
  root.style.height = `${HEIGHT * scale}px`
  document.body.style.width = 'fit-content'
}
do_resize()
on(window, 'resize', do_resize)

const MODES = {
  MENU: 0,
  PLAY: 1,
  END: 2,
}
let mode = undefined
let state = {
  debug,
  WIDTH, HEIGHT,
  x: 0,
  y: HEIGHT/3,
  keys: {},
  downs: {},
  ups: {},

  entities: [],
  player: undefined,
  colliders: [],

  add: [],
  remove: [],
  caves: [],
  cave_metas: [],

  shop: false,
  sold: {},
  max_x: 0,
}

const LIQUID_HEIGHT = 0
const LAND_HEIGHT = HEIGHT * 5/4 - HEIGHT * 1/3
const CAVE_SCALE = WIDTH / 4
const CAVE_APART = V.ne(1 + 2, 1 + 1)
const CAVE_START = WIDTH * 7/8
const CAVE_BETWEEN = WIDTH * 4/3

const spawn_openwater = (top_left, bottom_right, i) => {
  const spawns = {
    manta: [MantaRay, () => rand.i(6) + 1],
    sun: [Sunfish, () => 1],
    whale: [Whale, () => 1],
    lion: [Lionfish, () => rand.i(3) + 2],
    urchin: [Urchin, () => rand.i(2) + 1, x => {
      x.pos.y = HEIGHT
    }],
    anemone: [Anemone, () => 1, x => {
      x.pos.y = HEIGHT
    }],
    shark: [Shark, () => 1],
    trop0: [Trop0, () => rand.i(8) + 3],
    trop1: [Trop1, () => rand.i(8) + 3],
    midparrot: [MidnightParrotfish, () => rand.i(8) + 3],
  }
  let [n, weights] = [
    [10, {
      manta: 1,
    }],
    [10, { 
      trop0: 1,
      trop1: 1,
      sun: .2,
    }],
    [10, {
      midparrot: 1,
      anemone: 2,
      urchin: 2,
    }],
    0,
    0,
    0,
    0,
    [100, {
      shark: 1,
    }],
  ][i] || [15, {
    manta: 4,
    sun: 1,
    whale: 1,

    // lion: 3,
    // angler: 3,
    // urchin: 10,
    // shark: 1,

    trop0: 2,
    trop1: 2,
    midparrot: 1,
  }]

  const spawn_radius = 32
  const left = top_left.x + spawn_radius
  const right = bottom_right.x - spawn_radius
  const top = top_left.y + spawn_radius
  const bottom = bottom_right.y - spawn_radius
  range(n).map(i => {
    const spawn = spawns[rand.weighted(weights)]
    const n = spawn[1]()
    const pos = V.ne(rand.f(right - left) + left, rand.f(bottom - top) + top)
    const group = range(n).map(j => {
      const args = {
        pos: pos.ad(V.p(rand.f(maths.TAU), rand.f(spawn_radius))),
      }
      spawn[2]?.(args)
      const x = new spawn[0](args)
      state.entities.push(x)
      return x
    })
    group.map(x => {
      x.group = group
    })
  })

  // spawn shops at top right
  const shops_pos = V.ne(bottom_right.x - CAVE_SCALE/2, 0)
  state.entities.push(new Shops({
    pos: shops_pos,
  }))
}

let last_cave_i = undefined
const spawn_cave = (meta) => {
  if (meta.spawned) return

  const spawns = {
    angler: [Anglerfish, () => rand.i(3) + 1],
    lion: [Lionfish, () => rand.i(3) + 1],
    shark: [Shark, () => 1],
  }
  const weights = [
    {
      lion: 1,
    },
    {
      lion: 1,
      angler: 2,
    },
    {
      lion: 1,
      angler: 1,
      shark: 1,
    },
  ][meta.i] || {
    angler: 5,
    lion: 5,
    shark: 3,
  }

  // spawn inside cave
  meta.cave.vs_in_es.map(v => {
    // spawn aggressive entities
    const pos = V.ne(v.x * CAVE_APART.x + meta.start/CAVE_SCALE + .5, v.y * CAVE_APART.y + 1).sc(CAVE_SCALE).ad(V.ne(CAVE_SCALE/2, CAVE_SCALE/2))
    const spawn_radius = CAVE_SCALE/2
    const spawn = spawns[rand.weighted(weights)]
    // log(spawns, spawn, rand.weighted(weights))
    const n = spawn[1]()
    const group = range(n).map(j => {
      const args = {
        pos: pos.ad(V.p(rand.f(maths.TAU), rand.f(spawn_radius))),
      }
      spawn[2]?.(args)
      const x = new spawn[0](args)
      state.entities.push(x)
      return x
    })
    group.map(x => {
      x.group = group
    })
  })

  // spawn next openwater
  const left = meta.right
  const right = left + CAVE_BETWEEN
  spawn_openwater(V.ne(left, 0), V.ne(right, HEIGHT), meta.i + 1)

  meta.spawned = true
  last_cave_i = meta.i
}

let highscore = store.get('submerse-highscore') || 0
let last_highscore = highscore
const update_highscore = (max_x) => {
  highscore = Math.floor(Math.max(highscore, max_x))
  store.set('submerse-highscore', highscore)
}

let ttl_gameover = 0

let ui_keydown = e => {}
let message = undefined
let message_timeout = undefined
window.addEventListener('keydown', e => ui_keydown(e))
const render = {
  ui: () => {
    const { player } = state
    const caught = player.net?.caught
    const new_creature = caught && !state.sold[caught.name]
    window.f_ui = {
      message: (text) => {
        message = text
        clearTimeout(message_timeout)
        message_timeout = setTimeout(() => {
          message = undefined
        }, 1_500)
      },
      pay: (amount) => {
        player.score -= amount
        f_ui.message(`${amount < 0 ? 'earned' : 'paid'} ${Math.abs(amount)} gold`)
      },
      not_enough: () => {
        f_ui.message('not enough gold')
      },
      repair_armor: () => {
        if (player.score < 1) return f_ui.not_enough()
        if (player.armor < player.max_armor) {
          player.armor = player.max_armor
          f_ui.pay(1)
        } else {
          f_ui.message('armor full')
        }
      },
      heal: () => {
        if (player.score < 2) return f_ui.not_enough()
        if (player.health < player.max_health) {
          player.health += 1
          f_ui.pay(2)
        } else {
          f_ui.message('health full')
        }
      },
      upgrade_engine: () => {
        if (player.score < 5) return f_ui.not_enough()
        if (player.upgrade_engine < Player.UPGRADE_MAX[Player.UPGRADES.ENGINE]) {
          player.upgrade(Player.UPGRADES.ENGINE)
          f_ui.pay(5)
        } else {
          f_ui.message('engine fully upgraded')
        }
      },
      upgrade_torpedo: () => {
        if (player.score < 5) return f_ui.not_enough()
        if (player.upgrade_torpedo_damage < Player.UPGRADE_MAX[Player.UPGRADES.TORPEDO_DAMAGE]) {
          player.upgrade(Player.UPGRADES.TORPEDO_DAMAGE)
          f_ui.pay(5)
        } else {
          f_ui.message('torpedo damage fully upgraded')
        }
      },
      upgrade_armor: () => {
        if (player.score < 5) return f_ui.not_enough()
        if (player.upgrade_armor < Player.UPGRADE_MAX[Player.UPGRADES.ARMOR]) {
          player.upgrade(Player.UPGRADES.ARMOR)
          f_ui.pay(5)
        } else {
          f_ui.message('armor fully upgraded')
        }
      },
      sell_caught: () => {
        if (new_creature) {
          player.net.sell()
          state.sold[caught.name] = true
          f_ui.pay(-2)
        } else if (caught) {
          f_ui.message('already collected')
        } else {
          f_ui.message('nothing to sell')
        }
      },
      exit: () => {
        state.shop_open = false
      }
    }
    ui_keydown = e => {}
    switch (mode) {
      case MODES.MENU:
        ui.innerHTML = `
        <div class='row' style="
        padding: .5em;
        gap: .5em;
        ">
          <div class='row gap' style="
          width: fit-content;
          background: #000;
          color: #fff;
          padding: .5em;
          border-radius: .5em;
          ">
            high score: ${highscore}m
          </div>
        </div>
        <div class="cover center middle-column" style="
        color: #fff;
        ">
          <div style="height:60%;"></div>
          <div style="
          font-size: 2em;
          animation: blink 2s infinite;
          ">press space to start</div>
        </div>
        `
        break
      case MODES.PLAY:
        if (state.player) {
          ui.innerHTML = `
          <div class='row' style="
          padding: .5em;
          gap: .5em;
          ">
            <div class='row gap' style="
            width: fit-content;
            background: #000;
            color: #fff;
            padding: .5em;
            border-radius: .5em;
            ">
              ${range(player.max_health).map(i => {
                return `<img style="
                width: 3em;
                " src="${sheet[player.health > i ? 'heart' : 'heart_gone'].url}"></img>`
              }).join('')}
              ${range(player.max_armor).map(i => {
                return `<img style="
                width: 3em;
                " src="${sheet[player.armor > i ? 'armor' : 'armor_gone'].url}"></img>`
              }).join('')}
            </div>
            <div style="
            width: fit-content;
            background: #000;
            color: #fff;
            padding: .5em;
            border-radius: .5em;
            ${highscore > last_highscore ? 'color: gold' : ''}
            ">${Math.floor(state.max_x)}m</div>
            <div style="
            width: fit-content;
            background: #000;
            color: #fff;
            padding: .5em;
            border-radius: .5em;
            ">${player.score} gold</div>
            <div style="
            width: fit-content;
            background: #000;
            color: #fff;
            padding: .5em;
            border-radius: .5em;
            position: relative;
            overflow: hidden;
            ">
              ${player.arm}${player.arm === Player.ARMS.TORPEDO && player.torpedo_damage > 1 ? ' '+player.torpedo_damage :''} (x)
              <div class="cover" style="
              width: ${player.ttl_arm / player.time_arm * 100}%;
              backdrop-filter: invert(1);
              "></div>
            </div>
            <div style="
            width: fit-content;
            background: #000;
            color: #fff;
            padding: .5em;
            border-radius: .5em;
            position: relative;
            overflow: hidden;
            ">
              engine ${1 + player.upgrade_engine}
            </div>
            ${0&&state.shop ? `
            <div style="
            width: fit-content;
            background: #000;
            color: #fff;
            padding: .5em;
            border-radius: .5em;
            ">${state.shop_open ? 'close' : 'open'} shop (e)</div>
            ` : ''}
          </div>
          `
          if (state.shop) {
            ui_keydown = e => {
              if (e.key === '1') {
                f_ui.repair_armor()
              }
              if (e.key === '2') {
                f_ui.heal()
              }
              if (e.key === '3') {
                f_ui.upgrade_engine()
              }
              if (e.key === '4') {
                f_ui.upgrade_torpedo()
              }
              if (e.key === '5') {
                f_ui.upgrade_armor()
              }
              if (e.key === '6') {
                f_ui.sell_caught()
              }
            }
            ui.innerHTML += `
            <div class="cover center">
              <div style="
              background: #000;
              color: #fff;
              padding: .5em;
              ">
                <div>${message || 'shop'}</div>
                <style>
                  #shop > div {
                    &.disabled {
                      opacity: .33;
                    }
                  }
                </style>
                <div id="shop" style="
                text-align: left;
                ">
                  <div class="${player.armor === player.max_armor ? 'disabled' : ''}">(1) 1 gold - repair armor to full</div>
                  <div class="${player.health === player.max_health ? 'disabled' : ''}">(2) 2 gold - heal by 1</div>
                  <div class="${player.upgrade_engine === Player.UPGRADE_MAX[Player.UPGRADES.ENGINE] ? 'disabled' : ''}">(3) 5 gold - upgrade engine</div>
                  <div class="${player.upgrade_torpedo_damage === Player.UPGRADE_MAX[Player.UPGRADES.TORPEDO_DAMAGE] ? 'disabled' : ''}">(4) 5 gold - upgrade torpedo</div>
                  <div class="${player.upgrade_armor === Player.UPGRADE_MAX[Player.UPGRADES.ARMOR] ? 'disabled' : ''}">(5) 5 gold - upgrade armor</div>
                  ${caught ? `
                  <div>sell</div>
                  <div class=${!new_creature ? 'disabled' : ''}>(6) 2 gold - sell new creature</div>` : ''}
                </div>
                <!-- <div>exit (e)</div> -->
              </div>
            </div>
            `
          }
        }
        break
      case MODES.END:
        ui.innerHTML = `
        <div class='row' style="
        padding: .5em;
        gap: .5em;
        ">
          <div class='row gap' style="
          width: fit-content;
          background: #000;
          color: #fff;
          padding: .5em;
          border-radius: .5em;
          ">
            high score: ${highscore}m
          </div>
        </div>
        <div class="cover center middle-column" style="font-size:2em; color: #fff;">
          <div style="height:60%;"></div>
          <div>&nbsp;</div>
          <div>game over - <span style="
          ${highscore > last_highscore ? 'color: gold' : ''}
          ">${Math.floor(state.max_x)}m</span></div>
          <div>${ttl_gameover > 0 ? '&nbsp;' : `press space to play again`}</div>
        </div>`
        break
    }
  }
}
const set_mode = (new_mode) => {
  // teardown
  state.keys = {}
  state.downs = {}
  state.ups = {}
  switch (mode) {
    case MODES.MENU:
      break
    case MODES.PLAY:
      break
    case MODES.END:
      state.entities.map(x => x.die(state))
      state.colliders.map(x => Composite.remove(engine.world, x))
      last_highscore = Math.max(last_highscore, highscore)
      break
  }
  // construct
  switch (new_mode) {
    case MODES.MENU:
      // generate caves
      state.caves = range(7).map(i => {
        return generate(i * 2 + 3)
      })
      let cave_start = CAVE_START
      state.cave_metas = state.caves.map((cave, i) => {
        let rel_cave_left = cave.vs[0].x * CAVE_SCALE * CAVE_APART.x + CAVE_SCALE/2
        let rel_cave_right = cave.vs[cave.vs.length - 1].x * CAVE_SCALE * CAVE_APART.x  + CAVE_SCALE/2
        let cave_width = rel_cave_right - rel_cave_left
        let rel_cave_top = CAVE_SCALE
        let rel_cave_bottom = CAVE_SCALE + CAVE_SCALE * (3 * CAVE_APART.y - 1)
        let cave_height = rel_cave_bottom - rel_cave_top
        const meta = {
          i, cave,
          start: cave_start,
          x: cave_start + cave_width/2,
          y: CAVE_SCALE * 2 + cave_height/2,
          width: cave_width,
          height: cave_height,
          left: rel_cave_left + cave_start,
          right: rel_cave_right + cave_start,
          top: rel_cave_top,
          bottom: rel_cave_bottom,
        }

        meta.wall = new Bodies.rectangle(meta.left + CAVE_SCALE/2, meta.top + CAVE_SCALE/2, CAVE_SCALE, CAVE_SCALE, {
          isStatic: true,
        })
        meta.despawned_before = false

        cave_start += cave_width + CAVE_BETWEEN
        return meta
      })

      // add walls
      const chunks = {}
      const chunk_pos_to_key = pos => `${pos.x},${pos.y}`
      state.colliders = []
      state.grounds = []

      // add seafloor
      const back_wall = -5
      const end_wall = Math.ceil((state.cave_metas[state.cave_metas.length - 1].right + CAVE_BETWEEN) / CAVE_SCALE)
      const bottom = Math.ceil((state.cave_metas[0].bottom + HEIGHT/2) / CAVE_SCALE)
      for (let i = back_wall - 3; i < end_wall + 3; i++) {
        for (let j = (i <= back_wall || end_wall < i) ? -10 : 3; j < bottom; j++) {
          const pos = V.ne(i, j)
          chunks[chunk_pos_to_key(pos)] = pos
        }
      }

      const seed = rand.i(1e12)
      const zoom = 512
      const get_height = (x) => {
        const y = 0
        const huge = noise.simplex2(x/zoom/4 - 10000 + seed, y/zoom/4 - 10000 + seed)
        const large = noise.simplex2(x/zoom*2 + 10000 + seed, y/zoom*2 + 10000 + seed)
        const medium = noise.simplex2(x/zoom*4 + 20000 + seed, y/zoom*4 + 20000 + seed)
        const small = noise.simplex2(x/zoom*10 + 30000 + seed, y/zoom*10 + 30000 + seed)
        const noise_value = huge*0.3 + large*0.5 + medium*0.15 + small*0.05
        return noise_value * .5 + .5
        return .1
      }

      // add islands, remove caves
      state.cave_metas.map(meta => {
        const cave = meta.cave

        // island above (added)
        for (let x = 0; x < meta.width; x += CAVE_SCALE) {
          for (let y = -CAVE_SCALE*0; y < HEIGHT; y += CAVE_SCALE) {
            let pos = V.ne(x + meta.start, y).sc(1/CAVE_SCALE)
            pos = V.ne(Math.round(pos.x), Math.round(pos.y))
            chunks[chunk_pos_to_key(pos)] = pos
          }
        }

        // prevent user from jumping on island
        const prevent_beach_height = CAVE_SCALE/8
        state.colliders.push(new Bodies.rectangle(meta.x + CAVE_SCALE/2, -prevent_beach_height/2, meta.width, prevent_beach_height, {
          isStatic: true,
        }))
        const island_points = [
          { x: meta.start, y: 0 },
        ]
        for (let x = 0; x <= meta.width; x += meta.width / 200) {
          island_points.push({ x: meta.start + x, y: -get_height(x + meta.start) * HEIGHT })
        }
        island_points.push({ x: meta.start + meta.width, y: 0 })
        log({island_points})
        state.grounds.push(island_points.map(x => {
          x.x += CAVE_SCALE/2
          // x.y += CAVE_SCALE/2
          // x.y += CAVE_SCALE
          
          // lerp left and right to 0
          const from_start = x.x - meta.start
          const from_end = (meta.width + CAVE_SCALE) - from_start
          if (from_start < CAVE_SCALE) {
            const lerp = from_start / CAVE_SCALE
            x.y = x.y * lerp + 0 * (1 - lerp)
          }
          if (from_end < CAVE_SCALE) {
            const lerp = from_end / CAVE_SCALE
            x.y = x.y * lerp + 0 * (1 - lerp)
          }

          x.y += prevent_beach_height

          return x
        }))

        // cave system below (removed)
        cave.es.map(e => {
          const v0 = cave.vs[e[0]]
          const v1 = cave.vs[e[1]]
          const off_x = (v1.x - v0.x) / CAVE_APART.x
          const off_y = (v1.y - v0.y) / CAVE_APART.y
          for (let i = 0; i <= (off_x ? CAVE_APART.x : CAVE_APART.y); i++) {
            const x = v0.x + off_x * i
            const y = v0.y + off_y * i
            let pos = V.ne(x * CAVE_APART.x + meta.start/CAVE_SCALE, y * CAVE_APART.y + 1)
            pos = V.ne(Math.round(pos.x), Math.round(pos.y))
            delete chunks[chunk_pos_to_key(pos)]
          }
        })
      })
      log(chunks)

      // convert chunks to colliders
      values(chunks).map(chunk_pos => {
        state.colliders.push(new Bodies.rectangle(chunk_pos.x * CAVE_SCALE + CAVE_SCALE/2, chunk_pos.y * CAVE_SCALE + CAVE_SCALE/2, CAVE_SCALE, CAVE_SCALE, {
          isStatic: true
        }))
      })
      Composite.add(engine.world, state.colliders)

      // spawn entities
      state.entities = []
      state.player = new Player({
        ship: SHIPS.BUOY,
        // ship: SHIPS.RIPTIDE,
        // ship: SHIPS.DREDGER,
        pos: V.ne(0, HEIGHT/3),
        // pos: V.ne(0, -CAVE_SCALE/4),
      })
      state.entities.push(state.player)

      // spawn aggressors in caves
      const first_cave = state.cave_metas[0]
      spawn_openwater(V.ne(-WIDTH, 0), V.ne(first_cave.left, HEIGHT), 0)

      // range(20).map(i => {
      //   state.entities.push(new Anglerfish({
      //     pos: V.ne(rand.s(WIDTH), rand.i(HEIGHT)),
      //   }))
      // })
      // range(30).map(i => {
      //   state.entities.push(new MantaRay({
      //     pos: V.ne(rand.s(WIDTH), rand.i(HEIGHT)),
      //   }))
      // })
      // range(3).map(i => {
      //   state.entities.push(new Sunfish({
      //     pos: V.ne(rand.s(WIDTH), rand.i(HEIGHT)),
      //   }))
      // })
      // range(2).map(i => {
      //   state.entities.push(new Whale({
      //     pos: V.ne(rand.s(WIDTH), rand.i(HEIGHT)),
      //   }))
      // })
      // range(10).map(i => {
      //   state.entities.push(new Lionfish({
      //     pos: V.ne(rand.s(WIDTH), rand.i(HEIGHT)),
      //   }))
      // })
      // range(30).map(i => {
      //   state.entities.push(new Urchin({
      //     pos: V.ne(rand.s(WIDTH), HEIGHT),
      //   }))
      // })
      // range(15).map(i => {
      //   state.entities.push(new Anemone({
      //     pos: V.ne(rand.s(WIDTH), HEIGHT),
      //   }))
      // })

      state.sold = {}
      state.max_x = 0

      // spawn first cave
      spawn_cave(state.cave_metas[0])

      break
    case MODES.PLAY:
      break
    case MODES.END:
      ttl_gameover = 1.5
      break
  }
  mode = new_mode
  render.ui()
}
const update = (dt) => {
  switch (mode) {
    case MODES.MENU:
      if (state.keys[' ']) {
        set_mode(MODES.PLAY)
      }
      break
    case MODES.PLAY:
    case MODES.END:
      // update entities
      state.add = []
      state.remove = []
      state.gold = []
      state.entities.map(x => x.update(state, dt))
      const remove_ids = set(state.remove.map(x => x.id))
      state.entities = state.entities.filter(x => !remove_ids.has(x.id))
      state.entities.push(...state.add)
      state.gold.map(({ pos, value }) => {
        state.entities.push(new Coin({
          pos,
          value,
        }))
      })
      state.entities.sort((a, b) => a.z - b.z)

      if (!state.shop) state.shop_open = false
      else if (state.downs['e']) {
        state.shop_open = !state.shop_open
        state.downs['e'] = false
      }

      if (state.player) {
        state.x = state.player.pos.x
        state.y = state.player.pos.y
        state.max_x = Math.max(state.max_x, state.x)
        update_highscore(state.max_x)

        // spawn next cave once past end
        const cave_meta = state.cave_metas[last_cave_i]
        if (cave_meta) {
          if (!cave_meta.despawned_before && cave_meta.left + WIDTH < state.x + CAVE_SCALE) {
            cave_meta.despawned_before = true
            state.colliders.push(cave_meta.wall)
            Composite.add(engine.world, cave_meta.wall)
            state.entities.map(x => {
              if (x.pos.x < cave_meta.left) {
                x.remove()
              }
            })
            state.colliders = state.colliders.filter(x => {
              if (x.position.x < cave_meta.left) {
                Composite.remove(engine.world, x)
                return false
              }
              return true
            })
          }
          if (state.x > cave_meta.right) {
            const next_cave_meta = state.cave_metas[last_cave_i + 1]
            if (next_cave_meta) {
              spawn_cave(next_cave_meta)
            }
          }
        }
      } else if (mode === MODES.PLAY) {
        set_mode(MODES.END)
      } else {
        ttl_gameover = Math.max(0, ttl_gameover - dt)
        if (ttl_gameover <= 0) {
          if (state.keys[' ']) {
            set_mode(MODES.MENU)
            set_mode(MODES.PLAY)
          }
        }
      }
      break
  }
}
const draw = () => {
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.scale(SCALE, SCALE)
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  const draw_darkwater = () => {
    const lightshaft_mod = WIDTH / 2
    const lightshaft_offset = WIDTH / 8
    const lightshaft_width = WIDTH / 5
    const lightshaft_bottom_offset = WIDTH / 5 * 3
    let lightshaft_start = Math.floor(state.x / lightshaft_mod) * lightshaft_mod - lightshaft_mod - lightshaft_offset
    let lightshaft_end = lightshaft_start + lightshaft_mod * 6
    for (let x = lightshaft_start; x < lightshaft_end; x += lightshaft_mod) {
      const x_screen = WIDTH/2 - state.x + x
      const y_screen = HEIGHT/2 - LIQUID_HEIGHT - state.y
      ctx.fillStyle = '#ffffff04'
      ctx.beginPath()
      ctx.moveTo(x_screen, y_screen)
      ctx.lineTo(x_screen + lightshaft_width, y_screen)
      ctx.lineTo(x_screen + lightshaft_width - lightshaft_bottom_offset, y_screen + HEIGHT * 3)
      ctx.lineTo(x_screen - lightshaft_bottom_offset, y_screen + HEIGHT * 3)
      ctx.fill()
    }
  }
  const draw_land = () => {
      // sky
      ctx.fillStyle = COLORS.SKY
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      // ocean
      let screen_liquid_height = LIQUID_HEIGHT + state.y + HEIGHT / 2
      // ctx.fillStyle = COLORS.OCEAN
      // ctx.fillRect(0, HEIGHT - screen_liquid_height, WIDTH, screen_liquid_height)
      let strip_height = 4, last_height
      for (let i = 0; i < HEIGHT * 2/strip_height; i++) {
        const factor = i / 8
        ctx.fillStyle = `hsl(223deg ${40 - factor}% ${30 - factor}%)`
        last_height = HEIGHT - screen_liquid_height + i * strip_height
        ctx.fillRect(0, last_height, WIDTH, strip_height + 1)
        // if (i === 6) ctx.fillRect(0, HEIGHT - screen_liquid_height + i * strip_height, WIDTH, HEIGHT * 3)
        // else 
      }
      ctx.fillRect(0, last_height, WIDTH, HEIGHT * 3)

      draw_darkwater()

      // land
      // draw bottom
      // ctx.fillStyle = COLORS.LAND[1]
      // ctx.fillRect(0, HEIGHT - state.y, WIDTH, HEIGHT * 3)
      // ctx.fillStyle = COLORS.LAND[2]
      // ctx.fillRect(0, HEIGHT - state.y + 10, WIDTH, HEIGHT * 3)

      // const LAND_SCALE = 1
      // for (let x = 0; x < width; x += 1) {
      //   for (let y = 0; y < 3; y += 1) {
      //     ctx.fillStyle = COLORS.LAND[y]
      //     const offset_factor = [0, .1, .15][y]
      //     const x_land_height = ((get_height((x - WIDTH/2 + state.x) * LAND_SCALE, y) - offset_factor) * LAND_HEIGHT/2 + LAND_HEIGHT/2) + state.y
      //     ctx.fillRect(x, HEIGHT - x_land_height, 1, x_land_height)
      //   }
      // }
  }
  const draw_caves = () => {
    if (0) {
      const metas = state.cave_metas
      const cave_scale = WIDTH / 4
      const cave_start_height = LIQUID_HEIGHT / 2
      for (let i = 0; i < metas.length; i++) {
        const meta = metas[i]
        const start = meta.left

        ctx.fillStyle = COLORS.LAND[0]
        ctx.fillRect(start - state.x - CAVE_SCALE/2, HEIGHT - LAND_HEIGHT - state.y - CAVE_SCALE/2, meta.width * CAVE_APART + CAVE_SCALE, meta.height * CAVE_APART + CAVE_SCALE)

        const cave = meta.cave
        ctx.save()
        ctx.fillStyle = ctx.strokeStyle = '#fff'
        ctx.translate(start - state.x, HEIGHT - cave_start_height - state.y)
        ctx.scale(cave_scale, cave_scale)
        // cave.vs.map(v => {
        //   const x = v.x * 3 + 3
        //   const y = v.y * 3 + 3
        //   ctx.fillRect(x - 1/2, y - 1/2, 1, 1)
        // })
        cave.es.map(e => {
          const v0 = cave.vs[e[0]]
          const v1 = cave.vs[e[1]]
          ctx.save()
          ctx.lineWidth = 1
          ctx.lineCap = 'square'
          ctx.lineJoin = 'square'
          ctx.beginPath()
          ctx.moveTo(v0.x * 3, v0.y * 3)
          ctx.lineTo(v1.x * 3, v1.y * 3)
          ctx.stroke()
          ctx.restore()
        })
        ctx.strokeStyle = '#f00'
        const path = cave.path
        for (let i = 0; i < path.length - 1; i++) {
          const v0 = path[i]
          const v1 = path[i+1]
          ctx.save()
          ctx.lineWidth = 1/4
          ctx.lineCap = 'square'
          ctx.lineJoin = 'square'
          ctx.beginPath()
          ctx.moveTo(v0.x * 3, v0.y * 3)
          ctx.lineTo(v1.x * 3, v1.y * 3)
          ctx.stroke()
          ctx.restore()
        }
        ctx.restore()
      }
    }

    ctx.save()
    
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#fff'
    // ctx.translate(-1, -1) // half stroke width

    // place caves through islands, where islands are given by these parameters:
    // const island_spacing = 200
    // const island_width = 100
    // const island_period = island_spacing + island_width
    // const island_center = island_period/2
    // const land_scale = 1/16

    // const next_island = (x) => {
    //   return Math.floor(x / island_period) * island_period + island_center
    // }
    // ctx.translate(next_island(state.x) / land_scale, 0)


    const cave_scale = 4
    ctx.translate(0, HEIGHT - 10 * cave_scale)
    const cave = state.caves[0]

    state.cave_metas.map(meta => {
      ctx.fillStyle = COLORS.LAND[0]
      ctx.fillRect(3 * cave_scale - cave_scale/2, 3 * cave_scale - cave_scale/2, meta.width/CAVE_SCALE * cave_scale + cave_scale, meta.height/CAVE_SCALE * cave_scale + cave_scale)
    })

    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#fff'
    cave.vs.map(v => {
      const x = v.x * cave_scale * CAVE_APART.x + 3 * cave_scale
      const y = v.y * cave_scale * CAVE_APART.y + 3 * cave_scale
      ctx.fillRect(x - cave_scale/2, y - cave_scale/2, cave_scale, cave_scale)
    })
    cave.es.map(e => {
      const v0 = cave.vs[e[0]]
      const v1 = cave.vs[e[1]]
      ctx.save()
      ctx.lineWidth = cave_scale
      ctx.lineCap = 'square'
      ctx.lineJoin = 'square'
      ctx.beginPath()
      ctx.translate(3 * cave_scale, 3 * cave_scale)
      ctx.moveTo(v0.x * cave_scale * CAVE_APART.x, v0.y * cave_scale * CAVE_APART.y)
      ctx.lineTo(v1.x * cave_scale * CAVE_APART.x, v1.y * cave_scale * CAVE_APART.y)
      ctx.stroke()
      ctx.restore()
    })

    const path = cave.path
    ctx.strokeStyle = '#f00'
    for (let i = 0; i < path.length - 1; i++) {
      const v0 = path[i]
      const v1 = path[i+1]
      ctx.save()
      ctx.lineWidth = cave_scale / 4
      ctx.lineCap = 'square'
      ctx.lineJoin = 'square'
      ctx.beginPath()
      ctx.translate(3 * cave_scale, 3 * cave_scale)
      ctx.moveTo(v0.x * cave_scale * CAVE_APART.x, v0.y * cave_scale * CAVE_APART.y)
      ctx.lineTo(v1.x * cave_scale * CAVE_APART.x, v1.y * cave_scale * CAVE_APART.y)
      ctx.stroke()
      ctx.restore()
    }
    ctx.restore()
  }
  switch (mode) {
    case MODES.MENU:
      draw_land()
      // draw_caves()

      arc.draw_sprite(ctx, sheet.title, WIDTH/2, HEIGHT/2, { scale:7, center:true, camera:state })
      break
    case MODES.PLAY:
    case MODES.END:
      draw_land()

      ctx.save()
      ctx.translate(WIDTH/2 - state.x, HEIGHT/2 - state.y)
      state.entities.map(x => x.draw(state, ctx))
      state.colliders.map(collider => {
        draw_body(ctx, collider, {
          fill: COLORS.LAND[1],
          stroke: debug.boxes ? 'red' : undefined,
        })
      })
      state.grounds.map(ground => {
        ctx.save()
        draw_polygon(ctx, ground, {
          fill: COLORS.LAND[0],
        })
        ctx.translate(0, CAVE_SCALE/8)
        draw_polygon(ctx, ground, {
          fill: COLORS.LAND[1],
        })
        ctx.restore()
      })
      state.colliders.map(collider => {
        const pos = collider.position
        if (pos.y - CAVE_SCALE/2 - 6 >= 0) BOTTOM.draw(state, ctx, pos.x, pos.y - CAVE_SCALE/2 - 6 /* half scaled height */, { scale:2 })
        if (pos.y + CAVE_SCALE/2 + 6 >= 0) BOTTOM.draw(state, ctx, pos.x, pos.y + CAVE_SCALE/2 + 6 /* half scaled height */, { is_left:true, is_upside_down:true, scale:2 })
      })
      if (debug.boxes) {
        state.cave_metas.map(meta => {
          draw_polygon(ctx, [
            { x: meta.left, y: meta.top },
            { x: meta.right, y: meta.top },
            { x: meta.right, y: meta.bottom },
            { x: meta.left, y: meta.bottom },
          ], {
            stroke: 'green',
          })
        })
      }
      ctx.restore()
      // BOTTOM.draw(state, ctx, 0, 0)

      // draw_caves()

      // draw player health
      // if (state.player) {
      //   const health_height = 2
      //   ctx.fillStyle = '#e44'
      //   ctx.fillRect(0, 0, WIDTH, health_height)
      //   ctx.fillStyle = '#4e4'
      //   ctx.fillRect(0, 0, WIDTH * state.player.health / state.player.max_health, health_height)
      //   ctx.fillStyle = '#000'
      //   ctx.fillRect(0, health_height, WIDTH, 1/SCALE)
      // }

      if (!debug.preserve_ui) render.ui()

      if (mode === MODES.END) {
        ctx.fillStyle = 'rgba(0, 0, 0, .5)'
        ctx.fillRect(0, 0, WIDTH, HEIGHT)
        arc.draw_sprite(ctx, sheet.title, WIDTH/2, HEIGHT/2, { scale:7, center:true, camera:state })
      }

      break
  }
  ctx.restore()
}

const COLLIDE_DAMAGE_TIMEOUT = 1_000
const COLLISION_KNOCKBACK = 1
let active_collisions = {}
const collide = (a, b) => {
  const key = `${a.id},${b.id}`
  const active_collision = active_collisions[key]
  if (!active_collision || active_collision + COLLIDE_DAMAGE_TIMEOUT < Date.now()) {
    active_collisions[key] = Date.now()
    const do_damage = (entity, other) => {
      const damage = other.from_friendly !== entity.is_friendly ? other.ranged ? (entity.takes_ranged ? other.damage : 0) : (entity.takes_melee ? other.damage : 0) : 0
      if (damage) {
        entity.hit(damage)
        const knockback = entity.pos.ad(other.pos.sc(-1)).no().sc(COLLISION_KNOCKBACK)
        Matter.Body.setVelocity(entity.body, { x: entity.body.velocity.x + knockback.x, y: entity.body.velocity.y + knockback.y })
        if (other.ranged) {
          other.remove()
        }
      }
      if (entity.target_dir) entity.target_dir += Math.PI
      if (other.value && entity === state.player) {
        log('collect', other.value)
        state.player.score += other.value
        other.remove()
      }
      if (entity.catch && other.is_creature) {
        entity.catch(other)
      }
    }
    do_damage(a, b)
    do_damage(b, a)
    // log('collide', a.health, b.health)

    if ((a.shop || b.shop) && (a === state.player || b === state.player)) {
      state.shop = true
    }
  }
}
const end_collide = (a, b) => {
  const key = `${a.id},${b.id}`
  delete active_collisions[key]
  
  if ((a.shop || b.shop) && (a === state.player || b === state.player)) {
    state.shop = false
  }
}

on(window, 'keydown', (e) => {
  state.keys[e.key] = true
  state.downs[e.key] = true
})
on(window, 'keyup', (e) => {
  state.keys[e.key] = false
  state.ups[e.key] = true
})

let t_last = Date.now()
const loop = () => {
  const t_now = Date.now()
  const dt = (t_now - t_last) / 1000
  t_last = t_now

  update(dt)
  draw()

  requestAnimationFrame(loop)
}
on(window, 'focus', () => {
  t_last = Date.now()
})
set_mode(MODES.MENU)
requestAnimationFrame(loop)
const handle_collision = (e) => {
  e.pairs.map(pair => {
    const a = pair.bodyA.entity
    const b = pair.bodyB.entity
    if (a && b) {
      collide(a, b)
    } else {
      const e = a || b
      if (e) {
        if (e.fragile) e.remove()
        if (e.target_dir && e.name === 'collisionStart') e.target_dir += Math.PI
      }
    }
  })
}
Matter.Events.on(engine, 'collisionStart', handle_collision)
Matter.Events.on(engine, 'collisionActive', handle_collision)
Matter.Events.on(engine, 'collisionEnd', (e) => {
  e.pairs.map(pair => {
    const a = pair.bodyA.entity
    const b = pair.bodyB.entity
    if (a && b) {
      end_collide(a, b)
    }
  })
})