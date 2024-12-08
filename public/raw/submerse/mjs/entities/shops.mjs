import { Anim } from '../anim.mjs'
import { Entity } from '../entity.mjs'
import { get_sheet } from '../common.mjs'
import { Bubble } from './bubble.mjs'

export class Shops extends Entity {
  constructor(props) {
    super({
      z: -1,
      ...props,
      anim: new Anim({
        sheet: get_sheet(),
        names: ['shops'],
      }),
      takes_melee: false,
      takes_ranged: false,
      physical: true, size: V.ne(29, 7), anchor: V.ne(0, 1),
      body: Matter.Bodies.rectangle(props.pos.x, props.pos.y, 29 + 16, 7 + 16, {
        isSensor: true,
      }),
      mass: 10,
      shop: true,
    })
  }

  update(state, dt) {
    this.acc = V.ne(0, -.1)
    super.update(state, dt)
  }
}