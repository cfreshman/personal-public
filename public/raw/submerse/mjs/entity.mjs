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
    this.armor = 0
    this.takes_melee = false
    this.takes_ranged = false
    this.is_friendly = false
    this.from_friendly = false
    this.gold = 0
    this.upside_down = false
    this.group = null
    this.timed_damage = false
    this.ttl_damage = 0
    this.skip_healthdraw = false
    this.fragile = false
    Object.assign(this, props)
    this.max_health = this.health
    this.max_armor = this.armor
    if (this.physical) {
      this.body = this.body || Bodies.rectangle(this.pos.x, this.pos.y, this.size.x, this.size.y)
      Body.set(this.body, {
        mass: this.mass,
        position: { x: this.pos.x, y: this.pos.y },
        velocity: { x: this.vel.x, y: this.vel.y },
      })
      // if (this.parts) {
      //   M.Body.setParts(this.body, [
      //     this.body,
      //     ...this.parts.map(part => {
      //       return Bodies.rectangle(this.pos.x + part[1].x, this.pos.y + part[1].y, part[0].x, part[0].y)
      //     }),
      //   ])
      // }
      Composite.add(get_engine().world, [this.body])
      this.body.entity = this
      // console.log('body', this.body, this.body.position)
    } else {
      this.body = null
    }
    // console.log('entity', this)
  }

  update(state, dt) {
    this.ttl_damage = Math.max(0, this.ttl_damage - dt)

    if (this.pos.y + this.anchor.y < 0) {
      this.acc.y = Math.min(4, -(this.pos.y + this.anchor.y))
    }

    if (this.body) {
      // console.log('body', this.body.position)
      this.pos = V.ne(this.body.position.x, this.body.position.y)
      this.vel = V.ne(this.body.velocity.x, this.body.velocity.y)

      // drag 
      Body.applyForce(this.body, this.body.position, { x: -this.vel.x * this.drag.x * this.mass / 10_000, y: -this.vel.y * this.drag.y * this.mass / 10_000 })

      // acceleration
      Body.applyForce(this.body, this.body.position, { x: this.acc.x * this.mass / 20_000, y: this.acc.y * this.mass / 20_000 })
      
      // this.vel = V.ne(this.vel.x * (1 - this.drag.x * dt), this.vel.y * (1 - this.drag.y * dt))
      // this.vel = this.vel.ad(this.acc.sc(dt))
      // Body.setVelocity(this.body, { x: this.vel.x, y: this.vel.y })
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
    if (this.ttl_damage > 0) return
    if (this.armor > 0) {
      this.armor -= damage
      if (this.armor < 0) {
        damage = -this.armor
        this.armor = 0
      } else {
        damage = 0
      }
    }
    this.health -= damage
    if (this.timed_damage) this.ttl_damage = 1
  }

  die(state) {
    if (this.body) {
      Composite.remove(get_engine().world, this.body)
    }
    if (this.gold) {
      range(this.gold).map(i => {
        state.gold.push({
          pos: this.pos.ad(V.ne(rand.f(this.size.x) - this.size.x/2, rand.f(this.size.y) - this.size.y/2)),
          value: 1,
        })
      })
    }
    state.remove.push(this)
  }

  remove() {
    this.health = 0
  }

  draw(state, ctx) {
    if (this.pos.x < state.x - state.WIDTH || this.pos.x > state.x + state.WIDTH) return
    if (this.pos.y < state.y - state.HEIGHT || this.pos.y > state.y + state.HEIGHT) return

    const new_is_left = this.acc.x < -.5 ? true : this.acc.x > .5 ? false : undefined
    if (new_is_left !== undefined) this.is_left = new_is_left
    this.anim.draw(state, ctx, this.pos.x + (this.is_left ? this.anchor.x : -this.anchor.x), this.pos.y - this.anchor.y, { is_left:this.is_left })

    if (state.debug.boxes && this.body) {
      this.body.parts.map(part => {
        draw_body(ctx, part, {
          stroke: 'red',
        })
      })
    }

    if (!this.skip_healthdraw) {
      if (this.armor < this.max_armor) {
        const armorbar_size = V.ne(20, 2)
        const armorbar_offset = V.ne(0, -this.size.y/2 - 7 - armorbar_size.y/2)
        const x = this.pos.x - armorbar_size.x/2 + armorbar_offset.x
        const y = this.pos.y - armorbar_size.y/2 + armorbar_offset.y
        ctx.fillStyle = '#444'
        ctx.fillRect(x, y, armorbar_size.x, armorbar_size.y)
        ctx.fillStyle = '#44e'
        ctx.fillRect(x, y, armorbar_size.x * this.armor / this.max_armor, armorbar_size.y)
      }
      if (this.health < this.max_health) {
        const healthbar_size = V.ne(20, 2)
        const healthbar_offset = V.ne(0, -this.size.y/2 - 5 - healthbar_size.y/2)
        const x = this.pos.x - healthbar_size.x/2 + healthbar_offset.x
        const y = this.pos.y - healthbar_size.y/2 + healthbar_offset.y
        ctx.fillStyle = '#e44'
        ctx.fillRect(x, y, healthbar_size.x, healthbar_size.y)
        ctx.fillStyle = '#4e4'
        ctx.fillRect(x, y, healthbar_size.x * this.health / this.max_health, healthbar_size.y)
      }
    }
  }
}