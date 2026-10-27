import { Club, MatchResult, Player } from '../types';
import { TeamOfTheWeek, TOTWPlayer } from '../types/totw';
import { PRESET_AI_CLUBS, generateClub } from './generator';

/**
 * Builds the Team of the Week (TOTW) based on current matchday results and squad ratings.
 */
export function generateTeamOfTheWeek(
  userClub: Club,
  recentMatches: MatchResult[] = [],
  currentRound = 1
): TeamOfTheWeek {
  const candidatePlayers: TOTWPlayer[] = [];

  // 1. Evaluate User Club Players
  const userRatings = recentMatches[0]?.playerRatings || {};
  userClub.squad.forEach((p) => {
    const mRating = userRatings[p.id] ?? (p.overallRating >= 75 ? 7.6 : 6.8);
    if (mRating >= 7.2 || p.overallRating >= 78) {
      candidatePlayers.push({
        id: p.id,
        name: p.name,
        clubName: userClub.name,
        clubBadgeId: userClub.badgeId,
        position: p.position,
        overallRating: p.overallRating,
        matchRating: mRating,
        goals: 0,
        assists: 0,
        isUserPlayer: true,
      });
    }
  });

  // 2. Evaluate Preset AI League Players
  PRESET_AI_CLUBS.forEach((aiConfig, idx) => {
    const aiClub = generateClub(
      aiConfig.name,
      aiConfig.primaryColor,
      aiConfig.secondaryColor,
      aiConfig.badgeId,
      aiConfig.formation,
      aiConfig.tactics,
      currentRound * 100 + idx
    );

    aiClub.squad.slice(0, 5).forEach((p, pIdx) => {
      // Deterministic simulated rating
      const simRating = 7.0 + ((p.overallRating + pIdx * 3) % 25) / 10;
      candidatePlayers.push({
        id: p.id,
        name: p.name,
        clubName: aiClub.name,
        clubBadgeId: aiClub.badgeId,
        position: p.position,
        overallRating: p.overallRating,
        matchRating: Math.round(simRating * 10) / 10,
        goals: p.position === 'ATT' ? 1 : 0,
        assists: p.position === 'MID' ? 1 : 0,
        isUserPlayer: false,
      });
    });
  });

  // 3. Select 1 GK, 4 DEF, 3 MID, 3 ATT (Total 11) sorted by highest rating
  const sortByRating = (a: TOTWPlayer, b: TOTWPlayer) => b.matchRating - a.matchRating || b.overallRating - a.overallRating;

  const gks = candidatePlayers.filter((p) => p.position === 'GK').sort(sortByRating).slice(0, 1);
  const defs = candidatePlayers.filter((p) => p.position === 'DEF').sort(sortByRating).slice(0, 4);
  const mids = candidatePlayers.filter((p) => p.position === 'MID').sort(sortByRating).slice(0, 3);
  const atts = candidatePlayers.filter((p) => p.position === 'ATT').sort(sortByRating).slice(0, 3);

  const selectedXI: TOTWPlayer[] = [...gks, ...defs, ...mids, ...atts];

  return {
    round: currentRound,
    weekNumber: currentRound,
    players: selectedXI,
    formation: '4-3-3',
    createdAt: Date.now(),
  };
}

/**
 * Applies TOTW honor to a player, boosting morale to 100% and granting +50 training XP.
 */
export function applyTOTWHonor(player: Player): Player {
  return {
    ...player,
    isTOTW: true,
    morale: 100,
    trainingXp: (player.trainingXp ?? 0) + 50,
  };
}
