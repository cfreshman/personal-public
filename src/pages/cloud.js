// adapted from https://threejs.org/examples/webgl_postprocessing_afterimage
// basically the same thing, testing threejs
import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useEventListener, useAnimate } from '../lib/hooks';


import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { usePageSettings } from 'src/lib/hooks_ext';

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

    var geometry = new THREE.BoxBufferGeometry( 150, 150, 150, 2, 2, 2 );
    var material = new THREE.MeshNormalMaterial();
    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    // postprocessing

    composer = new EffectComposer( renderer );
    composer.addPass( new RenderPass( scene, camera ) );

    afterimagePass = new AfterimagePass();
    afterimagePass.uniforms["damp"].value = 0.997;
    composer.addPass( afterimagePass );
}

function onWindowResize() {
    let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();

    renderer.setSize( bounds.width, bounds.height );
    composer.setSize( bounds.width, bounds.height );
}

function animate() {
    mesh.rotation.x += 0.0055;
    mesh.rotation.y += 0.011;

    composer.render();
}

const CanvasContainer = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
`

export default () => {
    usePageSettings({
        background: '#000', text_color: '#fff',
    })

    useEffect(() => {
        init();
    }, []);

    useAnimate(animate);
    useEventListener(window, 'resize', onWindowResize, false);

    return (
        <CanvasContainer id="canvasContainer">
            <canvas id="projectCanvas"/>
        </CanvasContainer>
    )
}