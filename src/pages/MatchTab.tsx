import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PRESET_AI_CLUBS, generateClub, createClubSnapshot } from '../engine/generator';
import { simulateMatch } from '../engine/simulator';
import { MatchResult, MatchEvent } from '../types';
import { PhaserGame, PhaserGameRef } from '../renderer/PhaserGame';
import { BadgeIcon } from '../components/common/BadgeIcon';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Shield,
  Activity,
  ChevronRight,
} from 'lucide-react';

export const MatchTab: React.FC = () => {
  const { club, profile, recordMatchResult, setActiveTab } = useGameStore();

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

  const phaserRef = useRef<PhaserGameRef | null>(null);

  // Sync replay speed preference on mount
  useEffect(() => {
    if (profile.replaySpeed) {
      setPlaybackSpeed(profile.replaySpeed);
    }
  }, [profile.replaySpeed]);

  if (!club) return null;

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

    // Deterministic simulation with seed
    const seed = Date.now();
    const result = simulateMatch(homeSnapshot, awaySnapshot, seed);

    setMatchResult(result);
    setHomeScore(0);
    setAwayScore(0);
    setCurrentMinute(0);
    setCommentary('Kickoff! The match is underway.');
    setIsPlayingReplay(true);
    setIsPaused(false);
    setShowStatsModal(false);
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
  };

  const handleScoreUpdate = (h: number, a: number) => {
    setHomeScore(h);
    setAwayScore(a);
  };

  const handleMatchEnd = () => {
    setShowStatsModal(true);

    if (matchResult) {
      recordMatchResult(matchResult);

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
                formation: matchResult.awayClub.formation,
              }}
              playbackSpeed={playbackSpeed}
              isPaused={isPaused}
              onTimeUpdate={handleTimeUpdate}
              onEvent={handleEvent}
              onScoreUpdate={handleScoreUpdate}
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
            {/* Play/Pause & Restart */}
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
            <div className="text-center mb-6">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 inline-block mb-2">
                Match Completed
              </span>
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

            {/* Match Statistics Comparison */}
            <div className="space-y-3 p-4 rounded-xl bg-navy-950 border border-slate-800 mb-6">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
                Match Statistics
              </h4>

              {/* Possession */}
              <div>
                <div className="flex justify-between text-xs font-mono font-bold text-slate-300 mb-1">
                  <span>{matchResult.homeStats.possession}%</span>
                  <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase">Possession</span>
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
                <span className="text-slate-400 text-[11px]">Total Shots</span>
                <span className="font-mono font-bold text-white">{matchResult.awayStats.shots}</span>
              </div>

              {/* Shots on Target */}
              <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/80">
                <span className="font-mono font-bold text-emerald-400">{matchResult.homeStats.shotsOnTarget}</span>
                <span className="text-slate-400 text-[11px]">Shots on Target</span>
                <span className="font-mono font-bold text-emerald-400">{matchResult.awayStats.shotsOnTarget}</span>
              </div>

              {/* Saves */}
              <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/80">
                <span className="font-mono font-bold text-white">{matchResult.homeStats.saves}</span>
                <span className="text-slate-400 text-[11px]">Goalkeeper Saves</span>
                <span className="font-mono font-bold text-white">{matchResult.awayStats.saves}</span>
              </div>

              {/* Tackles */}
              <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/80">
                <span className="font-mono font-bold text-white">{matchResult.homeStats.tackles}</span>
                <span className="text-slate-400 text-[11px]">Tackles Made</span>
                <span className="font-mono font-bold text-white">{matchResult.awayStats.tackles}</span>
              </div>
            </div>

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
    </div>
  );
};
