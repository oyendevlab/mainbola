import { Club, MatchEvent, MatchResult } from '../types';
import { ScenarioDefinition, SCENARIO_PRESETS } from '../types/scenarios';
import { createClubSnapshot, generateClub } from './generator';
import { simulateMatch } from './simulator';

export interface ScenarioExecutionResult {
  scenario: ScenarioDefinition;
  success: boolean;
  matchResult: MatchResult;
  rewardEarned: number;
  objectiveSummary: string;
}

/**
 * Executes a scenario match challenge deterministically.
 */
export function executeScenarioChallenge(
  userClub: Club,
  scenario: ScenarioDefinition,
  seed = Date.now()
): ScenarioExecutionResult {
  // 1. Generate Opponent Club from scenario definition
  const opponentClub = generateClub(
    scenario.opponentName,
    '#EF4444',
    '#FFFFFF',
    'badge-5',
    scenario.opponentFormation,
    scenario.opponentTactics,
    seed + 42
  );

  const homeSnapshot = createClubSnapshot(userClub);
  const awaySnapshot = createClubSnapshot(opponentClub);

  // 2. Simulate match using the deterministic match engine
  const baseResult = simulateMatch(homeSnapshot, awaySnapshot, seed);

  // 3. Synthesize scenario initial state into event timeline
  const synthesizedEvents: MatchEvent[] = [];

  // Add initial scenario backstory events prior to startingMinute
  if (scenario.initialAwayScore > 0) {
    synthesizedEvents.push({
      id: 'scen_ev_away_1',
      minute: Math.min(22, scenario.startingMinute - 10),
      type: 'GOAL',
      teamId: opponentClub.id,
      playerName: opponentClub.squad[opponentClub.squad.length - 1]?.name || 'Penyerang Lawan',
      description: `Gol awal pihak lawan oleh ${opponentClub.name}!`,
      homeScore: 0,
      awayScore: 1,
    });
  }

  if (scenario.initialAwayScore > 1) {
    synthesizedEvents.push({
      id: 'scen_ev_away_2',
      minute: Math.min(54, scenario.startingMinute - 5),
      type: 'GOAL',
      teamId: opponentClub.id,
      playerName: opponentClub.squad[opponentClub.squad.length - 2]?.name || 'Pemain Lawan',
      description: `Gol kedua pihak lawan menggandakan kelebihan.`,
      homeScore: 0,
      awayScore: 2,
    });
  }

  if (scenario.initialHomeScore > 0) {
    synthesizedEvents.push({
      id: 'scen_ev_home_1',
      minute: Math.min(30, scenario.startingMinute - 15),
      type: 'GOAL',
      teamId: userClub.id,
      playerName: userClub.squad[userClub.squad.length - 1]?.name || 'Bintang Pasukan',
      description: `Gol pembukaan menarik buat ${userClub.name}!`,
      homeScore: 1,
      awayScore: 0,
    });
  }

  if (scenario.initialRedCards > 0) {
    const cardedDefender = userClub.squad.find((p) => p.position === 'DEF') || userClub.squad[1];
    synthesizedEvents.push({
      id: 'scen_ev_card_1',
      minute: Math.min(42, scenario.startingMinute - 8),
      type: 'RED_CARD',
      teamId: userClub.id,
      playerId: cardedDefender.id,
      playerName: cardedDefender.name,
      description: `Perintah keluar padang! Kad merah terus kepada ${cardedDefender.name}!`,
      homeScore: scenario.initialHomeScore,
      awayScore: scenario.initialAwayScore,
    });
  }

  // Filter regular events to only keep those occurring after startingMinute, adjusting scores
  let currentHome = scenario.initialHomeScore;
  let currentAway = scenario.initialAwayScore;

  baseResult.events.forEach((ev) => {
    if (ev.minute >= scenario.startingMinute) {
      if (ev.type === 'GOAL') {
        if (ev.teamId === userClub.id) currentHome++;
        else currentAway++;
      }
      synthesizedEvents.push({
        ...ev,
        homeScore: currentHome,
        awayScore: currentAway,
      });
    }
  });

  const finalHomeScore = currentHome;
  const finalAwayScore = currentAway;

  // 4. Evaluate Success against scenario targetGoal
  let success = false;
  if (scenario.targetGoal === 'draw_or_win') {
    success = finalHomeScore >= finalAwayScore;
  } else if (scenario.targetGoal === 'clean_sheet_win') {
    success = finalAwayScore === scenario.initialAwayScore && finalHomeScore > finalAwayScore;
  } else if (scenario.targetGoal === 'win') {
    success = finalHomeScore > finalAwayScore;
  }

  const matchResult: MatchResult = {
    ...baseResult,
    homeScore: finalHomeScore,
    awayScore: finalAwayScore,
    events: synthesizedEvents,
  };

  const objectiveSummary = success
    ? `Tahniah! Anda berjaya mencapai sasaran: ${scenario.targetDescription} (Skor: ${finalHomeScore}-${finalAwayScore})`
    : `Misi gagal. Anda tidak berjaya mencapai sasaran: ${scenario.targetDescription} (Skor: ${finalHomeScore}-${finalAwayScore})`;

  return {
    scenario,
    success,
    matchResult,
    rewardEarned: success ? scenario.creditReward : 0,
    objectiveSummary,
  };
}

export function getScenarioById(id: string): ScenarioDefinition | undefined {
  return SCENARIO_PRESETS.find((s) => s.id === id);
}
