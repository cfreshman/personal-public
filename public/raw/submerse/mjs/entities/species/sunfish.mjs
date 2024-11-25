import { Anim } from "../../anim.mjs";
import { get_sheet } from "../../common.mjs";
import { Creature } from "./creature.mjs";

export class Sunfish extends Creature {
  constructor(props) {
    super({
      ...props,
      anim: new Anim({
        sheet: get_sheet(),
        names: ['sunfish0', 'sunfish1', 'sunfish2', 'sunfish3'],
        time: .25,
      }),
      mass: 3,
      health: 3,
      size: V.ne(26, 18), anchor: V.ne(0, 0),
      temperment: Creature.TEMPERMENT.DEFAULT,
      target_speed: .5,
      force: 50,
    })
  }
}