import Arc from '../../../../lib/modules/arcm.js'
import { Anim } from "./Anim.js"
import { Creature } from "./Creature.js"
import * as util from '../../../../lib/modules/utils.js'

export class Manta extends Creature {
  targetSpeed

  constructor(props) {
    super({
      mass: 15,
      drag: new Arc.V(1, 8),
      force: 100,
      anim: new Anim({
        skins: ['manta0', 'manta1', 'manta2', 'manta3', 'manta4', 'manta5'],
        time: 1,
      }),
      ...props,
    })
    this.targetSpeed = util.randi(10) + 5
    this.vel = new Arc.V(
      (Math.random()*2-1) * this.targetSpeed/this.drag.x,
      (Math.random()*2-1) * this.targetSpeed/this.drag.y)
    this.acc = Arc.V.polar(.01, this.vel.angle())
  }

  update(dt, gameState) {
    // let player = gameState.players[0]
    // if (player.pos.dist(this.pos) < 20) {
    //   this.state = Creature.State.flee
    // } else {
    //   this.state = Creature.State.roam
    // }

    switch(this.state) {
      case Creature.State.roam:
        if (this.vel.mag() < this.targetSpeed && this.acc.mag() < .1) {
          this.acc = Arc.V.polar(this.force / this.mass, this.acc.angle())
        } else if (this.vel.mag() > this.targetSpeed*1.5 &&
          ((this.anim.index() === 1 && Math.sin(this.vel.angle()) >= 0)
          || (this.anim.index() ===  4 && Math.sin(this.vel.angle()) <= 0)) && this.acc.mag() > .1) {
          this.anim.counter = Math.floor(this.anim.counter/this.anim.time) * this.anim.time;
          this.acc = Arc.V.polar(.01, this.vel.angle() + Math.random()*Math.PI/3-Math.PI/6)
        }
        break;
      case Creature.State.flee:
        this.acc = Arc.V.polar(this.force*1.5/this.mass, player.pos.angle(this.pos));
        // a.setVector(force/m, getDirectionTo(player));
        break;
      case Creature.State.attack:
        break;
    }

    this.anim.update(dt * this.acc.mag())
    super.update(dt);
  }
}