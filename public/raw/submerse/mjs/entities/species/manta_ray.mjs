import { Anim } from "../../anim.mjs";
import { get_sheet } from "../../common.mjs";
import { Creature } from "./creature.mjs";

export class MantaRay extends Creature {
  constructor(props) {
    super({
      ...props,
      name: 'manta ray',
      anim: new Anim({
        sheet: get_sheet(),
        names: ['manta0', 'manta0', 'manta0', 'manta0', 'manta0', 'manta1', 'manta2', 'manta3', 'manta4', 'manta5'],
        time: .25,
      }),
      mass: 3,
      health: 3,
      size: V.ne(18, 6), anchor: V.ne(4, 1),
      temperment: Creature.TEMPERMENT.UNAFRAID,
      target_speed: 1,
      force: 25,
    })
  }
}