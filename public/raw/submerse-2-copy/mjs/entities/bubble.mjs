import { Anim } from '../anim.mjs'
import { Entity } from '../entity.mjs'
import { get_sheet } from '../sheet.mjs'

export class Bubble extends Entity {
  constructor(props) {
    props.z = -1
    props.ttl = 1 + rand.s(.5)
    props.anim = new Anim({
      sheet: get_sheet('bubble'),
      names: [rand.sample(['bubble0', 'bubble1', 'bubble2', 'bubble3', 'bubble4'])],
    })
    props.drag = V.ne(0, 0)
    // props.acc = V.ne(0, -20)
    super(props)
  }

  update(state, dt) {
    this.ttl -= dt
    if (this.ttl < 0) {
      state.remove.push(this)
    }
    super.update(state, dt)
  }

  draw(state, ctx) {
    super.draw(state, ctx)
  }
}