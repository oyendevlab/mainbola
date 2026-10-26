import { describe, expect, it } from 'vitest';
import {
  advanceCupTournament,
  createKnockoutCup,
  CUP_CHAMPION_PRIZE,
  simulateCupMatch,
} from '../cup';
import { createClubSnapshot, generateClub } from '../generator';

describe('Knockout Cup Engine (cup.ts)', () => {
  const userClub = generateClub({
    name: 'Red Harimau FC',
    formation: '4-3-3',
    tactics: 'Attacking',
    seed: 55001,
  });

  const userSnapshot = createClubSnapshot(userClub);

  describe('createKnockoutCup', () => {
    it('creates an 8-team single-elimination tournament with 1 user club and 7 distinct AI clubs', () => {
      const seed = 12345;
      const cup = createKnockoutCup(userClub, seed);

      expect(cup.name).toBe('Piala MainBola');
      expect(cup.status).toBe('active');
      expect(cup.currentRound).toBe('Quarter');
      expect(cup.currentRoundIndex).toBe(0);
      expect(cup.teams).toHaveLength(8);
      expect(cup.teams[0].id).toBe(userClub.id);

      // Unique clubs
      const clubNames = new Set(cup.teams.map((t) => t.name));
      expect(clubNames.size).toBe(8);

      // Generates 4 Quarter-final matches
      expect(cup.matches).toHaveLength(4);
      expect(cup.matches.every((m) => m.round === 'Quarter')).toBe(true);
      expect(cup.matches.every((m) => !m.isCompleted)).toBe(true);
    });

    it('accepts both Club and ClubSnapshot objects', () => {
      const cupFromClub = createKnockoutCup(userClub, 9999);
      const cupFromSnapshot = createKnockoutCup(userSnapshot, 9999);

      expect(cupFromClub.teams.map((t) => t.name)).toEqual(
        cupFromSnapshot.teams.map((t) => t.name)
      );
    });

    it('is deterministic when initialized with the same seed', () => {
      const cupA = createKnockoutCup(userClub, 8888);
      const cupB = createKnockoutCup(userClub, 8888);

      expect(cupA).toEqual(cupB);
    });
  });

  describe('simulateCupMatch', () => {
    it('completes the match and designates a winner', () => {
      const cup = createKnockoutCup(userClub, 100);
      const match = cup.matches[0];

      const simulated = simulateCupMatch(match, 100);

      expect(simulated.isCompleted).toBe(true);
      expect(simulated.result).toBeDefined();
      expect(simulated.winnerId).toBeDefined();
      expect([match.homeClub.id, match.awayClub.id]).toContain(simulated.winnerId);
    });

    it('correctly decides match winner in regular time when scores differ', () => {
      const cup = createKnockoutCup(userClub, 42);
      const match = cup.matches[0];

      const simulated = simulateCupMatch(match, 42);

      if (simulated.result!.homeScore !== simulated.result!.awayScore) {
        const expectedWinnerId =
          simulated.result!.homeScore > simulated.result!.awayScore
            ? match.homeClub.id
            : match.awayClub.id;

        expect(simulated.winnerId).toBe(expectedWinnerId);
        expect(simulated.homePenalties).toBeUndefined();
        expect(simulated.awayPenalties).toBeUndefined();
      }
    });

    it('resolves tiebreaks via penalty shootout when regular time is a draw', () => {
      const cup = createKnockoutCup(userClub, 777);

      // Find or simulate seeds until a draw occurs
      let foundDrawSeed = 0;
      for (let s = 1; s <= 200; s++) {
        const match = cup.matches[0];
        const sim = simulateCupMatch(match, s);
        if (sim.result!.homeScore === sim.result!.awayScore) {
          foundDrawSeed = s;
          break;
        }
      }

      if (foundDrawSeed > 0) {
        const drawMatch = simulateCupMatch(cup.matches[0], foundDrawSeed);

        expect(drawMatch.result!.homeScore).toBe(drawMatch.result!.awayScore);
        expect(drawMatch.homePenalties).toBeDefined();
        expect(drawMatch.awayPenalties).toBeDefined();
        expect(drawMatch.homePenalties).not.toBe(drawMatch.awayPenalties);

        const expectedWinner =
          drawMatch.homePenalties! > drawMatch.awayPenalties!
            ? drawMatch.homeClub.id
            : drawMatch.awayClub.id;

        expect(drawMatch.winnerId).toBe(expectedWinner);
      }
    });
  });

  describe('advanceCupTournament', () => {
    it('does not advance if matches in current round are incomplete', () => {
      const cup = createKnockoutCup(userClub, 123);
      const unchanged = advanceCupTournament(cup);

      expect(unchanged.currentRound).toBe('Quarter');
      expect(unchanged.matches).toHaveLength(4);
    });

    it('simulates full tournament bracket from Quarter -> Semi -> Final -> Champion', () => {
      let cup = createKnockoutCup(userClub, 555);

      // 1. Simulate all 4 Quarter-final matches
      cup.matches = cup.matches.map((m) => simulateCupMatch(m, m.seed));
      expect(cup.matches.filter((m) => m.round === 'Quarter')).toHaveLength(4);
      expect(cup.matches.every((m) => m.isCompleted)).toBe(true);

      // 2. Advance to Semi-finals
      cup = advanceCupTournament(cup, 666);
      expect(cup.currentRound).toBe('Semi');
      expect(cup.currentRoundIndex).toBe(1);
      const semiMatches = cup.matches.filter((m) => m.round === 'Semi');
      expect(semiMatches).toHaveLength(2);
      expect(semiMatches.every((m) => !m.isCompleted)).toBe(true);

      // 3. Simulate Semi-final matches
      cup.matches = cup.matches.map((m) =>
        m.round === 'Semi' ? simulateCupMatch(m, m.seed) : m
      );

      // 4. Advance to Grand Final
      cup = advanceCupTournament(cup, 777);
      expect(cup.currentRound).toBe('Final');
      expect(cup.currentRoundIndex).toBe(2);
      const finalMatches = cup.matches.filter((m) => m.round === 'Final');
      expect(finalMatches).toHaveLength(1);

      // 5. Simulate Grand Final
      cup.matches = cup.matches.map((m) =>
        m.round === 'Final' ? simulateCupMatch(m, m.seed) : m
      );

      // 6. Advance Final to declare Champion
      cup = advanceCupTournament(cup, 888);
      expect(cup.status).toBe('completed');
      expect(cup.winnerClubId).toBeDefined();
      expect(cup.winnerClubName).toBeDefined();
    });

    it('specifies 35,000 Credits prize for tournament champion', () => {
      expect(CUP_CHAMPION_PRIZE).toBe(35000);
    });
  });
});
