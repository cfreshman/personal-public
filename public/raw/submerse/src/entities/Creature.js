import Arc from '../../../../lib/modules/arcm.js'
import { Entity } from "./Entity.js"

export class Creature extends Entity {
  state
  triggerRadius

  constructor(props) {
    super(props)
    this.state = props.state ?? Creature.State.roam
  }
}
Creature.State = {
  roam: 0,
  chase: 1,
  attack: 2,
  flee: 3,
}