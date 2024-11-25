import { Anim } from "../anim.mjs"
import { Entity } from "../entity.mjs"
import { get_sheet } from "../common.mjs"
import { Bubble } from "./bubble.mjs"
import { Torpedo } from "./torpedo.mjs"
import { DeadPlayer } from "./dead_player.mjs"

export const SHIPS = {
  BUOY: 'buoy',
  RIPTIDE: 'riptide',
  DREDGER: 'dredger',
}
export const STATS = {
  [SHIPS.BUOY]: {
    sprite: 'sub0',
    health: 3,
    // force: V.ne(10, 3),
    force: V.ne(5, 2),
    mass: 1,
    drag: V.ne(1, 1),
    size: V.ne(12, 6),
    bubble_pos: V.ne(-7, .5),
    bubble_density: 1,
    torpedo_pos: V.ne(7, 2),
  },
  [SHIPS.RIPTIDE]: {
    hp: 100,
    max_hp: 100,
    force: 100,
    mass: 1,
    drag: 1,
  },
  [SHIPS.DREDGER]: {
    hp: 100,
    max_hp: 100,
    force: 100,
    mass: 1,
    drag: 1,
  },
}

export class Player extends Entity {
  constructor(props) {
    const { ship } = props
    props.anim = new Anim({
      sheet: get_sheet(),
      names: [STATS[ship].sprite],
    })
    super({
      ...props,
      ...STATS[ship],
      physical: true,
      takes_melee: true,
      takes_ranged: true,
      is_friendly: true,
      score: 0,
    })
  }

  update(state, dt) {
    this.acc = new V(0, 0)
    if (state.keys['a'] || state.keys['ArrowLeft']) {
      this.acc.x = -1
    }
    if (state.keys['w'] || state.keys['ArrowUp']) {
      this.acc.y = -1
    }
    if (state.keys['d'] || state.keys['ArrowRight']) {
      this.acc.x = 1
    }
    if (state.keys['s'] || state.keys['ArrowDown']) {
      this.acc.y = 1
    }
    if (state.downs[' ']) {
      state.downs[' '] = false
      state.add.push(new Torpedo({
        pos: this.pos.ad(V.ne((this.is_left ? -1 : 1) * this.torpedo_pos.x, this.torpedo_pos.y)),
        vel: this.vel.ad(V.ne((this.is_left ? -1 : 1) * 2, 0)),
        acc: V.ne(this.is_left ? -1 : 1, 0),
      }))
    }
    this.acc = this.acc.no().mu(this.force)
    // console.log(this.acc)

    if (this.acc.ma() && this.pos.y >= 0) {
      for (let i = 0; i < this.bubble_density; i++) {
        const v_bubble = V.ne(0, 0)
          // .ad(V.p((rand.f(.05) + .01) * this.force.x, this.is_left ? 0 : Math.PI))
          .ad(V.p(rand.f(30) + 10, rand.s(Math.PI/3) + (this.is_left ? 0 : Math.PI)))
        state.add.push(new Bubble({
          pos: this.pos.ad(V.ne((this.is_left ? -1 : 1) * this.bubble_pos.x, this.bubble_pos.y)),
          vel: v_bubble,
          ttl: rand.f(.25) + .75,
        }))
      }
    }

    super.update(state, dt)
  }

  die(state) {
    state.player = false
    super.die(state)
    state.add.push(new DeadPlayer({
      pos: this.pos,
      vel: this.vel,
      anim: this.anim,
      body: this.body,
      ...STATS[this.ship],
      takes_melee: false,
      takes_ranged: false,
    }))
  }
}