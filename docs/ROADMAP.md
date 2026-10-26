# GOAL RUSH: Product Roadmap

## Phase 1: Functional PWA Vertical Slice (Complete ✅)
- [x] Pure TypeScript deterministic simulation engine with Mulberry32 PRNG.
- [x] Club creation flow with custom crests and colors.
- [x] 15-player squad generation with 1-100 attributes and position-weighted ratings.
- [x] Squad management with 4-3-3, 4-4-2, 4-2-3-1 formations and Starting XI validation.
- [x] Selectable tactical styles (Attacking, Balanced, Defensive).
- [x] Phaser 3 top-down 2D pixel-art match replay with procedural sprites.
- [x] Replay controls: Pause/resume, 1x/2x/4x speed, restart.
- [x] Full IndexedDB persistence schema with reset flow.
- [x] Mobile-first PWA offline shell with Service Worker precaching.
- [x] Comprehensive test suites: 57 Vitest unit tests and Playwright E2E verification.

---

## Phase 2: Asynchronous Private Leagues (Next Phase 🎯)
- **Private League Creation**:
  - 6-character to 8-character invitation codes for friends.
  - Configurable tournament schedules (e.g. daily fixture at 20:00 UTC).
- **Asynchronous Lineup Submission**:
  - Managers submit tactics and Starting XI anytime prior to fixture deadlines.
  - Server-side deterministic execution of `simulateMatch` using the shared simulation engine.
- **Match Replay Sharing**:
  - Storing deterministic match seed and event timeline on cloud server.
  - Both players watch identical pixel-art replays with live commentary.
- **Backend & Sync**:
  - Lightweight serverless API (Cloudflare Workers or Supabase Edge Functions).
  - Webhook notifications for completed fixtures.

---

## Phase 3: Player Progression & Economy
- Player training routines to improve individual attributes.
- Match fatigue, fitness, and injury simulation.
- Transfer market (free agents and youth scout generation).
- Stadium upgrades and sponsor contracts.
