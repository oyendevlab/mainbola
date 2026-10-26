import { describe, expect, it } from 'vitest';
import {
  PRESET_AI_CLUBS,
  autoSelectStartingXI,
  calculateOverallRating,
  createClubSnapshot,
  generateAIOpponents,
  generateClub,
  generatePlayer,
  generateSquad,
  selectStartingXI,
} from '../generator';
import { createPRNG } from '../prng';
import { FormationType, PlayerPosition } from '../../types';
import { validateSquadSelection } from '../../types/formations';

describe('Player & Club Generator', () => {
  describe('calculateOverallRating', () => {
    it('accurately weights GK attributes (heavy goalkeeping)', () => {
      const gkAttrs = {
        attack: 20,
        defense: 40,
        passing: 50,
        speed: 40,
        stamina: 60,
        goalkeeping: 90,
      };
      // 90*0.70 + 40*0.10 + 50*0.08 + 40*0.06 + 60*0.06 = 63 + 4 + 4 + 2.4 + 3.6 = 77
      const rating = calculateOverallRating('GK', gkAttrs);
      expect(rating).toBe(77);

      // Verify reverse argument order is also supported
      const ratingReverse = calculateOverallRating(gkAttrs, 'GK');
      expect(ratingReverse).toBe(77);
    });

    it('accurately weights DEF attributes (heavy defense & stamina)', () => {
      const defAttrs = {
        attack: 40,
        defense: 88,
        passing: 65,
        speed: 75,
        stamina: 82,
        goalkeeping: 15,
      };
      // 88*0.45 (39.6) + 82*0.20 (16.4) + 75*0.15 (11.25) + 65*0.12 (7.8) + 40*0.08 (3.2) = 78.25 -> 78
      const rating = calculateOverallRating('DEF', defAttrs);
      expect(rating).toBe(78);
    });

    it('accurately weights MID attributes (heavy passing, stamina, attack)', () => {
      const midAttrs = {
        attack: 75,
        defense: 68,
        passing: 88,
        speed: 74,
        stamina: 84,
        goalkeeping: 12,
      };
      // 88*0.35 (30.8) + 84*0.20 (16.8) + 75*0.18 (13.5) + 68*0.15 (10.2) + 74*0.12 (8.88) = 80.18 -> 80
      const rating = calculateOverallRating('MID', midAttrs);
      expect(rating).toBe(80);
    });

    it('accurately weights ATT attributes (heavy attack & speed)', () => {
      const attAttrs = {
        attack: 90,
        defense: 35,
        passing: 72,
        speed: 88,
        stamina: 78,
        goalkeeping: 10,
      };
      // 90*0.45 (40.5) + 88*0.22 (19.36) + 72*0.15 (10.8) + 78*0.12 (9.36) + 35*0.06 (2.1) = 82.12 -> 82
      const rating = calculateOverallRating('ATT', attAttrs);
      expect(rating).toBe(82);
    });

    it('strictly clamps ratings within 1..100', () => {
      const minAttrs = {
        attack: 0,
        defense: 0,
        passing: 0,
        speed: 0,
        stamina: 0,
        goalkeeping: 0,
      };
      const maxAttrs = {
        attack: 150,
        defense: 150,
        passing: 150,
        speed: 150,
        stamina: 150,
        goalkeeping: 150,
      };

      expect(calculateOverallRating('GK', minAttrs)).toBe(1);
      expect(calculateOverallRating('ATT', maxAttrs)).toBe(100);
    });
  });

  describe('generatePlayer', () => {
    it('creates valid players with attributes strictly within [1, 100]', () => {
      const prng = createPRNG(98765);
      const positions: PlayerPosition[] = ['GK', 'DEF', 'MID', 'ATT'];

      for (const pos of positions) {
        for (let i = 0; i < 20; i++) {
          const player = generatePlayer(pos, prng);

          expect(player.id).toBeDefined();
          expect(player.name.trim().length).toBeGreaterThan(3);
          expect(player.position).toBe(pos);
          expect(player.overallRating).toBeGreaterThanOrEqual(1);
          expect(player.overallRating).toBeLessThanOrEqual(100);

          for (const value of Object.values(player.attributes)) {
            expect(Number.isInteger(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(1);
            expect(value).toBeLessThanOrEqual(100);
          }
        }
      }
    });
  });

  describe('generateSquad', () => {
    it('generates exactly 15 players with correct composition (2 GK, 5 DEF, 5 MID, 3 ATT)', () => {
      const prng = createPRNG(42);
      const squad = generateSquad(prng);

      expect(squad).toHaveLength(15);

      const gks = squad.filter((p) => p.position === 'GK');
      const defs = squad.filter((p) => p.position === 'DEF');
      const mids = squad.filter((p) => p.position === 'MID');
      const atts = squad.filter((p) => p.position === 'ATT');

      expect(gks).toHaveLength(2);
      expect(defs).toHaveLength(5);
      expect(mids).toHaveLength(5);
      expect(atts).toHaveLength(3);

      // Verify all IDs are unique
      const idSet = new Set(squad.map((p) => p.id));
      expect(idSet.size).toBe(15);
    });
  });

  describe('Formation Validation & Starting XI Selection', () => {
    const formations: FormationType[] = ['4-3-3', '4-4-2', '4-2-3-1'];

    formations.forEach((formation) => {
      it(`selects valid starting XI for ${formation} passing validateSquadSelection`, () => {
        const prng = createPRNG(12345);
        const squad = generateSquad(prng);

        const startingXIIds = autoSelectStartingXI(squad, formation);

        expect(startingXIIds).toHaveLength(11);
        expect(selectStartingXI(squad, formation)).toEqual(startingXIIds);

        const validation = validateSquadSelection(squad, startingXIIds, formation);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);

        // Verify exactly 1 GK is in the starting XI
        const squadMap = new Map(squad.map((p) => [p.id, p]));
        const selectedPlayers = startingXIIds.map((id) => squadMap.get(id)!);
        const gks = selectedPlayers.filter((p) => p.position === 'GK');
        expect(gks).toHaveLength(1);
      });
    });
  });

  describe('generateClub & AI Opponents', () => {
    it('generates complete club with valid squad and starting XI', () => {
      const club = generateClub({
        name: 'Thunderbolt FC',
        formation: '4-3-3',
        tactics: 'Attacking',
        seed: 777,
      });

      expect(club.name).toBe('Thunderbolt FC');
      expect(club.formation).toBe('4-3-3');
      expect(club.tactics).toBe('Attacking');
      expect(club.squad).toHaveLength(15);
      expect(club.startingXI).toHaveLength(11);

      const validation = validateSquadSelection(club.squad, club.startingXI, club.formation);
      expect(validation.valid).toBe(true);
    });

    it('createClubSnapshot resolves startingXI player objects accurately', () => {
      const club = generateClub('Metro United', '#2563EB', '#DBEAFE', 'badge-2', '4-4-2', 'Balanced', 888);
      const snapshot = createClubSnapshot(club);

      expect(snapshot.id).toBe(club.id);
      expect(snapshot.name).toBe('Metro United');
      expect(snapshot.formation).toBe('4-4-2');
      expect(snapshot.startingXI).toHaveLength(11);
      expect(snapshot.startingXI[0].attributes).toBeDefined();
      expect(snapshot.startingXI.every((p) => typeof p.name === 'string')).toBe(true);
    });

    it('generateAIOpponents creates valid preset clubs', () => {
      expect(PRESET_AI_CLUBS.length).toBeGreaterThanOrEqual(8);
      const opponents = generateAIOpponents(8, 999);

      expect(opponents).toHaveLength(8);
      const names = opponents.map((c) => c.name);
      expect(names).toContain('Thunderbolt FC');
      expect(names).toContain('Metro United');
      expect(names).toContain('Starlight Rovers');

      // Verify each opponent has valid formation and squad
      for (const club of opponents) {
        expect(club.squad).toHaveLength(15);
        expect(club.startingXI).toHaveLength(11);
        const validation = validateSquadSelection(club.squad, club.startingXI, club.formation);
        expect(validation.valid).toBe(true);
      }
    });
  });
});
