import { create } from 'zustand';
import {
  Club,
  ClubSnapshot,
  ClubStats,
  FormationType,
  ManagerProfile,
  MatchResult,
  TacticalStyle,
} from '../types';
import { League, LeagueFixture } from '../types/league';
import {
  getClub,
  saveClub,
  getProfile,
  saveProfile,
  getMatchHistory,
  saveMatchResult,
  getActiveLeague,
  saveActiveLeague,
  deleteActiveLeague,
  resetAllData,
} from '../storage/db';
import {
  autoSelectStartingXI,
  generateClub,
  createClubSnapshot,
  PRESET_AI_CLUBS,
} from '../engine/generator';
import {
  generateInviteCode,
  generateRoundRobinFixtures,
  calculateLeagueStandings,
  simulateLeagueRound,
} from '../engine/league';
import { validateSquadSelection } from '../types/formations';

export type ActiveTab = 'home' | 'squad' | 'match' | 'league' | 'profile';

export const DEFAULT_PROFILE: ManagerProfile = {
  name: 'Gaffer',
  experienceLevel: 1,
  soundEnabled: true,
  replaySpeed: 1,
};

export interface GameState {
  club: Club | null;
  profile: ManagerProfile;
  matchHistory: MatchResult[];
  activeLeague: League | null;
  selectedReplayFixture: LeagueFixture | null;
  isLoading: boolean;
  activeTab: ActiveTab;
  currentMatch: MatchResult | null;

  // Actions
  initStore: () => Promise<void>;
  createClub: (
    name: string,
    primaryColor: string,
    secondaryColor: string,
    badgeId: string
  ) => Promise<Club>;
  updateFormation: (formation: FormationType) => Promise<void>;
  updateTactics: (tactics: TacticalStyle) => Promise<void>;
  setStartingXI: (playerIds: string[]) => Promise<void>;
  recordMatchResult: (result: MatchResult) => Promise<void>;
  resetGame: () => Promise<void>;
  setActiveTab: (tab: ActiveTab) => void;
  setCurrentMatch: (match: MatchResult | null) => void;
  updateProfile: (updates: Partial<ManagerProfile>) => Promise<void>;

  // Phase 2 League Actions
  createLeague: (name: string, teamCount: number) => Promise<League>;
  joinLeagueByCode: (code: string) => Promise<League>;
  submitLeagueTactics: (fixtureId: string) => Promise<void>;
  simulateLeagueMatchday: () => Promise<void>;
  leaveLeague: () => Promise<void>;
  setSelectedReplayFixture: (fixture: LeagueFixture | null) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  club: null,
  profile: DEFAULT_PROFILE,
  matchHistory: [],
  activeLeague: null,
  selectedReplayFixture: null,
  isLoading: true,
  activeTab: 'home',
  currentMatch: null,

  initStore: async () => {
    set({ isLoading: true });
    try {
      const [savedClub, savedProfile, savedMatches, savedLeague] = await Promise.all([
        getClub(),
        getProfile(),
        getMatchHistory(),
        getActiveLeague(),
      ]);

      const profile = savedProfile ?? DEFAULT_PROFILE;
      if (!savedProfile) {
        await saveProfile(profile).catch((err) => {
          console.warn('[useGameStore] Failed to save default profile:', err);
        });
      }

      set({
        club: savedClub,
        profile,
        matchHistory: savedMatches,
        activeLeague: savedLeague,
        isLoading: false,
      });
    } catch (err) {
      console.error('[useGameStore] initStore error:', err);
      set({
        club: null,
        profile: DEFAULT_PROFILE,
        matchHistory: [],
        activeLeague: null,
        isLoading: false,
      });
    }
  },

  createClub: async (name, primaryColor, secondaryColor, badgeId) => {
    const newClub = generateClub(name, primaryColor, secondaryColor, badgeId, '4-3-3', 'Balanced');
    await saveClub(newClub);
    set({ club: newClub, activeTab: 'home' });
    return newClub;
  },

  updateFormation: async (formation: FormationType) => {
    const { club } = get();
    if (!club) return;

    let nextStartingXI = club.startingXI;
    const validation = validateSquadSelection(club.squad, nextStartingXI, formation);
    if (!validation.valid) {
      nextStartingXI = autoSelectStartingXI(club.squad, formation);
    }

    const updatedClub: Club = {
      ...club,
      formation,
      startingXI: nextStartingXI,
    };

    await saveClub(updatedClub);
    set({ club: updatedClub });
  },

  updateTactics: async (tactics: TacticalStyle) => {
    const { club } = get();
    if (!club) return;

    const updatedClub: Club = {
      ...club,
      tactics,
    };

    await saveClub(updatedClub);
    set({ club: updatedClub });
  },

  setStartingXI: async (playerIds: string[]) => {
    const { club } = get();
    if (!club) return;

    if (playerIds.length !== 11) {
      console.warn('[useGameStore] setStartingXI requires exactly 11 players');
      return;
    }

    const updatedClub: Club = {
      ...club,
      startingXI: playerIds,
    };

    await saveClub(updatedClub);
    set({ club: updatedClub });
  },

  recordMatchResult: async (result: MatchResult) => {
    const { club, profile, matchHistory } = get();
    if (!club) return;

    const isHome = result.homeClub.id === club.id;
    const teamScore = isHome ? result.homeScore : result.awayScore;
    const oppScore = isHome ? result.awayScore : result.homeScore;

    const isWin = teamScore > oppScore;
    const isDraw = teamScore === oppScore;
    const isLoss = teamScore < oppScore;

    const newStats: ClubStats = {
      played: club.stats.played + 1,
      won: club.stats.won + (isWin ? 1 : 0),
      drawn: club.stats.drawn + (isDraw ? 1 : 0),
      lost: club.stats.lost + (isLoss ? 1 : 0),
      goalsFor: club.stats.goalsFor + teamScore,
      goalsAgainst: club.stats.goalsAgainst + oppScore,
    };

    const updatedClub: Club = {
      ...club,
      stats: newStats,
    };

    const newLevel = isWin
      ? profile.experienceLevel + 1
      : profile.experienceLevel;

    const updatedProfile: ManagerProfile = {
      ...profile,
      experienceLevel: newLevel,
    };

    const updatedHistory = [result, ...matchHistory];

    await Promise.all([
      saveClub(updatedClub),
      saveProfile(updatedProfile),
      saveMatchResult(result),
    ]);

    set({
      club: updatedClub,
      profile: updatedProfile,
      matchHistory: updatedHistory,
      currentMatch: result,
    });
  },

  resetGame: async () => {
    await resetAllData();
    set({
      club: null,
      profile: DEFAULT_PROFILE,
      matchHistory: [],
      activeLeague: null,
      selectedReplayFixture: null,
      currentMatch: null,
      activeTab: 'home',
    });
  },

  setActiveTab: (tab: ActiveTab) => {
    set({ activeTab: tab });
  },

  setCurrentMatch: (match: MatchResult | null) => {
    set({ currentMatch: match });
  },

  updateProfile: async (updates: Partial<ManagerProfile>) => {
    const { profile } = get();
    const updated: ManagerProfile = {
      ...profile,
      ...updates,
    };
    await saveProfile(updated);
    set({ profile: updated });
  },

  // ============================================================================
  // Phase 2 League Actions
  // ============================================================================

  createLeague: async (name: string, teamCount: number) => {
    const { club } = get();
    if (!club) throw new Error('Club required to create a league.');

    const userSnapshot = createClubSnapshot(club);
    const neededAITeams = Math.max(1, teamCount - 1);

    const opponentPool = [...PRESET_AI_CLUBS];
    const aiTeams: ClubSnapshot[] = [];

    for (let i = 0; i < neededAITeams; i++) {
      const preset = opponentPool[i % opponentPool.length];
      const aiClub = generateClub(
        `${preset.name} ${i >= opponentPool.length ? i + 1 : ''}`.trim(),
        preset.primaryColor,
        preset.secondaryColor,
        preset.badgeId,
        preset.formation,
        preset.tactics,
        Date.now() + i * 100
      );
      aiTeams.push(createClubSnapshot(aiClub));
    }

    const allTeams = [userSnapshot, ...aiTeams];
    const fixtures = generateRoundRobinFixtures(allTeams, Date.now());
    const standings = calculateLeagueStandings(allTeams, fixtures);
    const code = generateInviteCode();

    const newLeague: League = {
      id: `league_${Date.now()}`,
      name: name.trim() || 'Super League',
      code,
      creatorClubId: club.id,
      season: 1,
      status: 'active',
      currentRound: 1,
      totalRounds: allTeams.length - 1,
      teams: allTeams,
      fixtures,
      standings,
      topScorers: [],
      createdAt: Date.now(),
    };

    await saveActiveLeague(newLeague);
    set({ activeLeague: newLeague });
    return newLeague;
  },

  joinLeagueByCode: async (code: string) => {
    const { club } = get();
    if (!club) throw new Error('Club required to join a league.');

    const cleanCode = code.trim().toUpperCase();
    // Creates a new joined championship seeded by the invite code
    const league = await get().createLeague(`League ${cleanCode}`, 4);
    const updatedLeague: League = {
      ...league,
      code: cleanCode,
    };
    await saveActiveLeague(updatedLeague);
    set({ activeLeague: updatedLeague });
    return updatedLeague;
  },

  submitLeagueTactics: async (fixtureId: string) => {
    const { activeLeague } = get();
    if (!activeLeague) return;

    const fixtures = activeLeague.fixtures.map((f) =>
      f.id === fixtureId ? { ...f, userTacticsSubmitted: true, status: 'submitted' as const } : f
    );

    const updatedLeague: League = {
      ...activeLeague,
      fixtures,
    };

    await saveActiveLeague(updatedLeague);
    set({ activeLeague: updatedLeague });
  },

  simulateLeagueMatchday: async () => {
    const { activeLeague, club } = get();
    if (!activeLeague || activeLeague.status === 'completed') return;

    const userSnapshot = club ? createClubSnapshot(club) : undefined;
    const { updatedLeague, playedResults } = simulateLeagueRound(
      activeLeague,
      activeLeague.currentRound,
      userSnapshot
    );

    // If user's match was in this round, record it in match history
    if (club) {
      const userResult = playedResults.find(
        (r) => r.homeClub.id === club.id || r.awayClub.id === club.id
      );
      if (userResult) {
        await get().recordMatchResult(userResult);
      }
    }

    await saveActiveLeague(updatedLeague);
    set({ activeLeague: updatedLeague });
  },

  leaveLeague: async () => {
    await deleteActiveLeague();
    set({ activeLeague: null, selectedReplayFixture: null });
  },

  setSelectedReplayFixture: (fixture: LeagueFixture | null) => {
    set({ selectedReplayFixture: fixture });
  },
}));
