import React, { useEffect } from 'react';
import { useAnimate, useEventListener } from '../lib/hooks';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

var SCALE = 16;
var WIDTH = SCALE,
    HEIGHT = SCALE,
    frustumSize = SCALE;
var camera, scene, renderer, controls;

function init() {
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#canvas'),
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
    renderer.setSize(bounds.width, bounds.height);

    camera = new THREE.PerspectiveCamera( 70, bounds.width / bounds.height, 1, 1000 );
    camera.position.x = SCALE*2/3;
    camera.position.z = 0;
    camera.position.y = SCALE*2/5;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( 0x000000, 1, 1000 );

    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = SCALE/2;
    controls.maxDistance = SCALE*5;
    controls.maxPolarAngle = Math.PI / 2 - .1;

    var axesHelper = new THREE.AxesHelper(SCALE/4);
    // scene.add(axesHelper);

    scene.add(new THREE.AmbientLight(0xd9b3ff));
    var directionalLight = new THREE.DirectionalLight(0xffffbf, 2);
    directionalLight.position.set(-0.5, 0.5, -0.75);
    directionalLight.position.normalize();
    scene.add(directionalLight);
    var directionalLight = new THREE.DirectionalLight(0x3300ff, 3);
    directionalLight.position.set(0.5, -0.5, -1.5);
    directionalLight.position.normalize();
    scene.add(directionalLight);

    // from https://threejsfundamentals.org/threejs/lessons/threejs-load-gltf.html
    {
        const skyColor = 0xB1E1FF;  // light blue
        const groundColor = 0xB97A20;  // brownish orange
        const intensity = 2.;
        const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
        scene.add(light);
    }

    var circle = new THREE.Mesh(
        new THREE.CircleBufferGeometry( SCALE/4, 16 ),
        new THREE.MeshBasicMaterial({
            color: 0x0c0c0c,
            side: THREE.DoubleSide
        }));
    circle.lookAt(0, 1, 0);
    scene.add( circle );

    var loader = new GLTFLoader();
    loader.load(
        '/raw/models/tree.glb',
        (gltf) => {
            console.debug(gltf);
            scene.add(gltf.scene);
        }
    );

    onWindowResize();
}

function animate() {
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    renderer.setSize(bounds.width, bounds.height);
}

export default () => {
    useEffect(() => {
        init();
    }, []);

    useAnimate(animate);
    useEventListener(window, 'resize', onWindowResize, false);

    return (
        <div id="canvasContainer" style={{ height: '100%', width: '100%' }}>
            <canvas id="canvas"/>
        </div>
    )
}