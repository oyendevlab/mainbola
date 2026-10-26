import { Player, PlayerPosition, PlayerAttributes } from '../types';
import { createPRNG, PRNG } from './prng';
import {
  calculateOverallRating,
  calculatePlayerMarketValue,
  FIRST_NAMES,
  LAST_NAMES,
} from './generator';

export interface StadiumLevelConfig {
  level: number;
  name: string;
  capacity: number;
  upgradeCost: number;
  ticketRevenue: number;
}

export interface YouthLevelConfig {
  level: number;
  name: string;
  upgradeCost: number;
  description: string;
}

export interface MedicalLevelConfig {
  level: number;
  name: string;
  upgradeCost: number;
  fatigueRecoveryBonus: number; // percentage (5, 10, 15)
  description: string;
}

export const STADIUM_LEVELS: StadiumLevelConfig[] = [
  {
    level: 1,
    name: 'Stadium Komuniti',
    capacity: 5000,
    upgradeCost: 15000,
    ticketRevenue: 2000,
  },
  {
    level: 2,
    name: 'Stadium Daerah',
    capacity: 12000,
    upgradeCost: 30000,
    ticketRevenue: 5000,
  },
  {
    level: 3,
    name: 'Stadium Bandar',
    capacity: 22000,
    upgradeCost: 60000,
    ticketRevenue: 9000,
  },
  {
    level: 4,
    name: 'Arena Premier',
    capacity: 35000,
    upgradeCost: 100000,
    ticketRevenue: 15000,
  },
  {
    level: 5,
    name: 'Stadium Megah Antarabangsa',
    capacity: 50000,
    upgradeCost: 160000,
    ticketRevenue: 22000,
  },
];

export const YOUTH_LEVELS: YouthLevelConfig[] = [
  {
    level: 1,
    name: 'Akademi Asas',
    upgradeCost: 10000,
    description: 'Pusat latihan bakat amatur untuk mencungkil pemain muda.',
  },
  {
    level: 2,
    name: 'Akademi Elit',
    upgradeCost: 25000,
    description: 'Fasiliti pembangunan teknikal dengan jurulatih bertauliah.',
  },
  {
    level: 3,
    name: 'Pusat Kecemerlangan Belia',
    upgradeCost: 50000,
    description: 'Akademi bertaraf antarabangsa yang menghasilkan permata masa depan.',
  },
];

export const MEDICAL_LEVELS: MedicalLevelConfig[] = [
  {
    level: 1,
    name: 'Klinik Rawatan Asas',
    upgradeCost: 10000,
    fatigueRecoveryBonus: 5,
    description: 'Rawatan kecergasan asas (+5% pemulihan keletihan).',
  },
  {
    level: 2,
    name: 'Pusat Fisioterapi Moden',
    upgradeCost: 20000,
    fatigueRecoveryBonus: 10,
    description: 'Peralatan terapi canggih (+10% pemulihan keletihan).',
  },
  {
    level: 3,
    name: 'Institut Perubatan Sukan Elit',
    upgradeCost: 40000,
    fatigueRecoveryBonus: 15,
    description: 'Pusat saintifik prestasi tinggi (+15% pemulihan keletihan).',
  },
];

export type FacilityType = 'stadium' | 'youthAcademy' | 'medical';

/**
 * Calculate gate receipts revenue for a match based on stadium level.
 * Away matches return 0 as gate receipts belong to host club.
 */
export function calculateGateReceipts(stadiumLevel: number, isHome: boolean): number {
  if (!isHome) return 0;
  const clampedLevel = Math.max(1, Math.min(5, Math.floor(stadiumLevel || 1)));
  const config = STADIUM_LEVELS.find((s) => s.level === clampedLevel) || STADIUM_LEVELS[0];
  return config.ticketRevenue;
}

/**
 * Returns the cost to upgrade a facility from its currentLevel to currentLevel + 1.
 * If currentLevel is already at maximum, returns null.
 */
export function upgradeCost(facility: FacilityType, currentLevel: number): number | null {
  const lvl = Math.floor(currentLevel || 0);

  switch (facility) {
    case 'stadium': {
      if (lvl >= 5) return null;
      const targetLevel = lvl < 1 ? 1 : lvl + 1;
      const cfg = STADIUM_LEVELS.find((s) => s.level === targetLevel);
      return cfg ? cfg.upgradeCost : null;
    }
    case 'youthAcademy': {
      if (lvl >= 3) return null;
      const targetLevel = lvl < 1 ? 1 : lvl + 1;
      const cfg = YOUTH_LEVELS.find((y) => y.level === targetLevel);
      return cfg ? cfg.upgradeCost : null;
    }
    case 'medical': {
      if (lvl >= 3) return null;
      const targetLevel = lvl < 1 ? 1 : lvl + 1;
      const cfg = MEDICAL_LEVELS.find((m) => m.level === targetLevel);
      return cfg ? cfg.upgradeCost : null;
    }
    default:
      return null;
  }
}

/**
 * Generates a young prodigy player (16-18 years old) from the club's Youth Academy.
 * Higher academy level yields higher initial rating and world-class potential.
 */
export function generateYouthProdigy(
  academyLevel: number = 1,
  seed?: number | PRNG
): Player {
  const prng =
    seed instanceof PRNG
      ? seed
      : createPRNG(seed ?? Math.floor(Math.random() * 1000000));

  const level = Math.max(1, Math.min(3, Math.floor(academyLevel || 1)));
  const age = prng.nextInt(16, 18);

  const positions: PlayerPosition[] = ['GK', 'DEF', 'MID', 'ATT'];
  const position = prng.pick(positions);

  const firstName = prng.pick(FIRST_NAMES);
  const lastName = prng.pick(LAST_NAMES);
  const name = `${firstName} ${lastName}`;

  // Base rating range by academy level
  // Level 1: 64 - 69 rating, Potential 78 - 84
  // Level 2: 69 - 74 rating, Potential 82 - 88
  // Level 3: 74 - 79 rating, Potential 86 - 94
  const minRating = 64 + (level - 1) * 5;
  const maxRating = minRating + 5;
  const targetRating = prng.nextInt(minRating, maxRating);

  const potentialBonus = prng.nextInt(10, 16);
  const potentialRating = Math.min(99, targetRating + potentialBonus);

  // Generate position-appropriate attributes around targetRating
  const jitter = () => prng.nextInt(-4, 4);
  const clamp = (val: number) => Math.max(25, Math.min(99, Math.round(val)));

  let attributes: PlayerAttributes;

  switch (position) {
    case 'GK':
      attributes = {
        goalkeeping: clamp(targetRating + 4 + jitter()),
        defense: clamp(targetRating - 10 + jitter()),
        passing: clamp(targetRating - 6 + jitter()),
        speed: clamp(targetRating - 8 + jitter()),
        stamina: clamp(targetRating + jitter()),
        attack: clamp(20 + jitter()),
      };
      break;
    case 'DEF':
      attributes = {
        defense: clamp(targetRating + 3 + jitter()),
        stamina: clamp(targetRating + 1 + jitter()),
        speed: clamp(targetRating - 2 + jitter()),
        passing: clamp(targetRating - 4 + jitter()),
        attack: clamp(targetRating - 14 + jitter()),
        goalkeeping: clamp(20 + jitter()),
      };
      break;
    case 'MID':
      attributes = {
        passing: clamp(targetRating + 3 + jitter()),
        stamina: clamp(targetRating + 1 + jitter()),
        attack: clamp(targetRating + jitter()),
        defense: clamp(targetRating - 2 + jitter()),
        speed: clamp(targetRating + jitter()),
        goalkeeping: clamp(20 + jitter()),
      };
      break;
    case 'ATT':
    default:
      attributes = {
        attack: clamp(targetRating + 4 + jitter()),
        speed: clamp(targetRating + 2 + jitter()),
        passing: clamp(targetRating - 2 + jitter()),
        stamina: clamp(targetRating + jitter()),
        defense: clamp(targetRating - 12 + jitter()),
        goalkeeping: clamp(20 + jitter()),
      };
      break;
  }

  const overallRating = calculateOverallRating(position, attributes);
  const marketValue = calculatePlayerMarketValue(overallRating);
  const id = `prodigy_${prng.nextInt(100000, 999999)}`;

  return {
    id,
    name,
    position,
    attributes,
    overallRating,
    fitness: 100,
    trainingXp: 0,
    marketValue,
    yellowCards: 0,
    redCards: 0,
    isSuspended: false,
    isYouthProduct: true,
    age,
    potentialRating,
  };
}
