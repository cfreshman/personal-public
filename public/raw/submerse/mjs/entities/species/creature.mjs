import { Entity } from "../../entity.mjs"

export class Creature extends Entity {
  state
  temperment
  sight_radius
  damage
  target_speed
  force

  constructor(props) {
    super({
      physical: true,
      takes_melee: false,
      takes_ranged: true,
      ...props,
    })
    Object.assign(this, {
      state: Creature.STATE.ROAM,
      temperment: Creature.TEMPERMENT.DEFAULT,
      sight_radius: 100,
      damage: 0,
      target_speed: .5,
      force: 100,
    }, pick(props, 'state temperment sight_radius damage target_speed force'))
    this.target_dir = rand.f(Math.PI * 2)
  }

  update(state, dt) {
    if (this.temperment === Creature.TEMPERMENT.STATIC) {
      
    } else {
      let player = state.player
      if (player && player.pos.ad(this.pos.sc(-1)).ma() < this.sight_radius) {
        if (this.temperment === Creature.TEMPERMENT.UNAFRAID) {
          this.state = Creature.STATE.ROAM
        } else if (this.temperment === Creature.TEMPERMENT.AGGRESSIVE) {
          this.state = Creature.STATE.CHASE
        } else if (this.temperment === Creature.TEMPERMENT.DEFAULT) {
          this.state = Creature.STATE.FLEE
        }
      } else {
        this.state = Creature.STATE.ROAM
      }
  
      this.acc = V.ne(0, 0)
      switch(this.state) {
        case Creature.STATE.ROAM:
          let da
          if (this.vel.ma() > this.target_speed) {
            this.acc = V.ne(0, 0) // V.p(this.acc.an()[0], 0)
            da = 0
          } else {
            da = 1 + Math.random()
          }
          this.target_dir += rand.s(Math.PI/4) * da * dt
          let base_angle = this.target_dir // this.vel.ma() ? this.vel.an()[0] : Math.random() * Math.PI * 2
          this.acc = this.acc.ad(V.p(base_angle + (Math.random() * Math.PI/2 - Math.PI/4), this.force * da * dt))
          break;
        case Creature.STATE.CHASE:
          this.acc = V.p(player.pos.ad(this.pos.sc(-1)).an()[0], this.force * dt)
          // a.setVector(force/m, getDirectionTo(player));
          break;
        case Creature.STATE.FLEE:
            this.acc = V.p(this.pos.ad(player.pos.sc(-1)).an()[0], this.force * 1.5 * dt)
            break;
        case Creature.STATE.ATTACK:
          break;
      }
    }

    super.update(state, dt)
    this.anim.update(state, dt * this.acc.ma())
  }
}
Creature.STATE = {
  STATIC: -1,
  ROAM: 0,
  CHASE: 1,
  ATTACK: 2,
  FLEE: 3,
}
Creature.TEMPERMENT = {
  STATIC: -1,
  DEFAULT: 0,
  UNAFRAID: 1,
  AGGRESSIVE: 2,
}