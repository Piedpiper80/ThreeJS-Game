from dataclasses import dataclass
from typing import Dict, Any
import math

@dataclass
class PlayerState:
    """Player state data structure"""
    position_x: float = 0.0
    position_y: float = 0.0
    position_z: float = 0.0
    rotation_y: float = 0.0
    current_animation: str = "idle"
    speed: float = 0.0
    is_moving: bool = False
    is_sprinting: bool = False
    is_crouching: bool = False

class PlayerStateManager:
    """Manages player state and state transitions"""
    
    def __init__(self):
        self.players: Dict[str, PlayerState] = {}
        self.animation_states = {
            "idle": "Animation_Idle_4_withSkin",
            "walk": "Animation_Walking_withSkin", 
            "run": "Animation_Running_withSkin",
            "sprint": "Animation_Lean_Forward_Sprint_inplace_withSkin",
            "crouch_walk": "Animation_Cautious_Crouch_Walk_Forward_inplace_withSkin"
        }
    
    def create_player(self, player_id: str) -> PlayerState:
        """Create a new player with default state"""
        player = PlayerState()
        self.players[player_id] = player
        return player
    
    def get_player(self, player_id: str) -> PlayerState:
        """Get player state by ID"""
        return self.players.get(player_id)
    
    def update_player_position(self, player_id: str, delta_x: float, delta_z: float, delta_time: float):
        """Update player position based on movement input"""
        player = self.get_player(player_id)
        if not player:
            return None
            
        # Calculate movement speed
        move_speed = 5.0  # units per second
        if player.is_sprinting:
            move_speed = 8.0
        elif player.is_crouching:
            move_speed = 2.0
            
        # Apply movement
        distance = move_speed * delta_time
        player.position_x += delta_x * distance
        player.position_z += delta_z * distance
        player.speed = math.sqrt(delta_x**2 + delta_z**2) * move_speed
        player.is_moving = player.speed > 0.1
        
        return player
    
    def update_player_rotation(self, player_id: str, mouse_delta_x: float):
        """Update player rotation based on mouse input"""
        player = self.get_player(player_id)
        if not player:
            return None
            
        # Convert mouse delta to rotation (sensitivity factor)
        sensitivity = 0.002
        player.rotation_y += mouse_delta_x * sensitivity
        
        # Keep rotation in bounds
        player.rotation_y = player.rotation_y % (2 * math.pi)
        
        return player
    
    def update_animation_state(self, player_id: str) -> str:
        """Determine and update current animation based on player state"""
        player = self.get_player(player_id)
        if not player:
            return "idle"
            
        # Animation state logic
        if player.is_crouching and player.is_moving:
            new_animation = "crouch_walk"
        elif player.is_sprinting and player.is_moving:
            new_animation = "sprint"
        elif player.is_moving and player.speed > 4.0:
            new_animation = "run"
        elif player.is_moving:
            new_animation = "walk"
        else:
            new_animation = "idle"
            
        # Only update if animation changed
        if new_animation != player.current_animation:
            player.current_animation = new_animation
            
        return player.current_animation
    
    def set_player_flags(self, player_id: str, is_sprinting: bool = None, is_crouching: bool = None):
        """Set player movement flags"""
        player = self.get_player(player_id)
        if not player:
            return None
            
        if is_sprinting is not None:
            player.is_sprinting = is_sprinting
        if is_crouching is not None:
            player.is_crouching = is_crouching
            
        return player
    
    def get_player_data(self, player_id: str) -> Dict[str, Any]:
        """Get player state as dictionary for API response"""
        player = self.get_player(player_id)
        if not player:
            return None
            
        return {
            "position": [player.position_x, player.position_y, player.position_z],
            "rotation": player.rotation_y,
            "animation": player.current_animation,
            "speed": player.speed,
            "is_moving": player.is_moving,
            "is_sprinting": player.is_sprinting,
            "is_crouching": player.is_crouching
        } 