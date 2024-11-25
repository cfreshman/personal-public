import { draw_body, set_engine, set_sheet } from './mjs/common.mjs'
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

const log = named_log('submerse')

const WIDTH = 400
const HEIGHT = 300
const SCALE = 4
const FPS = 30
const DEBUG = 0

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

  ['bubble0', 35, 1, 3, 3],
  ['bubble1', 35, 5, 3, 3],
  ['bubble2', 35, 9, 2, 2],
  ['bubble3', 35, 12, 2, 2],
  ['bubble4', 35, 15, 1, 1],

  ['torpedo', 39, 1, 3, 1],

  ['coin', 51, 1, 6, 7, 4, 7, 0],
], {
  scale: 1,
})
log({ sheet })
set_sheet(sheet)

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
  const outer = root.parentElement.getBoundingClientRect()
  const outer_aspect = outer.width / outer.height
  const inner_aspect = WIDTH / HEIGHT
  const scale = inner_aspect > outer_aspect
    ? outer.width / WIDTH
    : outer.height / HEIGHT
  root.style.width = `${WIDTH * scale}px`
  root.style.height = `${HEIGHT * scale}px`
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
  DEBUG,
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
}

const LIQUID_HEIGHT = 0
const LAND_HEIGHT = HEIGHT * 5/4 - HEIGHT * 1/3
const CAVE_SCALE = WIDTH / 4
const CAVE_APART = V.ne(1 + 2, 1 + 1)
const CAVE_START = WIDTH * 7/8
const CAVE_BETWEEN = WIDTH * 2

const spawn_openwater = (top_left, bottom_right, n) => {
  const spawn_radius = 16
  const left = top_left.x + spawn_radius
  const right = bottom_right.x - spawn_radius
  const top = top_left.y + spawn_radius
  const bottom = bottom_right.y - spawn_radius
  const spawns = {
    manta: [MantaRay, () => rand.i(4) + 2],
    sun: [Sunfish, () => 1],
    whale: [Whale, () => 1],
    lion: [Lionfish, () => rand.i(3) + 2],
    urchin: [Urchin, () => rand.i(2) + 1, x => {
      x.pos.y = HEIGHT - 8
    }],
  }
  const weights = {
    manta: 5,
    sun: 2,
    whale: 1,
    lion: 3,
    urchin: 10,
  }
  range(n).map(i => {
    const spawn = spawns[rand.weighted(weights)]
    const n = spawn[1]()
    const pos = V.ne(rand.f(right - left) + left, rand.f(bottom - top) + top)
    range(n).map(j => {
      const args = {
        pos: pos.ad(V.p(rand.f(maths.TAU), rand.f(spawn_radius))),
      }
      spawn[2]?.(args)
      const x = new spawn[0](args)
      state.entities.push(x)
    })
  })
}

let last_cave_i = undefined
const spawn_cave = (meta) => {
  if (meta.spawned) return

  // spawn inside cave
  meta.cave.vs.map(v => {
    // spawn aggressive entities
    const pos = V.ne(v.x * CAVE_APART.x + meta.start/CAVE_SCALE, v.y * CAVE_APART.y + 1).sc(CAVE_SCALE).ad(V.ne(CAVE_SCALE/2, CAVE_SCALE/2))
    const [Class, n] = rand.sample([
      [Anglerfish, rand.i(4) + 1],
      [Lionfish, rand.i(2) + 1],
    ])
    range(n).map(i => {
      state.entities.push(new Class({
        pos,
      }))
    })
  })

  // spawn next openwater
  const left = meta.right
  const right = left + CAVE_BETWEEN
  const top = 0
  const bottom = HEIGHT
  spawn_openwater(V.ne(left, top), V.ne(right, bottom), 20)

  meta.spawned = true
  last_cave_i = meta.i
}

const render = {
  ui: () => {
    switch (mode) {
      case MODES.MENU:
        ui.innerHTML = `
        <div class="cover center">
          <div style="
          margin-top: 40%;
          font-size: 2em;
          animation: blink 2s infinite;
          color: #fff;
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
              ${range(state.player.max_health).map(i => {
                return `<span style="
                color: ${state.player.health > i ? '#f00' : '#444'};
                font-size: 3em;
                line-height: 1;
                ">♥</span>`
              }).join('')}
            </div>
            <div style="
            width: fit-content;
            background: #000;
            color: #fff;
            padding: .5em;
            border-radius: .5em;
            ">${state.player.score} gold 🟡</div>
          </div>
          `
        }
        break
      case MODES.END:
        ui.innerHTML = `
        <div class="cover center">
          <div style="
          margin-top: 40%;
          font-size: 2em;
          color: #fff;
          ">game over </div>
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
      break
  }
  // construct
  switch (new_mode) {
    case MODES.MENU:
      // generate caves
      state.caves = range(7).map(i => {
        return generate(i)
      })
      let cave_start = CAVE_START
      state.cave_metas = state.caves.map((cave, i) => {
        let rel_cave_left = cave.vs[0].x * CAVE_SCALE * CAVE_APART.x
        let rel_cave_right = cave.vs[cave.vs.length - 1].x * CAVE_SCALE * CAVE_APART.x
        let cave_width = rel_cave_right - rel_cave_left
        let rel_cave_top = 1 * CAVE_SCALE * CAVE_APART.y
        let rel_cave_bottom = 4 * CAVE_SCALE * CAVE_APART.y
        let cave_height = rel_cave_bottom - rel_cave_top
        const meta = {
          i,
          cave: cave,
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
        cave_start += cave_width + CAVE_BETWEEN
        return meta
      })

      // add walls
      const chunks = {}
      const chunk_pos_to_key = pos => `${pos.x},${pos.y}`

      // add seafloor
      const back_wall = -5
      const end_wall = Math.ceil((state.cave_metas[state.cave_metas.length - 1].right + CAVE_BETWEEN) / CAVE_SCALE)
      const bottom = Math.ceil(state.cave_metas[0].bottom / CAVE_SCALE)
      for (let i = back_wall - 3; i < end_wall + 3; i++) {
        for (let j = (i <= back_wall || end_wall < i) ? -10 : 3; j < bottom; j++) {
          const pos = V.ne(i, j)
          chunks[chunk_pos_to_key(pos)] = pos
        }
      }

      // add islands, remove caves
      state.cave_metas.map(meta => {
        const cave = meta.cave

        // island above (added)
        for (let x = 0; x < meta.width; x += CAVE_SCALE) {
          for (let y = -HEIGHT; y < HEIGHT; y += CAVE_SCALE) {
            let pos = V.ne(x + meta.start, y).sc(1/CAVE_SCALE)
            pos = V.ne(Math.round(pos.x), Math.round(pos.y))
            chunks[chunk_pos_to_key(pos)] = pos
          }
        }

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
      state.colliders = []
      values(chunks).map(chunk_pos => {
        const body = new Bodies.rectangle(chunk_pos.x * CAVE_SCALE + CAVE_SCALE/2, chunk_pos.y * CAVE_SCALE + CAVE_SCALE/2, CAVE_SCALE, CAVE_SCALE, {
          isStatic: true
        })
        state.colliders.push(body)
        Composite.add(engine.world, body)
      })

      // spawn entities
      state.entities = []
      state.player = new Player({
        ship: SHIPS.BUOY,
        pos: V.ne(0, HEIGHT/3),
      })
      state.entities.push(state.player)

      // spawn aggressors in caves

      spawn_openwater(V.ne(-WIDTH, 0), V.ne(WIDTH, HEIGHT), 20)

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

      // spawn first cave
      spawn_cave(state.cave_metas[0])

      break
    case MODES.PLAY:
      break
    case MODES.END:
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

      if (state.player) {
        state.x = state.player.pos.x
        state.y = state.player.pos.y

        // spawn next cave once past end
        const cave_meta = state.cave_metas[last_cave_i]
        if (cave_meta && state.x > cave_meta.right) {
          const next_cave_meta = state.cave_metas[last_cave_i + 1]
          if (next_cave_meta) {
            spawn_cave(next_cave_meta)
          }
        }
      } else if (mode === MODES.PLAY) {
        set_mode(MODES.END)
      } else {
        if (state.keys[' ']) {
          set_mode(MODES.MENU)
          set_mode(MODES.PLAY)
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
      let strip_height = 4
      for (let i = 0; i < HEIGHT * 2/strip_height; i++) {
        const factor = i / 8
        ctx.fillStyle = `hsl(223deg ${40 - factor}% ${30 - factor}%)`
        if (i === 6) ctx.fillRect(0, HEIGHT - screen_liquid_height + i * strip_height, WIDTH, HEIGHT * 3)
        else ctx.fillRect(0, HEIGHT - screen_liquid_height + i * strip_height, WIDTH, strip_height + 1)
      }

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

      arc.draw_sprite(ctx, sheet.title, WIDTH/2, HEIGHT/2, { scale:4, center:true, camera:state })
      break
    case MODES.PLAY:
    case MODES.END:
      draw_land()

      ctx.save()
      ctx.translate(WIDTH/2 - state.x, HEIGHT/2 - state.y)
      state.colliders.map(collider => {
        draw_body(ctx, collider, {
          fill:COLORS.LAND[1],
          // stroke:'red'
        })
      })
      state.entities.map(x => x.draw(state, ctx))
      ctx.restore()

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

      render.ui()

      if (mode === MODES.END) {
        ctx.fillStyle = 'rgba(0, 0, 0, .5)'
        ctx.fillRect(0, 0, WIDTH, HEIGHT)
        arc.draw_sprite(ctx, sheet.title, WIDTH/2, HEIGHT/2, { scale:4, center:true, camera:state })
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
          other.hit(100)
        }
      }
      if (entity.target_dir) entity.target_dir += Math.PI
      if (other.value && entity === state.player) {
        log('collect', other.value)
        state.player.score += other.value
        other.hit(100)
      }
    }
    do_damage(a, b)
    do_damage(b, a)
    // log('collide', a.health, b.health)
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
        if (e.ranged) e.hit(100)
        if (e.target_dir) e.target_dir += Math.PI
      }
    }
  })
}
Matter.Events.on(engine, 'collisionStart', handle_collision)
Matter.Events.on(engine, 'collisionActive', handle_collision)