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
  getTransferMarket,
  saveTransferMarket,
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
import {
  DRILL_CONFIGS,
  TEAM_PHYSIO_COST,
  applyMatchFatigue,
  fullSquadPhysioRecovery,
  trainPlayer as executeTrainPlayer,
} from '../engine/training';
import {
  executeBuyPlayer,
  executeSellPlayer,
  generateTransferMarket,
} from '../engine/transfers';
import { validateSquadSelection } from '../types/formations';
import { PlayerAttributes, TrainingDrillType, TransferTarget, Trophy } from '../types';
import { setSoundEnabled } from '../engine/audio';
import { evaluateUnlockedTrophies } from '../engine/trophies';

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
  transferTargets: TransferTarget[];
  unlockedTrophies: Trophy[];
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

  // Phase 4 Trophy & Season Awards
  claimLeaguePrize: () => Promise<{ prize: number; success: boolean; message: string }>;
  startNewLeagueSeason: () => Promise<League | null>;

  // Phase 3 Player Progression & Transfer Actions
  trainPlayer: (
    playerId: string,
    drillType: TrainingDrillType
  ) => Promise<{ success: boolean; message: string; gains?: Partial<PlayerAttributes> }>;
  teamRecoveryPhysio: () => Promise<{ success: boolean; message: string }>;
  buyPlayer: (targetId: string) => Promise<{ success: boolean; message: string }>;
  sellPlayer: (playerId: string) => Promise<{ success: boolean; message: string }>;
  refreshTransferMarket: () => Promise<void>;

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
  transferTargets: [],
  unlockedTrophies: [],
  isLoading: true,
  activeTab: 'home',
  currentMatch: null,

  initStore: async () => {
    set({ isLoading: true });
    try {
      const [savedClub, savedProfile, savedMatches, savedLeague, savedMarket] = await Promise.all([
        getClub(),
        getProfile(),
        getMatchHistory(),
        getActiveLeague(),
        getTransferMarket(),
      ]);

      const profile = savedProfile ?? DEFAULT_PROFILE;
      if (!savedProfile) {
        await saveProfile(profile).catch((err) => {
          console.warn('[useGameStore] Failed to save default profile:', err);
        });
      }

      setSoundEnabled(profile.soundEnabled ?? true);

      let market = savedMarket;
      if (!market || market.length === 0) {
        market = generateTransferMarket();
        await saveTransferMarket(market).catch((err) => {
          console.warn('[useGameStore] Failed to save initial transfer market:', err);
        });
      }

      const trophies = savedClub
        ? evaluateUnlockedTrophies(savedClub, savedLeague, savedMatches)
        : [];

      set({
        club: savedClub,
        profile,
        matchHistory: savedMatches,
        activeLeague: savedLeague,
        transferTargets: market,
        unlockedTrophies: trophies,
        isLoading: false,
      });
    } catch (err) {
      console.error('[useGameStore] initStore error:', err);
      set({
        club: null,
        profile: DEFAULT_PROFILE,
        matchHistory: [],
        activeLeague: null,
        transferTargets: [],
        unlockedTrophies: [],
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

    // Financial rewards: Win +3500, Draw +1500, Loss +600 gate receipts
    const prizeMoney = isWin ? 3500 : isDraw ? 1500 : 600;

    // Apply match fatigue to squad: starting XI players fatigue, bench players recover
    const fatiguedSquad = applyMatchFatigue(club.squad, club.startingXI);

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
      budget: (club.budget ?? 50000) + prizeMoney,
      squad: fatiguedSquad,
    };

    const newLevel = isWin
      ? profile.experienceLevel + 1
      : profile.experienceLevel;

    const updatedProfile: ManagerProfile = {
      ...profile,
      experienceLevel: newLevel,
    };

    const updatedHistory = [result, ...matchHistory];
    const { activeLeague } = get();
    const updatedTrophies = evaluateUnlockedTrophies(updatedClub, activeLeague, updatedHistory);

    await Promise.all([
      saveClub(updatedClub),
      saveProfile(updatedProfile),
      saveMatchResult(result),
    ]);

    set({
      club: updatedClub,
      profile: updatedProfile,
      matchHistory: updatedHistory,
      unlockedTrophies: updatedTrophies,
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
      transferTargets: [],
      unlockedTrophies: [],
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
    if (updates.soundEnabled !== undefined) {
      setSoundEnabled(updates.soundEnabled);
    }
    await saveProfile(updated);
    set({ profile: updated });
  },

  // ============================================================================
  // Phase 3 Player Progression & Transfers
  // ============================================================================

  trainPlayer: async (playerId: string, drillType: TrainingDrillType) => {
    const { club } = get();
    if (!club) return { success: false, message: 'No active club found.' };

    const config = DRILL_CONFIGS[drillType];
    if (club.budget < config.cost) {
      return {
        success: false,
        message: `Insufficient funds! Requires ${config.cost.toLocaleString()} credits (Available: ${club.budget.toLocaleString()}).`,
      };
    }

    const playerIndex = club.squad.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      return { success: false, message: 'Player not found in squad.' };
    }

    const targetPlayer = club.squad[playerIndex];
    const { player: trainedPlayer, result } = executeTrainPlayer(targetPlayer, drillType);

    const updatedSquad = [...club.squad];
    updatedSquad[playerIndex] = trainedPlayer;

    const updatedClub: Club = {
      ...club,
      budget: club.budget - config.cost,
      squad: updatedSquad,
    };

    await saveClub(updatedClub);
    set({ club: updatedClub });

    const gainSummary = Object.entries(result.statGains)
      .map(([k, v]) => `+${v} ${k}`)
      .join(', ');

    return {
      success: true,
      message:
        drillType === 'PHYSIO'
          ? `Physio complete! ${trainedPlayer.name} recovered to ${trainedPlayer.fitness}% fitness.`
          : `Training drill complete! ${trainedPlayer.name}: ${gainSummary || 'sharpness maintained'} (${trainedPlayer.overallRating} OVR).`,
      gains: result.statGains,
    };
  },

  teamRecoveryPhysio: async () => {
    const { club } = get();
    if (!club) return { success: false, message: 'No active club found.' };

    if (club.budget < TEAM_PHYSIO_COST) {
      return {
        success: false,
        message: `Insufficient funds! Requires ${TEAM_PHYSIO_COST.toLocaleString()} credits for squad clinic (Available: ${club.budget.toLocaleString()}).`,
      };
    }

    const refreshedSquad = fullSquadPhysioRecovery(club.squad);
    const updatedClub: Club = {
      ...club,
      budget: club.budget - TEAM_PHYSIO_COST,
      squad: refreshedSquad,
    };

    await saveClub(updatedClub);
    set({ club: updatedClub });

    return {
      success: true,
      message: 'Full team physio completed! All 15+ squad members restored to 100% match fitness.',
    };
  },

  buyPlayer: async (targetId: string) => {
    const { club, transferTargets } = get();
    if (!club) return { success: false, message: 'No active club found.' };

    const target = transferTargets.find((t) => t.id === targetId);
    if (!target) return { success: false, message: 'Scouted target no longer available.' };

    const outcome = executeBuyPlayer(club, target);
    if (!outcome.success) {
      return outcome;
    }

    const remainingTargets = transferTargets.filter((t) => t.id !== targetId);
    await Promise.all([
      saveClub(outcome.club),
      saveTransferMarket(remainingTargets),
    ]);

    set({
      club: outcome.club,
      transferTargets: remainingTargets,
    });

    return outcome;
  },

  sellPlayer: async (playerId: string) => {
    const { club } = get();
    if (!club) return { success: false, message: 'No active club found.' };

    const outcome = executeSellPlayer(club, playerId);
    if (!outcome.success) {
      return outcome;
    }

    await saveClub(outcome.club);
    set({ club: outcome.club });

    return outcome;
  },

  refreshTransferMarket: async () => {
    const newMarket = generateTransferMarket();
    await saveTransferMarket(newMarket);
    set({ transferTargets: newMarket });
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

  claimLeaguePrize: async () => {
    const { activeLeague, club, matchHistory } = get();
    if (!activeLeague || !club) {
      return { success: false, prize: 0, message: 'No active league found.' };
    }

    const isCompleted =
      activeLeague.status === 'completed' || activeLeague.currentRound > activeLeague.totalRounds;
    if (!isCompleted) {
      return { success: false, prize: 0, message: 'League season is still active.' };
    }

    const standings = activeLeague.standings;
    const isChampion = standings.length > 0 && standings[0].clubId === club.id;

    if (!isChampion) {
      return { success: false, prize: 0, message: 'Only the league champion can claim the top prize.' };
    }

    const prize = 25000;
    const updatedClub: Club = {
      ...club,
      budget: club.budget + prize,
    };

    await saveClub(updatedClub);

    const updatedTrophies = evaluateUnlockedTrophies(updatedClub, activeLeague, matchHistory);

    set({
      club: updatedClub,
      unlockedTrophies: updatedTrophies,
    });

    return {
      success: true,
      prize,
      message: `Tahniah! Kejuaraan Liga diraikan. Hadiah tunai ${prize.toLocaleString()} C dikreditkan!`,
    };
  },

  startNewLeagueSeason: async () => {
    const { activeLeague, club, matchHistory } = get();
    if (!activeLeague) return null;

    const newSeason = activeLeague.season + 1;
    const teamSnapshots = activeLeague.teams;
    const seed = Date.now();
    const newFixtures = generateRoundRobinFixtures(teamSnapshots, seed);
    const initialStandings = calculateLeagueStandings(teamSnapshots, newFixtures);

    const refreshedLeague: League = {
      ...activeLeague,
      season: newSeason,
      status: 'active',
      currentRound: 1,
      totalRounds: (teamSnapshots.length - 1) * 2,
      fixtures: newFixtures,
      standings: initialStandings,
      topScorers: [],
      createdAt: Date.now(),
    };

    await saveActiveLeague(refreshedLeague);

    const updatedTrophies = club
      ? evaluateUnlockedTrophies(club, refreshedLeague, matchHistory)
      : [];

    set({
      activeLeague: refreshedLeague,
      selectedReplayFixture: null,
      unlockedTrophies: updatedTrophies,
    });

    return refreshedLeague;
  },

  setSelectedReplayFixture: (fixture: LeagueFixture | null) => {
    set({ selectedReplayFixture: fixture });
  },
}));
