import { describe, it, expect } from 'vitest';
import {
  getPreMatchPressConference,
  getPressConferenceQuestion,
  applyMoraleDelta,
  PRESS_QUESTIONS,
} from '../press';
import { Player } from '../../types';

describe('Press Conference Engine (press.ts)', () => {
  const dummyPlayers: Player[] = [
    {
      id: 'p1',
      name: 'Pemain A',
      position: 'ATT',
      overallRating: 75,
      morale: 80,
      attributes: { attack: 75, defense: 30, passing: 65, speed: 75, stamina: 70, goalkeeping: 10 },
    },
    {
      id: 'p2',
      name: 'Pemain B',
      position: 'MID',
      overallRating: 72,
      morale: 60,
      attributes: { attack: 65, defense: 60, passing: 75, speed: 65, stamina: 75, goalkeeping: 10 },
    },
    {
      id: 'p3',
      name: 'Pemain C (Default Morale)',
      position: 'DEF',
      overallRating: 70,
      attributes: { attack: 35, defense: 75, passing: 60, speed: 65, stamina: 70, goalkeeping: 10 },
    },
  ];

  describe('getPreMatchPressConference', () => {
    it('returns a valid press conference question with 3 answers', () => {
      const q = getPreMatchPressConference(101);
      expect(q).toBeDefined();
      expect(q.question).toBeDefined();
      expect(q.answers.length).toBe(3);
      q.answers.forEach((ans) => {
        expect(ans.text).toBeDefined();
        expect(typeof ans.moraleDelta).toBe('number');
        expect(ans.tone).toBeDefined();
      });
    });

    it('returns deterministic questions given same seed', () => {
      const q1 = getPreMatchPressConference(999);
      const q2 = getPreMatchPressConference(999);
      expect(q1.id).toBe(q2.id);
    });

    it('aliases getPressConferenceQuestion', () => {
      const q = getPressConferenceQuestion(42);
      expect(q).toBeDefined();
      expect(PRESS_QUESTIONS.map((pq) => pq.id)).toContain(q.id);
    });
  });

  describe('applyMoraleDelta', () => {
    it('correctly increases squad morale with positive delta', () => {
      const updated = applyMoraleDelta(dummyPlayers, 8);
      expect(updated[0].morale).toBe(88); // 80 + 8
      expect(updated[1].morale).toBe(68); // 60 + 8
      expect(updated[2].morale).toBe(88); // default 80 + 8
    });

    it('correctly decreases squad morale with negative delta', () => {
      const updated = applyMoraleDelta(dummyPlayers, -5);
      expect(updated[0].morale).toBe(75);
      expect(updated[1].morale).toBe(55);
    });

    it('clamps morale within maximum boundary 100', () => {
      const updated = applyMoraleDelta(dummyPlayers, 30);
      expect(updated[0].morale).toBe(100);
    });

    it('clamps morale above minimum threshold (>= 0 or 20)', () => {
      const updated = applyMoraleDelta(dummyPlayers, -90);
      expect(updated[0].morale).toBeGreaterThanOrEqual(0);
    });
  });
});
