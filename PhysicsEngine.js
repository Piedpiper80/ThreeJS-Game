import * as THREE from 'three';

export class PhysicsEngine {
    constructor(scene) {
        this.scene = scene;
        this.gravity = new THREE.Vector3(0, -9.81, 0);
        this.physicsBodies = new Map();
        this.collisionObjects = [];
        this.interactableObjects = [];
        this.groundLevel = 0;
        
        // Physics settings
        this.timeStep = 1/60;
        this.maxSubSteps = 3;
        this.damping = 0.95;
        this.friction = 0.8;
        
        // Collision detection settings
        this.raycastLength = 2.0;
        this.skinWidth = 0.1;
        
        this.init();
    }

    init() {
        // Setup raycaster for collision detection
        this.raycaster = new THREE.Raycaster();
        this.tempVector = new THREE.Vector3();
        this.tempVector2 = new THREE.Vector3();
        this.tempMatrix = new THREE.Matrix4();
        
        // Initialize collision geometries
        this.initializeCollisionObjects();
    }

    initializeCollisionObjects() {
        // Scan scene for collision objects
        this.scene.traverse((child) => {
            if (child.isMesh && child.geometry) {
                // Mark objects as collision objects based on their material or name
                if (child.material.name === 'obstacle' || 
                    child.name.includes('obstacle') ||
                    child.name.includes('wall') ||
                    child.geometry.type === 'BoxGeometry') {
                    this.addCollisionObject(child);
                }
                
                // Mark interactable objects
                if (child.name.includes('item') || 
                    child.name.includes('pickup') ||
                    child.userData.interactable) {
                    this.addInteractableObject(child);
                }
            }
        });
    }

    addCollisionObject(mesh) {
        const collisionData = {
            mesh: mesh,
            boundingBox: new THREE.Box3().setFromObject(mesh),
            type: 'static'
        };
        this.collisionObjects.push(collisionData);
    }

    addInteractableObject(mesh) {
        const interactableData = {
            mesh: mesh,
            boundingBox: new THREE.Box3().setFromObject(mesh),
            type: mesh.userData.type || 'item',
            collected: false
        };
        this.interactableObjects.push(interactableData);
    }

    createRigidBody(mesh, options = {}) {
        const bodyData = {
            mesh: mesh,
            velocity: new THREE.Vector3(),
            acceleration: new THREE.Vector3(),
            mass: options.mass || 1.0,
            isStatic: options.isStatic || false,
            useGravity: options.useGravity !== false,
            damping: options.damping || this.damping,
            friction: options.friction || this.friction,
            boundingBox: new THREE.Box3().setFromObject(mesh),
            onGround: false,
            collisionRadius: options.collisionRadius || 0.5
        };
        
        this.physicsBodies.set(mesh.uuid, bodyData);
        return bodyData;
    }

    removeRigidBody(mesh) {
        this.physicsBodies.delete(mesh.uuid);
    }

    // Main physics update loop
    update(deltaTime) {
        const clampedDeltaTime = Math.min(deltaTime, 1/30); // Prevent large time steps
        
        for (let body of this.physicsBodies.values()) {
            if (!body.isStatic) {
                this.updateRigidBody(body, clampedDeltaTime);
            }
        }
        
        this.handleCollisions();
        this.updateInteractions();
    }

    updateRigidBody(body, deltaTime) {
        // Apply gravity
        if (body.useGravity) {
            body.acceleration.add(this.gravity);
        }
        
        // Update velocity
        this.tempVector.copy(body.acceleration).multiplyScalar(deltaTime);
        body.velocity.add(this.tempVector);
        
        // Apply damping
        body.velocity.multiplyScalar(body.damping);
        
        // Store old position for collision resolution
        const oldPosition = body.mesh.position.clone();
        
        // Update position
        this.tempVector.copy(body.velocity).multiplyScalar(deltaTime);
        body.mesh.position.add(this.tempVector);
        
        // Ground collision
        if (body.mesh.position.y <= this.groundLevel + body.collisionRadius) {
            body.mesh.position.y = this.groundLevel + body.collisionRadius;
            if (body.velocity.y < 0) {
                body.velocity.y = 0;
                body.onGround = true;
            }
        } else {
            body.onGround = false;
        }
        
        // Reset acceleration
        body.acceleration.set(0, 0, 0);
        
        // Update bounding box
        body.boundingBox.setFromObject(body.mesh);
    }

    // Collision detection and resolution
    handleCollisions() {
        for (let body of this.physicsBodies.values()) {
            if (body.isStatic) continue;
            
            // Check collision with static objects
            for (let collisionObj of this.collisionObjects) {
                if (this.checkCollision(body, collisionObj)) {
                    this.resolveCollision(body, collisionObj);
                }
            }
            
            // Check collision with other dynamic bodies
            for (let otherBody of this.physicsBodies.values()) {
                if (otherBody === body || otherBody.isStatic) continue;
                
                if (this.checkCollision(body, otherBody)) {
                    this.resolveDynamicCollision(body, otherBody);
                }
            }
        }
    }

    checkCollision(bodyA, bodyB) {
        return bodyA.boundingBox.intersectsBox(bodyB.boundingBox);
    }

    resolveCollision(body, obstacle) {
        const bodyCenter = body.boundingBox.getCenter(new THREE.Vector3());
        const obstacleCenter = obstacle.boundingBox.getCenter(new THREE.Vector3());
        
        // Calculate separation vector
        const separation = bodyCenter.clone().sub(obstacleCenter);
        
        // Calculate overlap
        const bodySize = body.boundingBox.getSize(new THREE.Vector3());
        const obstacleSize = obstacle.boundingBox.getSize(new THREE.Vector3());
        
        const overlapX = (bodySize.x + obstacleSize.x) / 2 - Math.abs(separation.x);
        const overlapY = (bodySize.y + obstacleSize.y) / 2 - Math.abs(separation.y);
        const overlapZ = (bodySize.z + obstacleSize.z) / 2 - Math.abs(separation.z);
        
        // Find minimum overlap axis
        let minOverlap = Math.abs(overlapX);
        let separationAxis = new THREE.Vector3(Math.sign(separation.x), 0, 0);
        
        if (Math.abs(overlapY) < minOverlap) {
            minOverlap = Math.abs(overlapY);
            separationAxis.set(0, Math.sign(separation.y), 0);
        }
        
        if (Math.abs(overlapZ) < minOverlap) {
            minOverlap = Math.abs(overlapZ);
            separationAxis.set(0, 0, Math.sign(separation.z));
        }
        
        // Separate objects
        const separationDistance = (minOverlap + this.skinWidth) * separationAxis.length();
        body.mesh.position.add(separationAxis.multiplyScalar(separationDistance));
        
        // Adjust velocity based on collision normal
        const velocityDotNormal = body.velocity.dot(separationAxis);
        if (velocityDotNormal < 0) {
            body.velocity.add(separationAxis.multiplyScalar(-velocityDotNormal * body.friction));
        }
        
        // Update bounding box
        body.boundingBox.setFromObject(body.mesh);
    }

    resolveDynamicCollision(bodyA, bodyB) {
        const centerA = bodyA.boundingBox.getCenter(new THREE.Vector3());
        const centerB = bodyB.boundingBox.getCenter(new THREE.Vector3());
        
        const separation = centerA.clone().sub(centerB);
        const distance = separation.length();
        
        if (distance > 0) {
            separation.normalize();
            
            // Separate objects
            const separationDistance = (bodyA.collisionRadius + bodyB.collisionRadius - distance + this.skinWidth) / 2;
            bodyA.mesh.position.add(separation.clone().multiplyScalar(separationDistance));
            bodyB.mesh.position.add(separation.clone().multiplyScalar(-separationDistance));
            
            // Exchange velocities (simplified elastic collision)
            const relativeVelocity = bodyA.velocity.clone().sub(bodyB.velocity);
            const velocityAlongNormal = relativeVelocity.dot(separation);
            
            if (velocityAlongNormal > 0) return; // Objects separating
            
            const restitution = 0.5;
            const impulse = (1 + restitution) * velocityAlongNormal / (bodyA.mass + bodyB.mass);
            
            bodyA.velocity.add(separation.clone().multiplyScalar(-impulse * bodyB.mass));
            bodyB.velocity.add(separation.clone().multiplyScalar(impulse * bodyA.mass));
        }
        
        // Update bounding boxes
        bodyA.boundingBox.setFromObject(bodyA.mesh);
        bodyB.boundingBox.setFromObject(bodyB.mesh);
    }

    // Interaction system
    updateInteractions() {
        for (let body of this.physicsBodies.values()) {
            this.checkInteractions(body);
        }
    }

    checkInteractions(body) {
        for (let interactable of this.interactableObjects) {
            if (interactable.collected) continue;
            
            const distance = body.mesh.position.distanceTo(interactable.mesh.position);
            if (distance < 2.0) { // Interaction range
                this.handleInteraction(body, interactable);
            }
        }
    }

    handleInteraction(body, interactable) {
        // Trigger interaction based on type
        switch (interactable.type) {
            case 'item':
                this.collectItem(body, interactable);
                break;
            case 'trigger':
                this.activateTrigger(body, interactable);
                break;
            default:
                console.log('Unknown interaction type:', interactable.type);
        }
    }

    collectItem(body, item) {
        if (!item.collected) {
            item.collected = true;
            
            // Add pickup animation
            this.animatePickup(item.mesh);
            
            // Remove from scene after animation
            setTimeout(() => {
                this.scene.remove(item.mesh);
            }, 500);
            
            // Trigger pickup event
            this.onItemCollected?.(item);
        }
    }

    animatePickup(mesh) {
        const startY = mesh.position.y;
        const targetY = startY + 2;
        const duration = 500;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            mesh.position.y = startY + (targetY - startY) * progress;
            mesh.rotation.y += 0.1;
            mesh.scale.setScalar(1 - progress * 0.5);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    activateTrigger(body, trigger) {
        // Trigger activation logic
        this.onTriggerActivated?.(trigger, body);
    }

    // Advanced collision detection with raycasting
    raycastCollision(origin, direction, maxDistance = 10) {
        this.raycaster.set(origin, direction);
        
        const meshes = this.collisionObjects.map(obj => obj.mesh);
        const intersects = this.raycaster.intersectObjects(meshes);
        
        if (intersects.length > 0 && intersects[0].distance <= maxDistance) {
            return {
                hit: true,
                point: intersects[0].point,
                normal: intersects[0].face.normal,
                distance: intersects[0].distance,
                object: intersects[0].object
            };
        }
        
        return { hit: false };
    }

    // Ground detection using raycast
    checkGround(position, maxDistance = 2.0) {
        const rayOrigin = position.clone();
        const rayDirection = new THREE.Vector3(0, -1, 0);
        
        return this.raycastCollision(rayOrigin, rayDirection, maxDistance);
    }

    // Character-specific physics methods
    applyForce(body, force) {
        this.tempVector.copy(force).divideScalar(body.mass);
        body.acceleration.add(this.tempVector);
    }

    applyImpulse(body, impulse) {
        this.tempVector.copy(impulse).divideScalar(body.mass);
        body.velocity.add(this.tempVector);
    }

    // Ragdoll physics setup
    createRagdoll(characterMesh, bones) {
        const ragdollData = {
            character: characterMesh,
            bones: new Map(),
            joints: [],
            isActive: false
        };
        
        // Create physics bodies for each bone
        bones.forEach(bone => {
            const boneBody = {
                bone: bone,
                velocity: new THREE.Vector3(),
                acceleration: new THREE.Vector3(),
                mass: 1.0,
                damping: 0.8
            };
            ragdollData.bones.set(bone.uuid, boneBody);
        });
        
        return ragdollData;
    }

    activateRagdoll(ragdollData) {
        ragdollData.isActive = true;
        
        // Apply initial forces to bones
        for (let boneBody of ragdollData.bones.values()) {
            const randomForce = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                Math.random() * 5,
                (Math.random() - 0.5) * 10
            );
            this.applyForce(boneBody, randomForce);
        }
    }

    updateRagdoll(ragdollData, deltaTime) {
        if (!ragdollData.isActive) return;
        
        for (let boneBody of ragdollData.bones.values()) {
            // Apply gravity
            boneBody.acceleration.add(this.gravity);
            
            // Update velocity and position
            boneBody.velocity.add(boneBody.acceleration.clone().multiplyScalar(deltaTime));
            boneBody.velocity.multiplyScalar(boneBody.damping);
            
            boneBody.bone.position.add(boneBody.velocity.clone().multiplyScalar(deltaTime));
            
            // Reset acceleration
            boneBody.acceleration.set(0, 0, 0);
        }
    }

    // Event handlers
    onItemCollected = null;
    onTriggerActivated = null;
    onCollision = null;

    // Utility methods
    getPhysicsBody(mesh) {
        return this.physicsBodies.get(mesh.uuid);
    }

    getCollisionObjects() {
        return this.collisionObjects;
    }

    getInteractableObjects() {
        return this.interactableObjects;
    }

    // Debugging methods
    enableDebugMode() {
        this.debugMode = true;
        this.createDebugHelpers();
    }

    createDebugHelpers() {
        // Create wireframe boxes for collision objects
        this.debugHelpers = [];
        
        for (let obj of this.collisionObjects) {
            const helper = new THREE.Box3Helper(obj.boundingBox, 0xff0000);
            this.scene.add(helper);
            this.debugHelpers.push(helper);
        }
        
        for (let obj of this.interactableObjects) {
            const helper = new THREE.Box3Helper(obj.boundingBox, 0x00ff00);
            this.scene.add(helper);
            this.debugHelpers.push(helper);
        }
    }

    updateDebugHelpers() {
        if (!this.debugMode) return;
        
        // Update collision object helpers
        let helperIndex = 0;
        for (let obj of this.collisionObjects) {
            if (this.debugHelpers[helperIndex]) {
                this.debugHelpers[helperIndex].box.copy(obj.boundingBox);
                helperIndex++;
            }
        }
        
        // Update interactable object helpers
        for (let obj of this.interactableObjects) {
            if (this.debugHelpers[helperIndex]) {
                this.debugHelpers[helperIndex].box.copy(obj.boundingBox);
                helperIndex++;
            }
        }
    }
}