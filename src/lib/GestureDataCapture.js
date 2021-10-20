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

// Functions for track playback

function countdown(n=3, bpm=60) {
    
}

var leftHand = Handy.hands.getLeft()
var rightHand = Handy.hands.getRight()
var leftTriggered = false
var rightTriggered = false

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

export {initialize, serializeJoints, applySerializedJoints, interpObj, recordHandMotion, playbackHandMotion, echoHands, download, objectArrayToCsv}