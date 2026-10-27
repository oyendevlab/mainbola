import React, { useState, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { BadgeIcon } from '../components/common/BadgeIcon';
import {
  User,
  Shield,
  Volume2,
  VolumeX,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Award,
  Zap,
  Trophy,
  Lock,
  Download,
  Upload,
  FileJson,
  X,
  Mic,
  MicOff,
  Languages,
} from 'lucide-react';
import { getAllTrophies } from '../engine/trophies';

export const ProfileTab: React.FC = () => {
  const {
    club,
    profile,
    updateProfile,
    toggleCommentaryVoice,
    setCommentaryLanguage,
    resetGame,
    matchHistory,
    unlockedTrophies,
    exportGameData,
    importGameData,
  } = useGameStore();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allTrophies = getAllTrophies();
  const unlockedIds = new Set((unlockedTrophies || []).map((t) => t.id));

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

  const handleExport = () => {
    try {
      const jsonStr = exportGameData();

      // Trigger browser file download
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const clubSlug = club?.name ? club.name.replace(/\s+/g, '_').toLowerCase() : 'club';
      link.href = url;
      link.download = `mainbola_save_${clubSlug}_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      // Clipboard fallback
      if (navigator.clipboard) {
        navigator.clipboard.writeText(jsonStr).catch(() => {});
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = await importGameData(content);
        if (res.success) {
          setImportSuccess(true);
          setShowImportModal(false);
          setTimeout(() => setImportSuccess(false), 4000);
        } else {
          setImportError(res.message);
          setTimeout(() => setImportError(null), 5000);
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePastedImport = async () => {
    if (!pastedJson.trim()) return;
    const res = await importGameData(pastedJson);
    if (res.success) {
      setImportSuccess(true);
      setShowImportModal(false);
      setPastedJson('');
      setTimeout(() => setImportSuccess(false), 4000);
    } else {
      setImportError(res.message);
      setTimeout(() => setImportError(null), 5000);
    }
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

      {/* Trophy Cabinet & Achievements Section */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Kabinet Trofi &amp; Pencapaian
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            {unlockedIds.size} / {allTrophies.length} Trofi
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allTrophies.map((trophy) => {
            const isUnlocked = unlockedIds.has(trophy.id);

            return (
              <div
                key={trophy.id}
                className={`p-3.5 rounded-2xl border transition flex items-start gap-3.5 ${
                  isUnlocked
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'bg-navy-950/60 border-slate-800/80 opacity-60'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border ${
                    isUnlocked
                      ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 shadow-inner'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-500'
                  }`}
                >
                  {isUnlocked ? trophy.icon : <Lock className="w-5 h-5 text-slate-500" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4
                      className={`text-xs font-bold truncate ${
                        isUnlocked ? 'text-amber-300' : 'text-slate-400'
                      }`}
                    >
                      {trophy.title}
                    </h4>
                    {isUnlocked && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
                        DIRANGKUL
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {trophy.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
              <div className="text-sm font-semibold text-white">Audio &amp; Match Whistle</div>
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

        {/* Version 0.7.0 Web Speech Commentary Voice Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-navy-950 border border-slate-800">
          <div className="flex items-center gap-3">
            {profile.commentaryVoiceEnabled ?? true ? (
              <Mic className="w-5 h-5 text-cyan-400" />
            ) : (
              <MicOff className="w-5 h-5 text-slate-500" />
            )}
            <div>
              <div className="text-sm font-semibold text-white">Ulasan Suara Komentator (Web Speech)</div>
              <div className="text-[11px] text-slate-400">Suara sorakan ulasan langsung semasa gol &amp; kad</div>
            </div>
          </div>
          <button
            onClick={() => toggleCommentaryVoice()}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              profile.commentaryVoiceEnabled ?? true ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform transform absolute top-0.5 left-0.5 ${
                profile.commentaryVoiceEnabled ?? true ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Commentary Language Selector */}
        <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <Languages className="w-4 h-4 text-cyan-400" />
            <div className="text-sm font-semibold text-white">Bahasa Ulasan Komentator</div>
          </div>
          <div className="text-[11px] text-slate-400 mb-2.5">Pilihan dialek bahasa pertuturan pengulas</div>
          <div className="flex gap-2">
            {[
              { id: 'ms', label: 'Bahasa Melayu' },
              { id: 'en', label: 'English (US)' },
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => setCommentaryLanguage(lang.id as 'ms' | 'en')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                  (profile.commentaryLanguage ?? 'ms') === lang.id
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                    : 'border-slate-800 bg-navy-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
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

      {/* Data Management Section */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 shadow-xl space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <FileJson className="w-4 h-4 text-emerald-400" />
            Pengurusan &amp; Sandaran Data (JSON)
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Eksport kemajuan kelab, fasiliti, dan rekod perlawanan anda ke fail JSON, atau muat naik simpanan dari peranti lain.
          </p>
        </div>

        {/* Feedback states */}
        {exportSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Data simpanan berjaya dimuat turun dan disalin ke papan keratan (clipboard)!</span>
          </div>
        )}

        {importSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Data simpanan berjaya dimuat naik sepenuhnya!</span>
          </div>
        )}

        {importError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={handleExport}
            className="py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-navy-950 transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10"
          >
            <Download className="w-4 h-4" />
            <span>Eksport Simpanan (JSON)</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="py-2.5 px-4 rounded-xl font-bold text-xs bg-navy-950 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import Simpanan (JSON)</span>
          </button>
        </div>

        {/* Danger Zone: Reset Game Data */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Zon Bahaya: Padam Data</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Padam seluruh kelab, pemain, dan rekod perlawanan tempatan.
              </div>
            </div>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 rounded-lg font-semibold text-xs bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Padam Semua</span>
            </button>
          </div>

          {resetSuccess && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Data tempatan telah dipadamkan sepenuhnya.</span>
            </div>
          )}
        </div>
      </div>

      {/* App Branding & Version Footer */}
      <div className="flex flex-col items-center justify-center pt-2 pb-6 text-center border-t border-slate-800/60">
        <img src="/logo.svg" alt="MainBola" className="h-8 w-auto opacity-80 mb-2" />
        <div className="text-[11px] text-slate-500 font-mono">
          MainBola v0.5.0 • PWA Football Manager Lite
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Import Simpanan (JSON)</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Pilih fail sandaran <code>.json</code> daripada peranti anda atau tampal teks JSON di bawah.
            </p>

            {/* File input */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
                id="save-file-input"
              />
              <label
                htmlFor="save-file-input"
                className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/60 bg-navy-950 hover:bg-navy-950/80 transition flex items-center justify-center gap-2 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Pilih Fail .JSON dari Peranti</span>
              </label>
            </div>

            {/* Paste JSON */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">
                Atau Tampal Kod Simpanan JSON:
              </label>
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder='Tampal teks JSON {"version": "0.5.0", ...}'
                rows={5}
                className="w-full p-3 rounded-xl bg-navy-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={!pastedJson.trim()}
                onClick={handlePastedImport}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-navy-950 text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed"
              >
                Muat Naik Data
              </button>
            </div>
          </div>
        </div>
      )}

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
