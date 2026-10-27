import { Club, MatchResult, Trophy, KnockoutCup } from '../types';
import { League } from '../types/league';

/**
 * Standard Trophy Definitions for MainBola Cabinet & Season Awards
 */
export const TROPHY_DEFINITIONS: Record<string, Trophy> = {
  CHAMPION: {
    id: 'CHAMPION',
    title: 'Juara Liga Perdana',
    description: 'Menjuarai musim Liga Perdana di tangga teratas takhta liga.',
    icon: '🏆',
    category: 'LEAGUE',
  },
  CUP_CHAMPION: {
    id: 'CUP_CHAMPION',
    title: 'Juara Piala MainBola',
    description: 'Menjuarai kejohanan kalah mati Piala MainBola.',
    icon: '🥇',
    category: 'CUP',
  },
  GOLDEN_BOOT: {
    id: 'GOLDEN_BOOT',
    title: 'Anugerah Kasut Emas',
    description: 'Pemain skuad merangkul anugerah penjaring gol terbanyak musim liga.',
    icon: '👟',
    category: 'INDIVIDUAL',
  },
  CENTURION: {
    id: 'CENTURION',
    title: 'Kelab 100 Gol',
    description: 'Menembusi sekurang-kurangnya 100 jaringan gol rasmi keseluruhan.',
    icon: '💯',
    category: 'MILESTONE',
  },
  INVINCIBLE: {
    id: 'INVINCIBLE',
    title: 'Skuad Kebal (Musim Tanpa Kalah)',
    description: 'Menamatkan satu musim liga penuh tanpa sebarang kekalahan.',
    icon: '🛡️',
    category: 'SPECIAL',
  },
  TACTICIAN: {
    id: 'TACTICIAN',
    title: 'Pengurus Berkaliber (Menang 10 Perlawanan)',
    description: 'Mencapai rekod sekurang-kurangnya 10 kemenangan perlawanan.',
    icon: '⭐',
    category: 'CAREER',
  },
  PVP_CHAMPION: {
    id: 'PVP_CHAMPION',
    title: 'Wira PvP',
    description: 'Mencapai Elo 1300+ atau memenangi sekurang-kurangnya 5 perlawanan PvP.',
    icon: '⚔️',
    category: 'PVP',
  },
  SCENARIO_MASTER: {
    id: 'SCENARIO_MASTER',
    title: 'Pakar Strategi Senario',
    description: 'Menyelesaikan sekurang-kurangnya 1 Cabaran Senario Klasik.',
    icon: '🎯',
    category: 'CHALLENGE',
  },
};

/**
 * Retrieve all available trophy templates.
 */
export const getAllTrophies = (): Trophy[] => {
  return Object.values(TROPHY_DEFINITIONS);
};

/**
 * Get a trophy definition by ID.
 */
export const getTrophyById = (id: string): Trophy | undefined => {
  return TROPHY_DEFINITIONS[id];
};

/**
 * Check if a trophy is in an unlocked list.
 */
export const hasTrophy = (trophies: Trophy[], trophyId: string): boolean => {
  return trophies.some((t) => t.id === trophyId);
};

/**
 * Evaluate all trophies currently achieved by a club based on its career stats,
 * current/completed league standings, and historical match results.
 */
export function evaluateUnlockedTrophies(
  club: Club,
  league?: League | null,
  history: MatchResult[] = [],
  cup?: KnockoutCup | null
): Trophy[] {
  const unlocked: Trophy[] = [];
  const now = Date.now();

  // Helper to determine approximate unlock timestamp
  const getLatestTimestamp = (): number => {
    if (history.length > 0) {
      return history[history.length - 1].timestamp;
    }
    return now;
  };

  // 1. TACTICIAN: Won 10 or more matches
  const totalWins = Math.max(
    club.stats?.won ?? 0,
    history.filter((m) => {
      const isHome = m.homeClub.id === club.id;
      const isAway = m.awayClub.id === club.id;
      return (isHome && m.homeScore > m.awayScore) || (isAway && m.awayScore > m.homeScore);
    }).length
  );

  if (totalWins >= 10) {
    unlocked.push({
      ...TROPHY_DEFINITIONS.TACTICIAN,
      unlockedAt: getLatestTimestamp(),
    });
  }

  // 2. CENTURION: 100 or more goals scored
  const totalGoals = Math.max(
    club.stats?.goalsFor ?? 0,
    history.reduce((sum, m) => {
      if (m.homeClub.id === club.id) return sum + m.homeScore;
      if (m.awayClub.id === club.id) return sum + m.awayScore;
      return sum;
    }, 0)
  );

  if (totalGoals >= 100) {
    unlocked.push({
      ...TROPHY_DEFINITIONS.CENTURION,
      unlockedAt: getLatestTimestamp(),
    });
  }

  // League-specific achievements
  if (league) {
    const isCompleted = league.status === 'completed' || league.currentRound > league.totalRounds;
    const standings = league.standings || [];
    const clubStanding = standings.find((s) => s.clubId === club.id);

    // 3. CHAMPION: 1st place in a completed league
    if (isCompleted && standings.length > 0 && standings[0].clubId === club.id) {
      unlocked.push({
        ...TROPHY_DEFINITIONS.CHAMPION,
        unlockedAt: getLatestTimestamp(),
      });
    }

    // 4. INVINCIBLE: Finished completed league with 0 losses
    if (isCompleted && clubStanding && clubStanding.played > 0 && clubStanding.lost === 0) {
      unlocked.push({
        ...TROPHY_DEFINITIONS.INVINCIBLE,
        unlockedAt: getLatestTimestamp(),
      });
    }

    // 5. GOLDEN_BOOT: Top scorer in completed league belongs to this club
    if (isCompleted && league.topScorers && league.topScorers.length > 0) {
      const topScorer = league.topScorers[0];
      const belongsToClub =
        topScorer.clubName === club.name ||
        club.squad.some(
          (player) => player.id === topScorer.playerId || player.name === topScorer.playerName
        );

      if (belongsToClub && topScorer.goals > 0) {
        unlocked.push({
          ...TROPHY_DEFINITIONS.GOLDEN_BOOT,
          unlockedAt: getLatestTimestamp(),
        });
      }
    }
  }

  // 6. CUP_CHAMPION: Knockout Cup Champion
  if (cup && cup.status === 'completed' && cup.winnerClubId === club.id) {
    unlocked.push({
      ...TROPHY_DEFINITIONS.CUP_CHAMPION,
      unlockedAt: getLatestTimestamp(),
    });
  }

  // 7. PVP_CHAMPION: Reaching 1300+ Elo or winning 5 PvP matches
  const pvpRating = club.pvpRating ?? 1200;
  const pvpWins = club.pvpRecord?.won ?? 0;
  if (pvpRating >= 1300 || pvpWins >= 5) {
    unlocked.push({
      ...TROPHY_DEFINITIONS.PVP_CHAMPION,
      unlockedAt: getLatestTimestamp(),
    });
  }

  // 8. SCENARIO_MASTER: Completed at least 1 scenario challenge
  const scenariosCompleted = club.completedScenarios?.length ?? 0;
  if (scenariosCompleted >= 1) {
    unlocked.push({
      ...TROPHY_DEFINITIONS.SCENARIO_MASTER,
      unlockedAt: getLatestTimestamp(),
    });
  }

  return unlocked;
}

/**
 * Calculate progress towards a specific trophy (useful for UI displays).
 */
export function calculateTrophyProgress(
  trophyId: string,
  club: Club,
  league?: League | null,
  history: MatchResult[] = [],
  cup?: KnockoutCup | null
): { current: number; target: number; percentage: number; isCompleted: boolean } {
  switch (trophyId) {
    case 'TACTICIAN': {
      const wins = Math.max(club.stats?.won ?? 0, history.filter((m) => {
        const isHome = m.homeClub.id === club.id;
        const isAway = m.awayClub.id === club.id;
        return (isHome && m.homeScore > m.awayScore) || (isAway && m.awayScore > m.homeScore);
      }).length);
      const target = 10;
      const current = Math.min(wins, target);
      return {
        current,
        target,
        percentage: Math.round((current / target) * 100),
        isCompleted: wins >= target,
      };
    }

    case 'CENTURION': {
      const goals = club.stats?.goalsFor ?? 0;
      const target = 100;
      const current = Math.min(goals, target);
      return {
        current,
        target,
        percentage: Math.round((current / target) * 100),
        isCompleted: goals >= target,
      };
    }

    case 'CHAMPION': {
      if (!league) return { current: 0, target: 1, percentage: 0, isCompleted: false };
      const standings = league.standings || [];
      const isChamp = league.status === 'completed' && standings[0]?.clubId === club.id;
      return {
        current: isChamp ? 1 : 0,
        target: 1,
        percentage: isChamp ? 100 : 0,
        isCompleted: isChamp,
      };
    }

    case 'INVINCIBLE': {
      if (!league) return { current: 0, target: 1, percentage: 0, isCompleted: false };
      const standing = league.standings?.find((s) => s.clubId === club.id);
      const isInvincible =
        league.status === 'completed' &&
        !!standing &&
        standing.played > 0 &&
        standing.lost === 0;
      return {
        current: isInvincible ? 1 : 0,
        target: 1,
        percentage: isInvincible ? 100 : 0,
        isCompleted: isInvincible,
      };
    }

    case 'GOLDEN_BOOT': {
      if (!league || !league.topScorers || league.topScorers.length === 0) {
        return { current: 0, target: 1, percentage: 0, isCompleted: false };
      }
      const topScorer = league.topScorers[0];
      const belongsToClub =
        topScorer.clubName === club.name ||
        club.squad.some((p) => p.id === topScorer.playerId || p.name === topScorer.playerName);
      const isWon = league.status === 'completed' && belongsToClub && topScorer.goals > 0;
      return {
        current: isWon ? 1 : 0,
        target: 1,
        percentage: isWon ? 100 : 0,
        isCompleted: isWon,
      };
    }

    case 'CUP_CHAMPION': {
      if (!cup) return { current: 0, target: 1, percentage: 0, isCompleted: false };
      const isWon = cup.status === 'completed' && cup.winnerClubId === club.id;
      return {
        current: isWon ? 1 : 0,
        target: 1,
        percentage: isWon ? 100 : 0,
        isCompleted: isWon,
      };
    }

    case 'PVP_CHAMPION': {
      const pvpRating = club.pvpRating ?? 1200;
      const pvpWins = club.pvpRecord?.won ?? 0;
      const isEloTarget = pvpRating >= 1300;
      const isWinsTarget = pvpWins >= 5;
      const isCompleted = isEloTarget || isWinsTarget;
      const current = Math.min(5, Math.max(pvpWins, isEloTarget ? 5 : 0));
      return {
        current,
        target: 5,
        percentage: isCompleted ? 100 : Math.round((current / 5) * 100),
        isCompleted,
      };
    }

    case 'SCENARIO_MASTER': {
      const completed = club.completedScenarios?.length ?? 0;
      const target = 1;
      return {
        current: completed,
        target,
        percentage: Math.min(100, Math.round((completed / target) * 100)),
        isCompleted: completed >= target,
      };
    }

    default:
      return { current: 0, target: 1, percentage: 0, isCompleted: false };
  }
}
