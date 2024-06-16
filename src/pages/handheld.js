import React, { useState } from 'react';
import styled from 'styled-components';
import * as THREE from 'three';
import { useAnimate, useEventListener, useF } from '../lib/hooks';

import { useSocket } from '../lib/socket';
const V3 = THREE.Vector3;

const SCALE = 2;
const WIDTH = SCALE,
    HEIGHT = SCALE,
    frustumSize = SCALE;
let canvas
let camera, scene, renderer;

let geometry, obj

function init() {
    canvas = document.querySelector('#canvas')
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    let bounds = canvas.parentNode.getBoundingClientRect()
    renderer.setSize(bounds.width, bounds.height)

    camera = new THREE.OrthographicCamera(-WIDTH/2, WIDTH/2, HEIGHT/2, -HEIGHT/2, 1, 1000)
    camera.position.z = 500
    scene = new THREE.Scene()

    const light = new THREE.PointLight(0xffffff, 1)
    light.position.set(2, 2, 2)
    scene.add(light)

    geometry = new THREE.BoxGeometry(1, 1.65, .1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    // const material = new THREE.MeshToonMaterial({ color: 0xffffff });
    obj = new THREE.Mesh(geometry, material);
    scene.add(obj);

    // geometry = new THREE.PlaneGeometry(1, 1.65)
    // const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide })
    // obj = new THREE.Mesh(geometry, material)
    // scene.add(obj)

    resize()

    return () => {
        renderer.dispose()
        camera = null
        scene = null
        renderer = null
    }
}

function resize() {
    let bounds = canvas.parentNode.getBoundingClientRect()
    // camera.aspect = bounds.width / bounds.height;
    var aspect = bounds.width / bounds.height
    if (aspect < 1) {
        camera.left   = - frustumSize / 2
        camera.right  =   frustumSize / 2
        camera.top    =   frustumSize / aspect / 2
        camera.bottom = - frustumSize / aspect / 2
    } else {
        camera.left   = - aspect * frustumSize / 2
        camera.right  =   aspect * frustumSize / 2
        camera.top    =   frustumSize / 2
        camera.bottom = - frustumSize / 2
    }
    camera.updateProjectionMatrix()
    renderer.setSize(bounds.width, bounds.height)
}

function animate() {
    renderer.render(scene, camera)
}

// const acl = new Accelerometer({ frequency: 1 })
let basis = [0, 0, 0]
let rotate = [0, 0, 0]
export default () => {
    useF(init)
    useAnimate(animate)
    useEventListener(window, 'resize', resize, false)

    const [users, setUsers] = useState([])
    const socket = useSocket({
        room: 'handheld',
        on: {
            'handheld:rotate': target => {
                basis = target
                handle.update()
            },
            'handheld:users': users => {
                setUsers(users)
            },
        }
    })
    useEventListener(window, 'deviceorientation', e => {
        const [z, x, y] = [e.alpha, e.beta, e.gamma].map(a => a*Math.PI/180)

        rotate = [x, y, z]
        socket?.emit('handheld:rotate', rotate)
        handle.update()
    })

    const handle = {
        update: () => {
            let diff = basis.map((_, i) => basis[i] - rotate[i])
            obj.setRotationFromEuler(new THREE.Euler(...diff, 'YXZ'))
            if (new V3(...diff
                .map(x => Math.min(Math.abs(x), Math.abs(Math.PI - x))))
                .length() < Math.PI/4) {
                obj.material.color.set(0x00ff00)
                // canvas.style.background = '#00ff00'
            } else {
                obj.material.color.set(0xffffff)
                // canvas.style.background = 'black'
            }
            renderer.render(scene, camera)
        },
        ask: e => {
            DeviceMotionEvent.requestPermission
            && DeviceMotionEvent.requestPermission()
            setHint(false)
        },
        motion: () => {},
        move: e => {
            let bounds = document.querySelector('#canvas').parentNode.getBoundingClientRect()
            let v = new THREE.Vector2(
                (bounds.width / 2 - (e.clientX - bounds.left))/bounds.width,
                (bounds.height / 2 - (e.clientY - bounds.top))/bounds.height)
            v.multiplyScalar(Math.PI)
            rotate = [v.length(), 0, -v.angle() - Math.PI/2]
            socket?.emit('handheld:rotate', rotate)
            // obj.setRotationFromEuler(new THREE.Euler(...rotate, 'YXZ'))
            // renderer.render(scene, camera)
        },
    }

    const [hint, setHint] = useState(true)
    useF(() => {
        if (DeviceMotionEvent.requestPermission) {
            DeviceMotionEvent.requestPermission()
                .then(r => r === 'granted' && setHint(false))
        } else {
            setHint(false)
        }
    })
    return <Style>
        <div className={`hint hint-${hint}`} onClick={handle.ask}>(click here)</div>
        <div className={`users`}>
            {users.map((u, i) => <div key={i}>{u}</div>)}
        </div>
        <canvas onMouseMove={e => handle.move(e)} id="canvas"/>
    </Style>
}

const Style = styled.div`
height: 100%;
width: 100%;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
background: #201624; // black
background: white;
background: black;
touch-action: none;
user-select: none;

canvas {
    background: #f2eee3; // white
    background: black;
}

position: relative;
.hint {
    position: absolute;
    // top: 2rem;
    color: white;
    background: black;
    transition: .5s;
    &.hint-false {
        opacity: 0;
        // top: 1rem;
        margin-bottom: 1rem;
    }
}
.desc {
    position: absolute;
    top: 2rem;
}
.users {
    position: absolute;
    top: .5rem; left: .5rem;
}
`