import { ClubSnapshot, MatchResult } from './index';

export type CupRoundName = 'Quarter' | 'Semi' | 'Final';

export interface CupMatch {
  id: string;
  round: CupRoundName;
  roundIndex: number; // 0: Quarter, 1: Semi, 2: Final
  matchIndex: number;
  homeClub: ClubSnapshot;
  awayClub: ClubSnapshot;
  result?: MatchResult;
  winnerId?: string;
  homePenalties?: number;
  awayPenalties?: number;
  isCompleted: boolean;
  seed: number;
}

export interface KnockoutCup {
  id: string;
  name: string;
  season: number;
  status: 'active' | 'completed';
  currentRound: CupRoundName;
  currentRoundIndex: number; // 0, 1, 2
  teams: ClubSnapshot[];
  matches: CupMatch[];
  winnerClubId?: string;
  winnerClubName?: string;
  prizeClaimed?: boolean;
  createdAt: number;
}
