import { MatchEvent, Player } from '../types';

export interface MatchRatingsResult {
  ratings: Record<string, number>;
  motmId: string;
  motmName: string;
  motmPlayerId: string;
  motmPlayerName: string;
  motmRating: number;
}

/**
 * Calculates individual player match performance ratings (5.0 - 10.0 scale)
 * and determines the official Man of the Match (MOTM).
 */
export function calculateMatchRatings(
  events: MatchEvent[],
  homeStartingXI: Player[],
  awayStartingXI: Player[],
  homeScore: number,
  awayScore: number
): MatchRatingsResult {
  const ratings: Record<string, number> = {};

  // Base score 6.0 for every starting player
  const allPlayers = [...homeStartingXI, ...awayStartingXI];
  allPlayers.forEach((p) => {
    ratings[p.id] = 6.0;
  });

  // Track player events
  events.forEach((event) => {
    if (event.playerId && ratings[event.playerId] !== undefined) {
      switch (event.type) {
        case 'GOAL':
          ratings[event.playerId] += 1.5;
          break;
        case 'SHOT':
          ratings[event.playerId] += 0.2;
          break;
        case 'TACKLE':
        case 'INTERCEPTION':
          ratings[event.playerId] += 0.35;
          break;
        case 'SAVE':
          ratings[event.playerId] += 0.6;
          break;
        case 'YELLOW_CARD':
          ratings[event.playerId] -= 0.5;
          break;
        case 'RED_CARD':
          ratings[event.playerId] -= 1.8;
          break;
        case 'TURNOVER':
          ratings[event.playerId] -= 0.15;
          break;
      }
    }

    // Assist credit for secondary player
    if (event.secondaryPlayerId && ratings[event.secondaryPlayerId] !== undefined) {
      if (event.type === 'GOAL') {
        ratings[event.secondaryPlayerId] += 0.8;
      }
    }
  });

  // Clean sheet or goals conceded penalty for defenders & goalkeepers
  homeStartingXI.forEach((p) => {
    if (p.position === 'GK' || p.position === 'DEF') {
      if (awayScore === 0) {
        ratings[p.id] += 0.8; // Clean sheet bonus
      } else {
        ratings[p.id] -= Math.min(1.2, awayScore * 0.3);
      }
    }
  });

  awayStartingXI.forEach((p) => {
    if (p.position === 'GK' || p.position === 'DEF') {
      if (homeScore === 0) {
        ratings[p.id] += 0.8; // Clean sheet bonus
      } else {
        ratings[p.id] -= Math.min(1.2, homeScore * 0.3);
      }
    }
  });

  // Clamp ratings strictly between 5.0 and 10.0 and round to 1 decimal
  let highestRating = -1;
  let motmId = allPlayers[0]?.id || '';
  let motmName = allPlayers[0]?.name || 'Pemain Utama';

  allPlayers.forEach((p) => {
    const raw = ratings[p.id] ?? 6.0;
    const clamped = Math.max(5.0, Math.min(10.0, raw));
    const rounded = Math.round(clamped * 10) / 10;
    ratings[p.id] = rounded;

    if (rounded > highestRating) {
      highestRating = rounded;
      motmId = p.id;
      motmName = p.name;
    }
  });

  return {
    ratings,
    motmId,
    motmName,
    motmPlayerId: motmId,
    motmPlayerName: motmName,
    motmRating: highestRating,
  };
}
