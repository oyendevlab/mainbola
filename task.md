# MainBola: Project Task & Progress Tracker

> **Current Version:** `v0.6.0` (Completed)  
> **Previous Versions:** `v0.1.0` (Phase 1 Complete), `v0.2.0` (Phase 2 Complete), `v0.2.1` (Rebranding & Logo Complete), `v0.3.0` (Player Progression & Transfers Complete), `v0.4.0` (Audio & Trophies Complete), `v0.5.0` (Facilities & Knockout Cup Complete)  
> **Last Updated:** 2026-10-27

---

## 📌 Version History & Progress Summary

### 🟢 Version 0.1.0: Functional PWA Vertical Slice (Completed)
*Completed on 2026-10-26 • 57/57 Unit Tests Passing • Playwright E2E Verified*

- [x] **Project Scaffolding & Setup**
  - [x] Vite + React 18 + TypeScript + Tailwind CSS setup.
  - [x] Mobile-first dark theme styling (Dark Navy `#0F172A`, Emerald `#10B981`, Pitch Green).
  - [x] PWA manifest, service worker caching (Workbox), and installable icons (192px, 512px).
- [x] **Domain Models & Contracts (`src/types/`)**
  - [x] `Player` interface (Attributes: Attack, Defense, Passing, Speed, Stamina, Goalkeeping).
  - [x] `Club` and `ClubSnapshot` domain contracts.
  - [x] Formations: `4-3-3`, `4-4-2`, and `4-2-3-1` coordinate definitions and squad validation.
- [x] **Pure TypeScript Deterministic Simulation Engine (`src/engine/`)**
  - [x] Seeded PRNG via Mulberry32 algorithm.
  - [x] Fictional 15-player generator with position-weighted overall ratings.
  - [x] AI opponent club generator with 8 preset teams.
  - [x] Deterministic match simulator with tactical influences (`Attacking`, `Balanced`, `Defensive`).
  - [x] Invariant guarantee: Every goal matches final score; possession totals 100%.
- [x] **Phaser 3 Pixel Match Renderer (`src/renderer/`)**
  - [x] 16-bit retro pitch (480 × 270 native canvas resolution with `FIT` scaling).
  - [x] Procedural pixel-art textures: 22 players, distinct team kits, GK jerseys, soccer ball.
  - [x] Event timeline animation: passes with height arc, shots, saves, tackles, celebrations.
  - [x] Match playback controls: Play/Pause, 1x/2x/4x speed toggle, Restart replay.
  - [x] Clean React lifecycle integration (`game.destroy(true)` on unmount).
- [x] **Local Persistence & State Layer (`src/storage/`, `src/store/`)**
  - [x] IndexedDB stores via `idb`: `clubs`, `manager`, `matches`, `settings`.
  - [x] Safe initialization, migration safeguards, and explicit reset flow.
  - [x] Zustand state machine for reactive UI updates.
- [x] **Mobile-First UI & 5-Tab Navigation (`src/pages/`, `src/components/`)**
  - [x] Club creation wizard with customizable crest emblems and team colors.
  - [x] **Home Tab**: Club summary, record, quick match trigger, recent form.
  - [x] **Squad Tab**: Interactive tactical pitch, bench swapping, ratings inspection.
  - [x] **Match Tab**: Opponent preview, live replay viewport, commentary ticker, stats modal.
  - [x] **League Tab**: Preview of future asynchronous private leagues.
  - [x] **Profile Tab**: Manager level, lifetime stats, preferences, and reset confirmation.
- [x] **Testing & Documentation**
  - [x] 57 Vitest unit tests covering PRNG, Generator, Simulator, Storage, and Renderer.
  - [x] 1 Playwright E2E browser test verifying complete core user loop.
  - [x] Documentation suite: `README.md`, `GDD.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `DECISIONS.md`.

---

### 🟢 Version 0.2.0: Asynchronous Private Leagues & Competition (Completed)
*Completed on 2026-10-26 • 65/65 Unit Tests Passing • Playwright E2E Verified*

- [x] **1. League Domain Model & Architecture**
  - [x] Defined TypeScript contracts for `League`, `LeagueFixture`, `LeagueStanding`, and `TopScorer` (`src/types/league.ts`).
  - [x] Circle algorithm Round-Robin Fixture generator with balanced home/away distribution (`src/engine/league.ts`).
  - [x] Standings calculation engine (Pts, W, D, L, GF, GA, GD, Form guide).
  - [x] Golden Boot Top Goalscorers leaderboard aggregator.
  - [x] Seeded invitation code generator (format `PREFIX-NUM`, e.g. `RUSH-88`).
- [x] **2. IndexedDB Schema v2 & State Updates**
  - [x] Bumped IndexedDB to version 2 with `leagues` object store.
  - [x] Added `getActiveLeague()`, `saveActiveLeague()`, and `deleteActiveLeague()` repository methods.
  - [x] Updated `resetAllData()` to safely clear league stores.
  - [x] Zustand store actions: `createLeague`, `joinLeagueByCode`, `submitLeagueTactics`, `simulateLeagueMatchday`, `leaveLeague`.
- [x] **3. Interactive League Screen (`src/pages/LeagueTab.tsx`)**
  - [x] **League Creation & Join**: Custom league name, 4 or 6 teams options, invite code input.
  - [x] **League Standings Table**: Live standings with crests, points, goal difference, and last 5 form indicators (`W`/`D`/`L`).
  - [x] **Fixture Center**: Matchday rounds selector, Home vs Away cards, tactics lock-in status, and "Simulate Matchday" trigger.
  - [x] **Watch Replay Modal**: Replay any completed fixture in 2D retro pixel-art directly from the league match schedule.
  - [x] **Top Scorers Leaderboard**: Ranks players across all tournament fixtures with goal tallies.
- [x] **4. Verification & Testing**
  - [x] 8 new unit tests in `src/engine/__tests__/league.test.ts` and `src/store/__tests__/useGameStore.test.ts` (Total: 65 passing tests).
  - [x] Updated Playwright E2E test verifying full League flow: creating a league, viewing standings, locking tactics, simulating a matchday, and viewing a matchday replay.

---

### 🟢 Version 0.2.1: Rebranding to MainBola & App Logo Design (Completed)
*Completed on 2026-10-26 • 65/65 Unit Tests Passing • Playwright E2E Verified*

- [x] **1. Logo Design Selection & Proposals**:
  - Presented 3 curated concepts; user selected **"Pixel Bola Sepak"** (Retro 16-bit arcade pixel ball with emerald neon accent).
- [x] **2. Asset Generation**:
  - Created vector SVG logo & header branding (`public/logo.svg`, `public/favicon.svg`).
  - Generated PWA app icons via pixel-accurate PIL: `favicon.ico`, `icon-192.png`, `icon-512.png` (maskable), and `apple-touch-icon.png`.
- [x] **3. Text & Brand Name Replacement Across Application**:
  - Replaced "GOAL RUSH" / "GoalRush" with "MainBola" in `package.json`, `index.html`, `vite.config.ts`, `src/App.tsx`, `Header.tsx`, `ClubCreationModal.tsx`, `ProfileTab.tsx`, `simulator.ts`, and test specs.
- [x] **4. Test & Verification**:
  - 65/65 unit tests passed.
  - Production build (`tsc && vite build`) succeeded with 16 precached PWA service worker entries.
  - Playwright E2E test passed.

---

### 🟢 Version 0.3.0: Player Progression, Transfers & Squad Dynamics (Completed)
*Completed on 2026-10-26 • 74/74 Unit Tests Passing • Playwright E2E Verified*

- [x] **1. Data Model & IndexedDB Migration (Schema v3)**:
  - Added `fitness: number` (0–100) and `trainingXp: number` to `Player`.
  - Added `budget: number` (club funds) to `Club` (default 50,000 Credits).
  - Added `transfers` store to IndexedDB for persistent scout market pool.
  - Backward-compatible normalization guaranteeing legacy clubs receive default budget ($50,000) and 100% fitness.
- [x] **2. Training & Progression Engine (`src/engine/training.ts`)**:
  - Training drills: Attacking, Defensive, Playmaking, Goalkeeping, and Individual Physio.
  - Attribute progression (+1 to +2) with dynamic overall rating and market valuation recalculation.
  - Team Physio Recovery clinic for instant full-squad recovery (4,500 Credits).
- [x] **3. Fatigue & Fitness System**:
  - Match simulation depletes starting XI player fitness (-15% to -24% based on stamina).
  - Benched substitutes naturally recover (+20% fitness per match).
  - Low fitness reduces player effective match attributes during simulation.
  - Physio recovery session feature for instant squad recovery.
- [x] **4. Transfer Market & Scouting Engine (`src/engine/transfers.ts`)**:
  - Dynamic scout market generating 6 fictional free agents across positions.
  - Valuation algorithm based on rating, age, and attributes.
  - Buy scouted players and Sell existing squad members with budget updates and minimum 12-player roster safeguard.
- [x] **5. UI & Squad Management Enhancement (`src/pages/SquadTab.tsx`, `Header.tsx`)**:
  - Sub-navigation in Squad Tab: **Taktikal & Formasi**, **Pusat Latihan**, and **Pasaran Pemindahan**.
  - Visual fitness indicators (green/yellow/red) and stat previews on player cards.
  - Live budget badge in Header with coin icon.
- [x] **6. Verification & Automated Testing**:
  - 9 new Vitest unit tests in `src/engine/__tests__/progression.test.ts` (Total: 74 passing tests).
  - Playwright E2E test covering training a player, verifying attribute gains, and signing a scouted target.
  - Production PWA build verification (16 precache assets generated).

---

### 🟢 Version 0.4.0: Matchday Immersion, Audio FX & Trophy Cabinet (Completed)
*Completed on 2026-10-26 • 106/106 Unit Tests Passing • Playwright E2E Verified*

- [x] **1. Web Audio FX Procedural Synthesizer (`src/engine/audio.ts`)**:
  - [x] Procedural 8-bit/16-bit sound synthesis via Web Audio API (zero audio file downloads, 0 KB footprint).
  - [x] Whistle synthesizers with FM modulation (kickoff, halftime, fulltime).
  - [x] Exponential pitch-drop kick & pass sounds.
  - [x] Retro 8-bit stadium cheer fanfare (arpeggio + white-noise bandpass roar).
  - [x] Crunch tackle & deflection impact synthesizers.
  - [x] Safe Node/SSR fallback and user setting mute toggle.
- [x] **2. Halftime Tactical Interventions & Substitutions (`src/pages/MatchTab.tsx`, `src/renderer/MatchScene.ts`)**:
  - [x] Automatic pause and referee whistle at 45' halftime.
  - [x] Halftime modal displaying live score, 1st half performance, and substitution count.
  - [x] In-match tactical mentality adjustment (`Attacking`, `Balanced`, `Defensive`).
  - [x] Up to 3 tactical player substitutions between starting XI and bench.
  - [x] Seamless continuation into 2nd half.
- [x] **3. Phaser 3 Match Visual Polish & Audio Synchronization**:
  - [x] Live sound triggers hooked directly into simulation event playback (kickoff, pass, tackle, shot, save, goal, fulltime).
  - [x] Pixel-art celebration effects and stadium fanfare on goals.
  - [x] Replay controls bar equipped with audio toggle button (`Volume2` / `VolumeX`).
- [x] **4. Trophy Cabinet & League Season Awards (`src/pages/ProfileTab.tsx`, `src/pages/LeagueTab.tsx`, `src/store/useGameStore.ts`)**:
  - [x] Trophy engine (`src/engine/trophies.ts`) with 5 unlockable achievements:
    - 🏆 *Juara Liga (Champion)*
    - 👟 *Kasut Emas (Golden Boot)*
    - 💯 *Kelab 100 Gol (Centurion)*
    - 🛡️ *The Invincibles (Tanpa Kalah)*
    - 🧠 *Taktikal Mastermind*
  - [x] Interactive Trophy Cabinet grid in Profile Tab with golden badges and unlock criteria progress.
  - [x] Season Complete Award Ceremony card in League Tab with "Tuntut Hadiah Juara (25,000 Credits)" and "Mulakan Musim Seterusnya" button.
- [x] **5. Verification & Testing**:
  - [x] 32 new unit tests added (12 audio tests, 20 trophy engine tests) bringing total to 106 tests across 10 test suites.
  - [x] Playwright E2E test verifying audio toggle, halftime workflow, and trophy cabinet display.
  - [x] Production build (`tsc && vite build`) passed with 16 precached PWA service worker entries.

---

### 🟢 Version 0.5.0: Club Infrastructure, Knockout Cup, Sponsorships, Discipline & Match Sharing (Completed)
*Completed on 2026-10-27 • 137/137 Unit Tests Passing • Playwright E2E Verified*

- [x] **1. Club Infrastructure & Facility Engine (`src/engine/facilities.ts`, `src/types/index.ts`)**:
  - [x] Stadium upgrades (Levels 1–5): Capacity up to 50,000 seats, automated gate receipts on Home matches (+RM2,000 to +RM22,000 per home fixture).
  - [x] Youth Academy upgrades (Levels 1–3): Scouting and promoting 16–18 year old prodigies with high potential ratings directly into squad.
  - [x] Medical Centre upgrades (Levels 1–3): Passive stamina & fatigue recovery bonus (+5% to +15%).
  - [x] Interactive UI component `ClubFacilitiesSection` integrated into Home tab.
- [x] **2. Knockout Cup Tournament — Piala MainBola (`src/engine/cup.ts`, `src/types/cup.ts`, `src/components/cup/KnockoutCupView.tsx`)**:
  - [x] 8-team single-elimination tournament bracket: Suku Akhir ➡️ Separuh Akhir ➡️ Pentas Akhir.
  - [x] Extra Time & Sudden-Death Penalty Shootout logic for drawn knockout fixtures.
  - [x] Full 2D pixel-art Phaser match replay integration for Cup matches.
  - [x] Champion reward: RM35,000 credit prize, winner announcement banner, and "Juara Piala MainBola" trophy.
  - [x] Sub-navigation toggle in League tab between "🏆 Liga Utama" and "🥇 Piala MainBola (Kalah Mati)".
- [x] **3. Official Club Sponsorships & Match Bonuses (`src/engine/sponsors.ts`)**:
  - [x] Sponsor tiers: Local Bakery (Bronze), Tech Startup (Silver), Global Airlines (Gold).
  - [x] Upfront signing bonuses, per-win bonuses, and clean-sheet rewards credited directly to club budget upon match recording.
- [x] **4. Disciplinary System & In-Match Cards (`src/engine/simulator.ts`, `src/types/index.ts`)**:
  - [x] Added `YELLOW_CARD` and `RED_CARD` event simulation based on deterministic seed.
  - [x] 1-match suspension automatically triggered on 2 yellow cards or 1 straight red card.
  - [x] Visual disciplinary indicators (`Digantung`, `🟨`, `🟥`) on squad cards.
- [x] **5. Replay Sharing & Full Game Save Backup (`src/engine/sharing.ts`, `src/pages/ProfileTab.tsx`)**:
  - [x] Export game save to `.json` file and clipboard copy.
  - [x] Import game save with schema validation and error feedback.
  - [x] Deterministic match replay sharing code encoder & decoder (`MBR1_` base64 token).
- [x] **6. Storage & Database Migration (IndexedDB v4)**:
  - [x] Upgraded schema to `DB_VERSION = 4` with new `cup` object store.
  - [x] Backward-compatibility normalization ensuring existing clubs safely receive default level 1 facilities and null sponsor.
- [x] **7. Verification & Testing**:
  - [x] 31 new unit tests (Total: 137 passing tests across 13 test suites).
  - [x] Playwright E2E browser test passing (covering facilities, cup tab, data export, squad actions).
  - [x] Production build (`tsc && vite build`) passed with 16 precached PWA service worker entries.

---

### 🟢 Version 0.6.0: Asynchronous PvP Duels, Dynamic Weather, Kit Designer, Press Conferences & MOTM Ratings (Completed)
*Completed on 2026-10-27 • 168/168 Unit Tests Passing • Playwright E2E Verified*

- [x] **1. Asynchronous PvP Duel Engine (`src/engine/pvp.ts`, `src/types/pvp.ts`, `src/components/match/PvPChallengeModal.tsx`)**:
  - [x] Base64 code encoder/decoder with `MBPVP_` prefix packing full club snapshot, starting XI, formation, and manager Elo.
  - [x] URL hash routing support (`#challenge=MBPVP_...`) for 1-click PvP duel imports.
  - [x] Standard K=32 Elo rating system updating after every PvP duel with full win/draw/loss tracking.
  - [x] Manager PvP Ranks: Amatur (🥉 <1100), Semi-Pro (🥈 1100–1299), Profesional (🥇 1300–1499), Elit (💎 1500+).
  - [x] New Trophy: *Wira PvP (PvP Champion)* awarded upon reaching Elo 1300+ or 5 PvP duel victories.
- [x] **2. Dynamic Weather & Pitch Visual Effects (`src/engine/weather.ts`, `src/renderer/MatchScene.ts`)**:
  - [x] Three dynamic weather conditions: `Sunny` (☀️ Panas Terik), `Rainy` (🌧️ Hujan Lebat), `Night` (🌙 Malam Lampu Limpah).
  - [x] Deterministic weather engine tied to match seed with pre-match forecast badge.
  - [x] Realistic gameplay modifiers: Sunny increases player stamina depletion rate (+20%), Rainy increases sliding tackle frequency and foul/card risk (+25%).
  - [x] Phaser 3 visual rendering: Animated procedural raindrops across canvas, darkened stadium night tint, and 4 corner stadium floodlight glow effects.
- [x] **3. Kit Designer & Smart Kit Clash Detection (`src/components/squad/KitDesignerModal.tsx`, `src/renderer/MatchScene.ts`)**:
  - [x] Full Away kit customizer with primary & secondary color pickers.
  - [x] 4 Kit patterns: Solid, Vertical Stripes, Hoops, and Half/Half.
  - [x] Smart kit clash algorithm: Automatically detects when home and opponent primary jersey colors clash (RGB Euclidean distance < 85) and automatically activates the away kit.
- [x] **4. Pre-Match Press Conferences & Squad Morale (`src/engine/press.ts`, `src/components/match/PressConferenceModal.tsx`)**:
  - [x] Media questions generator addressing team form, tactical mentality, and key player expectations.
  - [x] 3 selectable manager answers per press conference delivering direct morale adjustments (+4% to +8% boost or risky penalties).
  - [x] Squad Morale system: 20% to 100% morale indicator (🔥) on all player cards influencing match performance.
- [x] **5. Player Performance Ratings & Man of the Match (`src/engine/ratings.ts`, `src/engine/simulator.ts`)**:
  - [x] In-match 5.0 to 10.0 performance rating calculator evaluating goals, assists, shots on target, saves, clean sheets, and cards.
  - [x] Official ⭐ *Pemain Terbaik Perlawanan (Man of the Match)* spotlight card in post-match breakdown.
  - [x] Individual player ratings list for both home and away squads.
- [x] **6. Verification & Testing**:
  - [x] 31 new unit tests (Total: 168 passing unit tests across 17 test suites).
  - [x] Playwright E2E browser test passing covering Kit Designer, Press Conference, and PvP duel modals.
  - [x] Production build (`tsc && vite build`) passed with 16 precached PWA service worker entries.

---

## 🔮 Version 0.7.0: Real-Time Audio Commentary, Matchday Weather Forecast, & Advanced Tournaments (Planned)
