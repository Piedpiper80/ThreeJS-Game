from dataclasses import dataclass, field
from typing import Dict, Any, Optional
import math
from physics_simulation import PhysicsSimulationAgent, Vector3

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
    # Physics properties
    velocity_x: float = 0.0
    velocity_y: float = 0.0
    velocity_z: float = 0.0
    on_ground: bool = True
    health: int = 100
    inventory: Dict[str, int] = field(default_factory=dict)

class PlayerStateManager:
    """Manages player state and state transitions"""
    
    def __init__(self):
        self.players: Dict[str, PlayerState] = {}
        self.physics_agent = PhysicsSimulationAgent()
        self.animation_states = {
            "idle": "Animation_Idle_4_withSkin",
            "walk": "Animation_Walking_withSkin", 
            "run": "Animation_Running_withSkin",
            "sprint": "Animation_Lean_Forward_Sprint_inplace_withSkin",
            "crouch_walk": "Animation_Cautious_Crouch_Walk_Forward_inplace_withSkin"
        }
        self.last_update_time = 0.0
    
    def create_player(self, player_id: str) -> PlayerState:
        """Create a new player with default state"""
        player = PlayerState()
        self.players[player_id] = player
        
        # Create physics body for the player
        player_position = Vector3(player.position_x, player.position_y, player.position_z)
        self.physics_agent.create_physics_body(player_id, player_position, {
            'mass': 70.0,  # 70kg player
            'collision_radius': 0.5,
            'friction': 0.8,
            'damping': 0.9
        })
        
        return player
    
    def get_player(self, player_id: str) -> PlayerState:
        """Get player state by ID"""
        return self.players.get(player_id)
    
    def update_player_position(self, player_id: str, delta_x: float, delta_z: float, delta_time: float):
        """Update player position based on movement input"""
        player = self.get_player(player_id)
        if not player:
            return None
        
        # Update physics simulation
        self.update_physics(delta_time)
        
        # Get physics body
        physics_body = self.physics_agent.get_physics_body(player_id)
        if not physics_body:
            return player
            
        # Calculate movement speed
        move_speed = 5.0  # units per second
        if player.is_sprinting:
            move_speed = 8.0
        elif player.is_crouching:
            move_speed = 2.0
            
        # Apply movement force to physics body instead of directly changing position
        if abs(delta_x) > 0.01 or abs(delta_z) > 0.01:
            # Normalize input
            magnitude = math.sqrt(delta_x**2 + delta_z**2)
            if magnitude > 0:
                delta_x /= magnitude
                delta_z /= magnitude
            
            # Apply movement force
            force_magnitude = move_speed * physics_body.mass * 10  # Adjust multiplier as needed
            movement_force = Vector3(delta_x * force_magnitude, 0, delta_z * force_magnitude)
            
            # Only apply horizontal force if on ground or in air
            if physics_body.on_ground:
                self.physics_agent.apply_force(player_id, movement_force)
            else:
                # Reduced air control
                air_force = movement_force * 0.3
                self.physics_agent.apply_force(player_id, air_force)
        
        # Update player state from physics body
        self.sync_player_from_physics(player_id)
        
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
    
    def update_physics(self, delta_time: float):
        """Update physics simulation"""
        import time
        current_time = time.time()
        
        if self.last_update_time == 0.0:
            self.last_update_time = current_time
            return
        
        # Use actual delta time for physics
        physics_delta = current_time - self.last_update_time
        self.last_update_time = current_time
        
        # Update physics simulation
        self.physics_agent.update(physics_delta)
    
    def sync_player_from_physics(self, player_id: str):
        """Synchronize player state from physics body"""
        player = self.get_player(player_id)
        physics_body = self.physics_agent.get_physics_body(player_id)
        
        if player and physics_body:
            # Update position
            player.position_x = physics_body.position.x
            player.position_y = physics_body.position.y
            player.position_z = physics_body.position.z
            
            # Update velocity
            player.velocity_x = physics_body.velocity.x
            player.velocity_y = physics_body.velocity.y
            player.velocity_z = physics_body.velocity.z
            
            # Update physics state
            player.on_ground = physics_body.on_ground
            
            # Calculate speed from velocity
            horizontal_speed = math.sqrt(physics_body.velocity.x**2 + physics_body.velocity.z**2)
            player.speed = horizontal_speed
            player.is_moving = horizontal_speed > 0.1
    
    def check_player_interactions(self, player_id: str):
        """Check for player interactions with objects"""
        physics_body = self.physics_agent.get_physics_body(player_id)
        if not physics_body:
            return []
        
        return self.physics_agent.check_interactions(player_id, physics_body)
    
    def apply_jump(self, player_id: str, jump_force: float = 300.0):
        """Apply jump force to player"""
        physics_body = self.physics_agent.get_physics_body(player_id)
        if physics_body and physics_body.on_ground:
            jump_impulse = Vector3(0, jump_force, 0)
            self.physics_agent.apply_impulse(player_id, jump_impulse)
    
    def apply_damage(self, player_id: str, damage: int):
        """Apply damage to player"""
        player = self.get_player(player_id)
        if player:
            player.health = max(0, player.health - damage)
            return player.health
        return 0
    
    def heal_player(self, player_id: str, heal_amount: int):
        """Heal player"""
        player = self.get_player(player_id)
        if player:
            player.health = min(100, player.health + heal_amount)
            return player.health
        return 0
    
    def add_to_inventory(self, player_id: str, item_type: str, quantity: int = 1):
        """Add item to player inventory"""
        player = self.get_player(player_id)
        if player:
            if item_type in player.inventory:
                player.inventory[item_type] += quantity
            else:
                player.inventory[item_type] = quantity
            return True
        return False
    
    def use_item(self, player_id: str, item_type: str):
        """Use item from inventory"""
        player = self.get_player(player_id)
        if player and item_type in player.inventory and player.inventory[item_type] > 0:
            player.inventory[item_type] -= 1
            
            # Apply item effects
            if item_type == "health_potion":
                self.heal_player(player_id, 25)
            elif item_type == "mana_potion":
                # Could add mana system here
                pass
            
            # Remove item if quantity is 0
            if player.inventory[item_type] == 0:
                del player.inventory[item_type]
            
            return True
        return False
    
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
            
        # Include interaction events if any
        interactions = self.check_player_interactions(player_id)
        
        return {
            "position": [player.position_x, player.position_y, player.position_z],
            "rotation": player.rotation_y,
            "animation": player.current_animation,
            "speed": player.speed,
            "is_moving": player.is_moving,
            "is_sprinting": player.is_sprinting,
            "is_crouching": player.is_crouching,
            "velocity": [player.velocity_x, player.velocity_y, player.velocity_z],
            "on_ground": player.on_ground,
            "health": player.health,
            "inventory": player.inventory,
            "interactions": interactions if interactions else []
        } 