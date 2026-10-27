import { Club, ClubSnapshot, PvPRankInfo } from '../types';
import { createClubSnapshot } from './generator';

const PVP_PREFIX = 'MBPVP_';

export const PVP_RANKS: PvPRankInfo[] = [
  { title: 'Amatur', minRating: 0, badge: '🥉' },
  { title: 'Semi-Pro', minRating: 1100, badge: '🥈' },
  { title: 'Profesional', minRating: 1300, badge: '🥇' },
  { title: 'Elit', minRating: 1500, badge: '👑' },
];

/**
 * Returns rank tier and badge for a given Elo rating.
 */
export function getPvPRank(rating: number): PvPRankInfo {
  if (rating >= 1500) return PVP_RANKS[3];
  if (rating >= 1300) return PVP_RANKS[2];
  if (rating >= 1100) return PVP_RANKS[1];
  return PVP_RANKS[0];
}

/**
 * Encodes a user's Club into an asynchronous PvP Challenge code.
 */
export function encodeChallengeCode(club: Club): string {
  const snapshot = createClubSnapshot(club);
  const payload = {
    v: 1,
    c: {
      id: snapshot.id,
      n: snapshot.name,
      p1: snapshot.primaryColor,
      p2: snapshot.secondaryColor,
      ap1: snapshot.awayPrimaryColor ?? '#FFFFFF',
      ap2: snapshot.awaySecondaryColor ?? snapshot.primaryColor,
      kp: snapshot.kitPattern ?? 'solid',
      b: snapshot.badgeId,
      f: snapshot.formation,
      t: snapshot.tactics,
      xi: snapshot.startingXI.map((p) => ({
        id: p.id,
        n: p.name,
        pos: p.position,
        ovr: p.overallRating,
        fit: p.fitness ?? 100,
        mor: p.morale ?? 80,
        att: p.attributes,
      })),
    },
    r: club.pvpRating ?? 1200,
    ts: Date.now(),
  };

  const json = JSON.stringify(payload);
  const base64 = btoa(encodeURIComponent(json));
  return `${PVP_PREFIX}${base64}`;
}

/**
 * Decodes a challenge code into a valid ClubSnapshot and opponent rating.
 */
export function decodeChallengeCode(
  code: string
): ({ snapshot: ClubSnapshot; opponentRating: number } & ClubSnapshot) | null {
  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith(PVP_PREFIX)) return null;

    const rawBase64 = trimmed.slice(PVP_PREFIX.length);
    const json = decodeURIComponent(atob(rawBase64));
    const payload = JSON.parse(json);

    if (!payload?.c?.n || !Array.isArray(payload?.c?.xi)) return null;

    const c = payload.c;
    const snapshot: ClubSnapshot = {
      id: c.id || `pvp_${Date.now()}`,
      name: c.n,
      primaryColor: c.p1 || '#10B981',
      secondaryColor: c.p2 || '#0F172A',
      awayPrimaryColor: c.ap1 || '#FFFFFF',
      awaySecondaryColor: c.ap2 || '#10B981',
      kitPattern: c.kp || 'solid',
      badgeId: c.b || 'badge_1',
      formation: c.f || '4-3-3',
      tactics: c.t || 'Balanced',
      startingXI: c.xi.map((p: any) => ({
        id: p.id,
        name: p.n,
        position: p.pos,
        overallRating: p.ovr,
        fitness: p.fit ?? 100,
        morale: p.mor ?? 80,
        attributes: p.att,
      })),
    };

    const opponentRating = typeof payload.r === 'number' ? payload.r : 1200;

    // Return object compatible with both `{ snapshot, opponentRating }` and `ClubSnapshot` directly
    return Object.assign(snapshot, { snapshot, opponentRating });
  } catch (err) {
    console.warn('[PvP] Failed to decode challenge code:', err);
    return null;
  }
}

/**
 * Calculates standard Elo rating adjustment based on match result (K=32).
 */
export function calculateEloChange(
  userRating: number,
  opponentRating: number,
  userScore: number,
  oppScore: number
): number {
  const K = 32;
  const expectedUser = 1 / (1 + Math.pow(10, (opponentRating - userRating) / 400));

  let actualScore = 0.5; // Draw
  if (userScore > oppScore) actualScore = 1.0; // Win
  else if (userScore < oppScore) actualScore = 0.0; // Loss

  const delta = Math.round(K * (actualScore - expectedUser));
  return delta;
}
