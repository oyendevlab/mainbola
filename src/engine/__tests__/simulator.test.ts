import { describe, expect, it } from 'vitest';
import { simulateMatch } from '../simulator';
import { createClubSnapshot, generateClub } from '../generator';

describe('Match Simulator Engine', () => {
  const homeClub = generateClub({
    name: 'Thunderbolt FC',
    formation: '4-3-3',
    tactics: 'Attacking',
    seed: 1001,
  });

  const awayClub = generateClub({
    name: 'Metro United',
    formation: '4-4-2',
    tactics: 'Balanced',
    seed: 2002,
  });

  const homeSnapshot = createClubSnapshot(homeClub);
  const awaySnapshot = createClubSnapshot(awayClub);

  it('is strictly deterministic: identical clubs and seed produce IDENTICAL results', () => {
    const seed = 54321;
    const match1 = simulateMatch(homeSnapshot, awaySnapshot, seed);
    const match2 = simulateMatch(homeSnapshot, awaySnapshot, seed);

    expect(match1.homeScore).toBe(match2.homeScore);
    expect(match1.awayScore).toBe(match2.awayScore);
    expect(match1.homeStats).toEqual(match2.homeStats);
    expect(match1.awayStats).toEqual(match2.awayStats);
    expect(match1.events.length).toBe(match2.events.length);
    expect(match1.events).toEqual(match2.events);
  });

  it('produces different match outcomes across different seeds', () => {
    const matchA = simulateMatch(homeSnapshot, awaySnapshot, 1111);
    const matchB = simulateMatch(homeSnapshot, awaySnapshot, 9999);

    // Event timelines should differ across seeds
    expect(matchA.events).not.toEqual(matchB.events);
  });

  it('accepts both Club and ClubSnapshot objects directly', () => {
    const matchFromClubs = simulateMatch(homeClub, awayClub, 12345);
    const matchFromSnapshots = simulateMatch(homeSnapshot, awaySnapshot, 12345);

    expect(matchFromClubs.homeScore).toBe(matchFromSnapshots.homeScore);
    expect(matchFromClubs.awayScore).toBe(matchFromSnapshots.awayScore);
    expect(matchFromClubs.events).toEqual(matchFromSnapshots.events);
  });

  it('maintains strict chronological ordering of events from minute 0 to 90+', () => {
    const match = simulateMatch(homeSnapshot, awaySnapshot, 7777);

    expect(match.events.length).toBeGreaterThan(15);

    // First event is KICKOFF at minute 0
    expect(match.events[0].type).toBe('KICKOFF');
    expect(match.events[0].minute).toBe(0);

    // Last event is FULLTIME
    const lastEvent = match.events[match.events.length - 1];
    expect(lastEvent.type).toBe('FULLTIME');
    expect(lastEvent.minute).toBeGreaterThanOrEqual(90);

    // Verify chronological ordering across entire event stream
    for (let i = 1; i < match.events.length; i++) {
      const prev = match.events[i - 1];
      const curr = match.events[i];
      const prevTotalSec = prev.minute * 60 + (prev.second ?? 0);
      const currTotalSec = curr.minute * 60 + (curr.second ?? 0);

      expect(currTotalSec).toBeGreaterThanOrEqual(prevTotalSec);
    }
  });

  it('includes key milestones (KICKOFF, HALFTIME, FULLTIME)', () => {
    const match = simulateMatch(homeSnapshot, awaySnapshot, 8888);

    const eventTypes = match.events.map((e) => e.type);
    expect(eventTypes).toContain('KICKOFF');
    expect(eventTypes).toContain('HALFTIME');
    expect(eventTypes).toContain('FULLTIME');
  });

  it('CRITICAL: Goal events strictly equal final match scores', () => {
    // Run across multiple random seeds to thoroughly verify
    const testSeeds = [12, 101, 555, 1337, 2024, 7777, 99999];

    for (const seed of testSeeds) {
      const match = simulateMatch(homeSnapshot, awaySnapshot, seed);

      const homeGoals = match.events.filter(
        (e) => e.type === 'GOAL' && e.teamId === homeSnapshot.id
      ).length;

      const awayGoals = match.events.filter(
        (e) => e.type === 'GOAL' && e.teamId === awaySnapshot.id
      ).length;

      expect(homeGoals).toBe(match.homeScore);
      expect(awayGoals).toBe(match.awayScore);

      // Verify running score updates on each goal event
      let runningHome = 0;
      let runningAway = 0;

      for (const event of match.events) {
        if (event.type === 'GOAL') {
          if (event.teamId === homeSnapshot.id) runningHome++;
          if (event.teamId === awaySnapshot.id) runningAway++;
        }
        expect(event.homeScore).toBe(runningHome);
        expect(event.awayScore).toBe(runningAway);
      }
    }
  });

  describe('Match Statistics Consistency', () => {
    it('possession strictly totals 100%', () => {
      const testSeeds = [42, 88, 300, 456, 789];

      for (const seed of testSeeds) {
        const match = simulateMatch(homeSnapshot, awaySnapshot, seed);
        const totalPossession = match.homeStats.possession + match.awayStats.possession;
        expect(totalPossession).toBe(100);
      }
    });

    it('shots on target is always <= total shots', () => {
      const testSeeds = [1, 2, 3, 4, 5, 50, 100, 500];

      for (const seed of testSeeds) {
        const match = simulateMatch(homeSnapshot, awaySnapshot, seed);

        expect(match.homeStats.shotsOnTarget).toBeLessThanOrEqual(match.homeStats.shots);
        expect(match.awayStats.shotsOnTarget).toBeLessThanOrEqual(match.awayStats.shots);

        // Saves + opponent goals should equal opponent shots on target
        expect(match.homeScore + match.awayStats.saves).toBe(match.homeStats.shotsOnTarget);
        expect(match.awayScore + match.homeStats.saves).toBe(match.awayStats.shotsOnTarget);
      }
    });

    it('counts passes, tackles, and saves consistently', () => {
      const match = simulateMatch(homeSnapshot, awaySnapshot, 4321);

      expect(match.homeStats.passes).toBeGreaterThan(0);
      expect(match.awayStats.passes).toBeGreaterThan(0);
      expect(match.homeStats.tackles).toBeGreaterThanOrEqual(0);
      expect(match.awayStats.tackles).toBeGreaterThanOrEqual(0);
      expect(match.homeStats.saves).toBeGreaterThanOrEqual(0);
      expect(match.awayStats.saves).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Pitch Spatial Coordinates', () => {
    it('provides normalized coordinates [0, 100] for 2D visual rendering', () => {
      const match = simulateMatch(homeSnapshot, awaySnapshot, 9988);

      for (const event of match.events) {
        if (event.fromCoords) {
          expect(event.fromCoords.x).toBeGreaterThanOrEqual(0);
          expect(event.fromCoords.x).toBeLessThanOrEqual(100);
          expect(event.fromCoords.y).toBeGreaterThanOrEqual(0);
          expect(event.fromCoords.y).toBeLessThanOrEqual(100);
        }

        if (event.toCoords) {
          expect(event.toCoords.x).toBeGreaterThanOrEqual(0);
          expect(event.toCoords.x).toBeLessThanOrEqual(100);
          expect(event.toCoords.y).toBeGreaterThanOrEqual(0);
          expect(event.toCoords.y).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  describe('Tactical Influences', () => {
    it('attacking tactics yield higher shot attempts than defensive tactics on average', () => {
      const attackingClub = generateClub({
        name: 'Attacking FC',
        formation: '4-3-3',
        tactics: 'Attacking',
        seed: 100,
      });

      const defensiveClub = generateClub({
        name: 'Defensive FC',
        formation: '4-4-2',
        tactics: 'Defensive',
        seed: 200,
      });

      let attackingShotsTotal = 0;
      let defensiveShotsTotal = 0;
      const rounds = 20;

      for (let i = 0; i < rounds; i++) {
        const seed = 5000 + i;
        const match = simulateMatch(attackingClub, defensiveClub, seed);
        attackingShotsTotal += match.homeStats.shots;
        defensiveShotsTotal += match.awayStats.shots;
      }

      // Attacking team should generate significantly more shot attempts than defensive team
      expect(attackingShotsTotal).toBeGreaterThan(defensiveShotsTotal);
    });
  });
});
