import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import {
  encodeChallengeCode,
  decodeChallengeCode,
  getPvPRank,
} from '../../engine/pvp';
import { createClubSnapshot } from '../../engine/generator';
import { simulateMatch } from '../../engine/simulator';
import { MatchResult } from '../../types';
import {
  Swords,
  Copy,
  CheckCircle2,
  AlertCircle,
  Play,
  X,
} from 'lucide-react';

interface PvPChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPvPMatch: (result: MatchResult, opponentRating: number) => void;
}

export const PvPChallengeModal: React.FC<PvPChallengeModalProps> = ({
  isOpen,
  onClose,
  onStartPvPMatch,
}) => {
  const { club } = useGameStore();
  const [friendCode, setFriendCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !club) return null;

  const myPvpRating = club.pvpRating ?? 1200;
  const rankInfo = getPvPRank(myPvpRating);
  const pvpRecord = club.pvpRecord ?? { won: 0, drawn: 0, lost: 0 };
  const myCode = encodeChallengeCode(club);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleStartChallenge = () => {
    setError(null);
    if (!friendCode.trim()) {
      setError('Sila masukkan kod cabaran rakan.');
      return;
    }

    const decoded = decodeChallengeCode(friendCode);
    if (!decoded) {
      setError('Kod cabaran tidak sah atau format salah. Pastikan kod bermula dengan MBPVP_.');
      return;
    }

    if (decoded.snapshot.id === club.id) {
      setError('Anda tidak boleh mencabar kelab anda sendiri.');
      return;
    }

    const userSnapshot = createClubSnapshot(club);
    const seed = Date.now();
    const result = simulateMatch(userSnapshot, decoded.snapshot, seed);

    onStartPvPMatch(result, decoded.opponentRating);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl my-auto animate-in zoom-in-95 duration-150 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cabaran PvP Asinkronus</h3>
              <p className="text-[11px] text-slate-400">Cabar skuad rakan & kumpul mata ranking Elo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* My PvP Profile & Rank Status */}
        <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Pangkat Pengurus Anda
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{rankInfo.badge}</span>
              <span className="text-sm font-extrabold text-white">{rankInfo.title}</span>
              <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                {myPvpRating} Elo
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Rekod Pertembungan
            </div>
            <div className="text-xs font-mono font-bold text-slate-200">
              <span className="text-emerald-400">{pvpRecord.won}M</span> -{' '}
              <span className="text-amber-400">{pvpRecord.drawn}S</span> -{' '}
              <span className="text-rose-400">{pvpRecord.lost}K</span>
            </div>
          </div>
        </div>

        {/* Section 1: Copy My Challenge Code */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Kod Cabaran Kelab Saya
          </label>
          <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between gap-2">
            <div className="font-mono text-xs text-slate-400 truncate flex-1 select-all">
              {myCode}
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition shrink-0 cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Disalin!' : 'Salin'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Hantarkan kod ini kepada rakan anda supaya mereka boleh menentang skuad anda.
          </p>
        </div>

        {/* Section 2: Enter Friend's Challenge Code */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Masukkan Kod Cabaran Rakan
          </label>
          <input
            type="text"
            value={friendCode}
            onChange={(e) => {
              setFriendCode(e.target.value);
              setError(null);
            }}
            placeholder="Tampal kod bermula MBPVP_..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleStartChallenge}
            className="w-full mt-2 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Mulakan Perlawanan PvP Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
