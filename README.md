# GOAL RUSH: Football Manager Lite (PWA)
> Mobile-first Progressive Web App football manager featuring 2D retro pixel-art match replays and a pure TypeScript deterministic simulation engine.

[![Tests](https://img.shields.io/badge/Vitest-57%20Passed-emerald)](https://vitest.dev)
[![E2E](https://img.shields.io/badge/Playwright-Passed-emerald)](https://playwright.dev)
[![PWA](https://img.shields.io/badge/PWA-Installable-blue)](https://web.dev/progressive-web-apps/)

---

## 🎮 Features in Phase 1 (Vertical Slice)

- **Club Creation**: Establish a custom football club with custom names, primary/secondary colors, and original crest badges.
- **15-Player Squad Generator**: Balanced squad generation (2 GK, 5 DEF, 5 MID, 3 ATT) with 1–100 individual attributes (`attack`, `defense`, `passing`, `speed`, `stamina`, `goalkeeping`) and weighted overall ratings.
- **Tactical Pitch & Lineup Management**: Interactive pitch view with slot assignments, bench swapping, and validation for formations: `4-3-3`, `4-4-2`, and `4-2-3-1`.
- **Tactical Styles**: Selectable manager philosophies (`Attacking`, `Balanced`, `Defensive`) with measurable simulation trade-offs.
- **Pure Deterministic Simulation Engine**: Seeded PRNG (Mulberry32) produces 100% reproducible match events, scores, and statistics without DOM or network dependencies.
- **Phaser 3 Pixel Match Renderer**: Retro 16-bit 480×270 top-down football match replay with procedural player kits, animated ball physics, celebrations, scoreboard HUD, and replay speeds (1x, 2x, 4x).
- **Offline PWA & Local Persistence**: Complete IndexedDB persistence schema (`clubs`, `manager`, `matches`, `settings`) and Service Worker offline caching via `vite-plugin-pwa`.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (tested on Node v22)
- npm or pnpm

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser or mobile viewport.

### Production Build & PWA Preview
```bash
npm run build
npm run preview
```

### Running Tests
```bash
# Run unit test suite (57 tests)
npm test

# Run Playwright End-to-End tests (Core loop, PWA flow, persistence)
npm run test:e2e
```

---

## 📁 Project Architecture

```
src/
├── types/              # Unified TypeScript domain contracts & formations
├── engine/             # Pure TypeScript deterministic simulator (Mulberry32 PRNG)
├── renderer/           # Phaser 3 16-bit pixel match scene & React wrapper
├── storage/            # IndexedDB schema, repository methods, and reset flow
├── store/              # Zustand application state management
├── components/         # Mobile-first UI components, crests, and layouts
│   ├── common/         # BadgeIcon, modals
│   └── layout/         # Header, Navbar (5 tabs)
└── pages/              # 5 Tab Screens: Home, Squad, Match, League, Profile
```

---

## 📚 Documentation

- [Game Design Document (GDD)](docs/GDD.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Phase 2 Roadmap](docs/ROADMAP.md)
- [Architecture Decision Records (ADR)](docs/DECISIONS.md)
