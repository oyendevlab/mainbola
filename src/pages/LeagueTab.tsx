import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { BadgeIcon } from '../components/common/BadgeIcon';
import { PhaserGame } from '../renderer/PhaserGame';
import {
  Trophy,
  KeyRound,
  Play,
  Sparkles,
  ArrowRight,
  Calendar,
  Lock,
  Award,
  X,
  Share2,
  Check,
} from 'lucide-react';
import { LeagueFixture } from '../types/league';

export const LeagueTab: React.FC = () => {
  const {
    club,
    activeLeague,
    createLeague,
    joinLeagueByCode,
    submitLeagueTactics,
    simulateLeagueMatchday,
    leaveLeague,
    claimLeaguePrize,
    startNewLeagueSeason,
  } = useGameStore();

  // Create League form states
  const [leagueName, setLeagueName] = useState('Premier Cup');
  const [teamCount, setTeamCount] = useState<4 | 6>(4);
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [prizeFeedback, setPrizeFeedback] = useState<string | null>(null);

  // Active League view states
  const [activeSubTab, setActiveSubTab] = useState<'standings' | 'fixtures' | 'scorers'>('standings');
  const [selectedRound, setSelectedRound] = useState(activeLeague?.currentRound || 1);
  const [inspectingFixture, setInspectingFixture] = useState<LeagueFixture | null>(null);

  if (!club) return null;

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueName.trim()) return;
    try {
      setIsSubmitting(true);
      await createLeague(leagueName, teamCount);
      setSelectedRound(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      setIsSubmitting(true);
      await joinLeagueByCode(joinCode);
      setSelectedRound(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!activeLeague) return;
    navigator.clipboard.writeText(activeLeague.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSimulateRound = async () => {
    setIsSubmitting(true);
    try {
      await simulateLeagueMatchday();
      if (activeLeague) {
        setSelectedRound(Math.min(activeLeague.totalRounds, activeLeague.currentRound + 1));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. NO ACTIVE LEAGUE: CREATE OR JOIN A PRIVATE LEAGUE                      */}
      {/* ========================================================================= */}
      {!activeLeague ? (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-slate-800 p-5 shadow-xl">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">Private Leagues</h2>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Phase 2 Live
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Organize asynchronous round-robin tournaments, submit tactics, and share pixel replays.
                </p>
              </div>
            </div>
          </div>

          {/* Create League Form */}
          <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 shadow-xl">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Create New Private League
            </h3>

            <form onSubmit={handleCreateLeague} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  League Championship Name
                </label>
                <input
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  placeholder="e.g. Premier Cup, Super 4"
                  maxLength={30}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Number of Teams
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([4, 6] as const).map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setTeamCount(count)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        teamCount === count
                          ? 'border-emerald-500 bg-emerald-500/15 text-white font-bold'
                          : 'border-slate-800 bg-navy-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-sm font-extrabold">{count} Teams</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{count - 1} Fixture Matchdays</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-navy-950 shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
              >
                <Trophy className="w-4 h-4 fill-navy-950" />
                <span>Found League & Schedule Fixtures</span>
              </button>
            </form>
          </div>

          {/* Join with Code */}
          <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 shadow-xl">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              Join via Invitation Code
            </h3>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Have an invitation code from a friend? Enter it below to register your club in their private tournament.
            </p>

            <form onSubmit={handleJoinLeague} className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. RUSH-88"
                maxLength={10}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-navy-950 border border-slate-700 text-white font-mono text-sm placeholder-slate-500 uppercase focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={isSubmitting || !joinCode.trim()}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-navy-950 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>Join</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. ACTIVE LEAGUE COMPETITION VIEW                                         */
        /* ========================================================================= */
        <div className="space-y-5">
          {/* League Header Card */}
          <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">{activeLeague.name}</h2>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      activeLeague.status === 'completed'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    }`}
                  >
                    {activeLeague.status === 'completed'
                      ? 'CHAMPIONSHIP COMPLETE'
                      : `MATCHDAY ${activeLeague.currentRound} / ${activeLeague.totalRounds}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>Season {activeLeague.season}</span>
                  <span>•</span>
                  <span>{activeLeague.teams.length} Clubs</span>
                </div>
              </div>

              {/* Invitation Code with Copy button */}
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-xl bg-navy-950 border border-slate-700 hover:border-slate-600 flex items-center gap-1.5 transition text-xs font-mono text-slate-300 cursor-pointer"
                title="Copy Invitation Code"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-white text-[11px]">{activeLeague.code}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Season Complete Ceremony Card */}
          {activeLeague.status === 'completed' && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-navy-900 to-amber-500/10 border border-amber-500/40 p-4 shadow-xl space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-2xl shrink-0">
                  🏆
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-amber-300 tracking-tight">
                    Musim Ke-{activeLeague.season} Selesai Sepenuhnya!
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {activeLeague.standings.length > 0 && activeLeague.standings[0].clubId === club.id
                      ? 'Tahniah! Kelab anda berjaya merangkul takhta Juara Liga Musim ini.'
                      : `Juara rasmi dinobatkan kepada ${activeLeague.standings[0]?.clubName || 'Juara'}.`}
                  </p>
                </div>
              </div>

              {prizeFeedback && (
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-xs font-semibold text-amber-200">
                  {prizeFeedback}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {activeLeague.standings.length > 0 && activeLeague.standings[0].clubId === club.id && (
                  <button
                    onClick={async () => {
                      const res = await claimLeaguePrize();
                      setPrizeFeedback(res.message);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    Tuntut Hadiah Juara (25,000 C)
                  </button>
                )}

                <button
                  onClick={async () => {
                    await startNewLeagueSeason();
                    setSelectedRound(1);
                    setPrizeFeedback('Musim baharu telah bermula!');
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-black text-xs transition cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  Mulakan Musim Seterusnya
                </button>
              </div>
            </div>
          )}

          {/* Subtabs Selector: Standings, Fixtures, Top Scorers */}
          <div className="grid grid-cols-3 gap-1.5 bg-navy-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveSubTab('standings')}
              className={`py-2 rounded-lg font-bold text-xs transition ${
                activeSubTab === 'standings'
                  ? 'bg-navy-900 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Standings
            </button>
            <button
              onClick={() => setActiveSubTab('fixtures')}
              className={`py-2 rounded-lg font-bold text-xs transition ${
                activeSubTab === 'fixtures'
                  ? 'bg-navy-900 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Fixtures
            </button>
            <button
              onClick={() => setActiveSubTab('scorers')}
              className={`py-2 rounded-lg font-bold text-xs transition ${
                activeSubTab === 'scorers'
                  ? 'bg-navy-900 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Top Scorers
            </button>
          </div>

          {/* TAB 1: STANDINGS TABLE */}
          {activeSubTab === 'standings' && (
            <div className="rounded-2xl bg-navy-900 border border-slate-800 p-4 shadow-xl space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  League Table
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Round {activeLeague.currentRound}/{activeLeague.totalRounds}
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-mono font-bold uppercase">
                      <th className="py-2 px-1 w-6 text-center">#</th>
                      <th className="py-2 px-2">Club</th>
                      <th className="py-2 px-1 text-center">P</th>
                      <th className="py-2 px-1 text-center">W</th>
                      <th className="py-2 px-1 text-center">D</th>
                      <th className="py-2 px-1 text-center">L</th>
                      <th className="py-2 px-1 text-center">GD</th>
                      <th className="py-2 px-2 text-center text-white">PTS</th>
                      <th className="py-2 px-2 text-center">Form</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {activeLeague.standings.map((row, idx) => {
                      const isUser = row.clubId === club.id;
                      const isLeader = idx === 0 && row.played > 0;

                      return (
                        <tr
                          key={row.clubId}
                          className={`transition-colors ${
                            isUser ? 'bg-emerald-500/10 font-bold' : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="py-3 px-1 text-center">
                            <span
                              className={`w-5 h-5 rounded-md inline-flex items-center justify-center text-[10px] font-bold ${
                                isLeader
                                  ? 'bg-amber-400 text-navy-950'
                                  : idx === 0
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-sans font-medium text-white flex items-center gap-2">
                            <BadgeIcon
                              badgeId={row.badgeId}
                              primaryColor={row.primaryColor}
                              secondaryColor={row.secondaryColor}
                              size={20}
                            />
                            <span className="truncate max-w-[110px] sm:max-w-none">
                              {row.clubName}
                            </span>
                            {isUser && (
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                                YOU
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-1 text-center text-slate-300">{row.played}</td>
                          <td className="py-3 px-1 text-center text-emerald-400 font-bold">{row.won}</td>
                          <td className="py-3 px-1 text-center text-amber-400">{row.drawn}</td>
                          <td className="py-3 px-1 text-center text-rose-400">{row.lost}</td>
                          <td className="py-3 px-1 text-center text-slate-300">
                            {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                          </td>
                          <td className="py-3 px-2 text-center text-sm font-black text-white">
                            {row.points}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              {row.form.length === 0 ? (
                                <span className="text-slate-600">-</span>
                              ) : (
                                row.form.map((res, fIdx) => (
                                  <span
                                    key={fIdx}
                                    className={`w-3.5 h-3.5 rounded text-[8px] font-black flex items-center justify-center ${
                                      res === 'W'
                                        ? 'bg-emerald-500 text-navy-950'
                                        : res === 'D'
                                        ? 'bg-amber-400 text-navy-950'
                                        : 'bg-rose-500 text-white'
                                    }`}
                                  >
                                    {res}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: FIXTURES & MATCHDAYS */}
          {activeSubTab === 'fixtures' && (
            <div className="space-y-4">
              {/* Round Selector Bar */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {Array.from({ length: activeLeague.totalRounds }, (_, i) => i + 1).map((roundNum) => {
                  const isSelected = selectedRound === roundNum;
                  const isPast = roundNum < activeLeague.currentRound;
                  const isCurrent = roundNum === activeLeague.currentRound;

                  return (
                    <button
                      key={roundNum}
                      onClick={() => setSelectedRound(roundNum)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold shrink-0 transition ${
                        isSelected
                          ? 'bg-emerald-500 text-navy-950 shadow-md shadow-emerald-500/20'
                          : isPast
                          ? 'bg-navy-900 text-slate-300 border border-slate-800'
                          : isCurrent
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-navy-950 text-slate-500 border border-slate-800'
                      }`}
                    >
                      Round {roundNum}
                    </button>
                  );
                })}
              </div>

              {/* Fixtures List for Selected Round */}
              <div className="space-y-2.5">
                {activeLeague.fixtures
                  .filter((f) => f.round === selectedRound)
                  .map((fixture) => {
                    const isUserMatch =
                      fixture.homeClubId === club.id || fixture.awayClubId === club.id;
                    const isPlayed = fixture.status === 'played' && fixture.result;

                    return (
                      <div
                        key={fixture.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isUserMatch
                            ? 'border-emerald-500/50 bg-emerald-500/5 shadow-md'
                            : 'border-slate-800 bg-navy-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          {/* Home Club */}
                          <div className="flex-1 text-right truncate">
                            <span
                              className={`text-xs font-bold ${
                                fixture.homeClubId === club.id ? 'text-emerald-400' : 'text-white'
                              }`}
                            >
                              {fixture.homeClubName}
                            </span>
                          </div>

                          {/* Score or VS Badge */}
                          <div className="px-4 text-center">
                            {isPlayed ? (
                              <div className="flex items-center gap-1 font-mono font-black text-sm text-white bg-navy-950 px-2.5 py-1 rounded-lg border border-slate-800">
                                <span>{fixture.result?.homeScore}</span>
                                <span className="text-slate-500">-</span>
                                <span>{fixture.result?.awayScore}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-mono font-bold text-slate-400 bg-navy-950 px-2 py-0.5 rounded border border-slate-800">
                                VS
                              </span>
                            )}
                          </div>

                          {/* Away Club */}
                          <div className="flex-1 text-left truncate">
                            <span
                              className={`text-xs font-bold ${
                                fixture.awayClubId === club.id ? 'text-emerald-400' : 'text-white'
                              }`}
                            >
                              {fixture.awayClubName}
                            </span>
                          </div>
                        </div>

                        {/* Fixture Action Footer */}
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80 text-[11px]">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Matchday {fixture.round}</span>
                          </span>

                          {isPlayed ? (
                            <button
                              onClick={() => setInspectingFixture(fixture)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold transition cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-emerald-400" />
                              <span>Watch Replay</span>
                            </button>
                          ) : isUserMatch && !fixture.userTacticsSubmitted ? (
                            <button
                              onClick={() => submitLeagueTactics(fixture.id)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-semibold transition cursor-pointer"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Lock In Tactics</span>
                            </button>
                          ) : isUserMatch ? (
                            <span className="text-emerald-400 font-mono text-[10px] font-bold">
                              ✓ Tactics Submitted
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px] font-mono">
                              AI Scheduled
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Matchday Action Button (when viewing current active round) */}
              {selectedRound === activeLeague.currentRound && activeLeague.status === 'active' && (
                <button
                  onClick={handleSimulateRound}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-navy-950 shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer disabled:opacity-50 mt-4"
                >
                  <Play className="w-4 h-4 fill-navy-950" />
                  <span>
                    {isSubmitting ? 'Simulating Matches...' : `Simulate Matchday ${activeLeague.currentRound}`}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* TAB 3: TOP SCORERS */}
          {activeSubTab === 'scorers' && (
            <div className="rounded-2xl bg-navy-900 border border-slate-800 p-4 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <Award className="w-4 h-4 text-amber-400" />
                Golden Boot Race
              </h3>

              {activeLeague.topScorers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-navy-950/60 rounded-xl border border-slate-800">
                  No goals scored yet in this championship season.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeLeague.topScorers.slice(0, 10).map((scorer, i) => (
                    <div
                      key={scorer.playerId}
                      className="p-3 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-bold ${
                            i === 0
                              ? 'bg-amber-400 text-navy-950'
                              : i === 1
                              ? 'bg-slate-300 text-navy-950'
                              : i === 2
                              ? 'bg-amber-600 text-white'
                              : 'text-slate-400'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">{scorer.playerName}</div>
                          <div className="text-[10px] text-slate-400">{scorer.clubName}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-amber-400">
                          {scorer.goals}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">Goals</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Leave League Action */}
          <div className="pt-2 text-center">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to leave this league? All tournament progress will be cleared.')) {
                  leaveLeague();
                }
              }}
              className="text-[11px] font-semibold text-rose-400/80 hover:text-rose-400 transition"
            >
              Leave Championship League
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REPLAY MODAL: WATCH 2D PIXEL-ART MATCH REPLAY FROM FIXTURE             */}
      {/* ========================================================================= */}
      {inspectingFixture && inspectingFixture.result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-navy-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-5 shadow-2xl my-auto animate-in zoom-in-95 duration-150 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Matchday {inspectingFixture.round} Replay
                </h3>
              </div>
              <button
                onClick={() => setInspectingFixture(null)}
                className="p-1 rounded-lg bg-navy-950 text-slate-400 hover:text-white border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scorecard Header */}
            <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex-1 text-right truncate">
                {inspectingFixture.result.homeClub.name}
              </span>
              <div className="px-3 text-center">
                <span className="text-base font-black font-mono text-emerald-400">
                  {inspectingFixture.result.homeScore} - {inspectingFixture.result.awayScore}
                </span>
              </div>
              <span className="text-xs font-bold text-white flex-1 text-left truncate">
                {inspectingFixture.result.awayClub.name}
              </span>
            </div>

            {/* Phaser 2D Canvas Viewport */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black">
              <PhaserGame
                events={inspectingFixture.result.events}
                homeTeam={inspectingFixture.result.homeClub}
                awayTeam={inspectingFixture.result.awayClub}
                playbackSpeed={2}
                className="w-full aspect-[16/9]"
              />
            </div>

            {/* Close action */}
            <button
              onClick={() => setInspectingFixture(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white transition text-center"
            >
              Close Replay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
