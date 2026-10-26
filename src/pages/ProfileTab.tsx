import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { BadgeIcon } from '../components/common/BadgeIcon';
import { User, Shield, Volume2, VolumeX, RotateCcw, AlertTriangle, CheckCircle2, Award, Zap } from 'lucide-react';

export const ProfileTab: React.FC = () => {
  const { club, profile, updateProfile, resetGame, matchHistory } = useGameStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleToggleSound = () => {
    updateProfile({ soundEnabled: !profile.soundEnabled });
  };

  const handleSpeedChange = (speed: 1 | 2 | 4) => {
    updateProfile({ replaySpeed: speed });
  };

  const handleConfirmReset = async () => {
    await resetGame();
    setShowResetConfirm(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  const totalMatches = club ? club.stats.played : 0;
  const winRate = totalMatches > 0 && club ? Math.round((club.stats.won / totalMatches) * 100) : 0;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Profile Card */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-navy-950 font-black text-2xl shadow-lg shadow-emerald-500/20">
            <User className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">{profile.name}</h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                PRO LICENSE
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Level {profile.experienceLevel} Manager
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                {winRate}% Win Rate
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Club Identity Summary */}
      {club && (
        <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Club Information
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              ID: {club.id.slice(-6).toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-xl bg-navy-950 border border-slate-800/80 mb-4">
            <BadgeIcon
              badgeId={club.badgeId}
              primaryColor={club.primaryColor}
              secondaryColor={club.secondaryColor}
              size={48}
            />
            <div>
              <div className="text-sm font-bold text-white">{club.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Squad size: <span className="text-emerald-400 font-semibold">{club.squad.length} Players</span> (11 Starting)
              </div>
            </div>
          </div>

          {/* Detailed Lifetime Stats Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800">
              <div className="text-[10px] font-semibold text-slate-400 uppercase">Played</div>
              <div className="text-base font-bold text-white font-mono mt-0.5">{club.stats.played}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800">
              <div className="text-[10px] font-semibold text-emerald-400 uppercase">Won</div>
              <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">{club.stats.won}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800">
              <div className="text-[10px] font-semibold text-amber-400 uppercase">Drawn</div>
              <div className="text-base font-bold text-amber-400 font-mono mt-0.5">{club.stats.drawn}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800">
              <div className="text-[10px] font-semibold text-rose-400 uppercase">Lost</div>
              <div className="text-base font-bold text-rose-400 font-mono mt-0.5">{club.stats.lost}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 text-center">
            <div className="p-2 rounded-xl bg-navy-950 border border-slate-800 text-xs">
              <span className="text-slate-400">Goals Scored:</span>{' '}
              <strong className="text-white font-mono">{club.stats.goalsFor}</strong>
            </div>
            <div className="p-2 rounded-xl bg-navy-950 border border-slate-800 text-xs">
              <span className="text-slate-400">Goals Conceded:</span>{' '}
              <strong className="text-white font-mono">{club.stats.goalsAgainst}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Section */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Game Preferences
        </h3>

        {/* Sound Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-navy-950 border border-slate-800">
          <div className="flex items-center gap-3">
            {profile.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-500" />
            )}
            <div>
              <div className="text-sm font-semibold text-white">Audio & Match Whistle</div>
              <div className="text-[11px] text-slate-400">Sound effects during 2D pixel replays</div>
            </div>
          </div>
          <button
            onClick={handleToggleSound}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              profile.soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform transform absolute top-0.5 left-0.5 ${
                profile.soundEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Default Replay Speed */}
        <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
          <div className="text-sm font-semibold text-white mb-1">Default Simulation Speed</div>
          <div className="text-[11px] text-slate-400 mb-2.5">Speed multiplier when playing match replays</div>
          <div className="flex gap-2">
            {([1, 2, 4] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => handleSpeedChange(spd)}
                className={`flex-1 py-1.5 rounded-lg font-mono font-bold text-xs border transition-all ${
                  profile.replaySpeed === spd
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-800 bg-navy-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset Game Data */}
      <div className="rounded-2xl bg-rose-950/20 border border-rose-900/40 p-5 shadow-xl">
        <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" />
          Data Management
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          All your club details, 15 players, tactics, and match archives are stored locally in your browser's IndexedDB. You can erase all data to start fresh.
        </p>

        {resetSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Local data has been completely reset. Creating a new club is now available.</span>
          </div>
        )}

        <button
          onClick={() => setShowResetConfirm(true)}
          className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset All Club Data</span>
        </button>
      </div>

      {/* App Branding & Version Footer */}
      <div className="flex flex-col items-center justify-center pt-2 pb-6 text-center border-t border-slate-800/60">
        <img src="/logo.svg" alt="MainBola" className="h-8 w-auto opacity-80 mb-2" />
        <div className="text-[11px] text-slate-500 font-mono">
          MainBola v0.2.1 • PWA Football Manager Lite
        </div>
      </div>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-navy-900 border border-rose-500/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Reset All Progress?</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              This action will permanently delete your club <strong className="text-white">{club?.name}</strong>, all 15 squad players, and {matchHistory.length} saved match replays. This cannot be undone.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30"
              >
                Yes, Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
