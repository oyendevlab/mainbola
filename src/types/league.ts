import { ClubSnapshot, MatchResult } from './index';

export type FixtureStatus = 'scheduled' | 'submitted' | 'played';

export interface LeagueFixture {
  id: string;
  round: number;
  homeClubId: string;
  awayClubId: string;
  homeClubName: string;
  awayClubName: string;
  status: FixtureStatus;
  userTacticsSubmitted: boolean;
  result?: MatchResult;
  seed: number;
}

export interface LeagueStanding {
  clubId: string;
  clubName: string;
  primaryColor: string;
  secondaryColor: string;
  badgeId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface TopScorer {
  playerId: string;
  playerName: string;
  clubName: string;
  goals: number;
}

export interface League {
  id: string;
  name: string;
  code: string; // 6-character invitation code (e.g. RUSH-88)
  creatorClubId: string;
  season: number;
  status: 'active' | 'completed';
  currentRound: number;
  totalRounds: number;
  teams: ClubSnapshot[];
  fixtures: LeagueFixture[];
  standings: LeagueStanding[];
  topScorers: TopScorer[];
  createdAt: number;
}
