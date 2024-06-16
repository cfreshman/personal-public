T = THREE;
V2 = T.Vector2;
V3 = T.Vector3;
ORIGIN = V3(0, 0, 0);

const debug = {
    showFlocks: false,
    showFollow: false,
    showRaycast: false,
    seed: false,
    fps: false,
};

const SIZE = 1024,
      BORDER_SIZE = 16,
      SCALE = 3,
      MIN_HEIGHT = 1,
      MAX_HEIGHT = 32,
      CHUNK_SIZE = 16,
      N_BOIDS = 64,
      N_FLOCKS = 3,
      ORTHO = true,
      IMG_SCALE = 4;

var size = SIZE,
    radius = SIZE / 2,
    borderSize = BORDER_SIZE,
    tiles = SIZE / Math.pow(2, SCALE),
    minHeight = MIN_HEIGHT * Math.pow(2, SCALE),
    maxHeight = MAX_HEIGHT * Math.pow(2, SCALE),
    highestElevation = 0,
    frustumSize = (window.innerWidth / window.innerHeight) * SIZE,
    chunkSize = CHUNK_SIZE / Math.pow(2, SCALE);
var tileSize = size / tiles;
var liquidHeight = (maxHeight - minHeight)*1/5 + minHeight;

const COLOR = {
    border: 0x383842,
    sky: 0xdff6f5,
    ground: 0x5e3643,
    bottom: 0x472d3c,
    liquid: 0x3978a8,
    deep: 0x394778,
    cover: 0x71aa34,
    silt: 0xeea160,
    tops: 0x397b44,
    spot: 0x397b44,
    trunk: 0x7a444a,
    background: 0x050505,
    fog: 0xcccccc,
    red: 0xff0000,
    green: 0x00ff00,
    blue: 0x0000ff,
    white: 0xf0f0f0,
    black: 0x0f0f0f
}
for (let color in COLOR) COLOR[color] = new T.Color(COLOR[color]);

var canvas = document.querySelector('#canvas');
var scene, renderer, camera, controls, terrain, liquid, sides, raycaster, boids;
var dirs = {up: 0, down: 0, left: 0, right: 0};
var timer, prevTime;
var paused = false;

class Boid extends T.Object3D {
    constructor() {
        super();
        this.b_id = Boid.count++;
        this.up = new V3(0, 0, 1);
        this.speed = 0.11;

        this.geometry = new T.ConeGeometry(tileSize*3/5, tileSize*3/2, 3);
        this.material = new T.MeshBasicMaterial({ color: COLOR.white, side: T.DoubleSide });
        this.mesh = new T.Mesh(this.geometry, this.material);
        this.add(this.mesh);

        this.line = new T.Geometry();
        this.line.vertices.push(new T.Vector3(0, 0, 0));
        this.line.vertices.push(new T.Vector3(0, 0, tileSize*6));
        this.line.material = new T.LineBasicMaterial({ color: COLOR.black });
        this.add(new T.Line(this.line, this.line.material));

        this.geometry.rotateX(Math.PI/2);
        this.geometry.rotateZ(Math.PI);
        this.geometry.rotateX(Math.PI/36);
    }

    spawn(x, y, z) {
        this.position.copy(new V3(x, y, z));
        this.vel = new V3(rands(), rands(), rands()).normalize();
        this.lookAt(this.position.clone().add(this.vel));
    }

    update(dt, boids, CoM) {
        if (dt === 0) return;

        let turn = new V3(0, 0, 0);

        // turn towards center of mass
        if (this.position.distanceTo(CoM) > tileSize) {
            let diff = CoM.clone().sub(this.position);
            turn.add(diff.normalize().multiplyScalar(20));
        }

        // align w/ flock, but space out
        if (debug.showFollow && this.b_id === 0) this.material.color.set(COLOR.blue);
        boids.forEach(boid => {
            if (boid.b_id === this.b_id) return;

            // if boid in front of this one
            if (this.vel.dot(boid.position.clone().sub(this.position)) > 0) {
                // if not too close
                if (this.position.distanceToSquared(boid.position) > Math.pow(tileSize*5, 2)) {
                    // align
                    turn.add(boid.vel.clone().normalize());
                    if (debug.showFollow && this.b_id === 0) {
                        boid.material.color.set(COLOR.green);
                    }
                } else {
                    // else avoid
                    turn.add(this.position.clone().sub(boid.position).normalize().multiplyScalar(10));
                }
            } else if (debug.showFollow && this.b_id === 0) {
                boid.material.color.set(COLOR.red);
            }
        });

        // avoid terrain if dangerously low
        if (this.position.z < highestElevation) {
            // raycast to check for terrain
            /* need to fix performance here
            raycaster.set(this.position, this.vel);
            var intersects = raycaster.intersectObjects([terrain, liquid]);
            if (intersects.length > 0) {
                // turn in direction of surface normal
                var intersect = intersects[0];
                var face = intersect.face;
                turn.add(face.normal.clone().normalize().multiplyScalar(25));
                this.line.material.color.set(COLOR.red);
            } else {
                this.line.material.color.set(COLOR.black);
            } */
            turn.add(new V3(0, 0, 1).clone().multiplyScalar(25));
            this.line.material.visible = true;
        } else {
            this.line.material.visible = false;
        }
        if (!debug.showRaycast) this.line.material.visible = false;

        // turn and move
        this.vel.normalize().lerp(turn.normalize(), 0.005 * dt);
        this.vel.z /= 2;
        this.vel.normalize().multiplyScalar(this.speed * dt);
        this.lookAt(this.position.clone().add(this.vel));
        this.position.add(this.vel);

        // wrap
        if (mag2(this.position.x, this.position.y) > Math.pow(radius*1.1, 2)) {
            this.position.x *= -1;
            this.position.y *= -1;
        }
    }
}
Boid.count = 0;

function init() {
    aspect = window.innerWidth / window.innerHeight;
    prevTime = performance.now();
    timer = 0;

    scene = new T.Scene();
    scene.background = COLOR.background;
    scene.fog = new T.FogExp2(COLOR.fog, 0.00025);

    renderer = new T.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth/IMG_SCALE, window.innerHeight/IMG_SCALE);
    document.body.appendChild(renderer.domElement);

    // frustumSize *= aspect;
    if (ORTHO) {
        camera = new T.OrthographicCamera(-frustumSize/2, frustumSize/2, frustumSize/aspect/2, -frustumSize/aspect/2, 1, 10000)
    } else {
        camera = new T.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 10000);
    }
    camera.up.set(0, 0, 1);
    camera.position.copy(new T.Vector3(Math.cos(Math.PI/4), Math.sin(Math.PI/4), 2/3).multiplyScalar(frustumSize));

    // from three.js OrbitControls example
    controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = maxHeight;
    controls.maxDistance = 1500;
    controls.maxPolarAngle = Math.PI / 2;

    var axesHelper = new T.AxesHelper(size/2);
    axesHelper.geometry.translate(0, 0, maxHeight/2);
    // scene.add(axesHelper);

    raycaster = new T.Raycaster(ORIGIN, ORIGIN, 0, tileSize*5);

    var terrain_geom = new T.BufferGeometry();
    var indices = [];
    for (var i = 0; i < tiles; i++) {
        for (var j = 0; j < tiles; j++) {
            var a = i * (tiles + 1) + (j + 1);
            var b = i * (tiles + 1) + j;
            var c = (i + 1) * (tiles + 1) + j;
            var d = (i + 1) * (tiles + 1) + (j + 1);
            indices.push(a, c, b);
            indices.push(a, d, c);
        }
    }
    terrain_geom.setIndex(indices);
    terrain = new T.Mesh(terrain_geom, new T.MeshStandardMaterial({
        metalness: 0,
        roughness: 1,
        flatShading: true,
        vertexColors: T.VertexColors
    }));
    scene.add(terrain);

    var liquid_geom = new T.CylinderGeometry(radius - 0.5, radius - 0.5, liquidHeight - 1, 256);
    liquid_geom.translate(0, -liquidHeight/2, 0);
    liquid_geom.lookAt(new T.Vector3(0, 1, 0));
    liquid = new T.Mesh(liquid_geom, new T.MeshStandardMaterial({
        metalness: 0,
        flatShading: true,
        color: COLOR.liquid,
        transparent: true,
        opacity: 0.65
    }));
    scene.add(liquid);

    var sides_geom = new T.BufferGeometry();
    var indices = [];
    for (var i = 0; i < 256; i++) {
        var a = i*2;
        var b = i*2 + 1;
        var c = i*2 + 3;
        var d = i*2 + 2;
        indices.push(a, c, b);
        indices.push(a, d, c);
    }
    sides_geom.setIndex(indices);
    sides = new T.Mesh(sides_geom, new T.MeshStandardMaterial({
        metalness: 0,
        roughness: 1,
        flatShading: true,
        vertexColors: T.VertexColors,
        side: T.DoubleSide
    }))
    scene.add(sides);

    // var border_geom = new T.CircleGeometry(radius + borderSize, 256);
    // border_geom.lookAt(new T.Vector3(0, 0, 1));
    // scene.add(new T.Mesh(border_geom, new T.MeshBasicMaterial({
    //     color: COLOR.border,
    //     side: T.DoubleSide
    // })));

    boids = [];
    // for (var i = 0; i < N_BOIDS; i++) {
    //     let boid = new Boid();
    //     scene.add(boid);
    //     boids.push(boid);
    // }
    flocks = [];
    // for (var i = 0; i < N_FLOCKS; i++) {
    //     flocks.push([]);
    //     flocks[i].color = COLOR[i == 0 ?  'red' : i == 1 ? 'green' : 'blue'];
    //     flocks[i].seed = boids[randi(N_BOIDS)];
    // }

    scene.add(new T.AmbientLight(0xd9b3ff));
    var directionalLight = new T.DirectionalLight(0xffffbf, 1.25);
    directionalLight.position.set(0.5, -0.5, 0.75);
    directionalLight.position.normalize();
    scene.add(directionalLight);
    var directionalLight = new T.DirectionalLight(0x3300ff, 0.75);
    directionalLight.position.set(-0.5, 0.5, 1.5);
    directionalLight.position.normalize();
    scene.add(directionalLight);

    window.addEventListener('blur', () => { pause(true) });
    window.addEventListener('focus', () => { pause(false) });
    window.addEventListener('resize', onWindowResize, false);
    window.document.addEventListener('keydown', (event) => {
        switch(event.key) {
            case ' ':
                generate();
                render();
                break;
            case 'p':
                pause(!paused);
                break;
            case 'w': dirs.up = 1; break;
            case 's': dirs.down = -1; break;
            case 'a': dirs.left = -1; break;
            case 'd': dirs.right = 1; break;
        }
    }, false);
    window.document.addEventListener('keyup', (event) => {
        switch(event.key) {
            case 'w': dirs.up = 0; break;
            case 's': dirs.down = 0; break;
            case 'a': dirs.left = 0; break;
            case 'd': dirs.right = 0; break;
        }
    }, false);

    generate();
}

function generate() {
    noise.seed(debug.seed || Math.random());

    // generate terrain
    highestElevation = 0;
    var halfSize = size / 2;
    var vertices = [];
    var colors = [];
    for (var i = 0; i <= tiles; i++) {
        var row = (i * tileSize) - halfSize;
        for (var j = 0; j <= tiles; j++) {
            var col = (j * tileSize) - halfSize;

            var pos = new T.Vector2(col, row);
            pos.clampLength(0, radius);
            let height = getHeight(pos.x, pos.y);
            if (height > highestElevation) highestElevation = height;
            vertices.push(pos.x, pos.y, height);
            colors.push(...COLOR.tops.clone().lerp(COLOR.cover, (height - liquidHeight) / (maxHeight - liquidHeight)).toArray());
        }
    }
    terrain.geometry.addAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    terrain.geometry.addAttribute('color', new T.Float32BufferAttribute(colors, 3));

    // generate sides
    var vertices = [];
    var colors = [];
    for (var i = 0; i <= 256; i++) {
        var ang = Math.PI/128 * i;
        var x = Math.cos(ang) * radius;
        var z = Math.sin(ang) * radius;

        vertices.push(x, z, 0);
        colors.push(...COLOR.bottom.toArray());

        vertices.push(x, z, getHeight(x, z));
        colors.push(...COLOR.ground.toArray());
    }
    sides.geometry.addAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    sides.geometry.addAttribute('color', new T.Float32BufferAttribute(colors, 3));

    // spawn boids
    boids.forEach(boid => {
        let [x, y] = sample(2, () => rands(radius), (x, y) => mag2(x, y) < Math.pow(radius, 2));
        boid.spawn(x, y, highestElevation + rand(maxHeight/4));
    });
    // assign to nearest flock
    flocks.forEach(flock => flock.length = 0);
    boids.forEach(boid => {
        let min_flock, min_dist2 = Infinity;
        for (let i = 0; i < N_FLOCKS; i++) {
            let flock = flocks[i];
            let dist2 = boid.position.distanceToSquared(flock.seed.position);
            if (dist2 < min_dist2) {
                min_dist2 = dist2;
                min_flock = flock
            }
        }
        min_flock.push(boid);
    });
}

function getHeight(x, y) {
    zoom = size/chunkSize;
    huge = noise.simplex2(x/zoom/4 - 10000, y/zoom/4 - 10000);
    large = noise.simplex2(x/zoom*2 + 10000, y/zoom*2 + 10000);
    medium = noise.simplex2(x/zoom*4 + 20000, y/zoom*4 + 20000)
    small = noise.simplex2(x/zoom*10 + 30000, y/zoom*10 + 30000);
    value = Math.pow(huge*0.3 + large*0.5 + medium*0.15 + small*0.05, 3);
    if (value > 0) {
        height = lerp(liquidHeight, maxHeight, Math.sqrt(value));
    } else {
        height = lerp(liquidHeight, minHeight, Math.sqrt(-value));
    }

    return height;
}

function update(dt) {
    controls.update();

    // randomly swap flocks
    if (randi(50) === 0) {
        let swap;
        while (!swap) {
            swap = randpop(flocks[randi(N_FLOCKS)]);
        }
        flocks[randi(N_FLOCKS)].push(swap);
    }

    // update each flock independently
    flocks.forEach(boids => {
        // calculate center of mass
        let CoM = new V3(0, 0, 0);
        boids.forEach(boid => {
            CoM.add(boid.position);
            boid.material.color.set(COLOR.white);
        });
        CoM.divideScalar(boids.length);

        boids.forEach(boid => {
            boid.update(dt, boids, CoM.clone());
            if (debug.showFlocks) boid.material.color.set(boids.color);
        });
    });

    // spin the world disc a bit
    var cam_mag = mag(camera.position.x, camera.position.y);
    var cam_ang = Math.atan2(camera.position.y, camera.position.x);
    camera.position.x = Math.cos(cam_ang + dt*0.00003) * cam_mag;
    camera.position.y = Math.sin(cam_ang + dt*0.00003) * cam_mag;
}

// animation loop: update & render scene
function animate() {
    if (paused) return;

    requestAnimationFrame(animate);
    var elapsedTime = performance.now() - prevTime;
    prevTime += elapsedTime;
    timer += elapsedTime * 0.0001;
    if (debug.fps) console.log(elapsedTime);

    update(elapsedTime);
    render();
}

// render scene to camera
function render() {
    var pos = scene.position.clone();
    pos.z += maxHeight/4;
    camera.lookAt(pos);
    renderer.render(scene, camera);
}

function onWindowResize() {
    if (ORTHO) {
        var aspect = window.innerWidth / window.innerHeight;
        camera.left   = - frustumSize / 2;
        camera.right  =   frustumSize / 2;
        camera.top    =   frustumSize / aspect / 2;
        camera.bottom = - frustumSize / aspect / 2;
    } else {
        camera.aspect = window.innerWidth / window.innerHeight;
    }
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth/IMG_SCALE, window.innerHeight/IMG_SCALE);
    render();
}

function pause(value) {
    paused = (value !== null) ? value : true;
    controls.enabled = !paused;
    if (!paused) {
        prevTime = performance.now();
        animate();
    }
}


init();
animate();