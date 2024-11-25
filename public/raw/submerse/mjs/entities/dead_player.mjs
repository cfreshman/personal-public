import { Entity } from "../entity.mjs"

export class DeadPlayer extends Entity {
  constructor(props) {
    super({
      ...props,
      physical: true,
      acc: V.ne(0, 1),
      upside_down: true,
    })
  }
}