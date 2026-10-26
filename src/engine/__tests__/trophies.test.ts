import { describe, it, expect } from 'vitest';
import {
  TROPHY_DEFINITIONS,
  getAllTrophies,
  getTrophyById,
  hasTrophy,
  evaluateUnlockedTrophies,
  calculateTrophyProgress,
} from '../trophies';
import { Club, KnockoutCup, MatchResult, Player } from '../../types';
import { League, LeagueStanding, TopScorer } from '../../types/league';

// Helper to generate a dummy club
function createTestClub(overrides?: Partial<Club>): Club {
  const dummyPlayer: Player = {
    id: 'p-1',
    name: 'Safawi Rasid',
    position: 'ATT',
    overallRating: 75,
    attributes: {
      attack: 78,
      defense: 45,
      passing: 70,
      speed: 80,
      stamina: 75,
      goalkeeping: 20,
    },
  };

  return {
    id: 'club-test-1',
    name: 'Harimau Selatan FC',
    primaryColor: '#002B7F',
    secondaryColor: '#E03A3E',
    badgeId: 'shield',
    squad: [dummyPlayer],
    formation: '4-3-3',
    startingXI: ['p-1'],
    tactics: 'Balanced',
    stats: {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    },
    budget: 50000,
    createdAt: Date.now(),
    ...overrides,
  };
}

// Helper to generate a dummy league
function createTestLeague(overrides?: Partial<League>): League {
  const defaultStandings: LeagueStanding[] = [
    {
      clubId: 'club-test-1',
      clubName: 'Harimau Selatan FC',
      primaryColor: '#002B7F',
      secondaryColor: '#E03A3E',
      badgeId: 'shield',
      played: 6,
      won: 5,
      drawn: 1,
      lost: 0,
      goalsFor: 18,
      goalsAgainst: 3,
      goalDifference: 15,
      points: 16,
      form: ['W', 'W', 'W', 'W', 'D', 'W'],
    },
    {
      clubId: 'club-rival-2',
      clubName: 'Red Giants FC',
      primaryColor: '#DC2626',
      secondaryColor: '#FACC15',
      badgeId: 'lion',
      played: 6,
      won: 3,
      drawn: 1,
      lost: 2,
      goalsFor: 10,
      goalsAgainst: 8,
      goalDifference: 2,
      points: 10,
      form: ['W', 'L', 'W', 'D', 'L', 'W'],
    },
  ];

  const defaultTopScorers: TopScorer[] = [
    {
      playerId: 'p-1',
      playerName: 'Safawi Rasid',
      clubName: 'Harimau Selatan FC',
      goals: 8,
    },
    {
      playerId: 'p-rival-1',
      playerName: 'Bergson',
      clubName: 'Red Giants FC',
      goals: 5,
    },
  ];

  return {
    id: 'league-test-1',
    name: 'Liga Perdana Utama',
    code: 'PERD-01',
    creatorClubId: 'club-test-1',
    season: 1,
    status: 'completed',
    currentRound: 7,
    totalRounds: 6,
    teams: [],
    fixtures: [],
    standings: defaultStandings,
    topScorers: defaultTopScorers,
    createdAt: Date.now() - 3600000,
    ...overrides,
  };
}

describe('Trophy Cabinet & Season Awards System (trophies.ts)', () => {
  describe('Trophy Definitions', () => {
    it('defines the 5 mandatory achievements with proper titles and descriptions', () => {
      expect(TROPHY_DEFINITIONS.CHAMPION).toBeDefined();
      expect(TROPHY_DEFINITIONS.CHAMPION.title).toBe('Juara Liga Perdana');

      expect(TROPHY_DEFINITIONS.GOLDEN_BOOT).toBeDefined();
      expect(TROPHY_DEFINITIONS.GOLDEN_BOOT.title).toBe('Anugerah Kasut Emas');

      expect(TROPHY_DEFINITIONS.CENTURION).toBeDefined();
      expect(TROPHY_DEFINITIONS.CENTURION.title).toBe('Kelab 100 Gol');

      expect(TROPHY_DEFINITIONS.INVINCIBLE).toBeDefined();
      expect(TROPHY_DEFINITIONS.INVINCIBLE.title).toBe('Skuad Kebal (Musim Tanpa Kalah)');

      expect(TROPHY_DEFINITIONS.TACTICIAN).toBeDefined();
      expect(TROPHY_DEFINITIONS.TACTICIAN.title).toBe('Pengurus Berkaliber (Menang 10 Perlawanan)');
    });

    it('getAllTrophies returns all registered trophies', () => {
      const all = getAllTrophies();
      expect(all.length).toBeGreaterThanOrEqual(5);
      expect(all.some((t) => t.id === 'CHAMPION')).toBe(true);
    });

    it('getTrophyById retrieves trophy or returns undefined for unknown ID', () => {
      expect(getTrophyById('TACTICIAN')?.title).toBe('Pengurus Berkaliber (Menang 10 Perlawanan)');
      expect(getTrophyById('NON_EXISTENT_TROPHY')).toBeUndefined();
    });

    it('hasTrophy correctly checks existence in a trophy list', () => {
      const list = [TROPHY_DEFINITIONS.CHAMPION];
      expect(hasTrophy(list, 'CHAMPION')).toBe(true);
      expect(hasTrophy(list, 'TACTICIAN')).toBe(false);
    });
  });

  describe('evaluateUnlockedTrophies', () => {
    it('returns empty array when club has no achievements and no league', () => {
      const club = createTestClub();
      const unlocked = evaluateUnlockedTrophies(club, null, []);
      expect(unlocked).toEqual([]);
    });

    it('unlocks TACTICIAN when club reaches 10 wins via club.stats', () => {
      const club = createTestClub({
        stats: {
          played: 12,
          won: 10,
          drawn: 1,
          lost: 1,
          goalsFor: 25,
          goalsAgainst: 8,
        },
      });

      const unlocked = evaluateUnlockedTrophies(club, null, []);
      expect(unlocked.some((t) => t.id === 'TACTICIAN')).toBe(true);
      expect(hasTrophy(unlocked, 'CENTURION')).toBe(false);
    });

    it('unlocks TACTICIAN when history has 10 winning matches', () => {
      const club = createTestClub({
        stats: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 },
      });

      const history: MatchResult[] = Array.from({ length: 10 }, (_, i) => ({
        id: `match-${i}`,
        seed: i,
        timestamp: 1000 + i,
        homeClub: { id: club.id } as any,
        awayClub: { id: 'rival' } as any,
        homeScore: 2,
        awayScore: 0,
        homeStats: {} as any,
        awayStats: {} as any,
        events: [],
      }));

      const unlocked = evaluateUnlockedTrophies(club, null, history);
      expect(hasTrophy(unlocked, 'TACTICIAN')).toBe(true);
    });

    it('does not unlock TACTICIAN with only 9 wins', () => {
      const club = createTestClub({
        stats: { played: 9, won: 9, drawn: 0, lost: 0, goalsFor: 15, goalsAgainst: 2 },
      });
      const unlocked = evaluateUnlockedTrophies(club, null, []);
      expect(hasTrophy(unlocked, 'TACTICIAN')).toBe(false);
    });

    it('unlocks CENTURION when club reaches 100 goalsFor in stats', () => {
      const club = createTestClub({
        stats: {
          played: 40,
          won: 30,
          drawn: 5,
          lost: 5,
          goalsFor: 100,
          goalsAgainst: 30,
        },
      });

      const unlocked = evaluateUnlockedTrophies(club, null, []);
      expect(hasTrophy(unlocked, 'CENTURION')).toBe(true);
    });

    it('does not unlock CENTURION if goalsFor is below 100', () => {
      const club = createTestClub({
        stats: { played: 30, won: 20, drawn: 5, lost: 5, goalsFor: 99, goalsAgainst: 20 },
      });
      const unlocked = evaluateUnlockedTrophies(club, null, []);
      expect(hasTrophy(unlocked, 'CENTURION')).toBe(false);
    });

    it('unlocks CHAMPION when league is completed and club is in 1st place', () => {
      const club = createTestClub();
      const league = createTestLeague({
        status: 'completed',
        standings: [
          {
            clubId: club.id,
            clubName: club.name,
            points: 15,
            won: 5,
            drawn: 0,
            lost: 1,
            played: 6,
          } as any,
          { clubId: 'other-club', points: 10, won: 3, drawn: 1, lost: 2, played: 6 } as any,
        ],
      });

      const unlocked = evaluateUnlockedTrophies(club, league, []);
      expect(hasTrophy(unlocked, 'CHAMPION')).toBe(true);
    });

    it('does not unlock CHAMPION if league is still active (not completed)', () => {
      const club = createTestClub();
      const league = createTestLeague({
        status: 'active',
        currentRound: 3,
        totalRounds: 6,
        standings: [{ clubId: club.id, points: 9 } as any],
      });

      const unlocked = evaluateUnlockedTrophies(club, league, []);
      expect(hasTrophy(unlocked, 'CHAMPION')).toBe(false);
    });

    it('does not unlock CHAMPION if club is not in 1st place in completed league', () => {
      const club = createTestClub();
      const league = createTestLeague({
        status: 'completed',
        standings: [
          { clubId: 'rival-club', points: 18 } as any,
          { clubId: club.id, points: 15 } as any,
        ],
      });

      const unlocked = evaluateUnlockedTrophies(club, league, []);
      expect(hasTrophy(unlocked, 'CHAMPION')).toBe(false);
    });

    it('unlocks INVINCIBLE when completed league has 0 losses', () => {
      const club = createTestClub();
      const league = createTestLeague({
        status: 'completed',
        standings: [
          {
            clubId: club.id,
            clubName: club.name,
            played: 6,
            won: 4,
            drawn: 2,
            lost: 0,
            points: 14,
          } as any,
        ],
      });

      const unlocked = evaluateUnlockedTrophies(club, league, []);
      expect(hasTrophy(unlocked, 'INVINCIBLE')).toBe(true);
    });

    it('does not unlock INVINCIBLE if club suffered at least 1 loss', () => {
      const club = createTestClub();
      const league = createTestLeague({
        status: 'completed',
        standings: [
          {
            clubId: club.id,
            clubName: club.name,
            played: 6,
            won: 5,
            drawn: 0,
            lost: 1,
            points: 15,
          } as any,
        ],
      });

      const unlocked = evaluateUnlockedTrophies(club, league, []);
      expect(hasTrophy(unlocked, 'INVINCIBLE')).toBe(false);
    });

    it('unlocks GOLDEN_BOOT when completed league top scorer is from club squad', () => {
      const club = createTestClub();
      const league = createTestLeague({
        status: 'completed',
        topScorers: [
          {
            playerId: 'p-1',
            playerName: 'Safawi Rasid',
            clubName: club.name,
            goals: 9,
          },
        ],
      });

      const unlocked = evaluateUnlockedTrophies(club, league, []);
      expect(hasTrophy(unlocked, 'GOLDEN_BOOT')).toBe(true);
    });

    it('does not unlock GOLDEN_BOOT if top scorer is from opponent team', () => {
      const club = createTestClub();
      const league = createTestLeague({
        status: 'completed',
        topScorers: [
          {
            playerId: 'p-rival-9',
            playerName: 'Rival Striker',
            clubName: 'Rival FC',
            goals: 9,
          },
        ],
      });

      const unlocked = evaluateUnlockedTrophies(club, league, []);
      expect(hasTrophy(unlocked, 'GOLDEN_BOOT')).toBe(false);
    });

    it('unlocks ALL 5 trophies for a dominant invincible champion with top scorer and 100+ goals', () => {
      const club = createTestClub({
        stats: {
          played: 45,
          won: 38,
          drawn: 5,
          lost: 2,
          goalsFor: 120,
          goalsAgainst: 22,
        },
      });

      const league = createTestLeague({
        status: 'completed',
        standings: [
          {
            clubId: club.id,
            clubName: club.name,
            played: 6,
            won: 6,
            drawn: 0,
            lost: 0,
            goalsFor: 22,
            goalsAgainst: 2,
            points: 18,
          } as any,
        ],
        topScorers: [
          {
            playerId: 'p-1',
            playerName: 'Safawi Rasid',
            clubName: club.name,
            goals: 11,
          },
        ],
      });

      const unlocked = evaluateUnlockedTrophies(club, league, []);
      expect(unlocked.length).toBe(5);
      expect(hasTrophy(unlocked, 'CHAMPION')).toBe(true);
      expect(hasTrophy(unlocked, 'GOLDEN_BOOT')).toBe(true);
      expect(hasTrophy(unlocked, 'CENTURION')).toBe(true);
      expect(hasTrophy(unlocked, 'INVINCIBLE')).toBe(true);
      expect(hasTrophy(unlocked, 'TACTICIAN')).toBe(true);
    });
  });

  describe('calculateTrophyProgress', () => {
    it('calculates accurate progress towards TACTICIAN', () => {
      const club = createTestClub({
        stats: { played: 7, won: 7, drawn: 0, lost: 0, goalsFor: 15, goalsAgainst: 2 },
      });
      const progress = calculateTrophyProgress('TACTICIAN', club);
      expect(progress.current).toBe(7);
      expect(progress.target).toBe(10);
      expect(progress.percentage).toBe(70);
      expect(progress.isCompleted).toBe(false);
    });

    it('calculates accurate progress towards CENTURION', () => {
      const club = createTestClub({
        stats: { played: 15, won: 10, drawn: 2, lost: 3, goalsFor: 45, goalsAgainst: 12 },
      });
      const progress = calculateTrophyProgress('CENTURION', club);
      expect(progress.current).toBe(45);
      expect(progress.target).toBe(100);
      expect(progress.percentage).toBe(45);
      expect(progress.isCompleted).toBe(false);
    });

    it('unlocks CUP_CHAMPION trophy when club wins the Knockout Cup', () => {
      const club = createTestClub();
      const cup: KnockoutCup = {
        id: 'cup_test_champ',
        name: 'Piala MainBola',
        season: 1,
        status: 'completed',
        currentRound: 'Final',
        currentRoundIndex: 2,
        teams: [],
        matches: [],
        winnerClubId: club.id,
        winnerClubName: club.name,
        createdAt: 1700000000000,
      };

      const unlocked = evaluateUnlockedTrophies(club, null, [], cup);
      expect(hasTrophy(unlocked, 'CUP_CHAMPION')).toBe(true);

      const progress = calculateTrophyProgress('CUP_CHAMPION', club, null, [], cup);
      expect(progress.isCompleted).toBe(true);
      expect(progress.percentage).toBe(100);
    });
  });
});
