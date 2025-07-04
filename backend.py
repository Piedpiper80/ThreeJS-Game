from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import time
from player_state import PlayerStateManager
from world_state_manager import WorldStateManager, WeatherType

app = FastAPI()

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize managers
player_manager = PlayerStateManager()
world_manager = WorldStateManager()

# Create default player
player_manager.create_player("player1")

class MovementInput(BaseModel):
    delta_x: float
    delta_z: float
    delta_time: float

class MouseInput(BaseModel):
    delta_x: float

class PlayerFlags(BaseModel):
    is_sprinting: Optional[bool] = None
    is_crouching: Optional[bool] = None

class WeatherUpdate(BaseModel):
    weather_type: str
    intensity: float = 0.5

class TimeUpdate(BaseModel):
    time_of_day: float

class ObstacleSpawn(BaseModel):
    position: Optional[List[float]] = None

@app.get("/")
def read_root():
    return {"status": "ok"}

@app.get("/player/{player_id}")
def get_player_state(player_id: str):
    """Get current player state"""
    state = player_manager.get_player_data(player_id)
    if state is None:
        return {"error": "Player not found"}
    return state

@app.post("/player/{player_id}/move")
def update_player_movement(player_id: str, input: MovementInput):
    """Update player position based on movement input"""
    player = player_manager.update_player_position(
        player_id, input.delta_x, input.delta_z, input.delta_time
    )
    if player is None:
        return {"error": "Player not found"}
    
    # Update animation state
    player_manager.update_animation_state(player_id)
    
    return player_manager.get_player_data(player_id)

@app.post("/player/{player_id}/rotate")
def update_player_rotation(player_id: str, input: MouseInput):
    """Update player rotation based on mouse input"""
    player = player_manager.update_player_rotation(player_id, input.delta_x)
    if player is None:
        return {"error": "Player not found"}
    
    return player_manager.get_player_data(player_id)

@app.post("/player/{player_id}/flags")
def update_player_flags(player_id: str, flags: PlayerFlags):
    """Update player movement flags (sprint, crouch)"""
    player = player_manager.set_player_flags(
        player_id, 
        is_sprinting=flags.is_sprinting,
        is_crouching=flags.is_crouching
    )
    if player is None:
        return {"error": "Player not found"}
    
    # Update animation state
    player_manager.update_animation_state(player_id)
    
    return player_manager.get_player_data(player_id)

@app.get("/world")
def get_world_state():
    """Get current world state"""
    # Update world state before returning
    world_manager.update(0.016)  # Assume ~60fps for updates
    return world_manager.get_world_state_data()

@app.post("/world/update")
def update_world_state():
    """Force update world state"""
    world_manager.update(0.016)
    return world_manager.get_world_state_data()

@app.post("/world/weather")
def set_weather(weather_update: WeatherUpdate):
    """Set weather conditions"""
    try:
        weather_type = WeatherType(weather_update.weather_type)
        world_manager.set_weather(weather_type, weather_update.intensity)
        return world_manager.get_world_state_data()
    except ValueError:
        return {"error": "Invalid weather type"}

@app.post("/world/time")
def set_time_of_day(time_update: TimeUpdate):
    """Set time of day"""
    world_manager.set_time_of_day(time_update.time_of_day)
    return world_manager.get_world_state_data()

@app.post("/world/obstacles/spawn")
def spawn_obstacle(obstacle_data: ObstacleSpawn):
    """Spawn a new obstacle"""
    position = None
    if obstacle_data.position and len(obstacle_data.position) == 3:
        position = (obstacle_data.position[0], obstacle_data.position[1], obstacle_data.position[2])
    obstacle_id = world_manager.spawn_obstacle(position)
    return {
        "obstacle_id": obstacle_id,
        "world_state": world_manager.get_world_state_data()
    }

@app.delete("/world/obstacles/{obstacle_id}")
def despawn_obstacle(obstacle_id: str):
    """Despawn an obstacle"""
    success = world_manager.despawn_obstacle(obstacle_id)
    return {
        "success": success,
        "world_state": world_manager.get_world_state_data()
    } 