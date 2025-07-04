# World State Manager Agent

## Overview

The World State Manager Agent is a comprehensive system that manages dynamic world elements in a Three.js game environment. It handles obstacle spawning/despawning, day/night cycles, weather effects, particle systems, and dynamic lighting changes.

## Features

### 1. **Dynamic Obstacle Management**
- **Automatic Spawning**: Obstacles spawn randomly around the player within a configurable distance
- **Lifecycle Management**: Each obstacle has a limited lifetime and despawns automatically
- **Smooth Animations**: Spawning and despawning animations for visual appeal
- **Multiple Types**: Box, cylinder, sphere, and pyramid obstacles with random colors and scales
- **Configurable Limits**: Maximum obstacle count and spawn rate controls

### 2. **Day/Night Cycle System**
- **Real-time Time Progression**: Automatic day/night cycling with configurable duration
- **Dynamic Sun Position**: Sun moves across the sky based on time of day
- **Lighting Transitions**: Smooth transitions between day, sunrise/sunset, and night lighting
- **Sky Color Changes**: Dynamic sky color that changes based on time (blue day, orange sunset, dark night)

### 3. **Weather System**
- **Multiple Weather Types**: Clear, Rain, Storm, Snow, and Fog
- **Dynamic Weather Changes**: Automatic weather transitions at configurable intervals
- **Weather Effects on Lighting**: Each weather type affects ambient lighting and fog density
- **Intensity System**: Weather intensity affects the strength of visual effects

### 4. **Particle Systems**
- **Rain Particles**: 1000 falling particles with realistic physics
- **Snow Particles**: 500 slower-falling particles with wind effects
- **Dynamic Visibility**: Particles show/hide based on current weather
- **Performance Optimized**: Efficient particle updates using buffer geometry

### 5. **Dynamic Lighting & Shadows**
- **Ambient Light Control**: Dynamic ambient light intensity and color
- **Directional Light (Sun)**: Moving sun with dynamic position, intensity, and color
- **Shadow Management**: Real-time shadow updates with proper shadow mapping
- **Fog Effects**: Dynamic fog density and color based on weather and time

## Backend Implementation

### API Endpoints

#### World State
- `GET /world` - Get current world state
- `POST /world/update` - Force world state update

#### Weather Control
- `POST /world/weather` - Set weather conditions
  ```json
  {
    "weather_type": "rain|storm|snow|fog|clear",
    "intensity": 0.7
  }
  ```

#### Time Control
- `POST /world/time` - Set time of day
  ```json
  {
    "time_of_day": 0.5  // 0.0 = midnight, 0.5 = noon, 1.0 = midnight
  }
  ```

#### Obstacle Management
- `POST /world/obstacles/spawn` - Spawn new obstacle
  ```json
  {
    "position": [x, y, z]  // Optional: random if not provided
  }
  ```
- `DELETE /world/obstacles/{obstacle_id}` - Despawn specific obstacle

### World State Data Structure

```python
{
    "time_of_day": 0.5,
    "day_duration": 300.0,
    "weather": {
        "type": "clear",
        "intensity": 0.0,
        "wind_direction": 0.0,
        "wind_strength": 0.0,
        "precipitation": 0.0,
        "visibility": 1.0,
        "temperature": 20.0
    },
    "lighting": {
        "ambient_intensity": 0.6,
        "directional_intensity": 1.0,
        "directional_color": [1.0, 1.0, 0.9],
        "ambient_color": [0.4, 0.4, 0.6],
        "directional_position": [50.0, 50.0, 50.0],
        "fog_color": [0.53, 0.81, 0.92],
        "fog_density": 0.01
    },
    "obstacles": {
        "obstacle_id": {
            "id": "obstacle_12345",
            "position": [10.0, 0.0, 15.0],
            "rotation": 1.57,
            "scale": [2.0, 3.0, 2.0],
            "type": "box",
            "color": 0xFF5733,
            "lifetime": 45.2,
            "max_lifetime": 120.0,
            "is_spawning": false,
            "is_despawning": false
        }
    }
}
```

## Frontend Implementation

### WorldStateManager Class

The frontend `WorldStateManager` class handles:
- **State Synchronization**: Fetches world state from backend every second
- **Visual Updates**: Updates Three.js scene based on backend state
- **Particle Management**: Handles rain and snow particle systems
- **Lighting Control**: Updates ambient and directional lighting
- **Obstacle Rendering**: Creates and removes 3D obstacles dynamically

### Integration with Game Class

The `WorldStateManager` is integrated into the main `Game` class:
- Initialized in constructor with scene and renderer references
- Updated every frame in the animate loop
- Replaces static lighting with dynamic lighting system

## Controls & Testing

### Keyboard Controls

**Character Movement:**
- WASD - Move character
- Mouse - Look around
- Shift - Sprint
- Ctrl - Crouch
- Space - Jump

**World State Controls:**
- **1** - Clear weather
- **2** - Rain weather
- **3** - Storm weather
- **4** - Snow weather
- **5** - Fog weather
- **T** - Random time of day
- **N** - Set to night (midnight)
- **M** - Set to day (noon)
- **O** - Spawn new obstacle

## Configuration

### Backend Configuration

```python
# In WorldStateManager.__init__()
self.max_obstacles = 20                    # Maximum obstacles in world
self.obstacle_spawn_rate = 0.3             # Obstacles per second
self.obstacle_spawn_distance = 50.0        # Spawn radius around origin
self.weather_change_interval = 60.0        # Seconds between weather changes
self.world_state.day_duration = 300.0      # Seconds for full day cycle
```

### Frontend Configuration

```javascript
// In WorldStateManager constructor
this.worldUpdateInterval = 1000;  // Fetch world state every 1000ms
```

## Performance Considerations

### Backend Optimizations
- **Efficient Updates**: Only updates necessary components each frame
- **Lifecycle Management**: Automatic cleanup of expired obstacles
- **Rate Limiting**: Controlled spawn rates to prevent performance issues

### Frontend Optimizations
- **Buffer Geometry**: Uses efficient buffer geometry for particles
- **Selective Updates**: Only updates changed lighting and obstacles
- **Cached Calculations**: Reuses calculations where possible

## Usage Examples

### Starting the System

1. **Start Backend**:
   ```bash
   pip install fastapi uvicorn
   uvicorn backend:app --reload
   ```

2. **Start Frontend**:
   ```bash
   npm install
   npm run dev
   ```

3. **Open Browser**: Navigate to `http://localhost:5173`

### Programmatic Control

```javascript
// Change weather programmatically
game.worldStateManager.setWeather('storm', 0.8);

// Set specific time
game.worldStateManager.setTimeOfDay(0.25); // 6 AM

// Spawn obstacle at specific location
game.worldStateManager.spawnObstacle([10, 0, 20]);
```

## Technical Architecture

### Backend Components
- `WorldStateManager`: Core logic for world state management
- `WorldObstacle`: Data structure for dynamic obstacles
- `WorldLighting`: Lighting state management
- `WeatherState`: Weather condition tracking
- `WeatherType`: Enum for weather types

### Frontend Components
- `WorldStateManager`: Frontend synchronization and rendering
- Particle systems for weather effects
- Dynamic lighting management
- Obstacle creation and lifecycle

### Communication Flow
1. Backend continuously updates world state
2. Frontend fetches state via HTTP endpoints
3. Frontend applies visual changes to Three.js scene
4. User inputs trigger backend state changes
5. Changes propagate back to visual representation

## Future Enhancements

### Potential Additions
- **Sound Effects**: Weather-based ambient sounds
- **Advanced Particles**: More sophisticated particle systems
- **Seasonal Changes**: Long-term seasonal variations
- **Interactive Elements**: Weather-responsive gameplay mechanics
- **Multiplayer Sync**: Real-time state synchronization for multiple players
- **Performance Monitoring**: Built-in performance metrics and optimization

### API Extensions
- WebSocket support for real-time updates
- More granular weather control
- Player-specific environmental effects
- Advanced obstacle types and behaviors

## Troubleshooting

### Common Issues

1. **No Weather Effects**: Check console for API errors, ensure backend is running
2. **Static Lighting**: Verify WorldStateManager is properly initialized
3. **Missing Obstacles**: Check backend obstacle spawn configuration
4. **Performance Issues**: Reduce particle counts or obstacle limits

### Debug Information

Enable debug logging:
```javascript
// In browser console
console.log(game.worldStateManager.currentWorldState);
```

Check backend logs for world state updates and API calls.

The World State Manager Agent provides a comprehensive, performant, and extensible system for managing dynamic world elements in real-time 3D environments.