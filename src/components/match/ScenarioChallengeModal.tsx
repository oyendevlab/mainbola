import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { ScenarioDefinition, SCENARIO_PRESETS } from '../../types/scenarios';
import { Target, CheckCircle2, Play, X, Coins } from 'lucide-react';

interface ScenarioChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScenario: (scenario: ScenarioDefinition) => void;
}

export const ScenarioChallengeModal: React.FC<ScenarioChallengeModalProps> = ({
  isOpen,
  onClose,
  onStartScenario,
}) => {
  const { club } = useGameStore();
  const [selectedScenario, setSelectedScenario] = useState<ScenarioDefinition>(SCENARIO_PRESETS[0]);

  if (!isOpen || !club) return null;

  const completedSet = new Set(club.completedScenarios || []);

  const handleLaunch = () => {
    onStartScenario(selectedScenario);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl my-auto animate-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Misi Keajaiban (Mod Senario)</h3>
              <p className="text-[11px] text-slate-400">Uji kecekapan taktikal dalam situasi perlawanan kritikal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scenarios Grid / List */}
        <div className="grid grid-cols-1 gap-2.5 max-h-56 overflow-y-auto pr-1">
          {SCENARIO_PRESETS.map((scen) => {
            const isSelected = selectedScenario.id === scen.id;
            const isCompleted = completedSet.has(scen.id);

            return (
              <button
                key={scen.id}
                onClick={() => setSelectedScenario(scen)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/10'
                    : 'border-slate-800 bg-navy-950 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{scen.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{scen.title}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          scen.difficulty === 'Lagenda'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : scen.difficulty === 'Sukar'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {scen.difficulty}
                      </span>
                      {isCompleted && (
                        <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Selesai</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{scen.subtitle}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-mono">Ganjaran</span>
                  <span className="text-xs font-black font-mono text-amber-400 flex items-center justify-end gap-1">
                    <Coins className="w-3 h-3" />
                    <span>+{scen.creditReward.toLocaleString()}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Scenario Briefing Card */}
        <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Taklimat Misi Terperinci
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
              Bermula: Minit {selectedScenario.startingMinute}' • Skor: {selectedScenario.initialHomeScore}-{selectedScenario.initialAwayScore}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{selectedScenario.description}</p>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 rounded-lg bg-navy-900 border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase font-bold">Lawan & Taktik</span>
              <span className="font-bold text-white block mt-0.5">{selectedScenario.opponentName}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedScenario.opponentFormation} • {selectedScenario.opponentTactics} (OVR {selectedScenario.opponentRating})
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-navy-900 border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase font-bold">Objektif Kemenangan</span>
              <span className="font-bold text-emerald-400 block mt-0.5">{selectedScenario.targetDescription}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                Trofi: 🎯 Pakar Strategi Senario
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleLaunch}
          className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-navy-950 transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 uppercase tracking-wider"
        >
          <Play className="w-4 h-4 fill-navy-950" />
          <span>Lancarkan Misi Senario Ini</span>
        </button>
      </div>
    </div>
  );
};
