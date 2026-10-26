/**
 * Seeded Pseudo-Random Number Generator (PRNG) using Mulberry32 algorithm.
 * Deterministic: identical seeds will always yield identical sequences.
 */

export class PRNG {
  private state: number;

  constructor(seed: number) {
    // Normalise seed to 32-bit unsigned integer. If 0 or omitted, use a default fallback.
    this.state = (seed | 0) === 0 ? 0x12345678 : (seed >>> 0);
  }

  /**
   * Returns a deterministic pseudo-random float in [0, 1).
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a deterministic integer in [min, max] inclusive.
   */
  nextInt(min: number, max: number): number {
    const lo = Math.min(Math.ceil(min), Math.floor(max));
    const hi = Math.max(Math.ceil(min), Math.floor(max));
    return Math.floor(this.next() * (hi - lo + 1)) + lo;
  }

  /**
   * Returns a deterministic float in [min, max).
   */
  nextFloat(min: number, max: number): number {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return lo + this.next() * (hi - lo);
  }

  /**
   * Picks a random element from a non-empty array.
   */
  pick<T>(items: readonly T[]): T {
    if (!items || items.length === 0) {
      throw new Error('Cannot pick an element from an empty array');
    }
    const index = Math.floor(this.next() * items.length);
    return items[index];
  }

  /**
   * Shuffles an array deterministically using Fisher-Yates and returns a new copy.
   */
  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  /**
   * Returns true with the given probability (0..1).
   */
  chance(probability: number): boolean {
    if (probability <= 0) return false;
    if (probability >= 1) return true;
    return this.next() < probability;
  }

  /**
   * Returns a normally distributed value with given mean and standard deviation
   * using Box-Muller transform.
   */
  gaussian(mean = 0, stdDev = 1): number {
    const u1 = Math.max(1e-15, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Current internal state (32-bit unsigned).
   */
  getState(): number {
    return this.state;
  }
}

export function createPRNG(seed: number): PRNG {
  return new PRNG(seed);
}
