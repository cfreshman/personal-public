import Arc from '/lib/modules/arcm.js'
import { Counter } from '/lib/modules/counter.js'
import { Character } from './character.js'

export class Ghost extends Character {
    constructor(x, y, type, level) {
        super(x, y, level);
        this.type = type;
        if (type === 0) this.face = 3;
        else if (type === 1) this.face = 0;
        else this.face = 2;
        this.tryFace = this.face;

        this.tarX = this.x;
        this.tarY = this.y;
        this.anim = new Counter();
    }

    targetBox() {
        this.tarX = 14;
        this.tarY = 9;
    }
    targetCorner() {
        switch (this.type) {
            case 0: this.tarX = 28; this.tarY = 0; break;
            case 1: this.tarX = 0; this.tarY = 0; break;
            case 2: this.tarX = 28; this.tarY = 20; break;
            case 3: this.tarX = 0; this.tarY = 20; break;
            default:
        }
    }
    targetPlayer(player, red) {
        let { tileX: pX, tileY: pY, face: pFace } = player;
        // behavior from https://gameinternals.com/understanding-pac-man-ghost-behavior
        this.tarX = pX;
        this.tarY = pY;
        switch (this.type) {
            case 0: // red targets player
                break;
            case 1: // pink targets 3 spaces ahead
                [this.tarX, this.tarY] = this.addToFace(this.tarX, this.tarY, pFace, 3);
                break;
            case 2: // cyan is complicated, uses red's position
                [this.tarX, this.tarY] = this.addToFace(this.tarX, this.tarY, pFace, 2);
                this.tarX = (this.tarX-red.tileX)*2 + red.tileX;
                this.tarY = (this.tarY-red.tileY)*2 + red.tileY;
                break;
            case 3: // orange targets corner if closer than 6 tiles
                if (dist(this.tileX, this.tileY, pX, pY) < 6) {
                    this.tarX = 0;
                    this.tarY = 20;
                }
                break;
            default:
        }
    }

    update() {
        this.anim.tick();

        this.tileX = Math.round(this.x);
        this.tileY = Math.round(this.y);
        this.inBox = bounded(this.tileX, 13, 15) && bounded(this.tileY, 10, 12);

        // if centered, make decision on next move
        if (this.isCentered()) {
            if (this.inBox) {
                if (this.eaten) {
                    // if eaten returns to box, revive
                    if (this.tileY > 10) this.revive();
                } else if (this.toExit) {
                    // if leaving, navigate based on y
                    if (this.tileX === 13) this.face = 1;
                    else if (this.tileX === 15) this.face = 3;
                    else this.face = 0;
                } else {
                    // else, bounce based on y
                    if (this.tileY === 11) this.face = 2;
                    else if (this.tileY === 12) this.face = 0;
                }
            } else {
                if (this.eaten) {
                    this.targetBox();
                    this.speed = 3.5 /32;
                }

                // if unblocked in adjacent direction, try to turn
                if (this.canMove((this.face+1)%4) || this.canMove((this.face+3)%4)) {
                    let tryFace;
                    // if blue, choose random option
                    if (this.blue) {
                        do {
                            tryFace = randi(4);
                        } while (!this.canMove(tryFace));
                    // else, choose option closest to target
                    } else {
                        let min_dist = 100;
                        for (let currFace = 0; currFace < 4; currFace++) {
                            if (this.canMove(currFace)) {
                                let [nextX, nextY] = this.addToFace(this.tileX, this.tileY, currFace, 1);
                                let curr_dist = dist(this.tarX, this.tarY, nextX, nextY)
                                if (curr_dist < min_dist) {
                                    min_dist = curr_dist;
                                    tryFace = currFace;
                                }
                            }
                        }
                    }
                    this.face = tryFace;
                }
            }

            // if eaten & above box entrance, move down
            if (this.eaten && this.tileX === 14 && this.tileY === 9) this.face = 2;
        }

        this.doMove(this.face);

        // wrap through tunnel
        if (this.tileX === 14) {
            if (this.tileY < 4 || this.tileY > 17) {
                this.speed = this.level.getTunnelSpeed(true);
                if (this.tileY < -.4) this.y = 20.4;
                else if (this.y > 20.4) this.y = -.4;
            } else if (this.tileY === 4 || this.tileY === 17) {
                this.speed = this.level.getTunnelSpeed(false);
            }
        }
    }

    canMove(tryFace) {
        // allow return into box when eaten
        if (this.eaten && this.tileX === 14 && bounded(this.tileY, 9, 11)) return true;
        // if in box, move up/down
        if (this.inBox) {
            if (this.toExit) return true;
            if (this.tileY === 11) return tryFace === 2;
            if (this.tileY === 12) return tryFace === 0;
            return false;
        } else {
            // don't allow a ghost to reverse direction
            if (this.isOpposite(tryFace)) return false;
            // allow wrap through tunnel
            if (this.isTunneling(this.tileX, this.tileY, tryFace)) return true;
            // don't allow ghosts to go up through center paths (random pacman rule)
            if (this.tileY === 9 && bounded(this.tileX, 13, 15) && tryFace === 0) return false;
            // otherwise, allow direction switch from center of tile obeying walls
            if (this.isCentered()) {
                let [x, y] = this.addToFace(this.tileX, this.tileY, tryFace, 1);
                if (this.level.map[y][x] !== 1) return true;
            }
            return false;
        }
    }

    // verify tryFace is opposite to current face
    isOpposite(tryFace) {
        return (tryFace+2) % 4 === this.face;
    }

    setScatter(isScatter) {
        this.scatter = isScatter;
        // reverse direction
        if (!this.eaten) this.face = (this.face+2) % 4;
    }

    setBlue(isBlue) {
        this.blue = isBlue;
        if (isBlue && !this.eaten) {
            // reverse direction
            this.face = (this.face+2) % 4;
            this.anim.reset();
        }
    }

    exit() {
        this.toExit = true;
    }

    eat() {
        this.eaten = true;
        this.blue = false;
        this.toExit = false;
    }

    revive() {
        this.eaten = false;
        this.speed = this.level.getSpeed(1, this.blue);
        this.toExit = true;
    }

    draw(ctx) {
        let eyes = Arc.sprites.eyes[this.face];
        let skin;
        if (this.blue) {
            if (this.anim.count > 300) {
                // flash white
                skin = Arc.sprites.blue[2*this.anim.modSplit(50, 2) + this.anim.modSplit(20, 2)];
            } else {
                skin = Arc.sprites.blue[0 + this.anim.modSplit(20, 2)];
            }
            Arc.drawScaledSprite(skin, this.x+.5, this.y+.5, 1/8, .5, .5);
        } else {
            if (!this.eaten) {
                skin = Arc.sprites.ghost[this.type*2 + this.anim.modSplit(20, 2)];
                Arc.drawScaledSprite(skin, this.x+.5, this.y+.5, 1/8, .5, .5);
            }
            Arc.drawScaledSprite(eyes, this.x+.5, this.y+.5, 1/8, .5, .5);
        }

        switch(this.type) {
            case 0: ctx.strokeStyle = 'red'; break;
            case 1: ctx.strokeStyle = 'pink'; break;
            case 2: ctx.strokeStyle = 'cyan'; break;
            case 3: ctx.strokeStyle = 'orange'; break;
            default:
        }
        ctx.lineWidth = 1/8
        // ctx.strokeRect(this.tarX+1/16, this.tarY+1/16, 7/8, 7/8);
    }
}