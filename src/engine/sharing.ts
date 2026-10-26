import {
  Club,
  ClubSnapshot,
  KnockoutCup,
  ManagerProfile,
  MatchResult,
  Trophy,
} from '../types';
import { League } from '../types/league';

export interface SaveDataExportPayload {
  version: string;
  exportedAt: number;
  club: Club | null;
  profile: ManagerProfile;
  matchHistory?: MatchResult[];
  activeLeague?: League | null;
  activeCup?: KnockoutCup | null;
  unlockedTrophies?: Trophy[];
}

export interface MatchReplayData {
  seed: number;
  homeClub: ClubSnapshot;
  awayClub: ClubSnapshot;
  homeScore?: number;
  awayScore?: number;
}

function toBase64(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64(b64: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf-8');
  }
  return decodeURIComponent(escape(atob(b64)));
}

/**
 * Serializes game save data into a formatted JSON string.
 */
export function exportSaveData(data: SaveDataExportPayload): string {
  if (!data) {
    throw new Error('Save data payload cannot be null or undefined');
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Validates and parses an imported game save JSON string.
 * Throws an Error if the JSON is malformed or missing critical club attributes.
 */
export function importSaveData(jsonString: string): SaveDataExportPayload {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new Error('Invalid JSON string provided for import');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Failed to parse save JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Imported save data must be an object');
  }

  const payload = parsed as Partial<SaveDataExportPayload>;

  if (!payload.club || typeof payload.club !== 'object') {
    throw new Error('Invalid save data: missing club information');
  }

  if (!payload.club.id || !payload.club.name || !Array.isArray(payload.club.squad)) {
    throw new Error('Invalid save data: club missing essential id, name, or squad');
  }

  return payload as SaveDataExportPayload;
}

/**
 * Encodes a match's seed, home club, and away club into a URL-safe Base64 replay code.
 */
export function encodeMatchReplayCode(result: MatchResult | MatchReplayData): string {
  if (!result || typeof result.seed !== 'number' || !result.homeClub || !result.awayClub) {
    throw new Error('Invalid match result provided for encoding replay code');
  }

  const payload: MatchReplayData = {
    seed: result.seed,
    homeClub: result.homeClub,
    awayClub: result.awayClub,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
  };

  const json = JSON.stringify(payload);
  const base64 = toBase64(json);

  // Prefix to make identifiable
  return `MBR1_${base64}`;
}

/**
 * Decodes a match replay code back into match simulation inputs (seed, homeClub, awayClub).
 */
export function decodeMatchReplayCode(code: string): MatchReplayData {
  if (!code || typeof code !== 'string') {
    throw new Error('Invalid replay code provided');
  }

  let cleanCode = code.trim();
  if (cleanCode.startsWith('MBR1_')) {
    cleanCode = cleanCode.slice(5);
  }

  let json: string;
  try {
    json = fromBase64(cleanCode);
  } catch (err) {
    throw new Error(`Failed to decode replay code from base64: ${err instanceof Error ? err.message : String(err)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`Failed to parse replay payload: ${err instanceof Error ? err.message : String(err)}`);
  }

  const replayData = parsed as MatchReplayData;

  if (typeof replayData.seed !== 'number' || !replayData.homeClub || !replayData.awayClub) {
    throw new Error('Decoded replay code is missing seed or club snapshots');
  }

  return replayData;
}
