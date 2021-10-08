import * as THREE from "three"
import 'color-convert'
import { Handy } from 'handy.js'

import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { DummyXRHandModelFactory } from "./DummyXRHandModel"

import { customAlphabet } from 'nanoid'

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
}

function serializeJoints(hand) {
    return Object.fromEntries(Object.entries(hand?.joints || {}).map((arr)=>{
        return [arr[0],
        {
            "matrix": arr[1].matrix.toArray()
        }]
    }))
}

function applySerializedJoints(dummyHand, serializedJoints, jointMask=[]) {
    dummyHand.children[0].children.forEach((bone)=>{
        if (bone.jointName && !jointMask.includes(bone.jointName) && serializedJoints[bone.jointName] !== undefined) {
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
        typeof obj === 'object' &&
        !Array.isArray(obj) &&
        obj !== null
    )
}

function interpObj(obj1, obj2, value) {
    var newObj = {}
    for (const [key, keyVal] of Object.entries(obj1)) {
        // Works with assumption that the arrays always only contain numbers
        if (Array.isArray(keyVal)) {
            newObj[key] = interpNumericArray(obj1[key], obj2[key], value)
        } else if (typeof keyVal === 'number') {
            newObj[key] = interpNumbers(obj1[key], obj2[key], value)
        } else if (isObject(keyVal)) {
            newObj[key] = interpObj(obj1[key], obj2[key], value)
        } else {
            throw "Unexpected type"
        }
    }
    return newObj
}

function interpSerializedJoints(pose1, pose2, value) {
    return interpObj(pose1, pose2, value)
}

// function resampleTimeSeries(data) {

// }

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

    var initialTime = Date.now()
    var timeNow = Date.now()
    var getTimeElapsed = () => {
        return timeNow - initialTime
    }
    var getVideoTimeElapsed = (frameIndex) => {
        // console.log(data[frameIndex]["time"], data[0]["time"])
        return data[frameIndex]["time"] - data[0]["time"]
    }
    var frame = 0
    sceneModifiers.push((destroy)=>{
        // console.log(`New frame rendered: ${frame}`)
        timeNow = Date.now()
        // If not last frame, and not current time elapsed is more than video time elapsed, step to next frame
        while (data[frame+1]!==undefined && getTimeElapsed()>=getVideoTimeElapsed(frame)) {
            frame++
            // console.log(`Incremented frame: ${frame}`)
        }
        var resultFrame
        if (data[frame+1]===undefined) {
            resultFrame = data[frame]
            destroy()
            window.dummyLock = false
            dummyLeft.visible = false
            dummyRight.visible = false
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
        downloadHandMotion(data)
    })
}

function exportHandMotion(data) {
    // Exports as JSON
    return "data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(data))
}

function download(filename, text) {
    // Source: https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
}

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8)

function downloadHandMotion(data) {
    console.log(exportHandMotion(data))
}

function getObjectFlattenerList(sampleObject) {
    var flatteners = {}
    for (const [key, val] of Object.entries(sampleObject)) {
        if (typeof val === 'object' && val !== null) {
            var subflatteners = getObjectFlattenerList(val)
            for (const [subkey, subflattener] of Object.entries(subflatteners)) {
                var newKeyCandidate = `${key}-${subkey}`
                var newKey = newKeyCandidate
                var duplicateKeyCount = 0
                while (Object.keys(flatteners).includes(newKey)) {
                    duplicateKeyCount++
                    newKey = newKeyCandidate+`(${duplicateKeyCount})`
                }
                flatteners[newKey] = (object) => {return subflattener(object[key])}
            }
        } else {
            var newKeyCandidate = key
            var newKey = newKeyCandidate
            var duplicateKeyCount = 0
            while (Object.keys(flatteners).includes(newKey)) {
                duplicateKeyCount++
                newKey = newKeyCandidate+`(${duplicateKeyCount})`
            }
            flatteners[newKey] = (object) => {return object[key]}
        }
    }
    return flatteners
}

function writeCsv(rows) {
    rows.map(row => row.join(", ")).join("")
}

function objectToCsv(array) {
    var flattener = getObjectFlattener(array[0])
    var header_row = Object.keys(flattener)
    var data_rows = array.map((frame) => {

    })
}

window.serializeJoints = serializeJoints
window.applySerializedJoints = applySerializedJoints
window.echoHands = echoHands

initialize()