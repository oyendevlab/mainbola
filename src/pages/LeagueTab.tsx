import React from 'react';
import { Trophy, Users, ShieldAlert, KeyRound, Sparkles, ArrowRight } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export const LeagueTab: React.FC = () => {
  const { club } = useGameStore();

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-slate-800 p-5 shadow-xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Asynchronous Leagues</h2>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/30">
                Phase 2
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Compete against friends at your own pace without scheduled live sessions.
            </p>
          </div>
        </div>
      </div>

      {/* Online Status Notice */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white block font-semibold mb-1">Local Vertical Slice (Phase 1)</strong>
          Online and multiplayer matchmaking services are currently disabled. You are playing in offline local manager mode. League features and cloud sync will launch in Phase 2.
        </div>
      </div>

      {/* Feature Preview Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Coming Soon in Future Updates
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {/* Card 1: Invitation Codes */}
          <div className="rounded-xl bg-navy-900/60 border border-slate-800/80 p-4 opacity-80">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white">Private League Codes</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Create a private championship for your friends or coworkers. Share an 8-character invitation code to let managers join your customized league season.
            </p>
          </div>

          {/* Card 2: Asynchronous Tactics */}
          <div className="rounded-xl bg-navy-900/60 border border-slate-800/80 p-4 opacity-80">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white">Asynchronous Submissions</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Submit your team lineup and tactical instructions anytime before the daily deadline. The deterministic server executes the match simulation automatically.
            </p>
          </div>

          {/* Card 3: 2D Pixel Replay Sharing */}
          <div className="rounded-xl bg-navy-900/60 border border-slate-800/80 p-4 opacity-80">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white">Shared Pixel Replays</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Watch identical match event replays with your league peers. Every manager sees the exact same goals, saves, and tackles.
            </p>
          </div>
        </div>
      </div>

      {/* Simulated Code Input (Disabled) */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Join Private League (Disabled)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            disabled
            placeholder="e.g. RUSH-8842"
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-navy-950 border border-slate-800 text-slate-500 text-sm font-mono cursor-not-allowed"
          />
          <button
            disabled
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-slate-500 cursor-not-allowed flex items-center gap-1.5"
          >
            <span>Join</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Club <strong className="text-slate-400">{club?.name || 'Your Club'}</strong> will be eligible to register for regional leagues once backend integration is live.
        </p>
      </div>
    </div>
  );
};
