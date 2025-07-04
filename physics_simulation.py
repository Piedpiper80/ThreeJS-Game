import math
import time
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum

class CollisionType(Enum):
    NONE = "none"
    STATIC = "static"
    DYNAMIC = "dynamic"
    TRIGGER = "trigger"

@dataclass
class Vector3:
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    
    def __add__(self, other):
        return Vector3(self.x + other.x, self.y + other.y, self.z + other.z)
    
    def __sub__(self, other):
        return Vector3(self.x - other.x, self.y - other.y, self.z - other.z)
    
    def __mul__(self, scalar):
        return Vector3(self.x * scalar, self.y * scalar, self.z * scalar)
    
    def __truediv__(self, scalar):
        return Vector3(self.x / scalar, self.y / scalar, self.z / scalar)
    
    def magnitude(self):
        return math.sqrt(self.x**2 + self.y**2 + self.z**2)
    
    def normalize(self):
        mag = self.magnitude()
        if mag > 0:
            return Vector3(self.x / mag, self.y / mag, self.z / mag)
        return Vector3(0, 0, 0)
    
    def dot(self, other):
        return self.x * other.x + self.y * other.y + self.z * other.z
    
    def distance_to(self, other):
        return (self - other).magnitude()

@dataclass
class BoundingBox:
    min_point: Vector3 = field(default_factory=Vector3)
    max_point: Vector3 = field(default_factory=Vector3)
    
    def intersects(self, other):
        return (self.min_point.x <= other.max_point.x and self.max_point.x >= other.min_point.x and
                self.min_point.y <= other.max_point.y and self.max_point.y >= other.min_point.y and
                self.min_point.z <= other.max_point.z and self.max_point.z >= other.min_point.z)
    
    def contains_point(self, point: Vector3):
        return (self.min_point.x <= point.x <= self.max_point.x and
                self.min_point.y <= point.y <= self.max_point.y and
                self.min_point.z <= point.z <= self.max_point.z)
    
    def center(self):
        return Vector3(
            (self.min_point.x + self.max_point.x) / 2,
            (self.min_point.y + self.max_point.y) / 2,
            (self.min_point.z + self.max_point.z) / 2
        )
    
    def size(self):
        return Vector3(
            self.max_point.x - self.min_point.x,
            self.max_point.y - self.min_point.y,
            self.max_point.z - self.min_point.z
        )

@dataclass
class PhysicsBody:
    position: Vector3 = field(default_factory=Vector3)
    velocity: Vector3 = field(default_factory=Vector3)
    acceleration: Vector3 = field(default_factory=Vector3)
    mass: float = 1.0
    damping: float = 0.95
    friction: float = 0.8
    restitution: float = 0.5
    use_gravity: bool = True
    is_static: bool = False
    is_trigger: bool = False
    collision_radius: float = 0.5
    bounding_box: BoundingBox = field(default_factory=BoundingBox)
    on_ground: bool = False
    collision_type: CollisionType = CollisionType.DYNAMIC

@dataclass
class CollisionObject:
    position: Vector3
    bounding_box: BoundingBox
    collision_type: CollisionType
    object_id: str
    object_type: str = "obstacle"

@dataclass
class InteractableObject:
    position: Vector3
    bounding_box: BoundingBox
    object_id: str
    object_type: str = "item"
    interaction_range: float = 2.0
    collected: bool = False
    data: Dict = field(default_factory=dict)

class PhysicsSimulationAgent:
    """Physics Simulation Agent for handling collision detection and physics"""
    
    def __init__(self):
        self.gravity = Vector3(0, -9.81, 0)
        self.physics_bodies: Dict[str, PhysicsBody] = {}
        self.collision_objects: List[CollisionObject] = []
        self.interactable_objects: List[InteractableObject] = []
        self.ground_level = 0.0
        
        # Physics settings
        self.time_step = 1.0 / 60.0
        self.max_sub_steps = 3
        self.skin_width = 0.1
        
        # Initialize default world objects
        self.setup_default_world()
    
    def setup_default_world(self):
        """Setup default collision objects and interactables"""
        # Add some obstacle boxes (matching the ones in main.js)
        for i in range(10):
            x = (hash(f"obstacle_{i}_x") % 160 - 80) / 1.0
            z = (hash(f"obstacle_{i}_z") % 160 - 80) / 1.0
            height = (hash(f"obstacle_{i}_h") % 3 + 1) / 1.0
            
            obstacle = CollisionObject(
                position=Vector3(x, height/2, z),
                bounding_box=BoundingBox(
                    Vector3(x-1, 0, z-1),
                    Vector3(x+1, height, z+1)
                ),
                collision_type=CollisionType.STATIC,
                object_id=f"obstacle_{i}",
                object_type="obstacle"
            )
            self.collision_objects.append(obstacle)
        
        # Add some interactable items
        for i in range(5):
            x = (hash(f"item_{i}_x") % 120 - 60) / 1.0
            z = (hash(f"item_{i}_z") % 120 - 60) / 1.0
            
            item = InteractableObject(
                position=Vector3(x, 0.5, z),
                bounding_box=BoundingBox(
                    Vector3(x-0.5, 0, z-0.5),
                    Vector3(x+0.5, 1, z+0.5)
                ),
                object_id=f"item_{i}",
                object_type="health_potion",
                interaction_range=2.0,
                data={"value": 25}
            )
            self.interactable_objects.append(item)
    
    def create_physics_body(self, body_id: str, position: Vector3, options: Optional[Dict] = None) -> PhysicsBody:
        """Create a new physics body"""
        if options is None:
            options = {}
        
        body = PhysicsBody(
            position=position,
            mass=options.get('mass', 1.0),
            damping=options.get('damping', 0.95),
            friction=options.get('friction', 0.8),
            restitution=options.get('restitution', 0.5),
            use_gravity=options.get('use_gravity', True),
            is_static=options.get('is_static', False),
            collision_radius=options.get('collision_radius', 0.5),
            collision_type=options.get('collision_type', CollisionType.DYNAMIC)
        )
        
        # Update bounding box
        self.update_bounding_box(body)
        
        self.physics_bodies[body_id] = body
        return body
    
    def update_bounding_box(self, body: PhysicsBody):
        """Update bounding box based on position and collision radius"""
        r = body.collision_radius
        body.bounding_box = BoundingBox(
            Vector3(body.position.x - r, body.position.y - r, body.position.z - r),
            Vector3(body.position.x + r, body.position.y + r, body.position.z + r)
        )
    
    def update(self, delta_time: float):
        """Main physics update loop"""
        clamped_delta_time = min(delta_time, 1.0 / 30.0)  # Prevent large time steps
        
        # Update all physics bodies
        for body in self.physics_bodies.values():
            if not body.is_static:
                self.update_physics_body(body, clamped_delta_time)
        
        # Handle collisions
        self.handle_collisions()
        
        # Update interactions
        self.update_interactions()
    
    def update_physics_body(self, body: PhysicsBody, delta_time: float):
        """Update a single physics body"""
        # Apply gravity
        if body.use_gravity:
            body.acceleration = body.acceleration + self.gravity
        
        # Update velocity
        body.velocity = body.velocity + (body.acceleration * delta_time)
        
        # Apply damping
        body.velocity = body.velocity * body.damping
        
        # Update position
        body.position = body.position + (body.velocity * delta_time)
        
        # Ground collision
        if body.position.y <= self.ground_level + body.collision_radius:
            body.position.y = self.ground_level + body.collision_radius
            if body.velocity.y < 0:
                body.velocity.y = 0
                body.on_ground = True
        else:
            body.on_ground = False
        
        # Reset acceleration
        body.acceleration = Vector3(0, 0, 0)
        
        # Update bounding box
        self.update_bounding_box(body)
    
    def handle_collisions(self):
        """Handle collision detection and resolution"""
        for body_id, body in self.physics_bodies.items():
            if body.is_static:
                continue
            
            # Check collision with static objects
            for collision_obj in self.collision_objects:
                if self.check_collision(body.bounding_box, collision_obj.bounding_box):
                    self.resolve_static_collision(body, collision_obj)
            
            # Check collision with other dynamic bodies
            for other_id, other_body in self.physics_bodies.items():
                if other_id == body_id or other_body.is_static:
                    continue
                
                if self.check_collision(body.bounding_box, other_body.bounding_box):
                    self.resolve_dynamic_collision(body, other_body)
    
    def check_collision(self, box_a: BoundingBox, box_b: BoundingBox) -> bool:
        """Check if two bounding boxes intersect"""
        return box_a.intersects(box_b)
    
    def resolve_static_collision(self, body: PhysicsBody, obstacle: CollisionObject):
        """Resolve collision between dynamic body and static obstacle"""
        body_center = body.bounding_box.center()
        obstacle_center = obstacle.bounding_box.center()
        
        # Calculate separation vector
        separation = body_center - obstacle_center
        
        # Calculate overlaps
        body_size = body.bounding_box.size()
        obstacle_size = obstacle.bounding_box.size()
        
        overlap_x = (body_size.x + obstacle_size.x) / 2 - abs(separation.x)
        overlap_y = (body_size.y + obstacle_size.y) / 2 - abs(separation.y)
        overlap_z = (body_size.z + obstacle_size.z) / 2 - abs(separation.z)
        
        # Find minimum overlap axis
        min_overlap = abs(overlap_x)
        separation_axis = Vector3(1 if separation.x >= 0 else -1, 0, 0)
        
        if abs(overlap_y) < min_overlap:
            min_overlap = abs(overlap_y)
            separation_axis = Vector3(0, 1 if separation.y >= 0 else -1, 0)
        
        if abs(overlap_z) < min_overlap:
            min_overlap = abs(overlap_z)
            separation_axis = Vector3(0, 0, 1 if separation.z >= 0 else -1)
        
        # Separate objects
        separation_distance = min_overlap + self.skin_width
        body.position = body.position + (separation_axis * separation_distance)
        
        # Adjust velocity based on collision normal
        velocity_dot_normal = body.velocity.dot(separation_axis)
        if velocity_dot_normal < 0:
            reflection = separation_axis * (velocity_dot_normal * body.friction)
            body.velocity = body.velocity - reflection
        
        # Update bounding box
        self.update_bounding_box(body)
    
    def resolve_dynamic_collision(self, body_a: PhysicsBody, body_b: PhysicsBody):
        """Resolve collision between two dynamic bodies"""
        center_a = body_a.bounding_box.center()
        center_b = body_b.bounding_box.center()
        
        separation = center_a - center_b
        distance = separation.magnitude()
        
        if distance > 0:
            separation = separation.normalize()
            
            # Separate objects
            total_radius = body_a.collision_radius + body_b.collision_radius
            separation_distance = (total_radius - distance + self.skin_width) / 2
            
            body_a.position = body_a.position + (separation * separation_distance)
            body_b.position = body_b.position - (separation * separation_distance)
            
            # Calculate collision response
            relative_velocity = body_a.velocity - body_b.velocity
            velocity_along_normal = relative_velocity.dot(separation)
            
            if velocity_along_normal > 0:
                return  # Objects separating
            
            # Calculate restitution
            restitution = min(body_a.restitution, body_b.restitution)
            impulse_magnitude = (1 + restitution) * velocity_along_normal / (body_a.mass + body_b.mass)
            
            impulse = separation * impulse_magnitude
            
            body_a.velocity = body_a.velocity - (impulse * body_b.mass)
            body_b.velocity = body_b.velocity + (impulse * body_a.mass)
        
        # Update bounding boxes
        self.update_bounding_box(body_a)
        self.update_bounding_box(body_b)
    
    def update_interactions(self):
        """Update object interactions"""
        for body_id, body in self.physics_bodies.items():
            self.check_interactions(body_id, body)
    
    def check_interactions(self, body_id: str, body: PhysicsBody):
        """Check for interactions with interactable objects"""
        interactions = []
        
        for interactable in self.interactable_objects:
            if interactable.collected:
                continue
            
            distance = body.position.distance_to(interactable.position)
            if distance <= interactable.interaction_range:
                interaction_result = self.handle_interaction(body_id, body, interactable)
                if interaction_result:
                    interactions.append(interaction_result)
        
        return interactions
    
    def handle_interaction(self, body_id: str, body: PhysicsBody, interactable: InteractableObject):
        """Handle interaction between body and interactable object"""
        if interactable.object_type == "health_potion":
            return self.collect_health_potion(body_id, interactable)
        elif interactable.object_type == "weapon":
            return self.collect_weapon(body_id, interactable)
        elif interactable.object_type == "trigger":
            return self.activate_trigger(body_id, interactable)
        
        return None
    
    def collect_health_potion(self, body_id: str, item: InteractableObject):
        """Collect a health potion"""
        if not item.collected:
            item.collected = True
            return {
                "type": "item_collected",
                "item_type": "health_potion",
                "item_id": item.object_id,
                "value": item.data.get("value", 25),
                "body_id": body_id
            }
        return None
    
    def collect_weapon(self, body_id: str, item: InteractableObject):
        """Collect a weapon"""
        if not item.collected:
            item.collected = True
            return {
                "type": "item_collected",
                "item_type": "weapon",
                "item_id": item.object_id,
                "weapon_type": item.data.get("weapon_type", "sword"),
                "damage": item.data.get("damage", 10),
                "body_id": body_id
            }
        return None
    
    def activate_trigger(self, body_id: str, trigger: InteractableObject):
        """Activate a trigger"""
        return {
            "type": "trigger_activated",
            "trigger_id": trigger.object_id,
            "trigger_type": trigger.data.get("trigger_type", "switch"),
            "body_id": body_id
        }
    
    def apply_force(self, body_id: str, force: Vector3):
        """Apply force to a physics body"""
        body = self.physics_bodies.get(body_id)
        if body and not body.is_static:
            acceleration = force / body.mass
            body.acceleration = body.acceleration + acceleration
    
    def apply_impulse(self, body_id: str, impulse: Vector3):
        """Apply impulse to a physics body"""
        body = self.physics_bodies.get(body_id)
        if body and not body.is_static:
            velocity_change = impulse / body.mass
            body.velocity = body.velocity + velocity_change
    
    def raycast(self, origin: Vector3, direction: Vector3, max_distance: float = 10.0):
        """Perform a raycast and return hit information"""
        direction = direction.normalize()
        
        closest_hit = None
        closest_distance = max_distance
        
        # Check against collision objects
        for obj in self.collision_objects:
            hit_info = self.raycast_box(origin, direction, obj.bounding_box)
            if hit_info and hit_info["distance"] < closest_distance:
                closest_distance = hit_info["distance"]
                closest_hit = {
                    "hit": True,
                    "distance": hit_info["distance"],
                    "point": hit_info["point"],
                    "normal": hit_info["normal"],
                    "object": obj
                }
        
        return closest_hit if closest_hit else {"hit": False}
    
    def raycast_box(self, origin: Vector3, direction: Vector3, box: BoundingBox):
        """Raycast against a bounding box"""
        # Simplified box intersection
        t_min = (box.min_point.x - origin.x) / direction.x if direction.x != 0 else float('-inf')
        t_max = (box.max_point.x - origin.x) / direction.x if direction.x != 0 else float('inf')
        
        if t_min > t_max:
            t_min, t_max = t_max, t_min
        
        ty_min = (box.min_point.y - origin.y) / direction.y if direction.y != 0 else float('-inf')
        ty_max = (box.max_point.y - origin.y) / direction.y if direction.y != 0 else float('inf')
        
        if ty_min > ty_max:
            ty_min, ty_max = ty_max, ty_min
        
        if t_min > ty_max or ty_min > t_max:
            return None
        
        t_min = max(t_min, ty_min)
        t_max = min(t_max, ty_max)
        
        tz_min = (box.min_point.z - origin.z) / direction.z if direction.z != 0 else float('-inf')
        tz_max = (box.max_point.z - origin.z) / direction.z if direction.z != 0 else float('inf')
        
        if tz_min > tz_max:
            tz_min, tz_max = tz_max, tz_min
        
        if t_min > tz_max or tz_min > t_max:
            return None
        
        t_min = max(t_min, tz_min)
        
        if t_min >= 0:
            hit_point = origin + (direction * t_min)
            # Simplified normal calculation
            normal = Vector3(0, 1, 0)  # Default up normal
            
            return {
                "distance": t_min,
                "point": hit_point,
                "normal": normal
            }
        
        return None
    
    def get_physics_body(self, body_id: str) -> Optional[PhysicsBody]:
        """Get physics body by ID"""
        return self.physics_bodies.get(body_id)
    
    def get_collision_objects(self) -> List[CollisionObject]:
        """Get all collision objects"""
        return self.collision_objects
    
    def get_interactable_objects(self) -> List[InteractableObject]:
        """Get all interactable objects"""
        return self.interactable_objects
    
    def get_physics_state(self, body_id: str) -> Optional[Dict]:
        """Get physics state for a body"""
        body = self.physics_bodies.get(body_id)
        if not body:
            return None
        
        return {
            "position": [body.position.x, body.position.y, body.position.z],
            "velocity": [body.velocity.x, body.velocity.y, body.velocity.z],
            "on_ground": body.on_ground,
            "mass": body.mass
        }