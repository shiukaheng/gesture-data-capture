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

import "axios"
import axios from "axios"

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
    constructor(upload_endpoint) {
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
        this.upload_endpoint = upload_endpoint

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
        const handtrackunavailable = new Event("handtrackunavailable")

        var hand_connected_callback = (event) => {
            if (event.data.profiles.includes("generic-hand")) {
                if (event.data.handedness === "right") {
                    this.right_hand = event.target
                } else if (event.data.handedness === "left") {
                    this.left_hand = event.target
                } else {
                    throw "unrecognized handedness"
                }
            }
        }

        var hand_disconnected_callback = (event) => {
            if (event.target === this.left_hand) {
                this.left_hand = null
            }
            if (event.target === this.right_hand) {
                this.right_hand = null
            }
        }

        var new_hand_availability = false

        this.scene_modifiers.push((destroy) => {
            new_hand_availability = (this.left_hand?.joints && Object.values(this.left_hand.joints).length > 0 && this?.right_hand?.joints && Object.values(this.right_hand.joints).length > 0)
            // console.log(this?.left_hand?.joints, this?.right_hand?.joints, new_hand_availability)
            if (new_hand_availability !== this.hand_tracking_available) {
                if (new_hand_availability) {
                    document.dispatchEvent(new CustomEvent("handtrackavailable", {"detail": {"left_hand": this.left_hand, "right_hand": this.right_hand}}))
                    console.log("Hand tracking available!")
                } else {
                    document.dispatchEvent(handtrackunavailable)
                    console.log("Hand tracking lost!")
                }
                this.hand_tracking_available = new_hand_availability
            }
        })

        const preprocess_hand = (hand) => {
            hand.addEventListener("connected", hand_connected_callback)
            hand.addEventListener("disconnected", hand_disconnected_callback)
        }
    
        // Hand 1
        var controllerGrip1 = this.renderer.xr.getControllerGrip( 0 );
        controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
        this.scene.add( controllerGrip1 );
        var hand1 = this.renderer.xr.getHand( 0 );
        this.scene.add( hand1 );
        preprocess_hand(hand1)
        hand1.add( handModelFactory.createHandModel( hand1, 'mesh' ) );
        
        // Hand 2
        var controllerGrip2 = this.renderer.xr.getControllerGrip( 1 );
        controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
        this.scene.add( controllerGrip2 );
        var hand2 = this.renderer.xr.getHand( 1 );
        this.scene.add( hand2 );
        preprocess_hand(hand2)
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
        this.hud_text.font = "archivo-black-v10-latin-regular.woff"
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

        this.error_color = "salmon"
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

    setDOMText(text, background_color=null) {
        this.welcome_text_element.textContent = text
        if (background_color !== null) {
            this.welcome_screen_element.style.backgroundColor = background_color
        }
    }

    setHUDText(text) {
        this.hud_text.text = text
        this.hud_text.sync()
    }

    async start() {
        // Load assets first
        this.setDOMText("LOADING...", "lightslategrey")
        await this.load_assets()
        var data = await this.capture_loop()
        this.current_session.end()
        var upload_success = false
        // const config = {'Content-Type': 'application/json'};
        while (!upload_success) {
            this.setDOMText("UPLOADING DATA... 0%", "mintcream")
            try {
                await axios.request({
                    method: "post",
                    url: this.upload_endpoint,
                    data: data,
                    // headers: config,
                    onUploadProgress: (p) => {
                        this.setDOMText(`UPLOADING DATA... ${Math.round(p.loaded/p.total*100).toString()}%`)
                    },
                    httpsAgent: this.agent
                })
                upload_success = true
            } catch (error) {
                this.setDOMText("UPLOAD ERROR, CLICK ANYWHERE TO RETRY.", this.error_color)
                console.warn(error)
                await this.await_click(this.welcome_screen_element)
            }
        }
        this.setDOMText("DONE! THANKS FOR YOUR CONTRIBUTION.", "chartreuse")
    }

    async capture_loop() {
        // Ask users to enter VR [ ASSUMES USER WILL ACCEPT REQUEST ]
        this.setDOMText("CLICK ANYWHERE TO START", "mintcream")
        await this.await_click(this.welcome_screen_element)
        var user_allowed_xr = false
        while (!user_allowed_xr) {
            try {
                await this.request_vr()
                user_allowed_xr = true
            } catch(error) {
                if (error === "user declined") {
                    this.setDOMText("PLEASE ALLOW XR ACCESS", this.error_color)      
                } else {
                    throw error
                }
            }
        }

        var data_captured = false
        var data
        this.setHUDText("WAITING FOR HAND TRACKING")
        while (!data_captured) {
            try {
                await this.await_hand_tracking()
                data = await this.capture_screen()
                data_captured = true
            } catch(error) {
                if (error === "lost xr") {
                    this.setDOMText("XR SESSION LOST, CLICK TO RETRY", this.error_color)
                    this.await_click(this.welcome_screen_element)
                    data = this.capture_loop()
                } else if (error === "lost hand tracking") {
                    this.setHUDText("HAND TRACKING LOST, ENABLE HAND TRACKING AGAIN TO RETRY")
                } else {
                    throw error
                }
            }
        }
        return data
    }

    load_assets() {
        return new Promise((resolve, reject) => {
            var load_list = [
                new Promise((resolve, reject) => {
                    try {
                        preloadFont(
                            {
                                font: "archivo-black-v10-latin-regular.woff"
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

    request_vr() {
        return new Promise((resolve, reject) => {
            // Request for XR session
            const sessionInit = { optionalFeatures: [ 'local-floor', 'bounded-floor', 'hand-tracking', 'layers' ] };
            navigator.xr.requestSession( 'immersive-vr', sessionInit ).then(this.onSessionStarted).catch(()=>{reject("user declined")});
            // Resolve if the session does start
            this.renderer.xr.addEventListener("sessionstart", () => {resolve()}, {once: true})
            // TODO: Reject if user declines XR request
        })
    }

    await_click(dom_element) {
        return new Promise((resolve, reject) => {
            dom_element.addEventListener("click", () => {
                resolve()
            }, {once: true})
        })
    }

    await_hand_tracking() {
        return new Promise((resolve, reject) => {
            // Reject if XR session lost
            var lost_xr = ()=>{reject("lost xr")}
            this.renderer.xr.addEventListener("sessionend", lost_xr, {once: true})

            // Resolve if hand tracking started or already is available
            if (this.hand_tracking_available) {
                resolve()
            } else {
                document.addEventListener("handtrackavailable", (event) => {resolve()}, {once: true})
            }

            // Cancel event listener if all goes well
            this.renderer.xr.removeEventListener("sessionend", lost_xr)
        })
    }

    capture_screen() {
        return new Promise((resolve, reject) => {
            var [record_button, record_button_promise] = InteractiveElements.createButton(this.scene_modifiers, [this.left_hand, this.right_hand])
            record_button.position.z = -0.5
            record_button.position.y = -0.1
            record_button.position.x = 0.05
            this.camera.add(record_button)
            var cleanup = (error) => {
                record_button.cancel()
                reject(error)
            }

            // Reject if XR session lost or hand tracking lost
            var lost_xr = ()=>{cleanup("lost xr")}
            this.renderer.xr.addEventListener("sessionend", lost_xr, {once: true})
            var lost_hand_tracking = ()=>{cleanup("lost hand tracking")}
            document.addEventListener("handtrackunavailable", lost_hand_tracking, {once: true})

            // 3D elements
            this.hud_text.text = "PRESS SPHERE TO START CAPTURE"
            this.hud_text.sync()

            // Await button being pressed
            record_button_promise.then(() => {
                this.hud_text.text = "CAPTURING..."
                this.hud_text.sync()
                // Record data
                DataCapture.recordHandMotion(this.scene_modifiers, 30, this.left_hand, this.right_hand, this.camera).then((data) => {
                    this.renderer.xr.removeEventListener("sessionend", lost_xr)
                    document.removeEventListener("handtrackunavailable", lost_hand_tracking)
                    resolve(data)
                })
            }).catch(()=>{})
        })
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
    window.app = new App("/upload")
    window.app.start()
}, {once: true})