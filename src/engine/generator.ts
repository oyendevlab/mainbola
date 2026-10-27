import {
  Club,
  ClubSnapshot,
  FormationType,
  Player,
  PlayerAttributes,
  PlayerPosition,
  TacticalStyle,
} from '../types';
import { FORMATION_CONFIGS, validateSquadSelection } from '../types/formations';
import { PRNG, createPRNG } from './prng';

export const FIRST_NAMES = [
  'Alex', 'Marco', 'Lucas', 'Mateo', 'Liam', 'Leo', 'Kai', 'Carlos', 'David', 'Gabriel',
  'Julian', 'Noah', 'Rafael', 'Ethan', 'Hugo', 'Diego', 'Milan', 'Marcus', 'Sora', 'Kenji',
  'Amir', 'Tariq', 'Felix', 'Oscar', 'Daniel', 'Oliver', 'Samuel', 'Arthur', 'Victor', 'Nico',
  'Benoit', 'Antoine', 'Lorenzo', 'Javier', 'Thiago', 'Bastian', 'Zack', 'Kofi', 'Hassan', 'Jin',
  'Rizky', 'Pratama', 'Egy', 'Marselino', 'Asnawi', 'Witan', 'Ernando', 'Sandy', 'Justin', 'Jay'
];

export const LAST_NAMES = [
  'Silva', 'Santos', 'Morales', 'Vance', 'Schmidt', 'Dubois', 'Moreau', 'Rossi', 'Ferrari', 'Chen',
  'Takahashi', 'Tanaka', 'Diallo', 'Mendoza', 'Romero', 'Kowalski', 'Novak', 'Hernandez', 'Gomez', 'Reyes',
  'Alvarez', 'Larsson', 'Lindberg', 'Fischer', 'Weber', 'Becker', 'O\'Connor', 'Walsh', 'Davies', 'Evans',
  'Sterling', 'Sinclair', 'Blackwood', 'Mercer', 'Kim', 'Park', 'Bellerose', 'Fontaine', 'Costa', 'Torres',
  'Ridho', 'Arhan', 'Vikri', 'Ferdinan', 'Mangkualam', 'Sulaeman', 'Hubner', 'Amat', 'Klok', 'Idzes'
];

export interface PresetClubConfig {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  badgeId: string;
  formation: FormationType;
  tactics: TacticalStyle;
  baseRating?: number;
}

export const PRESET_AI_CLUBS: PresetClubConfig[] = [
  {
    name: 'Thunderbolt FC',
    primaryColor: '#E11D48',
    secondaryColor: '#FFE4E6',
    badgeId: 'badge-1',
    formation: '4-3-3',
    tactics: 'Attacking',
    baseRating: 75,
  },
  {
    name: 'Metro United',
    primaryColor: '#2563EB',
    secondaryColor: '#DBEAFE',
    badgeId: 'badge-2',
    formation: '4-4-2',
    tactics: 'Balanced',
    baseRating: 74,
  },
  {
    name: 'Starlight Rovers',
    primaryColor: '#7C3AED',
    secondaryColor: '#EDE9FE',
    badgeId: 'badge-3',
    formation: '4-2-3-1',
    tactics: 'Defensive',
    baseRating: 73,
  },
  {
    name: 'Apex Athletic',
    primaryColor: '#059669',
    secondaryColor: '#D1FAE5',
    badgeId: 'badge-4',
    formation: '4-3-3',
    tactics: 'Balanced',
    baseRating: 75,
  },
  {
    name: 'Ironclad FC',
    primaryColor: '#D97706',
    secondaryColor: '#FEF3C7',
    badgeId: 'badge-5',
    formation: '4-4-2',
    tactics: 'Defensive',
    baseRating: 72,
  },
  {
    name: 'Solar Flare SC',
    primaryColor: '#DC2626',
    secondaryColor: '#FEE2E2',
    badgeId: 'badge-6',
    formation: '4-2-3-1',
    tactics: 'Attacking',
    baseRating: 76,
  },
  {
    name: 'Neon City FC',
    primaryColor: '#0284C7',
    secondaryColor: '#E0F2FE',
    badgeId: 'badge-7',
    formation: '4-3-3',
    tactics: 'Attacking',
    baseRating: 74,
  },
  {
    name: 'Shadow Valley',
    primaryColor: '#475569',
    secondaryColor: '#F1F5F9',
    badgeId: 'badge-8',
    formation: '4-4-2',
    tactics: 'Defensive',
    baseRating: 72,
  },
];

/**
 * Calculates a position-weighted overall rating (1-100).
 * Supports both signatures: (position, attrs) and (attrs, position).
 */
export function calculateOverallRating(
  posOrAttrs: PlayerPosition | PlayerAttributes,
  attrsOrPos: PlayerAttributes | PlayerPosition
): number {
  let position: PlayerPosition;
  let attrs: PlayerAttributes;

  if (typeof posOrAttrs === 'string') {
    position = posOrAttrs as PlayerPosition;
    attrs = attrsOrPos as PlayerAttributes;
  } else {
    attrs = posOrAttrs as PlayerAttributes;
    position = attrsOrPos as PlayerPosition;
  }

  let rating = 50;
  switch (position) {
    case 'GK':
      rating =
        attrs.goalkeeping * 0.70 +
        attrs.defense * 0.10 +
        attrs.passing * 0.08 +
        attrs.speed * 0.06 +
        attrs.stamina * 0.06;
      break;

    case 'DEF':
      rating =
        attrs.defense * 0.45 +
        attrs.stamina * 0.20 +
        attrs.speed * 0.15 +
        attrs.passing * 0.12 +
        attrs.attack * 0.08;
      break;

    case 'MID':
      rating =
        attrs.passing * 0.35 +
        attrs.stamina * 0.20 +
        attrs.attack * 0.18 +
        attrs.defense * 0.15 +
        attrs.speed * 0.12;
      break;

    case 'ATT':
      rating =
        attrs.attack * 0.45 +
        attrs.speed * 0.22 +
        attrs.passing * 0.15 +
        attrs.stamina * 0.12 +
        attrs.defense * 0.06;
      break;
  }

  return Math.min(100, Math.max(1, Math.round(rating)));
}

export interface GeneratePlayerOptions {
  id?: string;
  name?: string;
  baseLevel?: number;
  prng?: PRNG;
}

export function calculatePlayerMarketValue(overallRating: number): number {
  const scaled = Math.pow(overallRating / 10, 3.4) * 55;
  return Math.round(Math.max(2500, scaled) / 250) * 250;
}

/**
 * Generates a single player with position-appropriate attributes (all 1..100).
 */
export function generatePlayer(
  position: PlayerPosition,
  optionsOrPrng?: GeneratePlayerOptions | PRNG,
  targetRatingArg?: number,
  idPrefix = 'ply'
): Player {
  let prng: PRNG | undefined;
  let options: GeneratePlayerOptions = {};

  if (optionsOrPrng instanceof PRNG) {
    prng = optionsOrPrng;
    if (targetRatingArg !== undefined) {
      options.baseLevel = targetRatingArg;
    }
  } else if (optionsOrPrng) {
    options = optionsOrPrng;
    prng = options.prng;
  }

  const randInt = (min: number, max: number) =>
    prng ? prng.nextInt(min, max) : Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = <T>(arr: readonly T[]): T =>
    prng ? prng.pick(arr) : arr[Math.floor(Math.random() * arr.length)];
  const clamp = (val: number) => Math.max(1, Math.min(100, Math.round(val)));

  const base = options.baseLevel ?? randInt(66, 76);
  const jitter = () => randInt(-5, 5);

  let attributes: PlayerAttributes;

  switch (position) {
    case 'GK':
      attributes = {
        attack: clamp(randInt(15, 35)),
        defense: clamp(base - 10 + jitter()),
        passing: clamp(base - 8 + jitter()),
        speed: clamp(base - 10 + jitter()),
        stamina: clamp(base - 4 + jitter()),
        goalkeeping: clamp(base + 8 + jitter()),
      };
      break;

    case 'DEF':
      attributes = {
        attack: clamp(base - 18 + jitter()),
        defense: clamp(base + 8 + jitter()),
        passing: clamp(base - 2 + jitter()),
        speed: clamp(base + jitter()),
        stamina: clamp(base + 4 + jitter()),
        goalkeeping: clamp(randInt(8, 22)),
      };
      break;

    case 'MID':
      attributes = {
        attack: clamp(base + jitter()),
        defense: clamp(base - 2 + jitter()),
        passing: clamp(base + 8 + jitter()),
        speed: clamp(base + jitter()),
        stamina: clamp(base + 6 + jitter()),
        goalkeeping: clamp(randInt(8, 20)),
      };
      break;

    case 'ATT':
      attributes = {
        attack: clamp(base + 10 + jitter()),
        defense: clamp(base - 25 + jitter()),
        passing: clamp(base + jitter()),
        speed: clamp(base + 7 + jitter()),
        stamina: clamp(base + jitter()),
        goalkeeping: clamp(randInt(5, 18)),
      };
      break;
  }

  const overallRating = calculateOverallRating(position, attributes);
  const name = options.name ?? `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const id = options.id ?? `${idPrefix}_${randInt(10000, 99999)}_${randInt(1000, 9999)}`;

  return {
    id,
    name,
    position,
    attributes,
    overallRating,
    fitness: 100,
    trainingXp: 0,
    marketValue: calculatePlayerMarketValue(overallRating),
    morale: 80,
  };
}

/**
 * Generates a standard squad of 15 players:
 * - 2 GK
 * - 5 DEF
 * - 5 MID
 * - 3 ATT
 */
export function generateSquad(prngOrTarget?: PRNG | number, maybeTarget?: number): Player[] {
  let prng: PRNG | undefined;
  let targetRating: number | undefined;

  if (prngOrTarget instanceof PRNG) {
    prng = prngOrTarget;
    targetRating = maybeTarget;
  } else if (typeof prngOrTarget === 'number') {
    targetRating = prngOrTarget;
  }

  const squad: Player[] = [];
  const roles: { position: PlayerPosition; count: number }[] = [
    { position: 'GK', count: 2 },
    { position: 'DEF', count: 5 },
    { position: 'MID', count: 5 },
    { position: 'ATT', count: 3 },
  ];

  let idCounter = 1;
  for (const { position, count } of roles) {
    for (let i = 0; i < count; i++) {
      squad.push(
        generatePlayer(position, {
          id: `player_${position.toLowerCase()}_${idCounter++}`,
          baseLevel: targetRating,
          prng,
        })
      );
    }
  }

  return squad;
}

/**
 * Automatically select the 11 starting players based on formation slots.
 * Picks the highest overall-rated player for each required position slot.
 */
export function autoSelectStartingXI(squad: Player[], formation: FormationType = '4-3-3'): string[] {
  const slots = FORMATION_CONFIGS[formation];
  if (!slots) {
    throw new Error(`Unknown formation: ${formation}`);
  }

  const needed: Record<PlayerPosition, number> = {
    GK: slots.filter((s) => s.role === 'GK').length,
    DEF: slots.filter((s) => s.role === 'DEF').length,
    MID: slots.filter((s) => s.role === 'MID').length,
    ATT: slots.filter((s) => s.role === 'ATT').length,
  };

  const selectedIds: string[] = [];
  const selectedSet = new Set<string>();

  const pickTopPlayers = (pos: PlayerPosition, count: number) => {
    const available = squad
      .filter((p) => p.position === pos && !selectedSet.has(p.id))
      .sort((a, b) => b.overallRating - a.overallRating);

    for (let i = 0; i < count && i < available.length; i++) {
      selectedIds.push(available[i].id);
      selectedSet.add(available[i].id);
    }
  };

  pickTopPlayers('GK', needed.GK);
  pickTopPlayers('DEF', needed.DEF);
  pickTopPlayers('MID', needed.MID);
  pickTopPlayers('ATT', needed.ATT);

  if (selectedIds.length < 11) {
    const remaining = squad
      .filter((p) => !selectedSet.has(p.id) && (selectedSet.size === 0 || p.position !== 'GK'))
      .sort((a, b) => b.overallRating - a.overallRating);

    for (const player of remaining) {
      if (selectedIds.length >= 11) break;
      selectedIds.push(player.id);
      selectedSet.add(player.id);
    }
  }

  const validation = validateSquadSelection(squad, selectedIds, formation);
  if (!validation.valid) {
    throw new Error(`Starting XI selection invalid: ${validation.errors.join(', ')}`);
  }

  return selectedIds;
}

export const selectStartingXI = autoSelectStartingXI;

/**
 * Converts a Club into a ClubSnapshot for match simulation.
 */
export function createClubSnapshot(club: Club): ClubSnapshot {
  const squadMap = new Map(club.squad.map((p) => [p.id, p]));
  const startingXI: Player[] = [];

  for (const id of club.startingXI) {
    const player = squadMap.get(id);
    if (player) {
      startingXI.push(player);
    }
  }

  return {
    id: club.id,
    name: club.name,
    primaryColor: club.primaryColor,
    secondaryColor: club.secondaryColor,
    awayPrimaryColor: club.awayPrimaryColor ?? '#FFFFFF',
    awaySecondaryColor: club.awaySecondaryColor ?? club.primaryColor,
    kitPattern: club.kitPattern ?? 'solid',
    badgeId: club.badgeId,
    formation: club.formation,
    tactics: club.tactics,
    startingXI,
  };
}

export interface GenerateClubOptions {
  id?: string;
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  badgeId?: string;
  formation?: FormationType;
  tactics?: TacticalStyle;
  targetRating?: number;
  seed?: number;
}

/**
 * Generates a complete Club with 15 players and a valid starting XI.
 * Supports both options object and legacy positional parameters.
 */
export function generateClub(
  nameOrOptions?: string | GenerateClubOptions,
  primaryColor?: string,
  secondaryColor?: string,
  badgeId?: string,
  formation: FormationType = '4-3-3',
  tactics: TacticalStyle = 'Balanced',
  seed?: number
): Club {
  let opts: GenerateClubOptions = {};

  if (typeof nameOrOptions === 'object' && nameOrOptions !== null) {
    opts = nameOrOptions;
  } else if (typeof nameOrOptions === 'string') {
    opts = {
      name: nameOrOptions,
      primaryColor,
      secondaryColor,
      badgeId,
      formation,
      tactics,
      seed,
    };
  }

  const actualSeed = opts.seed ?? Math.floor(Math.random() * 1000000);
  const prng = createPRNG(actualSeed);

  const preset = opts.name
    ? PRESET_AI_CLUBS.find((p) => p.name === opts.name)
    : undefined;

  const name = opts.name || preset?.name || `Club ${prng.nextInt(100, 999)}`;
  const form: FormationType =
    opts.formation || preset?.formation || prng.pick(['4-3-3', '4-4-2', '4-2-3-1']);
  const tac: TacticalStyle =
    opts.tactics || preset?.tactics || prng.pick(['Attacking', 'Balanced', 'Defensive']);
  const priColor = opts.primaryColor || preset?.primaryColor || '#2563EB';
  const secColor = opts.secondaryColor || preset?.secondaryColor || '#DBEAFE';
  const badge = opts.badgeId || preset?.badgeId || 'badge-default';
  const targetRating = opts.targetRating || preset?.baseRating || prng.nextInt(70, 78);

  const squad = generateSquad(prng, targetRating);
  const startingXI = autoSelectStartingXI(squad, form);

  return {
    id: opts.id || `club_${name.toLowerCase().replace(/\s+/g, '_')}_${actualSeed}`,
    name,
    primaryColor: priColor,
    secondaryColor: secColor,
    badgeId: badge,
    squad,
    formation: form,
    startingXI,
    tactics: tac,
    stats: {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    },
    budget: 50000,
    createdAt: 1700000000000 + (actualSeed % 10000000),
    awayPrimaryColor: '#FFFFFF',
    awaySecondaryColor: priColor,
    kitPattern: 'solid',
    pvpRating: 1200,
    pvpRecord: { won: 0, drawn: 0, lost: 0 },
  };
}

/**
 * Generates AI opponent clubs using preset templates and deterministic PRNG.
 */
export function generateAIOpponents(count = 8, baseSeed = 42): Club[] {
  const clubs: Club[] = [];
  const totalPresets = PRESET_AI_CLUBS.length;

  for (let i = 0; i < count; i++) {
    const preset = PRESET_AI_CLUBS[i % totalPresets];
    const seed = (baseSeed * 10007 + i * 3571) >>> 0;
    const club = generateClub({
      id: `ai_club_${i + 1}`,
      name: i < totalPresets ? preset.name : `${preset.name} ${i + 1}`,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      badgeId: preset.badgeId,
      formation: preset.formation,
      tactics: preset.tactics,
      targetRating: preset.baseRating,
      seed,
    });
    clubs.push(club);
  }

  return clubs;
}
