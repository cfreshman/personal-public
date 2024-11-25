import { Entity } from "../../entity.mjs"

export class Creature extends Entity {
  state

  constructor(props) {
    super(props)
    this.state = props.state ?? Creature.STATE.ROAM
  }
}
Creature.STATE = {
  ROAM: 0,
  CHASE: 1,
  ATTACK: 2,
  FLEE: 3,
}