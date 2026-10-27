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
  attackingTeam: 'home' | 'away'
): number {
  const outfieldDefenders = defenders.filter((p) => !p.isGK);
  if (outfieldDefenders.length === 0) {
    return attackingTeam === 'home' ? 380 : 100;
  }

  if (attackingTeam === 'home') {
    // Home attacks right (towards X=456) -> last defender has lowest X among defenders in away half
    let minX = Infinity;
    for (const d of outfieldDefenders) {
      if (d.currentX < minX) minX = d.currentX;
    }
    return minX;
  } else {
    // Away attacks left (towards X=24) -> last defender has highest X among defenders in home half
    let maxX = -Infinity;
    for (const d of outfieldDefenders) {
      if (d.currentX > maxX) maxX = d.currentX;
    }
    return maxX;
  }
}

/**
 * Computes high-fidelity tactical target coordinates and state for every player.
 */
export function computeTeamTacticalTarget(
  player: TacticalPlayerInput,
  allPlayers: TacticalPlayerInput[],
  context: TacticalContext,
  receivingPlayerId?: string
): { targetX: number; targetY: number; state: PlayerTacticalState } {
  const { ballX, ballY, attackingTeam, isShootingPhase, pitchBounds } = context;
  const isAttacking = player.team === attackingTeam;
  const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';
  const forwardDir = attackingTeam === 'home' ? 1 : -1;

  // Pitch boundaries
  const { left, right, top, bottom, centerY } = pitchBounds;

  // 1. Goalkeeper Positioning
  if (player.isGK) {
    if (isAttacking) {
      // Sweeper keeper stepping forward to support possession
      const targetX = player.baseX + forwardDir * 20;
      const targetY = centerY + (ballY - centerY) * 0.15;
      return {
        targetX: Math.max(left + 6, Math.min(right - 6, targetX)),
        targetY: Math.max(centerY - 18, Math.min(centerY + 18, targetY)),
        state: 'JOGGING',
      };
    } else {
      // Defending goalkeeper covering shot angle
      const goalLineX = player.team === 'home' ? left + 6 : right - 6;
      const clampedY = Math.max(
        centerY - 16,
        Math.min(centerY + 16, centerY + (ballY - centerY) * 0.35)
      );
      return {
        targetX: goalLineX,
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
        const boxGoalX = attackingTeam === 'home' ? right - 24 : left + 24;
        targetX = boxGoalX - forwardDir * (player.id.charCodeAt(0) % 18);
        targetY = ballY + ((player.id.charCodeAt(1) % 24) - 12);
        state = 'MAKING_RUN';
      } else {
        // Penetrating run into final third pockets
        const pushX = forwardDir * 54;
        const lateralShift = (ballY - player.baseY) * 0.30;
        targetX = player.baseX + pushX + (ballX - player.baseX) * 0.32;
        targetY = player.baseY + lateralShift;
        state = 'MAKING_RUN';
      }
    } else if (player.role === 'MID') {
      // Midfield support triangle
      const pushX = forwardDir * 36;
      const lateralShift = (ballY - player.baseY) * 0.38;
      targetX = player.baseX + pushX + (ballX - player.baseX) * 0.28;
      targetY = player.baseY + lateralShift;
      state = 'RUNNING';
    } else {
      // DEF: High defensive line squeezing pitch space
      let pushX = forwardDir * 28;
      // Overlapping run for fullbacks on active flank
      if (flankDist > 42 && isBallOnSameFlank) {
        pushX += forwardDir * 24;
        state = 'MAKING_RUN';
      }
      targetX = player.baseX + pushX;
      targetY = player.baseY + (ballY - player.baseY) * 0.20;
    }
  } else {
    // ==========================================
    // DEFENDING TEAM BEHAVIORS
    // ==========================================
    if (player.id === nearestDefId) {
      // Primary Presser: Closes down the ball carrier actively
      const pressOffset = attackingTeam === 'home' ? 16 : -16;
      targetX = ballX + pressOffset;
      targetY = ballY + (player.baseY > centerY ? -6 : 6);
      state = isShootingPhase ? 'SLIDING' : 'PRESSING';
    } else if (player.id === secondDefId) {
      // Secondary Defender: Covers the space behind the presser
      const coverOffset = attackingTeam === 'home' ? 34 : -34;
      targetX = ballX + coverOffset;
      targetY = centerY + (ballY - centerY) * 0.55;
      state = 'COVERING';
    } else {
      // Rest of defensive block: Compact low/mid block shielding the box
      const dropDir = player.team === 'home' ? -1 : 1;

      if (player.role === 'DEF') {
        const dropX = dropDir * 32;
        targetX = player.baseX + dropX;
        // Compact tightly towards central channel
        targetY = centerY + (player.baseY - centerY) * 0.62 + (ballY - centerY) * 0.24;
        state = 'JOGGING';
      } else if (player.role === 'MID') {
        const dropX = dropDir * 36;
        targetX = player.baseX + dropX;
        targetY = centerY + (player.baseY - centerY) * 0.68 + (ballY - centerY) * 0.28;
        state = 'JOGGING';
      } else {
        // Strikers drop near halfway line as target outlet
        targetX = player.team === 'home' ? left + 155 : right - 155;
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
