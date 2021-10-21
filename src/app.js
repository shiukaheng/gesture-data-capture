import * as THREE from "three"
import 'color-convert'
import { Handy } from 'handy.js'

import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js'
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js'
import { DummyXRHandModelFactory } from "./lib/DummyXRHandModel"

import * as TWEEN from "@tweenjs/tween.js"
import {Text, preloadFont} from 'troika-three-text'
import { once } from "lodash"

// Boilerplate

class App {
    constructor() {
        // Setup three.js elements
        this.Handy = Handy
        this.scene = new THREE.Scene()
        this.camera_group = new THREE.Group()
        this.listener = new THREE.AudioListener()
        this.camera = new THREE.PerspectiveCamera()
        this.camera_group.add(this.camera)
        this.scene.add(this.camera_group)
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
            Handy.update()
            this.scene_modifiers.forEach((x)=>{x(()=>{
                this.scene_modifiers = this.scene_modifiers.filter((modifier)=>{
                    return modifier !== x
                })
                console.log("Modifier terminated.")
            })})
        })

        // Setup controllers and hand tracking
        var controller1 = this.renderer.xr.getController( 0 );
        this.scene.add(controller1);
        var controller2 = this.renderer.xr.getController( 1 );
        this.scene.add(controller2);
        const controllerModelFactory = new XRControllerModelFactory();
        const handModelFactory = new XRHandModelFactory();
    
        // Hand 1
        var controllerGrip1 = this.renderer.xr.getControllerGrip( 0 );
        controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
        this.scene.add( controllerGrip1 );
        var hand1 = this.renderer.xr.getHand( 0 );
        this.scene.add( hand1 );
        hand1.add( handModelFactory.createHandModel( hand1, 'mesh' ) );
        this.Handy.makeHandy(hand1)
        
        // Hand 2
        var controllerGrip2 = this.renderer.xr.getControllerGrip( 1 );
        controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
        this.scene.add( controllerGrip2 );
        var hand2 = this.renderer.xr.getHand( 1 );
        this.scene.add( hand2 );
        hand2.add( handModelFactory.createHandModel( hand2, 'mesh' ) );
        this.Handy.makeHandy(hand2)
    
        // Create dummy hands pre-requisites
        this.dummy_factory = new DummyXRHandModelFactory()
        this.dummyHands = new THREE.Group()
        this.scene.add(this.dummyHands)
    
        // Create left dummy hand
        var dummy_left = this.dummy_factory.createHandModel("left")
        this.dummyHands.add(dummy_left)
        dummy_left.visible = false
    
        // Create right dummy hand
        var dummy_right = this.dummy_factory.createHandModel("right")
        this.dummyHands.add(dummy_right)
        dummy_right.visible = false

        // Create app states
        this.in_session = false
        this.hand_tracking_available = false
        var left_hand_available = false
        var right_hand_available = false
    
        const handtrackavailable = new Event("handtrackavailable")
        const handtrackunavailable = new Event("handtrackunavailable")
    
        this.renderer.xr.addEventListener("sessionstart", (event) => {
            console.log("Entered XR")
            this.renderer.xr.getSession().addEventListener("inputsourceschange", event => {
                // console.log("Input sources changed")
                event.added.forEach(inputSource => {
                    if (inputSource.profiles.includes("generic-hand")) {
                        if (inputSource.handedness === "left") {
                            left_hand_available = true
                        }
                        if (inputSource.handedness === "right") {
                            right_hand_available = true
                        }
                    }
                })
                event.removed.forEach(inputSource => {
                    if (inputSource.profiles.includes("generic-hand")) {
                        if (inputSource.handedness === "left") {
                            left_hand_available = false
                        }
                        if (inputSource.handedness === "right") {
                            right_hand_available = false
                        }
                    }
                })
                var new_hand_tracking_available = left_hand_available && right_hand_available
                if (this.hand_tracking_available !== new_hand_tracking_available) {
                    this.hand_tracking_available = new_hand_tracking_available
                    document.dispatchEvent(new CustomEvent("onhandtrackchange", {"detail": this.hand_tracking_available}))
                    if (this.hand_tracking_available=== true) {
                        document.dispatchEvent(handtrackavailable)
                    } else {
                        document.dispatchEvent(handtrackunavailable)
                    }
                }
            })
        })
    
        this.renderer.xr.addEventListener("sessionend", (event) => {
            console.log("Exited XR")
        })
    
        this.left_hand = this.Handy.hands.getLeft()
        this.right_hand = this.Handy.hands.getRight()
        this.dummy_left_hand = dummy_left
        this.dummy_right_hand = dummy_right

        // Setup three.js scene elements

        this.ambient_light = new THREE.AmbientLight()
        this.scene.add(this.ambient_light)
        var floor_geom = new THREE.PlaneGeometry(10, 10, 10, 10)
        var floor_mat = new THREE.MeshBasicMaterial({wireframe: true})
        this.floor = new THREE.Mesh(floor_geom, floor_mat)
        this.scene.add(this.floor)
        this.floor.rotation.x = Math.PI / 2

        this.hud_text = new Text()
        this.camera.add(this.hud_text)
        this.hud_text.fontSize = 0.05
        this.hud_text.position.set(0, 0, -1)
        this.hud_text.textAlign = "center"
        this.hud_text.anchorX = "center"
        this.hud_text.anchorY = "middle"
        this.hud_text.sync()

        this.welcome_text_element = document.getElementById("welcome-text")
        this.welcome_screen_element = document.getElementById("welcome-screen")
        this.current_session = null;
    }

    async onSessionStarted( session ) {
        session.addEventListener( 'end', onSessionEnded );
        await this.renderer.xr.setSession( session );
        this.current_session = session;
    }
    
    onSessionEnded( /*event*/ ) {
        this.current_session.removeEventListener( 'end', onSessionEnded );
        this.current_session = null;
    }

    oldstart() {
        console.log("1. Started flow")
        var flowValid = true
        // Show welcome screen to enter VR experience
        this.welcome_text_element.textContent = ""
        this.welcome_screen_element.style.backgroundColor = "white"
        this.welcome_screen_element.addEventListener("click", (clickevent) => {
            if (flowValid === true) {
                console.log("2. Clicked")
                const sessionInit = { optionalFeatures: [ 'local-floor', 'bounded-floor', 'hand-tracking', 'layers' ] };
                navigator.xr.requestSession( 'immersive-vr', sessionInit ).then( onSessionStarted );
                this.renderer.xr.addEventListener("sessionstart", (vrevent) => {
                    if (flowValid === true) {
                    // Prompt user for hand tracking
                    this.renderer.xr.addEventListener("sessionend", (vrevent2) => {
                        if (flowValid === true) {
                            // In the case that XR session ended, restart
                            startFlow()
                        }
                        flowValid = false
                    }, {once: true})
                    document.addEventListener("handtrackavailable", (handtrackevent) => {
                        if (flowValid === true) {
                            // Start experience once hand tracking is available
                            document.addEventListener("handtrackunavailable", (handtrackevent2) => {
                                if (flowValid === true) {
                                    // In the case that hand tracking was lost, restart
                                    startFlow()
                                }
                                flowValid = false
                            }, {once: true})
                        }
                    }, {once: true})}
                }, {once: true})
            }
        }, {once: true})
    }

    async start() {
        await this.loading_screen()
        await this.welcome_screen()
        try {
            await this.request_hand_tracking_screen()
            await this.tutorial()
            var data = await this.capture_screen()
            // Send data to server
            await this.normal_exit_screen()
        } catch (error) {
            await this.error_exit_screen(error)
        } finally {
            this.start()
        }
    }

    loading_screen() {
        return new Promise((resolve, reject) => {
            this.welcome_text_element.textContent = "LOADING..."
            this.welcome_screen_element.style.backgroundColor = "lightslategrey"
            // Loading stuff
            // TODO: Resolve if all loaded
            // TODO: Reject if some loading failed
        })
    }

    welcome_screen() {
        return new Promise((resolve, reject) => {
            this.welcome_text_element.textContent = "CLICK ANYWHERE TO START"
            this.welcome_screen_element.style.backgroundColor = "mintcream"
            this.welcome_screen_element.addEventListener("click", () => {
                // Request for XR session
                const sessionInit = { optionalFeatures: [ 'local-floor', 'bounded-floor', 'hand-tracking', 'layers' ] };
                navigator.xr.requestSession( 'immersive-vr', sessionInit ).then( onSessionStarted );
                // Resolve if the session does start
                this.renderer.xr.addEventListener("sessionstart", resolve, {once: true})
                // TODO: Reject if user declines XR request
            }, {once: true})
        })

    }

    request_hand_tracking_screen() {
        return new Promise((resolve, reject) => {
            this.welcome_text_element.textContent = "XR IN SESSION: WAITING FOR HAND TRACKING"
            this.welcome_screen_element.style.backgroundColor = "mintcream"
            this.hud_text.text = "WAITING FOR HAND TRACKING"
            this.hud_text.sync()
            // Resolve if hand tracking started or already is available
            if (this.hand_tracking_available) {
                resolve()
            } else {
                document.addEventListener("handtrackavailable", resolve, {once: true})
            }
            // Reject if XR session lost
            this.renderer.xr.addEventListener("sessionend", reject, {once: true})
        })
    }

    tutorial() {
        return new Promise((resolve, reject) => {
            this.welcome_text_element.textContent = "XR IN SESSION: TUTORIAL"
            this.welcome_screen_element.style.backgroundColor = "mintcream"
            // TODO: Resolve if done OR skipped
            // Reject if hand tracking lost OR session lost
            document.addEventListener("handtrackunavailable", reject, {once: true})
            this.renderer.xr.addEventListener("sessionend", reject, {once: true})
        })
    }

    capture_screen() {
        return new Promise((resolve, reject) => {
            this.welcome_text_element.textContent = "XR IN SESSION: CAPTURING"
            this.welcome_screen_element.style.backgroundColor = "mintcream"
            // Resolve if capture finished
            // Reject if hand tracking lost OR session lost
            document.addEventListener("handtrackunavailable", reject, {once: true})
            this.renderer.xr.addEventListener("sessionend", reject, {once: true})
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
    window.app = new App()
}, {once: true})