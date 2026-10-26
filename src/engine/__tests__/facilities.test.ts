import { describe, expect, it } from 'vitest';
import {
  calculateGateReceipts,
  generateYouthProdigy,
  MEDICAL_LEVELS,
  STADIUM_LEVELS,
  upgradeCost,
  YOUTH_LEVELS,
} from '../facilities';

describe('Club Infrastructure & Facilities Engine', () => {
  describe('calculateGateReceipts', () => {
    it('returns 0 for away matches regardless of stadium level', () => {
      expect(calculateGateReceipts(1, false)).toBe(0);
      expect(calculateGateReceipts(3, false)).toBe(0);
      expect(calculateGateReceipts(5, false)).toBe(0);
    });

    it('returns correct ticket revenue for home matches across stadium levels 1 to 5', () => {
      expect(calculateGateReceipts(1, true)).toBe(2000);
      expect(calculateGateReceipts(2, true)).toBe(5000);
      expect(calculateGateReceipts(3, true)).toBe(9000);
      expect(calculateGateReceipts(4, true)).toBe(15000);
      expect(calculateGateReceipts(5, true)).toBe(22000);
    });

    it('clamps stadium levels outside 1-5 boundary', () => {
      expect(calculateGateReceipts(0, true)).toBe(2000);
      expect(calculateGateReceipts(-2, true)).toBe(2000);
      expect(calculateGateReceipts(10, true)).toBe(22000);
    });
  });

  describe('upgradeCost', () => {
    it('returns expected stadium upgrade costs for next levels', () => {
      expect(upgradeCost('stadium', 0)).toBe(15000);
      expect(upgradeCost('stadium', 1)).toBe(30000);
      expect(upgradeCost('stadium', 2)).toBe(60000);
      expect(upgradeCost('stadium', 3)).toBe(100000);
      expect(upgradeCost('stadium', 4)).toBe(160000);
      expect(upgradeCost('stadium', 5)).toBeNull();
    });

    it('returns expected youth academy upgrade costs', () => {
      expect(upgradeCost('youthAcademy', 0)).toBe(10000);
      expect(upgradeCost('youthAcademy', 1)).toBe(25000);
      expect(upgradeCost('youthAcademy', 2)).toBe(50000);
      expect(upgradeCost('youthAcademy', 3)).toBeNull();
    });

    it('returns expected medical facility upgrade costs', () => {
      expect(upgradeCost('medical', 0)).toBe(10000);
      expect(upgradeCost('medical', 1)).toBe(20000);
      expect(upgradeCost('medical', 2)).toBe(40000);
      expect(upgradeCost('medical', 3)).toBeNull();
    });
  });

  describe('Facility Configurations & Constants', () => {
    it('defines 5 valid stadium levels with ascending capacity and revenue', () => {
      expect(STADIUM_LEVELS).toHaveLength(5);
      for (let i = 1; i < STADIUM_LEVELS.length; i++) {
        expect(STADIUM_LEVELS[i].capacity).toBeGreaterThan(STADIUM_LEVELS[i - 1].capacity);
        expect(STADIUM_LEVELS[i].ticketRevenue).toBeGreaterThan(STADIUM_LEVELS[i - 1].ticketRevenue);
      }
    });

    it('defines 3 youth academy levels with progressive upgrade costs', () => {
      expect(YOUTH_LEVELS).toHaveLength(3);
      expect(YOUTH_LEVELS[0].upgradeCost).toBe(10000);
      expect(YOUTH_LEVELS[1].upgradeCost).toBe(25000);
      expect(YOUTH_LEVELS[2].upgradeCost).toBe(50000);
    });

    it('defines 3 medical levels with progressive fatigue recovery bonuses', () => {
      expect(MEDICAL_LEVELS).toHaveLength(3);
      expect(MEDICAL_LEVELS[0].fatigueRecoveryBonus).toBe(5);
      expect(MEDICAL_LEVELS[1].fatigueRecoveryBonus).toBe(10);
      expect(MEDICAL_LEVELS[2].fatigueRecoveryBonus).toBe(15);
    });
  });

  describe('generateYouthProdigy', () => {
    it('generates a 16-18 year old player marked as a youth product', () => {
      const prodigy = generateYouthProdigy(1, 4242);

      expect(prodigy.isYouthProduct).toBe(true);
      expect(prodigy.age).toBeGreaterThanOrEqual(16);
      expect(prodigy.age).toBeLessThanOrEqual(18);
      expect(['GK', 'DEF', 'MID', 'ATT']).toContain(prodigy.position);
      expect(prodigy.fitness).toBe(100);
      expect(prodigy.yellowCards).toBe(0);
      expect(prodigy.redCards).toBe(0);
      expect(prodigy.isSuspended).toBe(false);
    });

    it('sets high potential rating greater than overall rating', () => {
      const prodigy = generateYouthProdigy(2, 789);

      expect(prodigy.potentialRating).toBeDefined();
      expect(prodigy.potentialRating).toBeGreaterThan(prodigy.overallRating);
      expect(prodigy.potentialRating).toBeLessThanOrEqual(99);
    });

    it('higher academy levels generate higher average ratings', () => {
      const testSeeds = [101, 202, 303, 404, 505, 606, 707, 808];

      const lvl1Ratings = testSeeds.map((s) => generateYouthProdigy(1, s).overallRating);
      const lvl3Ratings = testSeeds.map((s) => generateYouthProdigy(3, s).overallRating);

      const avgLvl1 = lvl1Ratings.reduce((a, b) => a + b, 0) / lvl1Ratings.length;
      const avgLvl3 = lvl3Ratings.reduce((a, b) => a + b, 0) / lvl3Ratings.length;

      expect(avgLvl3).toBeGreaterThan(avgLvl1);
    });

    it('is strictly deterministic with a fixed seed', () => {
      const p1 = generateYouthProdigy(2, 99999);
      const p2 = generateYouthProdigy(2, 99999);

      expect(p1).toEqual(p2);
    });
  });
});
