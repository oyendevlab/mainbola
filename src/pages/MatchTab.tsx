import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PRESET_AI_CLUBS, generateClub, createClubSnapshot } from '../engine/generator';
import { simulateMatch } from '../engine/simulator';
import { getRandomWeather, getWeatherEffects } from '../engine/weather';
import { getPvPRank } from '../engine/pvp';
import { MatchResult, MatchEvent, TacticalStyle, Player } from '../types';
import { PhaserGame, PhaserGameRef } from '../renderer/PhaserGame';
import { BadgeIcon } from '../components/common/BadgeIcon';
import { PressConferenceModal } from '../components/match/PressConferenceModal';
import { PvPChallengeModal } from '../components/match/PvPChallengeModal';
import { ScoutingReportModal } from '../components/match/ScoutingReportModal';
import { ScenarioChallengeModal } from '../components/match/ScenarioChallengeModal';
import { speakCommentary, stopCommentary } from '../engine/commentary';
import { executeScenarioChallenge } from '../engine/scenarios';
import { ScenarioDefinition } from '../types/scenarios';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Shield,
  Activity,
  ChevronRight,
  Volume2,
  VolumeX,
  ArrowLeftRight,
  Mic,
  MicOff,
  Swords,
  Search,
  Target,
} from 'lucide-react';

export const MatchTab: React.FC = () => {
  const {
    club,
    profile,
    recordMatchResult,
    recordPvPResult,
    completeScenario,
    toggleCommentaryVoice,
    setActiveTab,
    updateTactics,
    setStartingXI,
    updateProfile,
  } = useGameStore();

  const [selectedOpponentConfig, setSelectedOpponentConfig] = useState(PRESET_AI_CLUBS[0]);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(profile.replaySpeed || 1);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [commentary, setCommentary] = useState<string>('Pre-match preparation complete.');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showHalftimeModal, setShowHalftimeModal] = useState(false);
  const [halftimeTactics, setHalftimeTactics] = useState<TacticalStyle>(club?.tactics || 'Balanced');
  const [selectedSubStarterId, setSelectedSubStarterId] = useState<string | null>(null);
  const [subsCount, setSubsCount] = useState(0);

  // Version 0.6.0 & 0.7.0 Modals & States
  const [showPressModal, setShowPressModal] = useState(false);
  const [showPvPModal, setShowPvPModal] = useState(false);
  const [showScoutingModal, setShowScoutingModal] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioDefinition | null>(null);
  const [currentMatchSeed] = useState(() => Date.now());
  const [pvpOpponentRating, setPvpOpponentRating] = useState<number | null>(null);

  const phaserRef = useRef<PhaserGameRef | null>(null);

  // Detect #challenge= in window.location.hash on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash;
      const match = hash.match(/#challenge=([^&]+)/);
      if (match && match[1]) {
        setShowPvPModal(true);
      }
    }
  }, []);

  // Sync replay speed preference on mount
  useEffect(() => {
    if (profile.replaySpeed) {
      setPlaybackSpeed(profile.replaySpeed);
    }
  }, [profile.replaySpeed]);

  if (!club) return null;

  // Pre-match forecast weather for currentMatchSeed
  const matchWeather = getRandomWeather(currentMatchSeed);
  const weatherFx = getWeatherEffects(matchWeather);

  const handleStartMatch = () => {
    // Generate AI Club from preset
    const aiClub = generateClub(
      selectedOpponentConfig.name,
      selectedOpponentConfig.primaryColor,
      selectedOpponentConfig.secondaryColor,
      selectedOpponentConfig.badgeId,
      selectedOpponentConfig.formation,
      selectedOpponentConfig.tactics,
      Date.now() + 1
    );

    const homeSnapshot = createClubSnapshot(club);
    const awaySnapshot = createClubSnapshot(aiClub);

    // Deterministic simulation with seed & weather
    const seed = currentMatchSeed;
    const result = simulateMatch(homeSnapshot, awaySnapshot, seed, matchWeather);

    setPvpOpponentRating(null);
    setMatchResult(result);
    setHomeScore(0);
    setAwayScore(0);
    setCurrentMinute(0);
    setCommentary('Kickoff! The match is underway.');
    setIsPlayingReplay(true);
    setIsPaused(false);
    setShowStatsModal(false);
    setShowHalftimeModal(false);
    setSubsCount(0);
    setSelectedSubStarterId(null);
    setHalftimeTactics(club.tactics);
  };

  const handleStartPvPMatch = (result: MatchResult, opponentRating: number) => {
    setActiveScenario(null);
    setPvpOpponentRating(opponentRating);
    setMatchResult(result);
    setHomeScore(0);
    setAwayScore(0);
    setCurrentMinute(0);
    setCommentary(`PvP Duel Kickoff! ${result.homeClub.name} vs ${result.awayClub.name}`);
    setIsPlayingReplay(true);
    setIsPaused(false);
    setShowStatsModal(false);
    setShowHalftimeModal(false);
    setSubsCount(0);
    setSelectedSubStarterId(null);
    setHalftimeTactics(club.tactics);
  };

  const handleStartScenario = (scenario: ScenarioDefinition) => {
    const exec = executeScenarioChallenge(club, scenario, Date.now());
    setActiveScenario(scenario);
    setPvpOpponentRating(null);
    setMatchResult(exec.matchResult);
    setHomeScore(scenario.initialHomeScore);
    setAwayScore(scenario.initialAwayScore);
    setCurrentMinute(scenario.startingMinute);
    setCommentary(`Misi Senario: ${scenario.title} bermula! Objektif: ${scenario.targetDescription}`);
    setIsPlayingReplay(true);
    setIsPaused(false);
    setShowStatsModal(false);
    setShowHalftimeModal(false);
    setSubsCount(0);
    setSelectedSubStarterId(null);
    setHalftimeTactics(club.tactics);
  };

  const handleHalftime = () => {
    setIsPaused(true);
    setShowHalftimeModal(true);
    phaserRef.current?.pause();
  };

  const handleResumeSecondHalf = () => {
    if (halftimeTactics !== club.tactics) {
      updateTactics(halftimeTactics);
    }
    setShowHalftimeModal(false);
    setIsPaused(false);
    phaserRef.current?.resume();
  };

  const handleToggleSound = () => {
    updateProfile({ soundEnabled: !profile.soundEnabled });
  };

  const handleSubstitute = (benchPlayer: Player) => {
    if (!selectedSubStarterId || subsCount >= 3) return;
    const newXI = club.startingXI.map((id) => (id === selectedSubStarterId ? benchPlayer.id : id));
    setStartingXI(newXI);
    setSubsCount((prev) => prev + 1);
    setSelectedSubStarterId(null);
  };

  const handlePauseResume = () => {
    if (isPaused) {
      phaserRef.current?.resume();
      setIsPaused(false);
    } else {
      phaserRef.current?.pause();
      setIsPaused(true);
    }
  };

  const handleChangeSpeed = (speed: 1 | 2 | 4) => {
    setPlaybackSpeed(speed);
    phaserRef.current?.setSpeed(speed);
  };

  const handleRestartReplay = () => {
    stopCommentary();
    phaserRef.current?.restart();
    setHomeScore(0);
    setAwayScore(0);
    setCurrentMinute(0);
    setCommentary('Replay restarted. Kickoff!');
    setShowStatsModal(false);
    setIsPaused(false);
  };

  const handleTimeUpdate = (minute: number) => {
    setCurrentMinute(minute);
  };

  const handleEvent = (event: MatchEvent) => {
    setCommentary(`${event.minute}' ${event.description}`);
    // Version 0.7.0 Web Speech API Live Commentary
    speakCommentary(event, {
      enabled: profile.commentaryVoiceEnabled ?? true,
      language: profile.commentaryLanguage ?? 'ms',
    });
  };

  const handleScoreUpdate = (h: number, a: number) => {
    setHomeScore(h);
    setAwayScore(a);
  };

  const handleMatchEnd = () => {
    setShowStatsModal(true);
    stopCommentary();

    if (matchResult) {
      if (activeScenario) {
        let success = false;
        if (activeScenario.targetGoal === 'draw_or_win') {
          success = matchResult.homeScore >= matchResult.awayScore;
        } else if (activeScenario.targetGoal === 'clean_sheet_win') {
          success = matchResult.awayScore === activeScenario.initialAwayScore && matchResult.homeScore > matchResult.awayScore;
        } else if (activeScenario.targetGoal === 'win') {
          success = matchResult.homeScore > matchResult.awayScore;
        }

        if (success) {
          completeScenario(activeScenario.id, activeScenario.creditReward);
        }
        setActiveScenario(null);
      } else if (pvpOpponentRating !== null) {
        recordPvPResult(matchResult, pvpOpponentRating);
      } else {
        recordMatchResult(matchResult);
      }

      // Trigger celebratory confetti if user club won
      const isHome = matchResult.homeClub.id === club.id;
      const userWon = isHome
        ? matchResult.homeScore > matchResult.awayScore
        : matchResult.awayScore > matchResult.homeScore;

      if (userWon) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10B981', '#34D399', '#FBBF24'],
          });
        } catch {
          // ignore if canvas unavailable
        }
      }
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-200">
      {/* View 1: Match Setup & Opponent Selector (when not watching replay) */}
      {!isPlayingReplay && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Quick Match Simulator</h2>
                <p className="text-xs text-slate-400">
                  Select an AI opponent and test your tactical setup in full 2D pixel-art.
                </p>
              </div>
            </div>

            {/* Matchup Preview */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/80">
              {/* Home: User Club */}
              <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 flex items-center gap-3">
                <BadgeIcon
                  badgeId={club.badgeId}
                  primaryColor={club.primaryColor}
                  secondaryColor={club.secondaryColor}
                  size={40}
                />
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">Home Team</span>
                  <div className="text-xs font-bold text-white truncate">{club.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {club.formation} • {club.tactics}
                  </div>
                </div>
              </div>

              {/* Away: Selected Opponent */}
              <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 flex items-center gap-3">
                <BadgeIcon
                  badgeId={selectedOpponentConfig.badgeId}
                  primaryColor={selectedOpponentConfig.primaryColor}
                  secondaryColor={selectedOpponentConfig.secondaryColor}
                  size={40}
                />
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">Away Team</span>
                  <div className="text-xs font-bold text-white truncate">{selectedOpponentConfig.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {selectedOpponentConfig.formation} • {selectedOpponentConfig.tactics}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pre-Match Weather Forecast & Press Conference Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Weather Forecast Badge */}
            <div className="p-3.5 rounded-2xl bg-navy-900 border border-slate-800 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xl">
                  {weatherFx.icon}
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ramalan Cuaca Padang
                  </span>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{weatherFx.label}</span>
                    <span className="text-[10px] text-slate-400">({matchWeather})</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{weatherFx.description}</p>
                </div>
              </div>
            </div>

            {/* Press Conference Action */}
            <div className="p-3.5 rounded-2xl bg-navy-900 border border-slate-800 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Mic className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">
                    Bilik Media
                  </span>
                  <div className="text-xs font-bold text-white truncate">Sidang Media Pra-Perlawanan</div>
                  <p className="text-[10px] text-slate-400 truncate">Jawab soalan wartawan untuk rangsang moral</p>
                </div>
              </div>
              <button
                onClick={() => setShowPressModal(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition shrink-0 cursor-pointer"
              >
                Masuk
              </button>
            </div>
          </div>

          {/* PvP Challenge Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/60 to-purple-950/60 border border-purple-800/40 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                <Swords className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Cabaran PvP (Lawan Rakan)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Elo {club.pvpRating ?? 1200} • {getPvPRank(club.pvpRating ?? 1200).title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Kongsi kod cabaran pasukan atau masukkan kod rakan untuk duel asinkronus!
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPvPModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-navy-950 font-bold text-xs transition shrink-0 cursor-pointer shadow-lg shadow-purple-500/20"
            >
              Cabaran PvP
            </button>
          </div>

          {/* Version 0.7.0 Scouting Intel & Scenario Mode Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Scouting Report Action */}
            <div className="p-3.5 rounded-2xl bg-navy-900 border border-slate-800 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Search className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider block">
                    Perisikan Lawan
                  </span>
                  <div className="text-xs font-bold text-white truncate">Laporan Pengakap</div>
                  <p className="text-[10px] text-slate-400 truncate">Analisis bahaya & cadangan taktik balas</p>
                </div>
              </div>
              <button
                onClick={() => setShowScoutingModal(true)}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition shrink-0 cursor-pointer"
              >
                Semak
              </button>
            </div>

            {/* Scenario Challenge Mode Action */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-navy-900 border border-amber-800/40 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">
                    Mod Cabaran
                  </span>
                  <div className="text-xs font-bold text-white truncate">Misi Keajaiban</div>
                  <p className="text-[10px] text-slate-400 truncate">Senario genting & ganjaran kredit</p>
                </div>
              </div>
              <button
                onClick={() => setShowScenarioModal(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 font-bold text-xs transition shrink-0 cursor-pointer shadow-md shadow-amber-500/20"
              >
                Pilih Misi
              </button>
            </div>
          </div>

          {/* AI Opponent Selector Carousel / Grid */}
          <div className="rounded-2xl bg-navy-900 border border-slate-800 p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              Choose Opponent
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_AI_CLUBS.map((opponent) => {
                const isSelected = selectedOpponentConfig.name === opponent.name;
                return (
                  <button
                    key={opponent.name}
                    onClick={() => setSelectedOpponentConfig(opponent)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10'
                        : 'border-slate-800 bg-navy-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BadgeIcon
                        badgeId={opponent.badgeId}
                        primaryColor={opponent.primaryColor}
                        secondaryColor={opponent.secondaryColor}
                        size={36}
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{opponent.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {opponent.formation} • {opponent.tactics}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono font-bold text-slate-400 block">Rating</span>
                      <span className="text-xs font-mono font-extrabold text-amber-400">
                        {opponent.baseRating || 75}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Match Action */}
          <button
            onClick={handleStartMatch}
            className="w-full py-4 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-navy-950 shadow-2xl shadow-emerald-500/30 transition transform active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer uppercase tracking-wider"
          >
            <Play className="w-5 h-5 fill-navy-950" />
            <span>Kick Off Match Simulation</span>
          </button>
        </div>
      )}

      {/* View 2: Live 2D Match Replay Viewport */}
      {isPlayingReplay && matchResult && (
        <div className="space-y-4">
          {/* Top Scoreboard & Timer Bar */}
          <div className="rounded-2xl bg-navy-900 border border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              {/* Home Team */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <BadgeIcon
                  badgeId={matchResult.homeClub.badgeId}
                  primaryColor={matchResult.homeClub.primaryColor}
                  secondaryColor={matchResult.homeClub.secondaryColor}
                  size={28}
                />
                <span className="text-xs font-bold text-white truncate max-w-[90px] sm:max-w-none">
                  {matchResult.homeClub.name}
                </span>
              </div>

              {/* Live Score & Clock */}
              <div className="flex flex-col items-center px-3">
                <div className="text-lg font-black font-mono tracking-widest text-white bg-navy-950 px-3 py-1 rounded-xl border border-slate-800">
                  <span className="text-emerald-400">{homeScore}</span>
                  <span className="text-slate-500 mx-1.5">:</span>
                  <span className="text-amber-400">{awayScore}</span>
                </div>
                <div className="text-[10px] font-mono font-bold text-slate-400 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  <span>{currentMinute}' MIN</span>
                </div>
              </div>

              {/* Away Team */}
              <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                <span className="text-xs font-bold text-white truncate max-w-[90px] sm:max-w-none">
                  {matchResult.awayClub.name}
                </span>
                <BadgeIcon
                  badgeId={matchResult.awayClub.badgeId}
                  primaryColor={matchResult.awayClub.primaryColor}
                  secondaryColor={matchResult.awayClub.secondaryColor}
                  size={28}
                />
              </div>
            </div>
          </div>

          {/* Phaser 3 Replay Canvas Viewport (16:9 Aspect Ratio) */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-black">
            <PhaserGame
              ref={phaserRef}
              events={matchResult.events}
              weather={matchResult.weather}
              homeTeam={{
                id: matchResult.homeClub.id,
                name: matchResult.homeClub.name,
                primaryColor: matchResult.homeClub.primaryColor,
                secondaryColor: matchResult.homeClub.secondaryColor,
                formation: matchResult.homeClub.formation,
              }}
              awayTeam={{
                id: matchResult.awayClub.id,
                name: matchResult.awayClub.name,
                primaryColor: matchResult.awayClub.primaryColor,
                secondaryColor: matchResult.awayClub.secondaryColor,
                awayPrimaryColor: matchResult.awayClub.awayPrimaryColor,
                awaySecondaryColor: matchResult.awayClub.awaySecondaryColor,
                kitPattern: matchResult.awayClub.kitPattern,
                formation: matchResult.awayClub.formation,
              }}
              playbackSpeed={playbackSpeed}
              isPaused={isPaused}
              onTimeUpdate={handleTimeUpdate}
              onEvent={handleEvent}
              onScoreUpdate={handleScoreUpdate}
              onHalftime={handleHalftime}
              onMatchEnd={handleMatchEnd}
              className="w-full aspect-[16/9] block"
            />
          </div>

          {/* Live Commentary Ticker */}
          <div className="p-3 rounded-xl bg-navy-900 border border-slate-800 flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-medium text-slate-200 truncate">{commentary}</span>
          </div>

          {/* Replay Controls Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-navy-900 border border-slate-800">
            {/* Play/Pause & Restart & Audio */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePauseResume}
                className="p-2.5 rounded-xl bg-navy-950 border border-slate-700 hover:border-slate-600 text-white transition cursor-pointer"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
              </button>

              <button
                onClick={handleRestartReplay}
                className="p-2.5 rounded-xl bg-navy-950 border border-slate-700 hover:border-slate-600 text-slate-300 transition cursor-pointer"
                title="Restart Replay"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleToggleSound}
                className="p-2.5 rounded-xl bg-navy-950 border border-slate-700 hover:border-slate-600 transition cursor-pointer"
                title={profile.soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
                aria-label="Toggle Sound"
                data-testid="sound-toggle"
              >
                {profile.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
              </button>

              <button
                onClick={() => toggleCommentaryVoice()}
                className="p-2.5 rounded-xl bg-navy-950 border border-slate-700 hover:border-slate-600 transition cursor-pointer"
                title={profile.commentaryVoiceEnabled ?? true ? 'Matikan Suara Ulasan' : 'Hidupkan Suara Ulasan'}
                aria-label="Toggle Commentary Voice"
                data-testid="commentary-voice-toggle"
              >
                {profile.commentaryVoiceEnabled ?? true ? (
                  <Mic className="w-4 h-4 text-cyan-400" />
                ) : (
                  <MicOff className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>

            {/* Speed Buttons: 1x, 2x, 4x */}
            <div className="flex items-center gap-1.5 bg-navy-950 p-1 rounded-xl border border-slate-800">
              {([1, 2, 4] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleChangeSpeed(spd)}
                  className={`px-3 py-1 rounded-lg font-mono font-bold text-xs transition cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-emerald-500 text-navy-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Post-match / Done Button */}
            <button
              onClick={() => setShowStatsModal(true)}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/30 flex items-center gap-1 transition"
            >
              <span>Stats</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Match Breakdown / Statistics Modal */}
      {showStatsModal && matchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-navy-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl my-auto animate-in zoom-in-95 duration-150">
            {/* Final Result Header */}
            <div className="text-center mb-5">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  Perlawanan Selesai
                </span>
                {matchResult.weather && (
                  <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                    {getWeatherEffects(matchResult.weather).icon} {getWeatherEffects(matchResult.weather).label}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="text-right">
                  <div className="text-xs font-bold text-white">{matchResult.homeClub.name}</div>
                  <span className="text-[10px] text-slate-400">Home</span>
                </div>
                <div className="text-2xl font-black font-mono text-white px-3 py-1 rounded-xl bg-navy-950 border border-slate-800">
                  {matchResult.homeScore} - {matchResult.awayScore}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white">{matchResult.awayClub.name}</div>
                  <span className="text-[10px] text-slate-400">Away</span>
                </div>
              </div>
            </div>

            {/* Man of the Match (MOTM) Card */}
            {matchResult.motmPlayerName && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/30 flex items-center justify-between mb-4 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/30 border border-amber-500/50 flex items-center justify-center text-lg shadow-inner">
                    ⭐
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block">
                      Pemain Terbaik Perlawanan (MOTM)
                    </span>
                    <span className="text-xs font-bold text-white">{matchResult.motmPlayerName}</span>
                  </div>
                </div>
                {matchResult.playerRatings && matchResult.motmPlayerId && (
                  <div className="px-2.5 py-1 rounded-lg bg-amber-400 text-navy-950 font-black font-mono text-xs shadow">
                    ★ {matchResult.playerRatings[matchResult.motmPlayerId] ?? 8.5}
                  </div>
                )}
              </div>
            )}

            {/* Match Statistics Comparison */}
            <div className="space-y-3 p-4 rounded-xl bg-navy-950 border border-slate-800 mb-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
                Statistik Perlawanan
              </h4>

              {/* Possession */}
              <div>
                <div className="flex justify-between text-xs font-mono font-bold text-slate-300 mb-1">
                  <span>{matchResult.homeStats.possession}%</span>
                  <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase">Penguasaan Bola</span>
                  <span>{matchResult.awayStats.possession}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden flex bg-slate-800">
                  <div
                    style={{ width: `${matchResult.homeStats.possession}%` }}
                    className="bg-emerald-500 h-full"
                  />
                  <div
                    style={{ width: `${matchResult.awayStats.possession}%` }}
                    className="bg-amber-500 h-full"
                  />
                </div>
              </div>

              {/* Shots */}
              <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/80">
                <span className="font-mono font-bold text-white">{matchResult.homeStats.shots}</span>
                <span className="text-slate-400 text-[11px]">Jumlah Percubaan</span>
                <span className="font-mono font-bold text-white">{matchResult.awayStats.shots}</span>
              </div>

              {/* Shots on Target */}
              <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/80">
                <span className="font-mono font-bold text-emerald-400">{matchResult.homeStats.shotsOnTarget}</span>
                <span className="text-slate-400 text-[11px]">Percubaan Tepat</span>
                <span className="font-mono font-bold text-emerald-400">{matchResult.awayStats.shotsOnTarget}</span>
              </div>

              {/* Saves */}
              <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/80">
                <span className="font-mono font-bold text-white">{matchResult.homeStats.saves}</span>
                <span className="text-slate-400 text-[11px]">Tangkapan Penjaga Gol</span>
                <span className="font-mono font-bold text-white">{matchResult.awayStats.saves}</span>
              </div>

              {/* Tackles */}
              <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/80">
                <span className="font-mono font-bold text-white">{matchResult.homeStats.tackles}</span>
                <span className="text-slate-400 text-[11px]">Tackle Berjaya</span>
                <span className="font-mono font-bold text-white">{matchResult.awayStats.tackles}</span>
              </div>
            </div>

            {/* Individual Player Ratings Accordion / List */}
            {matchResult.playerRatings && (
              <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 mb-6 max-h-40 overflow-y-auto space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Penilaian Pemain (Ratings)</span>
                  <span className="text-[9px] text-slate-500 font-normal">Skala 5.0 - 10.0</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Home Ratings */}
                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-emerald-400 uppercase truncate">
                      {matchResult.homeClub.name}
                    </div>
                    {matchResult.homeClub.startingXI.map((p) => {
                      const rating = matchResult.playerRatings?.[p.id] ?? 6.0;
                      return (
                        <div key={p.id} className="flex items-center justify-between text-[11px] bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/80">
                          <span className="text-slate-300 truncate max-w-[80px]">{p.name}</span>
                          <span className={`font-mono font-bold ${rating >= 8.0 ? 'text-amber-400' : rating >= 7.0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {rating.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Away Ratings */}
                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-amber-400 uppercase truncate">
                      {matchResult.awayClub.name}
                    </div>
                    {matchResult.awayClub.startingXI.map((p) => {
                      const rating = matchResult.playerRatings?.[p.id] ?? 6.0;
                      return (
                        <div key={p.id} className="flex items-center justify-between text-[11px] bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/80">
                          <span className="text-slate-300 truncate max-w-[80px]">{p.name}</span>
                          <span className={`font-mono font-bold ${rating >= 8.0 ? 'text-amber-400' : rating >= 7.0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {rating.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowStatsModal(false);
                  setIsPlayingReplay(false);
                }}
                className="flex-1 py-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-center"
              >
                Match Center
              </button>
              <button
                onClick={() => {
                  setShowStatsModal(false);
                  setIsPlayingReplay(false);
                  setActiveTab('home');
                }}
                className="flex-1 py-3 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-navy-950 transition text-center shadow-lg shadow-emerald-500/25"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Halftime Tactical Interventions & Substitutions Modal */}
      {showHalftimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-navy-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="text-center mb-5 border-b border-slate-800 pb-4">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 inline-flex items-center gap-1.5 mb-2">
                ⏱️ Rehat Separuh Masa (Minut 45')
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">Arahan & Pertukaran Taktikal</h3>
              <p className="text-xs text-slate-400 mt-1">
                Skor Semasa: <span className="font-mono font-bold text-emerald-400">{homeScore}</span> - <span className="font-mono font-bold text-amber-400">{awayScore}</span> • Pertukaran: <span className="font-mono text-white font-bold">{subsCount}/3</span>
              </p>
            </div>

            {/* Tactical Mentality Selection */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Mentaliti Taktikal Separuh Masa Ke-2
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Defensive', 'Balanced', 'Attacking'] as TacticalStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => setHalftimeTactics(style)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      halftimeTactics === style
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-navy-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>{style === 'Defensive' ? '🛡️ Bertahan' : style === 'Balanced' ? '⚖️ Seimbang' : '⚡ Menyerang'}</span>
                    <span className="text-[10px] font-normal opacity-70">
                      {style === 'Defensive' ? '-Concede' : style === 'Balanced' ? 'Default' : '+Chance'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Substitutions Section */}
            <div className="mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Pertukaran Pemain ({3 - subsCount} baki)
                </label>
                {selectedSubStarterId && (
                  <button
                    onClick={() => setSelectedSubStarterId(null)}
                    className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                  >
                    Batal Pilihan
                  </button>
                )}
              </div>

              {selectedSubStarterId ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                  <span>Pilih pemain simpanan di bawah untuk menggantikan kesebelasan utama:</span>
                  <ArrowLeftRight className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  {subsCount >= 3
                    ? 'Had maksima 3 pertukaran pemain telah dicapai.'
                    : 'Klik seorang pemain kesebelasan utama, kemudian klik pemain simpanan untuk bertukar.'}
                </p>
              )}

              {/* Starting XI List (Select Starter to sub out) */}
              <div className="bg-navy-950 p-2.5 rounded-xl border border-slate-800 max-h-36 overflow-y-auto space-y-1">
                <div className="text-[10px] font-mono text-slate-500 font-bold uppercase mb-1">
                  Kesebelasan Utama (Klik untuk pilih ganti):
                </div>
                {club.startingXI.map((id) => {
                  const player = club.squad.find((p) => p.id === id);
                  if (!player) return null;
                  const isSelected = selectedSubStarterId === player.id;
                  return (
                    <button
                      key={player.id}
                      disabled={subsCount >= 3}
                      onClick={() => setSelectedSubStarterId(isSelected ? null : player.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                          : 'hover:bg-slate-800/60 text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                          {player.position}
                        </span>
                        <span className="font-semibold text-xs">{player.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-400 font-bold">
                        OVR {player.overallRating}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Bench List (Substitutes) */}
              <div className="bg-navy-950 p-2.5 rounded-xl border border-slate-800 max-h-32 overflow-y-auto space-y-1">
                <div className="text-[10px] font-mono text-slate-500 font-bold uppercase mb-1">
                  Pemain Simpanan (Bangku Simpanan):
                </div>
                {club.squad
                  .filter((p) => !club.startingXI.includes(p.id))
                  .map((benchPlayer) => (
                    <button
                      key={benchPlayer.id}
                      disabled={!selectedSubStarterId || subsCount >= 3}
                      onClick={() => handleSubstitute(benchPlayer)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                        selectedSubStarterId && subsCount < 3
                          ? 'hover:bg-emerald-500/20 hover:border-emerald-500 border border-transparent text-emerald-300 cursor-pointer'
                          : 'opacity-50 cursor-not-allowed text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {benchPlayer.position}
                        </span>
                        <span className="font-medium text-xs">{benchPlayer.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-300">
                          OVR {benchPlayer.overallRating}
                        </span>
                        {selectedSubStarterId && subsCount < 3 && (
                          <span className="text-[10px] bg-emerald-500 text-navy-950 font-bold px-1.5 py-0.5 rounded">
                            Ganti Masuk
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Resume Button */}
            <button
              onClick={handleResumeSecondHalf}
              className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-navy-950 transition text-center shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Sambung Separuh Masa Kedua</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Press Conference Modal */}
      <PressConferenceModal
        isOpen={showPressModal}
        onClose={() => setShowPressModal(false)}
        seed={currentMatchSeed}
      />

      {/* PvP Challenge Modal */}
      <PvPChallengeModal
        isOpen={showPvPModal}
        onClose={() => setShowPvPModal(false)}
        onStartPvPMatch={handleStartPvPMatch}
      />

      {/* Version 0.7.0 Opposition Scouting Report Modal */}
      <ScoutingReportModal
        isOpen={showScoutingModal}
        onClose={() => setShowScoutingModal(false)}
        opponent={createClubSnapshot(
          generateClub(
            selectedOpponentConfig.name,
            selectedOpponentConfig.primaryColor,
            selectedOpponentConfig.secondaryColor,
            selectedOpponentConfig.badgeId,
            selectedOpponentConfig.formation,
            selectedOpponentConfig.tactics,
            1234
          )
        )}
      />

      {/* Version 0.7.0 Scenario Challenge Modal */}
      <ScenarioChallengeModal
        isOpen={showScenarioModal}
        onClose={() => setShowScenarioModal(false)}
        onStartScenario={handleStartScenario}
      />
    </div>
  );
};
