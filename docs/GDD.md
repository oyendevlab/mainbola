# GOAL RUSH: Game Design Document (GDD)

## 1. Game Concept & Vision
GOAL RUSH is a casual, accessible football management game engineered for mobile-first play sessions. Unlike spreadsheet-heavy football simulators, GOAL RUSH emphasizes immediate tactical gratification combined with retro 16-bit pixel-art visual replays.

## 2. Core Game Loop
1. **Club Foundation**: Manager customizes club name, home/away colors, and crest.
2. **Squad Tuning**: Select starting XI across 15 squad players matching formation constraints (`4-3-3`, `4-4-2`, `4-2-3-1`).
3. **Tactical Selection**: Choose tactical posture (`Attacking`, `Balanced`, `Defensive`).
4. **Kickoff**: Initiate simulation against AI club snapshots with a deterministic seed.
5. **Watch Replay**: Follow the 2D top-down match with play/pause and 1x/2x/4x speed controls.
6. **Match Breakdown**: Review post-match statistics (possession, shots, saves, tackles) and record results to lifetime statistics.

## 3. Player Attributes & Rating Model
Attributes range on an integer scale from 1 to 100:
- **ATT (Attack)**: Finishing prowess and offensive positioning.
- **DEF (Defense)**: Tackling, interception timing, and defensive marking.
- **PAS (Passing)**: Pass completion probability and ball distribution.
- **SPD (Speed)**: Player movement speed during ball pursuit and counter-attacks.
- **STA (Stamina)**: Work rate and late-match consistency.
- **GK (Goalkeeping)**: Shot-stopping reflexes and dive reach (heavily weighted for Goalkeepers).

### Overall Rating (OVR) Weightings:
- `GK`: 70% Goalkeeping, 10% Defense, 8% Passing, 6% Speed, 6% Stamina.
- `DEF`: 45% Defense, 20% Stamina, 15% Speed, 12% Passing, 8% Attack.
- `MID`: 35% Passing, 20% Stamina, 18% Attack, 15% Defense, 12% Speed.
- `ATT`: 45% Attack, 22% Speed, 15% Passing, 12% Stamina, 6% Defense.

## 4. Tactical Influences on Simulation
- **Attacking**: +45% shot frequency, high offensive pressing, +35% turnover and counter-attack exposure.
- **Defensive**: -35% shot volume, +30% tackle bonus, +25% goalkeeper save bonus, reduced turnover risk.
- **Balanced**: Standard baseline calculation between possession, offensive moves, and defensive security.

## 5. Visual Match Representation
- Top-down 16:9 pixel art pitch (480 × 270 native canvas resolution).
- 22 visible players with procedural kits reflecting club colors.
- Dynamic ball flight with height scaling and shadow projection.
- Goal celebration animations, net shaking, flash banners, and confetti.
