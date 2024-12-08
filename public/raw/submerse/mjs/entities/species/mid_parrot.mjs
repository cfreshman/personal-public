import { Anim } from "../../anim.mjs";
import { get_sheet } from "../../common.mjs";
import { Creature } from "./creature.mjs";

export class MidnightParrotfish extends Creature {
  constructor(props) {
    super({
      ...props,
      name: 'midnight parrotfish',
      anim: new Anim({
        sheet: get_sheet(),
        names: ['midparrot0', 'midparrot1'],
        time: .25,
      }),
      mass: 2,
      health: 2,
      size: V.ne(22, 7), anchor: V.ne(0, -1),
      temperment: Creature.TEMPERMENT.UNAFRAID,
      target_speed: .1,
      force: 100,
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