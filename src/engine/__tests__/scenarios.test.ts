import { describe, it, expect } from 'vitest';
import { executeScenarioChallenge, getScenarioById } from '../scenarios';
import { SCENARIO_PRESETS } from '../../types/scenarios';
import { generateClub } from '../generator';

describe('Scenario Challenge Mode (scenarios.ts)', () => {
  const userClub = generateClub('Singa Utara', '#0284C7', '#FFFFFF', 'badge-2', '4-3-3', 'Attacking', 888);

  it('contains valid scenario presets with defined objectives and rewards', () => {
    expect(SCENARIO_PRESETS.length).toBeGreaterThanOrEqual(3);

    SCENARIO_PRESETS.forEach((preset) => {
      expect(preset.id).toBeDefined();
      expect(preset.title).toBeDefined();
      expect(preset.creditReward).toBeGreaterThan(0);
      expect(['draw_or_win', 'clean_sheet_win', 'win']).toContain(preset.targetGoal);
    });
  });

  it('finds scenario by ID', () => {
    const scen = getScenarioById('comeback_miracle');
    expect(scen).toBeDefined();
    expect(scen?.startingMinute).toBe(70);
  });

  it('executes a scenario challenge and returns structured result', () => {
    const scen = SCENARIO_PRESETS[0];
    const result = executeScenarioChallenge(userClub, scen, 4242);

    expect(result.scenario.id).toBe(scen.id);
    expect(typeof result.success).toBe('boolean');
    expect(result.matchResult.events.length).toBeGreaterThan(0);
    expect(result.objectiveSummary.length).toBeGreaterThan(10);
  });
});
