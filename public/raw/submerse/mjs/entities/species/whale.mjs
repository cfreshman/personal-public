import { Anim } from "../../anim.mjs";
import { get_sheet } from "../../common.mjs";
import { Creature } from "./creature.mjs";

export class Whale extends Creature {
  constructor(props) {
    super({
      ...props,
      name: 'whale',
      anim: new Anim({
        sheet: get_sheet(),
        names: ['whale0', 'whale1', 'whale2', 'whale3', 'whale4', 'whale5'],
        time: .25,
      }),
      mass: 5,
      health: 5,
      size: V.ne(48, 16), anchor: V.ne(6, 1),
      temperment: Creature.TEMPERMENT.UNAFRAID,
      target_speed: .5,
      force: 25,
    })
  }
}