import React from 'react';
import { ClubSnapshot } from '../../types';
import { generateScoutingReport } from '../../engine/scouting';
import { Search, ShieldAlert, Sparkles, X, Target, Lightbulb, Compass } from 'lucide-react';

interface ScoutingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponent: ClubSnapshot;
}

export const ScoutingReportModal: React.FC<ScoutingReportModalProps> = ({
  isOpen,
  onClose,
  opponent,
}) => {
  if (!isOpen) return null;

  const report = generateScoutingReport(opponent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl my-auto animate-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Laporan Pengakap Lawan</h3>
              <p className="text-[11px] text-slate-400">Analisis Perisikan Taktikal Pasukan: {opponent.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-navy-950 border border-slate-800">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Purata Rating</span>
            <span className="text-base font-black font-mono text-cyan-400">{report.teamStrengthAverage}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Formasi</span>
            <span className="text-base font-black font-mono text-white">{report.opponentFormation}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Taktik</span>
            <span className="text-base font-black text-amber-400">{report.opponentTactics}</span>
          </div>
        </div>

        {/* Key Threat Section */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/40 via-navy-950 to-navy-950 border border-rose-900/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                Ancaman Bahaya Utama ({report.keyThreat.dangerLevel})
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
              OVR {report.keyThreat.player.overallRating}
            </span>
          </div>
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <span>{report.keyThreat.player.name}</span>
            <span className="text-[10px] text-slate-400">({report.keyThreat.player.position})</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">{report.keyThreat.threatDescription}</p>
        </div>

        {/* Weakness Section */}
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/30 space-y-1.5">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Kelemahan Benteng Lawan ({report.weakness.position})
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">{report.weakness.description}</p>
        </div>

        {/* Counter Tactics & Danger Zone */}
        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Cadangan Taktik Balas
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
              Gunakan: {report.counterTacticsAdvice.recommendedTactics}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {report.counterTacticsAdvice.tacticalTip}
          </p>
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Zon Bahaya Serangan Lawan: <strong className="text-white">{report.dangerZone}</strong></span>
          </div>
        </div>

        {/* Close CTA */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-bold text-xs transition cursor-pointer text-center shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          <span>Faham & Rangka Taktik</span>
        </button>
      </div>
    </div>
  );
};
