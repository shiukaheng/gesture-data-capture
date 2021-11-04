import * as DummyXRHandModel from "./lib/DummyXRHandModel"
import * as THREE from "three"
import * as DataCapture from "./lib/DataCapture"
import * as InteractiveElements from "./lib/InteractiveElements"
import * as IO from "./lib/IO"
import * as ObjectUtils from "./lib/ObjectUtils"
import * as PoseUtils from "./lib/PoseUtils"

function inspect(object) {
    console.log(object)
    return object
}

async function test(app) {

    // Create fake hands for testing
    if (!app.hand_tracking_available) {
        app.left_hand = app.dummy_factory.createHandModel("left")
        app.right_hand = app.dummy_factory.createHandModel("right")
        app.scene.add(app.left_hand)
        app.scene.add(app.right_hand)
    }

    // DataCapture.js

    // recordHandMotion
    var data = await DataCapture.recordHandMotion(app.scene_modifiers, 1, app.left_hand, app.right_hand, app.camera)

    // playbackHandMotion
    await DataCapture.playbackHandMotion(app.scene_modifiers, data, app.dummy_left_hand, app.dummy_right_hand)

    // recordTemplate - UNUSED FOR NOW

    // playbackTemplate - UNUSED FOR NOW

    // InteractiveElements.js
    var [record_button, record_button_promise] = InteractiveElements.createButton(app.scene_modifiers, inspect([app.left_hand, app.right_hand]))
    app.scene.add(record_button)
    await record_button_promise

    // createButton

    console.log("Test done.")
}

export {test}




