import { Club, ClubSnapshot, CupMatch, KnockoutCup } from '../types';
import { createClubSnapshot, generateClub, PRESET_AI_CLUBS } from './generator';
import { createPRNG } from './prng';
import { simulateMatch } from './simulator';

export const CUP_CHAMPION_PRIZE = 35000;

function resolveSnapshot(club: Club | ClubSnapshot): ClubSnapshot {
  if ('squad' in club && Array.isArray((club as Club).squad)) {
    return createClubSnapshot(club as Club);
  }
  return club as ClubSnapshot;
}

/**
 * Creates an 8-team single-elimination Knockout Cup tournament.
 * Consists of 1 user club and 7 distinct AI clubs.
 */
export function createKnockoutCup(
  userClubInput: Club | ClubSnapshot,
  seed: number = Date.now()
): KnockoutCup {
  const prng = createPRNG(seed);
  const userSnapshot = resolveSnapshot(userClubInput);

  // Pick 7 distinct AI presets excluding any matching the user's club name
  const candidatePresets = PRESET_AI_CLUBS.filter(
    (preset) => preset.name.toLowerCase() !== userSnapshot.name.toLowerCase()
  );

  const selectedPresets = candidatePresets.slice(0, 7);
  const aiSnapshots: ClubSnapshot[] = selectedPresets.map((preset, idx) => {
    const aiClub = generateClub({
      name: preset.name,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      badgeId: preset.badgeId,
      formation: preset.formation,
      tactics: preset.tactics,
      targetRating: preset.baseRating ?? 74,
      seed: seed + (idx + 1) * 777,
    });
    return createClubSnapshot(aiClub);
  });

  const allTeams: ClubSnapshot[] = [userSnapshot, ...aiSnapshots];

  // 4 Quarter-final matches:
  // Match 0: User Club vs AI 1
  // Match 1: AI 2 vs AI 3
  // Match 2: AI 4 vs AI 5
  // Match 3: AI 6 vs AI 7
  const quarterMatches: CupMatch[] = [
    {
      id: `cup_match_${seed}_q0`,
      round: 'Quarter',
      roundIndex: 0,
      matchIndex: 0,
      homeClub: userSnapshot,
      awayClub: aiSnapshots[0],
      isCompleted: false,
      seed: prng.nextInt(10000, 99999),
    },
    {
      id: `cup_match_${seed}_q1`,
      round: 'Quarter',
      roundIndex: 0,
      matchIndex: 1,
      homeClub: aiSnapshots[1],
      awayClub: aiSnapshots[2],
      isCompleted: false,
      seed: prng.nextInt(10000, 99999),
    },
    {
      id: `cup_match_${seed}_q2`,
      round: 'Quarter',
      roundIndex: 0,
      matchIndex: 2,
      homeClub: aiSnapshots[3],
      awayClub: aiSnapshots[4],
      isCompleted: false,
      seed: prng.nextInt(10000, 99999),
    },
    {
      id: `cup_match_${seed}_q3`,
      round: 'Quarter',
      roundIndex: 0,
      matchIndex: 3,
      homeClub: aiSnapshots[5],
      awayClub: aiSnapshots[6],
      isCompleted: false,
      seed: prng.nextInt(10000, 99999),
    },
  ];

  return {
    id: `cup_${seed}`,
    name: 'Piala MainBola',
    season: 1,
    status: 'active',
    currentRound: 'Quarter',
    currentRoundIndex: 0,
    teams: allTeams,
    matches: quarterMatches,
    prizeClaimed: false,
    createdAt: 1700000000000 + (seed % 10000000),
  };
}

/**
 * Simulates a single knockout cup fixture.
 * In the event of a draw after 90 minutes, resolves via extra time / penalty shootout
 * using a deterministic PRNG.
 */
export function simulateCupMatch(match: CupMatch, seed: number = match.seed): CupMatch {
  const result = simulateMatch(match.homeClub, match.awayClub, seed);

  let winnerId: string;
  let homePenalties: number | undefined;
  let awayPenalties: number | undefined;

  if (result.homeScore > result.awayScore) {
    winnerId = match.homeClub.id;
  } else if (result.awayScore > result.homeScore) {
    winnerId = match.awayClub.id;
  } else {
    // Score is tied after 90 minutes - Decided by penalty shootout
    const prng = createPRNG(seed + 98765);
    let homePens = 0;
    let awayPens = 0;

    // Standard 5 penalties per side
    for (let i = 0; i < 5; i++) {
      if (prng.chance(0.76)) homePens++;
      if (prng.chance(0.76)) awayPens++;
    }

    // Sudden death until tiebreak
    let suddenRounds = 0;
    while (homePens === awayPens && suddenRounds < 10) {
      suddenRounds++;
      const hScore = prng.chance(0.72) ? 1 : 0;
      const aScore = prng.chance(0.72) ? 1 : 0;
      if (hScore !== aScore) {
        homePens += hScore;
        awayPens += aScore;
        break;
      }
      homePens += 1;
      awayPens += 1;
    }

    // Safeguard tiebreak
    if (homePens === awayPens) {
      if (prng.chance(0.5)) {
        homePens++;
      } else {
        awayPens++;
      }
    }

    homePenalties = homePens;
    awayPenalties = awayPens;
    winnerId = homePens > awayPens ? match.homeClub.id : match.awayClub.id;
  }

  return {
    ...match,
    result,
    winnerId,
    homePenalties,
    awayPenalties,
    isCompleted: true,
  };
}

/**
 * Advances the Knockout Cup tournament to the next stage when all matches in current round are complete.
 * Quarter (4 matches) -> Semi (2 matches) -> Final (1 match) -> Champion declared.
 */
export function advanceCupTournament(
  cup: KnockoutCup,
  seed: number = Date.now()
): KnockoutCup {
  const prng = createPRNG(seed);
  const currentRoundMatches = cup.matches.filter((m) => m.round === cup.currentRound);

  // If any match in the current round is not yet completed, cannot advance
  if (currentRoundMatches.some((m) => !m.isCompleted)) {
    return cup;
  }

  const getWinnerSnapshot = (match: CupMatch): ClubSnapshot => {
    return match.winnerId === match.homeClub.id ? match.homeClub : match.awayClub;
  };

  const winners = currentRoundMatches
    .sort((a, b) => a.matchIndex - b.matchIndex)
    .map(getWinnerSnapshot);

  if (cup.currentRound === 'Quarter') {
    // 4 Quarter winners -> 2 Semi matches
    const semiMatches: CupMatch[] = [
      {
        id: `cup_match_${seed}_s0`,
        round: 'Semi',
        roundIndex: 1,
        matchIndex: 0,
        homeClub: winners[0],
        awayClub: winners[1],
        isCompleted: false,
        seed: prng.nextInt(10000, 99999),
      },
      {
        id: `cup_match_${seed}_s1`,
        round: 'Semi',
        roundIndex: 1,
        matchIndex: 1,
        homeClub: winners[2],
        awayClub: winners[3],
        isCompleted: false,
        seed: prng.nextInt(10000, 99999),
      },
    ];

    return {
      ...cup,
      currentRound: 'Semi',
      currentRoundIndex: 1,
      matches: [...cup.matches, ...semiMatches],
    };
  }

  if (cup.currentRound === 'Semi') {
    // 2 Semi winners -> 1 Final match
    const finalMatch: CupMatch = {
      id: `cup_match_${seed}_f0`,
      round: 'Final',
      roundIndex: 2,
      matchIndex: 0,
      homeClub: winners[0],
      awayClub: winners[1],
      isCompleted: false,
      seed: prng.nextInt(10000, 99999),
    };

    return {
      ...cup,
      currentRound: 'Final',
      currentRoundIndex: 2,
      matches: [...cup.matches, finalMatch],
    };
  }

  if (cup.currentRound === 'Final') {
    // Final is completed, crown Champion
    const champion = winners[0];
    return {
      ...cup,
      status: 'completed',
      winnerClubId: champion.id,
      winnerClubName: champion.name,
    };
  }

  return cup;
}
