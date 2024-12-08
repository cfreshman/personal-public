import { Anim } from "../../anim.mjs";
import { get_sheet } from "../../common.mjs";
import { Creature } from "./creature.mjs";

export class Urchin extends Creature {
  constructor(props) {
    super({
      ...props,
      name: 'urchin',
      anim: new Anim({
        sheet: get_sheet(),
        names: ['urchin0', 'urchin1', 'urchin2', 'urchin3'],
        time: .5,
      }),
      mass: 1,
      size: V.ne(8, 6), anchor: V.ne(0, 0),
      body: Matter.Bodies.circle(props.pos.x, props.pos.y, 4),
      temperment: Creature.TEMPERMENT.STATIC,
      sight_radius: 0,
      damage: 1,
      target_speed: 0,
      force: 0,
    })
  }

  update(state, dt) {
    this.acc = V.ne(0, 1)
    super.update(state, dt)
  }
}