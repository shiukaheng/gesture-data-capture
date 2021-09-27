import * as THREE from "three"
import 'color-convert'
import { Handy } from 'handy.js'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

// Boilerplate

var scene = new THREE.Scene()
var camera = new THREE.PerspectiveCamera()

var renderer = new THREE.WebGLRenderer({antialias: true})
renderer.xr.enabled = true

var sceneModifiers = []

document.getElementsByClassName("viewport-div")[0].appendChild(renderer.domElement)

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

onWindowResize()

renderer.setAnimationLoop(function() {
    renderer.render(scene, camera)
    Handy.update()
    sceneModifiers.forEach((x)=>(x()))
})

document.body.appendChild(VRButton.createButton(renderer))

// controllers

controller1 = renderer.xr.getController( 0 );
scene.add( controller1 );

controller2 = renderer.xr.getController( 1 );
scene.add( controller2 );

const controllerModelFactory = new XRControllerModelFactory();
const handModelFactory = new XRHandModelFactory();

// Hand 1
controllerGrip1 = renderer.xr.getControllerGrip( 0 );
controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
scene.add( controllerGrip1 );

hand1 = renderer.xr.getHand( 0 );
hand1.add( handModelFactory.createHandModel( hand1, 'mesh' ) );

scene.add( hand1 );

// Hand 2
controllerGrip2 = renderer.xr.getControllerGrip( 1 );
controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
scene.add( controllerGrip2 );

hand2 = renderer.xr.getHand( 1 );
hand2.add( handModelFactory.createHandModel( hand2, 'mesh' ) );
scene.add( hand2 );

// Lights
light = new THREE.AmbientLight()
scene.add(light)

// Scene
floorGeom = new THREE.PlaneGeometry(10, 10, 10, 10)
floorMaterial = new THREE.MeshBasicMaterial({wireframe: true})
floorMesh = new THREE.Mesh(floorGeom, floorMaterial)
scene.add(floorMesh)
floorMesh.rotation.x = Math.PI / 2