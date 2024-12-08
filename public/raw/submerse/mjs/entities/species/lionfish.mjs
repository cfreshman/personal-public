import { Anim } from "../../anim.mjs";
import { get_sheet } from "../../common.mjs";
import { Creature } from "./creature.mjs";

export class Lionfish extends Creature {
  constructor(props) {
    super({
      ...props,
      name: 'lionfish',
      anim: new Anim({
        sheet: get_sheet(),
        names: ['lionfish0', 'lionfish1'],
        time: .5,
      }),
      mass: 1,
      size: V.ne(10, 6), anchor: V.ne(2, 1),
      temperment: Creature.TEMPERMENT.AGGRESSIVE,
      sight_radius: 100,
      damage: 1,
      target_speed: .1,
      force: 50,
      gold: 1,
    })
  }
}