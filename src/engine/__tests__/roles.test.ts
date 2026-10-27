import { describe, it, expect } from 'vitest';
import {
  ROLE_DEFINITIONS,
  getDefaultRoleForPosition,
  getRolesForPosition,
} from '../../types/roles';

describe('Player Tactical Roles (roles.ts)', () => {
  it('returns valid roles for each position', () => {
    const attRoles = getRolesForPosition('ATT');
    expect(attRoles.length).toBe(3);
    expect(attRoles.map((r) => r.id)).toContain('Poacher');
    expect(attRoles.map((r) => r.id)).toContain('Target Man');
    expect(attRoles.map((r) => r.id)).toContain('False 9');

    const midRoles = getRolesForPosition('MID');
    expect(midRoles.length).toBe(3);
    expect(midRoles.map((r) => r.id)).toContain('Playmaker');
    expect(midRoles.map((r) => r.id)).toContain('Box-to-Box');
    expect(midRoles.map((r) => r.id)).toContain('Ball-Winner');

    const defRoles = getRolesForPosition('DEF');
    expect(defRoles.length).toBe(2);
    expect(defRoles.map((r) => r.id)).toContain('Stopper');
    expect(defRoles.map((r) => r.id)).toContain('Ball-Playing Defender');

    const gkRoles = getRolesForPosition('GK');
    expect(gkRoles.length).toBe(2);
    expect(gkRoles.map((r) => r.id)).toContain('Sweeper Keeper');
    expect(gkRoles.map((r) => r.id)).toContain('Traditional');
  });

  it('provides sensible default roles', () => {
    expect(getDefaultRoleForPosition('ATT')).toBe('Poacher');
    expect(getDefaultRoleForPosition('MID')).toBe('Playmaker');
    expect(getDefaultRoleForPosition('DEF')).toBe('Stopper');
    expect(getDefaultRoleForPosition('GK')).toBe('Traditional');
  });

  it('contains comprehensive role metadata and bonuses', () => {
    Object.values(ROLE_DEFINITIONS).forEach((roleDef) => {
      expect(roleDef.name).toBeDefined();
      expect(roleDef.description.length).toBeGreaterThan(10);
      expect(roleDef.icon).toBeDefined();
      expect(roleDef.statBonusText).toContain('%');
    });
  });
});
