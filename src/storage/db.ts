import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Club, KnockoutCup, ManagerProfile, MatchResult, TransferTarget } from '../types';
import { League } from '../types/league';
import { calculatePlayerMarketValue } from '../engine/generator';
import { getDefaultRoleForPosition } from '../types/roles';

export const DB_NAME = 'goal_rush_db';
export const DB_VERSION = 4;
export const ACTIVE_CLUB_KEY = 'active_club';
export const ACTIVE_LEAGUE_KEY = 'active_league';
export const ACTIVE_CUP_KEY = 'active_cup';
export const TRANSFER_MARKET_KEY = 'active_market';
export const PROFILE_KEY = 'profile';

export interface GoalRushDBSchema extends DBSchema {
  clubs: {
    key: string;
    value: Club;
  };
  manager: {
    key: string;
    value: ManagerProfile;
  };
  matches: {
    key: string;
    value: MatchResult;
    indexes: {
      timestamp: number;
    };
  };
  settings: {
    key: string;
    value: unknown;
  };
  leagues: {
    key: string;
    value: League;
  };
  transfers: {
    key: string;
    value: TransferTarget[];
  };
  cup: {
    key: string;
    value: KnockoutCup;
  };
}

let dbInstance: IDBPDatabase<GoalRushDBSchema> | null = null;
let dbPromise: Promise<IDBPDatabase<GoalRushDBSchema>> | null = null;

/**
 * Obtain a connection to the IndexedDB database.
 * Uses a singleton promise to avoid race conditions during concurrent initialization.
 */
export async function getDb(): Promise<IDBPDatabase<GoalRushDBSchema>> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!dbPromise) {
    dbPromise = openDB<GoalRushDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, _transaction) {
        // Migration safeguards: safely check if stores exist before creating
        if (!db.objectStoreNames.contains('clubs')) {
          db.createObjectStore('clubs');
        }

        if (!db.objectStoreNames.contains('manager')) {
          db.createObjectStore('manager');
        }

        if (!db.objectStoreNames.contains('matches')) {
          const matchStore = db.createObjectStore('matches', { keyPath: 'id' });
          matchStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }

        if (!db.objectStoreNames.contains('leagues')) {
          db.createObjectStore('leagues');
        }

        if (!db.objectStoreNames.contains('transfers')) {
          db.createObjectStore('transfers');
        }

        if (!db.objectStoreNames.contains('cup')) {
          db.createObjectStore('cup');
        }
      },
      blocked() {
        console.warn('[IndexedDB] Database open blocked by another open tab/connection.');
      },
      blocking() {
        console.warn('[IndexedDB] Database connection is blocking a newer version.');
        if (dbInstance) {
          dbInstance.close();
          dbInstance = null;
          dbPromise = null;
        }
      },
      terminated() {
        console.error('[IndexedDB] Database connection unexpectedly terminated.');
        dbInstance = null;
        dbPromise = null;
      },
    })
      .then((db) => {
        dbInstance = db;
        return db;
      })
      .catch((err) => {
        dbPromise = null;
        dbInstance = null;
        console.error('[IndexedDB] Failed to open database:', err);
        throw err;
      });
  }

  return dbPromise;
}

/**
 * Close active database connection and reset cache.
 */
export function closeDb(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      console.warn('[IndexedDB] Error closing database:', e);
    }
    dbInstance = null;
  }
  dbPromise = null;
}

// ============================================================================
// Club Persistence
// ============================================================================

function normalizeClub(club: Club): Club {
  if (club.budget === undefined) {
    club.budget = 50000;
  }
  if (!club.facilities) {
    club.facilities = {
      stadiumLevel: 1,
      youthAcademyLevel: 1,
      medicalLevel: 1,
    };
  } else {
    club.facilities = {
      stadiumLevel: club.facilities.stadiumLevel ?? 1,
      youthAcademyLevel: club.facilities.youthAcademyLevel ?? 1,
      medicalLevel: club.facilities.medicalLevel ?? 1,
    };
  }
  if (club.activeSponsorId === undefined) {
    club.activeSponsorId = null;
  }
  if (!club.awayPrimaryColor) {
    club.awayPrimaryColor = '#FFFFFF';
  }
  if (!club.awaySecondaryColor) {
    club.awaySecondaryColor = club.primaryColor;
  }
  if (!club.kitPattern) {
    club.kitPattern = 'solid';
  }
  if (club.pvpRating === undefined) {
    club.pvpRating = 1200;
  }
  if (!club.pvpRecord) {
    club.pvpRecord = { won: 0, drawn: 0, lost: 0 };
  }
  if (!club.completedScenarios) {
    club.completedScenarios = [];
  }
  if (Array.isArray(club.squad)) {
    club.squad = club.squad.map((p) => ({
      ...p,
      fitness: p.fitness ?? 100,
      trainingXp: p.trainingXp ?? 0,
      marketValue: p.marketValue ?? calculatePlayerMarketValue(p.overallRating),
      yellowCards: p.yellowCards ?? 0,
      redCards: p.redCards ?? 0,
      isSuspended: p.isSuspended ?? false,
      isYouthProduct: p.isYouthProduct ?? false,
      morale: p.morale ?? 80,
      role: p.role ?? getDefaultRoleForPosition(p.position),
    }));
  }
  return club;
}

/**
 * Retrieve the active user club from IndexedDB.
 */
export async function getClub(): Promise<Club | null> {
  try {
    const db = await getDb();
    const club = await db.get('clubs', ACTIVE_CLUB_KEY);
    if (club) return normalizeClub(club);

    // Fallback: if 'active_club' key is not found, check if any club exists
    const allClubs = await db.getAll('clubs');
    return allClubs.length > 0 ? normalizeClub(allClubs[0]) : null;
  } catch (err) {
    console.error('[IndexedDB] getClub error:', err);
    return null;
  }
}

/**
 * Save user club into IndexedDB under the active club key.
 */
export async function saveClub(club: Club): Promise<void> {
  try {
    const db = await getDb();
    await db.put('clubs', club, ACTIVE_CLUB_KEY);
  } catch (err) {
    console.error('[IndexedDB] saveClub error:', err);
    throw new Error(`Failed to save club: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Delete the active club from IndexedDB.
 */
export async function deleteClub(): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('clubs', ACTIVE_CLUB_KEY);
  } catch (err) {
    console.error('[IndexedDB] deleteClub error:', err);
    throw new Error(`Failed to delete club: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ============================================================================
// Manager Profile Persistence
// ============================================================================

/**
 * Retrieve manager profile from IndexedDB.
 */
export async function getProfile(): Promise<ManagerProfile | null> {
  try {
    const db = await getDb();
    const profile = await db.get('manager', PROFILE_KEY);
    if (!profile) return null;
    return {
      ...profile,
      commentaryVoiceEnabled: profile.commentaryVoiceEnabled ?? true,
      commentaryLanguage: profile.commentaryLanguage ?? 'ms',
      bgSoundEnabled: profile.bgSoundEnabled ?? true,
      bgVolume: profile.bgVolume ?? 40,
    };
  } catch (err) {
    console.error('[IndexedDB] getProfile error:', err);
    return null;
  }
}

/**
 * Save manager profile to IndexedDB.
 */
export async function saveProfile(profile: ManagerProfile): Promise<void> {
  try {
    const db = await getDb();
    await db.put('manager', profile, PROFILE_KEY);
  } catch (err) {
    console.error('[IndexedDB] saveProfile error:', err);
    throw new Error(`Failed to save profile: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ============================================================================
// Match History Persistence
// ============================================================================

/**
 * Retrieve all matches sorted by newest first (descending timestamp).
 */
export async function getMatchHistory(): Promise<MatchResult[]> {
  try {
    const db = await getDb();
    const tx = db.transaction('matches', 'readonly');
    const store = tx.store;
    const index = store.index('timestamp');
    const matches = await index.getAll();
    await tx.done;

    // Return in reverse chronological order (newest first)
    return matches.sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.error('[IndexedDB] getMatchHistory error:', err);
    return [];
  }
}

/**
 * Save a match result into IndexedDB.
 */
export async function saveMatchResult(result: MatchResult): Promise<void> {
  try {
    const db = await getDb();
    await db.put('matches', result);
  } catch (err) {
    console.error('[IndexedDB] saveMatchResult error:', err);
    throw new Error(`Failed to save match result: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ============================================================================
// Settings Persistence
// ============================================================================

/**
 * Retrieve a setting by key.
 */
export async function getSetting<T>(key: string, defaultValue?: T): Promise<T | null> {
  try {
    const db = await getDb();
    const val = await db.get('settings', key);
    return (val as T) ?? defaultValue ?? null;
  } catch (err) {
    console.error(`[IndexedDB] getSetting(${key}) error:`, err);
    return defaultValue ?? null;
  }
}

/**
 * Save a setting by key.
 */
export async function saveSetting<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDb();
    await db.put('settings', value, key);
  } catch (err) {
    console.error(`[IndexedDB] saveSetting(${key}) error:`, err);
    throw new Error(`Failed to save setting ${key}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Delete a setting by key.
 */
export async function deleteSetting(key: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('settings', key);
  } catch (err) {
    console.error(`[IndexedDB] deleteSetting(${key}) error:`, err);
  }
}

// ============================================================================
// League Persistence
// ============================================================================

/**
 * Retrieve the active league from IndexedDB.
 */
export async function getActiveLeague(): Promise<League | null> {
  try {
    const db = await getDb();
    const league = await db.get('leagues', ACTIVE_LEAGUE_KEY);
    return league ?? null;
  } catch (err) {
    console.error('[IndexedDB] getActiveLeague error:', err);
    return null;
  }
}

/**
 * Save or update the active league in IndexedDB.
 */
export async function saveActiveLeague(league: League): Promise<void> {
  try {
    const db = await getDb();
    await db.put('leagues', league, ACTIVE_LEAGUE_KEY);
  } catch (err) {
    console.error('[IndexedDB] saveActiveLeague error:', err);
    throw new Error(`Failed to save active league: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Delete the active league from IndexedDB.
 */
export async function deleteActiveLeague(): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('leagues', ACTIVE_LEAGUE_KEY);
  } catch (err) {
    console.error('[IndexedDB] deleteActiveLeague error:', err);
  }
}

// ============================================================================
// Transfer Market Persistence
// ============================================================================

/**
 * Retrieve current scouted transfer targets from IndexedDB.
 */
export async function getTransferMarket(): Promise<TransferTarget[] | null> {
  try {
    const db = await getDb();
    const market = await db.get('transfers', TRANSFER_MARKET_KEY);
    return market ?? null;
  } catch (err) {
    console.error('[IndexedDB] getTransferMarket error:', err);
    return null;
  }
}

/**
 * Save current scouted transfer targets in IndexedDB.
 */
export async function saveTransferMarket(targets: TransferTarget[]): Promise<void> {
  try {
    const db = await getDb();
    await db.put('transfers', targets, TRANSFER_MARKET_KEY);
  } catch (err) {
    console.error('[IndexedDB] saveTransferMarket error:', err);
  }
}

// ============================================================================
// Knockout Cup Persistence
// ============================================================================

/**
 * Retrieve the active Knockout Cup tournament from IndexedDB.
 */
export async function getActiveCup(): Promise<KnockoutCup | null> {
  try {
    const db = await getDb();
    const cup = await db.get('cup', ACTIVE_CUP_KEY);
    return cup ?? null;
  } catch (err) {
    console.error('[IndexedDB] getActiveCup error:', err);
    return null;
  }
}

/**
 * Save or update the active Knockout Cup tournament in IndexedDB.
 */
export async function saveActiveCup(cup: KnockoutCup): Promise<void> {
  try {
    const db = await getDb();
    await db.put('cup', cup, ACTIVE_CUP_KEY);
  } catch (err) {
    console.error('[IndexedDB] saveActiveCup error:', err);
    throw new Error(`Failed to save active cup: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Delete the active Knockout Cup tournament from IndexedDB.
 */
export async function deleteActiveCup(): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('cup', ACTIVE_CUP_KEY);
  } catch (err) {
    console.error('[IndexedDB] deleteActiveCup error:', err);
  }
}

// ============================================================================
// Reset and Maintenance
// ============================================================================

/**
 * Safely clears all object stores in a single transaction.
 */
export async function resetAllData(): Promise<void> {
  try {
    const db = await getDb();
    const stores = ['clubs', 'manager', 'matches', 'settings', 'leagues', 'transfers', 'cup'] as const;
    const existingStores = stores.filter((s) => db.objectStoreNames.contains(s));
    const tx = db.transaction(existingStores, 'readwrite');
    await Promise.all([
      ...existingStores.map((s) => tx.objectStore(s).clear()),
      tx.done,
    ]);
  } catch (err) {
    console.error('[IndexedDB] resetAllData error:', err);
    throw new Error(`Failed to reset data: ${err instanceof Error ? err.message : String(err)}`);
  }
}
