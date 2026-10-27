import { create } from 'zustand';
import {
  Club,
  ClubSnapshot,
  ClubStats,
  FormationType,
  KnockoutCup,
  ManagerProfile,
  MatchResult,
  Player,
  PlayerAttributes,
  PlayerRole,
  SponsorDeal,
  TacticalStyle,
  TrainingDrillType,
  TransferTarget,
  Trophy,
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
  getActiveCup,
  saveActiveCup,
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
import { setSoundEnabled } from '../engine/audio';
import { evaluateUnlockedTrophies } from '../engine/trophies';
import {
  calculateGateReceipts,
  generateYouthProdigy,
  upgradeCost,
} from '../engine/facilities';
import {
  advanceCupTournament,
  createKnockoutCup,
  CUP_CHAMPION_PRIZE,
  simulateCupMatch,
} from '../engine/cup';
import { calculateSponsorBonus, getSponsorById } from '../engine/sponsors';
import { exportSaveData, importSaveData } from '../engine/sharing';
import { calculateEloChange } from '../engine/pvp';
import { applyMoraleDelta } from '../engine/press';

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
  activeCup: KnockoutCup | null;
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

  // Facilities & Sponsorship Actions
  upgradeFacility: (
    facility: 'stadium' | 'youthAcademy' | 'medical'
  ) => Promise<{ success: boolean; message: string; newLevel?: number }>;
  promoteYouthProdigy: () => Promise<{ success: boolean; message: string; player?: Player }>;
  signSponsorContract: (
    sponsorId: string
  ) => Promise<{ success: boolean; message: string; sponsor?: SponsorDeal }>;

  // Knockout Cup Actions
  createCupTournament: () => Promise<KnockoutCup>;
  simulateCupRound: () => Promise<{ success: boolean; message: string }>;
  claimCupPrize: () => Promise<{ prize: number; success: boolean; message: string }>;

  // Save Data Sharing & Portability
  exportGameData: () => string;
  importGameData: (jsonString: string) => Promise<{ success: boolean; message: string }>;

  // Version 0.6.0 PvP & Kit Design & Press Conference Actions
  recordPvPResult: (
    result: MatchResult,
    opponentRating: number
  ) => Promise<{ eloChange: number; newRating: number }>;
  updateKitDesign: (
    homePrimary?: string,
    homeSecondary?: string,
    awayPrimary?: string,
    awaySecondary?: string,
    pattern?: 'solid' | 'stripes' | 'hoops' | 'half'
  ) => Promise<void>;
  answerPressConference: (moraleDelta: number) => Promise<void>;

  // Version 0.7.0 Tactical Roles, Scenario Challenges & Audio Commentary Actions
  updatePlayerRole: (playerId: string, role: PlayerRole) => Promise<void>;
  completeScenario: (scenarioId: string, reward: number) => Promise<void>;
  toggleCommentaryVoice: (enabled?: boolean) => Promise<void>;
  setCommentaryLanguage: (language: 'ms' | 'en') => Promise<void>;

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
  activeCup: null,
  selectedReplayFixture: null,
  transferTargets: [],
  unlockedTrophies: [],
  isLoading: true,
  activeTab: 'home',
  currentMatch: null,

  initStore: async () => {
    set({ isLoading: true });
    try {
      const [savedClub, savedProfile, savedMatches, savedLeague, savedMarket, savedCup] = await Promise.all([
        getClub(),
        getProfile(),
        getMatchHistory(),
        getActiveLeague(),
        getTransferMarket(),
        getActiveCup(),
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
        ? evaluateUnlockedTrophies(savedClub, savedLeague, savedMatches, savedCup)
        : [];

      set({
        club: savedClub,
        profile,
        matchHistory: savedMatches,
        activeLeague: savedLeague,
        activeCup: savedCup,
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
        activeCup: null,
        transferTargets: [],
        unlockedTrophies: [],
        isLoading: false,
      });
    }
  },

  createClub: async (name, primaryColor, secondaryColor, badgeId) => {
    const generated = generateClub(name, primaryColor, secondaryColor, badgeId, '4-3-3', 'Balanced');
    const newClub: Club = {
      ...generated,
      facilities: {
        stadiumLevel: 1,
        youthAcademyLevel: 1,
        medicalLevel: 1,
      },
      activeSponsorId: null,
    };
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

    // Financial rewards: Win +3500, Draw +1500, Loss +600 base
    const prizeMoney = isWin ? 3500 : isDraw ? 1500 : 600;

    // Ticket revenue from Stadium facilities (Home matches only)
    const stadiumLevel = club.facilities?.stadiumLevel ?? 1;
    const gateReceipts = calculateGateReceipts(stadiumLevel, isHome);

    // Sponsorship bonus (Win bonus & Clean sheet bonus)
    const sponsor = club.activeSponsorId ? getSponsorById(club.activeSponsorId) : null;
    const sponsorBonus = calculateSponsorBonus(
      sponsor ? { ...sponsor, active: true } : null,
      isWin,
      oppScore === 0
    );

    const totalMatchIncome = prizeMoney + gateReceipts + sponsorBonus;

    // Apply match fatigue to squad: starting XI players fatigue, bench players recover
    // If match was played in Rainy weather, extra fatigue (staminaMultiplier 1.25)
    let fatiguedSquad = applyMatchFatigue(club.squad, club.startingXI);
    if (result.weather === 'Rainy') {
      fatiguedSquad = fatiguedSquad.map((p) => {
        if (club.startingXI.includes(p.id)) {
          return { ...p, fitness: Math.max(20, (p.fitness ?? 100) - 4) };
        }
        return p;
      });
    }

    // Apply medical level recovery bonus (+5%, +10%, +15%)
    const medLevel = club.facilities?.medicalLevel ?? 1;
    const medBonus = medLevel === 3 ? 4 : medLevel === 2 ? 3 : 1;
    fatiguedSquad = fatiguedSquad.map((p) => ({
      ...p,
      fitness: Math.min(100, (p.fitness ?? 100) + medBonus),
    }));

    // Discipline tracking: yellow & red card events
    const cardEvents = result.events.filter(
      (e) => (e.type === 'YELLOW_CARD' || e.type === 'RED_CARD') && e.teamId === club.id
    );
    const redCardedIds = new Set(
      cardEvents.filter((e) => e.type === 'RED_CARD').map((e) => e.playerId)
    );
    const yellowCardedIds = new Set(
      cardEvents.filter((e) => e.type === 'YELLOW_CARD').map((e) => e.playerId)
    );

    const updatedSquad = fatiguedSquad.map((player) => {
      let yellowCards = player.yellowCards ?? 0;
      let redCards = player.redCards ?? 0;
      let isSuspended = player.isSuspended ?? false;

      // If player was suspended prior to this match and did not play, suspension served
      if (isSuspended && !club.startingXI.includes(player.id)) {
        isSuspended = false;
      }

      if (redCardedIds.has(player.id)) {
        redCards += 1;
        isSuspended = true;
      }
      if (yellowCardedIds.has(player.id)) {
        yellowCards += 1;
        if (yellowCards % 2 === 0) {
          isSuspended = true;
        }
      }

      const moraleDelta = isWin ? 5 : isDraw ? 0 : -5;
      const currentMorale = player.morale ?? 80;
      const updatedMorale = Math.max(20, Math.min(100, currentMorale + moraleDelta));

      return {
        ...player,
        yellowCards,
        redCards,
        isSuspended,
        morale: updatedMorale,
      };
    });

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
      budget: (club.budget ?? 50000) + totalMatchIncome,
      squad: updatedSquad,
    };

    const newLevel = isWin
      ? profile.experienceLevel + 1
      : profile.experienceLevel;

    const updatedProfile: ManagerProfile = {
      ...profile,
      experienceLevel: newLevel,
    };

    const updatedHistory = [result, ...matchHistory];
    const { activeLeague, activeCup } = get();
    const updatedTrophies = evaluateUnlockedTrophies(
      updatedClub,
      activeLeague,
      updatedHistory,
      activeCup
    );

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
      activeCup: null,
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

  upgradeFacility: async (facility) => {
    const { club } = get();
    if (!club) return { success: false, message: 'Kelab tidak dijumpai.' };

    const facilities = club.facilities ?? {
      stadiumLevel: 1,
      youthAcademyLevel: 1,
      medicalLevel: 1,
    };

    const currentLevel =
      facility === 'stadium'
        ? facilities.stadiumLevel
        : facility === 'youthAcademy'
        ? facilities.youthAcademyLevel
        : facilities.medicalLevel;

    const cost = upgradeCost(facility, currentLevel);
    if (cost === null) {
      return { success: false, message: 'Fasiliti ini telah mencapai tahap maksimum!' };
    }

    if (club.budget < cost) {
      return {
        success: false,
        message: `Bajet tidak mencukupi untuk naik taraf (Perlu RM${cost.toLocaleString()}).`,
      };
    }

    const newLevel = currentLevel + 1;
    const updatedFacilities = {
      ...facilities,
      ...(facility === 'stadium' ? { stadiumLevel: newLevel } : {}),
      ...(facility === 'youthAcademy' ? { youthAcademyLevel: newLevel } : {}),
      ...(facility === 'medical' ? { medicalLevel: newLevel } : {}),
    };

    const updatedClub: Club = {
      ...club,
      budget: club.budget - cost,
      facilities: updatedFacilities,
    };

    await saveClub(updatedClub);
    set({ club: updatedClub });

    return {
      success: true,
      message: `Naik taraf berjaya! Tahap baru: ${newLevel}`,
      newLevel,
    };
  },

  promoteYouthProdigy: async () => {
    const { club } = get();
    if (!club) return { success: false, message: 'Kelab tidak dijumpai.' };

    const signingFee = 3000;
    if (club.budget < signingFee) {
      return {
        success: false,
        message: `Bajet tidak mencukupi untuk menandatangani pemain akademi (Kos: RM${signingFee.toLocaleString()}).`,
      };
    }

    const academyLevel = club.facilities?.youthAcademyLevel ?? 1;
    const prodigy = generateYouthProdigy(academyLevel);

    const updatedClub: Club = {
      ...club,
      budget: club.budget - signingFee,
      squad: [...club.squad, prodigy],
    };

    await saveClub(updatedClub);
    set({ club: updatedClub });

    return {
      success: true,
      message: `Permata akademi ${prodigy.name} (${prodigy.position}, OVR ${prodigy.overallRating}) telah diserap ke dalam skuad!`,
      player: prodigy,
    };
  },

  signSponsorContract: async (sponsorId: string) => {
    const { club } = get();
    if (!club) return { success: false, message: 'Kelab tidak dijumpai.' };

    const sponsor = getSponsorById(sponsorId);
    if (!sponsor) return { success: false, message: 'Tajaan tidak sah.' };

    const updatedClub: Club = {
      ...club,
      budget: club.budget + sponsor.upfrontBonus,
      activeSponsorId: sponsor.id,
    };

    await saveClub(updatedClub);
    set({ club: updatedClub });

    return {
      success: true,
      message: `Kontrak penajaan bersama ${sponsor.name} berjaya dimeterai! Menerima bonus pendahuluan RM${sponsor.upfrontBonus.toLocaleString()}.`,
      sponsor: { ...sponsor, active: true },
    };
  },

  createCupTournament: async () => {
    const { club } = get();
    if (!club) throw new Error('No active club to create cup');

    const seed = Date.now();
    const cup = createKnockoutCup(club, seed);
    await saveActiveCup(cup);
    set({ activeCup: cup });
    return cup;
  },

  simulateCupRound: async () => {
    const { activeCup, club, matchHistory, activeLeague } = get();
    if (!activeCup || activeCup.status === 'completed') {
      return { success: false, message: 'Tiada pusingan piala untuk disimulasi.' };
    }

    const roundMatches = activeCup.matches.filter((m) => m.round === activeCup.currentRound);
    const updatedRoundMatches = roundMatches.map((match) => {
      if (match.isCompleted) return match;
      return simulateCupMatch(match, match.seed);
    });

    const otherMatches = activeCup.matches.filter((m) => m.round !== activeCup.currentRound);
    const cupWithSimulatedMatches: KnockoutCup = {
      ...activeCup,
      matches: [...otherMatches, ...updatedRoundMatches],
    };

    const advancedCup = advanceCupTournament(cupWithSimulatedMatches, Date.now());
    await saveActiveCup(advancedCup);

    const updatedTrophies = club
      ? evaluateUnlockedTrophies(club, activeLeague, matchHistory, advancedCup)
      : [];

    set({
      activeCup: advancedCup,
      unlockedTrophies: updatedTrophies,
    });

    return {
      success: true,
      message: `Pusingan ${activeCup.currentRound} berjaya disimulasi!`,
    };
  },

  claimCupPrize: async () => {
    const { activeCup, club, activeLeague, matchHistory } = get();
    if (!club) {
      return { prize: 0, success: false, message: 'Kelab tidak dijumpai.' };
    }
    if (!activeCup || activeCup.status !== 'completed' || activeCup.winnerClubId !== club.id) {
      return { prize: 0, success: false, message: 'Hanya juara Piala MainBola yang layak menuntut hadiah.' };
    }
    if (activeCup.prizeClaimed) {
      return { prize: 0, success: false, message: 'Hadiah kejuaraan piala telah dituntut sebelum ini.' };
    }

    const prize = CUP_CHAMPION_PRIZE;
    const updatedClub: Club = {
      ...club,
      budget: club.budget + prize,
    };

    const updatedCup: KnockoutCup = {
      ...activeCup,
      prizeClaimed: true,
    };

    await Promise.all([saveClub(updatedClub), saveActiveCup(updatedCup)]);

    const updatedTrophies = evaluateUnlockedTrophies(
      updatedClub,
      activeLeague,
      matchHistory,
      updatedCup
    );

    set({
      club: updatedClub,
      activeCup: updatedCup,
      unlockedTrophies: updatedTrophies,
    });

    return {
      prize,
      success: true,
      message: `Tahniah! Hadiah kejuaraan Piala MainBola RM${prize.toLocaleString()} telah dikreditkan ke bajet kelab!`,
    };
  },

  exportGameData: () => {
    const { club, profile, matchHistory, activeLeague, activeCup, unlockedTrophies } = get();
    return exportSaveData({
      version: '0.5.0',
      exportedAt: Date.now(),
      club,
      profile,
      matchHistory,
      activeLeague,
      activeCup,
      unlockedTrophies,
    });
  },

  importGameData: async (jsonString: string) => {
    try {
      const payload = importSaveData(jsonString);

      await resetAllData();

      if (payload.club) {
        await saveClub(payload.club);
      }
      if (payload.profile) {
        await saveProfile(payload.profile);
      }
      if (Array.isArray(payload.matchHistory)) {
        for (const match of payload.matchHistory) {
          await saveMatchResult(match);
        }
      }
      if (payload.activeLeague) {
        await saveActiveLeague(payload.activeLeague);
      }
      if (payload.activeCup) {
        await saveActiveCup(payload.activeCup);
      }

      const trophies = payload.club
        ? evaluateUnlockedTrophies(
            payload.club,
            payload.activeLeague,
            payload.matchHistory || [],
            payload.activeCup
          )
        : [];

      set({
        club: payload.club,
        profile: payload.profile ?? DEFAULT_PROFILE,
        matchHistory: payload.matchHistory || [],
        activeLeague: payload.activeLeague ?? null,
        activeCup: payload.activeCup ?? null,
        unlockedTrophies: trophies,
        isLoading: false,
      });

      return {
        success: true,
        message: 'Data simpanan berjaya dimuat naik sepenuhnya!',
      };
    } catch (err) {
      console.error('[useGameStore] importGameData error:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Gagal memuat naik data simpanan.',
      };
    }
  },

  recordPvPResult: async (result: MatchResult, opponentRating: number) => {
    const { club } = get();
    if (!club) throw new Error('Club uninitialized');

    const isHome = result.homeClub.id === club.id;
    const userScore = isHome ? result.homeScore : result.awayScore;
    const oppScore = isHome ? result.awayScore : result.homeScore;

    const currentRating = club.pvpRating ?? 1200;
    const eloChange = calculateEloChange(currentRating, opponentRating, userScore, oppScore);
    const newRating = Math.max(800, currentRating + eloChange);

    const isWin = userScore > oppScore;
    const isDraw = userScore === oppScore;

    const currentRecord = club.pvpRecord ?? { won: 0, drawn: 0, lost: 0 };
    const updatedRecord = {
      won: currentRecord.won + (isWin ? 1 : 0),
      drawn: currentRecord.drawn + (isDraw ? 1 : 0),
      lost: currentRecord.lost + (!isWin && !isDraw ? 1 : 0),
    };

    const updatedClub: Club = {
      ...club,
      pvpRating: newRating,
      pvpRecord: updatedRecord,
    };

    await get().recordMatchResult(result);
    await saveClub(updatedClub);
    set({ club: updatedClub });

    return { eloChange, newRating };
  },

  updateKitDesign: async (
    homePrimary?: string,
    homeSecondary?: string,
    awayPrimary?: string,
    awaySecondary?: string,
    pattern?: 'solid' | 'stripes' | 'hoops' | 'half'
  ) => {
    const { club } = get();
    if (!club) return;

    const updatedClub: Club = {
      ...club,
      primaryColor: homePrimary || club.primaryColor,
      secondaryColor: homeSecondary || club.secondaryColor,
      awayPrimaryColor: awayPrimary || club.awayPrimaryColor,
      awaySecondaryColor: awaySecondary || club.awaySecondaryColor,
      kitPattern: pattern || club.kitPattern || 'solid',
    };

    await saveClub(updatedClub);
    set({ club: updatedClub });
  },

  answerPressConference: async (moraleDelta: number) => {
    const { club } = get();
    if (!club) return;

    const updatedSquad = applyMoraleDelta(club.squad, moraleDelta);
    const updatedClub: Club = {
      ...club,
      squad: updatedSquad,
    };

    await saveClub(updatedClub);
    set({ club: updatedClub });
  },

  updatePlayerRole: async (playerId: string, role: PlayerRole) => {
    const { club } = get();
    if (!club) return;

    const updatedSquad = club.squad.map((p) => (p.id === playerId ? { ...p, role } : p));
    const updatedClub: Club = { ...club, squad: updatedSquad };
    await saveClub(updatedClub);
    set({ club: updatedClub });
  },

  completeScenario: async (scenarioId: string, reward: number) => {
    const { club } = get();
    if (!club) return;

    const completed = club.completedScenarios || [];
    const isNew = !completed.includes(scenarioId);
    const updatedCompleted = isNew ? [...completed, scenarioId] : completed;
    const updatedClub: Club = {
      ...club,
      budget: club.budget + reward,
      completedScenarios: updatedCompleted,
    };
    await saveClub(updatedClub);
    set({ club: updatedClub });
  },

  toggleCommentaryVoice: async (enabled?: boolean) => {
    const { profile } = get();
    const newValue = enabled !== undefined ? enabled : !profile.commentaryVoiceEnabled;
    const updatedProfile: ManagerProfile = {
      ...profile,
      commentaryVoiceEnabled: newValue,
    };
    await saveProfile(updatedProfile);
    set({ profile: updatedProfile });
  },

  setCommentaryLanguage: async (language: 'ms' | 'en') => {
    const { profile } = get();
    const updatedProfile: ManagerProfile = {
      ...profile,
      commentaryLanguage: language,
    };
    await saveProfile(updatedProfile);
    set({ profile: updatedProfile });
  },
}));
