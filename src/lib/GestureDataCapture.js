import { customAlphabet } from 'nanoid'
import * as THREE from 'three'
import { cloneDeep } from 'lodash';

// Functions for hand joint serialization and display, so hand joint poses can easily be saved and shown

/**
 * Returns a object representing hand joint positions given a hand object
 * @param {*} hand - Hand object
 * @returns Object cointaining matrices of all hand joints (absolute positions)
 */
function serializeJoints(hand) {
    return Object.fromEntries(Object.entries(hand?.joints || {}).map((arr)=>{
        return [arr[0],
        {
            "matrix": arr[1].matrix.toArray()
        }]
    }))
}

function serializeWrist(hand) {
    return (hand?.joints?.wrist === undefined) ? {} :
    {
        "wrist": {
            "matrix": hand?.joints?.wrist?.matrix?.toArray()
        }
    }
}

/**
 * Applies serialized hand joints to a dummy hand for display
 * @param {*} dummyHand - DummyHand object to apply joint poses to
 * @param {*} serializedJoints - Serialized hand joints obtained from serializeJoints
 * @param {*} jointMask - An array of joint names that you want to omit applying positions to
 */
function applySerializedJoints(dummyHand, serializedJoints, jointMask=[]) {
    dummyHand.children[0].children.forEach((bone)=>{
        if (bone.jointName && !jointMask.includes(bone.jointName) && serializedJoints[bone.jointName] !== undefined) {
            bone.matrixAutoUpdate = false
            bone.matrix.fromArray(serializedJoints[bone.jointName]["matrix"])
        }
    })
}

// Functions for hand joint interpolation

/**
 * Function for interpolating between two numerical values
 * @param {number} num1 - First number
 * @param {number} num2 - Second number
 * @param {number} value - Value that determines mix between first and second number: being all from num1, 1 being all from num 2
 * @returns {number} Interpolated number
 */
function interpNumbers(num1, num2, value) {
    return num1 * (1-value) + num2 * value
}

/**
 * Function for interpolating between two numerical arrays, assuming same length
 * @param {number[]} arr1 - First array
 * @param {number[]} arr2 - Second array
 * @param {number} value - Value that determines mix between first and second number: being all from arr1, 1 being all from arr2
 * @returns {number[]} Interpolated number array
 */
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

/**
 * Function for recursively interpolating between two objects, assuming they have the same fields, and that all contents are composed of numbers, array of numbers, or objects filled up by numbers
 * @param {object} obj1 - First object 
 * @param {object} obj2 - Second object
 * @param {number} value - Value that determines mix between first and second number: being all from obj1, 1 being all from obj2
 * @returns {object} Interpolated object
 */
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

// Functions for manipulating recorded hand poses

/**
 * Function to replace hand gestures in target a pose from another source pose
 * @param {object} sourcePose - Source pose from {@link serializeJoints}
 * @param {object} targetPose - Target pose from {@link serializeJoints}
 * @returns {object} Target pose with source pose gesture replaced
 */
function replacePoseGesture(sourcePose, targetPose) {
    throw "not implemented"
}

// Functions for recording and playing back hand pose data as a time series

/**
 * Function for initiating hand motion recording
 * @param {number} duration - Recording duration in seconds 
 * @param {function} callback - Callback function when recording is done, function will be called with data as argument 
 */
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

/**
 * Function for playing back recorded hand motion data
 * @param {array} data - Recorded data for playback 
 * @param {function} callback - Callback function that is called once playback has ended
 */
function playbackHandMotion(data, callback=(data)=>{}) {

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
            callback()
        } else {
            resultFrame = interpObj(data[frame], data[frame+1], (getTimeElapsed()-getVideoTimeElapsed(frame))/(data[frame+1]["time"]-data[frame]["time"]))
        }
        applySerializedJoints(dummyLeft, resultFrame["left_hand_pose"])
        applySerializedJoints(dummyRight, resultFrame["right_hand_pose"])
    })
}

/**
 * Convenience function to quickly record and playback hand motion
 * @param {number} duration - Recording duration
 */
function echoHands(duration=5) {
    recordHandMotion(duration, (data)=>{
        playbackHandMotion(data)
        console.log(objectArrayToCsv(data))
    })
}

// Hand motion IO, to export recorded hand motion data as CSV

/**
 * Function to download string as file. Source: https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server
 * @param {string} filename 
 * @param {string} text - file content 
 */
function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
}

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8)

/**
 * For a given object, create a new flat object that includes a function to access all the given object's values
 * @param {object} sampleObject - Object to transform
 * @returns {object} Transformed object of accessors
 */
function getObjectFlattenerObject(sampleObject) {
    var flatteners = {}
    for (const [key, val] of Object.entries(sampleObject)) {
        if (typeof val === 'object' && val !== null) {
            var subflatteners = getObjectFlattenerObject(val)
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

/**
 * Function that given a object, flattens all the object's keys, and creates a new function that would turn this object (or a similar object with different values) into an array
 * @param {*} sampleObject - Object to create transformations for
 * @returns {function} Function that can transform an object to an array
 */
function getObjectFlattener(sampleObject) {

    var flattenerObject = getObjectFlattenerObject(sampleObject)

    var headers = Object.keys(flattenerObject)
    var flattenerList = Object.values(flattenerObject)
    
    return {
        "headers": headers,
        "mapper": object => flattenerList.map(elemFlattener => elemFlattener(object))
    }
}

/**
 * Function to convert an array of objects of same shape / dimensions to a csv string
 * @param {object[]} array - The array of objects 
 * @returns CSV string
 */
function objectArrayToCsv(array) {
    var rows = []
    var flattener = getObjectFlattener(array[0])
    var header_row = flattener["headers"]
    rows.push(header_row)
    array.forEach((frame) => {
        rows.push(flattener["mapper"](frame))
    })
    return rows.map( row => row.join(",") ).join("\n")
}

// Functions for track playback



/**
 * Function to replace the gesture from source hand pose to target hand pose
 * @param {object} sourcePose Pose to extract gesture from
 * @param {object} targetPose Pose to apply gesture to
 * @returns {object} Resulting hand pose
 */
function replaceGesture(sourcePose, targetPose) {
    // Extract source pose relative finger positions
    // Extract the transformation from wrist to finger joint from source pose
    // Set finger joint positions of resulting pose to be its represective wrist -> finger joint position using the transformations from previous step
    // Apply relative finger positions to target pose
    var resultPose = cloneDeep(targetPose)
    if (targetPose?.left_hand_pose?.wrist !== undefined && sourcePose?.left_hand_pose?.wrist !== undefined) {
        const sourceLeftWristInverse = new THREE.Matrix4.fromArray(sourcePose["left_hand_pose"]["wrist"]).invert()
        const targetLeftWrist = new THREE.Matrix4.fromArray(targetPose["left_hand_pose"]["wrist"])
        const sourceRightWristInverse = new THREE.Matrix4.fromArray(sourcePose["right_hand_pose"]["wrist"]).invert()
        const targetRightWrist = new THREE.Matrix4.fromArray(targetPose["left_hand_pose"]["wrist"])
        for (const [key, value] of Object.entries(sourcePose.left_hand_pose)) {web
            resultPose["left_hand_pose"][key] = new THREE.Matrix4().fromArray(value.matrix).multiply(sourceLeftWristInverse).multiply(targetLeftWrist)
        }
        for (const [key, value] of Object.entries(sourcePose.right_hand_pose)) {
            resultPose["right_hand_pose"][key] = new THREE.Matrix4().fromArray(value.matrix).multiply(sourceRightWristInverse).multiply(targetRightWrist)
        }
    }
    return resultPose
}

function countdown(n=3, bpm=60) {
    
}

const music = new THREE.Audio(window.listener)

var leftHand = Handy.hands.getLeft()
var rightHand = Handy.hands.getRight()
var leftTriggered = false
var rightTriggered = false
leftHand.addEventListener("peace pose began", (event) => {
    leftTriggered = true
})
rightHand.addEventListener("peace pose began", (event) => {
    rightTriggered = true
})

function recordTemplate(countdown=true, music_url, callback=(data)=>{}) {
    // Load music
    window.audioLoader.load(music_url, (buffer => {
        var playing = true
        music.setBuffer(music)
        music.setLoop(false)
        music.setVolume(1)
        music.play()
        music.onEnded = ()=>{
            playing = false
        }
        var left_gesture_id = 0
        var right_gesture_id = 0
        var data = []
        var camera = renderer.xr.getCamera()
        var firstUpdate = true
        sceneModifiers.push((destroy)=>{
            if (firstUpdate === true) {
                leftTriggered = false
                rightTriggered = false
                firstUpdate = false
            }
            if (leftTriggered === true) {
                left_gesture_id++
                leftTriggered = false
            }
            if (rightTriggered === true) {
                right_gesture_id++
                rightTriggered = false
            }
            var pose = {
                "left_hand_pose": serializeWrist(leftHand),
                "right_hand_pose": serializeWrist(rightHand),
                "head_pose": {
                    "matrix": camera.matrix.toArray()
                },
                "time": Date.now(), // Perhaps we could use the audio element time instead?
                "left_gesture_id": left_gesture_id,
                "right_gesture_id": right_gesture_id
            }
            data.push(pose)
            if (playing = false) {
                destroy()
                callback({
                    "music_url": music_url,
                    "data": data
                })
            }
        })
    }))
    // Show countdown
    // Record motion
    // Recognize gestures and mark as time to change gestures
    // Output object
}

function playbackTemplate(data) {

}

export {serializeJoints, applySerializedJoints, interpObj, recordHandMotion, playbackHandMotion, echoHands, download, objectArrayToCsv}