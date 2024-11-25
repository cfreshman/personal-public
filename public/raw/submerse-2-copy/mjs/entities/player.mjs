import { Anim } from "../anim.mjs"
import { Collider } from "../collider.mjs"
import { Entity } from "../entity.mjs"
import { get_sheet } from "../sheet.mjs"
import { Bubble } from "./bubble.mjs"

export const SHIPS = {
  BUOY: 'buoy',
  RIPTIDE: 'riptide',
  DREDGER: 'dredger',
}
export const STATS = {
  [SHIPS.BUOY]: {
    sprite: 'sub0',
    hp: 100,
    force: V.ne(300, 100),
    mass: 1,
    drag: V.ne(1, 1),
    size: V.ne(12, 6),
    bubble_pos: V.ne(-7, .5),
    bubble_density: 1,
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
  type
  constructor(props) {
    const { type } = props
    props.anim = new Anim({
      sheet: get_sheet(),
      names: [STATS[type].sprite],
    })
    super({
      ...props,
      ...STATS[type],
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

    state.colliders.map(collider => {
      const collision = this.collider.collides(collider, this.vel.sc(dt))
      if (collision) {
        console.log({ collision })
        const [fx, fy] = collision
        const offset = collider.pos.ad(this.pos.sc(-1))
        if (fx) {
          this.vel.x = 0
          if (this.acc.x * offset.x > 0) {
            this.acc.x = 0
          }
        }
        if (fy) {
          this.vel.y = 0
          if (this.acc.y * offset.y > 0) {
            this.acc.y = 0
          }
        }
      }
    })

    super.update(state, dt)
    this.collider.pos = this.pos
  }

  draw(state, ctx) {
    super.draw(state, ctx)
  }
}