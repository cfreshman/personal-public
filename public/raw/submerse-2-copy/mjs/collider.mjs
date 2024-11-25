export class Collider {
  constructor({ v0, v1, pos, size, color=undefined, }) {
    if (v0 && v1) {
      pos = V.ad(v0, v1).sc(0.5)
      size = V.ne(Math.abs(v0.x - v1.x), Math.abs(v0.y - v1.y))
    }
    this.pos = pos || V.ne(0, 0)
    this.size = size || V.ne(1, 1)
    this.color = color
  }

  draw(state, ctx) {
    ctx.fillStyle = ctx.strokeStyle = this.color
    ctx.lineWidth = .5
    ctx.lineJoin = 'square'
    ctx.fillRect(this.pos.x - this.size.x/2, this.pos.y - this.size.y/2, this.size.x, this.size.y)
    ctx.strokeRect(this.pos.x - this.size.x/2, this.pos.y - this.size.y/2, this.size.x, this.size.y)
  }

  collides(other, off) {
    // return (x, y) where collision occurs
    const next_x = this.pos.x + off.x
    const next_y = this.pos.y + off.y
    
    if (next_x - this.size.x/2 < other.pos.x + other.size.x/2 &&
        next_x + this.size.x/2 > other.pos.x - other.size.x/2 &&
        next_y - this.size.y/2 < other.pos.y + other.size.y/2 &&
        next_y + this.size.y/2 > other.pos.y - other.size.y/2) {
      const x_diff = (next_x - other.pos.x) / (this.size.x/2 + other.size.x/2)
      const y_diff = (next_y - other.pos.y) / (this.size.y/2 + other.size.y/2)
      const x_fault = Math.abs(x_diff) > Math.abs(y_diff)
      const y_fault = Math.abs(y_diff) > Math.abs(x_diff)
      return [x_fault, y_fault]
    }
  }
}