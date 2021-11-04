import * as THREE from "three"

function linear_scaler(x, max, min) {
    return (x-min)/(max-min)
}

function proximity_animation(x, start_threshold, accept_threshold) {
    x = linear_scaler(x, start_threshold, accept_threshold)
    if (x <= 0) {
        return 1
    } else if (x >= 1) {
        return 0
    } else {
        return (Math.cos(x*Math.PI)+1.)/2.
    }
}

function samplePointInFrustum(horizontal_fov, vertical_fov, max_distance) {
    const horizontal_deg = Math.random() * horizontal_fov - horizontal_fov / 2
    const vertical_deg = Math.random() * vertical_fov - vertical_fov / 2
    const distance = Math.random() * max_distance
    return
}

var target_vec = new THREE.Vector3()
var monitored_vec = new THREE.Vector3()

function nearest_dist(target_object, monitored_objects) {
    return Math.min(monitored_objects.map((monitored_object) => {
        target_object.getWorldPosition(target_vec).distanceTo(monitored_object.getWorldPosition(monitored_vec))
    }))
}

/**
 * Create VR hand controlled button
 */
function createButton(scene_modifiers, monitored_objects) {
    var internal_size = 0.1
    var internal_size_effector = 1
    var external_size = 0.5
    var external_size_effector = 1
    var destroy_scaler = 1
    const destroy_animation_time = 0.2
    const accept_threshold = 0.5
    const start_threshold = 1
    const external_sphere_interaction_scaler = 1
    var pressed = false
    var time_pressed = null
    const button = new THREE.Object3D()
    const external_sphere_geom = new THREE.SphereGeometry(external_size, 20, 20)
    const external_sphere_mat = new THREE.MeshBasicMaterial({opacity: 0.5})
    const external_sphere = new THREE.Mesh(external_sphere_geom, external_sphere_mat)
    const internal_sphere_geom = new THREE.SphereGeometry(internal_size, 10, 10)
    const internal_sphere_mat = new THREE.MeshBasicMaterial()
    const internal_sphere = new THREE.Mesh(internal_sphere_geom, internal_sphere_mat)
    button.add(internal_sphere)
    button.add(external_sphere)
    button.cancel = () => {
        pressed = true
    }
    var dist
    return [button, new Promise((resolve, reject) => {
        scene_modifiers.push((destroy) => {
            if (button.parent !== undefined) {
                dist = nearest_dist(button, monitored_objects)
            } else {
                dist = Infinity
            }
            if (dist < accept_threshold) {
                pressed = true
                time_pressed = Date.now()
                resolve()
            }
            if (!pressed) {
                external_size_effector = proximity_animation(dist, start_threshold, accept_threshold)*external_sphere_interaction_scaler
            } else {
                destroy_scaler = proximity_animation(Date.now(), time_pressed+destroy_animation_time*1000, time_pressed)
            }
            if (destroy_scaler <= 0) {
                button.removeFromParent()
                destroy()
                reject()
            }
            external_sphere.scale.set(external_size_effector*destroy_scaler)
            internal_sphere.scale.set(internal_size_effector*destroy_scaler)
        })
    })]
}

function sleep(seconds, callback_content, callback) {
    return new Promise(resolve => setTimeout(()=>{resolve; callback(callback_content)}, seconds*1000));
}

function createCountdown(seconds=3, on_update=(number)=>{}) {
    max_seconds = seconds
    seconds = Math.round(seconds)
    countdown_intervals = []
    while (seconds >= 0) {
        countdown_intervals.push(seconds)
        seconds--
    }
    countdown_promises = countdown_intervals.map((seconds) => sleep(seconds, max_seconds-seconds, on_update))
    return
}

export {createButton, createCountdown}