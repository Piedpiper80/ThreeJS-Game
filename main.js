import * as THREE from 'three';
import { CharacterController } from './CharacterController.js';
import { CameraController } from './CameraController.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        this.characterController = null;
        this.cameraController = null;
        
        // Input state
        this.keys = {};
        
        // Backend communication
        this.backendUrl = 'http://localhost:8000';
        this.playerId = 'player1';
        
        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('container').appendChild(this.renderer.domElement);

        // Setup scene
        this.setupScene();
        this.setupLighting();
        this.setupGround();
        
        // Load character using CharacterController
        this.characterController = new CharacterController(this.scene, () => {
            // Set up camera controller after character is loaded
            this.cameraController = new CameraController(this.camera, this.renderer);
            this.cameraController.setTarget(this.characterController.getPivot());
        });
        
        // Setup controls
        this.setupControls();
        
        // Start render loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupScene() {
        // Add fog for atmosphere
        this.scene.fog = new THREE.Fog(0x87CEEB, 10, 100);
        
        // Add skybox
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
    }

    setupGround() {
        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x3a5f3a,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Add some obstacles
        this.addObstacles();
    }

    addObstacles() {
        // Add some boxes as obstacles
        for (let i = 0; i < 10; i++) {
            const geometry = new THREE.BoxGeometry(2, Math.random() * 3 + 1, 2);
            const material = new THREE.MeshLambertMaterial({ 
                color: Math.random() * 0xffffff 
            });
            const box = new THREE.Mesh(geometry, material);
            box.position.set(
                (Math.random() - 0.5) * 80,
                box.geometry.parameters.height / 2,
                (Math.random() - 0.5) * 80
            );
            box.castShadow = true;
            box.receiveShadow = true;
            this.scene.add(box);
        }
    }

    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
    }

    async sendMovementInput(deltaX, deltaZ, deltaTime) {
        try {
            const response = await fetch(`${this.backendUrl}/player/${this.playerId}/move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    delta_x: deltaX,
                    delta_z: deltaZ,
                    delta_time: deltaTime
                })
            });
            
            if (response.ok) {
                const playerState = await response.json();
                this.updateCharacterFromState(playerState);
            }
        } catch (error) {
            console.error('Error sending movement input:', error);
        }
    }



    async sendPlayerFlags(isSprinting, isCrouching) {
        try {
            const response = await fetch(`${this.backendUrl}/player/${this.playerId}/flags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_sprinting: isSprinting,
                    is_crouching: isCrouching
                })
            });
            
            if (response.ok) {
                const playerState = await response.json();
                this.updateCharacterFromState(playerState);
            }
        } catch (error) {
            console.error('Error sending player flags:', error);
        }
    }

    updateCharacterFromState(playerState) {
        if (!this.characterController) return;
        
        // Update position
        this.characterController.updatePosition(playerState.position);
        
        // Update animation
        this.characterController.updateAnimation(playerState.animation);
        
        // Update UI
        this.updateUI(playerState);
    }

    onWindowResize() {
        if (this.cameraController) {
            this.cameraController.onWindowResize();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const deltaTime = this.clock.getDelta();
        
        // Handle movement input
        if (this.characterController) {
            this.characterController.update(deltaTime);
            
            // Check for W key (forward movement)
            if (this.keys['KeyW']) {
                this.characterController.moveForward(deltaTime);
            } else {
                this.characterController.stopMoving();
            }
        }
        
        // Update camera
        if (this.cameraController) {
            this.cameraController.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    updateUI(playerState) {
        document.getElementById('current-state').textContent = playerState.animation;
        document.getElementById('current-speed').textContent = playerState.speed.toFixed(1);
    }
}

window.onload = () => {
    new Game();
}; 