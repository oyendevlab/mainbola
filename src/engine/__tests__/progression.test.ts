import { describe, it, expect } from 'vitest';
import { generateClub, generatePlayer } from '../generator';
import {
  trainPlayer,
  applyMatchFatigue,
  fullSquadPhysioRecovery,
} from '../training';
import {
  generateTransferMarket,
  executeBuyPlayer,
  executeSellPlayer,
  MIN_SQUAD_SIZE,
} from '../transfers';
import { createPRNG } from '../prng';

describe('Player Progression & Training Engine (training.ts)', () => {
  it('increases primary attribute and recalculates overall rating and market value', () => {
    const prng = createPRNG(12345);
    const player = generatePlayer('ATT', { prng, baseLevel: 70 });
    const initialAttack = player.attributes.attack;
    const initialRating = player.overallRating;

    const { player: trained, result } = trainPlayer(player, 'ATTACKING', prng);

    expect(trained.attributes.attack).toBeGreaterThanOrEqual(initialAttack);
    expect(result.statGains.attack).toBeGreaterThanOrEqual(1);
    expect(trained.trainingXp).toBeGreaterThan(0);
    expect(trained.overallRating).toBeGreaterThanOrEqual(initialRating);
    expect(trained.marketValue).toBeGreaterThanOrEqual(player.marketValue ?? 0);
  });

  it('restores player fitness with PHYSIO drill', () => {
    const player = generatePlayer('MID', { baseLevel: 75 });
    player.fitness = 45;

    const { player: recovered, result } = trainPlayer(player, 'PHYSIO');

    expect(recovered.fitness).toBe(80); // 45 + 35
    expect(result.newFitness).toBe(80);
    expect(recovered.attributes.passing).toBe(player.attributes.passing);
  });

  it('applies match fatigue to starters and natural recovery to bench', () => {
    const club = generateClub({ seed: 777 });
    expect(club.squad.length).toBe(15);
    expect(club.startingXI.length).toBe(11);

    // Initial fitness is 100 for all
    const fatiguedSquad = applyMatchFatigue(club.squad, club.startingXI);

    const starters = fatiguedSquad.filter((p) => club.startingXI.includes(p.id));
    const bench = fatiguedSquad.filter((p) => !club.startingXI.includes(p.id));

    starters.forEach((p) => {
      expect(p.fitness).toBeLessThan(100);
      expect(p.fitness).toBeGreaterThanOrEqual(20);
    });

    bench.forEach((p) => {
      expect(p.fitness).toBe(100); // Already at 100 max
    });
  });

  it('restores all players to 100% fitness with fullSquadPhysioRecovery', () => {
    const club = generateClub({ seed: 888 });
    club.squad = club.squad.map((p) => ({ ...p, fitness: 40 }));

    const recovered = fullSquadPhysioRecovery(club.squad);
    recovered.forEach((p) => {
      expect(p.fitness).toBe(100);
    });
  });
});

describe('Transfer Market & Scouting Engine (transfers.ts)', () => {
  it('generates a diverse pool of scout targets with realistic fees and reports', () => {
    const prng = createPRNG(999);
    const market = generateTransferMarket(prng, 6);

    expect(market.length).toBe(6);
    market.forEach((target) => {
      expect(target.id).toBeDefined();
      expect(target.player).toBeDefined();
      expect(target.fee).toBeGreaterThan(5000);
      expect(target.scoutReport.length).toBeGreaterThan(10);
      expect(target.age).toBeGreaterThanOrEqual(18);
      expect(target.potentialRating).toBeGreaterThanOrEqual(target.player.overallRating);
    });
  });

  it('buys a player from transfer market with budget deduction', () => {
    const club = generateClub({ seed: 101 });
    club.budget = 80000;
    const initialSquadCount = club.squad.length;

    const target = generateTransferMarket(createPRNG(42), 1)[0];
    const outcome = executeBuyPlayer(club, target);

    expect(outcome.success).toBe(true);
    expect(outcome.club.budget).toBe(80000 - target.fee);
    expect(outcome.club.squad.length).toBe(initialSquadCount + 1);
    expect(outcome.club.squad.some((p) => p.id === target.player.id)).toBe(true);
  });

  it('rejects player purchase if club has insufficient funds', () => {
    const club = generateClub({ seed: 102 });
    club.budget = 1000;

    const target = generateTransferMarket(createPRNG(42), 1)[0];
    const outcome = executeBuyPlayer(club, target);

    expect(outcome.success).toBe(false);
    expect(outcome.message).toContain('Insufficient funds');
  });

  it('sells a player, credits budget, and adjusts starting lineup if necessary', () => {
    const club = generateClub({ seed: 103 });
    club.budget = 20000;
    const playerToSell = club.squad[0];
    const initialSquadCount = club.squad.length;

    const outcome = executeSellPlayer(club, playerToSell.id);

    expect(outcome.success).toBe(true);
    expect(outcome.salePrice).toBeGreaterThan(0);
    expect(outcome.club.budget).toBe(20000 + outcome.salePrice);
    expect(outcome.club.squad.length).toBe(initialSquadCount - 1);
    expect(outcome.club.squad.some((p) => p.id === playerToSell.id)).toBe(false);
  });

  it('enforces minimum squad size constraint when selling players', () => {
    const club = generateClub({ seed: 104 });
    // Trim squad to MIN_SQUAD_SIZE (12)
    club.squad = club.squad.slice(0, MIN_SQUAD_SIZE);

    const outcome = executeSellPlayer(club, club.squad[0].id);

    expect(outcome.success).toBe(false);
    expect(outcome.message).toContain('Squad too small');
  });
});
