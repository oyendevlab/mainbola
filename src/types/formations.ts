import { FormationSlot, FormationType, Player } from './index';

export const FORMATION_CONFIGS: Record<FormationType, FormationSlot[]> = {
  '4-3-3': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'DEF', label: 'LB', x: 18, y: 72 },
    { id: 'cb1', role: 'DEF', label: 'CB', x: 38, y: 74 },
    { id: 'cb2', role: 'DEF', label: 'CB', x: 62, y: 74 },
    { id: 'rb', role: 'DEF', label: 'RB', x: 82, y: 72 },
    { id: 'cm1', role: 'MID', label: 'CM', x: 28, y: 48 },
    { id: 'dm', role: 'MID', label: 'DM', x: 50, y: 56 },
    { id: 'cm2', role: 'MID', label: 'CM', x: 72, y: 48 },
    { id: 'lw', role: 'ATT', label: 'LW', x: 20, y: 24 },
    { id: 'st', role: 'ATT', label: 'ST', x: 50, y: 18 },
    { id: 'rw', role: 'ATT', label: 'RW', x: 80, y: 24 },
  ],
  '4-4-2': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'DEF', label: 'LB', x: 18, y: 72 },
    { id: 'cb1', role: 'DEF', label: 'CB', x: 38, y: 74 },
    { id: 'cb2', role: 'DEF', label: 'CB', x: 62, y: 74 },
    { id: 'rb', role: 'DEF', label: 'RB', x: 82, y: 72 },
    { id: 'lm', role: 'MID', label: 'LM', x: 18, y: 48 },
    { id: 'cm1', role: 'MID', label: 'CM', x: 38, y: 50 },
    { id: 'cm2', role: 'MID', label: 'CM', x: 62, y: 50 },
    { id: 'rm', role: 'MID', label: 'RM', x: 82, y: 48 },
    { id: 'st1', role: 'ATT', label: 'ST', x: 38, y: 20 },
    { id: 'st2', role: 'ATT', label: 'ST', x: 62, y: 20 },
  ],
  '4-2-3-1': [
    { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 88 },
    { id: 'lb', role: 'DEF', label: 'LB', x: 18, y: 74 },
    { id: 'cb1', role: 'DEF', label: 'CB', x: 38, y: 76 },
    { id: 'cb2', role: 'DEF', label: 'CB', x: 62, y: 76 },
    { id: 'rb', role: 'DEF', label: 'RB', x: 82, y: 74 },
    { id: 'cdm1', role: 'MID', label: 'DM', x: 36, y: 58 },
    { id: 'cdm2', role: 'MID', label: 'DM', x: 64, y: 58 },
    { id: 'lam', role: 'MID', label: 'LM', x: 22, y: 38 },
    { id: 'cam', role: 'MID', label: 'AM', x: 50, y: 34 },
    { id: 'ram', role: 'MID', label: 'RM', x: 78, y: 38 },
    { id: 'st', role: 'ATT', label: 'ST', x: 50, y: 18 },
  ],
};

export function validateSquadSelection(
  squad: Player[],
  startingXIIds: string[],
  formation: FormationType
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (startingXIIds.length !== 11) {
    errors.push(`Must select exactly 11 players. Currently selected: ${startingXIIds.length}`);
  }

  const uniqueIds = new Set(startingXIIds);
  if (uniqueIds.size !== startingXIIds.length) {
    errors.push('Starting XI contains duplicate players');
  }

  const squadMap = new Map(squad.map((p) => [p.id, p]));
  for (const id of startingXIIds) {
    if (!squadMap.has(id)) {
      errors.push(`Selected player ID ${id} is not in the club squad`);
    }
  }

  // Validate Goalkeeper
  const selectedPlayers = startingXIIds
    .map((id) => squadMap.get(id))
    .filter((p): p is Player => Boolean(p));

  const gks = selectedPlayers.filter((p) => p.position === 'GK');
  if (gks.length !== 1) {
    errors.push(`Lineup must have exactly 1 Goalkeeper. Found: ${gks.length}`);
  }

  // Check required positions for the formation
  const formationSlots = FORMATION_CONFIGS[formation];
  if (!formationSlots) {
    errors.push(`Unknown formation: ${formation}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
