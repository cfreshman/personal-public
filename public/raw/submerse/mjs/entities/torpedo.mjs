import { Anim } from '../anim.mjs'
import { Entity } from '../entity.mjs'
import { get_sheet } from '../common.mjs'
import { Bubble } from './bubble.mjs'

export class Torpedo extends Entity {
  constructor(props) {
    super({
      z: 1,
      drag: V.ne(0, 1),
      ttl: 2,
      ...props,
      anim: new Anim({
        sheet: get_sheet(),
        names: ['torpedo'],
      }),
      ranged: true,
      damage: 1,
      takes_melee: true,
      physical: true, size: V.ne(5, 3),
      from_friendly: true,
    })
  }

  update(state, dt) {
    this.ttl -= dt
    if (this.ttl < 0) {
      this.die(state)
    } else {
      // spawn bubble trail
      const bubbles = []
      for (let i = 0; i < 1; i++) {
        bubbles.push(new Bubble({
          pos: this.pos.ad(V.ne(this.is_left ? -1 : 1, 0)),
          vel: this.vel.ad(V.ne(rand.s(3), rand.s(3))),
        }))
      }
      state.add.push(...bubbles)
    }
    
    super.update(state, dt)
  }

  die(state) {
    super.die(state)

    // spawn bubble explosion
    const bubbles = []
    for (let i = 0; i < 50; i++) {
      bubbles.push(new Bubble({
        pos: this.pos,
        vel: this.vel.ad(V.p(rand.f(maths.TAU), Math.sqrt(rand.f(25 * 25)))),
      }))
    }
    state.add.push(...bubbles)
  }

  draw(state, ctx) {
    super.draw(state, ctx)
  }
}