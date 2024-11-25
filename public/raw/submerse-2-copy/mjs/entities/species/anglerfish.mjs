import { Anim } from "../../anim.mjs";
import { get_sheet } from "../../sheet.mjs";
import { Creature } from "./creature.mjs";

export class Anglerfish extends Creature {
  constructor(props) {
    props.anim = new Anim({
      sheet: get_sheet(),
      names: ['angler0', 'angler1'],
      time: 10,
    })
    props.target_speed = 100
    props.force = 100
    super(props)
  }

  update(state, dt) {
    let player = state.player
    if (player.pos.ad(this.pos.sc(-1)).ma() < 50) {
      this.state = Creature.STATE.FLEE
    } else {
      this.state = Creature.STATE.ROAM
    }

    switch(this.state) {
      case Creature.STATE.ROAM:
        let da
        if (this.vel.ma() > this.target_speed) {
          this.acc = V.ne(0, 0) // V.p(this.acc.an()[0], 0)
          da = 0
        } else {
          da = Math.random()*4-2.1
        }
        this.acc = this.acc.ad(V.p(this.acc.an()[0] + (Math.random() * Math.PI - Math.PI/2), this.force * da * dt))
        break;
      case Creature.STATE.CHASE:
        // a.setVector(force/m, getDirectionTo(player));
        break;
      case Creature.STATE.FLEE:
          this.acc = V.p(this.pos.ad(player.pos.sc(-1)).an()[0], this.force * 1.5 / this.mass)
          break;
      case Creature.STATE.ATTACK:
        break;
    }

    super.update(state, dt)
    this.anim.update(state, dt * this.acc.ma())
  }

  draw(state, ctx) {
    super.draw(state, ctx)
  }
}