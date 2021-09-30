import * as THREE from "three"
import 'color-convert'
import { Handy } from 'handy.js'

import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

function setup() {
    window.Handy = Handy

    var scene = new THREE.Scene()
    var camera = new THREE.PerspectiveCamera()

    scene.add(camera)

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
        sceneModifiers.forEach((x)=>{x(()=>{
            sceneModifiers = sceneModifiers.filter((modifier)=>{
                return modifier === x
            })
        })})
    })

    document.body.appendChild(VRButton.createButton(renderer))

    window.scene = scene
    window.camera = camera
    window.renderer = renderer
    window.sceneModifiers = sceneModifiers
}

function setupControllersAndHands() {
    var controller1 = renderer.xr.getController( 0 );
    scene.add( controller1 );

    var controller2 = renderer.xr.getController( 1 );
    scene.add( controller2 );

    const controllerModelFactory = new XRControllerModelFactory();
    const handModelFactory = new XRHandModelFactory();

    // Hand 1
    // var controllerGrip1 = renderer.xr.getControllerGrip( 0 );
    // controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
    // scene.add( controllerGrip1 );

    var hand1 = renderer.xr.getHand( 0 );
    scene.add( hand1 );
    hand1.add( handModelFactory.createHandModel( hand1, 'mesh' ) );
    Handy.makeHandy(hand1)
    
    // Hand 2
    // var controllerGrip2 = renderer.xr.getControllerGrip( 1 );
    // controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
    // scene.add( controllerGrip2 );

    var hand2 = renderer.xr.getHand( 1 );
    scene.add( hand2 );
    hand2.add( handModelFactory.createHandModel( hand2, 'mesh' ) );
    Handy.makeHandy(hand2)
    
}

function setupScene() {
    // Lights
    var light = new THREE.AmbientLight()
    scene.add(light)

    // Scene
    var floorGeom = new THREE.PlaneGeometry(10, 10, 10, 10)
    var floorMaterial = new THREE.MeshBasicMaterial({wireframe: true})
    var floorMesh = new THREE.Mesh(floorGeom, floorMaterial)
    scene.add(floorMesh)
    floorMesh.rotation.x = Math.PI / 2
}

function initialize() {
    setup()
    setupControllersAndHands()
    setupScene()
}

function recordHandMotion(duration, callback=(data)=>{}) {
    var timer = new THREE.Clock()
    var data = []
    var camera = renderer.xr.getCamera()
    sceneModifiers.push((destroy)=>{
        var pose = {
            "left_hand_pose": Handy.hands.getLeft().readLivePoseData(),
            "right_hand_pose": Handy.hands.getRight().readLivePoseData(),
            "head_pose": {
                "matrix": camera.matrix.toArray()
            },
            "time": Date.now()
        }
        console.log((Handy.hands.getLeft().displayFrame.visible, Handy.hands.getRight().displayFrame.visible))
        data.push(pose)
        if (timer.getElapsedTime() >= duration) {
            destroy()
            callback(data)
        }
    })
}

window.recordHandMotion = recordHandMotion

initialize()
