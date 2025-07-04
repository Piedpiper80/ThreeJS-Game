# Biped Character Controller

A modern Three.js character controller system with mouse and keyboard controls for biped animations.

## Features

- **Smooth Movement**: WASD controls with acceleration/deceleration
- **Mouse Look**: First-person camera control with pointer lock
- **Multiple Animations**: Idle, walk, run, sprint, crouch, and directional movements
- **Physics**: Basic gravity and ground collision
- **Modern UI**: Clean interface showing current state and speed
- **Responsive**: Adapts to window resizing

## Controls

- **WASD** - Move character
- **Mouse** - Look around (click to lock pointer)
- **Shift** - Sprint
- **Ctrl** - Crouch
- **Space** - Jump

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open browser to `http://localhost:5173`

## Animation States

The controller supports these animation states:
- `idle` - Standing still
- `walk` - Walking forward
- `run` - Running forward
- `sprint` - Sprinting
- `walk_back` - Walking backward
- `run_back` - Running backward
- `run_left` - Running left
- `run_right` - Running right
- `crouch_walk` - Crouching forward
- `crouch_walk_back` - Crouching backward
- `crouch_walk_left` - Crouching left
- `crouch_walk_right` - Crouching right

## Project Structure

```
├── index.html          # Main HTML file
├── styles.css          # UI styles
├── main.js             # Game initialization and scene setup
├── CharacterController.js # Character movement and animation logic
├── package.json        # Dependencies and scripts
└── biped/              # Animation files (GLB format)
```

## Customization

- Adjust movement speeds in `CharacterController.js`
- Modify animation mappings in `main.js`
- Change camera behavior in the `animate()` method
- Add new animations by placing GLB files in the `biped/` folder 