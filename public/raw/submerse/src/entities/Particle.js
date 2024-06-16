import Arc from '../../../../lib/modules/arcm.js'
import { randi } from '../../../../lib/modules/utils.js';

export class Particle {
  pos; vel
  time; maxTime

  constructor(props) {
    this.pos = props.pos
    this.vel = props.vel
    this.maxTime = props.time
    this.time = 0
    this.skin = ['bubble0', 'bubble1', 'bubble2', 'bubble3', 'bubble4'][randi(5)]
  }

  update(dt) {
    this.time += dt
    if (this.time > this.maxTime) return true;

    this.vel = this.vel.add(Arc.V.polar(this.vel.mag()/.5*dt, this.vel.angle() + Math.PI))
    this.pos = this.pos.add(this.vel.scale(dt))
  }

  draw() {
    Arc.drawScaledSprite(this.skin, this.pos.x, this.pos.y, 1, .5, .5)
  }
}