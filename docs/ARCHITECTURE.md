# GOAL RUSH: System Architecture

## 1. Architectural Overview

The application is structured into three strictly decoupled layers:

```
┌────────────────────────────────────────────────────────┐
│                      Application UI                    │
│      React 18 • Tailwind CSS • Zustand • PWA Shell     │
│   (Club Creation, Squad Pitch, Navigation, Match HUD)  │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│      Simulation Engine      │   │     Match Replay Engine     │
│       Pure TypeScript       │   │           Phaser 3          │
│    (Seeded PRNG, Models,    │   │  (Procedural Pixel Sprites, │
│     Generators, Timelines)  │──▶│   Tween Interpolator, HUD)  │
└─────────────────────────────┘   └─────────────────────────────┘
               │
               ▼
┌─────────────────────────────┐
│       IndexedDB Layer       │
│    idb wrapper • Schema v1  │
│   (Clubs, Matches, Profile) │
└─────────────────────────────┘
```

## 2. Decoupled Layers

### 2.1 Pure TypeScript Simulation Engine (`src/engine`)
- **Portability**: Completely free of DOM, React, Phaser, Canvas, or network dependencies.
- **Mulberry32 PRNG**: A 32-bit state generator that ensures reproducible pseudorandom values. Given identical club snapshots and seed, every event, shot, save, and score is 100% deterministic.
- **Server Readiness**: Can be imported into an Edge worker or Node.js server without modification for Phase 2 asynchronous matches.

### 2.2 Match Visualizer (`src/renderer`)
- **Phaser 3 Canvas**: Renders inside a 480 × 270 native pixel buffer scaled using `Phaser.Scale.FIT`.
- **Event Consumer**: Consumes pre-computed `MatchEvent[]`. It does **not** decide outcomes or score goals independently.
- **Lifecycle Safety**: React wrapper safely destroys Phaser instances on unmount via `game.destroy(true)` to prevent canvas accumulation and WebGL context leakage.

### 2.3 State & Local Persistence (`src/storage`, `src/store`)
- **IndexedDB**: Persistent object stores for `clubs`, `manager`, `matches`, and `settings` with versioning safeguards.
- **Zustand Store**: Single-source-of-truth state machine providing immediate reactivity to UI components.

## 3. PWA Capabilities
- Manifest configuration for standalone fullscreen application behavior.
- Workbox service worker caching all static chunks, CSS, HTML, and assets for complete offline playability.
