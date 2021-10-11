import * as THREE from "three"
import { XRHandPrmitiveModel } from 'three/examples/jsm/webxr/XRHandPrimitiveModel.js';
import { XRHandMeshModel } from 'three/examples/jsm/webxr/XRHandMeshModel.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const DEFAULT_HAND_PROFILE_PATH = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand/';

class DummyXRHandModel extends THREE.Object3D {
    constructor() {
        super()
        this.motionController = null
        this.envMap = null
        this.mesh = null
    }
}

class DummyXRHandMeshModel {
    constructor(handModel, path, handedness, callback=()=>{}) {
        this.handModel = handModel;

		this.bones = [];

		const loader = new GLTFLoader();
		loader.setPath( path || DEFAULT_HAND_PROFILE_PATH );
		loader.load( `${handedness}.glb`, gltf => {

			const object = gltf.scene.children[ 0 ];
			this.handModel.add( object );

			const mesh = object.getObjectByProperty( 'type', 'SkinnedMesh' );
			mesh.frustumCulled = false;
			mesh.castShadow = true;
			mesh.receiveShadow = true;

			const joints = [
				'wrist',
				'thumb-metacarpal',
				'thumb-phalanx-proximal',
				'thumb-phalanx-distal',
				'thumb-tip',
				'index-finger-metacarpal',
				'index-finger-phalanx-proximal',
				'index-finger-phalanx-intermediate',
				'index-finger-phalanx-distal',
				'index-finger-tip',
				'middle-finger-metacarpal',
				'middle-finger-phalanx-proximal',
				'middle-finger-phalanx-intermediate',
				'middle-finger-phalanx-distal',
				'middle-finger-tip',
				'ring-finger-metacarpal',
				'ring-finger-phalanx-proximal',
				'ring-finger-phalanx-intermediate',
				'ring-finger-phalanx-distal',
				'ring-finger-tip',
				'pinky-finger-metacarpal',
				'pinky-finger-phalanx-proximal',
				'pinky-finger-phalanx-intermediate',
				'pinky-finger-phalanx-distal',
				'pinky-finger-tip',
			];

			joints.forEach( jointName => {

				const bone = object.getObjectByName( jointName );

				if ( bone !== undefined ) {

					bone.jointName = jointName;

				} else {

					console.warn( `Couldn't find ${jointName} in ${handedness} hand mesh` );

				}

				this.bones.push( bone );

			} );
            callback()

		} );

    }
    updateMesh(XRJoints) {
        for ( let i = 0; i < this.bones.length; i ++ ) {

			const bone = this.bones[ i ];

			if ( bone ) {

				const XRJoint = XRJoints[ bone.jointName ];

				if ( XRJoint.visible ) {

					const position = XRJoint.position;

					if ( bone ) {

						bone.position.copy( position );
						bone.quaternion.copy( XRJoint.quaternion );
						// bone.scale.setScalar( XRJoint.jointRadius || defaultRadius );

					}

				}

			}

		}
    }
}

class DummyXRHandModelFactory {
    constructor() {
        this.path = null
    }
    setPath(path) {
        this.path = path
        return this
    }
    createHandModel(handedness, callback=()=>{}) {
        const handModel = new DummyXRHandModel()
        handModel.motionController = new DummyXRHandMeshModel(handModel, this.path, handedness, callback)
        return handModel
    }
}

export { DummyXRHandMeshModel, DummyXRHandModel, DummyXRHandModelFactory };