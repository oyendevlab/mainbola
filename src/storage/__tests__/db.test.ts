import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getClub,
  saveClub,
  deleteClub,
  getProfile,
  saveProfile,
  getMatchHistory,
  saveMatchResult,
  getSetting,
  saveSetting,
  deleteSetting,
  getActiveCup,
  saveActiveCup,
  deleteActiveCup,
  resetAllData,
  closeDb,
} from '../db';
import { Club, KnockoutCup, ManagerProfile, MatchResult } from '../../types';

describe('IndexedDB Persistence Layer (db.ts)', () => {
  const dummyClub: Club = {
    id: 'club_garuda_fc',
    name: 'Garuda Nusantara FC',
    primaryColor: '#e11d48',
    secondaryColor: '#ffffff',
    badgeId: 'eagle_1',
    squad: [
      {
        id: 'ply_1',
        name: 'Ernando Ari',
        position: 'GK',
        overallRating: 78,
        attributes: {
          attack: 20,
          defense: 60,
          passing: 65,
          speed: 55,
          stamina: 70,
          goalkeeping: 82,
        },
      },
    ],
    formation: '4-3-3',
    startingXI: ['ply_1'],
    tactics: 'Attacking',
    budget: 50000,
    stats: {
      played: 5,
      won: 4,
      drawn: 1,
      lost: 0,
      goalsFor: 12,
      goalsAgainst: 3,
    },
    createdAt: 1700000000000,
  };

  const dummyProfile: ManagerProfile = {
    name: 'Coach Shin',
    experienceLevel: 4,
    soundEnabled: true,
    replaySpeed: 2,
    commentaryVoiceEnabled: true,
    commentaryLanguage: 'ms',
  };

  const dummyMatch: MatchResult = {
    id: 'match_101',
    seed: 42,
    timestamp: 1700000100000,
    homeClub: {
      id: 'club_garuda_fc',
      name: 'Garuda Nusantara FC',
      primaryColor: '#e11d48',
      secondaryColor: '#ffffff',
      badgeId: 'eagle_1',
      formation: '4-3-3',
      tactics: 'Attacking',
      startingXI: dummyClub.squad,
    },
    awayClub: {
      id: 'club_rival',
      name: 'Harimau United',
      primaryColor: '#1e3a8a',
      secondaryColor: '#fbbf24',
      badgeId: 'tiger_1',
      formation: '4-4-2',
      tactics: 'Balanced',
      startingXI: [],
    },
    homeScore: 3,
    awayScore: 1,
    homeStats: {
      shots: 10,
      shotsOnTarget: 6,
      possession: 58,
      passes: 320,
      tackles: 14,
      saves: 2,
    },
    awayStats: {
      shots: 5,
      shotsOnTarget: 3,
      possession: 42,
      passes: 210,
      tackles: 18,
      saves: 3,
    },
    events: [],
  };

  beforeEach(async () => {
    await resetAllData().catch(() => {});
  });

  afterEach(async () => {
    await resetAllData().catch(() => {});
    closeDb();
  });

  describe('Club store', () => {
    it('returns null when no club is saved', async () => {
      const club = await getClub();
      expect(club).toBeNull();
    });

    it('saves and retrieves club successfully', async () => {
      await saveClub(dummyClub);
      const retrieved = await getClub();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(dummyClub.id);
      expect(retrieved?.name).toBe('Garuda Nusantara FC');
      expect(retrieved?.stats.won).toBe(4);
    });

    it('updates club with new stats/formation correctly', async () => {
      await saveClub(dummyClub);
      const updated = {
        ...dummyClub,
        formation: '4-4-2' as const,
        stats: { ...dummyClub.stats, played: 6, won: 5 },
      };
      await saveClub(updated);

      const retrieved = await getClub();
      expect(retrieved?.formation).toBe('4-4-2');
      expect(retrieved?.stats.won).toBe(5);
    });

    it('deletes active club', async () => {
      await saveClub(dummyClub);
      await deleteClub();
      const retrieved = await getClub();
      expect(retrieved).toBeNull();
    });

    it('normalizes legacy clubs with v0.6.0 defaults (morale 80, kit colors, pvpRating 1200)', async () => {
      // Simulate raw legacy club stored in IndexedDB without v0.6.0 properties
      const legacyRawClub: any = {
        id: 'legacy_club',
        name: 'Legacy FC',
        primaryColor: '#ff0000',
        secondaryColor: '#ffffff',
        badgeId: 'b1',
        formation: '4-3-3',
        startingXI: ['p1'],
        tactics: 'Balanced',
        stats: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 },
        createdAt: 1700000000000,
        squad: [
          {
            id: 'p1',
            name: 'Legacy Player',
            position: 'ATT',
            overallRating: 70,
            attributes: { attack: 70, defense: 40, passing: 60, speed: 70, stamina: 70, goalkeeping: 10 },
          },
        ],
      };

      await saveClub(legacyRawClub);
      const normalized = await getClub();
      expect(normalized).not.toBeNull();
      expect(normalized?.pvpRating).toBe(1200);
      expect(normalized?.pvpRecord).toEqual({ won: 0, drawn: 0, lost: 0 });
      expect(normalized?.awayPrimaryColor).toBeDefined();
      expect(normalized?.kitPattern).toBe('solid');
      expect(normalized?.squad[0].morale).toBe(80);
    });
  });

  describe('Manager profile store', () => {
    it('returns null when no profile is saved', async () => {
      const profile = await getProfile();
      expect(profile).toBeNull();
    });

    it('saves and retrieves profile', async () => {
      await saveProfile(dummyProfile);
      const retrieved = await getProfile();
      expect(retrieved).toEqual(dummyProfile);
    });
  });

  describe('Match history store', () => {
    it('returns empty array when no matches are saved', async () => {
      const matches = await getMatchHistory();
      expect(matches).toEqual([]);
    });

    it('saves and sorts match history by timestamp descending', async () => {
      const matchOlder: MatchResult = {
        ...dummyMatch,
        id: 'match_older',
        timestamp: 1000,
      };
      const matchNewer: MatchResult = {
        ...dummyMatch,
        id: 'match_newer',
        timestamp: 2000,
      };

      await saveMatchResult(matchOlder);
      await saveMatchResult(matchNewer);

      const history = await getMatchHistory();
      expect(history.length).toBe(2);
      expect(history[0].id).toBe('match_newer');
      expect(history[1].id).toBe('match_older');
    });
  });

  describe('Settings store', () => {
    it('saves, retrieves, and deletes settings', async () => {
      await saveSetting('difficulty', 'expert');
      const val = await getSetting<string>('difficulty');
      expect(val).toBe('expert');

      await deleteSetting('difficulty');
      const deletedVal = await getSetting<string>('difficulty');
      expect(deletedVal).toBeNull();
    });

    it('returns defaultValue if key does not exist', async () => {
      const val = await getSetting<number>('non_existent', 99);
      expect(val).toBe(99);
    });
  });

  describe('Knockout Cup store', () => {
    const dummyCup: KnockoutCup = {
      id: 'cup_test_1',
      name: 'Piala MainBola',
      season: 1,
      status: 'active',
      currentRound: 'Quarter',
      currentRoundIndex: 0,
      teams: [],
      matches: [],
      createdAt: 1700000000000,
    };

    it('returns null when no cup is saved', async () => {
      const cup = await getActiveCup();
      expect(cup).toBeNull();
    });

    it('saves and retrieves active cup correctly', async () => {
      await saveActiveCup(dummyCup);
      const retrieved = await getActiveCup();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('cup_test_1');
      expect(retrieved?.name).toBe('Piala MainBola');
    });

    it('deletes active cup successfully', async () => {
      await saveActiveCup(dummyCup);
      await deleteActiveCup();
      const retrieved = await getActiveCup();
      expect(retrieved).toBeNull();
    });
  });

  describe('resetAllData', () => {
    it('clears all stores safely', async () => {
      await saveClub(dummyClub);
      await saveProfile(dummyProfile);
      await saveMatchResult(dummyMatch);
      await saveSetting('theme', 'dark');

      await resetAllData();

      expect(await getClub()).toBeNull();
      expect(await getProfile()).toBeNull();
      expect(await getMatchHistory()).toEqual([]);
      expect(await getSetting('theme')).toBeNull();
    });
  });
});
