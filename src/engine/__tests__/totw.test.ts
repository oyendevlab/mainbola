import { describe, it, expect } from 'vitest';
import { generateTeamOfTheWeek, applyTOTWHonor } from '../totw';
import { generateClub } from '../generator';

describe('Team of the Week Engine (totw.ts)', () => {
  const userClub = generateClub('Harimau FC', '#10B981', '#FFFFFF', 'badge-1', '4-3-3', 'Balanced', 123);

  it('selects exactly 11 players in a 4-3-3 formation', () => {
    const totw = generateTeamOfTheWeek(userClub, [], 1);

    expect(totw.formation).toBe('4-3-3');
    expect(totw.players.length).toBe(11);

    const gks = totw.players.filter((p) => p.position === 'GK');
    const defs = totw.players.filter((p) => p.position === 'DEF');
    const mids = totw.players.filter((p) => p.position === 'MID');
    const atts = totw.players.filter((p) => p.position === 'ATT');

    expect(gks.length).toBe(1);
    expect(defs.length).toBe(4);
    expect(mids.length).toBe(3);
    expect(atts.length).toBe(3);
  });

  it('applies TOTW honors: max morale and +50 XP bonus', () => {
    const player = userClub.squad[0];
    const initialXp = player.trainingXp ?? 0;

    const honored = applyTOTWHonor(player);

    expect(honored.isTOTW).toBe(true);
    expect(honored.morale).toBe(100);
    expect(honored.trainingXp).toBe(initialXp + 50);
  });
});
