import { Anim } from "../../anim.mjs";
import { get_sheet } from "../../common.mjs";
import { Creature } from "./creature.mjs";

export class Anemone extends Creature {
  constructor(props) {
    super({
      ...props,
      anim: new Anim({
        sheet: get_sheet(),
        names: ['anemone0', 'anemone1', 'anemone2', 'anemone3'],
        time: .5,
      }),
      mass: 10_000,
      size: V.ne(18, 14), anchor: V.ne(0, 1),
      body: Matter.Bodies.circle(props.pos.x, props.pos.y, 7),
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