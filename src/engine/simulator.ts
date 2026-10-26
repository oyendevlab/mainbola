import {
  Club,
  ClubSnapshot,
  MatchEvent,
  MatchResult,
  Player,
  PlayerPosition,
  TacticalStyle,
  TeamMatchStats,
} from '../types';
import { createClubSnapshot } from './generator';
import { createPRNG, PRNG } from './prng';

interface TeamTacticalModifiers {
  shotFrequency: number;
  turnoverRisk: number;
  tackleBonus: number;
  saveBonus: number;
  possessionBias: number;
}

function getTacticalModifiers(tactics: TacticalStyle): TeamTacticalModifiers {
  switch (tactics) {
    case 'Attacking':
      return {
        shotFrequency: 1.45,
        turnoverRisk: 1.35,
        tackleBonus: 0.90,
        saveBonus: 0.92,
        possessionBias: 1.15,
      };
    case 'Defensive':
      return {
        shotFrequency: 0.65,
        turnoverRisk: 0.70,
        tackleBonus: 1.30,
        saveBonus: 1.25,
        possessionBias: 0.85,
      };
    case 'Balanced':
    default:
      return {
        shotFrequency: 1.0,
        turnoverRisk: 1.0,
        tackleBonus: 1.0,
        saveBonus: 1.0,
        possessionBias: 1.0,
      };
  }
}

interface TeamStrengths {
  attack: number;
  midfield: number;
  defense: number;
  goalkeeping: number;
}

function calculateTeamStrengths(startingXI: Player[]): TeamStrengths {
  const gks = startingXI.filter((p) => p.position === 'GK');
  const defs = startingXI.filter((p) => p.position === 'DEF');
  const mids = startingXI.filter((p) => p.position === 'MID');
  const atts = startingXI.filter((p) => p.position === 'ATT');

  const avgRating = (players: Player[], defaultVal = 65) =>
    players.length > 0
      ? players.reduce((sum, p) => sum + p.overallRating, 0) / players.length
      : defaultVal;

  const avgGk = gks.length > 0
    ? gks.reduce((sum, p) => sum + p.attributes.goalkeeping, 0) / gks.length
    : 65;

  return {
    attack: avgRating(atts, 68) * 0.7 + avgRating(mids, 68) * 0.3,
    midfield: avgRating(mids, 68) * 0.8 + avgRating(defs, 68) * 0.2,
    defense: avgRating(defs, 68) * 0.75 + avgRating(mids, 68) * 0.25,
    goalkeeping: avgGk,
  };
}

// Commentary templates for varied match events
const GOAL_TEMPLATES = [
  '{player} unleashes an unstoppable rocket into the top corner!',
  '{player} taps it in after a brilliant assist from {secondary}!',
  '{player} slides a clinical low finish past the goalkeeper!',
  '{player} rises highest to head home a pinpoint cross from {secondary}!',
  '{player} strikes from the edge of the box and finds the bottom right corner!',
  'Spectacular solo effort by {player}, beating two defenders before scoring!',
];

const SAVE_TEMPLATES = [
  'Sensational diving save by {secondary} to deny {player}!',
  '{secondary} shows lightning-quick reflexes with a fingertip save!',
  'Crucial point-blank stop by {secondary} keeping {player} out!',
  '{secondary} parries a fierce drive from {player} away to safety!',
];

const SHOT_WIDE_TEMPLATES = [
  '{player} fires from distance, but it sails just over the crossbar.',
  '{player} pulls the trigger from the edge of the box, drifting wide of the post.',
  '{player} strikes first time, but sends the ball high into the stands.',
  '{player} tries a curling effort, narrowly missing the top angle.',
];

const PASS_TEMPLATES = [
  '{player} delivers a crisp through ball finding {secondary} in space.',
  'Smooth midfield interchange as {player} finds {secondary}.',
  '{player} switches play across the pitch with a looping ball to {secondary}.',
  '{player} slips an incisive pass through the defensive line to {secondary}.',
];

const TACKLE_TEMPLATES = [
  'Superb sliding tackle by {secondary} to dispossess {player}!',
  '{secondary} times the challenge to perfection, stopping the counter-attack.',
  'Strong defensive intervention from {secondary} to win the ball cleanly.',
];

const INTERCEPTION_TEMPLATES = [
  '{player} reads the play brilliantly and cuts out the pass.',
  'Smart positional anticipation by {player} to intercept the dangerous ball.',
  '{player} snuffs out the attack with an alert interception.',
];

const TURNOVER_TEMPLATES = [
  '{player} loses control of the ball under heavy pressure.',
  'Misplaced pass by {player} runs straight into the opposition.',
  'Heavy touch from {player} allows the defense to regain possession.',
];

function pickPlayerByPosition(
  players: Player[],
  positions: PlayerPosition[],
  prng: PRNG
): Player {
  const matching = players.filter((p) => positions.includes(p.position));
  if (matching.length > 0) {
    return prng.pick(matching);
  }
  return prng.pick(players);
}

function resolveClubSnapshot(club: ClubSnapshot | Club): ClubSnapshot {
  if ('squad' in club && Array.isArray((club as Club).squad)) {
    return createClubSnapshot(club as Club);
  }
  return club as ClubSnapshot;
}

/**
 * Deterministic match simulation engine for GOAL RUSH.
 * Same clubs + same seed = IDENTICAL scores, events, and stats.
 */
export function simulateMatch(
  homeClubInput: ClubSnapshot | Club,
  awayClubInput: ClubSnapshot | Club,
  seed: number
): MatchResult {
  const prng = createPRNG(seed);
  const homeClub = resolveClubSnapshot(homeClubInput);
  const awayClub = resolveClubSnapshot(awayClubInput);

  const homeTactics = getTacticalModifiers(homeClub.tactics);
  const awayTactics = getTacticalModifiers(awayClub.tactics);

  const homeStrengths = calculateTeamStrengths(homeClub.startingXI);
  const awayStrengths = calculateTeamStrengths(awayClub.startingXI);

  const homeGK =
    homeClub.startingXI.find((p) => p.position === 'GK') || homeClub.startingXI[0];
  const awayGK =
    awayClub.startingXI.find((p) => p.position === 'GK') || awayClub.startingXI[0];

  const events: MatchEvent[] = [];
  let eventSeq = 1;

  let currentHomeScore = 0;
  let currentAwayScore = 0;

  let homePasses = 0;
  let awayPasses = 0;
  let homeShots = 0;
  let awayShots = 0;
  let homeShotsOnTarget = 0;
  let awayShotsOnTarget = 0;
  let homeTackles = 0;
  let awayTackles = 0;
  let homeSaves = 0;
  let awaySaves = 0;
  let homePossessionTicks = 0;
  let awayPossessionTicks = 0;

  // Stoppage time for halves
  const stoppageFirstHalf = prng.nextInt(1, 2);
  const stoppageSecondHalf = prng.nextInt(2, 4);

  let currentTotalSeconds = 0;

  const pushEvent = (eventData: Omit<MatchEvent, 'id' | 'homeScore' | 'awayScore'>) => {
    events.push({
      id: `evt_${seed}_${eventSeq++}`,
      ...eventData,
      homeScore: currentHomeScore,
      awayScore: currentAwayScore,
    });
  };

  // Helper to advance time realistically
  const advanceTime = (minSec: number, maxSec: number) => {
    currentTotalSeconds += prng.nextInt(minSec, maxSec);
  };

  const getMinuteSecond = () => {
    const minute = Math.floor(currentTotalSeconds / 60);
    const second = currentTotalSeconds % 60;
    return { minute, second };
  };

  // Clamp coordinates inside pitch boundaries
  const clampCoord = (val: number) => Math.max(2, Math.min(98, Math.round(val * 10) / 10));

  // Determine starting team with ball
  let attackingTeamId = homeClub.id;

  // --- 1ST HALF KICKOFF ---
  currentTotalSeconds = 0;
  pushEvent({
    minute: 0,
    second: 0,
    type: 'KICKOFF',
    teamId: homeClub.id,
    playerId: pickPlayerByPosition(homeClub.startingXI, ['ATT', 'MID'], prng).id,
    playerName: pickPlayerByPosition(homeClub.startingXI, ['ATT', 'MID'], prng).name,
    description: `Kickoff! ${homeClub.name} gets the first half underway.`,
    fromCoords: { x: 50, y: 50 },
    toCoords: { x: 48, y: 55 },
  });
  homePossessionTicks += 5;

  // Simulation loop across two halves
  const simulatePossessionPhase = (half: 1 | 2) => {
    const isHome = attackingTeamId === homeClub.id;
    const attackingClub = isHome ? homeClub : awayClub;
    const defendingClub = isHome ? awayClub : homeClub;
    const attackingTactics = isHome ? homeTactics : awayTactics;
    const defendingTactics = isHome ? awayTactics : homeTactics;
    const attackingStrengths = isHome ? homeStrengths : awayStrengths;
    const defendingStrengths = isHome ? awayStrengths : homeStrengths;
    const defendingGK = isHome ? awayGK : homeGK;

    // Track possession ticks
    if (isHome) homePossessionTicks += 10;
    else awayPossessionTicks += 10;

    advanceTime(20, 65);
    const { minute, second } = getMinuteSecond();

    // Direction of attack (in half 1: home attacks towards y=5, away towards y=95; half 2 swapped)
    const attackDir = half === 1 ? (isHome ? -1 : 1) : (isHome ? 1 : -1);
    const baseAttackY = attackDir < 0 ? 30 : 70;
    const goalY = attackDir < 0 ? 4 : 96;

    // Decision: Passing sequence vs Turnover/Tackle vs Shot
    // Passing sequence
    const passSuccessProb =
      0.72 +
      (attackingStrengths.midfield - defendingStrengths.defense) * 0.0025;

    const passer = pickPlayerByPosition(attackingClub.startingXI, ['MID', 'DEF', 'ATT'], prng);
    const receiver = pickPlayerByPosition(
      attackingClub.startingXI.filter((p) => p.id !== passer.id),
      ['MID', 'ATT'],
      prng
    );

    if (prng.chance(passSuccessProb)) {
      // Successful pass
      if (isHome) homePasses++;
      else awayPasses++;

      const fromX = clampCoord(prng.nextFloat(25, 75));
      const fromY = clampCoord(baseAttackY + (attackDir < 0 ? 20 : -20));
      const toX = clampCoord(prng.nextFloat(20, 80));
      const toY = clampCoord(baseAttackY);

      const passTemplate = prng.pick(PASS_TEMPLATES);
      const desc = passTemplate
        .replace('{player}', passer.name)
        .replace('{secondary}', receiver.name);

      pushEvent({
        minute,
        second,
        type: 'PASS',
        teamId: attackingClub.id,
        playerId: passer.id,
        playerName: passer.name,
        secondaryPlayerId: receiver.id,
        secondaryPlayerName: receiver.name,
        description: desc,
        fromCoords: { x: fromX, y: fromY },
        toCoords: { x: toX, y: toY },
      });

      // After a good pass in the attacking third, check for Shot Opportunity
      const shotChance =
        0.38 * attackingTactics.shotFrequency * (attackingStrengths.attack / 70);

      if (prng.chance(shotChance)) {
        advanceTime(5, 18);
        const shotTime = getMinuteSecond();

        const shooter = prng.chance(0.7)
          ? pickPlayerByPosition(attackingClub.startingXI, ['ATT'], prng)
          : receiver;

        if (isHome) homeShots++;
        else awayShots++;

        const shotX = clampCoord(prng.nextFloat(30, 70));
        const shotY = clampCoord(baseAttackY + prng.nextFloat(-5, 5));
        const targetX = clampCoord(prng.nextFloat(45, 55));

        // Is shot on target?
        const onTargetProb =
          0.44 + (shooter.attributes.attack - 70) * 0.004;

        if (prng.chance(onTargetProb)) {
          // Shot ON TARGET
          if (isHome) homeShotsOnTarget++;
          else awayShotsOnTarget++;

          // Goal vs Save calculation
          const shotQuality = shooter.attributes.attack * prng.nextFloat(0.85, 1.25);
          const saveQuality =
            defendingGK.attributes.goalkeeping *
            defendingTactics.saveBonus *
            prng.nextFloat(0.85, 1.25);

          if (shotQuality > saveQuality) {
            // --- GOAL ---
            if (isHome) currentHomeScore++;
            else currentAwayScore++;

            const goalTemplate = prng.pick(GOAL_TEMPLATES);
            const goalDesc = goalTemplate
              .replace('{player}', shooter.name)
              .replace('{secondary}', passer.name);

            pushEvent({
              minute: shotTime.minute,
              second: shotTime.second,
              type: 'GOAL',
              teamId: attackingClub.id,
              playerId: shooter.id,
              playerName: shooter.name,
              secondaryPlayerId: passer.id,
              secondaryPlayerName: passer.name,
              description: `GOAL! ${goalDesc}`,
              fromCoords: { x: shotX, y: shotY },
              toCoords: { x: targetX, y: goalY },
            });

            // Conceding team restarts play from kickoff
            advanceTime(45, 60);
            const restartTime = getMinuteSecond();
            attackingTeamId = defendingClub.id;

            pushEvent({
              minute: restartTime.minute,
              second: restartTime.second,
              type: 'KICKOFF',
              teamId: defendingClub.id,
              playerId: pickPlayerByPosition(defendingClub.startingXI, ['ATT', 'MID'], prng).id,
              playerName: pickPlayerByPosition(defendingClub.startingXI, ['ATT', 'MID'], prng).name,
              description: `Play restarts with ${defendingClub.name} kicking off after the goal.`,
              fromCoords: { x: 50, y: 50 },
              toCoords: { x: 52, y: 48 },
            });
            return;
          } else {
            // --- SAVE ---
            if (isHome) awaySaves++;
            else homeSaves++;

            const saveTemplate = prng.pick(SAVE_TEMPLATES);
            const saveDesc = saveTemplate
              .replace('{player}', shooter.name)
              .replace('{secondary}', defendingGK.name);

            pushEvent({
              minute: shotTime.minute,
              second: shotTime.second,
              type: 'SAVE',
              teamId: defendingClub.id,
              playerId: defendingGK.id,
              playerName: defendingGK.name,
              secondaryPlayerId: shooter.id,
              secondaryPlayerName: shooter.name,
              description: saveDesc,
              fromCoords: { x: shotX, y: shotY },
              toCoords: { x: targetX, y: goalY },
            });

            // Turnover to goalkeeper
            attackingTeamId = defendingClub.id;
            return;
          }
        } else {
          // Shot Off-Target
          const wideTemplate = prng.pick(SHOT_WIDE_TEMPLATES);
          const wideDesc = wideTemplate.replace('{player}', shooter.name);

          pushEvent({
            minute: shotTime.minute,
            second: shotTime.second,
            type: 'SHOT',
            teamId: attackingClub.id,
            playerId: shooter.id,
            playerName: shooter.name,
            description: wideDesc,
            fromCoords: { x: shotX, y: shotY },
            toCoords: { x: targetX > 50 ? 60 : 40, y: goalY },
          });

          // Goal kick to defending team
          attackingTeamId = defendingClub.id;
          return;
        }
      }
    } else {
      // Defensive intervention: TACKLE, INTERCEPTION, or TURNOVER
      const defender = pickPlayerByPosition(defendingClub.startingXI, ['DEF', 'MID'], prng);
      const actionRoll = prng.next();

      const defX = clampCoord(prng.nextFloat(20, 80));
      const defY = clampCoord(baseAttackY);

      if (actionRoll < 0.45) {
        // TACKLE
        if (isHome) awayTackles++;
        else homeTackles++;

        const tackleTemplate = prng.pick(TACKLE_TEMPLATES);
        const tackleDesc = tackleTemplate
          .replace('{player}', passer.name)
          .replace('{secondary}', defender.name);

        pushEvent({
          minute,
          second,
          type: 'TACKLE',
          teamId: defendingClub.id,
          playerId: defender.id,
          playerName: defender.name,
          secondaryPlayerId: passer.id,
          secondaryPlayerName: passer.name,
          description: tackleDesc,
          fromCoords: { x: defX, y: defY },
          toCoords: { x: defX + prng.nextFloat(-5, 5), y: defY + prng.nextFloat(-5, 5) },
        });
      } else if (actionRoll < 0.8) {
        // INTERCEPTION
        const interceptTemplate = prng.pick(INTERCEPTION_TEMPLATES);
        const interceptDesc = interceptTemplate.replace('{player}', defender.name);

        pushEvent({
          minute,
          second,
          type: 'INTERCEPTION',
          teamId: defendingClub.id,
          playerId: defender.id,
          playerName: defender.name,
          description: interceptDesc,
          fromCoords: { x: defX, y: defY },
          toCoords: { x: defX + prng.nextFloat(-8, 8), y: defY + prng.nextFloat(-8, 8) },
        });
      } else {
        // TURNOVER
        const turnoverTemplate = prng.pick(TURNOVER_TEMPLATES);
        const turnoverDesc = turnoverTemplate.replace('{player}', passer.name);

        pushEvent({
          minute,
          second,
          type: 'TURNOVER',
          teamId: attackingClub.id,
          playerId: passer.id,
          playerName: passer.name,
          description: turnoverDesc,
          fromCoords: { x: defX, y: defY },
          toCoords: { x: defX + prng.nextFloat(-5, 5), y: defY + prng.nextFloat(-5, 5) },
        });
      }

      // Possession switches to defending team
      attackingTeamId = defendingClub.id;
    }
  };

  // --- RUN 1ST HALF ---
  const firstHalfEndSeconds = (45 + stoppageFirstHalf) * 60;
  while (currentTotalSeconds < firstHalfEndSeconds - 40) {
    simulatePossessionPhase(1);
  }

  // --- HALFTIME WHISTLE ---
  currentTotalSeconds = firstHalfEndSeconds;
  const halfTimeInfo = getMinuteSecond();
  pushEvent({
    minute: halfTimeInfo.minute,
    second: halfTimeInfo.second,
    type: 'HALFTIME',
    teamId: homeClub.id,
    description: `Half-time whistle blows! ${homeClub.name} ${currentHomeScore} - ${currentAwayScore} ${awayClub.name}.`,
    fromCoords: { x: 50, y: 50 },
    toCoords: { x: 50, y: 50 },
  });

  // --- 2ND HALF KICKOFF ---
  // Advance into 2nd half starting at minute 45 + stoppage (or at least strictly non-decreasing)
  currentTotalSeconds += 15;
  const secondKickTime = getMinuteSecond();
  attackingTeamId = awayClub.id;

  pushEvent({
    minute: secondKickTime.minute,
    second: secondKickTime.second,
    type: 'KICKOFF',
    teamId: awayClub.id,
    playerId: pickPlayerByPosition(awayClub.startingXI, ['ATT', 'MID'], prng).id,
    playerName: pickPlayerByPosition(awayClub.startingXI, ['ATT', 'MID'], prng).name,
    description: `Second half begins! ${awayClub.name} takes the kickoff.`,
    fromCoords: { x: 50, y: 50 },
    toCoords: { x: 52, y: 46 },
  });
  awayPossessionTicks += 5;

  // --- RUN 2ND HALF ---
  const secondHalfEndSeconds = (90 + stoppageSecondHalf) * 60;
  while (currentTotalSeconds < secondHalfEndSeconds - 40) {
    simulatePossessionPhase(2);
  }

  // --- FULLTIME WHISTLE ---
  currentTotalSeconds = secondHalfEndSeconds;
  const fullTimeInfo = getMinuteSecond();
  pushEvent({
    minute: fullTimeInfo.minute,
    second: fullTimeInfo.second,
    type: 'FULLTIME',
    teamId: homeClub.id,
    description: `Full-time! Final score: ${homeClub.name} ${currentHomeScore} - ${currentAwayScore} ${awayClub.name}.`,
    fromCoords: { x: 50, y: 50 },
    toCoords: { x: 50, y: 50 },
  });

  // Ensure chronological order strictly non-decreasing
  events.sort((a, b) => {
    const aTime = a.minute * 60 + (a.second ?? 0);
    const bTime = b.minute * 60 + (b.second ?? 0);
    return aTime - bTime;
  });

  // Calculate clean, normalized possession percentages summing to 100%
  const totalTicks = Math.max(1, homePossessionTicks + awayPossessionTicks);
  const rawHomePossession = Math.round((homePossessionTicks / totalTicks) * 100);
  const homePossession = Math.max(20, Math.min(80, rawHomePossession));
  const awayPossession = 100 - homePossession;

  const homeStats: TeamMatchStats = {
    shots: homeShots,
    shotsOnTarget: homeShotsOnTarget,
    possession: homePossession,
    passes: homePasses,
    tackles: homeTackles,
    saves: homeSaves,
  };

  const awayStats: TeamMatchStats = {
    shots: awayShots,
    shotsOnTarget: awayShotsOnTarget,
    possession: awayPossession,
    passes: awayPasses,
    tackles: awayTackles,
    saves: awaySaves,
  };

  return {
    id: `match_${seed}_${homeClub.id}_vs_${awayClub.id}`,
    seed,
    timestamp: 1700000000000 + (seed % 10000000),
    homeClub,
    awayClub,
    homeScore: currentHomeScore,
    awayScore: currentAwayScore,
    homeStats,
    awayStats,
    events,
  };
}
