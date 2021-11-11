import * as THREE from "three"
import 'color-convert'

import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js'
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js'
// import { XRHandModelFactory } from "./lib/XRHandModelFactory"
import { DummyXRHandModelFactory } from "./lib/DummyXRHandModel"

import * as TWEEN from "@tweenjs/tween.js"
import {Text, preloadFont} from 'troika-three-text'

import * as DataCapture from "./lib/DataCapture"
import * as IO from "./lib/IO"
import * as Interpolation from "./lib/Interpolation"
import * as PoseUtils from "./lib/PoseUtils"
import * as ObjectUtils from "./lib/ObjectUtils"
import * as InteractiveElements from "./lib/InteractiveElements"

// Boilerplate

window.DataCapture = DataCapture
window.IO = IO
window.Interpolation = Interpolation
window.PoseUtils = PoseUtils
window.ObjectUtils = ObjectUtils
window.testObj = {a:"Hello", b:[1,2,3], c:{c1: [1,2,3], c2: {c21: "on9"}}}

function inspect(object) {
    console.log(object)
    return object
}

class App {
    constructor() {
        // Setup three.js elements
        this.scene = new THREE.Scene()
        this.camera_group = new THREE.Group()
        this.listener = new THREE.AudioListener()
        this.camera = new THREE.PerspectiveCamera()
        this.scene.add(this.camera)
        this.camera.add(this.listener)
        this.renderer = new THREE.WebGLRenderer({antialias: true})
        this.renderer.xr.enabled = true
        this.scene_modifiers = []
        this.audioLoader = new THREE.AudioLoader();
        this.music_player = new THREE.Audio(this.listener)

        // Setup viewport canvas and renderer
        document.getElementsByClassName("viewport-div")[0].appendChild(this.renderer.domElement)
        var on_window_resize = () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize( window.innerWidth, window.innerHeight );
        }
        window.addEventListener( 'resize', on_window_resize, false );
        on_window_resize()

        // Define animation loop
        this.renderer.setAnimationLoop(() => {
            this.renderer.render(this.scene, this.camera)
            this.scene_modifiers.forEach((x)=>{x(()=>{
                this.scene_modifiers = this.scene_modifiers.filter((modifier)=>{
                    return modifier !== x
                })
                // console.log("Modifier terminated.")
            })})
        })

        // Setup controllers and hand tracking
        var controller1 = this.renderer.xr.getController( 0 );
        this.scene.add(controller1);
        var controller2 = this.renderer.xr.getController( 1 );
        this.scene.add(controller2);
        const controllerModelFactory = new XRControllerModelFactory();
        const handModelFactory = new XRHandModelFactory();

        this.left_hand = null
        this.right_hand = null
        var hand_availablity = false
        const handtrackunavailable = new Event("handtrackunavailable")

        var check_hand_availablity = () => {
            var new_hand_availability = (this.left_hand !== null && this.right_hand !== null)
            if (hand_availablity !== new_hand_availability) {
                if (new_hand_availability) {
                    document.dispatchEvent(new CustomEvent("handtrackavailable", {"detail": {"left_hand": this.left_hand, "right_hand": this.right_hand}}))
                } else {
                    document.dispatchEvent(handtrackunavailable)
                }
                hand_availablity = new_hand_availability
            }
        }

        var hand_connected_callback = (controller, handedness) => {
            console.log("hand connected")
            if (handedness === "right") {
                this.right_hand = controller
            } else if (handedness === "left") {
                this.left_hand = controller
            } else {
                throw "unrecognized handedness"
            }
            check_hand_availablity()
        }

        var hand_disconnected_callback = (handedness) => {
            console.log("hand disconnected")
            if (handedness === "right") {
                this.right_hand = null
            } else if (handedness === "left") {
                this.left_hand = null
            } else {
                throw "unrecognized handedness"
            }
            check_hand_availablity()
        }
    
        // Hand 1
        var controllerGrip1 = this.renderer.xr.getControllerGrip( 0 );
        controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
        this.scene.add( controllerGrip1 );
        var hand1 = this.renderer.xr.getHand( 0 );
        this.scene.add( hand1 );
        hand1.addEventListener("connected", (event) => {if (event.data.profiles.includes("generic-hand")) {console.log(event);hand_connected_callback(hand1, event.data.handedness)}})
        hand1.addEventListener("disconnected", (event) => {if (event.data.profiles.includes("generic-hand")) {console.log(event); hand_disconnected_callback(event.data.handedness)}})
        hand1.add( handModelFactory.createHandModel( hand1, 'mesh' ) );
        
        // Hand 2
        var controllerGrip2 = this.renderer.xr.getControllerGrip( 1 );
        controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
        this.scene.add( controllerGrip2 );
        var hand2 = this.renderer.xr.getHand( 1 );
        this.scene.add( hand2 );
        hand2.addEventListener("connected", (event) => {if (event.data.profiles.includes("generic-hand")) {console.log(event);hand_connected_callback(hand2, event.data.handedness)}})
        hand2.addEventListener("disconnected", (event) => {if (event.data.profiles.includes("generic-hand")) {console.log(event); hand_disconnected_callback(event.data.handedness)}})
        hand2.add( handModelFactory.createHandModel( hand2, 'mesh' ) );
    
        // Create dummy hands pre-requisites
        this.dummy_factory = new DummyXRHandModelFactory()
        this.dummyHands = new THREE.Group()
        this.scene.add(this.dummyHands)
    
        // Create left dummy hand
        this.dummy_left_hand = this.dummy_factory.createHandModel("left")
        this.dummyHands.add(this.dummy_left_hand)
        this.dummy_left_hand.visible = false
    
        // Create right dummy hand
        this.dummy_right_hand = this.dummy_factory.createHandModel("right")
        this.dummyHands.add(this.dummy_right_hand)
        this.dummy_right_hand.visible = false

        // Create app states
        this.in_session = false
        this.hand_tracking_available = false
    
        this.renderer.xr.addEventListener("sessionend", (event) => {
            console.log("Exited XR")
        })
    
        this.left_hand = null
        this.right_hand = null

        // Setup three.js scene elements

        this.ambient_light = new THREE.AmbientLight()
        this.ambient_light.intensity = 0.2
        this.scene.add(this.ambient_light)
        this.directional_light = new THREE.DirectionalLight()
        this.scene.add(this.directional_light)
        var floor_geom = new THREE.PlaneGeometry(10, 10, 10, 10)
        var floor_mat = new THREE.MeshBasicMaterial({wireframe: true})
        this.floor = new THREE.Mesh(floor_geom, floor_mat)
        this.scene.add(this.floor)
        this.floor.rotation.x = Math.PI / 2

        this.hud_text = new Text()
        this.camera.add(this.hud_text)
        this.hud_text.fontSize = 0.08
        this.hud_text.font = "./archivo-black-v10-latin-regular.woff"
        this.hud_text.position.set(0, 0, -2)
        this.hud_text.textAlign = "center"
        this.hud_text.anchorX = "center"
        this.hud_text.anchorY = "middle"
        this.hud_text.sync()

        this.welcome_text_element = document.getElementById("welcome-text")
        this.welcome_screen_element = document.getElementById("welcome-screen")
        this.current_session = null;

        this.onSessionStarted = this.onSessionStarted.bind(this)
        this.onSessionEnded = this.onSessionEnded.bind(this)
    }

    async onSessionStarted( session ) {
        session.addEventListener( 'end', this.onSessionEnded );
        await this.renderer.xr.setSession( session );
        this.current_session = session;
    }
    
    onSessionEnded( /*event*/ ) {
        this.current_session.removeEventListener( 'end', this.onSessionEnded );
        this.current_session = null;
    }

    async start() {
        console.log("Loop started.")
        await this.loading_screen()
        console.log("Loaded.")
        await this.welcome_screen()
        console.log("Entered vr.")
        await this.request_hand_tracking_screen()
        console.log("Hand tracking detected.")
        console.log({"left": this.left_hand, "right": this.right_hand})
        await this.capture_screen()
        console.log
        // console.log("Data recorded.")
        // await this.upload_screen()
        // console.log("Data uploaded.")
        console.log("Done.")
    }

    loading_screen() {
        return new Promise((resolve, reject) => {
            var load_list = [
                new Promise((resolve, reject) => {
                    try {
                        preloadFont(
                            {
                                font: "./archivo-black-v10-latin-regular.woff"
                            },
                            () => {
                                resolve()
                            }
                        )
                        } catch (e) {

                        }
                })
            ]
            Promise.all(load_list).then(() => {
                resolve()
            })
        })
    }

    welcome_screen() {
        return new Promise((resolve, reject) => {
            console.log("Waiting for a click.")
            this.welcome_screen_element.addEventListener("click", () => {
                // Request for XR session
                console.log("Requesting for XR session.")
                const sessionInit = { optionalFeatures: [ 'local-floor', 'bounded-floor', 'hand-tracking', 'layers' ] };
                navigator.xr.requestSession( 'immersive-vr', sessionInit ).then( this.onSessionStarted );
                // Resolve if the session does start
                this.renderer.xr.addEventListener("sessionstart", () => {resolve()}, {once: true})
                // TODO: Reject if user declines XR request
            }, {once: true})
        })
    }

    request_hand_tracking_screen() {
        return new Promise((resolve, reject) => {
            // Resolve if hand tracking started or already is available
            if (this.hand_tracking_available) {
                console.log(renderer.xr.getHand( 0 ), renderer.xr.getHand( 1 ))
                resolve()
            } else {
                document.addEventListener("handtrackavailable", (event) => {resolve()}, {once: true})
            }
            // Reject if XR session lost
            this.renderer.xr.addEventListener("sessionend", reject, {once: true})
        })
    }

    async capture_screen() {
        this.welcome_text_element.textContent = "XR IN SESSION: CAPTURING"
        this.welcome_screen_element.style.backgroundColor = "mintcream"
        var [record_button, record_button_promise] = InteractiveElements.createButton(this.scene_modifiers, [this.left_hand, this.right_hand])
        this.scene.add(record_button)
        console.log(record_button)
        record_button.position.z = -2
        record_button.position.x = 1
        var cleanup = (error) => {
            record_button.cancel()
            throw(error)
        }
        // Reject if hand tracking lost OR session lost
        document.addEventListener("handtrackunavailable", cleanup, {once: true})
        this.renderer.xr.addEventListener("sessionend", cleanup, {once: true})
        try {
            await record_button_promise
            data = await DataCapture.recordHandMotion(30, this.left_hand, this.right_hand, this.camera)
            return data
        } catch(error) {
            record_button.cancel()
            throw(error)
        }
    }

    error_exit_screen(message) {
        return new Promise((resolve, reject) => {
            this.welcome_text_element.textContent = message
            this.welcome_screen_element.style.backgroundColor = "salmon"
            // Resolve if user clicks screen
        }) 
    }

    normal_exit_screen() {
        return new Promise((resolve, reject) => {
            this.welcome_text_element.textContent = "CLICK ANYWHERE TO RESTART"
            this.welcome_screen_element.style.backgroundColor = "lightblue"
            // Resolve if user clicks screen
        })
    }
}

document.addEventListener("DOMContentLoaded", ()=>{
    window.app = new App()
    window.app.start()
}, {once: true})