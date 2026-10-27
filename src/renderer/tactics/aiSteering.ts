/**
 * AI Steering Behaviors & Tactical Spatial System (v0.7.2)
 * Inspired by awesome-gamedev-agent-skills (Phaser 3 Game AI, Steering, Flocking)
 */

export interface Vector2D {
  x: number;
  y: number;
}

export type PlayerTacticalState =
  | 'IDLE'
  | 'JOGGING'
  | 'RUNNING'
  | 'MAKING_RUN'
  | 'PRESSING'
  | 'COVERING'
  | 'KICKING'
  | 'SLIDING'
  | 'DIVING';

export interface TacticalPlayerInput {
  id: string;
  team: 'home' | 'away';
  role: 'GK' | 'DEF' | 'MID' | 'ATT';
  isGK: boolean;
  baseX: number;
  baseY: number;
  currentX: number;
  currentY: number;
  state?: PlayerTacticalState;
}

export interface TacticalContext {
  ballX: number;
  ballY: number;
  attackingTeam: 'home' | 'away';
  isShootingPhase?: boolean;
  isSecondHalf?: boolean;
  pitchBounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    centerX: number;
    centerY: number;
  };
}

/**
 * Calculates separation force to prevent player crowding (Reynolds' Steering).
 */
export function calculateSeparation(
  targetPlayer: TacticalPlayerInput,
  allPlayers: TacticalPlayerInput[],
  minDistance: number = 18
): Vector2D {
  let steerX = 0;
  let steerY = 0;
  let count = 0;

  for (const other of allPlayers) {
    if (other.id === targetPlayer.id) continue;
    const dx = targetPlayer.currentX - other.currentX;
    const dy = targetPlayer.currentY - other.currentY;
    const distSq = dx * dx + dy * dy;

    if (distSq > 0 && distSq < minDistance * minDistance) {
      const dist = Math.sqrt(distSq);
      // Normalized repulsion inversely proportional to distance
      steerX += (dx / dist) * (minDistance - dist);
      steerY += (dy / dist) * (minDistance - dist);
      count++;
    }
  }

  if (count > 0) {
    steerX /= count;
    steerY /= count;
  }

  return { x: steerX, y: steerY };
}

/**
 * Calculates offside line (X position of the last outfield defender).
 */
export function calculateOffsideLine(
  defenders: TacticalPlayerInput[],
  attackingTeam: 'home' | 'away',
  isSecondHalf: boolean = false
): number {
  const outfieldDefenders = defenders.filter((p) => !p.isGK);
  const homeAttacksRight = !isSecondHalf;
  const isAttackingRight =
    (attackingTeam === 'home' && homeAttacksRight) ||
    (attackingTeam === 'away' && !homeAttacksRight);

  if (outfieldDefenders.length === 0) {
    return isAttackingRight ? 380 : 100;
  }

  if (isAttackingRight) {
    // Attacking right (towards X=456) -> last defender has lowest X among defenders
    let minX = Infinity;
    for (const d of outfieldDefenders) {
      if (d.currentX < minX) minX = d.currentX;
    }
    return minX;
  } else {
    // Attacking left (towards X=24) -> last defender has highest X among defenders
    let maxX = -Infinity;
    for (const d of outfieldDefenders) {
      if (d.currentX > maxX) maxX = d.currentX;
    }
    return maxX;
  }
}

/**
 * Computes high-fidelity tactical target coordinates and state for every player.
 * Features progressive build-up attacks, controlled defensive retreats, and half-time side swapping.
 */
export function computeTeamTacticalTarget(
  player: TacticalPlayerInput,
  allPlayers: TacticalPlayerInput[],
  context: TacticalContext,
  receivingPlayerId?: string
): { targetX: number; targetY: number; state: PlayerTacticalState } {
  const { ballX, ballY, attackingTeam, isShootingPhase, isSecondHalf = false, pitchBounds } = context;
  const isAttacking = player.team === attackingTeam;
  const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';

  // In 1st half: Home attacks right (+1), Away attacks left (-1)
  // In 2nd half: Home attacks left (-1), Away attacks right (+1)
  const homeAttackDir = isSecondHalf ? -1 : 1;
  const forwardDir = attackingTeam === 'home' ? homeAttackDir : -homeAttackDir;

  // Pitch boundaries
  const { left, right, top, bottom, centerY } = pitchBounds;
  const pitchLength = right - left;

  // Direction of player's defending goal line
  const homeGoalX = isSecondHalf ? right - 6 : left + 6;
  const awayGoalX = isSecondHalf ? left + 6 : right - 6;
  const ownGoalX = player.team === 'home' ? homeGoalX : awayGoalX;
  const opponentGoalX = player.team === 'home' ? awayGoalX : homeGoalX;

  // Ball progress along attacking direction: 0.0 (deep in own third) to 1.0 (deep in opponent box)
  const ballProgress =
    forwardDir === 1
      ? Math.max(0, Math.min(1, (ballX - left) / pitchLength))
      : Math.max(0, Math.min(1, (right - ballX) / pitchLength));

  // 1. Goalkeeper Positioning
  if (player.isGK) {
    if (isAttacking) {
      // Sweeper keeper stepping forward to support progressive possession
      const targetX = player.baseX + forwardDir * (12 + ballProgress * 14);
      const targetY = centerY + (ballY - centerY) * 0.15;
      return {
        targetX: Math.max(left + 6, Math.min(right - 6, targetX)),
        targetY: Math.max(centerY - 18, Math.min(centerY + 18, targetY)),
        state: 'JOGGING',
      };
    } else {
      // Defending goalkeeper covering shot angle
      const clampedY = Math.max(
        centerY - 16,
        Math.min(centerY + 16, centerY + (ballY - centerY) * 0.35)
      );
      return {
        targetX: ownGoalX,
        targetY: clampedY,
        state: isShootingPhase ? 'DIVING' : 'IDLE',
      };
    }
  }

  // 2. Identify Active Presser and Covering Defender
  const defendingOutfield = allPlayers.filter(
    (p) => p.team === defendingTeam && !p.isGK
  );

  let nearestDefDist = Infinity;
  let nearestDefId: string | null = null;
  let secondDefDist = Infinity;
  let secondDefId: string | null = null;

  for (const d of defendingOutfield) {
    const dx = d.currentX - ballX;
    const dy = d.currentY - ballY;
    const distSq = dx * dx + dy * dy;
    if (distSq < nearestDefDist) {
      secondDefDist = nearestDefDist;
      secondDefId = nearestDefId;
      nearestDefDist = distSq;
      nearestDefId = d.id;
    } else if (distSq < secondDefDist) {
      secondDefDist = distSq;
      secondDefId = d.id;
    }
  }

  // 3. Target Position Computation
  let targetX = player.baseX;
  let targetY = player.baseY;
  let state: PlayerTacticalState = 'JOGGING';

  if (isAttacking) {
    // If player is the targeted receiver
    if (receivingPlayerId && player.id === receivingPlayerId) {
      return {
        targetX: Math.max(left + 8, Math.min(right - 8, ballX)),
        targetY: Math.max(top + 8, Math.min(bottom - 8, ballY)),
        state: 'RUNNING',
      };
    }

    const flankDist = Math.abs(player.baseY - centerY);
    const isBallOnSameFlank =
      Math.sign(player.baseY - centerY) === Math.sign(ballY - centerY);

    if (player.role === 'ATT') {
      if (isShootingPhase) {
        // Crash the box for tap-in or rebound
        targetX = opponentGoalX - forwardDir * (18 + (player.id.charCodeAt(0) % 16));
        targetY = ballY + ((player.id.charCodeAt(1) % 24) - 12);
        state = 'MAKING_RUN';
      } else {
        // Progressive run pushing forward step-by-step
        const pushX = forwardDir * (26 + ballProgress * 32);
        const lateralShift = (ballY - player.baseY) * 0.30;
        targetX = player.baseX + pushX + (ballX - player.baseX) * 0.28;
        targetY = player.baseY + lateralShift;
        state = 'MAKING_RUN';
      }
    } else if (player.role === 'MID') {
      // Midfield support triangle advancing progressively
      const pushX = forwardDir * (16 + ballProgress * 24);
      const lateralShift = (ballY - player.baseY) * 0.36;
      targetX = player.baseX + pushX + (ballX - player.baseX) * 0.25;
      targetY = player.baseY + lateralShift;
      state = 'RUNNING';
    } else {
      // DEF: High defensive line pushing up to halfway line during attacks
      // When attacking deep (ballProgress > 0.4), defense squeezes opponent into their half
      const halfwayX = (left + right) / 2;
      const maxDefPush = Math.abs(halfwayX - player.baseX) - 15;
      let pushX = forwardDir * Math.min(maxDefPush, 16 + ballProgress * 42);

      // Overlapping run for fullbacks on active flank
      if (flankDist > 42 && isBallOnSameFlank && ballProgress > 0.4) {
        pushX += forwardDir * 28;
        state = 'MAKING_RUN';
      } else {
        state = ballProgress > 0.6 ? 'RUNNING' : 'JOGGING';
      }
      targetX = player.baseX + pushX;
      targetY = player.baseY + (ballY - player.baseY) * 0.22;
    }
  } else {
    // ==========================================
    // DEFENDING TEAM BEHAVIORS: Controlled Retreat & Press
    // ==========================================
    const dropDir = player.team === 'home' ? -homeAttackDir : homeAttackDir;

    if (player.id === nearestDefId) {
      // Primary Presser: Closes down the ball carrier actively
      const pressOffset = -forwardDir * 16;
      targetX = ballX + pressOffset;
      targetY = ballY + (player.baseY > centerY ? -6 : 6);
      state = isShootingPhase ? 'SLIDING' : 'PRESSING';
    } else if (player.id === secondDefId) {
      // Secondary Defender: Covers the space behind the presser
      const coverOffset = -forwardDir * 32;
      targetX = ballX + coverOffset;
      targetY = centerY + (ballY - centerY) * 0.55;
      state = 'COVERING';
    } else {
      // Rest of defensive block: Drop back progressively in compact lines
      const defDropX = dropDir * (14 + ballProgress * 24);

      if (player.role === 'DEF') {
        targetX = player.baseX + defDropX;
        // Compact tightly towards central channel
        targetY = centerY + (player.baseY - centerY) * 0.62 + (ballY - centerY) * 0.24;
        state = 'JOGGING';
      } else if (player.role === 'MID') {
        targetX = player.baseX + defDropX;
        targetY = centerY + (player.baseY - centerY) * 0.68 + (ballY - centerY) * 0.28;
        state = 'JOGGING';
      } else {
        // Strikers drop near halfway line as target outlet
        const halfwayTarget = isSecondHalf
          ? (player.team === 'home' ? right - 155 : left + 155)
          : (player.team === 'home' ? left + 155 : right - 155);
        targetX = halfwayTarget;
        targetY = player.baseY + (ballY - player.baseY) * 0.16;
        state = 'IDLE';
      }
    }
  }

  // Apply separation force to avoid player overlapping
  const sep = calculateSeparation(player, allPlayers, 18);
  targetX += sep.x;
  targetY += sep.y;

  // Clamp within pitch lines
  targetX = Math.max(left + 8, Math.min(right - 8, targetX));
  targetY = Math.max(top + 8, Math.min(bottom - 8, targetY));

  return { targetX, targetY, state };
}
