import Arc from '/lib/modules/arcm.js'
import { Counter, Countdown } from '/lib/modules/counter.js'
import { CONSTANTS } from './main.js'
import { Player } from './player.js'
import { Ghost } from './ghost.js'

let bluePoint = [200, 400, 800, 1600];
let fruitPoint = [100, 200, 400, 700, 1100, 1600, 2200, 3000, 4000, 5500, 7500, 10000];
let charSpeed = [
    [[.8, .9, 1], [.9, .95, 1]],
    [[.75, .85, .95], [.5, .55, .6]]
];
let modeTime = [
    [7, 20, 7, 20, 5, 20, 5, -1],
    [7, 20, 7, 20, 5, 120, 5, -1],
    [5, 20, 5, 20, 5, 120, 0, -1],
];
let exitCount = [
    [0, 0, 30, 60],
    [0, 0, 0, 50],
    [0, 0, 0, 0]
];
let exitTime = [5, 4, 3];
let afterCount = [0, 7, 17, 32];

let keyToDir = {
    'w': 0,
    'd': 1,
    's': 2,
    'a': 3,
    'ArrowUp': 0,
    'ArrowRight': 1,
    'ArrowDown': 2,
    'ArrowLeft': 3,
}

export class Level {
    constructor(highscore) {
        this.highscore = highscore;
        this.constructMap()

        this.startTime = new Countdown(100); // life start wait period
        this.blueTime = new Countdown(50); // pause when ghost is eaten
        this.finishTime = new Countdown(200); // life end wait period
        this.pausers = [
            this.startTime,
            this.blueTime,
            this.finishTime,
        ]

        this.fruitTime = new Countdown(840); // fruit lifetime
        this.scoreTime = new Countdown(300); // fruit score lifetime
        this.blueCount = new Countdown(500); // period for blue ghosts
        this.dieTime = new Countdown(250); // death animation
        this.tickers = [
            this.fruitTime,
            this.scoreTime,
            this.blueCount,
            this.dieTime
        ];

        // special cases
        this.counter = new Counter(); // generic, used for large dot blink
        this.eatTime = new Counter(); // current life time
        this.modeCount = new Counter(); // for scatter modes

        this.lives = 2;
        this.score = 0;
        this.level = 0;
        this.nextLevel();
    }

    constructMap() {
        this.map = Array.matrix(CONSTANTS.ROWS, CONSTANTS.COLS);
        let cv = document.createElement('canvas');
        cv.width = 116;
        cv.height = 84;
        let ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(...Arc.sprites.map.parts, 0, 0, 116, 84);
        let imageData = ctx.getImageData(0, 0, 116, 84)
        for (let col = 0; col < CONSTANTS.COLS; col++) {
            for (let row = 0; row < CONSTANTS.ROWS; row++) {
                if (imageData.data[(row*CONSTANTS.COLS*4 + col)*16 + 2] !== imageData.data[2]
                        || imageData.data[((row*4 + 3)*CONSTANTS.COLS*4 + (col*4)+3)*4 + 2] !== imageData.data[2]) {
                    this.map[row][col] = 1;
                } else {
                    this.map[row][col] = 0;
                }
            }
        }
    }

    nextLevel() {
        this.counter.reset();
        if (this.level < 12) {
            this.level++;
            this.lives++;
        }
        this.blueEat = 0;
        this.remainingDots = 197;
        this.levelDeath = false;
        this.fruits = 0;

        if (this.level === 1) this.difficulty = 0;
        else if (this.level > 1 && this.level < 5) this.difficulty = 1;
        else this.difficulty = 2;

        this.genDots();
        this.genStart();
    }

    nextLife() {
        this.levelDeath = true;
        this.genStart();
    }

    genDots() {
        for (let i = 1; i < 28; i++)
        for (let j = 2; j < 20; j++)
            if (this.map[j][i] === 0) this.map[j][i] = 2;

        for (let i = 12; i < 17; i++)
        for (let j = 2; j < 5; j++)
            if (this.map[j][i] !== 1) this.map[j][i] = 0;

        for (let i = 10; i < 19; i++)
        for (let j = 8; j < 16; j++)
            if (this.map[j][i] !== 1) this.map[j][i] = 0;

        for (let i = 12; i < 17; i++)
        for (let j = 17; j < 20; j++)
            if (this.map[j][i] !== 1) this.map[j][i] = 0;

        this.map[10][14] = 1;
        this.map[16][14] = 0;
        this.map[4][2] = 3;
        this.map[4][26] = 3;
        this.map[14][2] = 3;
        this.map[14][26] = 3;
    }

    genStart() {
        this.mode = 0;
        this.dots = 0;
        this.out = 0;

        this.pausers.forEach(pauser => pauser.reset());
        this.tickers.forEach(ticker => ticker.reset());
        this.startTime.start();
        this.eatTime.reset();
        this.modeCount.reset();

        this.player = new Player(14, 16, this);
        this.ghosts = [
            new Ghost(14, 9, 0, this),
            new Ghost(14, 12, 1, this),
            new Ghost(13, 11, 2, this),
            new Ghost(15, 11, 3, this)];

        this.setScatter(false);
        this.setSpeed(false);
    }

    update() {
        this.pausers.forEach(pauser => pauser.tick());

        // skip update during these conditions
        if (this.gameOver || this.pausers.some(pauser => pauser.isActive())) {
            return;
        }

        this.tickers.forEach(ticker => ticker.tick());

        if (this.finishTime.isTriggered()) {
            this.nextLevel();
        } else if (this.dieTime.isActive()) {
            this.player.update();
        } else if (this.dieTime.isTriggered()) {
            if (this.lives === 0) {
                this.gameOver = true;
            } else {
                this.nextLife();
            }
        } else {
            this.counter.tick();
            this.player.update();
            this.ghosts.forEach(ghost => {
                // set targets
                if (!ghost.blue) {
                    if (this.mode%2 === 0) {
                        ghost.targetCorner();
                    } else {
                        ghost.targetPlayer(this.player, this.ghosts[0])
                    }
                }
                ghost.update();
                // check collision with player
                if (!ghost.eaten && this.player.checkGhost(ghost)) {
                    if (ghost.blue) {
                        ghost.eat();
                        this.eatBlue();
                    } else {
                        this.player.kill();
                        this.lives--;
                        this.dieTime.start();
                    }
                }
            });

            // did player eat fruit
            if (this.fruitTime.isActive() && this.player.checkFruit()) this.eatFruit();

            // should fruit spawn
            if ((this.remainingDots === 140 && this.fruits === 0)
                    || (this.remainingDots === 60 && this.fruits === 1)) {
                this.fruitTime.start();
                this.fruits++;
            }

            if (this.dieTime.isDone()) {
                if (this.blueCount.isDone()) {
                    if (this.blueCount.isTriggered()) {
                        this.blueEat = 0;
                        this.setBlue(false);
                        this.setSpeed(0);
                    }

                    if (this.modeCount.count === 84*modeTime[this.difficulty][this.mode]) {
                        this.mode++;
                        this.setScatter(this.mode%2 === 0);
                        this.modeCount.reset()
                    } else {
                        this.modeCount.tick();
                    }
                }

                // when to release each ghost
                if (this.levelDeath) {
                    for (let i = this.out; i < 4; i++)
                        if (afterCount[i] <= this.dots) {
                            this.ghosts[i].exit();
                            this.out++;
                            this.eatTime.reset();
                        }
                } else {
                    for (let i = this.out; i < 4; i++)
                        if (exitCount[this.difficulty][i] <= this.dots) {
                            this.ghosts[i].exit();
                            this.out++;
                            this.eatTime.reset();
                            break;
                        }
                }

                if (this.eatTime.count === 84*exitTime[this.difficulty]) {
                    if (this.out < 4) {
                        this.ghosts[this.out].exit();
                        this.eatTime.reset();
                        this.out++;
                    }
                }

                // end level
                if (this.remainingDots === 0) {
                    this.finishTime.start();
                    this.player.anim.reset();
                }
            }
        }

        if (this.score > this.highscore) this.highscore = this.score;
    }

    setBlue(isBlue) {
        this.ghosts.forEach(ghost => !ghost.eaten && ghost.setBlue(isBlue));
    }
    setScatter(doScatter) {
        this.ghosts.forEach(ghost => ghost.setScatter(doScatter));
    }

    setSpeed(isBlue) {
        isBlue = isBlue ? 1 : 0;
        this.player.setSpeed(2*charSpeed[0][isBlue][this.difficulty] /32);
        this.ghosts.forEach(g =>
            g.setSpeed(2*charSpeed[1][isBlue][this.difficulty] /32)
        );
    }
    getSpeed(charType, isBlue) {
        return 2*charSpeed[charType][isBlue ? 1 : 0][this.difficulty] /32;
    }
    getTunnelSpeed(isInside) {
        if (isInside)
            return charSpeed[0][0][this.difficulty] /32;
        else
            return 2*charSpeed[1][this.blueCount.isActive() ? 1 : 0][this.difficulty] /32;
    }

    eatDot(type, x, y) {
        this.map[y][x] = 0;
        this.dots++;
        this.remainingDots--;
        switch (type) {
            case 0:
                this.score += 10;
                break;
            case 1:
                this.score += 50;
                this.blueCount.start();
                this.setSpeed(1);
                this.setBlue(true);
                break;
            default:
        }
    }
    eatBlue() {
        this.blueEat++;
        this.score += bluePoint[this.blueEat-1];
        this.blueTime.start();
    }
    eatFruit() {
        this.fruitTime.reset();
        this.score += fruitPoint[this.level-1];
        this.scoreTime.start();
    }

    press(key) {
        if (keyToDir.hasOwnProperty(key)) {
            this.player.press(keyToDir[key]);
        } else {
            switch(key) {
                case '1': if (this.level < 12) this.level++; break;
                case '2': this.lives++; break;
                case '3': this.eatDot(1, 0, 0); break;
                case '4': this.remainingDots = 0; break;
                default:
            }
        }
    }

    draw(ctx) {
        Arc.drawScaledSprite('map', 0, 0, 1/4);

        for (let i = 0; i < CONSTANTS.ROWS; i++)
        for (let j = 0; j < CONSTANTS.COLS; j++)
            switch (this.map[i][j]) {
                case 2:
                    Arc.drawScaledSprite(Arc.sprites.dot[0], j+.5, i+.5, 1/16, .5, .5);
                    break;
                case 3:
                    if (this.counter.modSplit(30, 2) === 0) {
                        Arc.drawScaledSprite(Arc.sprites.dot[1], j+.5, i+.5, 1/8, .5, .5);
                    }
                    break;
                default:
            }

        if (this.gameOver) {
            Arc.drawScaledSprite(Arc.sprites.gameOver, 11.75, 14.2, 1/8);
        } else if (this.finishTime.isActive()) {
            this.player.draw(ctx);
        } else {
            if (this.startTime.isActive()) {
                Arc.drawScaledSprite(Arc.sprites.ready, 12.925, 14.2, 1/8);
            }
            if (this.scoreTime.isActive()) {
                Arc.drawNumber(fruitPoint[this.level-1], 14.5, 14.5, 1/16, 1/16, 0.5, 0.5);
            }
            if (this.blueTime.isActive()) {
                Arc.drawNumber(bluePoint[this.blueEat-1], this.player.x+.5, this.player.y+.5, 1/16, 1/16, 0.5, 0.5);
                if (this.dieTime.isDone()) this.ghosts.forEach(ghost => {
                    if (!this.player.checkGhost(ghost)) ghost.draw(ctx)
                });
            } else {
                this.player.draw(ctx);
                if (this.dieTime.isDone()) this.ghosts.forEach(ghost => ghost.draw(ctx));
            }
            if (this.fruitTime.isActive()) {
                Arc.drawScaledSprite(Arc.sprites.fruit[this.level-1], 14+1/8, 14+1/8, 1/8);
            }
        }

        for (let i = 0; i < this.level; i++) {
            Arc.drawScaledSprite(Arc.sprites.fruit[i], 27+1/6 - i*5/6, 20+1/8, 1/8);
        }

        for (let i = 1; i < this.lives; i++) {
            Arc.drawScaledSprite(Arc.sprites.pMove32, 7/6 + i, 20+1/8, 1/8);
        }

        Arc.drawScaledSprite(Arc.sprites.score, 6, 1.5, 1/8, 1, .5);
        Arc.drawNumber(this.score, 6.5, 1.5, 1/8, 1/8, 0, 0.5);

        Arc.drawScaledSprite(Arc.sprites.highscore, 23, 1.5, 1/8, 1, .5);
        Arc.drawNumber(this.highscore, 23.5, 1.5, 1/8, 1/8, 0, 0.5);
    }
}