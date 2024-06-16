import Arc from '/lib/modules/arcm.js'
import { Counter } from '/lib/modules/counter.js'
import { Level } from './level.js'
import sprites from './sprites.js'

import { addAuthTrigger } from '/lib/modules/site/auth.js'
import { checkin, getScore, addScore } from '/lib/modules/site/scores.js'

checkin('snackman')

const CONSTANTS = {
    TICK_MS: 12,
    ROWS: 21,
    COLS: 29,
    SCALE: 8,
};
CONSTANTS.WIDTH = CONSTANTS.SCALE*CONSTANTS.COLS;
CONSTANTS.HEIGHT = CONSTANTS.SCALE*CONSTANTS.ROWS;

let background = '#070c0d';

const STATE = {
    MENU: 'menu',
    PLAY: 'play',
    END: 'end'
};

let canvas = document.querySelector('#gameCanvas');
setTimeout(() => {
    Arc.scale = CONSTANTS.SCALE * 4
    Arc.init(canvas, CONSTANTS.COLS, CONSTANTS.ROWS);
    Arc.loadSheet('sheet.png', sprites).then(() => {
        Arc.loop();
        new GameState();
    });
}, 150);

class GameState {
    constructor() {
        Arc.setUpdate(this.tick.bind(this), CONSTANTS.TICK_MS);

        document.addEventListener('keydown', event => this.handleKey(event.key, true), false);
        document.addEventListener('keyup', event => this.handleKey(event.key, false), false);

        this.highscore = this.fetchHighscore();
        this.counter = new Counter();

        canvas.style.background = background;
        Arc.add(this.draw.bind(this));

        this.setState(STATE.MENU);
    }

    setState(state) {
        switch (this.state) {
            default:
        }

        this.counter.reset();
        switch (state) {
            case STATE.PLAY:
                this.level = new Level(this.highscore);
                break;
            default:
        }

        this.state = state;
        this.tick();
    }

    tick() {
        this.counter.tick();
        this.highscore = highscore.personal;
        switch (this.state) {
            case STATE.PLAY:
                this.level.update();
                if (this.level.gameOver) {
                    if (this.level.score > this.highscore) {
                        this.highscore = this.level.score;
                        this.saveHighscore(this.highscore);
                    }
                    this.setState(STATE.END);
                }
                break;
            default:
        }
    }

    fetchHighscore() {
        return highscore.personal;
        // let snackmanCookie = document.cookie
        //     .split(';')
        //     .find(cookie => cookie.startsWith('snackmanHighscore'));
        // if (snackmanCookie) {
        //     return Number(snackmanCookie.split('=')[1]);
        // }
        // return 0;
    }
    saveHighscore(score) {
        // save cookie for ten years
        // document.cookie = `snackmanHighscore=${score}; max-age=${60*60*24*365*10}`;
        highscore.personal = score;
        addScore('snackman', score);
    }

    draw(ctx) {
        switch (this.state) {
            case STATE.MENU:
                Arc.drawScaledSprite('title', CONSTANTS.COLS/2, CONSTANTS.ROWS/2 - 3, 1/2, .5, .5);
                if (this.counter.modSplit(100, 2) === 0) {
                    Arc.drawScaledSprite('pressKey', CONSTANTS.COLS/2, CONSTANTS.ROWS*5/7, 1/8, .5, .5);
                }
                break;
            case STATE.PLAY:
            case STATE.END:
                this.level.draw(ctx)
                break;
            default:
        }
    }

    handleKey(key, isDown) {
        if (this.level && isDown) {
            this.level.press(key);
        }

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

const highscore = {
    personal: 0
}
const reloadHighScores = () => {
    getScore('snackman').then(data => {
        let { user, global } = data
        if (user?.scores?.length) {
            highscore.personal = user.scores[0].score
        }
    })
}
addAuthTrigger(() => {
    reloadHighScores()
})

export { CONSTANTS }