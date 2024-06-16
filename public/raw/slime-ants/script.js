const debug = {
    seed: false,
    fps: false,
};

const SIZE = 180
const WIDTH = SIZE;
const HEIGHT = SIZE;
const SIZE_2 = WIDTH * WIDTH
const HALF_SIZE = SIZE/2

const canvas = document.querySelector('#canvas');
canvas.width = WIDTH;
canvas.height = HEIGHT;
// canvas.style.filter = 'grayscale(30%)';

const ctx = canvas.getContext('2d');

const CHANNEL = {
    R: 0,
    G: 1,
    B: 2,
}
let img
function toPix(img, x, y, chnl=CHANNEL.G) {
    x = Math.round(x)
    y = Math.round(y)
    if (D.wrap) {
        if (D.circular) {
            if (dist2(x, y, HALF_SIZE, HALF_SIZE) > SIZE_2) {
                x = SIZE - x
                y = SIZE - y
            }
        } else {
            x = (x + WIDTH) % WIDTH
            y = (y + HEIGHT) % HEIGHT
        }
    } else {
        if (D.circular) {
            if (dist2(x, y, HALF_SIZE, HALF_SIZE) > SIZE_2) return -1
        } else {
            if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return -1
        }
    }
    return ((y * (img.width * 4)) + (x * 4)) + chnl
}
function getPix(img, x, y, chnl) {
    let i = toPix(img, x, y, chnl)
    if (i === -1) return 0
    if (D.avoid) {
        let j, k
        switch (chnl) {
            case CHANNEL.R: j = i+1; k = i+2; break;
            case CHANNEL.G: j = i-1; k = i+1; break;
            case CHANNEL.B: j = i-2; k = i-1; break;
        }
        let val = img.data[i] - img.data[j] - img.data[k]
        // return (val < 0) ? 0 : val / 255
        return (val < 0) ? 0 : val
    } else {
        // return img.data[i] / 255
        return img.data[i]
    }
}
function setPix(img, x, y, val, chnl) {
    let i = toPix(img, x, y, chnl)
    if (i === -1) return
    // img.data[i] = Math.round(val * 255)
    img.data[i] = val
    // img.data[toPix(x, y, 0)] = Math.round(val * 255)
    // img.data[toPix(x, y, 1)] = Math.round(val * 255)
    // img.data[toPix(x, y, 2)] = Math.round(val * 255)
}

let timer, prevTime;
let paused = false;

function init() {
    aspect = window.innerWidth / window.innerHeight;
    prevTime = performance.now();
    timer = 0;

    window.addEventListener('blur', () => pause(true));
    window.addEventListener('focus', () => pause(false));
    window.addEventListener('resize', onWindowResize, false);
    onWindowResize()

    canvas.addEventListener('pointerdown', e => { spawnEvent = e });
    canvas.addEventListener('pointermove', e => { if (spawnEvent) spawnEvent = e });
    canvas.addEventListener('touchmove', e => { spawnEvent = e.touches[0] });
    canvas.addEventListener('pointerup', e => { spawnEvent = false });

    generate();
}

class V {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    static polar(mag, angle) {
        return new V(mag * Math.cos(angle), mag * Math.sin(angle))
    }

    // Manhattan distance
    manhat(other) {
        return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
    }
    dist(other) {
        return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
    }
    equals(other) {
        return this.x === other.x && this.y === other.y;
    }
    add(other) {
        return new V(this.x + other.x, this.y + other.y);
    }
    sub(other) {
        return new V(this.x - other.x, this.y - other.y);
    }
    scale(c) {
        if (typeof c === 'number') return new V(c * this.x, c * this.y);
        else return new V(c.x * this.x, c.y * this.y);
    }
    rotate(angle) {
        return V.polar(this.mag(), this.angle() + angle)
    }
    do(func) {
        return new Arc.V(func(this.x), func(this.y));
    }
    angle(other) {
        let diff = (other) ? other.sub(this) : this;
        return Math.atan2(diff.y, diff.x);
    }
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }
    mag() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
    norm() {
        let mag = this.mag() || 1;
        return new V(this.x / mag, this.y / mag);
    }
    apply(func) {
        return new V(func(this.x, 0), func(this.y, 1));
    }
    clone() {
        return new V(this.x, this.y);
    }
    closest(points) {
        let min_dist = Infinity;
        let min_point = false;
        points.forEach(p => {
            let dist = this.dist(p);
            if (dist < min_dist) {
                min_dist = dist;
                min_point = p;
            }
        });
        return min_point;
    }
}

let dots = []
const D_defaults = { // thick-laned
    speed: 50,
    SA: 60,
    SO: 5,
    RA: 30,
    n: 5000,
    fade: 1.5,
    diffuse: .2,

    specific: [{}, {}, {}], // channel-specific settings for the above rules
    channel: -1,

    wrap: true,
    avoid: false,
    circular: false,
    colors: false,
    R: true,
    R_col: '#ff0000',
    G: true,
    G_col: '#3dffbe',
    B: true,
    B_col: '#14d0ff',
}
let prevD = getStored('slime-settings')
const D = Object.assign({}, D_defaults, prevD || {})

const center = new V(WIDTH/2, HEIGHT/2)

class Dot {
    constructor(x, y, vx, vy) {
        this.pos = new V(x, y)
        this.vel = new V(vx ?? rands(1), vy ?? rands(1)).norm().scale(D.speed)
        this.vel = this.vel.norm().scale(D.speed * .015)
        this.acc = new V(0, 0)
        this.channel()
    }
    channel() {
        let options = [D.R, D.G, D.B].map((enabled, i) => enabled ? i : undefined).filter(c => c !== undefined)
        this.chnl = options[randi(options.length)]
    }

    update(dt, img) {
        // slime behavior from https://uwe-repository.worktribe.com/output/980579
        let ang = this.vel.angle()
        let SA = Math.PI * D.SA / 180
        let pFL = this.pos.add(V.polar(D.SO, ang + SA))
        let pF = this.pos.add(V.polar(D.SO, ang))
        let pFR = this.pos.add(V.polar(D.SO, ang - SA))

        let FL = getPix(img, pFL.x, pFL.y, this.chnl)
        let F = getPix(img, pF.x, pF.y, this.chnl)
        let FR = getPix(img, pFR.x, pFR.y, this.chnl)

        let speed = D.speed * .015
        let RA = Math.PI * D.RA / 180
        if (F > FL && F > FR) {
            // stay straight
            this.vel.x = speed * Math.cos(ang)
            this.vel.y = speed * Math.sin(ang)
        } else if (F < FL && F < FR) {
            // rotate right or left
            // this.vel = V.polar(speed, ang + (randi(1) ? -1 : 1) * RA)
            ang += Math.random() < .5 ? -RA : RA
            // ang += performance.now() % 2 ? RA : -RA
            this.vel.x = speed * Math.cos(ang)
            this.vel.y = speed * Math.sin(ang)
        } else if (FL < FR) {
            // rotate right
            // this.vel = V.polar(speed, ang - RA)
            ang += -RA
            this.vel.x = speed * Math.cos(ang)
            this.vel.y = speed * Math.sin(ang)
        } else if (FR < FL) {
            // rotate left
            // this.vel = V.polar(speed, ang + RA)
            ang += RA
            this.vel.x = speed * Math.cos(ang)
            this.vel.y = speed * Math.sin(ang)
        }

        // this.pos = this.pos.add(this.vel)
        this.pos.x += this.vel.x
        this.pos.y += this.vel.y

        let center_diff = this.pos.sub(center)
        if (D.wrap) {
            if (D.circular) {
                if (center_diff.mag() > center.x) {
                    this.pos.x = SIZE - this.pos.x
                    this.pos.y = SIZE - this.pos.y
                }
            } else {
                if (this.pos.x < 0) this.pos.x = WIDTH
                if (this.pos.y < 0) this.pos.y = HEIGHT
                if (this.pos.x > WIDTH) this.pos.x = 0
                if (this.pos.y > HEIGHT) this.pos.y = 0
            }
        } else {
            if (D.circular) {
                if (center_diff.mag() > HALF_SIZE) {
                    this.pos.x -= this.vel.x
                    this.pos.y -= this.vel.y
                    let diff = center_diff.scale(-1).norm()
                    let vel = this.vel.norm()
                    this.vel = V.polar(speed, vel.sub(diff.scale(2 * diff.dot(vel))).angle())
                    this.pos = V.polar(HALF_SIZE, center_diff.angle()).add(center)
                }
            } else {
                if (this.pos.x < 0 || WIDTH <= this.pos.x) {
                    this.vel.x *= -1
                    // this.pos.x += this.vel.x
                }
                if (this.pos.y < 0 || HEIGHT <= this.pos.y) {
                    this.vel.y *= -1
                    // this.pos.y += this.vel.y
                }
            }
        }
    }

    draw(img) {
        setPix(img, this.pos.x, this.pos.y, 255, this.chnl)
    }
}

function generate() {
    dots = []
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    img = ctx.getImageData(0, 0, WIDTH, HEIGHT);

    const nSplit = Math.round(D.n / 3)
    const chnls = Array.from({ length: 3 }).map((_, i) => {
        if (D.specific[i]) {
            return D.specific[i].n ?? nSplit
        } else {
            return nSplit
        }
    })
    const n = chnls.reduce((a, v) => a + v)
    console.debug(D, chnls, n)
    for (let i = 0; i < n; i++) {
        // dots.push(new Dot(rand(WIDTH), rand(HEIGHT)))
        let x, y;
        do {
            x = rands(WIDTH/3) + WIDTH/2
            y = rands(WIDTH/3) + HEIGHT/2
        } while (dist(x, y, WIDTH/2, HEIGHT/2) > Math.min(WIDTH/3, HEIGHT/3))
        let dot
        if (D.center) {
            dot = new Dot(x, y, x - WIDTH/2, y - HEIGHT/2)
            // dots.push(new Dot(x, y, WIDTH/2 - x, HEIGHT/2 - y))
        } else {
            dot = new Dot(x, y)
        }
        chnls[dot.chnl] -= 1
        while (!chnls[dot.chnl]) dot.channel()
        dots.push(dot)
    }
}

let spawnEvent;
function spawn() {
    if (spawnEvent) {
        let { clientX, clientY } = spawnEvent;
        let rect = canvas.getBoundingClientRect()
        let x = ((clientX - rect.x) / rect.width) * WIDTH
        let y = ((clientY - rect.y) / rect.height) * HEIGHT
        if (D.wrap && !D.circular) {
            x = (x*1.25 - WIDTH/8 + WIDTH) % WIDTH
            y = (y*1.25 - HEIGHT/8 + HEIGHT) % HEIGHT
        }
        dots.push(new Dot(x, y))
    }
}

function update(dt) {
    canvas.style.borderRadius = D.circular ? '50%' : '';
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    let newImg = ctx.getImageData(0, 0, WIDTH, HEIGHT);

    spawn()
    // dots.forEach(dot => dot.update(dt, img))
    // dots.forEach(dot => dot.draw(img))

    const D_save = JSON.parse(JSON.stringify(D))
    for (let chnl = 0; chnl < 3; chnl++) {
        Object.assign(D, D_save, D.specific[chnl])
        const chnl_dots = dots.filter(d => d.chnl === chnl)
        chnl_dots.forEach(dot => dot.update(dt, img))
        chnl_dots.forEach(dot => dot.draw(img))

        // if (![D.R, D.G, D.B][chnl]) continue;
        for (let x = 0; x < WIDTH; x++)
        for (let y = 0; y < HEIGHT; y++) {
            let total = 0
            for (let x_off = -1; x_off < 2; x_off++)
            for (let y_off = -1; y_off < 2; y_off++) {
                // if ()
                total += getPix(img, x + x_off, y + y_off, chnl)
            }
            if (D.diffuse !== undefined) {
                setPix(newImg, x, y, lerp(getPix(img, x, y, chnl), total / (9 * D.fade), D.diffuse), chnl)
            } else {
                setPix(newImg, x, y, total / (9 * D.fade), chnl)
            }
        }
    }
    Object.assign(D, D_save)

    dots.forEach(dot => dot.draw(newImg))

    let outImg
    if (D.colors) {
        outImg = ctx.getImageData(0, 0, WIDTH, HEIGHT);
        let [[r1, r2, r3], [g1, g2, g3], [b1, b2, b3]] = [readRGB(D.R_col), readRGB(D.G_col), readRGB(D.B_col)]
        newImg.data.forEach((_, i) => {
            if (i % 4 === 0) {
                let [cR, cG, cB] = newImg.data.slice(i, i+3)
                if (!D.R) cR = 0
                if (!D.G) cG = 0
                if (!D.B) cB = 0
                outImg.data[i] =   r1*cR + g1*cG + b1*cB
                outImg.data[i+1] = r2*cR + g2*cG + b2*cB
                outImg.data[i+2] = r3*cR + g3*cG + b3*cB
            }
        })

    } else {
        outImg = newImg
    }

    if (D.wrap && !D.circular) {
        canvas.width = 1.25*WIDTH;
        canvas.height = 1.25*HEIGHT;
        for (let i = -1; i < 2; i++)
        for (let j = -1; j < 2; j++) {
            ctx.putImageData(outImg, WIDTH/8 + i*WIDTH, HEIGHT/8 + j*HEIGHT)
        }
    } else {
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        ctx.putImageData(outImg, 0, 0)
    }

    img = newImg
}
function readRGB(str) {
    let r = parseInt(str.slice(1, 3), 16)
    let g = parseInt(str.slice(3, 5), 16)
    let b = parseInt(str.slice(5, 7), 16)
    let total = 255
    // let total = Math.max(255, r + g + b)
    return [r / total, g / total, b / total]
}

// animation loop: update & render scene
function animate() {
    if (paused) return;

    requestAnimationFrame(animate);
    var elapsedTime = performance.now() - prevTime;
    prevTime += elapsedTime;
    timer += elapsedTime * 0.0001;
    if (debug.fps) console.log(elapsedTime);

    update(elapsedTime / 1000);
}

function onWindowResize() {
    let save = document.createElement('canvas');
    save.width = canvas.width;
    save.height = canvas.height;
    save.getContext('2d').drawImage(canvas, 0, 0);

    let style = window.getComputedStyle(canvas.parentNode);
    let containerWidth = Number(style.width.slice(0, -2));
    let containerHeight = Number(style.height.slice(0, -2));

    let canvasScale = Math.min(containerWidth / WIDTH, containerHeight / HEIGHT);
    canvas.style.width = `${canvasScale * WIDTH}px`;
    canvas.style.height = `${canvasScale * HEIGHT}px`;
    canvas.style.borderRadius = D.circular ? '50%' : '';
    canvas.style.display = 'initial';

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(save, 0, 0, canvas.width, canvas.height);
    save.remove();
}

function pause(value) {
    paused = (value !== null) ? value : true;
    if (!paused) {
        prevTime = performance.now();
        requestAnimationFrame(animate);
    }
    togglePauseHint(paused)
}


init();
animate();