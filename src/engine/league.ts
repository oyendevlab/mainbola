import { ClubSnapshot, MatchResult } from '../types';
import { League, LeagueFixture, LeagueStanding, TopScorer } from '../types/league';
import { simulateMatch } from './simulator';
import { PRNG } from './prng';

/**
 * Generate a short, readable 6-character invitation code.
 */
export function generateInviteCode(seed?: number): string {
  const prng = new PRNG(seed ?? Date.now());
  const prefix = prng.pick(['RUSH', 'GOAL', 'KICK', 'ACE', 'CLUB', 'ELITE']);
  const num = prng.nextInt(10, 99);
  return `${prefix}-${num}`;
}

/**
 * Generates Round-Robin fixtures for an even number of teams.
 * If number of teams is odd, a fictional bye or extra opponent is assumed to be handled.
 */
export function generateRoundRobinFixtures(
  teams: ClubSnapshot[],
  seed: number = Date.now()
): LeagueFixture[] {
  const n = teams.length;
  if (n < 2) return [];

  const prng = new PRNG(seed);
  const teamList = [...teams];
  const fixtures: LeagueFixture[] = [];

  // Generate Single Round-Robin (n-1 rounds)
  const rounds = n - 1;
  const matchesPerRound = n / 2;

  // Circle algorithm for round-robin
  const indices = teamList.map((_, i) => i);

  for (let r = 0; r < rounds; r++) {
    const roundNumber = r + 1;

    for (let m = 0; m < matchesPerRound; m++) {
      const homeIdx = indices[m];
      const awayIdx = indices[n - 1 - m];

      // Alternate home/away to balance matches
      const isAlt = (r + m) % 2 === 1;
      const homeTeam = teamList[isAlt ? awayIdx : homeIdx];
      const awayTeam = teamList[isAlt ? homeIdx : awayIdx];

      fixtures.push({
        id: `fix_r${roundNumber}_${homeTeam.id}_${awayTeam.id}`,
        round: roundNumber,
        homeClubId: homeTeam.id,
        awayClubId: awayTeam.id,
        homeClubName: homeTeam.name,
        awayClubName: awayTeam.name,
        status: 'scheduled',
        userTacticsSubmitted: false,
        seed: prng.nextInt(100000, 999999),
      });
    }

    // Rotate circle, keeping first element fixed
    const fixed = indices[0];
    const rest = indices.slice(1);
    const last = rest.pop()!;
    rest.unshift(last);
    indices.splice(0, indices.length, fixed, ...rest);
  }

  return fixtures;
}

/**
 * Calculate up-to-date league standings from team list and played fixtures.
 */
export function calculateLeagueStandings(
  teams: ClubSnapshot[],
  fixtures: LeagueFixture[]
): LeagueStanding[] {
  const tableMap = new Map<string, LeagueStanding>();

  // Initialize table rows
  for (const team of teams) {
    tableMap.set(team.id, {
      clubId: team.id,
      clubName: team.name,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      badgeId: team.badgeId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    });
  }

  // Process all completed fixtures in round order
  const playedFixtures = fixtures
    .filter((f) => f.status === 'played' && f.result)
    .sort((a, b) => a.round - b.round);

  for (const fix of playedFixtures) {
    const res = fix.result!;
    const homeRow = tableMap.get(fix.homeClubId);
    const awayRow = tableMap.get(fix.awayClubId);

    if (!homeRow || !awayRow) continue;

    homeRow.played += 1;
    awayRow.played += 1;

    homeRow.goalsFor += res.homeScore;
    homeRow.goalsAgainst += res.awayScore;
    homeRow.goalDifference = homeRow.goalsFor - homeRow.goalsAgainst;

    awayRow.goalsFor += res.awayScore;
    awayRow.goalsAgainst += res.homeScore;
    awayRow.goalDifference = awayRow.goalsFor - awayRow.goalsAgainst;

    if (res.homeScore > res.awayScore) {
      homeRow.won += 1;
      homeRow.points += 3;
      homeRow.form.push('W');

      awayRow.lost += 1;
      awayRow.form.push('L');
    } else if (res.homeScore < res.awayScore) {
      awayRow.won += 1;
      awayRow.points += 3;
      awayRow.form.push('W');

      homeRow.lost += 1;
      homeRow.form.push('L');
    } else {
      homeRow.drawn += 1;
      homeRow.points += 1;
      homeRow.form.push('D');

      awayRow.drawn += 1;
      awayRow.points += 1;
      awayRow.form.push('D');
    }

    // Limit form guide to last 5
    if (homeRow.form.length > 5) homeRow.form.shift();
    if (awayRow.form.length > 5) awayRow.form.shift();
  }

  // Sort criteria: Points DESC, Goal Difference DESC, Goals For DESC, Club Name ASC
  const standings = Array.from(tableMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.clubName.localeCompare(b.clubName);
  });

  return standings;
}

/**
 * Calculates top scorers by aggregating GOAL events from all played fixtures.
 */
export function calculateTopScorers(fixtures: LeagueFixture[]): TopScorer[] {
  const scorersMap = new Map<string, TopScorer>();

  for (const fix of fixtures) {
    if (fix.status !== 'played' || !fix.result) continue;

    for (const evt of fix.result.events) {
      if (evt.type === 'GOAL' && evt.playerId && evt.playerName) {
        const isHome = evt.teamId === fix.result.homeClub.id;
        const clubName = isHome ? fix.result.homeClub.name : fix.result.awayClub.name;

        const existing = scorersMap.get(evt.playerId);
        if (existing) {
          existing.goals += 1;
        } else {
          scorersMap.set(evt.playerId, {
            playerId: evt.playerId,
            playerName: evt.playerName,
            clubName,
            goals: 1,
          });
        }
      }
    }
  }

  return Array.from(scorersMap.values()).sort((a, b) => b.goals - a.goals);
}

/**
 * Simulates an entire round of fixtures in a league.
 */
export function simulateLeagueRound(
  league: League,
  round: number,
  userClubSnapshot?: ClubSnapshot
): { updatedLeague: League; playedResults: MatchResult[] } {
  const teamMap = new Map(league.teams.map((t) => [t.id, t]));
  if (userClubSnapshot) {
    teamMap.set(userClubSnapshot.id, userClubSnapshot);
  }

  const updatedFixtures = [...league.fixtures];
  const playedResults: MatchResult[] = [];

  for (let i = 0; i < updatedFixtures.length; i++) {
    const fix = updatedFixtures[i];
    if (fix.round === round && fix.status !== 'played') {
      const homeTeam = teamMap.get(fix.homeClubId);
      const awayTeam = teamMap.get(fix.awayClubId);

      if (homeTeam && awayTeam) {
        const result = simulateMatch(homeTeam, awayTeam, fix.seed);
        updatedFixtures[i] = {
          ...fix,
          status: 'played',
          result,
        };
        playedResults.push(result);
      }
    }
  }

  const newStandings = calculateLeagueStandings(league.teams, updatedFixtures);
  const newTopScorers = calculateTopScorers(updatedFixtures);
  const nextRound = round + 1;
  const isCompleted = nextRound > league.totalRounds;

  const updatedLeague: League = {
    ...league,
    currentRound: isCompleted ? league.totalRounds : nextRound,
    status: isCompleted ? 'completed' : 'active',
    fixtures: updatedFixtures,
    standings: newStandings,
    topScorers: newTopScorers,
  };

  return { updatedLeague, playedResults };
}
