import { ClubSnapshot } from './index';

export type PvPRank = 'Amatur' | 'Semi-Pro' | 'Profesional' | 'Elit';

export interface PvPRankInfo {
  title: PvPRank;
  minRating: number;
  badge: string;
}

export interface ChallengePayload {
  version: string;
  club: ClubSnapshot;
  timestamp: number;
}

export interface PvPMatchRecord {
  id: string;
  opponentName: string;
  opponentRating: number;
  userScore: number;
  oppScore: number;
  eloChange: number;
  timestamp: number;
}
