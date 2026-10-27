import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSpokenCommentary, speakCommentary, stopCommentary } from '../commentary';
import { MatchEvent } from '../../types';

describe('Web Speech Commentary Engine (commentary.ts)', () => {
  const goalEvent: MatchEvent = {
    id: 'ev_1',
    minute: 23,
    type: 'GOAL',
    teamId: 't1',
    playerId: 'p1',
    playerName: 'Safawi Rasid',
    description: 'Safawi scores a beauty!',
    homeScore: 1,
    awayScore: 0,
  };

  const redCardEvent: MatchEvent = {
    id: 'ev_2',
    minute: 44,
    type: 'RED_CARD',
    teamId: 't2',
    playerId: 'p2',
    playerName: 'Eldstal',
    description: 'Red card Eldstal!',
    homeScore: 1,
    awayScore: 0,
  };

  describe('getSpokenCommentary', () => {
    it('generates lively Malay commentary for goals and cards', () => {
      const goalMs = getSpokenCommentary(goalEvent, 'ms');
      expect(goalMs).toContain('Gol!');
      expect(goalMs).toContain('Safawi Rasid');
      expect(goalMs).toContain('1 berbalas 0');

      const redMs = getSpokenCommentary(redCardEvent, 'ms');
      expect(redMs).toContain('Kad merah terus');
      expect(redMs).toContain('Eldstal');
    });

    it('generates accurate English commentary when selected', () => {
      const goalEn = getSpokenCommentary(goalEvent, 'en');
      expect(goalEn).toContain('Goal!');
      expect(goalEn).toContain('Safawi Rasid');
      expect(goalEn).toContain('1 to 0');

      const redEn = getSpokenCommentary(redCardEvent, 'en');
      expect(redEn).toContain('Red card!');
      expect(redEn).toContain('Eldstal');
    });
  });

  describe('speakCommentary & stopCommentary with Web Speech API', () => {
    beforeEach(() => {
      const speakMock = vi.fn();
      const cancelMock = vi.fn();
      const synthMock = {
        speak: speakMock,
        cancel: cancelMock,
        speaking: false,
      };
      const utteranceMock = class {
        text: string;
        lang = '';
        rate = 1;
        pitch = 1;
        constructor(text: string) {
          this.text = text;
        }
      };

      vi.stubGlobal('speechSynthesis', synthMock);
      vi.stubGlobal('SpeechSynthesisUtterance', utteranceMock);

      if (typeof window !== 'undefined') {
        (window as unknown as { speechSynthesis: unknown }).speechSynthesis = synthMock;
        (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = utteranceMock;
      }
    });

    it('returns false when commentary is disabled', () => {
      const res = speakCommentary(goalEvent, { enabled: false });
      expect(res).toBe(false);
    });

    it('speaks aloud when enabled', () => {
      const res = speakCommentary(goalEvent, { enabled: true, language: 'ms' });
      expect(res).toBe(true);
    });

    it('invokes stopCommentary safely', () => {
      expect(() => stopCommentary()).not.toThrow();
    });
  });
});
