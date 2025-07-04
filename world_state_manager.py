from dataclasses import dataclass
from typing import Dict, List, Any, Optional, Tuple
import math
import time
import random
from enum import Enum

class WeatherType(Enum):
    CLEAR = "clear"
    RAIN = "rain"
    FOG = "fog"
    STORM = "storm"
    SNOW = "snow"

@dataclass
class WorldObstacle:
    """Represents a dynamic obstacle in the world"""
    id: str
    position: Tuple[float, float, float]
    rotation: float
    scale: Tuple[float, float, float]
    obstacle_type: str
    material_color: int
    lifetime: float
    max_lifetime: float
    is_spawning: bool = True
    is_despawning: bool = False

@dataclass
class WorldLighting:
    """Represents world lighting state"""
    ambient_intensity: float
    directional_intensity: float
    directional_color: Tuple[float, float, float]
    ambient_color: Tuple[float, float, float]
    directional_position: Tuple[float, float, float]
    fog_color: Tuple[float, float, float]
    fog_density: float

@dataclass
class WeatherState:
    """Represents current weather conditions"""
    weather_type: WeatherType
    intensity: float
    wind_direction: float
    wind_strength: float
    precipitation_amount: float
    visibility: float
    temperature: float

@dataclass
class WorldState:
    """Main world state container"""
    time_of_day: float  # 0.0 = midnight, 0.5 = noon, 1.0 = midnight
    day_duration: float  # seconds for a full day
    weather: WeatherState
    lighting: WorldLighting
    obstacles: Dict[str, WorldObstacle]
    last_update: float
    
class WorldStateManager:
    """Manages dynamic world elements and environmental effects"""
    
    def __init__(self):
        self.world_state = WorldState(
            time_of_day=0.5,  # Start at noon
            day_duration=300.0,  # 5 minutes for a full day cycle
            weather=WeatherState(
                weather_type=WeatherType.CLEAR,
                intensity=0.0,
                wind_direction=0.0,
                wind_strength=0.0,
                precipitation_amount=0.0,
                visibility=1.0,
                temperature=20.0
            ),
            lighting=WorldLighting(
                ambient_intensity=0.6,
                directional_intensity=1.0,
                directional_color=(1.0, 1.0, 0.9),
                ambient_color=(0.4, 0.4, 0.6),
                directional_position=(50.0, 50.0, 50.0),
                fog_color=(0.53, 0.81, 0.92),
                fog_density=0.01
            ),
            obstacles={},
            last_update=time.time()
        )
        
        # Configuration
        self.max_obstacles = 20
        self.obstacle_spawn_rate = 0.3  # per second
        self.obstacle_spawn_distance = 50.0
        self.weather_change_interval = 60.0  # seconds
        self.last_weather_change = time.time()
        self.last_obstacle_spawn = time.time()
        
        # Obstacle types and their properties
        self.obstacle_types = {
            "box": {"min_scale": (1, 1, 1), "max_scale": (3, 4, 3)},
            "cylinder": {"min_scale": (0.5, 2, 0.5), "max_scale": (2, 6, 2)},
            "sphere": {"min_scale": (0.5, 0.5, 0.5), "max_scale": (2, 2, 2)},
            "pyramid": {"min_scale": (1, 1, 1), "max_scale": (3, 3, 3)}
        }
        
    def update(self, delta_time: float) -> None:
        """Update all world systems"""
        current_time = time.time()
        self.world_state.last_update = current_time
        
        # Update time of day
        self._update_time_of_day(delta_time)
        
        # Update lighting based on time of day
        self._update_lighting()
        
        # Update weather
        self._update_weather(current_time)
        
        # Update obstacles
        self._update_obstacles(delta_time, current_time)
        
        # Spawn new obstacles
        self._handle_obstacle_spawning(current_time)
        
    def _update_time_of_day(self, delta_time: float) -> None:
        """Update the time of day cycle"""
        time_progress = delta_time / self.world_state.day_duration
        self.world_state.time_of_day = (self.world_state.time_of_day + time_progress) % 1.0
        
    def _update_lighting(self) -> None:
        """Update lighting based on time of day"""
        time_of_day = self.world_state.time_of_day
        
        # Calculate sun position based on time
        sun_angle = time_of_day * 2 * math.pi
        sun_elevation = math.sin(sun_angle)
        
        # Update directional light position (sun)
        sun_x = math.cos(sun_angle) * 50
        sun_y = max(10, sun_elevation * 50 + 20)  # Keep sun above horizon
        sun_z = math.sin(sun_angle) * 50
        
        self.world_state.lighting.directional_position = (sun_x, sun_y, sun_z)
        
        # Update lighting intensity based on time of day
        if 0.2 <= time_of_day <= 0.8:  # Daytime
            day_factor = 1.0 - abs(time_of_day - 0.5) * 2
            self.world_state.lighting.ambient_intensity = 0.4 + day_factor * 0.4
            self.world_state.lighting.directional_intensity = 0.8 + day_factor * 0.4
            
            # Warmer colors during sunrise/sunset
            if time_of_day < 0.3 or time_of_day > 0.7:
                self.world_state.lighting.directional_color = (1.0, 0.8, 0.6)
            else:
                self.world_state.lighting.directional_color = (1.0, 1.0, 0.9)
                
        else:  # Nighttime
            self.world_state.lighting.ambient_intensity = 0.1
            self.world_state.lighting.directional_intensity = 0.2
            self.world_state.lighting.directional_color = (0.5, 0.6, 0.8)
            self.world_state.lighting.ambient_color = (0.1, 0.1, 0.2)
            
    def _update_weather(self, current_time: float) -> None:
        """Update weather conditions"""
        if current_time - self.last_weather_change > self.weather_change_interval:
            self._change_weather()
            self.last_weather_change = current_time
            
        # Apply weather effects to lighting
        weather = self.world_state.weather
        lighting = self.world_state.lighting
        
        if weather.weather_type == WeatherType.FOG:
            lighting.fog_density = 0.05 + weather.intensity * 0.1
            lighting.fog_color = (0.7, 0.7, 0.7)
            
        elif weather.weather_type == WeatherType.RAIN:
            lighting.fog_density = 0.02 + weather.intensity * 0.03
            lighting.fog_color = (0.5, 0.5, 0.6)
            lighting.ambient_intensity *= (1.0 - weather.intensity * 0.3)
            
        elif weather.weather_type == WeatherType.STORM:
            lighting.fog_density = 0.03 + weather.intensity * 0.05
            lighting.fog_color = (0.3, 0.3, 0.4)
            lighting.ambient_intensity *= (1.0 - weather.intensity * 0.5)
            lighting.directional_intensity *= (1.0 - weather.intensity * 0.4)
            
        elif weather.weather_type == WeatherType.SNOW:
            lighting.fog_density = 0.02 + weather.intensity * 0.04
            lighting.fog_color = (0.9, 0.9, 1.0)
            
        else:  # CLEAR
            lighting.fog_density = 0.01
            lighting.fog_color = (0.53, 0.81, 0.92)
            
    def _change_weather(self) -> None:
        """Randomly change weather conditions"""
        weather_types = list(WeatherType)
        new_weather = random.choice(weather_types)
        
        self.world_state.weather.weather_type = new_weather
        self.world_state.weather.intensity = random.uniform(0.3, 1.0)
        self.world_state.weather.wind_direction = random.uniform(0, 2 * math.pi)
        self.world_state.weather.wind_strength = random.uniform(0.1, 0.8)
        
        if new_weather in [WeatherType.RAIN, WeatherType.STORM, WeatherType.SNOW]:
            self.world_state.weather.precipitation_amount = self.world_state.weather.intensity
        else:
            self.world_state.weather.precipitation_amount = 0.0
            
        if new_weather == WeatherType.FOG:
            self.world_state.weather.visibility = 1.0 - self.world_state.weather.intensity * 0.7
        else:
            self.world_state.weather.visibility = 1.0 - self.world_state.weather.intensity * 0.3
            
    def _update_obstacles(self, delta_time: float, current_time: float) -> None:
        """Update existing obstacles"""
        obstacles_to_remove = []
        
        for obstacle_id, obstacle in self.world_state.obstacles.items():
            obstacle.lifetime += delta_time
            
            # Check if obstacle should start despawning
            if obstacle.lifetime >= obstacle.max_lifetime and not obstacle.is_despawning:
                obstacle.is_despawning = True
                obstacle.is_spawning = False
                
            # Remove obstacles that have expired
            if obstacle.is_despawning and obstacle.lifetime >= obstacle.max_lifetime + 2.0:
                obstacles_to_remove.append(obstacle_id)
                
        # Remove expired obstacles
        for obstacle_id in obstacles_to_remove:
            del self.world_state.obstacles[obstacle_id]
            
    def _handle_obstacle_spawning(self, current_time: float) -> None:
        """Handle spawning of new obstacles"""
        if (len(self.world_state.obstacles) < self.max_obstacles and 
            current_time - self.last_obstacle_spawn > 1.0 / self.obstacle_spawn_rate):
            
            self.spawn_obstacle()
            self.last_obstacle_spawn = current_time
            
    def spawn_obstacle(self, position: Optional[Tuple[float, float, float]] = None) -> str:
        """Spawn a new obstacle"""
        obstacle_id = f"obstacle_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
        
        # Random position if not specified
        if position is None:
            angle = random.uniform(0, 2 * math.pi)
            distance = random.uniform(10, self.obstacle_spawn_distance)
            x = math.cos(angle) * distance
            z = math.sin(angle) * distance
            y = 0
            position = (x, y, z)
            
        # Random obstacle type
        obstacle_type = random.choice(list(self.obstacle_types.keys()))
        type_config = self.obstacle_types[obstacle_type]
        
        # Random scale
        scale = (
            random.uniform(type_config["min_scale"][0], type_config["max_scale"][0]),
            random.uniform(type_config["min_scale"][1], type_config["max_scale"][1]),
            random.uniform(type_config["min_scale"][2], type_config["max_scale"][2])
        )
        
        # Create obstacle
        obstacle = WorldObstacle(
            id=obstacle_id,
            position=position,
            rotation=random.uniform(0, 2 * math.pi),
            scale=scale,
            obstacle_type=obstacle_type,
            material_color=random.randint(0x000000, 0xffffff),
            lifetime=0.0,
            max_lifetime=random.uniform(30.0, 120.0),  # 30-120 seconds
            is_spawning=True,
            is_despawning=False
        )
        
        self.world_state.obstacles[obstacle_id] = obstacle
        return obstacle_id
        
    def despawn_obstacle(self, obstacle_id: str) -> bool:
        """Mark an obstacle for despawning"""
        if obstacle_id in self.world_state.obstacles:
            self.world_state.obstacles[obstacle_id].is_despawning = True
            self.world_state.obstacles[obstacle_id].is_spawning = False
            return True
        return False
        
    def set_weather(self, weather_type: WeatherType, intensity: float = 0.5) -> None:
        """Manually set weather conditions"""
        self.world_state.weather.weather_type = weather_type
        self.world_state.weather.intensity = max(0.0, min(1.0, intensity))
        self.last_weather_change = time.time()
        
    def set_time_of_day(self, time_of_day: float) -> None:
        """Manually set time of day (0.0 = midnight, 0.5 = noon)"""
        self.world_state.time_of_day = max(0.0, min(1.0, time_of_day))
        
    def get_world_state_data(self) -> Dict[str, Any]:
        """Get world state as dictionary for API response"""
        return {
            "time_of_day": self.world_state.time_of_day,
            "day_duration": self.world_state.day_duration,
            "weather": {
                "type": self.world_state.weather.weather_type.value,
                "intensity": self.world_state.weather.intensity,
                "wind_direction": self.world_state.weather.wind_direction,
                "wind_strength": self.world_state.weather.wind_strength,
                "precipitation": self.world_state.weather.precipitation_amount,
                "visibility": self.world_state.weather.visibility,
                "temperature": self.world_state.weather.temperature
            },
            "lighting": {
                "ambient_intensity": self.world_state.lighting.ambient_intensity,
                "directional_intensity": self.world_state.lighting.directional_intensity,
                "directional_color": self.world_state.lighting.directional_color,
                "ambient_color": self.world_state.lighting.ambient_color,
                "directional_position": self.world_state.lighting.directional_position,
                "fog_color": self.world_state.lighting.fog_color,
                "fog_density": self.world_state.lighting.fog_density
            },
            "obstacles": {
                obstacle_id: {
                    "id": obstacle.id,
                    "position": obstacle.position,
                    "rotation": obstacle.rotation,
                    "scale": obstacle.scale,
                    "type": obstacle.obstacle_type,
                    "color": obstacle.material_color,
                    "lifetime": obstacle.lifetime,
                    "max_lifetime": obstacle.max_lifetime,
                    "is_spawning": obstacle.is_spawning,
                    "is_despawning": obstacle.is_despawning
                }
                for obstacle_id, obstacle in self.world_state.obstacles.items()
            },
            "last_update": self.world_state.last_update
        }