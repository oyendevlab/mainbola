import { describe, it, expect } from 'vitest';
import {
  generateRoundRobinFixtures,
  calculateLeagueStandings,
  calculateTopScorers,
  simulateLeagueRound,
  generateInviteCode,
} from '../league';
import { generateClub, createClubSnapshot } from '../generator';
import { ClubSnapshot } from '../../types';
import { League } from '../../types/league';

describe('League Engine & Competition', () => {
  const teamA: ClubSnapshot = createClubSnapshot(
    generateClub('Team Alpha', '#10B981', '#0F172A', 'shield', '4-3-3', 'Balanced', 101)
  );
  const teamB: ClubSnapshot = createClubSnapshot(
    generateClub('Team Beta', '#EF4444', '#FFFFFF', 'circle', '4-4-2', 'Attacking', 102)
  );
  const teamC: ClubSnapshot = createClubSnapshot(
    generateClub('Team Gamma', '#3B82F6', '#F59E0B', 'star', '4-2-3-1', 'Defensive', 103)
  );
  const teamD: ClubSnapshot = createClubSnapshot(
    generateClub('Team Delta', '#8B5CF6', '#FBBF24', 'phoenix', '4-3-3', 'Balanced', 104)
  );

  const fourTeams = [teamA, teamB, teamC, teamD];

  it('generates invite code with valid prefix and number', () => {
    const code = generateInviteCode(12345);
    expect(code).toMatch(/^[A-Z]+-\d{2}$/);
  });

  it('generates correct round-robin fixtures for 4 teams', () => {
    const fixtures = generateRoundRobinFixtures(fourTeams, 42);

    // 4 teams = 4 * 3 / 2 = 6 fixtures across 3 rounds
    expect(fixtures).toHaveLength(6);

    const round1 = fixtures.filter((f) => f.round === 1);
    const round2 = fixtures.filter((f) => f.round === 2);
    const round3 = fixtures.filter((f) => f.round === 3);

    expect(round1).toHaveLength(2);
    expect(round2).toHaveLength(2);
    expect(round3).toHaveLength(2);

    // Verify all pairs meet exactly once
    const pairs = new Set<string>();
    for (const f of fixtures) {
      const pair = [f.homeClubId, f.awayClubId].sort().join('_vs_');
      expect(pairs.has(pair)).toBe(false);
      pairs.add(pair);
    }
    expect(pairs.size).toBe(6);
  });

  it('calculates initial zeroed standings correctly', () => {
    const fixtures = generateRoundRobinFixtures(fourTeams, 42);
    const standings = calculateLeagueStandings(fourTeams, fixtures);

    expect(standings).toHaveLength(4);
    for (const row of standings) {
      expect(row.played).toBe(0);
      expect(row.points).toBe(0);
      expect(row.goalsFor).toBe(0);
      expect(row.goalsAgainst).toBe(0);
      expect(row.goalDifference).toBe(0);
      expect(row.form).toHaveLength(0);
    }
  });

  it('simulates round 1 and updates standings & points accurately', () => {
    const fixtures = generateRoundRobinFixtures(fourTeams, 777);
    const initialStandings = calculateLeagueStandings(fourTeams, fixtures);

    const league: League = {
      id: 'league_test_1',
      name: 'Premier Cup',
      code: 'RUSH-99',
      creatorClubId: teamA.id,
      season: 1,
      status: 'active',
      currentRound: 1,
      totalRounds: 3,
      teams: fourTeams,
      fixtures,
      standings: initialStandings,
      topScorers: [],
      createdAt: Date.now(),
    };

    const { updatedLeague, playedResults } = simulateLeagueRound(league, 1);

    expect(playedResults).toHaveLength(2);
    expect(updatedLeague.currentRound).toBe(2);

    const playedR1Fixtures = updatedLeague.fixtures.filter((f) => f.round === 1);
    expect(playedR1Fixtures.every((f) => f.status === 'played')).toBe(true);

    // Check standings points
    const playedStandings = updatedLeague.standings;
    const totalPoints = playedStandings.reduce((sum, s) => sum + s.points, 0);
    // 2 matches: each produces either 3+0=3 pts (decisive) or 1+1=2 pts (draw)
    expect(totalPoints).toBeGreaterThanOrEqual(4);
    expect(totalPoints).toBeLessThanOrEqual(6);

    // Points ordering check
    for (let i = 0; i < playedStandings.length - 1; i++) {
      expect(playedStandings[i].points).toBeGreaterThanOrEqual(playedStandings[i + 1].points);
    }
  });

  it('completes all rounds to mark league status as completed and ranks top scorers', () => {
    const fixtures = generateRoundRobinFixtures(fourTeams, 999);
    let league: League = {
      id: 'league_full',
      name: 'Champions League',
      code: 'ACE-10',
      creatorClubId: teamA.id,
      season: 1,
      status: 'active',
      currentRound: 1,
      totalRounds: 3,
      teams: fourTeams,
      fixtures,
      standings: calculateLeagueStandings(fourTeams, fixtures),
      topScorers: [],
      createdAt: Date.now(),
    };

    // Simulate Round 1, 2, and 3
    league = simulateLeagueRound(league, 1).updatedLeague;
    league = simulateLeagueRound(league, 2).updatedLeague;
    league = simulateLeagueRound(league, 3).updatedLeague;

    expect(league.status).toBe('completed');
    expect(league.fixtures.every((f) => f.status === 'played')).toBe(true);

    for (const row of league.standings) {
      expect(row.played).toBe(3);
    }

    const topScorers = calculateTopScorers(league.fixtures);
    if (topScorers.length > 0) {
      expect(topScorers[0].goals).toBeGreaterThanOrEqual(1);
    }
  });
});
