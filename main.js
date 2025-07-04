import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PhysicsEngine } from './PhysicsEngine.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        this.character = null;
        this.mixer = null;
        this.animations = {};
        this.currentAnimation = null;
        this.physicsEngine = null;
        
        // Input state
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.isPointerLocked = false;
        
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
        
        // Setup physics
        this.setupPhysics();
        
        // Load character
        this.loadCharacter();
        
        // Setup camera
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
        
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
            const height = Math.random() * 3 + 1;
            const geometry = new THREE.BoxGeometry(2, height, 2);
            const material = new THREE.MeshLambertMaterial({ 
                color: Math.random() * 0xffffff 
            });
            const box = new THREE.Mesh(geometry, material);
            box.position.set(
                (Math.random() - 0.5) * 80,
                height / 2,
                (Math.random() - 0.5) * 80
            );
            box.castShadow = true;
            box.receiveShadow = true;
            box.name = `obstacle_${i}`;
            box.userData.obstacle = true;
            this.scene.add(box);
        }
        
        // Add some interactable items
        this.addInteractableItems();
    }

    addInteractableItems() {
        // Add health potions
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.SphereGeometry(0.3, 8, 6);
            const material = new THREE.MeshLambertMaterial({ 
                color: 0xff0000,
                emissive: 0x220000
            });
            const item = new THREE.Mesh(geometry, material);
            item.position.set(
                (Math.random() - 0.5) * 60,
                0.5,
                (Math.random() - 0.5) * 60
            );
            item.castShadow = true;
            item.name = `item_${i}`;
            item.userData.interactable = true;
            item.userData.type = 'health_potion';
            
            // Add floating animation
            item.userData.originalY = item.position.y;
            item.userData.floatTime = Math.random() * Math.PI * 2;
            
            this.scene.add(item);
        }
    }

    setupPhysics() {
        // Initialize physics engine
        this.physicsEngine = new PhysicsEngine(this.scene);
        
        // Enable debug mode for physics (optional)
        // this.physicsEngine.enableDebugMode();
        
        // Setup event handlers
        this.physicsEngine.onItemCollected = (item) => {
            console.log('Item collected:', item);
            this.showNotification(`Collected ${item.type}!`);
        };
        
        this.physicsEngine.onTriggerActivated = (trigger, body) => {
            console.log('Trigger activated:', trigger);
        };
    }

    loadCharacter() {
        const loader = new GLTFLoader();
        
        // Load idle animation first
        loader.load('./biped/Animation_Idle_4_withSkin.glb', (gltf) => {
            this.character = gltf.scene;
            this.character.scale.set(1, 1, 1);
            this.character.position.set(0, 0, 0);
            this.character.castShadow = true;
            
            // Setup animation mixer
            this.mixer = new THREE.AnimationMixer(this.character);
            
            // Add idle animation
            this.animations.idle = this.mixer.clipAction(gltf.animations[0]);
            this.animations.idle.play();
            this.currentAnimation = 'idle';
            
            this.scene.add(this.character);
            
            // Load additional animations
            this.loadAnimations();
        });
    }

    loadAnimations() {
        const loader = new GLTFLoader();
        const animationFiles = [
            { name: 'walk', file: './biped/Animation_Walking_withSkin.glb' },
            { name: 'run', file: './biped/Animation_Running_withSkin.glb' },
            { name: 'sprint', file: './biped/Animation_Lean_Forward_Sprint_inplace_withSkin.glb' },
            { name: 'crouch_walk', file: './biped/Animation_Cautious_Crouch_Walk_Forward_inplace_withSkin.glb' }
        ];

        let loadedCount = 0;
        animationFiles.forEach(({ name, file }) => {
            loader.load(file, (gltf) => {
                this.animations[name] = this.mixer.clipAction(gltf.animations[0]);
                loadedCount++;
                
                if (loadedCount === animationFiles.length) {
                    console.log('All animations loaded!');
                }
            });
        });
    }

    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });

        // Mouse controls
        document.addEventListener('mousemove', (event) => {
            if (this.isPointerLocked) {
                const deltaX = event.movementX || 0;
                this.sendMouseInput(deltaX);
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

    async sendMouseInput(deltaX) {
        try {
            const response = await fetch(`${this.backendUrl}/player/${this.playerId}/rotate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    delta_x: deltaX
                })
            });
            
            if (response.ok) {
                const playerState = await response.json();
                this.updateCharacterFromState(playerState);
            }
        } catch (error) {
            console.error('Error sending mouse input:', error);
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
        if (!this.character) return;
        
        // Update position
        this.character.position.set(
            playerState.position[0],
            playerState.position[1],
            playerState.position[2]
        );
        
        // Update rotation
        this.character.rotation.y = playerState.rotation;
        
        // Update animation
        if (playerState.animation && this.animations[playerState.animation]) {
            if (this.currentAnimation !== playerState.animation) {
                // Stop current animation
                if (this.animations[this.currentAnimation]) {
                    this.animations[this.currentAnimation].stop();
                }
                
                // Play new animation
                this.animations[playerState.animation].play();
                this.currentAnimation = playerState.animation;
            }
        }
        
        // Update UI
        this.updateUI(playerState);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Update physics
        if (this.physicsEngine) {
            this.physicsEngine.update(deltaTime);
        }
        
        // Update floating items
        this.updateFloatingItems(deltaTime);
        
        // Handle input and send to backend
        this.handleInput(deltaTime);
        
        // Update camera to follow character
        if (this.character) {
            const characterPosition = this.character.position.clone();
            const cameraOffset = new THREE.Vector3(0, 5, 10);
            cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.character.rotation.y);
            this.camera.position.copy(characterPosition).add(cameraOffset);
            this.camera.lookAt(characterPosition);
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    handleInput(deltaTime) {
        let deltaX = 0;
        let deltaZ = 0;
        
        // WASD movement
        if (this.keys['KeyW']) deltaZ -= 1;
        if (this.keys['KeyS']) deltaZ += 1;
        if (this.keys['KeyA']) deltaX -= 1;
        if (this.keys['KeyD']) deltaX += 1;
        
        // Normalize diagonal movement
        if (deltaX !== 0 && deltaZ !== 0) {
            const length = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
            deltaX /= length;
            deltaZ /= length;
        }
        
        // Send movement to backend
        if (deltaX !== 0 || deltaZ !== 0) {
            this.sendMovementInput(deltaX, deltaZ, deltaTime);
        }
        
        // Handle sprint and crouch
        const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
        const isCrouching = this.keys['ControlLeft'] || this.keys['ControlRight'];
        
        // Handle jump
        if (this.keys['Space']) {
            this.sendJumpInput();
            this.keys['Space'] = false; // Prevent continuous jumping
        }
        
        // Send flags to backend (only when they change)
        if (this.lastSprinting !== isSprinting || this.lastCrouching !== isCrouching) {
            this.sendPlayerFlags(isSprinting, isCrouching);
            this.lastSprinting = isSprinting;
            this.lastCrouching = isCrouching;
        }
    }

    updateUI(playerState) {
        document.getElementById('current-state').textContent = playerState.animation;
        document.getElementById('current-speed').textContent = playerState.speed.toFixed(1);
        
        // Update physics debug info
        if (playerState.velocity) {
            const velocity = playerState.velocity;
            const velocityMagnitude = Math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2);
            
            // Create or update physics info elements
            let physicsInfo = document.getElementById('physics-info');
            if (!physicsInfo) {
                physicsInfo = document.createElement('div');
                physicsInfo.id = 'physics-info';
                physicsInfo.style.position = 'absolute';
                physicsInfo.style.top = '150px';
                physicsInfo.style.left = '10px';
                physicsInfo.style.color = 'white';
                physicsInfo.style.fontFamily = 'monospace';
                physicsInfo.style.fontSize = '12px';
                physicsInfo.style.backgroundColor = 'rgba(0,0,0,0.5)';
                physicsInfo.style.padding = '10px';
                physicsInfo.style.borderRadius = '5px';
                document.body.appendChild(physicsInfo);
            }
            
            physicsInfo.innerHTML = `
                <div>Velocity: ${velocityMagnitude.toFixed(2)}</div>
                <div>On Ground: ${playerState.on_ground}</div>
                <div>Health: ${playerState.health}</div>
                <div>Inventory: ${Object.keys(playerState.inventory || {}).length} items</div>
            `;
        }
        
        // Handle interactions
        if (playerState.interactions && playerState.interactions.length > 0) {
            playerState.interactions.forEach(interaction => {
                if (interaction.type === 'item_collected') {
                    this.showNotification(`Collected ${interaction.item_type}! +${interaction.value || 1}`);
                }
            });
        }
    }

    async sendJumpInput() {
        try {
            const response = await fetch(`${this.backendUrl}/player/${this.playerId}/jump`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jump_force: 300.0
                })
            });
            
            if (response.ok) {
                const playerState = await response.json();
                this.updateCharacterFromState(playerState);
            }
        } catch (error) {
            console.error('Error sending jump input:', error);
        }
    }

    updateFloatingItems(deltaTime) {
        // Animate floating items
        this.scene.traverse((child) => {
            if (child.userData.interactable && child.userData.originalY !== undefined) {
                child.userData.floatTime += deltaTime * 2;
                child.position.y = child.userData.originalY + Math.sin(child.userData.floatTime) * 0.2;
                child.rotation.y += deltaTime;
            }
        });
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'absolute';
        notification.style.top = '50px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(0, 255, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontSize = '14px';
        notification.style.zIndex = '1000';
        notification.style.transition = 'opacity 0.5s';
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }
}

// Start the game
new Game(); 