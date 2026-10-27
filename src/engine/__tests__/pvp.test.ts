import { describe, it, expect } from 'vitest';
import { generateClub } from '../generator';
import {
  encodeChallengeCode,
  decodeChallengeCode,
  calculateEloChange,
  getPvPRank,
} from '../pvp';

describe('PvP Asynchronous Duel Engine (pvp.ts)', () => {
  const clubA = generateClub({
    name: 'Harimau Selatan',
    primaryColor: '#1E3A8A',
    secondaryColor: '#EF4444',
    seed: 12345,
  });

  describe('encodeChallengeCode & decodeChallengeCode', () => {
    it('encodes club snapshot into a valid MBPVP_ prefixed string', () => {
      const code = encodeChallengeCode(clubA);
      expect(code).toBeDefined();
      expect(code.startsWith('MBPVP_')).toBe(true);
      expect(code.length).toBeGreaterThan(50);
    });

    it('decodes encoded challenge code back to matching club details', () => {
      const code = encodeChallengeCode(clubA);
      const decoded = decodeChallengeCode(code);

      expect(decoded).not.toBeNull();
      const snapshot = decoded?.snapshot || decoded;
      expect(snapshot?.name).toBe('Harimau Selatan');
      expect(snapshot?.primaryColor).toBe('#1E3A8A');
      expect(snapshot?.secondaryColor).toBe('#EF4444');
      expect(snapshot?.startingXI.length).toBe(11);
    });

    it('returns null when given invalid or malformed challenge code', () => {
      expect(decodeChallengeCode('')).toBeNull();
      expect(decodeChallengeCode('INVALID_CODE')).toBeNull();
      expect(decodeChallengeCode('MBPVP_not_a_valid_base64!')).toBeNull();
      expect(decodeChallengeCode('MBPVP_e30=')).toBeNull(); // empty object
    });
  });

  describe('calculateEloChange', () => {
    it('awards positive Elo on win against equal opponent', () => {
      const delta = calculateEloChange(1200, 1200, 2, 1);
      expect(delta).toBe(16); // 32 * (1 - 0.5) = +16
    });

    it('deducts Elo on loss against equal opponent', () => {
      const delta = calculateEloChange(1200, 1200, 0, 1);
      expect(delta).toBe(-16); // 32 * (0 - 0.5) = -16
    });

    it('returns zero Elo change on draw against equal opponent', () => {
      const delta = calculateEloChange(1200, 1200, 1, 1);
      expect(delta).toBe(0); // 32 * (0.5 - 0.5) = 0
    });

    it('awards more points when defeating a significantly higher rated opponent', () => {
      const deltaAgainstHigher = calculateEloChange(1200, 1500, 2, 1);
      const deltaAgainstEqual = calculateEloChange(1200, 1200, 2, 1);
      expect(deltaAgainstHigher).toBeGreaterThan(deltaAgainstEqual);
    });

    it('loses fewer points when defeated by a significantly higher rated opponent', () => {
      const deltaLostToHigher = calculateEloChange(1200, 1500, 0, 2);
      const deltaLostToEqual = calculateEloChange(1200, 1200, 0, 2);
      expect(deltaLostToHigher).toBeGreaterThan(deltaLostToEqual); // e.g. -5 > -16
    });
  });

  describe('getPvPRank', () => {
    it('returns Amatur for ratings below 1100', () => {
      const rank = getPvPRank(1050);
      expect(rank.title).toBe('Amatur');
      expect(rank.badge).toBe('🥉');
    });

    it('returns Semi-Pro for 1100 to 1299', () => {
      const rank = getPvPRank(1200);
      expect(rank.title).toBe('Semi-Pro');
      expect(rank.badge).toBe('🥈');
    });

    it('returns Profesional for 1300 to 1499', () => {
      const rank = getPvPRank(1350);
      expect(rank.title).toBe('Profesional');
    });

    it('returns Elit for 1500+', () => {
      const rank = getPvPRank(1650);
      expect(rank.title).toBe('Elit');
    });
  });
});
