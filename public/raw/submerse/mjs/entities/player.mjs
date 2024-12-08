import { Anim } from "../anim.mjs"
import { Entity } from "../entity.mjs"
import { get_sheet } from "../common.mjs"
import { Bubble } from "./bubble.mjs"
import { Torpedo } from "./torpedo.mjs"
import { DeadPlayer } from "./dead_player.mjs"
import { Net } from "./net.mjs"

export const SHIPS = {
  BUOY: 'buoy',
  RIPTIDE: 'riptide',
  DREDGER: 'dredger',
}
export const STATS = {
  [SHIPS.BUOY]: {
    sprite: 'sub0',
    health: 2,
    // force: V.ne(10, 3),
    // force: V.ne(3, 1.5),
    mass: 1,
    drag: V.ne(1, 1),
    size: V.ne(12, 6),
    bubble_pos: V.ne(-7, .5),
    bubble_density: 1,
    arm_pos: V.ne(7, 2),
    time_arm: .67,
  },
  [SHIPS.RIPTIDE]: {
    sprite: 'sub1',
    health: 3,
    // force: V.ne(3, 1.5),
    mass: 2,
    drag: V.ne(.5, 1),
    size: V.ne(40, 8), anchor: V.ne(1, 3),
    // body: M.Bodies.fromVertices(0, 0, [
    //   [
    //     { x: -20, y: -4 },
    //     { x: -8, y: -4 }, { x: -8, y: -10 }, { x: 0, y: -10 }, { x: 0, y: -4 },
    //     { x: 20, y: -4 },
    //     { x: 20, y: 4 },
    //     { x: -20, y: 4 }
    //   ],
    // ]),
    bubble_pos: V.ne(-25, 0),
    bubble_density: 2,
    arm_pos: V.ne(23, 1),
    time_arm: .33,
  },
  [SHIPS.DREDGER]: {
    sprite: 'sub2',
    health: 4,
    // force: V.ne(3, 1.5),
    mass: 3,
    drag: V.ne(1, 1),
    size: V.ne(32, 12), anchor: V.ne(2, 1),
    bubble_pos: V.ne(-21, 1),
    bubble_density: 2,
    arm_pos: V.ne(18, 5),
    time_arm: .33,
  },
}

export class Player extends Entity {
  constructor(props) {
    const { ship } = props
    props.anim = new Anim({
      sheet: get_sheet(),
      names: [STATS[ship].sprite],
    })
    super({
      ...props,
      ...STATS[ship],
      physical: true,
      takes_melee: true,
      takes_ranged: true,
      is_friendly: true,
      score: 0,
      arm_i: 0,
      net: undefined,
      timed_damage: true,
      ttl_arm: 0,
      skip_healthdraw: true,
      upgrade_armor: 0,
      armor: 1,
      upgrade_engine: 0,
      force: V.ne(3, 1.5),
      upgrade_torpedo_damage: 0,
      torpedo_damage: 1,
    })
  }
  get arm() {
    return Player.ARM_ROTATION[this.arm_i]
  }

  upgrade(upgrade_key) {
    switch (upgrade_key) {
      case Player.UPGRADES.ARMOR:
        this.upgrade_armor += 1
        this.max_armor = 1 + this.upgrade_armor
        this.armor += 1
        break
      case Player.UPGRADES.ENGINE:
        this.upgrade_engine += 1
        const force = [
          null,
          V.ne(3.5, 1.75),
          V.ne(4, 2),
          V.ne(4.5, 2.25),
        ][this.upgrade_engine]
        this.force = force
        break
      case Player.UPGRADES.TORPEDO_DAMAGE:
        this.upgrade_torpedo_damage += 1
        this.torpedo_damage = 1 + this.upgrade_torpedo_damage
        break
      // case Player.UPGRADES.NET_SIZE:
      //   this.net_size = 1 + upgrade_i
      //   break
    }
  }

  update(state, dt) {
    this.ttl_arm = Math.max(0, this.ttl_arm - dt)
    this.acc = new V(0, 0)
    if (state.keys['a'] || state.keys['ArrowLeft']) {
      this.acc.x = -1
    }
    if (state.keys['w'] || state.keys['ArrowUp']) {
      this.acc.y = -1
    }
    if (state.keys['d'] || state.keys['ArrowRight']) {
      this.acc.x = 1
    }
    if (state.keys['s'] || state.keys['ArrowDown']) {
      this.acc.y = 1
    }
    if (state.downs['x']) {
      state.downs['x'] = false
      this.arm_i = (this.arm_i + 1) % Player.ARM_ROTATION.length
      if (this.net && !this.net.caught) {
        this.net.die(state)
      }
    }
    if (state.keys[' '] && this.ttl_arm <= 0) {
      this.ttl_arm = this.time_arm
      if (this.arm === Player.ARMS.TORPEDO) {
        state.add.push(new Torpedo({
          pos: this.pos.ad(V.ne((this.is_left ? -1 : 1) * this.arm_pos.x, this.arm_pos.y)),
          vel: this.vel.ad(V.ne((this.is_left ? -1 : 1) * 2, 0)),
          acc: V.ne(this.is_left ? -1 : 1, 0),
          damage: this.torpedo_damage,
        }))
      } else if (this.arm === Player.ARMS.NET) {
        if (this.net) {
          this.net.die(state)
        } else {
          this.net = new Net({
            pos: this.pos.ad(V.ne((this.is_left ? -1 : 1) * this.arm_pos.x, this.arm_pos.y)),
            vel: this.vel.ad(V.ne((this.is_left ? -1 : 1) * 2, 0)),
            is_left: this.is_left,
            player: this,
          })
          state.add.push(this.net)
        }
      }
    }
    this.acc = this.acc.no().mu(this.force)
    // console.log(this.acc)

    if (this.acc.ma() && this.pos.y >= 0) {
      for (let i = 0; i < this.bubble_density; i++) {
        const v_bubble = V.ne(0, 0)
          // .ad(V.p((rand.f(.05) + .01) * this.force.x, this.is_left ? 0 : Math.PI))
          .ad(V.p(rand.s(Math.PI/12) + (this.is_left ? 0 : Math.PI), 50 + rand.f(10)))
        state.add.push(new Bubble({
          pos: this.pos.ad(V.ne((this.is_left ? -1 : 1) * this.bubble_pos.x, this.bubble_pos.y)),
          vel: v_bubble,
          ttl: rand.f(.25) + .75,
        }))
      }
    }

    super.update(state, dt)
  }

  die(state) {
    state.player = false
    super.die(state)
    state.add.push(new DeadPlayer({
      pos: this.pos,
      vel: this.vel,
      anim: this.anim,
      body: this.body,
      ...STATS[this.ship],
      takes_melee: false,
      takes_ranged: false,
    }))
  }
}
Player.ARMS = {
  TORPEDO: 'torpedo',
  NET: 'net',
}
Player.ARM_ROTATION = [Player.ARMS.TORPEDO, Player.ARMS.NET]
Player.UPGRADES = {
  ARMOR: 'armor',
  ENGINE: 'engine',
  TORPEDO_DAMAGE: 'torpedo_damage',
  // NET_SIZE: 'net_size',
}
Player.UPGRADE_MAX = {
  [Player.UPGRADES.ARMOR]: 3,
  [Player.UPGRADES.ENGINE]: 3,
  [Player.UPGRADES.TORPEDO_DAMAGE]: 3,
  // NET_SIZE: 3,
}