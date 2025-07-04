import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class CharacterController {
    constructor(scene, onLoaded) {
        this.scene = scene;
        this.character = null;
        this.mixer = null;
        this.animations = {};
        this.currentAnimation = null;
        this.loader = new GLTFLoader();
        this.onLoaded = onLoaded;
        this.speed = 5; // Units per second
        this.loadCharacter();
    }

    loadCharacter() {
        this.loader.load('./biped/Animation_Idle_4_withSkin.glb', (gltf) => {
            this.character = gltf.scene;
            this.character.scale.set(1, 1, 1);
            this.character.position.set(0, 0, 0);
            this.character.rotation.y = 0;
            this.character.castShadow = true;
            this.scene.add(this.character);

            this.mixer = new THREE.AnimationMixer(this.character);
            this.animations.idle = this.mixer.clipAction(gltf.animations[0]);
            this.animations.idle.play();
            this.currentAnimation = 'idle';

            this.loadAnimations();
            if (this.onLoaded) this.onLoaded();
        });
    }

    loadAnimations() {
        const animationFiles = [
            { name: 'walk', file: './biped/Animation_Walking_withSkin.glb' },
            { name: 'run', file: './biped/Animation_Running_withSkin.glb' },
            { name: 'sprint', file: './biped/Animation_Lean_Forward_Sprint_inplace_withSkin.glb' },
            { name: 'crouch_walk', file: './biped/Animation_Cautious_Crouch_Walk_Forward_inplace_withSkin.glb' }
        ];
        let loadedCount = 0;
        animationFiles.forEach(({ name, file }) => {
            this.loader.load(file, (gltf) => {
                this.animations[name] = this.mixer.clipAction(gltf.animations[0]);
                loadedCount++;
            });
        });
    }

    update(deltaTime) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    }

    moveForward(deltaTime) {
        if (!this.character) return;
        
        // Calculate forward direction based on character's rotation
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(this.character.quaternion);
        
        // Move character forward
        this.character.position.add(direction.multiplyScalar(this.speed * deltaTime));
        
        // Change animation to walk if not already walking
        if (this.currentAnimation !== 'walk' && this.animations.walk) {
            this.setAnimation('walk');
        }
    }

    stopMoving() {
        if (this.currentAnimation !== 'idle') {
            this.setAnimation('idle');
        }
    }

    setAnimation(animationName) {
        if (!this.animations[animationName] || this.currentAnimation === animationName) return;
        
        // Stop current animation
        if (this.currentAnimation && this.animations[this.currentAnimation]) {
            this.animations[this.currentAnimation].stop();
        }
        
        // Start new animation
        this.animations[animationName].play();
        this.currentAnimation = animationName;
    }

    updatePosition(position) {
        if (!this.character) return;
        this.character.position.set(position.x, position.y, position.z);
    }

    updateAnimation(animationName) {
        this.setAnimation(animationName);
    }

    getCharacter() {
        return this.character;
    }
} 