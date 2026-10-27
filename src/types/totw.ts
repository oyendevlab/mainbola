import { PlayerPosition } from './index';

export interface TOTWPlayer {
  id: string;
  name: string;
  clubName: string;
  clubBadgeId: string;
  position: PlayerPosition;
  overallRating: number;
  matchRating: number;
  goals: number;
  assists: number;
  isUserPlayer: boolean;
}

export interface TeamOfTheWeek {
  round: number;
  weekNumber: number;
  players: TOTWPlayer[];
  formation: '4-3-3';
  createdAt: number;
}
