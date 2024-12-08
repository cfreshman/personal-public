import { Anim } from '../anim.mjs'
import { Entity } from '../entity.mjs'
import { get_sheet } from '../common.mjs'
import { Bubble } from './bubble.mjs'

export class Gem extends Entity {
  constructor(props) {
    super({
      z: 1,
      ttl: 60,
      value: 1,
      ...props,
      anim: new Anim({
        sheet: get_sheet(),
        names: ['gem0', 'gem1', 'gem2', 'gem3', 'gem4'],
        time: .25,
      }),
      takes_ranged: false,
      physical: true, size: V.ne(4, 6),
      body: Matter.Bodies.rectangle(props.pos.x, props.pos.y, 6, 4),
      mass: .001,
    })
  }

  update(state, dt) {
    this.ttl -= dt
    if (this.ttl < 0) {
      this.die(state)
    } else {
      this.acc = V.ne(0, .5)
    }
    
    this.anim.update(state, dt)
    super.update(state, dt)
  }
}