import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useGameStore, DEFAULT_PROFILE } from '../useGameStore';
import { resetAllData, closeDb, getClub, getMatchHistory } from '../../storage/db';
import { MatchResult } from '../../types';

describe('Zustand Store (useGameStore.ts)', () => {
  beforeEach(async () => {
    await resetAllData().catch(() => {});
    useGameStore.setState({
      club: null,
      profile: DEFAULT_PROFILE,
      matchHistory: [],
      isLoading: true,
      activeTab: 'home',
      currentMatch: null,
    });
  });

  afterEach(async () => {
    await resetAllData().catch(() => {});
    closeDb();
  });

  it('initStore initializes with defaults when DB is empty', async () => {
    await useGameStore.getState().initStore();

    const state = useGameStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.club).toBeNull();
    expect(state.profile.name).toBe('Gaffer');
    expect(state.matchHistory).toEqual([]);
  });

  it('createClub generates a 15-player squad, 4-3-3 starting XI, and persists to DB', async () => {
    const club = await useGameStore
      .getState()
      .createClub('Persija Glory', '#ff0000', '#ffffff', 'badge_01');

    expect(club.name).toBe('Persija Glory');
    expect(club.squad.length).toBe(15);
    expect(club.startingXI.length).toBe(11);
    expect(club.formation).toBe('4-3-3');
    expect(club.tactics).toBe('Balanced');

    // Check store state
    const state = useGameStore.getState();
    expect(state.club?.id).toBe(club.id);

    // Verify persisted to IndexedDB
    const persisted = await getClub();
    expect(persisted?.id).toBe(club.id);
  });

  it('updateFormation updates club formation and adjusts starting XI if needed', async () => {
    await useGameStore.getState().createClub('Timnas FC', '#ff0000', '#ffffff', 'badge_02');

    await useGameStore.getState().updateFormation('4-4-2');
    const club = useGameStore.getState().club;
    expect(club?.formation).toBe('4-4-2');
    expect(club?.startingXI.length).toBe(11);

    // Verify DB updated
    const persisted = await getClub();
    expect(persisted?.formation).toBe('4-4-2');
  });

  it('updateTactics updates tactical style', async () => {
    await useGameStore.getState().createClub('Timnas FC', '#ff0000', '#ffffff', 'badge_02');
    await useGameStore.getState().updateTactics('Attacking');

    expect(useGameStore.getState().club?.tactics).toBe('Attacking');
    const persisted = await getClub();
    expect(persisted?.tactics).toBe('Attacking');
  });

  it('setStartingXI updates starting lineup', async () => {
    const club = await useGameStore
      .getState()
      .createClub('Timnas FC', '#ff0000', '#ffffff', 'badge_02');

    // Pick 11 player IDs from squad
    const customLineup = club.squad.slice(0, 11).map((p) => p.id);
    await useGameStore.getState().setStartingXI(customLineup);

    expect(useGameStore.getState().club?.startingXI).toEqual(customLineup);
  });

  it('recordMatchResult updates club win/draw/loss/goals and matchHistory', async () => {
    const club = await useGameStore
      .getState()
      .createClub('Timnas FC', '#ff0000', '#ffffff', 'badge_02');

    const match: MatchResult = {
      id: 'match_win',
      seed: 123,
      timestamp: Date.now(),
      homeClub: {
        id: club.id,
        name: club.name,
        primaryColor: club.primaryColor,
        secondaryColor: club.secondaryColor,
        badgeId: club.badgeId,
        formation: club.formation,
        tactics: club.tactics,
        startingXI: club.squad.slice(0, 11),
      },
      awayClub: {
        id: 'rival_club',
        name: 'Rival FC',
        primaryColor: '#0000ff',
        secondaryColor: '#ffffff',
        badgeId: 'badge_03',
        formation: '4-4-2',
        tactics: 'Balanced',
        startingXI: [],
      },
      homeScore: 3,
      awayScore: 1,
      homeStats: {
        shots: 8,
        shotsOnTarget: 5,
        possession: 55,
        passes: 300,
        tackles: 12,
        saves: 2,
      },
      awayStats: {
        shots: 4,
        shotsOnTarget: 2,
        possession: 45,
        passes: 240,
        tackles: 10,
        saves: 2,
      },
      events: [],
    };

    await useGameStore.getState().recordMatchResult(match);

    const state = useGameStore.getState();
    expect(state.club?.stats.played).toBe(1);
    expect(state.club?.stats.won).toBe(1);
    expect(state.club?.stats.drawn).toBe(0);
    expect(state.club?.stats.lost).toBe(0);
    expect(state.club?.stats.goalsFor).toBe(3);
    expect(state.club?.stats.goalsAgainst).toBe(1);
    expect(state.matchHistory.length).toBe(1);
    expect(state.currentMatch?.id).toBe('match_win');

    // Experience gained for win
    expect(state.profile.experienceLevel).toBeGreaterThan(DEFAULT_PROFILE.experienceLevel);

    // Verify DB
    const persistedMatches = await getMatchHistory();
    expect(persistedMatches.length).toBe(1);
  });

  it('resetGame resets all data in IndexedDB and in state', async () => {
    await useGameStore.getState().createClub('Timnas FC', '#ff0000', '#ffffff', 'badge_02');
    expect(useGameStore.getState().club).not.toBeNull();

    await useGameStore.getState().resetGame();

    const state = useGameStore.getState();
    expect(state.club).toBeNull();
    expect(state.matchHistory).toEqual([]);
    expect(state.currentMatch).toBeNull();

    const persistedClub = await getClub();
    expect(persistedClub).toBeNull();
  });

  it('setActiveTab changes current tab', () => {
    useGameStore.getState().setActiveTab('squad');
    expect(useGameStore.getState().activeTab).toBe('squad');
  });

  it('createLeague creates a 4-team round-robin tournament and persists it', async () => {
    await useGameStore.getState().createClub('Garuda FC', '#10B981', '#0F172A', 'shield');
    const league = await useGameStore.getState().createLeague('Super Cup', 4);

    expect(league.name).toBe('Super Cup');
    expect(league.teams).toHaveLength(4);
    expect(league.fixtures).toHaveLength(6);
    expect(league.standings).toHaveLength(4);
    expect(league.code).toMatch(/^[A-Z]+-\d{2}$/);
    expect(useGameStore.getState().activeLeague?.id).toBe(league.id);
  });

  it('submitLeagueTactics and simulateLeagueMatchday simulates matches and advances round', async () => {
    await useGameStore.getState().createClub('Garuda FC', '#10B981', '#0F172A', 'shield');
    const league = await useGameStore.getState().createLeague('Super Cup', 4);

    const firstFixture = league.fixtures[0];
    await useGameStore.getState().submitLeagueTactics(firstFixture.id);
    expect(useGameStore.getState().activeLeague?.fixtures[0].userTacticsSubmitted).toBe(true);

    // Simulate matchday 1
    await useGameStore.getState().simulateLeagueMatchday();
    const updated = useGameStore.getState().activeLeague;
    expect(updated?.currentRound).toBe(2);

    const round1Fixtures = updated?.fixtures.filter((f) => f.round === 1);
    expect(round1Fixtures?.every((f) => f.status === 'played')).toBe(true);
  });

  it('leaveLeague removes the league from state and DB', async () => {
    await useGameStore.getState().createClub('Garuda FC', '#10B981', '#0F172A', 'shield');
    await useGameStore.getState().createLeague('Super Cup', 4);
    expect(useGameStore.getState().activeLeague).not.toBeNull();

    await useGameStore.getState().leaveLeague();
    expect(useGameStore.getState().activeLeague).toBeNull();
  });
});
