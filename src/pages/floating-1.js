import React, { useEffect } from 'react';
import * as THREE from 'three';
import Delaunator from 'delaunator';
import { useAnimate, useEventListener } from '../lib/hooks';
import { JSX } from '../lib/types';
import { strToStyle, toStyle } from '../lib/util';
import { usePageSettings } from 'src/lib/hooks_ext';

const V3 = THREE.Vector3;

var SCALE = 256;
var WIDTH = SCALE,
    HEIGHT = SCALE,
    frustumSize = SCALE;
var camera, scene, renderer;

var points;
var delaunay;
var mesh;

class Point {
    constructor(position, velocity) {
        this.position = position;
        this.velocity = velocity;
    }

    update() {
        this.position.add(this.velocity);
        if (this.position.length() > SCALE/2) {
            this.velocity.reflect(this.position.clone().normalize().negate())
        }
    }
}

function init() {
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#canvas'),
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
    renderer.setSize(bounds.width, bounds.height);

    camera = new THREE.OrthographicCamera(-WIDTH/2, WIDTH/2, HEIGHT/2, -HEIGHT/2, 1, 1000)
    camera.position.z = 500
    scene = new THREE.Scene();

    points = [];
    // for (var i = 0; i < 12; i++) {
    //     let angle = 2*Math.PI * (i/12 + 1/24);
    //     let x = SCALE/2 * Math.cos(angle);
    //     let y = SCALE/2 * Math.sin(angle);
    //     points.push(new Point(new V3(x, y, 0), new V2(0, 0)));
    // }
    for (var i = 0; i < 32; i++) {
        var x = THREE.MathUtils.randFloatSpread(SCALE);
        var y = THREE.MathUtils.randFloatSpread(SCALE);
        if (x*x + y*y > Math.pow(SCALE/2, 2)) {
            i--;
            continue;
        }
        points.push(new Point(new V3(x, y, 0), new V3(
            THREE.MathUtils.randFloatSpread(SCALE/1000),
            THREE.MathUtils.randFloatSpread(SCALE/1000), 0)))
    }

    delaunay = Delaunator.from(points, p => p.position.x, p => p.position.y)
    // let geometry = new Geometry();
    // geometry.vertices.push(...points.map(p => p.position));
    // let faces = []
    // for (let t = 0; t < delaunay.triangles.length/3; t++) {
    //     faces.push(new Face3(
    //         ...[3*t, 3*t + 1, 3*t + 2].map(e => delaunay.triangles[e]),
    //         null, new THREE.Color(Math.random(), Math.random(), Math.random())))
    // }
    // geometry.faces.push(...faces);

    // use BufferGeometry for delaunay instead of Geometry
    const vertices = points.map(p => p.position);
    const faces = []
    for (let t = 0; t < delaunay.triangles.length/3; t++) {
        faces.push(delaunay.triangles.slice(3*t, 3*t + 3))
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array(vertices.flat().map(v => v.toArray()).flat()), 3));
    geometry.setIndex(new THREE.BufferAttribute(
        new Uint32Array(faces.flat()),
        1));

    // mesh = new THREE.Mesh(
    //     geometry,
    //     new THREE.MeshBasicMaterial({ wireframe: true, side: THREE.DoubleSide }))
    mesh = new THREE.Mesh(new THREE.BoxGeometry(SCALE, SCALE, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }))
    scene.add(mesh);

    // add circles
    [...Array(10).keys()].forEach(i => {
        const radius = SCALE/2 * (.95 - .1*i);
        const curve = new THREE.EllipseCurve(
            // 0,  0, SCALE/2 * (1.05**i), SCALE/2 * (1.05**i),
            0,  0, radius, radius,
            0,  2 * Math.PI, false, 0
        );
        scene.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curve.getPoints(90)),
            new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: i/42 + .1 })));
    })

    onWindowResize();

    return () => {
        renderer.dispose();
        camera = null;
        scene = null;
        renderer = null;
        points = null;
        delaunay = null;
        mesh = null;
    }
}

function animate() {
    if (mesh && points) {
        mesh.geometry.dispose();

        points.forEach(p => p.update())
        let delaunay = Delaunator.from(points, p => p.position.x, p => p.position.y);

        let geometry = new Geometry();
        geometry.vertices.push(...points.map(p => p.position));
        let faces = []
        for (let t = 0; t < delaunay.triangles.length/3; t++) {
            faces.push(new Face3(
                ...[3*t, 3*t + 1, 3*t + 2].map(e => delaunay.triangles[e])))
        }
        geometry.faces.push(...faces);

        mesh.geometry = geometry.toBufferGeometry();

        renderer.render(scene, camera);
    }
}

function onWindowResize() {
    let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
    // camera.aspect = bounds.width / bounds.height;
    var aspect = bounds.width / bounds.height;
    if (aspect < 1) {
        camera.left   = - frustumSize / 2;
        camera.right  =   frustumSize / 2;
        camera.top    =   frustumSize / aspect / 2;
        camera.bottom = - frustumSize / aspect / 2;
    } else {
        camera.left   = - aspect * frustumSize / 2;
        camera.right  =   aspect * frustumSize / 2;
        camera.top    =   frustumSize / 2;
        camera.bottom = - frustumSize / 2;
    }
    camera.updateProjectionMatrix();
    renderer.setSize(bounds.width, bounds.height);
}

export default () => {
    usePageSettings({
        background: '#000', text_color: '#fff',
        uses: {
            delaunator: 'https://github.com/mapbox/delaunator',
        }
    })
    useEffect(() => init(), []);
    useAnimate(animate);
    useEventListener(window, 'resize', onWindowResize, false);

    return <>
        <div id="canvasContainer" className="seamless"
            style={{ height: '100%', width: '100%', background: 'black' }}>
            <canvas id="canvas"/>
        </div>
    </>
}