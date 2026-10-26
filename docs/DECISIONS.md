# GOAL RUSH: Architecture Decision Records (ADR)

## ADR-001: Separation of Engine from Phaser & React
- **Status**: Accepted
- **Context**: Football games often tangle animation logic with simulation results, causing visual desyncs or making multiplayer difficult later.
- **Decision**: Keep `src/engine` 100% pure TypeScript with no DOM, React, or Phaser dependencies. Phaser only functions as a dumb renderer that reads a generated timeline of events.
- **Consequences**: Easy unit testing, serverless portability for Phase 2, and zero race conditions between visual scores and game records.

## ADR-002: Seeded PRNG via Mulberry32
- **Status**: Accepted
- **Context**: `Math.random()` cannot be seeded in standard JavaScript, which prevents deterministic replays.
- **Decision**: Implement a custom `PRNG` class using the 32-bit Mulberry32 algorithm.
- **Consequences**: Any match can be re-simulated or replayed with byte-for-byte consistency given the seed and team snapshots.

## ADR-003: Procedural Pixel Art Sprites
- **Status**: Accepted
- **Context**: Downloading external sprite sheets increases bundle size and restricts dynamic team jersey coloring.
- **Decision**: Generate 16×16 player sprites, 6×6 ball sprites, and pitch textures procedurally using Phaser Graphics and Canvas texture generation.
- **Consequences**: Instantaneous loading, zero network asset dependencies, offline self-containment, and instant color customizability based on club palette.

## ADR-004: IndexedDB via `idb` instead of LocalStorage
- **Status**: Accepted
- **Context**: `localStorage` has a synchronous blocking API and a 5MB storage limit that quickly chokes on match timelines and player databases.
- **Decision**: Use `idb` Promise-based wrapper around IndexedDB with versioned schema stores (`clubs`, `manager`, `matches`, `settings`).
- **Consequences**: High-capacity asynchronous storage without main thread UI freezing.

## ADR-005: 480 × 270 Fit-Scaled Canvas with Responsive Shell
- **Status**: Accepted
- **Context**: Mobile portrait users need to read commentary and review match statistics without forcing device rotation.
- **Decision**: Embed the 16:9 480×270 canvas into the top viewport with crisp pixelated CSS rendering, and place commentary, controls, and stats immediately underneath.
- **Consequences**: Fluid usability on both 320px mobile displays and desktop browser windows.
