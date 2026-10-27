import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { generateTeamOfTheWeek } from '../../engine/totw';
import { Award, X, Star } from 'lucide-react';

interface TeamOfTheWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamOfTheWeekModal: React.FC<TeamOfTheWeekModalProps> = ({ isOpen, onClose }) => {
  const { club, matchHistory, activeLeague } = useGameStore();

  if (!isOpen || !club) return null;

  const currentRound = activeLeague?.currentRound || 1;
  const totw = generateTeamOfTheWeek(club, matchHistory, currentRound);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-navy-900 border border-amber-500/30 rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl my-auto animate-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-navy-950 font-black shadow-md shadow-amber-500/20">
              <Star className="w-4 h-4 fill-navy-950" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Pasukan Terbaik Mingguan (TOTW)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.2 rounded border border-amber-500/30">
                  Minggu {totw.weekNumber}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">11 Bintang Berprestasi Paling Menonjol Dalam Saingan Liga</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formation & Honor Banner */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-amber-950/40 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-200">
              Formasi Impian: <strong className="text-white font-mono">4-3-3</strong> • Pemain menerima moral maksima & bonus XP.
            </span>
          </div>
        </div>

        {/* 11 Players Grid */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {/* Position Groups */}
          {(['ATT', 'MID', 'DEF', 'GK'] as const).map((pos) => {
            const players = totw.players.filter((p) => p.position === pos);
            const posTitle =
              pos === 'ATT' ? 'Barisan Penyerang' : pos === 'MID' ? 'Barisan Tengah' : pos === 'DEF' ? 'Benteng Pertahanan' : 'Penjaga Gol';

            return (
              <div key={pos} className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {posTitle}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                        p.isUserPlayer
                          ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border-amber-500/50 shadow-md shadow-amber-500/10'
                          : 'bg-navy-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-8 text-center text-[10px] font-mono font-bold py-1 rounded shrink-0 ${
                            pos === 'GK'
                              ? 'bg-amber-500/20 text-amber-300'
                              : pos === 'DEF'
                              ? 'bg-blue-500/20 text-blue-300'
                              : pos === 'MID'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {p.position}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.isUserPlayer && (
                              <span className="text-[8px] bg-amber-400 text-navy-950 font-black px-1.5 rounded uppercase">
                                Anda
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {p.clubName}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono font-bold text-slate-400 block">Rating</span>
                        <span className="text-xs font-mono font-black text-amber-400">
                          ★ {p.matchRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Close CTA */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer text-center"
        >
          Tutup Senarai TOTW
        </button>
      </div>
    </div>
  );
};
