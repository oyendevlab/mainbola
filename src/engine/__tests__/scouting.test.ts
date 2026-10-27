import { describe, it, expect } from 'vitest';
import { generateScoutingReport } from '../scouting';
import { generateClub, createClubSnapshot } from '../generator';

describe('Opposition Scouting Report Engine (scouting.ts)', () => {
  const opponentClub = generateClub(
    'Kelantan Warriors',
    '#DC2626',
    '#FFFFFF',
    'badge-1',
    '4-3-3',
    'Attacking',
    9999
  );
  const snapshot = createClubSnapshot(opponentClub);

  it('generates complete tactical report', () => {
    const report = generateScoutingReport(snapshot);

    expect(report.opponentName).toBe('Kelantan Warriors');
    expect(report.opponentFormation).toBe('4-3-3');
    expect(report.opponentTactics).toBe('Attacking');
    expect(report.teamStrengthAverage).toBeGreaterThan(60);
  });

  it('identifies key threat with danger level', () => {
    const report = generateScoutingReport(snapshot);

    expect(report.keyThreat).toBeDefined();
    expect(report.keyThreat.player).toBeDefined();
    expect(['Sederhana', 'Tinggi', 'Bahaya Kritikal']).toContain(report.keyThreat.dangerLevel);
    expect(report.keyThreat.threatDescription.length).toBeGreaterThan(20);
  });

  it('recommends counter-tactics against Attacking opponent', () => {
    const report = generateScoutingReport(snapshot);

    // Against Attacking, system recommends Defensive counter
    expect(report.counterTacticsAdvice.recommendedTactics).toBe('Defensive');
    expect(report.counterTacticsAdvice.tacticalTip).toContain('counter-attack');
    expect(report.dangerZone).toBeDefined();
  });
});
