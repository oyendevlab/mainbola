import {
  DrillConfig,
  Player,
  PlayerAttributes,
  TrainingDrillType,
  TrainingResult,
} from '../types';
import { calculateOverallRating, calculatePlayerMarketValue } from './generator';
import { createPRNG, PRNG } from './prng';

export const DRILL_CONFIGS: Record<TrainingDrillType, DrillConfig> = {
  ATTACKING: {
    id: 'ATTACKING',
    name: 'Finishing & Sharpness',
    cost: 1500,
    description: 'Drills focused on clinical finishing, fast breaks, and goal instincts.',
    primaryAttr: 'attack',
    secondaryAttr: 'speed',
    suitablePositions: ['ATT', 'MID'],
  },
  DEFENDING: {
    id: 'DEFENDING',
    name: 'Tackles & Interception',
    cost: 1500,
    description: 'Defensive organization, man-marking, and physical resilience.',
    primaryAttr: 'defense',
    secondaryAttr: 'stamina',
    suitablePositions: ['DEF', 'MID'],
  },
  PLAYMAKING: {
    id: 'PLAYMAKING',
    name: 'Passing & Vision',
    cost: 1500,
    description: 'Spatial awareness, precision through-balls, and ball retention.',
    primaryAttr: 'passing',
    secondaryAttr: 'attack',
    suitablePositions: ['MID', 'ATT', 'DEF'],
  },
  GOALKEEPING: {
    id: 'GOALKEEPING',
    name: 'Reflexes & Positioning',
    cost: 1500,
    description: 'Diving saves, aerial command, and reactive shot-stopping.',
    primaryAttr: 'goalkeeping',
    secondaryAttr: 'stamina',
    suitablePositions: ['GK'],
  },
  PHYSIO: {
    id: 'PHYSIO',
    name: 'Physio Session',
    cost: 1200,
    description: 'Targeted physical therapy and sports massage to restore +35% match fitness.',
    primaryAttr: 'stamina',
    suitablePositions: ['GK', 'DEF', 'MID', 'ATT'],
  },
};

export const TEAM_PHYSIO_COST = 4500;

/**
 * Execute a training drill on an individual player.
 */
export function trainPlayer(
  player: Player,
  drillType: TrainingDrillType,
  seedOrPrng?: number | PRNG
): { player: Player; result: TrainingResult } {
  const prng =
    seedOrPrng instanceof PRNG
      ? seedOrPrng
      : createPRNG(seedOrPrng ?? Math.floor(Math.random() * 1000000));

  const config = DRILL_CONFIGS[drillType];
  const newAttrs: PlayerAttributes = { ...player.attributes };
  const statGains: Partial<PlayerAttributes> = {};

  let newFitness = player.fitness ?? 100;

  if (drillType === 'PHYSIO') {
    newFitness = Math.min(100, newFitness + 35);
    return {
      player: {
        ...player,
        fitness: newFitness,
      },
      result: {
        playerId: player.id,
        playerName: player.name,
        drillType,
        cost: config.cost,
        statGains: {},
        newRating: player.overallRating,
        newFitness,
      },
    };
  }

  // Primary attribute progression: +1 or +2 based on current rating (diminishing returns > 85)
  const currentPrimary = newAttrs[config.primaryAttr];
  let primaryGain = currentPrimary >= 88 ? 1 : prng.next() > 0.4 ? 2 : 1;
  if (currentPrimary + primaryGain > 99) {
    primaryGain = Math.max(0, 99 - currentPrimary);
  }
  newAttrs[config.primaryAttr] = currentPrimary + primaryGain;
  if (primaryGain > 0) {
    statGains[config.primaryAttr] = primaryGain;
  }

  // Secondary attribute progression: 50% chance of +1
  if (config.secondaryAttr) {
    const currentSec = newAttrs[config.secondaryAttr];
    const secGain = prng.next() > 0.5 && currentSec < 99 ? 1 : 0;
    if (secGain > 0) {
      newAttrs[config.secondaryAttr] = currentSec + secGain;
      statGains[config.secondaryAttr] = secGain;
    }
  }

  // Slight exertion from high-intensity training session
  newFitness = Math.max(20, newFitness - 4);

  const newOverall = calculateOverallRating(player.position, newAttrs);
  const newMarketValue = calculatePlayerMarketValue(newOverall);

  const updatedPlayer: Player = {
    ...player,
    attributes: newAttrs,
    overallRating: newOverall,
    fitness: newFitness,
    marketValue: newMarketValue,
    trainingXp: (player.trainingXp ?? 0) + 15,
  };

  return {
    player: updatedPlayer,
    result: {
      playerId: player.id,
      playerName: player.name,
      drillType,
      cost: config.cost,
      statGains,
      newRating: newOverall,
      newFitness,
    },
  };
}

/**
 * Apply post-match fatigue to starting XI and natural rest recovery to substitutes.
 */
export function applyMatchFatigue(squad: Player[], startingXIIds: string[]): Player[] {
  const startingSet = new Set(startingXIIds);

  return squad.map((player) => {
    const isStarter = startingSet.has(player.id);
    const currentFitness = player.fitness ?? 100;

    if (isStarter) {
      // High stamina mitigates fatigue
      const staminaFactor = player.attributes.stamina / 100; // 0.1 - 1.0
      const fatigue = Math.round(25 - staminaFactor * 10); // Between 15 and 24 points
      const newFitness = Math.max(20, currentFitness - fatigue);
      return {
        ...player,
        fitness: newFitness,
      };
    } else {
      // Bench players recover naturally
      const recovery = 20;
      const newFitness = Math.min(100, currentFitness + recovery);
      return {
        ...player,
        fitness: newFitness,
      };
    }
  });
}

/**
 * Restore all players in squad to full 100% fitness.
 */
export function fullSquadPhysioRecovery(squad: Player[]): Player[] {
  return squad.map((p) => ({
    ...p,
    fitness: 100,
  }));
}
