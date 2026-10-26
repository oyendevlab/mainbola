import { create } from 'zustand';
import {
  Club,
  ClubStats,
  FormationType,
  ManagerProfile,
  MatchResult,
  TacticalStyle,
} from '../types';
import {
  getClub,
  saveClub,
  getProfile,
  saveProfile,
  getMatchHistory,
  saveMatchResult,
  resetAllData,
} from '../storage/db';
import {
  autoSelectStartingXI,
  generateClub,
} from '../engine/generator';
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
}

export const useGameStore = create<GameState>((set, get) => ({
  club: null,
  profile: DEFAULT_PROFILE,
  matchHistory: [],
  isLoading: true,
  activeTab: 'home',
  currentMatch: null,

  initStore: async () => {
    set({ isLoading: true });
    try {
      const [savedClub, savedProfile, savedMatches] = await Promise.all([
        getClub(),
        getProfile(),
        getMatchHistory(),
      ]);

      const profile = savedProfile ?? DEFAULT_PROFILE;
      if (!savedProfile) {
        // Persist initial default profile
        await saveProfile(profile).catch((err) => {
          console.warn('[useGameStore] Failed to save default profile:', err);
        });
      }

      set({
        club: savedClub,
        profile,
        matchHistory: savedMatches,
        isLoading: false,
      });
    } catch (err) {
      console.error('[useGameStore] initStore error:', err);
      set({
        club: null,
        profile: DEFAULT_PROFILE,
        matchHistory: [],
        isLoading: false,
      });
    }
  },

  createClub: async (name, primaryColor, secondaryColor, badgeId) => {
    // Generate new club with 15 players and auto-picked 4-3-3 starting XI
    const newClub = generateClub(name, primaryColor, secondaryColor, badgeId, '4-3-3', 'Balanced');

    await saveClub(newClub);
    set({ club: newClub, activeTab: 'home' });
    return newClub;
  },

  updateFormation: async (formation: FormationType) => {
    const { club } = get();
    if (!club) return;

    // Check if current startingXI is valid for the new formation; if not, auto-select startingXI
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

    // Ensure 11 players
    if (playerIds.length !== 11) {
      console.warn(`[useGameStore] setStartingXI received ${playerIds.length} players, expected 11.`);
    }

    const updatedClub: Club = {
      ...club,
      startingXI: playerIds,
    };

    await saveClub(updatedClub);
    set({ club: updatedClub });
  },

  recordMatchResult: async (result: MatchResult) => {
    const state = get();
    const { club, profile, matchHistory } = state;

    // Persist match in IndexedDB
    await saveMatchResult(result);

    let updatedClub = club;
    let updatedProfile = profile;

    if (club) {
      const isHome = club.id === result.homeClub.id;
      const isAway = club.id === result.awayClub.id;

      if (isHome || isAway) {
        const myScore = isHome ? result.homeScore : result.awayScore;
        const oppScore = isHome ? result.awayScore : result.homeScore;

        const won = myScore > oppScore ? 1 : 0;
        const drawn = myScore === oppScore ? 1 : 0;
        const lost = myScore < oppScore ? 1 : 0;

        const updatedStats: ClubStats = {
          played: club.stats.played + 1,
          won: club.stats.won + won,
          drawn: club.stats.drawn + drawn,
          lost: club.stats.lost + lost,
          goalsFor: club.stats.goalsFor + myScore,
          goalsAgainst: club.stats.goalsAgainst + oppScore,
        };

        updatedClub = {
          ...club,
          stats: updatedStats,
        };

        await saveClub(updatedClub);

        // Advance manager experience
        const expGain = won ? 3 : drawn ? 1 : 0;
        if (expGain > 0) {
          updatedProfile = {
            ...profile,
            experienceLevel: profile.experienceLevel + expGain,
          };
          await saveProfile(updatedProfile).catch((err) =>
            console.warn('[useGameStore] Failed to save updated profile:', err)
          );
        }
      }
    }

    // Prepend new match, deduplicating if needed
    const nextHistory = [result, ...matchHistory.filter((m) => m.id !== result.id)];

    set({
      club: updatedClub,
      profile: updatedProfile,
      matchHistory: nextHistory,
      currentMatch: result,
    });
  },

  resetGame: async () => {
    try {
      await resetAllData();
    } catch (err) {
      console.error('[useGameStore] resetAllData failed:', err);
    }

    set({
      club: null,
      profile: DEFAULT_PROFILE,
      matchHistory: [],
      currentMatch: null,
      activeTab: 'home',
      isLoading: false,
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
    const updatedProfile: ManagerProfile = {
      ...profile,
      ...updates,
    };

    await saveProfile(updatedProfile);
    set({ profile: updatedProfile });
  },
}));
