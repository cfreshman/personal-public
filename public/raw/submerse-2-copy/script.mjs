import { set_sheet } from './mjs/sheet.mjs'
import { generate } from './mjs/caves.mjs'
import { get_height } from './mjs/islands.mjs'

import { Anim } from './mjs/anim.mjs'
import { Entity } from './mjs/entity.mjs'
import { SHIPS, Player } from './mjs/entities/player.mjs'
import { Collider } from './mjs/collider.mjs'
import { Anglerfish } from './mjs/entities/species/anglerfish.mjs'

const log = named_log('submerse')

const WIDTH = 400
const HEIGHT = 300
const SCALE = 4
const FPS = 30
const DEBUG = true

const width = WIDTH * SCALE
const height = HEIGHT * SCALE
const half_width = width / 2
const half_height = height / 2

const sheet = await arc.a_sheet('sheet.png', [
  ['title', 1, 1, 33, 14],
  ['sub0', 1, 16, 11, 6], // BUOY
  ['sub1', 1, 23, 46, 15], // RIPTIDE
  ['sub2', 1, 39, 36, 17], // DREDGER

  ['angler', 1, 57, 16, 10, 2, 17, 0],
  ['manta', 1, 68, 31, 12, 6, 32, 0],
  ['sunfish', 1, 81, 33, 51, 4, 34, 0],
  ['whale', 1, 170, 72, 25, 6, 73, 0],

  ['bubble0', 35, 1, 3, 3],
  ['bubble1', 35, 5, 3, 3],
  ['bubble2', 35, 9, 2, 2],
  ['bubble3', 35, 12, 2, 2],
  ['bubble4', 35, 15, 1, 1],

  ['torpedo', 39, 1, 3, 1],
], {
  scale: 1,
})
log({ sheet })
set_sheet(sheet)

const canvas = Q('#root')
canvas.width = width
canvas.height = height
const ctx = canvas.getContext('2d')
ctx.imageSmoothingEnabled = false

const COLORS = {
  SKY: '#a8cdf3',
  OCEAN: '#2f4c89',
  LAND: ['#202020', '#181818', '#101010'],
}

const do_resize = () => {
  const outer = canvas.parentElement.getBoundingClientRect()
  const outer_aspect = outer.width / outer.height
  const inner = canvas.getBoundingClientRect()
  const inner_aspect = WIDTH / HEIGHT
  const scale = inner_aspect > outer_aspect
    ? outer.width / WIDTH
    : outer.height / HEIGHT
  canvas.style.width = `${WIDTH * scale}px`
  canvas.style.height = `${HEIGHT * scale}px`
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
  x: 0,
  y: HEIGHT/3,
  keys: {},
  downs: {},
  ups: {},

  entities: [],
  player: undefined,
  chunks: {},
  colliders: [],

  add: [],
  remove: [],
  caves: [],
  cave_meta: [],
}

const LIQUID_HEIGHT = 0
const LAND_HEIGHT = HEIGHT * 5/4 - HEIGHT * 1/3
const CAVE_SCALE = WIDTH / 4
const CAVE_APART = V.ne(1 + 2, 1 + 1)

const chunk_key_to_pos = (key) => {
  const [x, y] = key.split(',').map(Number)
  return V.ne(x, y)
}
const chunk_pos_to_key = (pos) => {
  return `${pos.x},${pos.y}`
}

const set_mode = (new_mode) => {
  // teardown
  switch (mode) {
    case MODES.MENU:
      break
    case MODES.PLAY:
      break
    case MODES.END:
      break
  }
  // construct
  switch (new_mode) {
    case MODES.MENU:
      state.chunks = {}
      const back_wall = -5
      for (let i = back_wall - 3; i < 30; i++) {
        for (let j = i <= back_wall ? -10 : 3; j < 6; j++) {
          const pos = V.ne(i, j)
          state.chunks[chunk_pos_to_key(pos)] = pos
        }
      }

      // state.caves = [generate()]
      state.caves = range(7).map(i => {
        return generate(i)
      })
      let cave_start = WIDTH * 7/8
      let cave_between = WIDTH * 2
      state.cave_meta = state.caves.map(cave => {
        let rel_cave_left = cave.vs[0].x * CAVE_SCALE
        let rel_cave_right = cave.vs[cave.vs.length - 1].x * CAVE_SCALE
        let cave_width = (rel_cave_right - rel_cave_left) * CAVE_APART.x
        let rel_cave_top = maths.min(cave.vs.map(v => v.y)) * CAVE_SCALE
        let rel_cave_bottom = maths.max(cave.vs.map(v => v.y)) * CAVE_SCALE
        let cave_height = (rel_cave_bottom - rel_cave_top) * CAVE_APART.y
        const meta = {
          left: rel_cave_left + cave_start,
          right: rel_cave_right + cave_start,
          top: rel_cave_top,
          bottom: rel_cave_bottom,
          width: cave_width,
          height: cave_height,
          cave: cave,
        }
        log({ meta })

        // draw island above
        for (let x = 0; x < cave_width; x += CAVE_SCALE) {
          for (let y = -HEIGHT; y < HEIGHT; y += CAVE_SCALE) {
            let pos = V.ne(x + cave_start, y).sc(1/CAVE_SCALE) // .ad(V.ne(cave_start / CAVE_SCALE, 0))
            pos = V.ne(Math.round(pos.x), Math.round(pos.y))
            state.chunks[chunk_pos_to_key(pos)] = pos
          }
        }

        // remove cave system
        cave.es.map(e => {
          const v0 = cave.vs[e[0]]
          const v1 = cave.vs[e[1]]
          const off_x = (v1.x - v0.x) / CAVE_APART.x
          const off_y = (v1.y - v0.y) / CAVE_APART.y
          for (let i = 0; i <= (off_x ? CAVE_APART.x : CAVE_APART.y); i++) {
            const x = v0.x + off_x * i
            const y = v0.y + off_y * i
            let pos = V.ne(x * CAVE_APART.x + cave_start/CAVE_SCALE, y * CAVE_APART.y + 1) // .ad(V.ne(cave_start / CAVE_SCALE, 0))
            pos = V.ne(Math.round(pos.x), Math.round(pos.y))
            delete state.chunks[chunk_pos_to_key(pos)]
            // log(pos)
          }
        })

        cave_start += cave_width + cave_between

        return meta
      })
      // log(state.chunks)

      // spawn entities
      state.entities = []
      state.player = new Player({
        type: SHIPS.BUOY,
        pos: V.ne(0, HEIGHT/3),
      })
      state.entities.push(state.player)

      range(100).map(i => {
        state.entities.push(new Anglerfish({
          pos: V.ne(rand.i(WIDTH), rand.i(HEIGHT)),
        }))
      })

      // add colliders
      state.colliders = []
      values(state.chunks).map(chunk_pos => {
        state.colliders.push(new Collider({
          pos: chunk_pos.sc(CAVE_SCALE).ad(V.ne(CAVE_SCALE/2, CAVE_SCALE/2)),
          size: V.ne(CAVE_SCALE, CAVE_SCALE),
          color: COLORS.LAND[1],
        }))
      })
      // // bottom of ocean
      // state.colliders.push(new Collider({
      //   pos: V.ne(0, HEIGHT),
      //   size: V.ne(WIDTH, HEIGHT),
      //   color: 'green',
      // }))
      break
    case MODES.PLAY:
      break
    case MODES.END:
      break
  }
  mode = new_mode
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
      // update entitites
      state.add = []
      state.remove = []
      state.entities.map(x => x.update(state, dt))
      const remove_ids = set(state.remove.map(x => x.id))
      state.entities = state.entities.filter(x => !remove_ids.has(x.id))
      state.entities.push(...state.add)
      state.entities.sort((a, b) => a.z - b.z)

      state.x = state.player.pos.x
      state.y = state.player.pos.y
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
      const metas = state.cave_meta
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
    const cave = state.caves[0]

    state.cave_meta.map(meta => {
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
      draw_caves()

      arc.draw_sprite(ctx, sheet.title, WIDTH/2, HEIGHT/2, { scale:4, center:true, camera:state })
      break
    case MODES.PLAY:
    case MODES.END:
      draw_land()

      ctx.save()
      ctx.translate(WIDTH/2 - state.x, HEIGHT/2 - state.y)
      state.colliders.map(collider => collider.draw(state, ctx))
      state.entities.map(x => x.draw(state, ctx))
      ctx.restore()

      draw_caves()
      break
  }
  ctx.restore()
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