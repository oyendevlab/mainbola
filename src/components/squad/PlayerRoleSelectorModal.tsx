import React from 'react';
import { Player, PlayerRole } from '../../types';
import { getRolesForPosition } from '../../types/roles';
import { useGameStore } from '../../store/useGameStore';
import { Compass, Check, X } from 'lucide-react';

interface PlayerRoleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

export const PlayerRoleSelectorModal: React.FC<PlayerRoleSelectorModalProps> = ({
  isOpen,
  onClose,
  player,
}) => {
  const { updatePlayerRole } = useGameStore();

  if (!isOpen || !player) return null;

  const availableRoles = getRolesForPosition(player.position);

  const handleSelectRole = async (role: PlayerRole) => {
    await updatePlayerRole(player.id, role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl my-auto animate-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Peranan Taktikal Pemain</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {player.position}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">{player.name} (OVR {player.overallRating})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Roles List */}
        <div className="space-y-2.5">
          {availableRoles.map((roleDef) => {
            const isSelected = player.role === roleDef.id;

            return (
              <button
                key={roleDef.id}
                onClick={() => handleSelectRole(roleDef.id)}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-md shadow-emerald-500/10'
                    : 'border-slate-800 bg-navy-950 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0 mt-0.5">{roleDef.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{roleDef.name}</span>
                      {isSelected && (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Aktif</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {roleDef.description}
                    </p>
                    <span className="inline-block mt-1.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      ⚡ {roleDef.statBonusText}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition text-center cursor-pointer"
        >
          Kekalkan Pilihan Sedia Ada
        </button>
      </div>
    </div>
  );
};
