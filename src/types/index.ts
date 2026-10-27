export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface PlayerAttributes {
  attack: number;
  defense: number;
  passing: number;
  speed: number;
  stamina: number;
  goalkeeping: number;
}

export interface Player {
  id: string;
  name: string;
  position: PlayerPosition;
  attributes: PlayerAttributes;
  overallRating: number;
  fitness?: number; // 0 - 100%, defaults to 100
  trainingXp?: number; // Accumulated XP towards attribute improvements
  marketValue?: number; // Value in MainBola credits
  yellowCards?: number;
  redCards?: number;
  isSuspended?: boolean;
  isYouthProduct?: boolean;
  age?: number;
  potentialRating?: number;
  morale?: number; // 0 - 100%, defaults to 80
  matchRating?: number; // 1.0 - 10.0 in-match rating
}

export type FormationType = '4-3-3' | '4-4-2' | '4-2-3-1';

export type TacticalStyle = 'Attacking' | 'Balanced' | 'Defensive';

export interface FormationSlot {
  id: string;
  role: PlayerPosition;
  label: string;
  x: number; // Percentage 0 - 100 on pitch width
  y: number; // Percentage 0 - 100 on pitch height (defenders low, attackers high)
}

export interface ClubFacilities {
  stadiumLevel: number; // 1-5
  youthAcademyLevel: number; // 1-3
  medicalLevel: number; // 1-3
}

export type SponsorTier = 'Bronze' | 'Silver' | 'Gold';

export interface SponsorDeal {
  id: string;
  name: string;
  tier: SponsorTier;
  upfrontBonus: number;
  winBonus: number;
  cleanSheetBonus: number;
  active: boolean;
  description?: string;
}

export interface ClubStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface Club {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  badgeId: string;
  squad: Player[];
  formation: FormationType;
  startingXI: string[]; // 11 Player IDs
  tactics: TacticalStyle;
  stats: ClubStats;
  budget: number; // Club finances in MainBola Credits (default 50000)
  createdAt: number;
  facilities?: ClubFacilities;
  activeSponsorId?: string | null;
  awayPrimaryColor?: string;
  awaySecondaryColor?: string;
  kitPattern?: 'solid' | 'stripes' | 'hoops' | 'half';
  pvpRating?: number; // Elo rating, default 1200
  pvpRecord?: { won: number; drawn: number; lost: number };
}

// Match Simulation Event Timeline
export type MatchEventType =
  | 'KICKOFF'
  | 'PASS'
  | 'TACKLE'
  | 'INTERCEPTION'
  | 'SHOT'
  | 'SAVE'
  | 'GOAL'
  | 'TURNOVER'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'HALFTIME'
  | 'FULLTIME';

export interface MatchEvent {
  id: string;
  minute: number;
  second?: number;
  type: MatchEventType;
  teamId: string;
  playerId?: string;
  playerName?: string;
  secondaryPlayerId?: string;
  secondaryPlayerName?: string;
  description: string;
  homeScore: number;
  awayScore: number;
  // Spatial coordinates for top-down 2D rendering (normalized 0..100)
  fromCoords?: { x: number; y: number };
  toCoords?: { x: number; y: number };
}

export interface TeamMatchStats {
  shots: number;
  shotsOnTarget: number;
  possession: number; // percentage (e.g. 52)
  passes: number;
  tackles: number;
  saves: number;
}

export interface ClubSnapshot {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  awayPrimaryColor?: string;
  awaySecondaryColor?: string;
  kitPattern?: 'solid' | 'stripes' | 'hoops' | 'half';
  badgeId: string;
  formation: FormationType;
  tactics: TacticalStyle;
  startingXI: Player[];
}

export interface MatchResult {
  id: string;
  seed: number;
  timestamp: number;
  homeClub: ClubSnapshot;
  awayClub: ClubSnapshot;
  homeScore: number;
  awayScore: number;
  homeStats: TeamMatchStats;
  awayStats: TeamMatchStats;
  events: MatchEvent[];
  weather?: 'Sunny' | 'Rainy' | 'Night';
  motmPlayerId?: string;
  motmPlayerName?: string;
  playerRatings?: Record<string, number>;
}

export interface ManagerProfile {
  name: string;
  experienceLevel: number;
  soundEnabled: boolean;
  replaySpeed: 1 | 2 | 4;
}

// Player Progression & Training
export type TrainingDrillType = 'ATTACKING' | 'DEFENDING' | 'PLAYMAKING' | 'GOALKEEPING' | 'PHYSIO';

export interface DrillConfig {
  id: TrainingDrillType;
  name: string;
  cost: number;
  description: string;
  primaryAttr: keyof PlayerAttributes;
  secondaryAttr?: keyof PlayerAttributes;
  suitablePositions: PlayerPosition[];
}

export interface TrainingResult {
  playerId: string;
  playerName: string;
  drillType: TrainingDrillType;
  cost: number;
  statGains: Partial<PlayerAttributes>;
  newRating: number;
  newFitness?: number;
}

// Transfer Market & Scouting
export interface TransferTarget {
  id: string;
  player: Player;
  fee: number;
  scoutReport: string;
  age: number;
  potentialRating: number;
}

// Trophy Cabinet & Achievements
export interface Trophy {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt?: number;
}

export * from './league';
export * from './cup';
export * from './pvp';

