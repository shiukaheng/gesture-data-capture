import * as THREE from "three"
import 'color-convert'
import { Handy } from 'handy.js'

import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { DummyXRHandModelFactory } from "./DummyXRHandModel"

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

    var dummyLeft = dummyFac.createHandModel("left")
    scene.add(dummyLeft)
    dummyLeft.visible = false

    var dummyRight = dummyFac.createHandModel("right")
    scene.add(dummyRight)
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
}

function serializeJoints(hand) {
    return Object.fromEntries(Object.entries(hand.joints).map((arr)=>{
        return [arr[0],
        {
            "matrix": arr[1].matrix.toArray()
        }]
    }))
}

function applySerializedJoints(dummyHand, serializedJoints, jointMask=[]) {
    dummyHand.children[0].children.forEach((bone)=>{
        if (bone.jointName && !jointMask.includes(bone.jointName)) {
            bone.matrixAutoUpdate = false
            bone.matrix.fromArray(serializedJoints[bone.jointName]["matrix"])
        }
    })
}

function interpNumbers(num1, num2, value) {
    return num1 * (1-value) + num2 * value
}

function interpNumericArray(arr1, arr2, value) {
    var newArr = []
    arr1.forEach((n, i) => {
        newArr.push(interpNumbers(n, arr2[i], value))
    })
    return newArr
}

function isObject(obj) {
    return (
        typeof yourVariable === 'object' &&
        !Array.isArray(yourVariable) &&
        yourVariable !== null
    )
}

function interpObj(obj1, obj2, value) {
    var newObj = {}
    Object.entries(obj1).forEach((key, keyVal) => {
        // Works with assumption that the arrays always only contain numbers
        if (keyVal.isArray()) {
            newObj[key] = interpNumericArray(obj1[key], obj2[key], value)
        } else if (typeof keyVal === 'number') {
            newObj[key] = interpNumbers(obj1[key], obj2[key], value)
        } else if (isObject(keyVal)) {
            newObj[key] = interpObj(obj1[key], obj2[key], value)
        } else {
            throw "Unexpected type"
        }
    })
    return newObj
}

function interpSerializedJoints(pose1, pose2, value) {
    return interpObj(pose1, pose2, value)
}

function resampleTimeSeries(data) {

}

function recordHandMotion(duration, callback=(data)=>{}) {
    console.log("Recording!")
    var timer = new THREE.Clock()
    var data = []
    var camera = renderer.xr.getCamera()
    var leftHand = Handy.hands.getLeft()
    var rightHand = Handy.hands.getRight()
    sceneModifiers.push((destroy)=>{
        var pose = {
            "left_hand_pose": serializeJoints(leftHand),
            "right_hand_pose": serializeJoints(rightHand),
            "head_pose": {
                "matrix": camera.matrix.toArray()
            },
            "time": Date.now()
        }
        data.push(pose)
        if (timer.getElapsedTime() >= duration) {
            destroy()
            callback(data)
        }
    })
}

function playbackHandMotion(data, callback=(data)=>{}, fps_hint=60) {
    console.log("Playback in progress!")

    window.dummyLock = true
    dummyLeft.visible = true
    dummyRight.visible = true
    var lastUpdate = Date.now()
    var frame = 0
    sceneModifiers.push((destroy)=>{
        // Check if motion data is in last frame
        if (frame >= data.length-1) {
            console.log
            if ((Date.now()-lastUpdate) >= (1/fps_hint*1000)) {
                window.dummyLock = false
                dummyLeft.visible = false
                dummyRight.visible = false
                destroy()
            }
        } else {
            while ((frame < data.length-1) && (Date.now()-lastUpdate > data[frame+1]["time"]-data[frame]["time"])) { 
                frame += 1
            }
            lastUpdate = Date.now()
        }
        applySerializedJoints(dummyLeft, data[frame]["left_hand_pose"])
        applySerializedJoints(dummyRight, data[frame]["right_hand_pose"])
    })
}

function playbackHandMotion2(data, callback=(data)=>{}, fps_hint=60) {
    /*
    Initialize playback
        Record initial time
        Record initial frames A, B (the two to be interpolated)
    */
    var initialTime = Date.now()
    var timeNow = Date.now()
    function getTimeElapsed() {
        return timeNow - initialTime
    }
    function getVideoTimeElapsed(frameIndex) {
        return data[frameIndex]["time"] - data[0]["time"]
    }
    var frame = 0
    /*
    Start playback loop
        Frame search:
            Get elapsed time from subtracting time now from intial time
            Search for these parameters by incrementing A, B indices by one each each loop:
                Does time elapsed from frame A from initial frame <= time elapsed [AND] If there is a frame after frame A, does time elapsed from frame B from initial frame >= time elapsed?
            Get resulting frame from frame A, frame B
                If only frame A, just use A
                If have frame B, interpolate
            Update dummy hands from resultant frame
    */
    sceneModifiers.push((destroy)=>{
        timenow = Date.now()
        while (!(getVideoTimeElapsed(frame) <= getTimeElapsed) && (data[frame+1]===undefined || getVideoTimeElapsed(frame+1) >= getTimeElapsed())) {
            frame++
        }
        var resultFrame
        if (data[frame+1]===undefined) {
            resultFrame = data[frame]
            destroy()
        } else {
            resultFrame = interpSerializedJoints(data[frame], data[frame+1], (getTimeElapsed()-getVideoTimeElapsed(frame))/(data[frame+1]["time"]-data[frame]["time"]))
        }
        applySerializedJoints(dummyLeft, resultFrame["left_hand_pose"])
        applySerializedJoints(dummyRight, resultFrame["right_hand_pose"])
    })
}

function echoHands(duration=5) {
    recordHandMotion(duration, (data)=>{
        playbackHandMotion(data)
    })
}

window.serializeJoints = serializeJoints
window.applySerializedJoints = applySerializedJoints
window.echoHands = echoHands

initialize()