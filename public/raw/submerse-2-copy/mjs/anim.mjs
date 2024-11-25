export class Anim {
  constructor(props) {
    this.sheet = null
    this.names = []
    this.time = 1
    this.counter = rand.f(this.time)
    this.index = 0
    this.is_left = false
    Object.assign(this, props)
  }

  update(state, dt) {
    this.counter += dt
    if (this.counter > this.time) {
      this.counter = 0
      this.index = (this.index + 1) % this.names.length
    }
  }

  draw(state, ctx, x, y, { is_left=undefined }) {
    arc.draw_sprite(ctx, this.sheet[this.names[this.index]], x, y, { flip:is_left, center:true, camera:state })
  }
}