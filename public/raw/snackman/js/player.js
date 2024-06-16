import Arc from '/lib/modules/arcm.js'
import { Counter, Countdown } from '/lib/modules/counter.js'
import { Character } from './character.js'

export class Player extends Character {
    constructor(x, y, level) {
        super(x, y, level);
        this.face = 3;
        this.tryFace = this.face;
        this.speed = 1.6 /32;

        this.skip = 0;
        this.isDead = false;
        this.anim = new Counter();
        this.pelletTime = new Countdown();
    }

    update() {
        this.anim.tick();
        this.pelletTime.tick();
        if (this.isDead) return;

        this.tileX = Math.round(this.x);
        this.tileY = Math.round(this.y);

        if (this.tryMove(this.tryFace)) this.face = this.tryFace;

        if (this.pelletTime.isDone()) {
            if (this.isCentered()) {
                // don't move if blocked by wall
                if (this.tryMove(this.face)) this.doMove(this.face);
            } else {
                this.doMove(this.face);
            }
        }

        // wrap through tunnel
        if (this.y < -0.4) this.y = 20.4;
        else if (this.y > 20.4) this.y = -.4;

        // eat pellets
        if (this.level.map[this.tileY][this.tileX] === 2) {
            this.level.eatDot(0, this.tileX, this.tileY);
            this.pelletTime.start(2);
        } else if (this.level.map[this.tileY][this.tileX] === 3) {
            this.level.eatDot(1, this.tileX, this.tileY);
            this.pelletTime.start(6);
        }
    }

    tryMove(face) {
        if (this.isTunneling(this.tileX, this.tileY, face)) return true;
        if (this.face !== face && this.face % 2 === face % 2) return true;
        if (this.isCentered()) {
            let x = this.tileX,
                y = this.tileY;
            switch (face) {
                case 0:
                    y = this.tileY - 1;
                    break;
                case 1:
                    x = this.tileX + 1;
                    break;
                case 2:
                    y = this.tileY + 1;
                    break;
                case 3:
                    x = this.tileX - 1;
                    break;
                default:
            }
            if (this.level.map[y][x] !== 1) return true;
        }

        return false;
    }

    checkGhost(ghost) {
        return (Math.abs(ghost.x - this.x) < 1/3 && Math.abs(ghost.y - this.y) < 1/3)
    }

    checkFruit() {
        return (this.tileX === 14 && this.tileY === 14);
    }

    kill() {
        this.isDead = true;
        this.anim.reset();
    }

    press(face) {
        this.tryFace = face;
    }

    draw(ctx) {
        let skin;
        if (this.isDead) {
            if (this.anim.count < 104) {
                skin = Arc.sprites.pDie[this.anim.divide(15)];
                Arc.drawScaledSprite(skin, this.x+.5, this.y+.5, 1/8, .5, .5);
            }
        } else {
            if (this.face === 4)
                skin = Arc.sprites.player;
            else
                skin = Arc.sprites[`pMove${this.face}${this.anim.modSplit(15, 3)}`];

            Arc.drawScaledSprite(skin, this.x+.5, this.y+.5, 1/8, .5, .5);
        }

        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 1/8;
        // ctx.strokeRect(this.tileX+1/16, this.tileY+1/16, 7/8, 7/8);
    }
}