// // adapted from https://threejs.org/examples/webgl_postprocessing_afterimage
// import React, { useEffect } from 'react';
// import styled from 'styled-components';
// import { useEventListener, useAnimate } from '../lib/hooks';


// import * as THREE from 'three';
// import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
// import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
// import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
// import { useSocket } from '../lib/socket';

// var camera, scene, renderer, composer;
// var mesh;

// var afterimagePass;

// function init() {
//     renderer = new THREE.WebGLRenderer({canvas: document.getElementById('projectCanvas')});
//     renderer.setPixelRatio( window.devicePixelRatio );
//     let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
//     renderer.setSize( bounds.width, bounds.height );

//     camera = new THREE.PerspectiveCamera( 70, bounds.width / bounds.height, 1, 1000 );

//     scene = new THREE.Scene();
//     scene.fog = new THREE.Fog( 0x000000, 1, 1000 );

//     // const geometry = new THREE.BoxBufferGeometry( 50, 100, 200, 2, 2, 2 );
//     // const material = new THREE.MeshNormalMaterial();
//     // mesh = new THREE.Mesh( geometry, material );
//     // mesh.position.z = -400
//     // scene.add( mesh );

//     // ground
//     {
//         const plane = new THREE.Mesh(
//             new THREE.PlaneGeometry(10_000, 10_000),
//             new THREE.MeshBasicMaterial({
//                 color: 0x0000ff,
//                 side: THREE.DoubleSide
//             }))
//             // new THREE.MeshStandardMaterial( {
//             //     color: 0x0000ff,
//             //     metalness: .1,
//             //     roughness: 1,
//             //     side: THREE.DoubleSide,
//             // }))
//             // new THREE.MeshNormalMaterial())
//         plane.position.set(0, -100, 0)
//         plane.rotation.set(Math.PI/2, 0, 0)
//         scene.add(plane)
//     }

//     // box matrix
//     {
//         const gridSize = 10
//         const gridScale = 100
//         for (let i = -gridSize; i <= gridSize; i++) {
//             for (let j = -gridSize; j <= gridSize; j++) {
//                 for (let k = -gridSize; k <= gridSize; k++) {
//                     if (j == -100 / gridScale) continue
//                     const box = new THREE.Mesh(
//                         new THREE.BoxBufferGeometry(10, 10, 10, 2, 2, 2),
//                         new THREE.MeshBasicMaterial({
//                             color: 0x0000ff,
//                             side: THREE.DoubleSide,
//                         }))
//                         // new THREE.MeshStandardMaterial( {
//                         //     color: 0x0000ff,
//                         //     metalness: 0,
//                         //     roughness: 1,
//                         // }))
//                         // new THREE.MeshNormalMaterial())
//                     box.position.set(i * gridScale, j * gridScale, k * gridScale)
//                     if (camera.position.equals(box.position)) continue
//                     scene.add(box)
//                 }
//             }
//         }
//     }

//     // random prisms
//     {
//         const prismCount = 7
//         const prismBounds = 500
//         for (let i = 0; i < prismCount; i++) {
//             const prism = new THREE.Mesh(
//                 new THREE.BoxBufferGeometry(
//                     Math.random() * 200 + 5,
//                     Math.random() * 200 + 5,
//                     Math.random() * 200 + 5,
//                     2, 2, 2),
//                 // new THREE.MeshBasicMaterial({
//                 //     color: 0xffffff,
//                 //     side: THREE.DoubleSide
//                 // }))
//                 new THREE.MeshStandardMaterial( {
//                     color: 0xffc800,
//                     metalness: .1,
//                     roughness: .9,
//                 }))
//             prism.position.set(
//                 Math.random() * prismBounds * 2 - prismBounds,
//                 Math.random() * prismBounds,
//                 Math.random() * prismBounds * 2 - prismBounds)
//             scene.add(prism)
//         }
//     }

//     renderer.gammaInput = true;
//     renderer.gammaOutput = true;

//     // lights
//     scene.add(new THREE.AmbientLight(0xffffff, .2))
//     {
//         const lightCount = 4
//         const lightBounds = 500
//         for (let i = 0; i < lightCount; i++) {
//             const light = new THREE.PointLight(0xffffff, 1, 0)
//             light.position.set(
//                 Math.random() * lightBounds * 2 - lightBounds,
//                 Math.random() * lightBounds,
//                 Math.random() * lightBounds * 2 - lightBounds)
//             scene.add(light)

//             const lightObject = new THREE.Mesh(
//                 new THREE.SphereGeometry(5, 12, 6),
//                 new THREE.MeshBasicMaterial({
//                     color: 0xffffff,
//                     side: THREE.DoubleSide
//                 }))
//             lightObject.position.copy(light.position)
//             scene.add(lightObject)
//         }
//     }

//     // postprocessing

//     composer = new EffectComposer( renderer );
//     composer.addPass( new RenderPass( scene, camera ) );

//     // afterimagePass = new AfterimagePass();
//     // afterimagePass.uniforms["damp"].value = 0.997;
//     // composer.addPass( afterimagePass );
// }

// function onWindowResize() {
//     let bounds = document.querySelector('#canvasContainer').getBoundingClientRect();
//     camera.aspect = bounds.width / bounds.height;
//     camera.updateProjectionMatrix();

//     renderer.setSize( bounds.width, bounds.height );
//     composer.setSize( bounds.width, bounds.height );
// }

// let controls = {}
// // let accel_reference = new Euler(0, 0, 0)
// // let stick_reference
// function animate() {
//     camera.rotation.order = 'YXZ'
//     // mesh.rotation.x += 0.0055;
//     // mesh.rotation.y += 0.011;

//     // if (controls.C) mesh.scale.multiplyScalar(1.01)
//     // if (controls.Z) mesh.scale.multiplyScalar(.99)

//     const closerAngle = (target, reference) => {
//         const diff = Math.abs(target - reference)
//         if (Math.abs((target + Math.PI*2) - reference) < diff) {
//             return target + Math.PI*2
//         }
//         if (Math.abs((target - Math.PI*2) - reference) < diff) {
//             return target - Math.PI*2
//         }
//         return target
//     }

//     if (controls.accel) {
//         camera.rotation.x = THREE.MathUtils.lerp(
//             camera.rotation.x,
//             closerAngle(
//                 -THREE.MathUtils.degToRad(controls.accel[1] * 1.5),
//                 camera.rotation.x),
//             .2)
//         camera.rotation.z = THREE.MathUtils.lerp(
//             camera.rotation.z,
//             closerAngle(
//                 -THREE.MathUtils.degToRad(controls.accel[0] * 1.5),
//                 camera.rotation.z),
//             .2)
//     }

//     if (controls.stick) {
//         const stick = new THREE.Vector2(
//             controls.stick[1]/128 - 1,
//             controls.stick[0]/128 - 1)
//         if (stick.length() > .5) {
//             // camera.rotation.y = THREE.MathUtils.lerp(
//             //     camera.rotation.y,
//             //     closerAngle(
//             //         -stick.angle(),
//             //         camera.rotation.y),
//             //     .2)
//             camera.rotation.order = 'ZXY'
//             camera.rotation.y += -stick.y * 3 * Math.PI / 180
//             camera.rotation.order = 'YXZ'
//             camera.position.add(new THREE.Vector3(0, 0, -stick.x * 3).applyEuler(camera.rotation))
//         }
//     }

//     // if (controls.C) camera.position.add(new THREE.Vector3(0, 0, -2).applyEuler(camera.rotation))
//     // if (controls.Z) camera.position.add(new THREE.Vector3(0, 0, 2).applyEuler(camera.rotation))

//     composer.render();
// }

// const CanvasContainer = styled.div`
//     position: relative;
//     width: 100%;
//     height: 100%;
// `

// export default () => {
//     useEffect(() => {
//         init();
//     }, []);

//     useAnimate(animate);
//     useEventListener(window, 'resize', onWindowResize, false);

//     useSocket({
//         on: {
//             'echo:nunchuck': data => {
//                 // console.log(data)
//                 if (data?.accel) {
//                     controls = data
//                 }
//             },
//         },
//         connect: socket => socket.emit('echo', 'nunchuck'),
//     })

//     return (
//         <CanvasContainer id="canvasContainer">
//             <canvas id="projectCanvas"/>
//         </CanvasContainer>
//     )
// }