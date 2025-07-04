from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import time
from player_state import PlayerStateManager

app = FastAPI()

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize player state manager
player_manager = PlayerStateManager()

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