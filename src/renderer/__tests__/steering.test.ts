import { describe, it, expect } from 'vitest';
import {
  calculateSeparation,
  calculateOffsideLine,
  computeTeamTacticalTarget,
  TacticalPlayerInput,
  TacticalContext,
} from '../tactics/aiSteering';

describe('AI Tactical Steering (aiSteering.ts)', () => {
  const dummyPitchBounds = {
    left: 24,
    right: 456,
    top: 20,
    bottom: 250,
    centerX: 240,
    centerY: 135,
  };

  const samplePlayers: TacticalPlayerInput[] = [
    {
      id: 'h_gk',
      team: 'home',
      role: 'GK',
      isGK: true,
      baseX: 34,
      baseY: 135,
      currentX: 34,
      currentY: 135,
    },
    {
      id: 'h_cb',
      team: 'home',
      role: 'DEF',
      isGK: false,
      baseX: 80,
      baseY: 135,
      currentX: 80,
      currentY: 135,
    },
    {
      id: 'h_lb',
      team: 'home',
      role: 'DEF',
      isGK: false,
      baseX: 80,
      baseY: 50,
      currentX: 80,
      currentY: 50,
    },
    {
      id: 'h_st',
      team: 'home',
      role: 'ATT',
      isGK: false,
      baseX: 280,
      baseY: 135,
      currentX: 280,
      currentY: 135,
    },
    {
      id: 'a_cb1',
      team: 'away',
      role: 'DEF',
      isGK: false,
      baseX: 400,
      baseY: 120,
      currentX: 400,
      currentY: 120,
    },
    {
      id: 'a_cb2',
      team: 'away',
      role: 'DEF',
      isGK: false,
      baseX: 400,
      baseY: 150,
      currentX: 400,
      currentY: 150,
    },
    {
      id: 'a_gk',
      team: 'away',
      role: 'GK',
      isGK: true,
      baseX: 446,
      baseY: 135,
      currentX: 446,
      currentY: 135,
    },
  ];

  it('calculates separation force when two players are crowding each other', () => {
    const p1: TacticalPlayerInput = {
      id: 'p1',
      team: 'home',
      role: 'MID',
      isGK: false,
      baseX: 100,
      baseY: 100,
      currentX: 100,
      currentY: 100,
    };
    const p2: TacticalPlayerInput = {
      id: 'p2',
      team: 'home',
      role: 'MID',
      isGK: false,
      baseX: 105,
      baseY: 100,
      currentX: 105,
      currentY: 100,
    };

    const sep = calculateSeparation(p1, [p1, p2], 20);
    // p1 is to the left of p2, so repulsion should steer p1 negative X (away from p2)
    expect(sep.x).toBeLessThan(0);
    expect(sep.y).toBe(0);
  });

  it('calculates zero separation force when players are far apart', () => {
    const p1: TacticalPlayerInput = {
      id: 'p1',
      team: 'home',
      role: 'MID',
      isGK: false,
      baseX: 100,
      baseY: 100,
      currentX: 100,
      currentY: 100,
    };
    const p2: TacticalPlayerInput = {
      id: 'p2',
      team: 'home',
      role: 'MID',
      isGK: false,
      baseX: 200,
      baseY: 200,
      currentX: 200,
      currentY: 200,
    };

    const sep = calculateSeparation(p1, [p1, p2], 20);
    expect(sep.x).toBe(0);
    expect(sep.y).toBe(0);
  });

  it('calculates offside line correctly for attacking teams', () => {
    const defenders = samplePlayers.filter((p) => p.team === 'away');
    const offsideX = calculateOffsideLine(defenders, 'home');
    expect(offsideX).toBe(400);

    const homeDefenders = samplePlayers.filter((p) => p.team === 'home');
    const awayOffsideX = calculateOffsideLine(homeDefenders, 'away');
    expect(awayOffsideX).toBe(280); // max X of home outfield players
  });

  it('computes attacking striker run into final third during attack', () => {
    const context: TacticalContext = {
      ballX: 320,
      ballY: 135,
      attackingTeam: 'home',
      isShootingPhase: false,
      pitchBounds: dummyPitchBounds,
    };

    const striker = samplePlayers.find((p) => p.id === 'h_st')!;
    const res = computeTeamTacticalTarget(striker, samplePlayers, context);

    expect(res.state).toBe('MAKING_RUN');
    expect(res.targetX).toBeGreaterThan(striker.baseX);
  });

  it('computes primary presser and covering defender for defending team', () => {
    const context: TacticalContext = {
      ballX: 380,
      ballY: 125,
      attackingTeam: 'home',
      isShootingPhase: false,
      pitchBounds: dummyPitchBounds,
    };

    const defender1 = samplePlayers.find((p) => p.id === 'a_cb1')!;
    const res = computeTeamTacticalTarget(defender1, samplePlayers, context);

    expect(res.state).toBe('PRESSING');
  });

  it('clamps all player targets within pitch boundaries', () => {
    const context: TacticalContext = {
      ballX: 550, // Far outside right
      ballY: 350, // Far outside bottom
      attackingTeam: 'home',
      isShootingPhase: false,
      pitchBounds: dummyPitchBounds,
    };

    const striker = samplePlayers.find((p) => p.id === 'h_st')!;
    const res = computeTeamTacticalTarget(striker, samplePlayers, context);

    expect(res.targetX).toBeLessThanOrEqual(dummyPitchBounds.right - 8);
    expect(res.targetY).toBeLessThanOrEqual(dummyPitchBounds.bottom - 8);
  });

  it('reverses attacking direction and tactical runs in the second half', () => {
    // In second half, Home attacks left (towards X=24)
    const context2ndHalf: TacticalContext = {
      ballX: 180,
      ballY: 135,
      attackingTeam: 'home',
      isShootingPhase: false,
      isSecondHalf: true,
      pitchBounds: dummyPitchBounds,
    };

    const homeStrikerIn2ndHalf: TacticalPlayerInput = {
      id: 'h_st2',
      team: 'home',
      role: 'ATT',
      isGK: false,
      baseX: 200, // Defending right side, attacking left
      baseY: 135,
      currentX: 200,
      currentY: 135,
    };

    const res = computeTeamTacticalTarget(homeStrikerIn2ndHalf, [homeStrikerIn2ndHalf], context2ndHalf);
    expect(res.state).toBe('MAKING_RUN');
    // Target should push towards the left (negative X from base)
    expect(res.targetX).toBeLessThan(homeStrikerIn2ndHalf.baseX);

    // Offside line in 2nd half for Home attacking left
    const defenders = samplePlayers.filter((p) => p.team === 'away');
    const offside2ndHalf = calculateOffsideLine(defenders, 'home', true);
    expect(offside2ndHalf).toBe(400); // Away defenders furthest left
  });

  it('advances team progressively as ball progresses upfield', () => {
    const contextDeep: TacticalContext = {
      ballX: 80, // deep in own half
      ballY: 135,
      attackingTeam: 'home',
      isShootingPhase: false,
      isSecondHalf: false,
      pitchBounds: dummyPitchBounds,
    };

    const contextAdvanced: TacticalContext = {
      ballX: 400, // deep in opponent third
      ballY: 135,
      attackingTeam: 'home',
      isShootingPhase: false,
      isSecondHalf: false,
      pitchBounds: dummyPitchBounds,
    };

    const midfielder = samplePlayers.find((p) => p.id === 'h_cb')!; // testing outfield push
    const resDeep = computeTeamTacticalTarget(midfielder, samplePlayers, contextDeep);
    const resAdvanced = computeTeamTacticalTarget(midfielder, samplePlayers, contextAdvanced);

    // As ball advances, progressive push should push defender/midfielder further upfield
    expect(resAdvanced.targetX).toBeGreaterThan(resDeep.targetX);
  });
});
