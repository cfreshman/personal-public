const T = THREE;
const V2 = T.Vector2;
const V3 = T.Vector3;
const v = (x, y, z=undefined) => z !== undefined ? new V3(x, y, z) : new V2(x, y)
const ORIGIN = V3(0, 0, 0);
const GF = new jsts.geom.GeometryFactory(new jsts.geom.PrecisionModel())
const splitCollection = collection => Array
    .from({ length: collection.getNumGeometries() })
    .map((_, i) => collection.getGeometryN(i))

const debug = {
    showFlocks: false,
    showFollow: false,
    showRaycast: false,
    seed: false,
    fps: false,
};

// TODO fix meaning of scaling vars
const SIZE = 1024,
    BORDER_SIZE = 16,
    SCALE = 3,
    MIN_HEIGHT = 1,
    MAX_HEIGHT = 32,
    CHUNK_SIZE = 16,
    // N_BOIDS = 0,
    N_BOIDS = 256,
    // N_TREES = 0,
    N_TREES = 1024,
    // N_TREES = 2048,
    N_FLOCKS = 3,
    ORTHO = true,
    IMG_SCALE = 1;
    // N_NEIGHBORS = 6,
    N_NEIGHBORS = 0,
    C_R_SPHERE = 8;
    // IMG_SCALE = 4;
    // IMG_SCALE = 2.5;

var size = SIZE,
    radius = SIZE / 2,
    borderSize = BORDER_SIZE,
    tiles = SIZE / Math.pow(2, SCALE),
    minHeight = MIN_HEIGHT * Math.pow(2, SCALE),
    maxHeight = MAX_HEIGHT * Math.pow(2, SCALE),
    highestElevation = 0,
    frustumSize = Math.max(window.innerWidth / window.innerHeight, window.innerHeight / window.innerWidth) * SIZE,
    chunkSize = CHUNK_SIZE / Math.pow(2, SCALE);
var tileSize = size / tiles;
var liquidHeight = (maxHeight - minHeight)*1/5 + minHeight;

const COLOR = {
    border: 0x383842,
    sky: 0xdff6f5,
    // ground: 0x5e3643,
    // ground: 0x57444a,
    // ground: 0x363130,
    ground: 0x636061,
    bottom: 0x472d3c,
    // liquid: 0x79B4B7,
    // liquid: 0x3978a8,
    liquid: 0x5996B0,
    deep: 0x394778,
    // cover: 0x71aa34,
    // cover: 0x637543,
    cover: 0x576341,
    tops: 0x397b44,
    // trunk: 0x7a444a,
    background: 0x050505,
    fog: 0xcccccc,
    red: 0xff0000,
    green: 0x00ff00,
    blue: 0x0000ff,
    white: 0xf0f0f0,
    black: 0x0f0f0f,
    // tree: 0x265c32,
    // tree: 0x41704c,
    // tree: 0x43704d,
    tree: 0x3e6146,
}
for (let color in COLOR) COLOR[color] = new T.Color(COLOR[color]);

var canvas = document.querySelector('#canvas');
var scene, objects, renderer, camera, controls, terrain, liquid, sides, raycaster, boids, trees;
var dirs = {up: 0, down: 0, left: 0, right: 0};
var offset = v(0, 0)
var timer, prevTime;
var paused = false;

var discs, center, neighbor_group, neighbors = [], path = [], _placemarks = {}, placemarks = (o=offset) => {
    const k = o.toArray().map(x => Math.floor(x / radius)).toString()
    // console.debug(k, _placemarks[k], _placemarks)
    return (_placemarks[k] = _placemarks[k] || [])
}

class Boid extends T.Object3D {
    constructor() {
        super();
        this.b_id = Boid.count++;
        this.up = new V3(0, 0, 1);
        this.speed = 0.032;

        // this.geometry = new T.ConeGeometry(tileSize*3/5, tileSize*3/2, 3);
        // this.geometry = new T.BoxGeometry(tileSize, tileSize/3, 1);
        this.geometry = new T.PlaneGeometry(tileSize, tileSize/3);
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

    spawn(x, y, z, radians) {
        this.position.copy(new V3(x, y, z));
        this.vel = new V3(Math.cos(radians), Math.sin(radians), 0).setLength(tileSize)
        this.lookAt(this.position.clone().add(this.vel));
    }

    update(dt, boids, CoM) {
        if (dt === 0) return;

        let acc = this.vel.clone().normalize().multiplyScalar(5 * dt);// new V3(0, 0, 0);

        // turn towards center of mass
        if (this.position.distanceTo(CoM) > tileSize) {
            let diff = CoM.clone().sub(this.position);
            acc.add(diff.setLength(.4 * dt));
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
                    acc.add(this.vel.clone().add(boid.vel.clone()).normalize().multiplyScalar(.75));
                    if (debug.showFollow && this.b_id === 0) {
                        boid.material.color.set(COLOR.green);
                    }
                } else {
                    // else avoid
                    acc.add(this.position.clone().sub(boid.position).normalize().multiplyScalar(.5));
                }
            } else if (debug.showFollow && this.b_id === 0) {
                boid.material.color.set(COLOR.red);
            }
        });

        // const expectedPosition = new V3().addVectors(this.position, new V3().addVectors(this.velocity, acc.multiplyScalar(dt)).multiplyScalar(dt))
        const expectedVelocity = this.vel.clone().add(acc.clone().setLength(dt)).setLength(this.speed * dt)
        const expectedPosition = new V3().addVectors(this.position, expectedVelocity)

        // avoid terrain if dangerously low
        // const height = Math.max(0, getHeight(this.position.x, this.position.y))
        // const lowerHeightBound = maxHeight
        if (expectedPosition.z <= Math.max(0, getHeight(this.position.x, this.position.y)) + tileSize * 2) {
            expectedPosition.z = Math.max(liquidHeight, getHeight(this.position.x, this.position.y)) + tileSize * 2
            const difference = new V3().addVectors(expectedPosition, this.position.clone().multiplyScalar(-1))
            // this.vel = new V3(0, 0, 0)
            acc = difference

            // acc = this.up.clone()
            this.line.material.color.set(COLOR.red);
            this.line.material.visible = true;
        // } else if (this.position.z < highestElevation) {
        //     // raycast to check for terrain
        //     // need to fix performance here
        //     raycaster.set(this.position, this.vel);
        //     var intersects = raycaster.intersectObjects([terrain, liquid]);
        //     if (intersects.length > 0) {
        //         // turn in direction of surface normal
        //         var intersect = intersects[0];
        //         var face = intersect.face;
        //         // acc.add(face.normal.clone().normalize().multiplyScalar(1000));
        //         // acc = face.normal.clone()
        //         // acc.add(this.up.multiplyScalar(100))
        //         acc = this.up.clone()
        //         this.line.material.color.set(COLOR.red);
        //     } else {
        //         this.line.material.color.set(COLOR.black);
        //     }
        //     // acc.add(new V3(0, 0, 1).multiplyScalar(25));
        //     this.line.material.visible = true;
        } else if (expectedPosition.z > maxHeight + highestElevation) {
            // turn.add(new V3(0, 0, -1).multiplyScalar(1));
            expectedPosition.z = maxHeight + highestElevation
            const difference = new V3().addVectors(expectedPosition, this.position.clone().multiplyScalar(-1))
            // this.vel = new V3(0, 0, 0)
            acc = difference

            this.line.material.color.set(COLOR.red);
            this.line.material.visible = true;
        } else {
            this.line.material.visible = false;
        }
        if (!debug.showRaycast) this.line.material.visible = false;

        // turn.add(new V3(0, 0, -1).multiplyScalar(.5));

        // turn and move
        this.vel.add(acc.setLength(dt));
        // this.vel.z /= 2;
        this.vel.setLength(this.speed * dt);
        this.lookAt(this.position.clone().add(this.vel));
        this.position.add(this.vel);

        // wrap
        if (V.ne(this.position.x, this.position.y).do() > Math.pow(radius*1.1, 2)) {
            this.position.x *= -1;
            this.position.y *= -1;
        }
    }
}
Boid.count = 0;

class Tree extends T.Object3D {
    constructor() {
        super();
        this.t_id = Tree.count++;
        this.up = new V3(0, 0, 1);

        // this.geometry = new T.ConeGeometry(tileSize, tileSize*(Math.random()*3+1), 4);
        this.geometry = new T.ConeGeometry(tileSize, tileSize*(Math.random()*3+1), 3);
        // this.material = new T.MeshBasicMaterial({ color: COLOR.tops, side: T.DoubleSide });
        this.material = new T.MeshStandardMaterial({
            // color: COLOR.tree,
            color: COLOR.tops.clone().lerp(COLOR.tree, .75 + .25*Math.random()),
            metalness: 0,
            roughness: 1,
            flatShading: true,
        });
        this.mesh = new T.Mesh(this.geometry, this.material);
        this.add(this.mesh);

        this.geometry.rotateX(Math.PI/2);
        // this.geometry.rotateZ(Math.PI);
        this.geometry.rotateZ(Math.random() * Math.PI/2);
        // this.geometry.rotateX(Math.random() * Math.PI/2);
        // this.geometry.rotateX(Math.PI/36);
    }

    spawn(x, y, z) {
        this.position.copy(new V3(x, y, z));
        this._position = this.position.clone()
        // this.lookAt(this.position.clone().add(this.up));
    }

    move() {
        // this.position.copy(this._position.add(offset))
    }
}
Tree.count = 0;

class Placemark extends T.Object3D {
    constructor(position, angle, scale=1, absolute_offset=offset) {
        super()
        this.angle = angle
        this.offset = absolute_offset
        position.add(v(...absolute_offset.clone().sub(offset).toArray(), 0))

        const _placemark = new T.Mesh(
            new T.CylinderGeometry(tileSize / 8, tileSize / 4, tileSize * 2, 4, 2),
            new T.MeshBasicMaterial({
                color: 0xffffff,
            }))
        _placemark.translateOnAxis(v(0, 0, tileSize), 1)
        _placemark.rotateOnAxis(v(1, 0, 0), Math.PI / 2)
        _placemark.rotateOnAxis(v(0, 1, 0), angle)
        // place with flat side facing camera, looks bad though:
        // _placemark.rotateOnAxis(
        //     v(0, 1, 0),
        //     Math.atan2(camera.position.y, camera.position.x) + Math.PI/4)

        this.add(_placemark)
        this.translateOnAxis(position, 1)
        this.scale.multiplyScalar(scale)
        this.position.z = Math.max(1, this.position.z - tileSize * scale)
        placemarks(this.offset).push(this)
    }
}

function init() {
    aspect = window.innerWidth / window.innerHeight;
    prevTime = performance.now();
    timer = 0;

    scene = new T.Scene();
    // scene.translateZ(-size/8)
    scene.background = COLOR.background;
    scene.fog = new T.FogExp2(COLOR.fog, 0.00025);
    
    objects = new T.Group()
    scene.add(objects)

    renderer = new T.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth/IMG_SCALE, window.innerHeight/IMG_SCALE);
    document.body.appendChild(renderer.domElement);

    // frustumSize *= aspect;
    if (ORTHO) {
        camera = new T.OrthographicCamera(-frustumSize/2, frustumSize/2, frustumSize/aspect/2, -frustumSize/aspect/2, -10000, 10000)
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

    camera.zoom = Math.max(window.innerWidth / window.innerHeight, window.innerHeight / window.innerWidth) * 2 // - .05
    camera.updateProjectionMatrix()

    var axesHelper = new T.AxesHelper(size/2);
    axesHelper.geometry.translate(0, 0, maxHeight/2);
    // scene.add(axesHelper);

    raycaster = new T.Raycaster(ORIGIN, ORIGIN, 0, tileSize*5);

    discs = new T.Group()
    objects.add(discs)

    center = new T.Group()
    {
        var terrain_geom = new T.BufferGeometry();
        var indices = [];
        for (var i = 0; i < tiles; i++) {
            for (var j = 0; j < tiles; j++) {
                var a = i * (tiles + 1) + (j + 1);
                var b = i * (tiles + 1) + j;
                var c = (i + 1) * (tiles + 1) + j;
                var d = (i + 1) * (tiles + 1) + (j + 1);
                if ((i + j) % 2) {
                    indices.push(b, a, d);
                    indices.push(b, d, c);
                } else {
                    indices.push(a, c, b);
                    indices.push(a, d, c);
                }
            }
        }
        terrain_geom.setIndex(indices);
        terrain = new T.Mesh(terrain_geom, new T.MeshStandardMaterial({
            metalness: 0,
            roughness: 1,
            flatShading: true,
            vertexColors: T.VertexColors
        }));
        center.add(terrain);

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
        center.add(liquid);

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
            metalness: .3,
            roughness: 1,
            flatShading: true,
            vertexColors: T.VertexColors,
            side: T.DoubleSide
        }))
        center.add(sides);

        var bottom_geom = new T.CircleGeometry(radius, 256);
        bottom_geom.lookAt(new T.Vector3(0, 0, 1));
        center.add(new T.Mesh(bottom_geom, new T.MeshBasicMaterial({
            color: COLOR.bottom,
            side: T.DoubleSide
        })));

        trees = [];
        for (var i = 0; i < N_TREES; i++) {
            let tree = new Tree();
            // center.add(tree);
            trees.push(tree);
        }
    }
    discs.add(center)

    boids = [];
    for (var i = 0; i < N_BOIDS; i++) {
        let boid = new Boid();
        // objects.add(boid);
        boids.push(boid);
    }
    flocks = [];
    for (var i = 0; boids.length && i < N_FLOCKS; i++) {
        flocks.push([]);
        flocks[i].color = COLOR[i == 0 ?  'red' : i == 1 ? 'green' : 'blue'];
        flocks[i].seed = boids[rand.i(N_BOIDS)];
    }

    neighbors = []
    neighbor_group = new T.Group()
    for (var i = 0; i < N_NEIGHBORS; i++) {
        let angle = Math.PI * 2 / N_NEIGHBORS * i
        let m = 0, r = radius
        for (var j = 0; j < 3; j++) {
            r /= 2, m += r * 4, angle += Math.PI / N_NEIGHBORS
            const x = m * Math.cos(angle)
            const y = m * Math.sin(angle)
            const group = new T.Group()
            // group.translateOnAxis(new V3(x, y, 0), 1)
            // group.lookAt(x * 1.1, y * 1.1, m)

            // place on surface of sphere of r = radius * 16
            group.translateOnAxis(new V3(0, 0, radius * C_R_SPHERE), 1)
            group.lookAt(-x, -y, radius * 2 * C_R_SPHERE)
            group.translateOnAxis(new V3(0, 0, -radius * C_R_SPHERE), 1)

            // const neighbor_geom = new T.CylinderGeometry(r, r, tileSize, 128 / Math.pow(2, j));
            // neighbor_geom.translate(0, -tileSize/2 - 1, 0);
            // neighbor_geom.lookAt(new V3(0, 1, 0))
            const neighbor_geom = new T.CircleGeometry(radius, 128 / Math.pow(2, j));
            neighbor_geom.translate(0, 0, tileSize);
            const neighbor = new T.Mesh(neighbor_geom, new T.MeshStandardMaterial({
                metalness: 0,
                flatShading: true,
                color: COLOR.liquid,
                transparent: true,
                opacity: 1 - .1667 * (j + 1),
            }));
            group.add(neighbor);

            const relative_offset = v(Math.cos(angle), Math.sin(angle)).multiplyScalar((j + 2) * radius)
            neighbors.push({
                object: neighbor,
                relative_offset,
                absolute_offset: relative_offset.clone(),
                group,
                opacity: neighbor.material.opacity,
                rotation: angle,
                generate: () => {
                    // let from_neighbor_group = neighbor_group.worldToLocal(group.position.clone())
                    // console.debug(placemarks(), offset, neighbor_offset)
                    // placemarks()?.forEach(x => center.remove(x))
                    // offset.add(from_neighbor_group.projectOnPlane(v(0, 0, 1))).round()
                    offset.add(relative_offset).round()
                    console.debug('NEW OFFSET', offset.toArray().toString(), relative_offset.toArray().toString())
                    neighbor_group.rotateZ(Math.PI)
                    // neighbors.map(x => x.offset).map(x => {
                    //     x.set(-x.x, -x.y)
                    // })
                    neighbors.forEach(x => x.relative_offset.rotateAround(v(0, 0), Math.PI))
                    neighbors.forEach(x => x.absolute_offset.copy(offset.clone().add(x.relative_offset).round()))
                    generate(true)
                    // placemarks()?.forEach(x => center.add(x))
                    if (neighbor.material.color.equals(new T.Color(0x222222))) {
                        path = path.filter(x => x.object !== neighbor)
                    } else {
                        path.push({
                            neighbor,
                        })
                    }
                }
            })

            const bottom_geom = new T.CircleGeometry(radius, 128 / Math.pow(2, j));
            group.add(new T.Mesh(bottom_geom, new T.MeshBasicMaterial({
                color: COLOR.bottom,
                // side: T.DoubleSide,
                transparent: true,
                opacity: .67,
            })));

            neighbor_group.add(group)
        }
    }
    discs.add(neighbor_group)

    scene.add(new T.AmbientLight(0xd9b3ff));
    var directionalLight = new T.DirectionalLight(0xffffbf, 1.25);
    directionalLight.position.set(0.5, -0.5, 0.75);
    directionalLight.position.normalize();
    scene.add(directionalLight);
    var directionalLight = new T.DirectionalLight(0x3300ff, 0.75);
    directionalLight.position.set(-0.5, 0.5, 1.5);
    directionalLight.position.normalize();
    scene.add(directionalLight);

    const handle_pause = () => { pause(true) };
    window.addEventListener('blur', handle_pause);
    window['disable-blur'] = () => window.removeEventListener('blur', handle_pause)
    if (window.matchMedia('(display-mode: standalone)').matches) window['disable-blur']()
    
    window.addEventListener('focus', () => { pause(false) });
    window.addEventListener('resize', onWindowResize, false);
    window.document.addEventListener('keydown', (event) => {
        switch(event.key) {
            case ' ':
                generate().then(render)
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

    const info_controls = document.querySelector('#info #controls')
    if (info_controls) {
        // info_controls.style.display = 'none'
        document.querySelector('#show-controls')?.addEventListener('click', e => {
            info_controls.style.display = ''
            document.querySelector('#show-controls').style.display = 'none'
        })
        document.querySelector('#hide-controls')?.addEventListener('click', e => {
            info_controls.style.display = 'none'
            document.querySelector('#show-controls').style.display = ''
        })
        info_controls.querySelector('#reload')?.addEventListener('click', e => {
            // const style = e.target.parentNode.style
            // const _style_display = style.display
            // style.display = 'none'
            defer(async () => {
                // async to allow UI to update
                await generate()
                render()
            })
        })
    }

    generate(!!localStorage.getItem('seed'))
}

let boids_gen = false
let _seed
debug.seed = debug.seed || (x => x && Number(x))(localStorage.getItem('seed'))
async function generate(move=false) {
    Q('#reload').textContent = 'generating'
    await sleep(10)

    Object.values(_placemarks).flatMap(x => x).forEach(x => center.remove(x))
    _placemarks = {}

    if (!move) {
        _seed = debug.seed || Math.random()
        offset = v(0, 0)
        path = []
        localStorage.removeItem('placemarks')
        neighbors.map(x => x.object.material.color.set(COLOR.liquid))
    } else {
        console.debug('GENERATE AT OFFSET', offset.toArray().toString())
    }
    console.debug('SEED', _seed)
    localStorage.setItem('seed', _seed)
    noise.seed(_seed)

    // generate terrain
    // highestElevation = 0;
    // var halfSize = size * .5;
    // var vertices = [];
    // var colors = [];
    // for (var i = 0; i <= tiles; i++) {
    //     var row = (i * tileSize) - halfSize;
    //     for (var j = 0; j <= tiles; j++) {
    //         var col = (j * tileSize) - halfSize;

    //         var pos = new T.Vector2(col, row);
    //         pos.clampLength(0, radius);
    //         let height = getHeight(pos.x, pos.y);
    //         if (height > highestElevation) highestElevation = height;
    //         vertices.push(pos.x, pos.y, height);
    //         // colors.push(...COLOR.tops.clone().lerp(COLOR.cover, (height - liquidHeight) / (maxHeight - liquidHeight)).toArray());
    //     }
    // }
    // for (var i = 0; i <= tiles; i++) {
    //     var row = (i * tileSize) - halfSize;
    //     for (var j = 0; j <= tiles; j++) {
    //         var col = (j * tileSize) - halfSize;

    //         var pos = new T.Vector2(col, row);
    //         pos.clampLength(0, radius);
    //         let height = getHeight(pos.x, pos.y);
    //         colors.push(...COLOR.tops.clone().lerp(COLOR.cover, (height - liquidHeight) / (highestElevation - liquidHeight)).toArray());
    //     }
    // }
    // terrain.geometry.addAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    // terrain.geometry.addAttribute('color', new T.Float32BufferAttribute(colors, 3));
    // generate terrain
    {
        const jsts_points = GF.createGeometryCollection([].concat(
            range(Math.ceil(Math.pow(radius * 2 / tileSize, 2))).map(() => V.ne(rand.generate(2, () => rand.s(radius), (x, y) => V.ne(x, y).do() < Math.pow(radius, 2)))),
            range(360).map(i => V.p(i * Math.PI / 180, radius)),
        ).map((v) => GF.createPoint(new jsts.geom.Coordinate(v.x, v.y))))
        const dtb = new jsts.triangulate.DelaunayTriangulationBuilder()
        dtb.setTolerance(0.01)
        dtb.setSites(jsts_points)
        dtb.create()
        const triangles = splitCollection(dtb.getTriangles(GF)).map(raw_triangle => raw_triangle.getCoordinates().slice(0, -1).map(x => V.ne(x.x, x.y)))
        const indices = []
        const vertices = []
        const colors = []
        highestElevation = 0
        triangles.map(points => {
            points.map(p => {
                indices.push(indices.length)
                const z = getHeight(p.x, p.y)
                if (z > highestElevation) highestElevation = z
                vertices.push(p.x, p.y, z)
            })
        })
        triangles.map(points => {
            points.map(p => {
                const z = getHeight(p.x, p.y)
                colors.push(...COLOR.tops.clone().lerp(COLOR.cover, (z - liquidHeight) / (highestElevation - liquidHeight)).toArray())
            })
        })
        terrain.geometry.setIndex(indices)
        terrain.geometry.addAttribute('position', new T.Float32BufferAttribute(vertices, 3))
        terrain.geometry.addAttribute('color', new T.Float32BufferAttribute(colors, 3))
    }

    // generate sides
    var vertices = [];
    var colors = [];
    const SIDES_N = 256
    for (var i = 0; i <= SIDES_N; i++) {
        var ang = Math.PI*2/SIDES_N * i;
        var x = Math.cos(ang) * radius;
        var z = Math.sin(ang) * radius;

        vertices.push(x, z, 0);
        colors.push(...COLOR.bottom.toArray());

        vertices.push(x, z, getHeight(x, z));
        colors.push(...COLOR.ground.toArray());
        // colors.push(...COLOR.ground.toArray().map(x => x * rand.s(1, .1)));
    }
    sides.geometry.addAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    sides.geometry.addAttribute('color', new T.Float32BufferAttribute(colors, 3));

    // spawn boids
    if (!boids_gen) {
        const base_radians = rand.s(Math.PI)
        boids.forEach(boid => {
            let [x, y] = rand.generate(2, () => rand.s(radius), (x, y) => V.ne(x, y).do() < Math.pow(radius, 2));
            boid.spawn(x, y, Math.max(liquidHeight, getHeight(x, y)) * 1.25, rand.s(Math.PI/4) + base_radians);
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
            boid.position.copy(min_flock.seed.position) // set all boids to the seed's position to start
            boid.position.add(new V3(rand.s(radius / 20), rand.s(radius / 20), 0))
        });
        boids_gen = true;
    } else {
        boids.forEach(boid => {
            const pos = boid.position
            boid.position.z = Math.max(pos.z, Math.max(liquidHeight, getHeight(pos.x, pos.y)) * 1.25)
        });
    }
    boids.forEach(x => objects.add(x))

    // spawn trees
    // move || 
    trees.forEach(tree => {
        let x, y, height, badSpawn
        do {
            [x, y] = rand.generate(2, () => rand.s(radius - 2*tileSize), (x, y) => V.ne(x, y).do() < Math.pow(radius - 2*tileSize, 2));
            height = getHeight(x, y)
            badSpawn = height < liquidHeight
                || height > (highestElevation - liquidHeight)/2 + liquidHeight
                || getCover(x, y) < Math.random()
            if (!badSpawn && height > liquidHeight * 1.2) {
                // raycaster.set(new V3(x, y, height), new V3(0, 0, -1));
                // const intersects = raycaster.intersectObjects([terrain]);
                // if (intersects.length > 0) {
                //     var intersect = intersects[0];
                //     var normal = intersect.face.normal;
                //     // out if face is too shear
                //     console.log(normal.z)
                //     badSpawn = normal.z > .7
                // }
                const offs = [[1,0],[-1,0],[0,1],[0,-1]].map(off => height - getHeight(x + off[0], y + off[1]))
                const ups = offs.filter(x => x >= 0)
                const downs = offs.filter(x => x < 0)
                if (ups.length === 4 || downs.length === 4) {
                    badSpawn = true
                } else {
                    const maxOff = Math.max(...offs.map(off => Math.abs(off)))
                    // console.log(maxOff)
                    badSpawn = maxOff > .5
                }
            }
        } while (badSpawn)
        tree.spawn(x, y, height);
    });
    trees.forEach(x => center.add(x))
    // move && trees.forEach(tree => tree.move())

    // spawn all placemarks
    ;(x => x && JSON.parse(x).map(({ position, angle, scale, offset:absolute_offset }) => {
        // console.debug(angle, scale, offset, absolute_offset, position,
        //     v(...position).add(v(...absolute_offset, 0)).sub(v(...offset.toArray(), 0)))

        const placemark = new Placemark(v(...position), angle, scale, v(...absolute_offset))
        // ignore non-center for now, TODO rotate & scale others
        // console.debug(absolute_offset, offset, v(...absolute_offset).distanceTo(offset), radius)
        if (v(...absolute_offset).distanceTo(offset) < radius) {
            center.add(placemark)
        }
    }))(localStorage.getItem('placemarks'))

    Q('#reload').textContent = 'generate'
}

function getHeight(x, y) {
    x += offset.x
    y += offset.y
    zoom = size/chunkSize;
    huge = noise.simplex2(x/zoom/4 - 10000, y/zoom/4 - 10000);
    large = noise.simplex2(x/zoom*2 + 10000, y/zoom*2 + 10000);
    medium = noise.simplex2(x/zoom*4 + 20000, y/zoom*4 + 20000)
    small = noise.simplex2(x/zoom*10 + 30000, y/zoom*10 + 30000);
    value = Math.pow(huge*0.3 + large*0.5 + medium*0.15 + small*0.05, 3);
    if (value > 0) {
        // scale height down at sides
        // value = value * (1 - Math.pow(new V2(x, y).mag * 2 / size, 2))

        height = maths.lerp(liquidHeight, maxHeight, Math.sqrt(value));
    } else {
        height = maths.lerp(liquidHeight, minHeight, Math.sqrt(-value));
    }

    return height;
}

function getCover(x, y) {
    zoom = size/chunkSize;
    huge = noise.simplex2(x/zoom/4 - 10000 + 1e10, y/zoom/4 - 10000);
    large = noise.simplex2(x/zoom*2 + 10000 + 1e10, y/zoom*2 + 10000);
    medium = noise.simplex2(x/zoom*4 + 20000 + 1e10, y/zoom*4 + 20000)
    small = noise.simplex2(x/zoom*10 + 30000 + 1e10, y/zoom*10 + 30000);
    value = Math.pow(huge*0.3 + large*0.5 + medium*0.15 + small*0.05, 3);

    if (value > 0) {
        cover = maths.lerp(0, 1, Math.sqrt(value));
    } else {
        cover = 0
    }

    return cover;
}

function update(dt) {
    controls.update();

    // randomly swap flocks
    if (rand.i(50) === 0) {
        let swap;
        while (!swap) {
            swap = rand.pick(flocks[rand.i(N_FLOCKS)]);
        }
        flocks[rand.i(N_FLOCKS)].push(swap);
    }

    // update each flock independently
    flocks.forEach((boids, i) => {
        // calculate center of mass
        let CoM = new V3(0, 0, 0);
        boids.forEach(boid => {
            CoM.add(boid.position);
            boid.material.color.set(COLOR.white);
        });
        CoM.divideScalar(boids.length);
        // CoM.z = getHeight(CoM.x, CoM.y) + 2 * tileSize
        // CoM.z = getHeight(CoM.x, CoM.y) + 2 * tileSize
        CoM.z = .3 * CoM.z + .7 * (getHeight(CoM.x, CoM.y) + 2 * tileSize)
        // CoM.z = .7 * CoM.z + .3 * (Math.max(liquidHeight, getHeight(CoM.x, CoM.y)) * 1.25)

        // update n=5 at a time
        // boids.forEach((boid, j) => {
        //     if (j > 5) return
        //     boid.update(dt, boids, CoM.clone());
        //     if (debug.showFlocks) boid.material.color.set(boids.color);
        // });
        // flocks[i] = boids.slice(10).concat(boids.slice(0, 10))
        boids.forEach(boid => {
            boid.update(dt, boids, CoM.clone());
            if (debug.showFlocks) boid.material.color.set(boids.color);
        });
    });

    // spin the world disc a bit
    if (!path.length && !pointer_down) {
        var cam_mag = V.ne(camera.position.x, camera.position.y).ma();
        var cam_ang = Math.atan2(camera.position.y, camera.position.x) + dt*0.00003;
        camera.position.x = Math.cos(cam_ang) * cam_mag;
        camera.position.y = Math.sin(cam_ang) * cam_mag;
    }

    // scale discs based on distance from 0,0
    [discs, neighbor_group].forEach(group => {
        group.children.forEach(x => {
            if (x === neighbor_group) return
            // x.scale.set(v(1, 1, 1).multiplyScalar(radius / (x.position.distanceTo(v(0, 0, 0) || radius))))
            // x.scale.set(v(1, 1, 1).multiplyScalar(radius / (x.position.distanceTo(v(0, 0, 0) || radius))))
            // x.scale.copy(
            //     v(1, 1, 1)
            //     .multiplyScalar(Math.pow(
            //         radius / Math.max(x.position.distanceTo(v(0, 0, 0), radius)),
            //         1.5)))

            // map from sphere to flat distance
            const a = v(0, 0, radius * C_R_SPHERE)
            const b = a.clone().sub(neighbor_group.localToWorld(x.position.clone()))
            const angle = a.angleTo(b)
            const flat = angle * radius * C_R_SPHERE
            // console.debug(flat)

            // scale based on flat distance
            // r /= 2, m += r * 4
            // m += r * 2, r /= 2
            // dr(x) = radius/2 * 2 ^ -x
            // r(x) = radius/2 * 1/ln(-2) * -2^-x
            // dm(x) = 2 * r(x)
            // m(x) = r(x)^2
            // r(x) = lg(m(x))
            // x.scale.copy(v(1, 1, 1).multiplyScalar(1 / Math.pow((1 + Math.log2(Math.max(flat + radius) / radius)), 1.25)))
            x.scale.copy(v(1, 1, 1).multiplyScalar(1 / Math.pow((flat / 24 + radius) / radius, 12)))

            // console.debug(angle, flat)

            // x.scale.copy(
            //     v(1, 1, 1)
            //     .multiplyScalar(Math.pow(
            //         radius / Math.max(
            //             neighbor_group.localToWorld(x.position.clone()).distanceTo(v(0, 0, 0)),
            //             radius),
            //         2)))
        })
    })

    // move pos according to keys
    // const move = [0, 0]
    // if (dirs.up) move[1] += 1
    // if (dirs.down) move[1] -= 1
    // if (dirs.left) move[0] -= 1
    // if (dirs.right) move[0] += 1
    // offset.x += Math.cos(cam_ang) * SCALE;
    // offset.y += Math.sin(cam_ang) * SCALE;
    // if (move.some(x => x)) generate(true)
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
    togglePauseHint(paused)
}

let pointer_target
const parseEventPoint = (e, pointer=v(0, 0)) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
	pointer.y = - (e.clientY / window.innerHeight) * 2 + 1
}
const event_pointer = v(0, 0)
let pointer_down = undefined
const pointer_raycast = new T.Raycaster(ORIGIN, ORIGIN, 0, 1e6)
const doPointerRaycast = (e, pointerdown=undefined, target=false) => {
    if (e) parseEventPoint(e, event_pointer)
    pointer_raycast.setFromCamera(event_pointer, camera)
    const intersects = pointer_raycast.intersectObjects(neighbors.map(x => x.object))
    neighbors.forEach(x => {
        x.object.material.opacity = placemarks(x.absolute_offset)?.length ? Math.min(.95, 1.25 * x.opacity) : x.opacity
        x.object.material.color.set(
            path.slice(-1)[0]?.object === x.object ? 0x222222 : 
            placemarks(x.absolute_offset)?.length ? 0xffffff : 
            path.map(x => x.object).includes(x.object) ? 0x222222 :
            COLOR.liquid)
    })
    document.body.style.cursor = intersects.length ? 'pointer' : ''
    if (intersects.length > 0) {
        for (let i = 0; i < intersects.length; i++) {
            const x = intersects[i].object
            const neighbor = neighbors.find(y => y.object === x)
            if (target?.object === x) {
                // console.debug(neighbor.group.position.clone().toArray().toString())
                // console.debug(neighbor.offset)
                let i = 0
                const animateRotation = () => {
                    if (i > 5) {
                        // setTimeout(() => {
                            // discs.translateOnAxis(v(...neighbor.offset.toArray(), 0), -1)
                            discs.translateOnAxis(v(0, 0, 1), radius * C_R_SPHERE)
                            discs.lookAt(v(0, 0, radius * 2 * C_R_SPHERE))
                            discs.translateOnAxis(v(0, 0, 1), -radius * C_R_SPHERE)
                            neighbor.generate()
                            render()
                            doPointerRaycast(e)
                        // }, 250)
                    } else {
                        // const lookAt = v(0, 0, 0).lerp(v(...neighbor.offset.toArray(), 0), .1)
                        // discs.translateOnAxis(lookAt, 1)
                        const lookAt = new T.Object3D()
                        lookAt.position.copy(neighbor_group.localToWorld(neighbor.group.position.clone()))
                        lookAt.translateOnAxis(v(0, 0, 1), radius * 2 * C_R_SPHERE)
                        discs.translateOnAxis(v(0, 0, 1), radius * C_R_SPHERE)
                        discs.lookAt(v(0, 0, radius * 2 * C_R_SPHERE).lerp(lookAt.position, .05 * i))
                        discs.translateOnAxis(v(0, 0, 1), -radius * C_R_SPHERE)
                        
                        i += 1
                        requestAnimationFrame(animateRotation)
                    }
                }
                animateRotation()
            } else {
                x.material.color.set(0xffffff)
                x.material.opacity = 1
                // console.debug(neighbors.find(y => y.object === x).offset.toArray().toString())
            }
        }
    } else if (pointerdown) {
        const terrain_intersect = pointer_raycast.intersectObjects([terrain])[0]
        if (terrain_intersect) {
            const down_pointer = event_pointer.clone()
            pointer_down = async () => {
                if (event_pointer.equals(down_pointer)) {
                    const placemark = new Placemark(terrain_intersect.point, Math.PI * 2 * Math.random())
                    center.add(placemark)

                    await Promise.resolve()
                    pointer_down = true
                    await new Promise(x => setTimeout(x, 100))
                    while (pointer_down) {
                        placemark.scale.multiplyScalar(1.1)
                        placemark.position.z = Math.max(1, placemark.position.z - tileSize * placemark.scale.z * .09)

                        // break if placemark extends outside disc
                        let maxDistanceFromCenter = 0
                        placemark.traverse(object => {
                            const vertices = object.geometry?.vertices
                            if (vertices) {
                                for (let i = 0; i < vertices.length; i++) {
                                    const absolute = placemark.localToWorld(vertices[i].clone())
                                    const xy = v(absolute.x, absolute.y)
                                    maxDistanceFromCenter = Math.max(xy.length(), maxDistanceFromCenter)
                                    if (maxDistanceFromCenter > radius) {
                                        console.debug(maxDistanceFromCenter, radius, xy, vertices[i])
                                        pointer_down = false
                                        return
                                    }
                                }
                            }
                        })

                        await new Promise(x => setTimeout(x, 10))
                    }

                    localStorage.setItem(
                        'placemarks',
                        JSON.stringify((x => 
                            (x ? JSON.parse(x) : []).concat([{
                                position: placemark.position.toArray(),
                                angle: placemark.angle,
                                scale: placemark.scale.toArray()[0],
                                offset: placemark.offset.toArray(),
                            }])
                        )(localStorage.getItem('placemarks'))))
                }
            }
            setTimeout(() => doPointerRaycast(undefined, false), 250)
        }
    } else if (pointer_down) {
        pointer_down !== true && pointer_down()
        pointer_down = undefined
    }
    if (!pointerdown) pointer_down = undefined
    if (pointerdown === undefined) {
        event_pointer.set(1e6, 1e6)
    }
    return intersects[0]
}
window.addEventListener('pointermove', e => doPointerRaycast(e))
window.addEventListener('pointerdown', e => pointer_target = doPointerRaycast(e, true))
window.addEventListener('pointerup', e => doPointerRaycast(e, false, pointer_target))

init();
animate();
