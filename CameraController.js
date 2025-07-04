import * as THREE from 'three';

export class CameraController {
    constructor(camera, renderer) {
        this.camera = camera;
        this.renderer = renderer;
        this.target = null; // Character to follow
        this.offset = new THREE.Vector3(0, 5, 10); // Camera offset from character
        this.isPointerLocked = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.sensitivity = 0.002;
        
        this.setupControls();
    }

    setupControls() {
        // Mouse controls
        document.addEventListener('mousemove', (event) => {
            if (this.isPointerLocked) {
                const deltaX = event.movementX || 0;
                this.handleMouseMove(deltaX);
            }
        });

        // Pointer lock
        this.renderer.domElement.addEventListener('click', () => {
            this.renderer.domElement.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
        });
    }

    handleMouseMove(deltaX) {
        if (!this.target) return;
        
        // Rotate the character based on mouse movement (invert sign)
        this.target.rotation.y -= deltaX * this.sensitivity;
        
        // Update camera position to follow character
        this.updateCameraPosition();
    }

    setTarget(pivot) {
        this.target = pivot;
        this.updateCameraPosition();
    }

    updateCameraPosition() {
        if (!this.target) return;

        // Character's world position
        const targetPosition = this.target.position.clone();

        // Offset rotated by pivot's rotation (so camera stays behind)
        const offset = this.offset.clone();
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.target.rotation.y);

        // Camera position is behind the character
        this.camera.position.copy(targetPosition).add(offset);

        // Look at a point in front of the character (not at the character)
        const lookAtPoint = targetPosition.clone().add(
            new THREE.Vector3(0, 0, -5).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.target.rotation.y)
        );
        this.camera.lookAt(lookAtPoint);
    }

    update() {
        this.updateCameraPosition();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    getIsPointerLocked() {
        return this.isPointerLocked;
    }
} 