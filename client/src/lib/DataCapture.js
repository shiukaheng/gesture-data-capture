import * as THREE from "three"
import { serializeJoints, applySerializedJoints } from "./PoseUtils"
import { interpObj } from "./Interpolation"
import * as ObjectUtils from "./lib/ObjectUtils"

/**
 * Function for initiating hand motion recording
 * @param {number} duration - Recording duration in seconds 
 * @returns {Promise}
 */
function recordHandMotion(scene_modifiers, duration, left_hand, right_hand, camera) {
    return new Promise((resolve, reject) => {
        console.log("Recording!")
        var timer = new THREE.Clock()
        var protocol = null
        var data = []
        scene_modifiers.push((destroy)=>{
            var pose = {
                "left_hand_pose": serializeJoints(left_hand),
                "right_hand_pose": serializeJoints(right_hand),
                "head_pose": {
                    "matrix": camera.matrix.toArray()
                },
                "time": Date.now()
            }
            if (protocol === null) {
                protocol = ObjectUtils.createObjectDescriptor(pose)
            }
            data.push(ObjectUtils.flattenObject(pose, protocol))
            if (timer.getElapsedTime() >= duration) {
                destroy()
                resolve({
                    protocol: protocol,
                    flattened_data: data
                })
            }
        })
    })
}

/**
 * Function for playing back recorded hand motion data
 * @param {array} data - Recorded data for playback 
 * @returns {Promise}
 */
function playbackHandMotion(scene_modifiers, data, dummy_left_hand, dummy_right_hand) {
    return new Promise((resolve, reject) => {
        console.log("Playback in progress!")

        dummy_left_hand.visible = true
        dummy_right_hand.visible = true
    
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
        scene_modifiers.push((destroy)=>{
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
                dummy_left_hand.visible = false
                dummy_right_hand.visible = false
                resolve()
            } else {
                resultFrame = interpObj(data[frame], data[frame+1], (getTimeElapsed()-getVideoTimeElapsed(frame))/(data[frame+1]["time"]-data[frame]["time"]))
            }
            applySerializedJoints(dummy_left_hand, resultFrame["left_hand_pose"])
            applySerializedJoints(dummy_right_hand, resultFrame["right_hand_pose"])
        })        
    })
}

/**
 * Convenience function to quickly record and playback hand motion
 * @param {number} duration - Recording duration
 */
async function echoHands(duration=5) {
    var data = await recordHandMotion(duration, window.renderer.xr.getCamera(), window.Handy.hands.getLeft(), window.Handy.hands.getRight())
    await playbackHandMotion(data, window.dummy_left_hand, window.dummy_right_hand)
}

function recordTemplate(scene_modifiers, left_hand, right_hand, camera, music_url, audio_loader, audio_object) {
    var leftTriggered = false
    var rightTriggered = false
    return new Promise((resolve, reject) => {
        // Load music
        audio_loader.load(music_url, (buffer => {
            var playing = true
            audio_object.setBuffer(buffer)
            audio_object.setLoop(false)
            audio_object.setVolume(1)
            audio_object.play()
            audio_object.onEnded = ()=>{
                playing = false
            }
            var left_gesture_id = 0
            var right_gesture_id = 0
            var data = []
            var firstUpdate = true
            scene_modifiers.push((destroy)=>{
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
                    "left_hand_pose": serializeWrist(left_hand),
                    "right_hand_pose": serializeWrist(right_hand),
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
                    resolve({
                        "music_url": music_url,
                        "data": data
                    })
                }
            })
        }))
    })
    
}

function playbackTemplate(data) {

}

export {recordHandMotion, playbackHandMotion, echoHands, recordTemplate, playbackTemplate}