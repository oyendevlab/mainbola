import { describe, expect, it } from 'vitest';
import { PRNG, createPRNG } from '../prng';

describe('PRNG (Mulberry32)', () => {
  it('is strictly deterministic: identical seeds produce identical float sequences', () => {
    const seed = 123456789;
    const prng1 = new PRNG(seed);
    const prng2 = createPRNG(seed);

    const seq1 = Array.from({ length: 50 }, () => prng1.next());
    const seq2 = Array.from({ length: 50 }, () => prng2.next());

    expect(seq1).toEqual(seq2);
    expect(seq1.every((n) => n >= 0 && n < 1)).toBe(true);
  });

  it('produces different sequences for different seeds', () => {
    const prngA = new PRNG(42);
    const prngB = new PRNG(999);

    const seqA = Array.from({ length: 20 }, () => prngA.next());
    const seqB = Array.from({ length: 20 }, () => prngB.next());

    expect(seqA).not.toEqual(seqB);
  });

  it('nextInt generates integers strictly within [min, max] inclusive', () => {
    const prng = new PRNG(777);
    const min = 3;
    const max = 7;

    const values = Array.from({ length: 200 }, () => prng.nextInt(min, max));

    expect(values.every((v) => Number.isInteger(v))).toBe(true);
    expect(values.every((v) => v >= min && v <= max)).toBe(true);
    // Over 200 trials with range 3..7, both min and max should appear
    expect(values.includes(min)).toBe(true);
    expect(values.includes(max)).toBe(true);
  });

  it('nextInt handles inverted min and max gracefully', () => {
    const prng = new PRNG(888);
    const val = prng.nextInt(10, 5);
    expect(val).toBeGreaterThanOrEqual(5);
    expect(val).toBeLessThanOrEqual(10);
  });

  it('nextFloat generates floats within [min, max)', () => {
    const prng = new PRNG(31415);
    const min = 10.5;
    const max = 20.5;

    const values = Array.from({ length: 100 }, () => prng.nextFloat(min, max));

    expect(values.every((v) => v >= min && v <= max)).toBe(true);
  });

  it('pick selects elements from array deterministically', () => {
    const prng1 = new PRNG(101);
    const prng2 = new PRNG(101);
    const items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];

    const picks1 = Array.from({ length: 20 }, () => prng1.pick(items));
    const picks2 = Array.from({ length: 20 }, () => prng2.pick(items));

    expect(picks1).toEqual(picks2);
    expect(picks1.every((item) => items.includes(item))).toBe(true);
  });

  it('pick throws an error on empty array', () => {
    const prng = new PRNG(1);
    expect(() => prng.pick([])).toThrow('Cannot pick');
  });

  it('shuffle produces deterministic permutation without mutating original array', () => {
    const prng1 = new PRNG(202);
    const prng2 = new PRNG(202);
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const shuffled1 = prng1.shuffle(original);
    const shuffled2 = prng2.shuffle(original);

    expect(shuffled1).toEqual(shuffled2);
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // not mutated
    expect(shuffled1).toHaveLength(original.length);
    expect([...shuffled1].sort((a, b) => a - b)).toEqual(original);
  });

  it('chance obeys edge cases and reasonable probability', () => {
    const prng = new PRNG(303);

    expect(prng.chance(0)).toBe(false);
    expect(prng.chance(-0.5)).toBe(false);
    expect(prng.chance(1)).toBe(true);
    expect(prng.chance(1.5)).toBe(true);

    const trials = 1000;
    let trueCount = 0;
    for (let i = 0; i < trials; i++) {
      if (prng.chance(0.3)) trueCount++;
    }
    // 30% chance over 1000 trials should be roughly between 25% and 35%
    expect(trueCount).toBeGreaterThan(230);
    expect(trueCount).toBeLessThan(370);
  });

  it('gaussian generates numbers around mean with finite stdDev', () => {
    const prng = new PRNG(404);
    const values = Array.from({ length: 500 }, () => prng.gaussian(70, 5));

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(mean).toBeGreaterThan(68);
    expect(mean).toBeLessThan(72);
  });
});
