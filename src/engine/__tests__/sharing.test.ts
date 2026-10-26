import { describe, expect, it } from 'vitest';
import {
  decodeMatchReplayCode,
  encodeMatchReplayCode,
  exportSaveData,
  importSaveData,
  SaveDataExportPayload,
} from '../sharing';
import { createClubSnapshot, generateClub } from '../generator';
import { simulateMatch } from '../simulator';
import { createKnockoutCup } from '../cup';

describe('Save Data Sharing & Match Replay Portability (sharing.ts)', () => {
  const dummyClub = generateClub({
    name: 'Harimau Malaya FC',
    formation: '4-3-3',
    tactics: 'Attacking',
    seed: 10101,
  });

  const dummyProfile = {
    name: 'Jurgen Gaffer',
    experienceLevel: 5,
    soundEnabled: true,
    replaySpeed: 2 as const,
  };

  describe('exportSaveData and importSaveData', () => {
    it('serializes full save payload into valid JSON string', () => {
      const payload: SaveDataExportPayload = {
        version: '0.5.0',
        exportedAt: 1700000000000,
        club: dummyClub,
        profile: dummyProfile,
        matchHistory: [],
        activeCup: createKnockoutCup(dummyClub, 1234),
        unlockedTrophies: [],
      };

      const jsonStr = exportSaveData(payload);
      expect(typeof jsonStr).toBe('string');
      expect(jsonStr).toContain('Harimau Malaya FC');
      expect(jsonStr).toContain('0.5.0');
    });

    it('successfully validates and imports exported save data', () => {
      const payload: SaveDataExportPayload = {
        version: '0.5.0',
        exportedAt: Date.now(),
        club: dummyClub,
        profile: dummyProfile,
        matchHistory: [],
        activeCup: null,
      };

      const jsonStr = exportSaveData(payload);
      const parsed = importSaveData(jsonStr);

      expect(parsed.version).toBe('0.5.0');
      expect(parsed.club?.id).toBe(dummyClub.id);
      expect(parsed.club?.name).toBe('Harimau Malaya FC');
      expect(parsed.profile?.name).toBe('Jurgen Gaffer');
    });

    it('throws error when attempting to import invalid or corrupted JSON', () => {
      expect(() => importSaveData('{ bad json: ]')).toThrow(/Failed to parse save JSON/);
      expect(() => importSaveData('')).toThrow(/Invalid JSON string/);
      expect(() => importSaveData('null')).toThrow(/Imported save data must be an object/);
      expect(() => importSaveData(JSON.stringify({ someKey: 123 }))).toThrow(
        /missing club information/
      );
      expect(() => importSaveData(JSON.stringify({ club: { id: 'test' } }))).toThrow(
        /missing essential id, name, or squad/
      );
    });
  });

  describe('encodeMatchReplayCode and decodeMatchReplayCode', () => {
    const homeClub = createClubSnapshot(dummyClub);
    const awayClub = createClubSnapshot(
      generateClub({
        name: 'Singa City',
        formation: '4-4-2',
        tactics: 'Balanced',
        seed: 20202,
      })
    );

    it('encodes and decodes match simulation parameters with high fidelity', () => {
      const matchResult = simulateMatch(homeClub, awayClub, 77777);
      const replayCode = encodeMatchReplayCode(matchResult);

      expect(typeof replayCode).toBe('string');
      expect(replayCode.startsWith('MBR1_')).toBe(true);

      const decoded = decodeMatchReplayCode(replayCode);

      expect(decoded.seed).toBe(77777);
      expect(decoded.homeClub.id).toBe(homeClub.id);
      expect(decoded.homeClub.name).toBe(homeClub.name);
      expect(decoded.awayClub.id).toBe(awayClub.id);
      expect(decoded.awayClub.name).toBe(awayClub.name);
      expect(decoded.homeScore).toBe(matchResult.homeScore);
      expect(decoded.awayScore).toBe(matchResult.awayScore);

      // Re-running simulator with decoded parameters reproduces exact match!
      const reSimulated = simulateMatch(decoded.homeClub, decoded.awayClub, decoded.seed);
      expect(reSimulated.homeScore).toBe(matchResult.homeScore);
      expect(reSimulated.awayScore).toBe(matchResult.awayScore);
      expect(reSimulated.events).toEqual(matchResult.events);
    });

    it('throws error when decoding invalid or altered replay codes', () => {
      expect(() => decodeMatchReplayCode('')).toThrow(/Invalid replay code/);
      expect(() => decodeMatchReplayCode('MBR1_not_valid_base64!@#$')).toThrow();
      expect(() => decodeMatchReplayCode('MBR1_' + Buffer.from('{"seed": 1}').toString('base64'))).toThrow(
        /missing seed or club snapshots/
      );
    });
  });
});
