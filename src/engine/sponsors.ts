import { SponsorDeal } from '../types';

export const PRESET_SPONSORS: SponsorDeal[] = [
  {
    id: 'sponsor_local_bakery',
    name: 'Local Bakery',
    tier: 'Bronze',
    upfrontBonus: 10000,
    winBonus: 1500,
    cleanSheetBonus: 1000,
    active: false,
    description: 'Tajaan perniagaan komuniti dengan bonus pendahuluan tunai dan insentif kemenangan asas.',
  },
  {
    id: 'sponsor_tech_startup',
    name: 'Tech Startup',
    tier: 'Silver',
    upfrontBonus: 25000,
    winBonus: 3000,
    cleanSheetBonus: 2500,
    active: false,
    description: 'Syarikat pemula teknologi canggih yang memberikan suntikan dana pantas dan bonus mata tinggi.',
  },
  {
    id: 'sponsor_global_airlines',
    name: 'Global Airlines',
    tier: 'Gold',
    upfrontBonus: 60000,
    winBonus: 6000,
    cleanSheetBonus: 5000,
    active: false,
    description: 'Syarikat penerbangan antarabangsa berprestij dengan tawaran penajaan korporat terbesar.',
  },
];

/**
 * Retrieve all preset sponsor deals available for clubs to sign.
 */
export function getAllSponsors(): SponsorDeal[] {
  return [...PRESET_SPONSORS];
}

/**
 * Find a preset sponsor deal by its unique ID.
 */
export function getSponsorById(id: string): SponsorDeal | undefined {
  return PRESET_SPONSORS.find((s) => s.id === id);
}

/**
 * Calculates the match reward bonus earned from an active sponsorship deal.
 * If sponsor is inactive or undefined, returns 0.
 */
export function calculateSponsorBonus(
  sponsor: SponsorDeal | null | undefined,
  isWin: boolean,
  isCleanSheet: boolean
): number {
  if (!sponsor || !sponsor.active) {
    return 0;
  }

  let totalBonus = 0;
  if (isWin) {
    totalBonus += sponsor.winBonus;
  }
  if (isCleanSheet) {
    totalBonus += sponsor.cleanSheetBonus;
  }

  return totalBonus;
}
