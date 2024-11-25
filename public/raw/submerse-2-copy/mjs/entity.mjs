import { Collider } from "./collider.mjs"
export class Entity {
  pos; vel; acc; mass; drag; is_left; anim; size; collider;

  constructor(props) {
    this.id = rand.alphanum(12)
    this.z = 0
    this.pos = V.ne(0, 0)
    this.vel = V.ne(0, 0)
    this.acc = V.ne(0, 0)
    this.mass = 1
    this.drag = V.ne(1, 1)
    this.is_left = false
    this.anim = null
    this.size = V.ne(1, 1)
    Object.assign(this, props)
    this.collider = new Collider({
      pos: this.pos,
      size: this.size,
    })
  }

  update(state, dt) {
    if (this.pos.y < 0) {
      this.acc.y = 200
    }

    this.vel = V.ne(this.vel.x * (1 - this.drag.x * dt), this.vel.y * (1 - this.drag.y * dt))
    this.vel = this.vel.ad(this.acc.sc(dt)) // .ad(this.drag.sc(-this.vel.ma()))
    this.pos = this.pos.ad(this.vel.sc(dt))

    // console.log(this.vel, this.pos)

    this.collider.pos = this.pos
  }

  draw(state, ctx) {
    const new_is_left = this.acc.x < 0 ? true : this.acc.x > 0 ? false : undefined
    if (new_is_left !== undefined) this.is_left = new_is_left
    this.anim.draw(state, ctx, this.pos.x, this.pos.y, { is_left:this.is_left })
  }
}