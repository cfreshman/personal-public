import { addAuthTrigger } from '/lib/modules/site/auth.js'
import { checkin, getScore, addScore } from '/lib/modules/site/scores.js'

checkin('snakes')

setTimeout(() => {
const CONSTANTS = {
    WIDTH: 25,
    HEIGHT: 25,
    SIZE: new Arc.V(23, 21),
    BOUNDS: [
        new Arc.V(1, 2),
        new Arc.V(24, 23)
    ],
    TICK_MS: 42,
    START_LENGTH: 6,
    NUM_FOOD: 10,
    FOOD_GROW: 4
};

const STATE = {
    MENU: 'menu',
    PLAY: 'play',
    ENDING: 'ending',
    GAMEOVER: 'gameover'
};
const DIR = {
    LEFT: new Arc.V(-1, 0),
    RIGHT: new Arc.V(1, 0),
    UP: new Arc.V(0, -1),
    DOWN: new Arc.V(0, 1)
}

var grass_color = '#71aa34',
    food_color = '#f8f6ef',//'#e53030',
    snake_colors = [
        ['#a46d82', '#9b6a7d'], //  0 raspberry
        ['#c26764', '#ca6d65'], //  1 red
        ['#ffcc00', '#fcc200'], //  2 yellow
        ['#d7d914', '#d2d448'], //  3 banana pepper
        ['#a4f678', '#9eef85'], //  4 mint
        ['#16bde7', '#23b7dc'], //  5 blue
        ['#6754de', '#7061e3'], //  6 purple
        ['#474342', '#383836'], //  7 obsidian
        ['#cceceb', '#bce1e0'], //  8 milk
        ['#d7dbcf', '#ced2c8'], //  9 cream
        ['#766d63', '#80776d'], // 10 brown
    ], pairs = [
        [2, 3, 4, 5,    7, 8, 9],
        [2, 3, 4, 5, 6, 7, 8, 9],
                 [5, 6, 7, 8, 9, 10],
                 [5, 6, 7, 8, 9, 10],
                 [5, 6, 7, 8, 9, 10],
                       [7, 8, 9, 10],
                       [7, 8, 9, 10],
                          [8, 9],
                                [10],
                                [10],
                                  [],
    ];

for (let i = snake_colors.length - 1; i >= 0; i--) {
    pairs[i].forEach(j => {
        pairs[j].includes(i) || pairs[j].push(i);
    });
}


class Entity extends Drawn {
    constructor(position) {
        super();
        this.position = position;
    }

    tick() {}
    collide(ents) {}

    hits(other) {
        return this.position.manhat(other.position) < 1;
    }

    safe() {
        return (this.position.x > CONSTANTS.BOUNDS[0].x - 0.5
                && this.position.x < CONSTANTS.BOUNDS[1].x - 0.5
                && this.position.y > CONSTANTS.BOUNDS[0].y - 0.5
                && this.position.y < CONSTANTS.BOUNDS[1].y - 0.5);
    }

    draw() {}
}

class Food extends Entity {
    constructor(position) {
        super(position);
        this.eaten = false;
    }

    eat() {
        this.eaten = true;
        this.remove();
    }

    draw(ctx) {
        Arc.drawSprite('food', this.position.x, this.position.y, 1, 1);
    }
}

class Segment extends Entity {
    constructor(position, color, next) {
        super(position);
        this.color = color;
        this.next = next;
        this.offset = 0;
    }

    move(removeLast) {
        if (this.next) {
            if (removeLast && !this.next.next) {
                this.next.remove();
                delete this.next;
            } else {
                this.next.offset = this.offset + 1;
                this.next.move(removeLast);
            }
        }
    }

    blocks(other) {
        return this.hits(other) || (this.next && this.next.blocks(other));
    }

    remove() {
        this.next && this.next.remove();
        super.remove();
    }

    die() {
        if (this.next && this.next.isAdded()) {
            this.next.die();
        } else {
            this.remove();
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color[this.offset % this.color.length];
        ctx.fillRect(this.position.x + 0.25, this.position.y + 0.25, 0.5, 0.5);
    }
}

class Player extends Entity {
    constructor(position, direction, color) {
        super(position);
        this.command.zIndex = 2;
        this.direction = direction;
        this.color = color;

        this.dirs = [];

        this.eaten = 0;
        this.length = 1;
        this.digesting = CONSTANTS.START_LENGTH;
        this.head = new Segment(position, this.color);

        this.dead = false;
        this.score = 0;
    }

    tick() {
        this.move();

        if (!this.safe() || (this.head.next.next && this.head.next.next.blocks(this))) {
            this.die();
        }
    }

    collide(ents) {
        ents.forEach(e => {
            if (e instanceof Player) {
                if (e.blocks(this)) {
                    this.die();
                }
            } else if (e instanceof Food) {
                if (this.hits(e)) {
                    e.eat();
                    this.grow();
                }
            }
        });
    }

    move() {
        let isCentered = this.position.x%1 === 0 && this.position.y%1 === 0;
        if (isCentered) {
            let zero = new Arc.V(0, 0);
            while (this.dirs.length) {
                let dir = this.dirs.pop();
                if (!dir.add(this.direction).equals(zero)
                    && dir !== this.direction) {
                    this.direction = dir;
                    break;
                }
            }
        }

        this.position = this.position.add(this.direction.scale(0.5));
        this.head = new Segment(this.position, this.color, this.head);
        this.head.offset = isCentered ? 0 : 1;

        let doGrow = /*isCentered && */this.digesting;
        this.head.move(!doGrow);
        if (doGrow) {
            this.digesting--;
            this.length++;
        }
    }

    grow() {
        this.eaten += 1;
        this.digesting += CONSTANTS.FOOD_GROW;
        this.score += 1;
    }

    shrink() {
        if (this.length > 1) {
            this.head.die();
            this.length -= 1;
        } else if (this.length === 1) {
            this.length = 0;
            // this.remove();
        }

    }

    blocks(ent) {
        return this.head.blocks(ent);
    }

    die() {
        this.dead = true;
        Arc.remove(this.head.command);
        this.position = this.head.next.position;
        // this.head.remove();
    }

    remove() {
        super.remove();
        this.head.remove();
    }

    draw(ctx) {
        ctx.translate(this.position.x + 0.5, this.position.y + 0.5);
        ctx.rotate(this.direction.angle());

        ctx.fillStyle = this.color[0];
        ctx.fillRect(-0.5, -0.5, 1, 1);
        Arc.drawSprite('face', -0.5, -0.5, 1, 1);
    }
}

let keyToPlayerDir = {
    'a': [0, DIR.LEFT],
    'd': [0, DIR.RIGHT],
    'w': [0, DIR.UP],
    's': [0, DIR.DOWN],

    'ArrowLeft': [1, DIR.LEFT],
    'ArrowRight': [1, DIR.RIGHT],
    'ArrowUp': [1, DIR.UP],
    'ArrowDown': [1, DIR.DOWN],
}
class GameState {
    constructor() {
        // this.state = STATE.MENU;
        this.players = [];
        this.food = [];
        Arc.setUpdate(this.tick.bind(this), CONSTANTS.TICK_MS);

        this.keys = {};
        this.keyEvents = [];
        document.addEventListener('keydown', event => this.keyEvents.push([event.key, true]), false);
        document.addEventListener('keyup', event => this.keyEvents.push([event.key, false]), false);

        this.prevTouch;
        this.prevTouchKey;
        let guiContainer = document.querySelector('.gui-container')
        document.addEventListener('touchstart', e => {
            this.prevTouch = e.touches[0]
        }, false);
        document.addEventListener('touchmove', e => {
            let { clientX: x1, clientY: y1 } = this.prevTouch
            let { clientX: x2, clientY: y2 } = e.touches[0]
            let x = x2 - x1
            let y = y2 - y1
            let moveDist = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))
            // console.log(x, y, moveDist)
            if (moveDist > 20) {
                let key
                if (Math.abs(x) > Math.abs(y)) {
                    key = (x > 0) ? 'd' : 'a'
                } else {
                    key = (y > 0) ? 's' : 'w'
                }
                this.keyEvents.push([key, true])
                this.keyEvents.push([this.prevTouchKey, false])
                this.prevTouch = e.touches[0]
                this.prevTouchKey = key
            }
        }, false);

        Arc.add(ctx => {
            Arc.drawSprite('board', 0, 0, CONSTANTS.WIDTH, CONSTANTS.HEIGHT);
            // ctx.drawImage(Arc.img.board, 0, 0, WIDTH, HEIGHT);
        });

        Arc.setGui(STATE.MENU);
        Arc.addButton(Arc.sprites.single, Arc.width/2 - 1.25, 17, .25, .25, 1, 0.5).addEventListener('click', () => this.handleButton('single'));
        Arc.addButton(Arc.sprites.coop, Arc.width/2 + 1.25, 17, .25, .25, 0, 0.5).addEventListener('click', () => this.handleButton('versus'));
        Arc.addElement(Arc.sprites.title, Arc.width/2, Arc.height/2, .25, .25, 0.5, 1)

        Arc.setGui(STATE.GAMEOVER);
        Arc.addButton(Arc.sprites.replay, Arc.width/2, 16.5, .25, .25, 0.5, 1).addEventListener('click', () => this.handleButton('replay'));
        Arc.addButton(Arc.sprites.menu, Arc.width/2, 17.5, .25, .25, 0.5, 0).addEventListener('click', () => this.handleButton('menu'));
        // Arc.addButton(Arc.sprites.menu, Arc.width/2 - 1.25, Arc.height*2/3 + 0.25, .25, .25, 1, 0.5).addEventListener('click', () => this.handleButton('menu'));
        // Arc.addButton(Arc.sprites.replay, Arc.width/2 + 1.25, Arc.height*2/3 + 0.25, .25, .25, 0, 0.5).addEventListener('click', () => this.handleButton('replay'));

        this.setState(STATE.MENU);
    }

    play(n_players) {
        this.n_players = n_players || 2;
        if (this.n_players === 1) {
            let colors = snake_colors[randi(snake_colors.length)];
            this.players = [
                new Player(new Arc.V(CONSTANTS.BOUNDS[0].x, Math.floor(CONSTANTS.HEIGHT/2)), DIR.RIGHT, colors)
            ];
        } else if (this.n_players === 2) {
            let first = randi(snake_colors.length);
            let matches = pairs[first];
            let second = matches[randi(matches.length)];
            this.players = [
                new Player(new Arc.V(CONSTANTS.BOUNDS[0].x, Math.floor(CONSTANTS.HEIGHT/2)), DIR.RIGHT, snake_colors[first]),
                new Player(new Arc.V(CONSTANTS.BOUNDS[1].x-1, Math.floor(CONSTANTS.HEIGHT/2)), DIR.LEFT, snake_colors[second])
            ];
        }
        // let colors = snake_colors[randi(snake_colors.length)];
        // let color_i = 1 - randi(2);
        this.food = [];
    }

    setState(state) {
        switch (this.state) {
            case STATE.PLAY:
                Arc.remove(this.score);
                break;
            case STATE.ENDING:
                break;
            case STATE.GAMEOVER:
                Arc.remove(this.score);
                this.players.concat(this.food).forEach(e => e.remove());
                Arc.tickTime = CONSTANTS.TICK_MS;
                break;
            default:
        }

        this.counter = 0;
        switch (state) {
            case STATE.PLAY:
                this.play(this.n_players);
                if (this.n_players == 1) {
                    this.score = Arc.command(ctx => {
                        ctx.save();
                        ctx.globalAlpha = 0.85;
                        Arc.drawNumber(this.players[0].score, Arc.width - 1.5, 2.5, 0.25, 0.25, 1, 0);
                        ctx.restore();
                    }, 1000);
                } else if (this.n_players == 2) {
                    this.score = Arc.command(ctx => {
                        ctx.save();
                        ctx.globalAlpha = 0.85;
                        Arc.drawNumber(this.players[0].score + this.players[1].score, Arc.width - 1.5, 2.5, 0.25, 0.25, 1, 0);
                        ctx.restore();
                    }, 1000);
                }
                Arc.add(this.score);
                break;
            case STATE.ENDING:
                let dieLength = Math.max(10, ...this.players.filter(p => p.dead).map(p => p.length));
                Arc.tickTime = Math.max(1, CONSTANTS.TICK_MS*5 / Math.pow(dieLength, 0.5));
                break;
            case STATE.GAMEOVER:
                Arc.tickTime = CONSTANTS.TICK_MS/5;
                let points = this.players.reduce((acc, p) => acc + p.score, 0)
                if (this.n_players == 1) {
                    this.score = Arc.command(ctx => {
                        Arc.drawNumber(points, Arc.width/2, 8.5 - Math.sin(this.counter/20)/8, 0.5, 0.5, 0.5, 0.5);
                    }, 1000);
                    addScore('snakes+1p', points)
                } else if (this.n_players == 2) {
                    this.score = Arc.command(ctx => {
                        Arc.drawNumber(points, Arc.width/2, 8.5 - Math.sin(this.counter/20)/8, 0.5, 0.5, 0.5, 0.5);
                    }, 1000);
                    addScore('snakes+2p', points)
                }/*if (this.n_players === 2) {
                    this.score = Arc.command(ctx => {
                        // Arc.drawNumber(this.players[0].score, Arc.width/2 - 2, Arc.height/2, 0.5, 0.5, 1, 1);
                        // Arc.drawNumber(this.players[1].score, Arc.width/2 + 2, Arc.height/2, 0.5, 0.5, 0, 1);
                    }, 1000);
                }*/
                Arc.add(this.score);
                setTimeout(() => reloadHighScores(), 100)
                break;
            default:
        }

        this.state = state;
        Arc.setGui(state);
        this.tick();
    }

    tick() {
        this.counter++;

        if (this.counter % 2) {
            while (this.keyEvents.length) {
                let [key, isDown] = this.keyEvents.pop();
                // console.log(key)
                if (this.state === STATE.PLAY
                    && keyToPlayerDir[key]) {
                    this.handlePlayerInput(key, isDown);
                } else {
                    switch (key) {
                        case ' ':
                            if (this.state === STATE.GAMEOVER)
                                this.setState(STATE.PLAY);
                                break;
                        case '1':
                        case '2':
                            this.n_players = Number(key);
                            break;
                        case '3':
                            Arc.tickTime--;
                            // console.log(Arc.tickTime);
                            break;
                        case '4':
                            Arc.tickTime++;
                            // console.log(Arc.tickTime);
                            break;
                        default:
                    }
                }
            }
            this.keys = {};
        }

        switch (this.state) {
            case STATE.PLAY:
                let ents = this.players.concat(this.food);

                ents.forEach(e => e.tick());
                ents.forEach(e => e.collide(ents.filter(e2 => e !== e2)));

                if (this.players.some(p => p.dead)) {
                    this.setState(STATE.ENDING);
                } else {
                    this.food = this.food.filter(f => !f.eaten);
                    if (!this.food.length || (this.counter % Math.pow(this.food.length, 2) === 0 && this.food.length < CONSTANTS.NUM_FOOD && randi(5) === 0)) {
                        let pos, ent;
                        do {
                            pos = new Arc.V(randi(CONSTANTS.SIZE.x) + CONSTANTS.BOUNDS[0].x, randi(CONSTANTS.SIZE.y) + CONSTANTS.BOUNDS[0].y);
                            ent = new Entity(pos);
                        } while (this.players.some(e => e.blocks(ent))
                                 || this.food.some(e => e.hits(ent)));
                        this.food.push(new Food(pos));
                    }
                }
                break;
            case STATE.ENDING:
                this.players.forEach(p => {
                    if (p.dead) p.shrink();
                });

                if (this.players.every(p => !p.dead || p.length == 0)) {
                    this.setState(STATE.GAMEOVER);
                }
                break;
            default:
        }
    }

    handlePlayerInput(key, isDown) {
        if (Boolean(this.keys[key]) !== Boolean(isDown)) {
            let [pId, dir] = keyToPlayerDir[key];
            let player = this.players[pId % this.players.length];
            let keyIndex = player.dirs.indexOf(dir);
            if (isDown && keyIndex === -1) {
                player.dirs.push(dir);
            } else if (!isDown && keyIndex !== -1) {
                // player.dirs.splice(keyIndex, 1);
            }
        }
        this.keys[key] = isDown;
    }

    handleButton(button) {
        switch (button) {
            case 'single':
                this.n_players = 1;
                this.setState(STATE.PLAY);
                break;
            case 'versus':
                this.n_players = 2;
                this.setState(STATE.PLAY);
                break;
            case 'menu':
                this.setState(STATE.MENU);
                break;
            case 'replay':
                this.setState(STATE.PLAY);
                break;
            default:
        }
    }
}

let game;
let canvas = document.querySelector('#gameCanvas');
Arc.init(canvas, CONSTANTS.WIDTH, CONSTANTS.HEIGHT);

let sprites = [
    ['board', 1, 1, 25, 25],
    ['face', 28, 1, 16, 16],
    ['food', 45, 1, 16, 16],
    ['single', 1, 27, 34, 10],
    ['versus', 1, 38, 34, 10],
    ['coop', 70, 27, 34, 10],
    ['replay', 36, 27, 33, 10],
    ['menu', 36, 38, 33, 10],
    ['', 28, 18, 5, 8, 10, 4, 0],
    ['1', 33, 18, 3, 8],
    ['title', 1, 49, 69, 28]
];
Promise.all([
    Arc.loadSheet('sheet.png', sprites)
]).then(() => {
    Arc.loop();

    game = new GameState();
});
}, 150);



let hsPersonal = document.querySelector('#hs-personal')
let hsGlobal = document.querySelector('#hs-global')

const reloadHighScores = () => {
    Promise.all([
        getScore('snakes+1p'),
        getScore('snakes+2p')
    ]).then(results => {
        let outputs = results.map(data => {
            // console.log(data)
            let { user, global } = data
            return [
                user?.scores?.length
                ? `${user.scores[0].score} (${user.scores[0].user})` //user.scores[0].score
                : 'NONE',
                global?.scores?.length
                ? `${global.scores[0].score} (${global.scores[0].user})`
                : 'NONE'
            ]
        })
        // console.log(outputs)
        hsPersonal.textContent = `${outputs[0][0]} / ${outputs[1][0]}`
        hsGlobal.textContent = `${outputs[0][1]} / ${outputs[1][1]}`
    })
}
addAuthTrigger(auth => {
    reloadHighScores()
    // getScore('snakes').then(data => {
    //     console.log(data)
    //     let { user, global } = data
    //     if (user?.scores?.length) {
    //         hsPersonal.textContent = user.scores[0].score
    //     } else {
    //         hsPersonal.textContent = 'NONE'
    //     }
    //     if (global?.scores?.length) {
    //         hsGlobal.textContent = `${global.scores[0].score} (${global.scores[0].user})`
    //     } else {
    //         hsGlobal.textContent = 'NONE'
    //     }
    // })
})

// document.querySelector('#scoreboard').href = `${window.origin}/records`
document.querySelector('#single-link').href = `${window.origin}/records/snakes+1p`
document.querySelector('#coop-link').href = `${window.origin}/records/snakes+2p`