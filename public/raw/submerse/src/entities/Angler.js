import Arc from '../../../../lib/modules/arcm.js'
import { Anim } from "./Anim.js"
import { Creature } from "./Creature.js"

export class Angler extends Creature {
  targetSpeed;

  constructor(props) {
    super({
      mass: 2,
      drag: new Arc.V(4, 4),
      force: 100,
      anim: new Anim({
        skins: ['angler0', 'angler1'],
        time: 6,
      }),
      ...props,
    })
    this.targetSpeed = this.force/this.mass
    this.vel = new Arc.V(
      (Math.random()*2-1) * this.targetSpeed/this.drag.x,
      (Math.random()*2-1) * this.targetSpeed/this.drag.y)
    this.acc = Arc.V.polar(.01, this.vel.angle())
  }

  update(dt, gameState) {
    let player = gameState.players[0]
    if (player.pos.dist(this.pos) < 50) {
      this.state = Creature.State.flee
    } else {
      this.state = Creature.State.roam
    }

    switch(this.state) {
      case Creature.State.roam:
        let dA
        if (this.acc.mag() > this.targetSpeed) {
          this.acc = Arc.V.polar(1, this.acc.angle())
          dA = 0;
        } else {
          dA = Math.random()*4-2.1;
        }

        this.acc = this.acc.add(Arc.V.polar(this.force*dA*dt, this.acc.angle() + Math.random()*Math.PI-Math.PI/2))
        break;
      case Creature.State.chase:
        // a.setVector(force/m, getDirectionTo(player));
        break;
      case Creature.State.flee:
          this.acc = Arc.V.polar(this.force*1.5/this.mass, player.pos.angle(this.pos));
          break;
      case Creature.State.attack:
        break;
    }

    this.anim.update(dt * this.acc.mag())
    super.update(dt);
  }
}