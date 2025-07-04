import * as THREE from 'three';

export class CharacterController {
    constructor(model, idleAnimation) {
        this.model = model;
        this.mixer = new THREE.AnimationMixer(model);
        this.animations = new Map();
        this.currentAction = null;
        this.currentState = 'idle';
        
        // Movement properties
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.speed = 0;
        this.maxSpeed = 8;
        this.acceleration = 20;
        this.deceleration = 15;
        this.rotationSpeed = 5;
        
        // Input state
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.isPointerLocked = false;
        
        // Character state
        this.isCrouching = false;
        this.isSprinting = false;
        this.isJumping = false;
        this.gravity = -30;
        this.jumpVelocity = 15;
        this.onGround = true;
        
        // Setup initial animation
        if (idleAnimation && idleAnimation.length > 0) {
            this.addAnimation('idle', idleAnimation[0]);
            this.playAnimation('idle');
        }
        
        // Setup input handlers
        this.setupInput();
        
        // Setup physics
        this.setupPhysics();
    }

    setupInput() {
        // Keyboard input
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
        
        // Mouse input
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement) {
                this.mouseX -= event.movementX * 0.002;
                this.mouseY -= event.movementY * 0.002;
                this.mouseY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.mouseY));
            }
        });
        
        // Pointer lock
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement !== null;
        });
    }

    setupPhysics() {
        // Create collision box for character
        this.collisionBox = new THREE.Box3();
        this.updateCollisionBox();
    }

    updateCollisionBox() {
        this.collisionBox.setFromObject(this.model);
        // Adjust collision box size
        this.collisionBox.expandByScalar(-0.5);
    }

    addAnimation(name, animation) {
        const action = this.mixer.clipAction(animation);
        action.setLoop(THREE.LoopRepeat);
        this.animations.set(name, action);
    }

    playAnimation(name) {
        if (this.currentAction) {
            this.currentAction.fadeOut(0.2);
        }
        
        const action = this.animations.get(name);
        if (action) {
            action.reset().fadeIn(0.2).play();
            this.currentAction = action;
            this.currentState = name;
        }
    }

    update(deltaTime) {
        this.handleInput();
        this.updateMovement(deltaTime);
        this.updateAnimation();
        this.mixer.update(deltaTime);
        this.updateCollisionBox();
    }

    handleInput() {
        // Reset direction
        this.direction.set(0, 0, 0);
        
        // Movement input
        if (this.keys['KeyW']) this.direction.z -= 1;
        if (this.keys['KeyS']) this.direction.z += 1;
        if (this.keys['KeyA']) this.direction.x -= 1;
        if (this.keys['KeyD']) this.direction.x += 1;
        
        // Normalize direction
        if (this.direction.length() > 0) {
            this.direction.normalize();
        }
        
        // Sprint input
        this.isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
        
        // Crouch input
        this.isCrouching = this.keys['ControlLeft'] || this.keys['ControlRight'];
        
        // Jump input
        if ((this.keys['Space'] || this.keys['KeyW']) && this.onGround) {
            this.velocity.y = this.jumpVelocity;
            this.onGround = false;
            this.isJumping = true;
        }
    }

    updateMovement(deltaTime) {
        // Calculate target speed based on input and state
        let targetSpeed = 0;
        if (this.direction.length() > 0) {
            if (this.isCrouching) {
                targetSpeed = this.maxSpeed * 0.3;
            } else if (this.isSprinting) {
                targetSpeed = this.maxSpeed * 1.5;
            } else {
                targetSpeed = this.maxSpeed * 0.7;
            }
        }
        
        // Apply acceleration/deceleration
        if (targetSpeed > this.speed) {
            this.speed = Math.min(targetSpeed, this.speed + this.acceleration * deltaTime);
        } else if (targetSpeed < this.speed) {
            this.speed = Math.max(targetSpeed, this.speed - this.deceleration * deltaTime);
        }
        
        // Calculate movement direction based on camera orientation
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mouseX);
        
        const right = new THREE.Vector3();
        right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();
        const forward = new THREE.Vector3();
        forward.crossVectors(new THREE.Vector3(0, 1, 0), right).normalize();
        
        // Apply movement
        this.velocity.x = (this.direction.x * right.x + this.direction.z * forward.x) * this.speed;
        this.velocity.z = (this.direction.x * right.z + this.direction.z * forward.z) * this.speed;
        
        // Apply gravity
        if (!this.onGround) {
            this.velocity.y += this.gravity * deltaTime;
        }
        
        // Update position
        this.model.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Ground collision
        if (this.model.position.y <= 0) {
            this.model.position.y = 0;
            this.velocity.y = 0;
            this.onGround = true;
            this.isJumping = false;
        }
        
        // Update rotation based on movement direction
        if (this.direction.length() > 0) {
            const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
            const currentRotation = this.model.rotation.y;
            let rotationDiff = targetRotation - currentRotation;
            
            // Handle rotation wrapping
            if (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
            if (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
            
            this.model.rotation.y += rotationDiff * this.rotationSpeed * deltaTime;
        }
    }

    updateAnimation() {
        let targetAnimation = 'idle';
        
        if (this.direction.length() > 0) {
            if (this.isCrouching) {
                // Determine crouch direction
                if (this.direction.z < 0) {
                    targetAnimation = 'crouch_walk';
                } else if (this.direction.z > 0) {
                    targetAnimation = 'crouch_walk_back';
                } else if (this.direction.x < 0) {
                    targetAnimation = 'crouch_walk_left';
                } else if (this.direction.x > 0) {
                    targetAnimation = 'crouch_walk_right';
                }
            } else if (this.isSprinting) {
                targetAnimation = 'sprint';
            } else {
                // Determine walk/run direction
                if (this.direction.z < 0) {
                    targetAnimation = 'walk';
                } else if (this.direction.z > 0) {
                    targetAnimation = 'walk_back';
                } else if (this.direction.x < 0) {
                    targetAnimation = 'run_left';
                } else if (this.direction.x > 0) {
                    targetAnimation = 'run_right';
                }
            }
        } else if (this.isCrouching) {
            targetAnimation = 'crouch_walk';
        }
        
        // Play animation if different from current
        if (targetAnimation !== this.currentState && this.animations.has(targetAnimation)) {
            this.playAnimation(targetAnimation);
        }
    }

    getPosition() {
        return this.model.position.clone();
    }

    getRotation() {
        return this.model.quaternion.clone();
    }

    getCurrentState() {
        return this.currentState;
    }

    getSpeed() {
        return this.speed;
    }

    getVelocity() {
        return this.velocity.clone();
    }
} 