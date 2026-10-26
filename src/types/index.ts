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
  createdAt: number;
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
}

export interface ManagerProfile {
  name: string;
  experienceLevel: number;
  soundEnabled: boolean;
  replaySpeed: 1 | 2 | 4;
}
