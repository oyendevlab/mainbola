import { describe, it, expect } from 'vitest';
import { calculateMatchRatings } from '../ratings';
import { MatchEvent, Player } from '../../types';

describe('Player Match Ratings & MOTM Engine (ratings.ts)', () => {
  const homeStartingXI: Player[] = [
    {
      id: 'h_gk',
      name: 'Home Keeper',
      position: 'GK',
      overallRating: 75,
      attributes: { attack: 20, defense: 60, passing: 60, speed: 50, stamina: 70, goalkeeping: 80 },
    },
    {
      id: 'h_def',
      name: 'Home Defender',
      position: 'DEF',
      overallRating: 73,
      attributes: { attack: 30, defense: 75, passing: 60, speed: 65, stamina: 75, goalkeeping: 10 },
    },
    {
      id: 'h_att',
      name: 'Home Striker',
      position: 'ATT',
      overallRating: 78,
      attributes: { attack: 80, defense: 30, passing: 70, speed: 82, stamina: 75, goalkeeping: 10 },
    },
  ];

  const awayStartingXI: Player[] = [
    {
      id: 'a_gk',
      name: 'Away Keeper',
      position: 'GK',
      overallRating: 74,
      attributes: { attack: 20, defense: 60, passing: 60, speed: 50, stamina: 70, goalkeeping: 78 },
    },
    {
      id: 'a_att',
      name: 'Away Striker',
      position: 'ATT',
      overallRating: 76,
      attributes: { attack: 78, defense: 30, passing: 65, speed: 78, stamina: 75, goalkeeping: 10 },
    },
  ];

  it('calculates ratings between 5.0 and 10.0 for all players', () => {
    const events: MatchEvent[] = [];
    const result = calculateMatchRatings(events, homeStartingXI, awayStartingXI, 0, 0);

    expect(result.ratings).toBeDefined();
    for (const p of [...homeStartingXI, ...awayStartingXI]) {
      const rating = result.ratings[p.id];
      expect(rating).toBeGreaterThanOrEqual(5.0);
      expect(rating).toBeLessThanOrEqual(10.0);
    }
  });

  it('boosts goal scorer rating and crowns them MOTM', () => {
    const events: MatchEvent[] = [
      {
        id: 'ev1',
        minute: 25,
        type: 'GOAL',
        teamId: 'home',
        playerId: 'h_att',
        playerName: 'Home Striker',
        description: 'Goal scored by Home Striker!',
        homeScore: 1,
        awayScore: 0,
      },
    ];

    const result = calculateMatchRatings(events, homeStartingXI, awayStartingXI, 1, 0);

    expect(result.ratings['h_att']).toBeGreaterThan(7.0);
    expect(result.motmPlayerId).toBe('h_att');
    expect(result.motmPlayerName).toBe('Home Striker');
    expect(result.motmId).toBe('h_att');
    expect(result.motmName).toBe('Home Striker');
  });

  it('credits assists to secondary players on goals', () => {
    const events: MatchEvent[] = [
      {
        id: 'ev1',
        minute: 40,
        type: 'GOAL',
        teamId: 'home',
        playerId: 'h_att',
        playerName: 'Home Striker',
        secondaryPlayerId: 'h_def',
        secondaryPlayerName: 'Home Defender',
        description: 'Goal scored by Home Striker assisted by Home Defender!',
        homeScore: 1,
        awayScore: 0,
      },
    ];

    const resultWithAssist = calculateMatchRatings(events, homeStartingXI, awayStartingXI, 1, 0);
    const resultNoEvents = calculateMatchRatings([], homeStartingXI, awayStartingXI, 1, 0);

    expect(resultWithAssist.ratings['h_def']).toBeGreaterThan(resultNoEvents.ratings['h_def']);
  });

  it('penalizes red cards heavily', () => {
    const events: MatchEvent[] = [
      {
        id: 'ev_red',
        minute: 30,
        type: 'RED_CARD',
        teamId: 'away',
        playerId: 'a_att',
        playerName: 'Away Striker',
        description: 'Red card issued!',
        homeScore: 0,
        awayScore: 0,
      },
    ];

    const result = calculateMatchRatings(events, homeStartingXI, awayStartingXI, 0, 0);
    expect(result.ratings['a_att']).toBeLessThanOrEqual(5.5);
  });
});
