import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Player, TrainingDrillType } from '../../types';
import { DRILL_CONFIGS, TEAM_PHYSIO_COST } from '../../engine/training';
import { Zap, HeartPulse, Sparkles, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';

export const TrainingView: React.FC = () => {
  const { club, trainPlayer, teamRecoveryPhysio } = useGameStore();
  const [selectedDrill, setSelectedDrill] = useState<TrainingDrillType>('ATTACKING');
  const [trainingPlayerId, setTrainingPlayerId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  if (!club) return null;

  const currentDrillConfig = DRILL_CONFIGS[selectedDrill];

  const handleTrain = async (player: Player) => {
    setIsProcessing(true);
    setTrainingPlayerId(player.id);
    setFeedback(null);

    const outcome = await trainPlayer(player.id, selectedDrill);
    setIsProcessing(false);
    setTrainingPlayerId(null);

    if (outcome.success) {
      setFeedback({ type: 'success', message: outcome.message });
    } else {
      setFeedback({ type: 'error', message: outcome.message });
    }

    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  const handleFullTeamRecovery = async () => {
    setIsProcessing(true);
    setFeedback(null);

    const outcome = await teamRecoveryPhysio();
    setIsProcessing(false);

    if (outcome.success) {
      setFeedback({ type: 'success', message: outcome.message });
    } else {
      setFeedback({ type: 'error', message: outcome.message });
    }

    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Team Physio Clinic Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/60 via-navy-900 to-navy-950 border border-emerald-500/30 p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Klinik Fisioterapi Pasukan</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pulihkan kecergasan semua pemain skuad ke 100% untuk mengelakkan keletihan.
            </p>
          </div>
        </div>

        <button
          onClick={handleFullTeamRecovery}
          disabled={isProcessing || club.budget < TEAM_PHYSIO_COST}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-navy-950 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
        >
          <Sparkles className="w-4 h-4" />
          <span>Rawat Skuad ({TEAM_PHYSIO_COST.toLocaleString()} C)</span>
        </button>
      </div>

      {/* Drill Selector */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-4 shadow-xl space-y-3">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Pilih Modul Latihan
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {(Object.keys(DRILL_CONFIGS) as TrainingDrillType[]).map((drillKey) => {
            const config = DRILL_CONFIGS[drillKey];
            const isSelected = selectedDrill === drillKey;
            return (
              <button
                key={drillKey}
                onClick={() => setSelectedDrill(drillKey)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-navy-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-bold leading-tight">{config.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    +{config.primaryAttr}
                  </div>
                </div>
                <div className="mt-2 text-[11px] font-mono font-bold text-amber-400">
                  {config.cost.toLocaleString()} C
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Drill Description */}
        <div className="text-xs text-slate-400 bg-navy-950/50 rounded-xl p-3 border border-slate-800/60 flex items-center justify-between">
          <span>{currentDrillConfig.description}</span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            Sesuai: {currentDrillConfig.suitablePositions.join(', ')}
          </span>
        </div>
      </div>

      {/* Feedback Alert */}
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

      {/* Squad Player Training List */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Senarai Pemain ({club.squad.length})
          </h4>
          <span className="text-[11px] font-mono text-slate-400">
            Baki Dana: <strong className="text-amber-400 font-bold">{club.budget.toLocaleString()} C</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {club.squad.map((player) => {
            const fitness = player.fitness ?? 100;
            const isTrainingThis = trainingPlayerId === player.id;
            const fitnessColor =
              fitness >= 80 ? 'text-emerald-400' : fitness >= 50 ? 'text-amber-400' : 'text-rose-400';
            const fitnessBg =
              fitness >= 80 ? 'bg-emerald-500' : fitness >= 50 ? 'bg-amber-500' : 'bg-rose-500';

            return (
              <div
                key={player.id}
                className="p-3 rounded-xl bg-navy-950/70 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-slate-400">{player.position}</span>
                    <span className="text-xs font-bold text-white leading-none font-mono">
                      {player.overallRating}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{player.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="text-slate-400">Fit:</span>
                        <span className={`font-bold ${fitnessColor}`}>{fitness}%</span>
                      </div>
                      <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full ${fitnessBg}`}
                          style={{ width: `${Math.min(100, Math.max(0, fitness))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleTrain(player)}
                  disabled={isProcessing || club.budget < currentDrillConfig.cost}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {isTrainingThis ? (
                    <span className="animate-spin text-xs">⏳</span>
                  ) : (
                    <>
                      <span>Latih</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
