import Arc from '../../../lib/modules/arcm.js'
import { Counter } from '../../../lib/modules/counter.js'
import { Angler } from './entities/Angler.js';
import { Manta } from './entities/Manta.js';
import { Sunfish } from './entities/Sunfish.js';
import { Player } from './entities/Player.js';
import sprites from './sprites.js'
import { Whale } from './entities/Whale.js';

const CONSTANTS = {
    TICK_MS: 12,
    ROWS: 240,
    COLS: 320,
    SCALE: 1,
}
CONSTANTS.WIDTH = CONSTANTS.SCALE * CONSTANTS.COLS
CONSTANTS.HEIGHT = CONSTANTS.SCALE * CONSTANTS.ROWS

let background = '#151c2d' //'#070c0d';

const STATE = {
    MENU: 'menu',
    PLAY: 'play',
    END: 'end'
}

let canvas = Q('#game-canvas')
setTimeout(() => {
    Arc.init(canvas, CONSTANTS.COLS, CONSTANTS.ROWS);
    Arc.loadSheet('sheet-new.png', sprites).then(() => {
        Arc.loop()
        new GameState()
    })
}, 150);

class GameState {
    counter
    state
    entities
    keys
    downs
    ups

    constructor() {
        Arc.setUpdate(this.tick.bind(this), CONSTANTS.TICK_MS)

        on(document, 'keydown', e => this.handle_key(e.key, true))
        on(document, 'keyup', e => this.handle_key(e.key, false))

        let prev_touch
        on(document, 'touchstart', e => {
            prev_touch = e.touches[0]
            this.handle_key('tap', true)
        }, false);
        on(document, 'touchmove', e => {
            let { clientX: x1, clientY: y1 } = prev_touch
            let { clientX: x2, clientY: y2 } = e.touches[0]
            let x = x2 - x1
            let y = y2 - y1
            let move_dist = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))
            if (move_dist > 20) {
                this.keys['direction'] = new Arc.V(x, y)
            }
        }, false)
        on(document, 'touchend', e => {
            this.keys['direction'] = false
            this.handle_key('tap', false)
        }, false)

        this.counter = new Counter()

        canvas.style.background = background
        Arc.add(this.draw.bind(this))

        this.entities = []

        this.keys = {}
        this.downs = {}
        this.ups = {}

        this.setState(STATE.MENU)
    }

    setState(state) {
        switch (this.state) {
            default:
        }

        this.counter.reset()
        switch (state) {
            case STATE.PLAY:
                const players = [new Player({
                    pos: new Arc.V(CONSTANTS.WIDTH/2, CONSTANTS.HEIGHT/2),
                })]
                const animals = []
                for (let i = 0; i < 20; i++) {
                    animals.push(new Angler({
                        pos: new Arc.V(Math.random() * CONSTANTS.WIDTH, Math.random() * CONSTANTS.HEIGHT),
                    }))
                }
                for (let i = 0; i < 4; i++) {
                    animals.push(new Manta({
                        pos: new Arc.V(Math.random() * CONSTANTS.WIDTH, Math.random() * CONSTANTS.HEIGHT),
                    }))
                }
                for (let i = 0; i < 1; i++) {
                    animals.push(new Sunfish({
                        pos: new Arc.V(Math.random() * CONSTANTS.WIDTH, Math.random() * CONSTANTS.HEIGHT),
                    }))
                }
                for (let i = 0; i < 1; i++) {
                    animals.push(new Whale({
                        pos: new Arc.V(Math.random() * CONSTANTS.WIDTH, Math.random() * CONSTANTS.HEIGHT),
                    }))
                }
                this.entities = [].concat(players, animals)
                break;
            default:
        }

        this.state = state
    }

    tick(ms) {
        let dt = ms / 1000
        this.counter.tick()
        switch (this.state) {
            case STATE.PLAY:
                const players = this.entities.filter(x => x.type === 'player')
                const game_state = {
                    keys: this.keys, downs: this.downs, ups: this.ups,
                    entities: this.entities,
                    players,
                }
                this.entities = this.entities.filter(x => !x.update(dt, game_state))
                break
            default:
        }
    }

    draw(ctx) {
        let strip_height = CONSTANTS.ROWS / 7
        for (let i = 0; i < 7; i++) {
            ctx.fillStyle = `hsl(223deg ${40 - i}% ${16 - i}%)`
            ctx.fillRect(0, i * strip_height, CONSTANTS.COLS, strip_height+1)
        }
        switch (this.state) {
            case STATE.MENU:
                Arc.drawScaledSprite('title', CONSTANTS.COLS/2, CONSTANTS.ROWS/2 - 3, 5, .5, .5)
                break
            case STATE.PLAY:
            case STATE.END:
                this.entities.map(x => x.draw(ctx))
                break
            default:
        }
    }

    handle_key(key, is_down) {
        this.keys[key] = is_down
        this[is_down ? 'downs' : 'ups'][key] = true

        if (!is_down) {
            switch (key) {
                case 'Escape':
                    this.setState(STATE.MENU)
                    break;
                default:
                    switch (this.state) {
                        case STATE.MENU:
                            this.setState(STATE.PLAY)
                            break;
                        case STATE.END:
                            this.setState(STATE.MENU)
                            break;
                        default:
                    }
            }
        }
    }
}

export { CONSTANTS }