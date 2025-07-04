# Physics Simulation Agent

## Overview

The Physics Simulation Agent is a comprehensive physics system that handles collision detection, gravity simulation, object interactions, and ragdoll physics for the 3D character simulation. It consists of both frontend (JavaScript) and backend (Python) components working together to provide a realistic physics experience.

## Architecture

### Frontend Components

1. **PhysicsEngine.js** - Main physics engine for Three.js
2. **Main.js Integration** - Game integration with physics system

### Backend Components

1. **physics_simulation.py** - Backend physics simulation agent
2. **player_state.py** - Enhanced player state with physics properties
3. **backend.py** - API endpoints for physics interactions

## Features

### 1. Collision Detection
- **Bounding Box Collision**: Efficient AABB (Axis-Aligned Bounding Box) collision detection
- **Raycast Collision**: Advanced raycast-based collision for precise detection
- **Static vs Dynamic**: Handles both static obstacles and dynamic objects
- **Collision Resolution**: Proper separation and velocity adjustment on collision

### 2. Physics Simulation
- **Gravity**: Realistic gravity simulation (-9.81 m/s²)
- **Ground Detection**: Automatic ground collision and grounding detection
- **Velocity & Acceleration**: Proper physics body simulation with mass, damping, and friction
- **Force Application**: Apply forces and impulses to physics bodies

### 3. Object Interactions
- **Item Collection**: Automatic pickup of nearby items (health potions, weapons, etc.)
- **Trigger Activation**: Trigger zones for interactive elements
- **Inventory Management**: Item collection and inventory tracking
- **Interaction Range**: Configurable interaction distances

### 4. Ragdoll Physics
- **Bone-based Ragdoll**: Individual physics bodies for character bones
- **Joint Constraints**: Realistic joint behavior between bones
- **Activation System**: Switch between animation and ragdoll modes
- **Force Application**: Apply forces to individual bones

## API Endpoints

### Player Physics
- `POST /player/{player_id}/move` - Enhanced movement with physics
- `POST /player/{player_id}/jump` - Apply jump force
- `POST /player/{player_id}/use_item` - Use inventory items
- `GET /player/{player_id}/physics` - Get physics debug info

### World Data
- `GET /world/objects` - Get collision and interactable objects

## Configuration

### Physics Settings
```python
# Gravity
gravity = Vector3(0, -9.81, 0)

# Time step
time_step = 1.0 / 60.0

# Collision settings
skin_width = 0.1
damping = 0.95
friction = 0.8
```

### Player Physics Body
```python
{
    'mass': 70.0,          # 70kg player
    'collision_radius': 0.5,
    'friction': 0.8,
    'damping': 0.9
}
```

## Usage Examples

### Basic Setup
```javascript
// Initialize physics engine
const physicsEngine = new PhysicsEngine(scene);

// Setup event handlers
physicsEngine.onItemCollected = (item) => {
    console.log('Collected:', item.type);
};

// Update in game loop
physicsEngine.update(deltaTime);
```

### Creating Physics Bodies
```python
# Backend - Create player physics body
physics_agent.create_physics_body(player_id, position, {
    'mass': 70.0,
    'collision_radius': 0.5,
    'use_gravity': True
})
```

### Applying Forces
```python
# Apply jump force
jump_force = Vector3(0, 300, 0)
physics_agent.apply_impulse(player_id, jump_force)

# Apply movement force
movement_force = Vector3(100, 0, 0)
physics_agent.apply_force(player_id, movement_force)
```

### Collision Detection
```javascript
// Raycast collision
const hit = physicsEngine.raycastCollision(
    origin, 
    direction, 
    maxDistance
);

if (hit.hit) {
    console.log('Hit:', hit.object, 'at distance:', hit.distance);
}
```

## Interaction System

### Item Types
- **health_potion**: Restores player health
- **weapon**: Collectible weapons with damage values
- **trigger**: Activation zones for events

### Interaction Events
```python
{
    "type": "item_collected",
    "item_type": "health_potion",
    "item_id": "item_0",
    "value": 25,
    "body_id": "player1"
}
```

## Debugging

### Debug Mode
```javascript
// Enable physics debug visualization
physicsEngine.enableDebugMode();
```

### Physics Info UI
The system automatically displays physics information:
- Velocity magnitude
- Ground contact status
- Health and inventory
- Interaction events

## Performance Considerations

1. **Time Step Clamping**: Physics time steps are clamped to prevent instability
2. **Collision Optimization**: Efficient bounding box tests before detailed collision
3. **Object Culling**: Only update active physics bodies
4. **Interaction Range**: Limited interaction distance to reduce checks

## Integration Points

### Frontend Integration
1. Import PhysicsEngine into main.js
2. Initialize physics engine after scene setup
3. Update physics in animation loop
4. Handle physics events for UI updates

### Backend Integration
1. Import PhysicsSimulationAgent in player_state.py
2. Create physics bodies for players
3. Sync player state with physics bodies
4. Handle physics-based interactions

## Extensibility

The system is designed to be easily extended:

1. **New Interaction Types**: Add new item types in `handle_interaction()`
2. **Custom Forces**: Add new force application methods
3. **Advanced Collision**: Extend collision detection for complex shapes
4. **Particle Systems**: Add particle effects for interactions
5. **Sound Integration**: Add physics-based audio events

## Error Handling

The system includes robust error handling:
- Graceful degradation when physics bodies don't exist
- Null checks for all physics operations
- Fallback behavior for network issues
- Console logging for debugging

This Physics Simulation Agent provides a solid foundation for realistic 3D character physics with room for expansion and customization based on specific game requirements.