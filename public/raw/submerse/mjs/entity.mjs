import { draw_body, get_engine } from "./common.mjs";
const { Engine, Render, Runner, Bodies, Body, Composite } = Matter

export class Entity {
  constructor(props) {
    this.id = rand.alphanum(12)
    this.z = 0
    this.pos = V.ne(0, 0)
    this.vel = V.ne(0, 0)
    this.acc = V.ne(0, 0)
    this.mass = 1
    this.drag = V.ne(1, 3)
    this.is_left = false
    this.anim = null
    this.size = V.ne(1, 1)
    this.anchor = V.ne(0, 0)
    this.health = 1
    this.takes_melee = false
    this.takes_ranged = false
    this.is_friendly = false
    this.from_friendly = false
    this.gold = 0
    this.upside_down = false
    Object.assign(this, props)
    this.max_health = this.health
    if (this.physical) {
      this.body = this.body || Bodies.rectangle(this.pos.x, this.pos.y, this.size.x, this.size.y)
      Body.set(this.body, {
        mass: this.mass,
        position: { x: this.pos.x, y: this.pos.y },
        velocity: { x: this.vel.x, y: this.vel.y },
      })
      Composite.add(get_engine().world, [this.body])
      this.body.entity = this
      // console.log('body', this.body, this.body.position)
    } else {
      this.body = null
    }
    // console.log('entity', this)
  }

  update(state, dt) {
    if (this.pos.y < 0) {
      this.acc.y = 4
    }

    if (this.body) {
      // console.log('body', this.body.position)
      this.pos = V.ne(this.body.position.x, this.body.position.y)
      this.vel = V.ne(this.body.velocity.x, this.body.velocity.y)
      this.vel = V.ne(this.vel.x * (1 - this.drag.x * dt), this.vel.y * (1 - this.drag.y * dt))
      this.vel = this.vel.ad(this.acc.sc(dt))
      Body.setVelocity(this.body, { x: this.vel.x, y: this.vel.y })
      Body.setAngle(this.body, 0) // preserve angle
    } else {
      this.vel = this.vel.ad(this.acc.sc(dt))
      this.vel = V.ne(this.vel.x * (1 - this.drag.x * dt), this.vel.y * (1 - this.drag.y * dt))
      this.pos = this.pos.ad(this.vel.sc(dt))
    }

    if (this.health <= 0) {
      this.die(state)
    }
  }

  hit(damage) {
    this.health -= damage
  }

  die(state) {
    if (this.body) {
      Composite.remove(get_engine().world, this.body)
    }
    if (this.gold) {
      state.gold.push({
        pos: this.pos,
        value: this.gold,
      })
    }
    state.remove.push(this)
  }

  draw(state, ctx) {
    if (this.pos.x < state.x - state.WIDTH || this.pos.x > state.x + state.WIDTH) return
    if (this.pos.y < state.y - state.HEIGHT || this.pos.y > state.y + state.HEIGHT) return

    const new_is_left = this.acc.x < -1 ? true : this.acc.x > 1 ? false : undefined
    if (new_is_left !== undefined) this.is_left = new_is_left
    this.anim.draw(state, ctx, this.pos.x + (this.is_left ? this.anchor.x : -this.anchor.x), this.pos.y - this.anchor.y, { is_left:this.is_left })

    if (state.DEBUG && this.body) {
      draw_body(ctx, this.body, {
        stroke:'red'
      })
    }
  }
}