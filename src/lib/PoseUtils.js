import * as THREE from "three"
import {cloneDeep, mapValues} from "lodash"

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

/**
 * Function to replace hand gestures in target a pose from another source pose
 * @param {object} sourcePose - Source pose from {@link serializeJoints}
 * @param {object} targetPose - Target pose from {@link serializeJoints}
 * @returns {object} Target pose with source pose gesture replaced
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

function matrixObjectToPositionQuaternion(object) {
    var matrix = new THREE.Matrix4().fromArray(object.matrix)
    return {
        "position": new THREE.Vector3().setFromMatrixPosition(matrix),
        "quaternion": new THREE.Quaternion.setFromMatrixPosition(matrix)
    }
}

function poseMatrixToPositionQuaternion(pose) {
    for (const key in pose) {
        if (["left_hand_pose", "right_hand_pose"].includes(key)) {
            pose[key] = mapValues(pose[key], matrixObjectToPositionQuaternion)
        }
        if (key === "head_pose") {
            pose[key] = matrixObjectToPositionQuaternion(pose[key])
        }
    }
    return pose
}

export {serializeJoints, serializeWrist, applySerializedJoints, replaceGesture, poseMatrixToPositionQuaternion}