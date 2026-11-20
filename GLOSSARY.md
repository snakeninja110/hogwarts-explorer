# Hogwarts Explorer

Interactive 3D exploration of Hogwarts Castle using Babylon.js and React.

## Language

**Zone**:
A discrete explorable area of Hogwarts with an independent lifecycle, collision boundaries, and visual environment.
_Avoid_: Level, scene, room, map

**ZoneManager**:
The engine subsystem that manages loading, unloading, and active lifecycle transitions between Zones.
_Avoid_: SceneManager, level loader, world controller

**Castle Grounds**:
The foundational outdoor Zone encompassing the Hogwarts Castle exterior, courtyard, terrain, and entry thresholds.
_Avoid_: Exterior, outside, yard

**Interaction Point**:
A spatial trigger zone or interactive entity that surfaces interaction prompts on the HUD and handles player interactions.
_Avoid_: Hotspot, portal, trigger mesh

**Collision Proxy**:
An invisible, low-polygon geometric mesh used exclusively for player navigation and collision calculations, decoupled from high-detail visual assets.
_Avoid_: Hitbox, collider mesh, barrier

**Trigger Volume**:
An invisible 3D spatial boundary that detects player entry and exit to activate HUD prompts or zone transition events.
_Avoid_: Sensor, tripwire, trigger zone

**Fallback Mesh**:
A procedurally constructed visual stand-in rendered when external 3D asset files are absent or fail to load.
_Avoid_: Placeholder, dummy model, mock mesh

### Castle Architecture

**Architectural Part（建筑构件）**:
An individual feature of the castle, such as a pointed arch, stone window tracery, a buttress, or a stair flight. Its proportions and finish can vary from one building to another.
_Avoid_: Component without qualification

**Bay（开间）**:
One span of a façade or arcade between adjacent supports. It can contain a window, an open passage, or a solid wall.
_Avoid_: Window, arch opening
