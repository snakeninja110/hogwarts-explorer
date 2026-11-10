# Hogwarts Explorer

3D interactive Hogwarts Castle explorer built with **Babylon.js** + **React** + **TypeScript**.

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
- **E** — Interact (near secret passages)

## Project Structure

```
src/
├── core/           # Babylon.js engine & camera
├── world/zones/    # Scene zones (exterior, great hall, etc.)
├── rendering/      # Lighting, materials, post-processing
├── audio/          # Spatial audio manager
├── components/     # React UI components
├── hooks/          # React hooks for Babylon bridge
└── utils/          # Asset loading utilities
```
