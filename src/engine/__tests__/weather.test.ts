import { describe, it, expect } from 'vitest';
import { getRandomWeather, getWeatherEffects, WEATHER_CONFIGS } from '../weather';

describe('Weather System Engine (weather.ts)', () => {
  describe('getRandomWeather', () => {
    it('returns a valid weather type (Sunny, Rainy, Night)', () => {
      const w1 = getRandomWeather(100);
      const w2 = getRandomWeather(200);
      const w3 = getRandomWeather(300);

      expect(['Sunny', 'Rainy', 'Night']).toContain(w1);
      expect(['Sunny', 'Rainy', 'Night']).toContain(w2);
      expect(['Sunny', 'Rainy', 'Night']).toContain(w3);
    });

    it('returns deterministic weather given the same seed', () => {
      const wA = getRandomWeather(77777);
      const wB = getRandomWeather(77777);
      expect(wA).toBe(wB);
    });

    it('generates different weather conditions across various seeds', () => {
      const results = new Set<string>();
      for (let s = 1; s <= 30; s++) {
        results.add(getRandomWeather(s * 1337));
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('getWeatherEffects', () => {
    it('returns proper modifiers for Sunny', () => {
      const fx = getWeatherEffects('Sunny');
      expect(fx.type).toBe('Sunny');
      expect(fx.staminaMultiplier).toBe(1.2);
      expect(fx.foulBonus).toBe(1.0);
      expect(fx.icon).toBe('☀️');
    });

    it('returns proper modifiers for Rainy', () => {
      const fx = getWeatherEffects('Rainy');
      expect(fx.type).toBe('Rainy');
      expect(fx.foulBonus).toBe(1.25);
      expect(fx.icon).toBe('🌧️');
    });

    it('returns proper modifiers for Night', () => {
      const fx = getWeatherEffects('Night');
      expect(fx.type).toBe('Night');
      expect(fx.ambientLight).toBeDefined();
      expect(fx.icon).toBe('🌙');
    });

    it('has full coverage in WEATHER_CONFIGS', () => {
      expect(WEATHER_CONFIGS.Sunny).toBeDefined();
      expect(WEATHER_CONFIGS.Rainy).toBeDefined();
      expect(WEATHER_CONFIGS.Night).toBeDefined();
    });
  });
});
