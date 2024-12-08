import { Anim } from "../../anim.mjs";
import { get_sheet } from "../../common.mjs";
import { Creature } from "./creature.mjs";

export class Trop0 extends Creature {
  constructor(props) {
    super({
      ...props,
      name: 'tropical fish',
      anim: new Anim({
        sheet: get_sheet(),
        names: ['trop00', 'trop01'],
        time: .25,
      }),
      mass: .25,
      health: 1,
      size: V.ne(5, 3), anchor: V.ne(0, 0),
      temperment: Creature.TEMPERMENT.DEFAULT,
      target_speed: 1,
      force: 100,
      sight_radius: 25,
    })
  }

  update(state, dt) {
    // if group and not leader, follow leader
    if (this.group && this.group[0] !== this) {
      const to_leader = this.group[0].pos.ad(this.pos.sc(-1))
      if (to_leader.ma() > 20) {
        this.target_dir = to_leader.an()[0]
      }
    }

    super.update(state, dt)
  }
}