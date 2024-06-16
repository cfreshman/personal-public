// adapted from https://threejs.org/examples/webgl_postprocessing_afterimage
import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useEventListener, useAnimate } from '../lib/hooks';


import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { useSocket } from '../lib/socket';

var camera, scene, renderer, composer;
var mesh;

var afterimagePass;

function init() {
    renderer = new THREE.WebGLRenderer({canvas: document.getElementById('projectCanvas')});
    renderer.setPixelRatio( window.devicePixelRatio );
    let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
    renderer.setSize( bounds.width, bounds.height );

    camera = new THREE.PerspectiveCamera( 70, bounds.width / bounds.height, 1, 1000 );
    camera.position.z = 400;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( 0x000000, 1, 1000 );

    var geometry = new THREE.BoxBufferGeometry( 50, 100, 200, 2, 2, 2 );
    var material = new THREE.MeshNormalMaterial();
    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    // postprocessing

    composer = new EffectComposer( renderer );
    composer.addPass( new RenderPass( scene, camera ) );

    // afterimagePass = new AfterimagePass();
    // afterimagePass.uniforms["damp"].value = 0.997;
    // composer.addPass( afterimagePass );
}

function onWindowResize() {
    let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();

    renderer.setSize( bounds.width, bounds.height );
    composer.setSize( bounds.width, bounds.height );
}

let controls = {}
function animate() {
    // mesh.rotation.x += 0.0055;
    // mesh.rotation.y += 0.011;

    if (controls.C) mesh.scale.multiplyScalar(1.01)
    if (controls.Z) mesh.scale.multiplyScalar(.99)

    const closerAngle = (target, reference) => {
        const diff = Math.abs(target - reference)
        if (Math.abs((target + Math.PI*2) - reference) < diff) {
            return target + Math.PI*2
        }
        if (Math.abs((target - Math.PI*2) - reference) < diff) {
            return target - Math.PI*2
        }
        return target
    }

    mesh.rotation.order = 'YXZ'
    if (controls.accel) {
        mesh.rotation.x = THREE.MathUtils.lerp(
            mesh.rotation.x,
            closerAngle(
                Math.PI / 5 - THREE.MathUtils.degToRad(controls.accel[1]),
                mesh.rotation.x),
            .2)
        mesh.rotation.z = THREE.MathUtils.lerp(
            mesh.rotation.z,
            closerAngle(
                -THREE.MathUtils.degToRad(controls.accel[0]),
                mesh.rotation.z),
            .2)
        // // move 1 degree at a time
        // const maxTurn = 5 * Math.PI / 180
        // const x_off = (Math.PI / 5 - THREE.MathUtils.degToRad(controls.accel[1]))
        //     - mesh.rotation.x
        // mesh.rotation.x += THREE.MathUtils.clamp(x_off, -maxTurn, maxTurn)
        // const z_off = (-THREE.MathUtils.degToRad(controls.accel[0]))
        //     - mesh.rotation.z
        // mesh.rotation.z += THREE.MathUtils.clamp(z_off, -maxTurn, maxTurn)
    }

    if (controls.stick) {
        const stick = new THREE.Vector2(
            controls.stick[0]/128 - 1,
            controls.stick[1]/128 - 1)
        if (stick.length() > .5) {
            mesh.rotation.y = THREE.MathUtils.lerp(
                mesh.rotation.y,
                closerAngle(
                    -Math.atan2(stick.x, stick.y),
                    mesh.rotation.y),
                .5)
        }
    }

    composer.render();
}

const CanvasContainer = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
`

export default () => {
    useEffect(() => {
        init();
    }, []);

    useAnimate(animate);
    useEventListener(window, 'resize', onWindowResize, false);

    useSocket({
        on: {
            'echo:nunchuck': data => {
                console.log(data)
                if (data?.accel) {
                    controls = data
                }
            },
        },
        connect: socket => socket.emit('echo', 'nunchuck'),
    })

    return (
        <CanvasContainer id="canvasContainer">
            <canvas id="projectCanvas"/>
        </CanvasContainer>
    )
}