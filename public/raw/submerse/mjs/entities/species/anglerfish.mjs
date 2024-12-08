import { Anim } from "../../anim.mjs";
import { get_sheet } from "../../common.mjs";
import { Creature } from "./creature.mjs";

export class Anglerfish extends Creature {
  constructor(props) {
    super({
      ...props,
      name: 'anglerfish',
      anim: new Anim({
        sheet: get_sheet(),
        names: ['angler0', 'angler1'],
        time: .25,
      }),
      mass: 1,
      size: V.ne(10, 6), anchor: V.ne(0, 2),
      temperment: Creature.TEMPERMENT.AGGRESSIVE,
      sight_radius: 100,
      damage: 1,
      target_speed: .1,
      force: 75,
      gold: 1,
    })
  }
}