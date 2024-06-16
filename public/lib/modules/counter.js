export class Counter {
    constructor() {
        this.reset();
    }

    reset() {
        this.count = 0;
    }

    tick() {
        this.count++;
    }

    mod(n) {
        return this.count % n;
    }

    divide(n) {
        return Math.floor(this.count / n);
    }

    modSplit(mod, split) {
        let divide = mod / split;
        return Math.floor(this.mod(mod) / divide);
    }
}

export class Clock extends Counter {
    constructor(ticks) {
        super();
        this.ticks = ticks;
    }

    tick() {
        this.count = (this.count + 1) % this.ticks;
    }

    // if split into n parts, return the index for current ticks from [0, n)
    split(n) {
        let divide = this.ticks / n;
        return Math.floor(this.count / divide);
    }
}

export class Countdown extends Counter {
    constructor(ticks) {
        super();
        this.ticks = ticks;
        this.triggered = false;
    }

    start(n) {
        this.ticks = n || this.ticks;
        this.count = this.ticks;
        this.triggered = false;
        return this;
    }

    tick() {
        if (this.count > 0) {
            this.count--;
            if (this.count === 0) {
                this.triggered = true;
            }
        } else {
            this.triggered = false;
        }
    }

    percent() {
        return 1 - this.count / this.ticks;
    }

    isActive() {
        return this.count > 0;
    }

    isDone() {
        return this.count === 0;
    }

    isTriggered() {
        return this.triggered;
    }
}