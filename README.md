# Hogwarts Explorer

3D interactive Hogwarts Castle explorer built with **Babylon.js** + **React** + **TypeScript**.

The current scene contains the Great Hall, its late-film entrance courtyard, the Main Tower with the Headmaster's turrets, and the lakeside Boathouse. Walk mode starts inside the courtyard gate. The side arch on the left leads down the cliff stairs to the Boathouse's rear door.

Store local photos and scans in [references/](references/README.md). The [building reference workflow](AGENTS.md) explains what to verify before modeling.

## Getting Started

```bash
npm install
npm run dev
```

## Tech Stack

- **Babylon.js** — 3D rendering engine with PBR, collision detection, spatial audio
- **React 18** — UI layer (HUD, loading screen, settings)
- **Vite** — Build tool with HMR
- **TypeScript** — Type safety

## Controls

- **WASD** — Move
- **Mouse** — Look around
- **Click** — Capture cursor
- **E** — Enter or exit the Great Hall at its door
- **V / Castle Overview** — Switch to an orbit view of the exterior. Drag to rotate, scroll or pinch to zoom, and right-drag or use two fingers to pan.

## Project Structure

```
src/
├── core/           # Babylon.js engine & camera
├── world/generators/ # Procedural buildings and shared architectural parts
├── world/zones/    # Scene zones (exterior, great hall, etc.)
├── rendering/      # Lighting, materials, post-processing
├── audio/          # Spatial audio manager
├── components/     # React UI components
├── hooks/          # React hooks for Babylon bridge
└── utils/          # Asset loading utilities
```

[RoofParts.ts](src/world/generators/RoofParts.ts) provides the shared pitched roof, octagonal spire, and radial profile builders. Each building supplies its own dimensions and materials. The courtyard turret and boathouse keep their own roof profiles, window openings, and ornaments.
