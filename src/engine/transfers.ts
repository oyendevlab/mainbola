import { Club, Player, PlayerPosition, TransferTarget } from '../types';
import { generatePlayer } from './generator';
import { createPRNG, PRNG } from './prng';

export const SCOUT_REPORTS: Record<PlayerPosition, string[]> = {
  ATT: [
    'Explosive forward with devastating acceleration and sharp finishing.',
    'Clinical target man dominating aerial headers inside the 6-yard box.',
    'Tricky winger with rapid dribbling and unpredictable inside cuts.',
  ],
  MID: [
    'Visionary playmaker capable of unlocking the tightest low-block defenses.',
    'Relentless box-to-box midfielder with high stamina and recovery tackles.',
    'Composed deep-lying distributor with laser-guided long passes.',
  ],
  DEF: [
    'Commanding center-half with rock-solid positional discipline.',
    'Speedy fullback providing aggressive overlapping runs and tackles.',
    'Towering stopper with formidable aerial prowess and leadership.',
  ],
  GK: [
    'Cat-like shot-stopper with lightning reflexes in one-on-one duels.',
    'Commanding goalkeeper with excellent penalty area communication.',
  ],
};

export const MAX_SQUAD_SIZE = 20;
export const MIN_SQUAD_SIZE = 12;

/**
 * Generate a pool of scouted transfer targets available for purchase.
 */
export function generateTransferMarket(seedOrPrng?: number | PRNG, count = 6): TransferTarget[] {
  const prng =
    seedOrPrng instanceof PRNG
      ? seedOrPrng
      : createPRNG(seedOrPrng ?? Math.floor(Math.random() * 1000000));

  const positions: PlayerPosition[] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'ATT'];
  const targets: TransferTarget[] = [];

  for (let i = 0; i < count; i++) {
    const pos = positions[i % positions.length];
    const targetRating = prng.nextInt(68, 83);
    const age = prng.nextInt(19, 31);

    const player = generatePlayer(pos, {
      baseLevel: targetRating,
      prng,
    });

    // Market fluctuation factor 0.95 - 1.15
    const priceMultiplier = prng.nextFloat(0.95, 1.15);
    const baseVal = player.marketValue ?? 20000;
    const fee = Math.round((baseVal * priceMultiplier) / 500) * 500;

    const reports = SCOUT_REPORTS[pos];
    const scoutReport = prng.pick(reports);

    const potentialRating = Math.max(
      player.overallRating,
      Math.min(96, player.overallRating + Math.max(1, Math.round((32 - age) * 0.8)))
    );

    targets.push({
      id: `target_${player.id}`,
      player,
      fee,
      scoutReport,
      age,
      potentialRating,
    });
  }

  return targets;
}

/**
 * Purchase a scouted player from the transfer market.
 */
export function executeBuyPlayer(
  club: Club,
  target: TransferTarget
): { success: boolean; club: Club; message: string } {
  if (club.budget < target.fee) {
    return {
      success: false,
      club,
      message: `Insufficient funds! Requires ${target.fee.toLocaleString()} credits (Available: ${club.budget.toLocaleString()}).`,
    };
  }

  if (club.squad.length >= MAX_SQUAD_SIZE) {
    return {
      success: false,
      club,
      message: `Squad limit reached! Maximum squad capacity is ${MAX_SQUAD_SIZE} players. Sell an existing player first.`,
    };
  }

  const updatedBudget = club.budget - target.fee;
  const newPlayer: Player = {
    ...target.player,
    fitness: 100,
    trainingXp: 0,
  };

  const updatedSquad = [...club.squad, newPlayer];

  return {
    success: true,
    club: {
      ...club,
      budget: updatedBudget,
      squad: updatedSquad,
    },
    message: `Signed ${newPlayer.name} (${newPlayer.position}, ${newPlayer.overallRating} OVR) for ${target.fee.toLocaleString()} credits!`,
  };
}

/**
 * Sell an existing player from the squad to generate transfer funds.
 */
export function executeSellPlayer(
  club: Club,
  playerId: string
): { success: boolean; club: Club; salePrice: number; message: string } {
  if (club.squad.length <= MIN_SQUAD_SIZE) {
    return {
      success: false,
      club,
      salePrice: 0,
      message: `Squad too small! Minimum roster size is ${MIN_SQUAD_SIZE} players.`,
    };
  }

  const player = club.squad.find((p) => p.id === playerId);
  if (!player) {
    return {
      success: false,
      club,
      salePrice: 0,
      message: 'Player not found in club squad.',
    };
  }

  // Selling price is ~70% of market value
  const baseValue = player.marketValue ?? 15000;
  const salePrice = Math.round((baseValue * 0.7) / 250) * 250;

  const updatedSquad = club.squad.filter((p) => p.id !== playerId);
  let updatedStartingXI = [...club.startingXI];

  // If sold player was in starting XI, replace with best eligible player from the remaining squad
  if (updatedStartingXI.includes(playerId)) {
    const eligibleReplacements = updatedSquad.filter(
      (p) => p.position === player.position && !updatedStartingXI.includes(p.id)
    );
    const replacement =
      eligibleReplacements.sort((a, b) => b.overallRating - a.overallRating)[0] ??
      updatedSquad.find((p) => !updatedStartingXI.includes(p.id));

    if (replacement) {
      updatedStartingXI = updatedStartingXI.map((id) => (id === playerId ? replacement.id : id));
    } else {
      updatedStartingXI = updatedStartingXI.filter((id) => id !== playerId);
    }
  }

  const updatedBudget = club.budget + salePrice;

  return {
    success: true,
    club: {
      ...club,
      budget: updatedBudget,
      squad: updatedSquad,
      startingXI: updatedStartingXI,
    },
    salePrice,
    message: `Sold ${player.name} for ${salePrice.toLocaleString()} credits!`,
  };
}
