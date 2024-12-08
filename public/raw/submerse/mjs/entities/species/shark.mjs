import { Anim } from "../../anim.mjs";
import { get_sheet } from "../../common.mjs";
import { Creature } from "./creature.mjs";

export class Shark extends Creature {
  constructor(props) {
    super({
      ...props,
      name: 'shark',
      anim: new Anim({
        sheet: get_sheet(),
        names: ['shark0', 'shark1'],
        time: .25,
      }),
      mass: 2,
      health: 2,
      size: V.ne(28, 6), anchor: V.ne(0, 1),
      temperment: Creature.TEMPERMENT.AGGRESSIVE,
      sight_radius: 100,
      damage: 2,
      target_speed: .2,
      force: 75,
      gold: 2,
    })
  }
}