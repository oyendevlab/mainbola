import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { TransferTarget, Player } from '../../types';
import { MAX_SQUAD_SIZE, MIN_SQUAD_SIZE } from '../../engine/transfers';
import { RefreshCw, UserPlus, DollarSign, CheckCircle2, AlertCircle, ArrowDownRight } from 'lucide-react';

export const TransfersView: React.FC = () => {
  const { club, transferTargets, buyPlayer, sellPlayer, refreshTransferMarket } = useGameStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [subTab, setSubTab] = useState<'buy' | 'sell'>('buy');

  if (!club) return null;

  const handleBuy = async (target: TransferTarget) => {
    setIsProcessing(true);
    setFeedback(null);

    const outcome = await buyPlayer(target.id);
    setIsProcessing(false);

    if (outcome.success) {
      setFeedback({ type: 'success', message: outcome.message });
    } else {
      setFeedback({ type: 'error', message: outcome.message });
    }

    setTimeout(() => setFeedback(null), 4500);
  };

  const handleSell = async (player: Player) => {
    setIsProcessing(true);
    setFeedback(null);

    const outcome = await sellPlayer(player.id);
    setIsProcessing(false);

    if (outcome.success) {
      setFeedback({ type: 'success', message: outcome.message });
    } else {
      setFeedback({ type: 'error', message: outcome.message });
    }

    setTimeout(() => setFeedback(null), 4500);
  };

  const handleRefresh = async () => {
    setIsProcessing(true);
    await refreshTransferMarket();
    setIsProcessing(false);
    setFeedback({ type: 'success', message: 'Pasaran pemindahan telah disegarkan dengan sasaran baharu!' });
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Transfer Market Header & Status */}
      <div className="rounded-2xl bg-gradient-to-r from-navy-900 to-navy-950 border border-slate-800 p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight">Pusat Pemindahan &amp; Bakat</h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Kapasiti Skuad: {club.squad.length} / {MAX_SQUAD_SIZE}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Beli pemain baharu untuk kuatkan skuad atau jual pemain untuk tambahkan dana kelab.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={isProcessing}
            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Segarkan Bakat</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher: Beli vs Jual */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-navy-950/80 rounded-xl border border-slate-800">
        <button
          onClick={() => setSubTab('buy')}
          className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'buy'
              ? 'bg-emerald-500 text-navy-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Beli Pemain ({transferTargets.length})</span>
        </button>
        <button
          onClick={() => setSubTab('sell')}
          className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'sell'
              ? 'bg-amber-500 text-navy-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Jual Pemain ({club.squad.length})</span>
        </button>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-1 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* BUY TAB: Scout Targets Pool */}
      {subTab === 'buy' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Calon Bakat Ditemui Pengakap
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              Dana: <strong className="text-amber-400 font-bold">{club.budget.toLocaleString()} C</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {transferTargets.map((target) => {
              const canAfford = club.budget >= target.fee;
              const hasSquadSpace = club.squad.length < MAX_SQUAD_SIZE;

              return (
                <div
                  key={target.id}
                  className="rounded-2xl bg-navy-900 border border-slate-800 p-4 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-black text-slate-400">
                          {target.player.position}
                        </span>
                        <span className="text-sm font-black text-white leading-none font-mono">
                          {target.player.overallRating}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{target.player.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                          <span>Umur: {target.age}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold">
                            Potensi: {target.potentialRating}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Yuran</div>
                      <div className="text-xs font-mono font-bold text-amber-400">
                        {target.fee.toLocaleString()} C
                      </div>
                    </div>
                  </div>

                  {/* Scout Report Note */}
                  <div className="text-[11px] text-slate-400 bg-navy-950/60 rounded-xl p-2.5 border border-slate-800/60 leading-relaxed italic">
                    "{target.scoutReport}"
                  </div>

                  {/* Attribute Preview Strip */}
                  <div className="grid grid-cols-5 gap-1 text-center bg-navy-950/40 rounded-lg p-1.5 text-[10px] font-mono border border-slate-800/40">
                    <div>
                      <span className="text-slate-500 block">ATK</span>
                      <span className="font-bold text-slate-300">{target.player.attributes.attack}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">DEF</span>
                      <span className="font-bold text-slate-300">{target.player.attributes.defense}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">PAS</span>
                      <span className="font-bold text-slate-300">{target.player.attributes.passing}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">SPD</span>
                      <span className="font-bold text-slate-300">{target.player.attributes.speed}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">STA</span>
                      <span className="font-bold text-slate-300">{target.player.attributes.stamina}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleBuy(target)}
                    disabled={isProcessing || !canAfford || !hasSquadSpace}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-navy-950 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>
                      {!hasSquadSpace
                        ? 'Skuad Penuh'
                        : !canAfford
                        ? 'Dana Tidak Cukup'
                        : `Tandatangani (${target.fee.toLocaleString()} C)`}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SELL TAB: Squad Sell List */}
      {subTab === 'sell' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Pemain Sedia Dijual ({club.squad.length})
            </h4>
            <span className="text-[11px] text-slate-400">
              Minima Skuad: <strong className="text-slate-200">{MIN_SQUAD_SIZE} Pemain</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {club.squad.map((player) => {
              const baseValue = player.marketValue ?? 15000;
              const sellValue = Math.round((baseValue * 0.7) / 250) * 250;
              const isStarter = club.startingXI.includes(player.id);
              const canSell = club.squad.length > MIN_SQUAD_SIZE;

              return (
                <div
                  key={player.id}
                  className="p-3 rounded-xl bg-navy-900 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-black text-slate-400">{player.position}</span>
                      <span className="text-xs font-bold text-white leading-none font-mono">
                        {player.overallRating}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{player.name}</span>
                        {isStarter && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            XI
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Nilai Jualan: <strong className="text-amber-400">{sellValue.toLocaleString()} C</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSell(player)}
                    disabled={isProcessing || !canSell}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>Jual</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
