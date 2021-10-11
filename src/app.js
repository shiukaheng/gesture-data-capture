import * as THREE from "three"
import 'color-convert'
import { Handy } from 'handy.js'

import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { DummyXRHandModelFactory } from "./lib/DummyXRHandModel"
import * as GDC from "./lib/GestureDataCapture"

window.DummyXRHandModelFactory = DummyXRHandModelFactory

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

    window.sceneModifiers = sceneModifiers

    renderer.setAnimationLoop(function() {
        renderer.render(scene, camera)
        Handy.update()
        window.sceneModifiers.forEach((x)=>{x(()=>{
            window.sceneModifiers = window.sceneModifiers.filter((modifier)=>{
                return modifier !== x
            })
            console.log("Modifier terminated.")
        })})
    })

    document.body.appendChild(VRButton.createButton(renderer))

    window.scene = scene
    window.camera = camera
    window.renderer = renderer
    
}

function setupControllersAndHands() {
    var controller1 = renderer.xr.getController( 0 );
    scene.add( controller1 );

    var controller2 = renderer.xr.getController( 1 );
    scene.add( controller2 );

    const controllerModelFactory = new XRControllerModelFactory();
    const handModelFactory = new XRHandModelFactory();

    // Hand 1
    var controllerGrip1 = renderer.xr.getControllerGrip( 0 );
    controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
    scene.add( controllerGrip1 );

    var hand1 = renderer.xr.getHand( 0 );
    scene.add( hand1 );
    hand1.add( handModelFactory.createHandModel( hand1, 'mesh' ) );
    Handy.makeHandy(hand1)
    
    // Hand 2
    var controllerGrip2 = renderer.xr.getControllerGrip( 1 );
    controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
    scene.add( controllerGrip2 );

    var hand2 = renderer.xr.getHand( 1 );
    scene.add( hand2 );
    hand2.add( handModelFactory.createHandModel( hand2, 'mesh' ) );
    Handy.makeHandy(hand2)

    var dummyFac = new DummyXRHandModelFactory()

    var dummyHands = new THREE.Group()
    scene.add(dummyHands)

    var dummyLeft = dummyFac.createHandModel("left")
    dummyHands.add(dummyLeft)
    dummyLeft.visible = false

    var dummyRight = dummyFac.createHandModel("right")
    dummyHands.add(dummyRight)
    dummyRight.visible = false

    window.left = Handy.hands.getLeft()
    window.right = Handy.hands.getRight()
    window.dummyLeft = dummyLeft
    window.dummyRight = dummyRight
    window.dummyLock = false
    
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
    window.GDC = GDC
}

initialize()