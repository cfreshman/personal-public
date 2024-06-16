import React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useAnimate, useEventListener, useF } from '../lib/hooks';

import styled from 'styled-components';
import { usePathState } from '../lib/hooks_ext';

const Models = styled.div`
    height: 100%;
    width: 100%;

    & #canvasContainer {
        height: 100%;
        width: 100%;
    }

    & #canvas {
        /* background: radial-gradient(white, rgb(100, 100, 100)); */
        background: radial-gradient(rgb(40, 40, 40), rgb(10, 10, 10));
        background: radial-gradient(rgb(90, 90, 90), rgb(40, 40, 40));
        background: radial-gradient(rgb(240, 240, 240), rgb(140, 140, 140));
        /* rgb(244, 241, 232) */
    }

    & #modelList {
        position: absolute;
        top: .5rem;
        right: .5rem;
        min-width: 7rem;
    }

    select { // from https://getbootstrap.com/docs/5.0/forms/select/
        display: block;
        width: fit-content;
        // width: 100%;
        padding: .375rem 2.25rem .375rem .75rem;
        -moz-padding-start: calc(0.75rem - 3px);
        font-size: max(16px, 1rem);
        font-weight: 400;
        line-height: 1;
        color: #212529;
        background-color: #fff;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right .75rem center;
        background-size: 16px 12px;
        border: 1px solid #ced4da;
        border-radius: .25rem;
        transition: border-color .15s ease-in-out,box-shadow .15s ease-in-out;
        appearance: none;
    }
`

var SCALE = 16;
var camera, scene, renderer, controls, loader;

function init() {
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#canvas'),
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
    renderer.setSize(bounds.width, bounds.height);

    camera = new THREE.PerspectiveCamera( 70, bounds.width / bounds.height, 1, 1000 );
    camera.position.x = SCALE*2/3;
    camera.position.z = -SCALE*2/3;
    camera.position.y = SCALE*1/12;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( 0x000000, 1, 1000 );

    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = SCALE/5;
    controls.maxDistance = SCALE*5;

    // scene.add(new THREE.AmbientLight(0xd9b3ff));
    scene.add(new THREE.AmbientLight(0xffffff, .125));
    var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 0);
    directionalLight.position.normalize();
    scene.add(directionalLight);
    var directionalLight = new THREE.DirectionalLight(0xad9ede, .5);
    directionalLight.position.set(1, .2, 0);
    directionalLight.position.normalize();
    scene.add(directionalLight);
    var directionalLight = new THREE.DirectionalLight(0x9ecdde, .25);
    directionalLight.position.set(-1, -.5, 0);
    directionalLight.position.normalize();
    scene.add(directionalLight);

    // from https://threejsfundamentals.org/threejs/lessons/threejs-load-gltf.html
    {
        const skyColor = 0xffffff; //0xB1E1FF;  // light blue
        const groundColor = 0xffffff; //0xB97A20;  // brownish orange
        const intensity = .5;
        const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
        scene.add(light);
    }

    onWindowResize();

    loader = new GLTFLoader();
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

let modelNames = ['tree', 'palm', 'desk', 'octopus', 'turtle'];
let model = false;
function loadModel(name) {
    model && scene.remove(model)
    if (name && modelNames.includes(name)) {
        loader.load(
            `/raw/models/${name}.glb`,
            (gltf) => {
                model && scene.remove(model)
                model = gltf.scene;

                const box = new THREE.Box3().setFromObject( model );
                const center = box.getCenter( new THREE.Vector3() );
                model.position.y += ( model.position.y - center.y );

                console.debug(model);
                scene.add(model);
            }
        );
    }
}

export default () => {
    useF(init)

    const [modelName, setModelName] = usePathState()
    useF(modelName, () => modelNames.includes(modelName)
        ? loadModel(modelName)
        : setModelName('octopus'))

    useAnimate(animate)
    useEventListener(window, 'resize', onWindowResize, false)

    return (
        <Models>
            <div id="canvasContainer">
                <canvas id="canvas"/>
            </div>
            <select id="modelList" value={modelName} onChange={e => setModelName(e.target.value)}>
                {modelNames.map(name => <option value={name} key={name}>{name}</option>)}
            </select>
        </Models>
    )
}