import Arc from '../../../lib/modules/arcm.js'
import { Counter } from '../../../lib/modules/counter.js'
import { Angler } from './entities/Angler.js';
import { Manta } from './entities/Manta.js';
import { Sunfish } from './entities/Sunfish.js';
import { Player } from './entities/Player.js';
import sprites from './sprites.js'

const CONSTANTS = {
    TICK_MS: 12,
    // TICK_MS: 2000,
    ROWS: 240,
    COLS: 320,
    SCALE: 1,
};
CONSTANTS.WIDTH = CONSTANTS.SCALE*CONSTANTS.COLS;
CONSTANTS.HEIGHT = CONSTANTS.SCALE*CONSTANTS.ROWS;

let background = '#151c2d'; //'#070c0d';

const STATE = {
    MENU: 'menu',
    PLAY: 'play',
    END: 'end'
};

let canvas = document.querySelector('#gameCanvas');
setTimeout(() => {
    Arc.init(canvas, CONSTANTS.COLS, CONSTANTS.ROWS);
    Arc.loadSheet('sheet.png', sprites).then(() => {
        Arc.loop();
        new GameState();
    });
}, 150);

class GameState {
    counter
    state
    animals
    players
    particles
    keys

    constructor() {
        Arc.setUpdate(this.tick.bind(this), CONSTANTS.TICK_MS);

        document.addEventListener('keydown', event => this.handleKey(event.key, true), false);
        document.addEventListener('keyup', event => this.handleKey(event.key, false), false);

        let prevTouch;
        document.addEventListener('touchstart', e => {
            prevTouch = e.touches[0]
            this.handleKey('tap', true)
        }, false);
        document.addEventListener('touchmove', e => {
            let { clientX: x1, clientY: y1 } = prevTouch
            let { clientX: x2, clientY: y2 } = e.touches[0]
            let x = x2 - x1
            let y = y2 - y1
            let moveDist = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))
            if (moveDist > 20) {
                this.keys['direction'] = new Arc.V(x, y)
            }
        }, false);
        document.addEventListener('touchend', e => {
            this.keys['direction'] = false
            this.handleKey('tap', false)
        }, false);

        this.counter = new Counter();

        canvas.style.background = background;
        Arc.add(this.draw.bind(this));

        this.animals = []
        this.players = []
        this.particles = []

        this.keys = {}

        this.setState(STATE.MENU);
    }

    setState(state) {
        switch (this.state) {
            default:
        }

        this.counter.reset();
        switch (state) {
            case STATE.PLAY:
                this.players = [new Player({
                    pos: new Arc.V(CONSTANTS.WIDTH/2, CONSTANTS.HEIGHT/2),
                })]
                this.particles = []
                this.animals = []
                for (let i = 0; i < 20; i++) {
                    this.animals.push(new Angler({
                        pos: new Arc.V(Math.random() * CONSTANTS.WIDTH, Math.random() * CONSTANTS.HEIGHT),
                    }))
                }
                for (let i = 0; i < 4; i++) {
                    this.animals.push(new Manta({
                        pos: new Arc.V(Math.random() * CONSTANTS.WIDTH, Math.random() * CONSTANTS.HEIGHT),
                    }))
                }
                // for (let i = 0; i < 1; i++) {
                //     this.animals.push(new Sunfish({
                //         pos: new Arc.V(Math.random() * CONSTANTS.WIDTH, Math.random() * CONSTANTS.HEIGHT),
                //     }))
                // }
                break;
            default:
        }

        this.state = state;
        // this.tick();
    }

    tick(ms) {
        let dt = ms / 1000
        this.counter.tick();
        switch (this.state) {
            case STATE.PLAY:
                let gameState = {
                    keys: this.keys,
                    animals: this.animals,
                    players: this.players,
                    particles: this.particles,
                }
                this.players.forEach(player => player.update(dt, gameState))
                this.animals.forEach(animal => animal.update(dt, gameState))
                this.particles = this.particles.filter(particle => !particle.update(dt))
                break;
            default:
        }
    }

    draw(ctx) {
        let stripHeight = CONSTANTS.ROWS / 7;
        for (let i = 0; i < 7; i++) {
            // ctx.fillStyle = `hsl(223deg 36% 13%)`
            ctx.fillStyle = `hsl(223deg ${40 - i}% ${16 - i}%)`
            // ctx.fillStyle = 'red'
            ctx.fillRect(0, i * stripHeight, CONSTANTS.COLS, stripHeight+1)
        }
        switch (this.state) {
            case STATE.MENU:
                Arc.drawScaledSprite('title', CONSTANTS.COLS/2, CONSTANTS.ROWS/2 - 3, 5, .5, .5);
                break;
            case STATE.PLAY:
            case STATE.END:
                this.particles.forEach(particle => particle.draw(ctx))
                this.animals.forEach(animal => animal.draw(ctx))
                this.players.forEach(player => player.draw(ctx))
                break;
            default:
        }
    }

    handleKey(key, isDown) {
        this.keys[key] = isDown

        if (!isDown) {
            switch (key) {
                case 'Escape':
                    this.setState(STATE.MENU);
                    break;
                default:
                    switch (this.state) {
                        case STATE.MENU:
                            this.setState(STATE.PLAY);
                            break;
                        case STATE.END:
                            this.setState(STATE.MENU);
                            break;
                        default:
                    }
            }
        }
    }
}

export { CONSTANTS }