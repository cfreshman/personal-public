import Arc from '../../../../lib/modules/arcm.js'

export class Entity {
  pos; vel; acc
  mass; drag; force
  anim; flipWait; isLeft

  constructor(props) {
    this.pos = props.pos
    this.vel = props.vel ?? new Arc.V(0, 0)
    this.acc = props.acc ?? new Arc.V(0, 0)
    this.mass = props.mass ?? 1
    this.drag = props.drag ?? new Arc.V(1, 1)
    this.force = props.force ?? 100
    this.anim = props.anim
    this.isLeft = false
    this.flipWait = 0
  }

  update(dt) {
    // this.vel = this.vel.add(new Arc.V(this.acc.x * (this.drag.x/this.mass) * dt, this.acc.y * (this.drag.y/this.mass) * dt))
    let dragVelScale = this.drag.do(val => Math.pow(.95, dt * val))
    let dragAccScale = this.drag.do(val => 1/val)
    this.vel = this.vel.scale(dragVelScale).add(this.acc.scale(dt).scale(dragAccScale))
    // this.vel = this.vel.add(this.acc.scale(dt))
    this.pos = this.pos.add(this.vel.scale(dt))

    let bounds = [320, 240]
    let buffer = 20
    if (this.pos.x < -buffer) this.pos.x = bounds[0] + buffer
    if (this.pos.y < -buffer) this.pos.y = bounds[1] + buffer
    if (this.pos.x > bounds[0] + buffer) this.pos.x = -buffer
    if (this.pos.y > bounds[1] + buffer) this.pos.y = -buffer

    this.flipWait -= dt;
    if (this.flipWait < 0 && this.acc.mag() > 0) {
      let angle = this.acc.angle()
      if (this.isLeft !== (Math.PI/2 <= angle || angle < -Math.PI/2)) {
        this.isLeft = !this.isLeft;
        this.flipWait = .5;
      }
    }
  }

  draw() {
    Arc.drawScaledSprite(this.anim.get(), this.pos.x, this.pos.y, [this.isLeft ? -1 : 1, 1], .5, .5)
  }
}