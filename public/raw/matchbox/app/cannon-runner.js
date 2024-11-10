/* global CANNON, THREE=T, Detector */

CANNON = CANNON || {};
CANNON.Runner = function(options={}) {
    const that = this

    if (!Detector.webgl) {
        Detector.addGetWebGLMessage()
    }

    // global settings
    const settings = this.settings = {
        step_freq: 60,
        paused: false,
        particle_size: 0.1,
        max_substeps: 3,
    }
    // extend with options
    for (var key in options) {
        if (key in settings) {
            settings[key] = options[key]
        }
    }
    if (settings.step_freq % 60 !== 0){
        throw new Error("step_freq must be a multiple of 60.");
    }

    const bodies = this.bodies = []
    const visuals = this.visuals = []
    const scenes = {}

    this.default_material = new THREE.MeshLambertMaterial({ color:0xdddddd })

    // Create physics world
    const world = this.world = new CANNON.World()
    world.broadphase = new CANNON.NaiveBroadphase()

    const SHADOW_MAP_SIZE = 1024
    const ASPECT = 12 / 9
    let scene, camera, renderer

    const init = () => {
        // SCENE
        scene = that.scene = new THREE.Scene()

        // CAMERA
        camera = new THREE.PerspectiveCamera(24, ASPECT, 200, 1000)
        camera.up.set(0, 0, 1)
        camera.position.set(0, 250, 325)
        camera.lookAt(new THREE.Vector3(0, 0, -15))
        scene.add(camera)

        // LIGHTS
        scene.add(new THREE.AmbientLight(0x333333))
        {
            const light = new THREE.SpotLight(0xfffeff)
            light.position.set(200, 100, 200)
            light.target.position.set(0, 0, 0)
            light.castShadow = true
            light.shadow.mapSize.width = light.shadow.mapSize.height = SHADOW_MAP_SIZE
            light.shadowCameraNear = 150
            light.shadowCameraFar = 1000 // camera.far
            light.shadowCameraFov = 90
            scene.add(light)
        }

        // RENDERER
        renderer = new THREE.WebGLRenderer({ clearColor: 0x000000, clearAlpha: 1, antialias: false, canvas:Q('#matchbox-canvas') })
        renderer.shadowMapEnabled = true
        renderer.shadowMapType = THREE.PCFSoftShadowMap
        window.addEventListener('resize', do_resize)
        do_resize()
    }

    const update_visuals = () => {
        // read body positions into visuals
        for (var i = 0; i < bodies.length; i++) {
            const b = bodies[i], visual = visuals[i]
            visual.position.copy(b.position)
            if (b.quaternion) {
                visual.quaternion.copy(b.quaternion)
            }
        }
    }

    let last_t = 0
    const updatePhysics = () => {
        const time_step = 1 / settings.step_freq
        var now = Date.now() / 1000
        if(!last_t){
            // no elapsed, take simple step
            world.step(time_step)
        } else {
            const elapsed_t = now - last_t
            world.step(time_step, elapsed_t, settings.max_substeps)
        }
        last_t = now
    }

    const render = () => {
        renderer.clear()
        renderer.render(scene, camera)
    }

    const animate = () => {
        requestAnimationFrame(animate)
        if (!settings.paused) {
            update_visuals()
            updatePhysics()
        }
        render()
    }

    const do_resize = (e) => {
        SCREEN_WIDTH = window.innerWidth
        SCREEN_HEIGHT = window.innerHeight
        const renderWidth = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT * ASPECT)
        const renderHeight = renderWidth / ASPECT
        
        renderer.setSize(renderWidth, renderHeight)

        camera.aspect = renderWidth / renderHeight
        camera.updateProjectionMatrix()
    }

    const add = (name, f_init) => scenes[name] = f_init

    const change = (name) => {
        that.dispatchEvent({ type: 'destroy' })
        settings.paused = false
        start(name)
    }

    const start = (name=keys(scenes)[0]) => {
        // remove bodies and visuals
        while (bodies.length) world.remove(bodies.pop())
        while (visuals.length) scene.remove(visuals.pop())
        while (world.constraints.length) world.removeConstraint(world.constraints[0])

        // run user-defined function
        scenes[name]()
    }

    init()
    animate()

    this.add = add
    this.start = start
    this.change = change
}
CANNON.Runner.prototype = new CANNON.EventTarget()
CANNON.Runner.constructor = CANNON.Runner

// todo simplify this
CANNON.Runner.prototype.add_visual = function(body, material=undefined) {
    let mesh
    if (body instanceof CANNON.Body){
        mesh = this.shape2mesh(body, material)
    }
    if (mesh) {
        this.bodies.push(body)
        this.visuals.push(mesh)
        body.visualref = mesh
        body.visualref.visual_id = this.bodies.length - 1
        this.scene.add(mesh)
    }
}
CANNON.Runner.prototype.remove_visual = function(body) {
    if (body.visualref) {
        const old_bodies = []
        const old_visuals = []
        const n = this.bodies.length

        for (let i = 0; i < n; i++) {
            old_bodies.unshift(this.bodies.pop())
            old_visuals.unshift(this.visuals.pop())
        }

        const id = body.visualref.visual_id
        for (let j = 0; j < old_bodies.length; j++) {
            if (j !== id) {
                const i = j > id ? j - 1 : j
                this.bodies[i] = old_bodies[j]
                this.visuals[i] = old_visuals[j]
                this.bodies[i].visualref = old_bodies[j].visualref
                this.bodies[i].visualref.visual_id = i
            }
        }

        body.visualref.visual_id = null
        this.scene.remove(body.visualref)
        body.visualref = null
    }
}

CANNON.Runner.prototype.reset = function() {
    while (this.bodies.length) this.removeVisual(this.bodies[0])
}

// todo clean
CANNON.Runner.prototype.shape2mesh = function(body, material=this.default_material) {
    const obj = new THREE.Object3D()

    for (var l = 0; l < body.shapes.length; l++) {
        var shape = body.shapes[l];

        var mesh;

        switch(shape.type){

        case CANNON.Shape.types.SPHERE:
            var sphere_geometry = new THREE.SphereGeometry( shape.radius, 8, 8 );
            mesh = new THREE.Mesh( sphere_geometry, material );
            break;

        case CANNON.Shape.types.CYLINDER:
            var cylinder_geometry = new THREE.CylinderGeometry( shape.radiusTop, shape.radiusBottom, shape.height, shape.numSegments);
            mesh = new THREE.Mesh( cylinder_geometry, material );
            break;

        case CANNON.Shape.types.PARTICLE:
            mesh = new THREE.Mesh( this.particleGeo, material );
            var s = this.settings;
            mesh.scale.set(s.particle_size,s.particle_size,s.particle_size);
            break;

        case CANNON.Shape.types.PLANE:
            var geometry = new THREE.PlaneGeometry(10, 10, 4, 4);
            mesh = new THREE.Object3D();
            var submesh = new THREE.Object3D();
            var ground = new THREE.Mesh( geometry, material );
            ground.scale.set(100, 100, 100);
            submesh.add(ground);

            ground.castShadow = true;
            ground.receiveShadow = true;

            mesh.add(submesh);
            break;

        case CANNON.Shape.types.BOX:
            var box_geometry = new THREE.BoxGeometry(  shape.halfExtents.x*2,
                                                        shape.halfExtents.y*2,
                                                        shape.halfExtents.z*2 );
            mesh = new THREE.Mesh( box_geometry, material );
            break;

        case CANNON.Shape.types.CONVEXPOLYHEDRON:
            var geo = new THREE.Geometry();

            // Add vertices
            for (var i = 0; i < shape.vertices.length; i++) {
                var v = shape.vertices[i];
                geo.vertices.push(new THREE.Vector3(v.x, v.y, v.z));
            }

            for(var i=0; i < shape.faces.length; i++){
                var face = shape.faces[i];

                // add triangles
                var a = face[0];
                for (var j = 1; j < face.length - 1; j++) {
                    var b = face[j];
                    var c = face[j + 1];
                    geo.faces.push(new THREE.Face3(a, b, c));
                }
            }
            geo.computeBoundingSphere();
            geo.computeFaceNormals();
            mesh = new THREE.Mesh( geo, material );
            break;

        case CANNON.Shape.types.HEIGHTFIELD:
            var geometry = new THREE.Geometry();

            var v0 = new CANNON.Vec3();
            var v1 = new CANNON.Vec3();
            var v2 = new CANNON.Vec3();
            for (var xi = 0; xi < shape.data.length - 1; xi++) {
                for (var yi = 0; yi < shape.data[xi].length - 1; yi++) {
                    for (var k = 0; k < 2; k++) {
                        shape.getConvexTrianglePillar(xi, yi, k===0);
                        v0.copy(shape.pillarConvex.vertices[0]);
                        v1.copy(shape.pillarConvex.vertices[1]);
                        v2.copy(shape.pillarConvex.vertices[2]);
                        v0.vadd(shape.pillarOffset, v0);
                        v1.vadd(shape.pillarOffset, v1);
                        v2.vadd(shape.pillarOffset, v2);
                        geometry.vertices.push(
                            new THREE.Vector3(v0.x, v0.y, v0.z),
                            new THREE.Vector3(v1.x, v1.y, v1.z),
                            new THREE.Vector3(v2.x, v2.y, v2.z)
                        );
                        var i = geometry.vertices.length - 3;
                        geometry.faces.push(new THREE.Face3(i, i+1, i+2));
                    }
                }
            }
            geometry.computeBoundingSphere();
            geometry.computeFaceNormals();
            mesh = new THREE.Mesh(geometry, material );
            break;

        case CANNON.Shape.types.TRIMESH:
            var geometry = new THREE.Geometry();

            var v0 = new CANNON.Vec3();
            var v1 = new CANNON.Vec3();
            var v2 = new CANNON.Vec3();
            for (var i = 0; i < shape.indices.length / 3; i++) {
                shape.getTriangleVertices(i, v0, v1, v2);
                geometry.vertices.push(
                    new THREE.Vector3(v0.x, v0.y, v0.z),
                    new THREE.Vector3(v1.x, v1.y, v1.z),
                    new THREE.Vector3(v2.x, v2.y, v2.z)
                );
                var j = geometry.vertices.length - 3;
                geometry.faces.push(new THREE.Face3(j, j+1, j+2));
            }
            geometry.computeBoundingSphere();
            geometry.computeFaceNormals();
            mesh = new THREE.Mesh(geometry, material);
            break;

        default:
            throw "Visual type not recognized: "+shape.type;
        }

        mesh.receiveShadow = true;
        mesh.castShadow = true;
        if(mesh.children){
            for(var i=0; i<mesh.children.length; i++){
                mesh.children[i].castShadow = true;
                mesh.children[i].receiveShadow = true;
                if(mesh.children[i]){
                    for(var j=0; j<mesh.children[i].length; j++){
                        mesh.children[i].children[j].castShadow = true;
                        mesh.children[i].children[j].receiveShadow = true;
                    }
                }
            }
        }

        var o = body.shapeOffsets[l];
        var q = body.shapeOrientations[l];
        mesh.position.set(o.x, o.y, o.z);
        mesh.quaternion.set(q.x, q.y, q.z, q.w);

        obj.add(mesh);
    }

    return obj;
};