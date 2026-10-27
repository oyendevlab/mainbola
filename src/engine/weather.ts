import { createPRNG } from './prng';

export type WeatherType = 'Sunny' | 'Rainy' | 'Night';

export interface WeatherEffects {
  type: WeatherType;
  label: string;
  icon: string;
  description: string;
  staminaMultiplier: number; // e.g. 1.2 for Sunny (+20% fatigue)
  foulBonus: number; // e.g. 1.15 for Rainy (+15% tackles/cards)
  ambientLight: number; // 0.0 - 1.0 (Phaser lighting guide)
}

export const WEATHER_CONFIGS: Record<WeatherType, WeatherEffects> = {
  Sunny: {
    type: 'Sunny',
    label: 'Panas Terik',
    icon: '☀️',
    description: 'Cuaca panas mengeringkan rumput dan menguras stamina pemain 20% lebih pantas.',
    staminaMultiplier: 1.2,
    foulBonus: 1.0,
    ambientLight: 1.0,
  },
  Rainy: {
    type: 'Rainy',
    label: 'Hujan Lebat',
    icon: '🌧️',
    description: 'Padang licin dan basah. Risiko terjahan gelincir dan kad amaran meningkat.',
    staminaMultiplier: 1.0,
    foulBonus: 1.25,
    ambientLight: 0.85,
  },
  Night: {
    type: 'Night',
    label: 'Malam Lampu Limpah',
    icon: '🌙',
    description: 'Suhu sejuk di bawah sinaran lampu limpah stadium. Keadaan optimum untuk aksi bola sepak pantas.',
    staminaMultiplier: 1.0,
    foulBonus: 1.0,
    ambientLight: 0.9,
  },
};

/**
 * Deterministically generates match weather based on seed.
 */
export function getRandomWeather(seed: number): WeatherType {
  const prng = createPRNG((seed * 31337 + 7919) >>> 0);
  const val = prng.next();
  if (val < 0.38) return 'Night';
  if (val < 0.70) return 'Sunny';
  return 'Rainy';
}

/**
 * Returns weather configuration and gameplay modifiers.
 */
export function getWeatherEffects(weather: WeatherType): WeatherEffects {
  return WEATHER_CONFIGS[weather] || WEATHER_CONFIGS.Night;
}
