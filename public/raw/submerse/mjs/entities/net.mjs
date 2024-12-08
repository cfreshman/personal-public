import { Anim } from '../anim.mjs'
import { Entity } from '../entity.mjs'
import { draw_body, draw_polygon, get_engine, get_sheet } from '../common.mjs'
import { Bubble } from './bubble.mjs'

export class Net extends Entity {
  max_length = 50
  static distance_to_player = (net, dt=0) => {
    const next_player_position = M.Vector.add(net.player.body.position, M.Vector.mult(net.player.body.velocity, dt))
    return M.Vector.magnitude(M.Vector.sub(net.body.position, next_player_position))
  }
  
  constructor(props) {
    super({
      z: 1,
      ttl: 5,
      ...props,
      anim: new Anim({
        sheet: get_sheet(),
        names: ['torpedo'],
      }), // unused
      mass: .01,
      ranged: true,
      takes_melee: false,
      takes_ranged: true,
      health: 1,
      physical: true, size: V.ne(6, 6),
      body: Matter.Bodies.circle(props.pos.x, props.pos.y, 6, {
        // density: .01,
        // friction: 0,
        // frictionAir: .5,
        // frictionStatic: 0,
        // restitution: 1,
        isSensor: true,
      }),
      from_friendly: true,
      caught: undefined,
      rope: undefined,
      sold: false,
    })

    // // create rope of length 8
    // this.rope = M.Composites.stack(props.pos.x, props.pos.y, 8, 1, 0, 0, (x, y) => {
    //   return M.Bodies.rectangle(x, y, 1, 1, {
    //     mass: .001,
    //     isSensor: true,
    //   })
    // })
    // M.Composites.chain(this.rope, 0, 0, 0, 0, {
    //   stiffness: .1,
    //   length: this.max_length,
    // })
    // M.Composite.add(this.rope, M.Constraint.create({
    //   bodyA: this.body,
    //   bodyB: this.rope.bodies[0],
    //   length: 0,
    //   stiffness: .1,
    // }))
    // M.Composite.add(this.rope, M.Constraint.create({
    //   bodyA: this.player.body,
    //   bodyB: this.rope.bodies.at(-1),
    //   length: 0,
    //   stiffness: .1,
    // }))
    // M.Composite.add(get_engine().world, this.rope)
  }

  update(state, dt) {
    this.ttl -= dt
    if (this.ttl < 0) {
      this.die(state)
    }

    const net_distance = Net.distance_to_player(this)
    if (this.caught) {
      this.caught.acc = V.ne(0, 0)
      this.caught.vel = this.vel
      this.caught.pos = this.pos

      if (net_distance < this.max_length) {
        this.rope.stiffness = .0001
      } else {
        this.rope.stiffness = .1
        this.rope.length = Math.min(net_distance, this.max_length)
      }
    } else {
      if (net_distance > this.max_length) {
        this.die(state)
      }
    }

    super.update(state, dt)
  }

  catch(other) {
    if (!this.caught) {
      const world = get_engine().world

      other.physical = false
      if (other.body) {
        Matter.World.remove(world, other.body)
        other.caught_body = other.body
        other.body = undefined
      }

      this.caught = other
      this.ttl = Infinity

      this.drag = V.ne(.5, .5)
      Matter.Body.set(this.body, {
        mass: this.mass + this.caught.mass,
      })

      // const save_mass = this.player.mass
      // this.player.mass = Infinity
      this.rope = Matter.Constraint.create({
        bodyA: this.body,
        bodyB: this.player.body,
        stiffness: .1,
      })
      Matter.World.add(world, this.rope)
      // defer(() => {
      //   this.player.mass = save_mass
      // })
    }
  }

  sell() {
    this.sold = true
    this.remove()
  }

  die(state) {
    super.die(state)
    if (this.caught) {
      this.caught.physical = true
      this.caught.body = this.caught.caught_body
      if (this.caught.body) {
        M.Body.set(this.caught.body, {
          position: this.body.position,
          velocity: { x:0, y:0 },
        })
        Matter.World.add(get_engine().world, this.caught.body)
      }
      if (this.sold) {
        this.caught.gold = 0
        this.caught.die(state)
      }
      this.caught = undefined
    }
    if (this.rope) {
      Matter.World.remove(get_engine().world, this.rope)
      this.rope = undefined
    }
    this.player.net = undefined
  }

  draw(state, ctx) {
    draw_body(ctx, this.body, {
      fill: '#8648',
    })
    const rope = [
      this.pos,
      this.player.pos,
    ]
    // const rope = M.Composite.allBodies(this.rope).map(body => {
    //   return {
    //     x: body.position.x,
    //     y: body.position.y,
    //   }
    // })
    draw_polygon(ctx, rope, {
      fill: '#8648',
    })
  }
}