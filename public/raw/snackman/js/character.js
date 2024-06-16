export class Character {
    constructor(tileX, tileY, level) {
        this.x = this.tileX = tileX;
        this.y = this.tileY = tileY;
        this.level = level;
    }

    update() {}

    doMove(face) {
        [this.x, this.y] = this.addToFace(this.x, this.y, face, this.speed);
        switch (face) {
            case 0: case 2: this.x = this.tileX; break;
            case 1: case 3: this.y = this.tileY; break;
            default:
        }
    }

    addToFace(x, y, face, dist) {
        switch (face) {
            case 0: y -= dist; break;
            case 1: x += dist; break;
            case 2: y += dist; break;
            case 3: x -= dist; break;
            default:
        }
        return [x, y];
    }

    isCentered() {
        return dist(this.x, this.y, this.tileX, this.tileY) <= this.speed/2;
    }

    isTunneling(tileX, tileY, face) {
        return tileX === 14 && (tileY < 3 || tileY > 18) && face % 2 === 0
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    draw(ctx) {}
}