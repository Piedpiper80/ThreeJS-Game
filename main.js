import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class WorldStateManager {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.backendUrl = 'http://localhost:8000';
        
        // World state
        this.currentWorldState = null;
        this.dynamicObstacles = new Map();
        this.lights = {};
        this.particles = {};
        
        // Weather particle systems
        this.rainSystem = null;
        this.snowSystem = null;
        this.fogSystem = null;
        
        // Update timing
        this.lastWorldUpdate = 0;
        this.worldUpdateInterval = 1000; // Update every second
        
        this.setupLights();
        this.createParticleSystems();
    }
    
    setupLights() {
        // Store references to lights for dynamic updates
        this.lights.ambient = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(this.lights.ambient);

        this.lights.directional = new THREE.DirectionalLight(0xffffff, 1);
        this.lights.directional.position.set(50, 50, 50);
        this.lights.directional.castShadow = true;
        this.lights.directional.shadow.mapSize.width = 2048;
        this.lights.directional.shadow.mapSize.height = 2048;
        this.lights.directional.shadow.camera.near = 0.5;
        this.lights.directional.shadow.camera.far = 500;
        this.lights.directional.shadow.camera.left = -100;
        this.lights.directional.shadow.camera.right = 100;
        this.lights.directional.shadow.camera.top = 100;
        this.lights.directional.shadow.camera.bottom = -100;
        this.scene.add(this.lights.directional);
    }
    
    createParticleSystems() {
        // Rain particle system
        this.createRainSystem();
        
        // Snow particle system
        this.createSnowSystem();
    }
    
    createRainSystem() {
        const particleCount = 1000;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = Math.random() * 100;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
            
            velocities[i * 3] = 0;
            velocities[i * 3 + 1] = -50 - Math.random() * 20;
            velocities[i * 3 + 2] = 0;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0x4A90E2,
            size: 2,
            transparent: true,
            opacity: 0.6
        });
        
        this.rainSystem = new THREE.Points(particles, material);
        this.rainSystem.visible = false;
        this.scene.add(this.rainSystem);
    }
    
    createSnowSystem() {
        const particleCount = 500;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = Math.random() * 100;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
            
            velocities[i * 3] = (Math.random() - 0.5) * 2;
            velocities[i * 3 + 1] = -5 - Math.random() * 5;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 4,
            transparent: true,
            opacity: 0.8
        });
        
        this.snowSystem = new THREE.Points(particles, material);
        this.snowSystem.visible = false;
        this.scene.add(this.snowSystem);
    }
    
    async fetchWorldState() {
        try {
            const response = await fetch(`${this.backendUrl}/world`);
            if (response.ok) {
                this.currentWorldState = await response.json();
                this.updateWorld();
            }
        } catch (error) {
            console.error('Error fetching world state:', error);
        }
    }
    
    updateWorld() {
        if (!this.currentWorldState) return;
        
        this.updateLighting();
        this.updateWeather();
        this.updateObstacles();
    }
    
    updateLighting() {
        const lighting = this.currentWorldState.lighting;
        
        // Update ambient light
        this.lights.ambient.intensity = lighting.ambient_intensity;
        this.lights.ambient.color.setRGB(
            lighting.ambient_color[0],
            lighting.ambient_color[1],
            lighting.ambient_color[2]
        );
        
        // Update directional light
        this.lights.directional.intensity = lighting.directional_intensity;
        this.lights.directional.color.setRGB(
            lighting.directional_color[0],
            lighting.directional_color[1],
            lighting.directional_color[2]
        );
        this.lights.directional.position.set(
            lighting.directional_position[0],
            lighting.directional_position[1],
            lighting.directional_position[2]
        );
        
        // Update fog
        if (this.scene.fog) {
            this.scene.fog.color.setRGB(
                lighting.fog_color[0],
                lighting.fog_color[1],
                lighting.fog_color[2]
            );
            this.scene.fog.density = lighting.fog_density;
        }
        
        // Update renderer clear color based on time of day
        const timeOfDay = this.currentWorldState.time_of_day;
        let skyColor;
        
        if (timeOfDay >= 0.2 && timeOfDay <= 0.8) {
            // Daytime - blue sky
            skyColor = new THREE.Color(0x87CEEB);
        } else if (timeOfDay < 0.1 || timeOfDay > 0.9) {
            // Nighttime - dark blue
            skyColor = new THREE.Color(0x191970);
        } else {
            // Sunrise/sunset - orange/pink
            skyColor = new THREE.Color(0xFF6347);
        }
        
        this.renderer.setClearColor(skyColor);
    }
    
    updateWeather() {
        const weather = this.currentWorldState.weather;
        
        // Hide all weather effects first
        if (this.rainSystem) this.rainSystem.visible = false;
        if (this.snowSystem) this.snowSystem.visible = false;
        
        // Show appropriate weather effect
        switch (weather.type) {
            case 'rain':
            case 'storm':
                if (this.rainSystem) {
                    this.rainSystem.visible = true;
                    this.rainSystem.material.opacity = weather.intensity * 0.6;
                }
                break;
                
            case 'snow':
                if (this.snowSystem) {
                    this.snowSystem.visible = true;
                    this.snowSystem.material.opacity = weather.intensity * 0.8;
                }
                break;
        }
    }
    
    updateObstacles() {
        const obstacles = this.currentWorldState.obstacles;
        
        // Remove obstacles that no longer exist
        for (const [id, mesh] of this.dynamicObstacles) {
            if (!obstacles[id]) {
                this.scene.remove(mesh);
                this.dynamicObstacles.delete(id);
            }
        }
        
        // Add or update existing obstacles
        for (const [id, obstacleData] of Object.entries(obstacles)) {
            if (this.dynamicObstacles.has(id)) {
                // Update existing obstacle
                const mesh = this.dynamicObstacles.get(id);
                mesh.position.set(...obstacleData.position);
                mesh.rotation.y = obstacleData.rotation;
                mesh.scale.set(...obstacleData.scale);
                
                // Handle spawning/despawning animations
                if (obstacleData.is_spawning) {
                    const spawnProgress = Math.min(1, obstacleData.lifetime / 2.0);
                    mesh.scale.multiplyScalar(spawnProgress);
                } else if (obstacleData.is_despawning) {
                    const despawnProgress = 1 - Math.min(1, (obstacleData.lifetime - obstacleData.max_lifetime) / 2.0);
                    mesh.scale.multiplyScalar(despawnProgress);
                }
            } else {
                // Create new obstacle
                this.createObstacle(id, obstacleData);
            }
        }
    }
    
    createObstacle(id, obstacleData) {
        let geometry;
        
        switch (obstacleData.type) {
            case 'box':
                geometry = new THREE.BoxGeometry(1, 1, 1);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(0.5, 8, 6);
                break;
            case 'pyramid':
                geometry = new THREE.ConeGeometry(0.7, 1, 4);
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        const material = new THREE.MeshLambertMaterial({
            color: obstacleData.color
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...obstacleData.position);
        mesh.rotation.y = obstacleData.rotation;
        mesh.scale.set(...obstacleData.scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        this.scene.add(mesh);
        this.dynamicObstacles.set(id, mesh);
    }
    
    updateParticles(deltaTime) {
        // Update rain particles
        if (this.rainSystem && this.rainSystem.visible) {
            this.updateRainParticles(deltaTime);
        }
        
        // Update snow particles
        if (this.snowSystem && this.snowSystem.visible) {
            this.updateSnowParticles(deltaTime);
        }
    }
    
    updateRainParticles(deltaTime) {
        const positions = this.rainSystem.geometry.attributes.position.array;
        const velocities = this.rainSystem.geometry.attributes.velocity.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i] * deltaTime;
            positions[i + 1] += velocities[i + 1] * deltaTime;
            positions[i + 2] += velocities[i + 2] * deltaTime;
            
            // Reset particle if it falls below ground
            if (positions[i + 1] < 0) {
                positions[i] = (Math.random() - 0.5) * 200;
                positions[i + 1] = 100;
                positions[i + 2] = (Math.random() - 0.5) * 200;
            }
        }
        
        this.rainSystem.geometry.attributes.position.needsUpdate = true;
    }
    
    updateSnowParticles(deltaTime) {
        const positions = this.snowSystem.geometry.attributes.position.array;
        const velocities = this.snowSystem.geometry.attributes.velocity.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i] * deltaTime;
            positions[i + 1] += velocities[i + 1] * deltaTime;
            positions[i + 2] += velocities[i + 2] * deltaTime;
            
            // Reset particle if it falls below ground
            if (positions[i + 1] < 0) {
                positions[i] = (Math.random() - 0.5) * 200;
                positions[i + 1] = 100;
                positions[i + 2] = (Math.random() - 0.5) * 200;
            }
        }
        
        this.snowSystem.geometry.attributes.position.needsUpdate = true;
    }
    
    update(deltaTime) {
        const currentTime = Date.now();
        
        // Fetch world state periodically
        if (currentTime - this.lastWorldUpdate > this.worldUpdateInterval) {
            this.fetchWorldState();
            this.lastWorldUpdate = currentTime;
        }
        
        // Update particle systems
        this.updateParticles(deltaTime);
    }
    
    // Manual controls for testing
    async setWeather(weatherType, intensity = 0.5) {
        try {
            await fetch(`${this.backendUrl}/world/weather`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weather_type: weatherType, intensity })
            });
        } catch (error) {
            console.error('Error setting weather:', error);
        }
    }
    
    async setTimeOfDay(timeOfDay) {
        try {
            await fetch(`${this.backendUrl}/world/time`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ time_of_day: timeOfDay })
            });
        } catch (error) {
            console.error('Error setting time of day:', error);
        }
    }
    
    async spawnObstacle(position = null) {
        try {
            await fetch(`${this.backendUrl}/world/obstacles/spawn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ position })
            });
        } catch (error) {
            console.error('Error spawning obstacle:', error);
        }
    }
}

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
        
        this.worldStateManager = new WorldStateManager(this.scene, this.renderer);
        
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
        // Lighting is now handled by WorldStateManager
        // This method is kept for compatibility but lighting is managed dynamically
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
            
            // World state controls (for testing)
            this.handleWorldStateControls(event.code);
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
    
    handleWorldStateControls(keyCode) {
        if (!this.worldStateManager) return;
        
        switch (keyCode) {
            // Weather controls
            case 'Digit1': // Clear weather
                this.worldStateManager.setWeather('clear', 0.5);
                console.log('Weather set to: Clear');
                break;
            case 'Digit2': // Rain
                this.worldStateManager.setWeather('rain', 0.7);
                console.log('Weather set to: Rain');
                break;
            case 'Digit3': // Storm
                this.worldStateManager.setWeather('storm', 0.9);
                console.log('Weather set to: Storm');
                break;
            case 'Digit4': // Snow
                this.worldStateManager.setWeather('snow', 0.6);
                console.log('Weather set to: Snow');
                break;
            case 'Digit5': // Fog
                this.worldStateManager.setWeather('fog', 0.8);
                console.log('Weather set to: Fog');
                break;
                
            // Time controls
            case 'KeyT': // Toggle time of day
                const currentTime = Math.random(); // Random time for testing
                this.worldStateManager.setTimeOfDay(currentTime);
                console.log(`Time set to: ${(currentTime * 24).toFixed(1)} hours`);
                break;
            case 'KeyN': // Night
                this.worldStateManager.setTimeOfDay(0.0);
                console.log('Time set to: Midnight');
                break;
            case 'KeyM': // Day
                this.worldStateManager.setTimeOfDay(0.5);
                console.log('Time set to: Noon');
                break;
                
            // Obstacle controls
            case 'KeyO': // Spawn obstacle
                this.worldStateManager.spawnObstacle();
                console.log('Obstacle spawned!');
                break;
        }
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
        
        // Update world state manager
        if (this.worldStateManager) {
            this.worldStateManager.update(deltaTime);
        }
        
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
    }
}

// Start the game
new Game(); 