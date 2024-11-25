import Arc from '../../../../lib/modules/arcm.js'
import { randi } from '../../../../lib/modules/utils.js';
import { Anim } from "./Anim.js"
import { Entity } from "./Entity.js"
import { Particle } from "./Particle.js"

export class Player extends Entity {
  type = 'player'

  constructor(props) {
    let typeProps = [{
      mass: 5,
      drag: new Arc.V(4, 4),
      force: new Arc.V(800, 360),
      anim: new Anim({ skin: 'sub0' }),
      bubbleDensity: 1,
      bubblePos: new Arc.V(-7, .5),
    }, {
      mass: 20,
      drag: new Arc.V(2, 8),
      force: new Arc.V(2200, 1000),
      anim: new Anim({ skin: 'sub1' }),
      bubbleDensity: 2,
      bubblePos: new Arc.V(-25, 4),
    }, {
      mass: 30,
      drag: new Arc.V(4, 12),
      force: new Arc.V(3600, 1600),
      anim: new Anim({ skin: 'sub2' }),
      bubbleDensity: 3,
      bubblePos: new Arc.V(-20, 2),
    }][randi(3)]

    super({
      ...typeProps,
      ...props,
    })
    Object.assign(this, typeProps)
    this.lastSetIsLeft = true
  }

  update(dt, gameState) {
    let acc = new Arc.V(0, 0);
    let { keys } = gameState;
    if (keys.direction) {
      acc = keys.direction
    } else {
      if (keys['a'] || keys['ArrowLeft']) {
        acc = acc.add(new Arc.V(-1, 0))
        this.isLeft = true
      }
      if (keys['w'] || keys['ArrowUp']) {
        acc = acc.add(new Arc.V(0, -1))
      }
      if (keys['d'] || keys['ArrowRight']) {
        acc = acc.add(new Arc.V(1, 0))
        this.isLeft = false
      }
      if (keys['s'] || keys['ArrowDown']) {
        acc = acc.add(new Arc.V(0, 1))
      }
    }
    this.acc = acc.norm().scale(this.force.scale(1/this.mass))

    if (this.acc.mag() > 0) {
      for (let i = 0; i < this.bubbleDensity; i++) {
        let bubbleVel
        if (this.isLeft) {
          bubbleVel = this.vel
            .add(Arc.V.polar((Math.random()*.05 + .01) * this.force.x, 0))
            .add(Arc.V.polar((Math.random()*30 + 10), Math.random()*Math.PI/3-Math.PI/6))
        } else {
          bubbleVel = this.vel
            .add(Arc.V.polar((Math.random()*.05 + .01) * this.force.x, Math.PI))
            .add(Arc.V.polar((Math.random()*30 + 10), Math.PI + Math.random()*Math.PI/3-Math.PI/6))
        }
        gameState.entities.push(new Particle({
          pos: this.pos.add(new Arc.V((this.isLeft ? -1 : 1) * this.bubblePos.x, this.bubblePos.y)),
          vel: bubbleVel,
          time: Math.random()*.25+.75
        }))
      }
    }

    this.lastSetIsLeft = this.isLeft;
    super.update(dt);
    this.isLeft = this.lastSetIsLeft;
  }
}