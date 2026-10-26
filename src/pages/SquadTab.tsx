import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { FormationType, TacticalStyle, Player, PlayerPosition } from '../types';
import { FORMATION_CONFIGS, validateSquadSelection } from '../types/formations';
import { Users, Shield, Zap, Compass, CheckCircle2, AlertCircle, ArrowUpDown, Info, Dumbbell, ShoppingBag } from 'lucide-react';
import { TrainingView } from '../components/squad/TrainingView';
import { TransfersView } from '../components/squad/TransfersView';

export const SquadTab: React.FC = () => {
  const { club, updateFormation, updateTactics, setStartingXI } = useGameStore();

  const [activeSubTab, setActiveSubTab] = useState<'lineup' | 'training' | 'transfers'>('lineup');
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [filterPos, setFilterPos] = useState<'ALL' | PlayerPosition>('ALL');
  const [inspectedPlayer, setInspectedPlayer] = useState<Player | null>(null);

  if (!club) return null;

  const currentSlots = FORMATION_CONFIGS[club.formation] || FORMATION_CONFIGS['4-3-3'];
  const squadMap = new Map(club.squad.map((p) => [p.id, p]));
  const startingXIPlayers = club.startingXI.map((id) => squadMap.get(id)).filter(Boolean) as Player[];
  const startingXISet = new Set(club.startingXI);
  const benchPlayers = club.squad.filter((p) => !startingXISet.has(p.id));

  const validation = validateSquadSelection(club.squad, club.startingXI, club.formation);

  // Toggle or swap player in starting XI
  const handleSlotClick = (index: number) => {
    if (selectedSlotIndex === index) {
      setSelectedSlotIndex(null);
    } else {
      setSelectedSlotIndex(index);
    }
  };

  const handlePlayerCardClick = (player: Player) => {
    setInspectedPlayer(player);

    // If a tactical pitch slot is currently highlighted, swap into that slot!
    if (selectedSlotIndex !== null) {
      const newXI = [...club.startingXI];
      const currentPlayerInSlotId = newXI[selectedSlotIndex];

      // If clicked player is already in XI at another index, swap their positions
      const existingIndex = newXI.indexOf(player.id);
      if (existingIndex !== -1) {
        newXI[existingIndex] = currentPlayerInSlotId;
        newXI[selectedSlotIndex] = player.id;
      } else {
        // Player is on the bench; replace the player at selectedSlotIndex
        newXI[selectedSlotIndex] = player.id;
      }

      setStartingXI(newXI);
      setSelectedSlotIndex(null);
    }
  };

  // Toggle player directly in/out of XI (from list)
  const handleToggleBenchPlayer = (player: Player) => {
    const isStarter = startingXISet.has(player.id);

    if (isStarter) {
      // Cannot remove if it leaves less than 11 unless substituting
      if (club.startingXI.length <= 11) {
        // Find first bench player to swap with
        if (benchPlayers.length > 0) {
          const replacement = benchPlayers[0];
          const newXI = club.startingXI.map((id) => (id === player.id ? replacement.id : id));
          setStartingXI(newXI);
        }
      }
    } else {
      // Find a player in XI to replace (prefer same position if possible)
      let replaceTargetId = club.startingXI[club.startingXI.length - 1];
      const samePosStarter = startingXIPlayers.find((p) => p.position === player.position);
      if (samePosStarter) {
        replaceTargetId = samePosStarter.id;
      }

      const newXI = club.startingXI.map((id) => (id === replaceTargetId ? player.id : id));
      setStartingXI(newXI);
    }
  };

  const filteredSquad = club.squad.filter(
    (p) => filterPos === 'ALL' || p.position === filterPos
  );

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-200">
      {/* Squad Sub-Navigation Switcher */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-navy-900 border border-slate-800 rounded-2xl shadow-lg">
        <button
          onClick={() => setActiveSubTab('lineup')}
          className={`py-2 px-1 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'lineup'
              ? 'bg-emerald-500 text-navy-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Taktikal</span>
        </button>
        <button
          onClick={() => setActiveSubTab('training')}
          className={`py-2 px-1 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'training'
              ? 'bg-emerald-500 text-navy-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span>Latihan</span>
        </button>
        <button
          onClick={() => setActiveSubTab('transfers')}
          className={`py-2 px-1 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'transfers'
              ? 'bg-emerald-500 text-navy-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Pasaran</span>
        </button>
      </div>

      {/* TRAINING GROUND SUB-TAB */}
      {activeSubTab === 'training' && <TrainingView />}

      {/* TRANSFER MARKET SUB-TAB */}
      {activeSubTab === 'transfers' && <TransfersView />}

      {/* TACTICS & LINEUP SUB-TAB */}
      {activeSubTab === 'lineup' && (
        <div className="space-y-6">
          {/* Formation & Tactics Selector Bar */}
          <div className="rounded-2xl bg-navy-900 border border-slate-800 p-4 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Formation Dropdown */}
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              Formation
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['4-3-3', '4-4-2', '4-2-3-1'] as FormationType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => updateFormation(f)}
                  className={`py-2 px-1 rounded-xl text-xs font-mono font-bold border transition-all ${
                    club.formation === f
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'border-slate-800 bg-navy-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Tactical Style Selector */}
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Tactical Style
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Attacking', 'Balanced', 'Defensive'] as TacticalStyle[]).map((t) => (
                <button
                  key={t}
                  onClick={() => updateTactics(t)}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all truncate ${
                    club.tactics === t
                      ? 'border-amber-500 bg-amber-500/15 text-amber-300 shadow-md shadow-amber-500/10'
                      : 'border-slate-800 bg-navy-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tactical Info Badge */}
        <div className="text-[11px] text-slate-400 bg-navy-950/80 rounded-xl p-2.5 border border-slate-800 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {club.tactics === 'Attacking' && 'High offensive press: Increases shot volume and goal threat, but leaves defense open to counters.'}
            {club.tactics === 'Balanced' && 'Flexible equilibrium: Standard passing, structured defense, and measured transitions.'}
            {club.tactics === 'Defensive' && 'Compact low-block: Maximizes interceptions, tackles, and saves, while reducing shot frequency.'}
          </span>
        </div>
      </div>

      {/* Validation Status */}
      {!validation.valid ? (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-start gap-2.5 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <span className="font-bold block">Lineup Adjustment Required:</span>
            <ul className="list-disc list-inside mt-0.5 space-y-0.5">
              {validation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 flex items-center justify-between text-xs text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-semibold">Starting XI Valid (11 Selected • 1 Goalkeeper)</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md">READY</span>
        </div>
      )}

      {/* 2D Tactical Football Pitch (Mobile Pitch View) */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-400" />
            Tactical Pitch
          </h3>
          <span className="text-[11px] text-slate-400">
            {selectedSlotIndex !== null
              ? 'Tap a player below to swap into highlighted slot'
              : 'Tap any slot on pitch to swap player'}
          </span>
        </div>

        {/* Pitch Graphic Container */}
        <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden border-2 border-emerald-600/40 shadow-inner bg-gradient-to-b from-[#1C6036] via-[#1E683A] to-[#1C6036]">
          {/* Pitch markings */}
          <div className="absolute inset-2 border border-white/30 rounded-lg pointer-events-none" />
          {/* Halfway line & circle */}
          <div className="absolute top-1/2 left-2 right-2 border-t border-white/30 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/30 rounded-full pointer-events-none" />
          {/* Penalty boxes */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-14 border-b border-x border-white/30 pointer-events-none" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-14 border-t border-x border-white/30 pointer-events-none" />

          {/* Interactive Player Pins */}
          {currentSlots.map((slot, idx) => {
            const playerId = club.startingXI[idx];
            const player = playerId ? squadMap.get(playerId) : undefined;
            const isSelected = selectedSlotIndex === idx;

            return (
              <button
                key={slot.id}
                onClick={() => handleSlotClick(idx)}
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute flex flex-col items-center group transition-transform ${
                  isSelected ? 'scale-110 z-20' : 'hover:scale-105 z-10'
                }`}
              >
                {/* Jersey pin */}
                <div
                  className={`w-9 h-9 rounded-full flex flex-col items-center justify-center shadow-lg border-2 transition-all ${
                    isSelected
                      ? 'border-white ring-4 ring-amber-400 bg-amber-500 text-navy-950 font-black animate-pulse'
                      : slot.role === 'GK'
                      ? 'border-amber-400 bg-amber-500/90 text-navy-950 font-extrabold'
                      : 'border-white/80 bg-navy-950 text-white font-bold'
                  }`}
                  style={
                    !isSelected && slot.role !== 'GK'
                      ? { backgroundColor: club.primaryColor, color: club.secondaryColor }
                      : undefined
                  }
                >
                  <span className="text-[10px] leading-none font-bold">
                    {player ? player.overallRating : slot.label}
                  </span>
                </div>

                {/* Name Tag */}
                <div
                  className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap shadow-md max-w-[70px] truncate ${
                    isSelected
                      ? 'bg-amber-400 text-navy-950'
                      : 'bg-navy-950/90 text-slate-200 border border-slate-700'
                  }`}
                >
                  {player ? player.name.split(' ')[0] : slot.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Player Detail Card (if any selected) */}
      {inspectedPlayer && (
        <div className="rounded-2xl bg-navy-900 border border-emerald-500/30 p-4 shadow-xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                  inspectedPlayer.position === 'GK'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : inspectedPlayer.position === 'DEF'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : inspectedPlayer.position === 'MID'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {inspectedPlayer.position}
              </span>
              <h4 className="text-sm font-bold text-white">{inspectedPlayer.name}</h4>
              <span className="text-xs font-mono font-extrabold text-emerald-400">
                OVR {inspectedPlayer.overallRating}
              </span>
            </div>

            <button
              onClick={() => handleToggleBenchPlayer(inspectedPlayer)}
              className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1 transition"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>{startingXISet.has(inspectedPlayer.id) ? 'To Bench' : 'To Starting XI'}</span>
            </button>
          </div>

          {/* 6 Attributes Grid */}
          <div className="grid grid-cols-6 gap-1.5 text-center">
            <div className="p-1.5 rounded-lg bg-navy-950 border border-slate-800">
              <div className="text-[9px] text-slate-400 font-bold uppercase">ATT</div>
              <div className="text-xs font-bold text-white font-mono mt-0.5">{inspectedPlayer.attributes.attack}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-navy-950 border border-slate-800">
              <div className="text-[9px] text-slate-400 font-bold uppercase">DEF</div>
              <div className="text-xs font-bold text-white font-mono mt-0.5">{inspectedPlayer.attributes.defense}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-navy-950 border border-slate-800">
              <div className="text-[9px] text-slate-400 font-bold uppercase">PAS</div>
              <div className="text-xs font-bold text-white font-mono mt-0.5">{inspectedPlayer.attributes.passing}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-navy-950 border border-slate-800">
              <div className="text-[9px] text-slate-400 font-bold uppercase">SPD</div>
              <div className="text-xs font-bold text-white font-mono mt-0.5">{inspectedPlayer.attributes.speed}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-navy-950 border border-slate-800">
              <div className="text-[9px] text-slate-400 font-bold uppercase">STA</div>
              <div className="text-xs font-bold text-white font-mono mt-0.5">{inspectedPlayer.attributes.stamina}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-navy-950 border border-slate-800">
              <div className="text-[9px] text-slate-400 font-bold uppercase">GK</div>
              <div className="text-xs font-bold text-white font-mono mt-0.5">{inspectedPlayer.attributes.goalkeeping}</div>
            </div>
          </div>
        </div>
      )}

      {/* Squad List: Starting XI & Substitutes */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Club Squad ({club.squad.length}/15)
            </h3>
          </div>

          {/* Position Filters */}
          <div className="flex gap-1">
            {(['ALL', 'GK', 'DEF', 'MID', 'ATT'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setFilterPos(pos)}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${
                  filterPos === pos
                    ? 'bg-emerald-500 text-navy-950 font-extrabold'
                    : 'bg-navy-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Player List */}
        <div className="space-y-2">
          {filteredSquad.map((player) => {
            const isStarter = startingXISet.has(player.id);
            const isInspected = inspectedPlayer?.id === player.id;

            return (
              <div
                key={player.id}
                onClick={() => handlePlayerCardClick(player)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isInspected
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : isStarter
                    ? 'border-slate-800 bg-navy-950 hover:border-slate-700'
                    : 'border-slate-800/60 bg-navy-950/40 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Position Tag */}
                  <span
                    className={`w-9 text-center text-[10px] font-bold font-mono py-1 rounded ${
                      player.position === 'GK'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : player.position === 'DEF'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : player.position === 'MID'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {player.position}
                  </span>

                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{player.name}</span>
                      {isStarter && (
                        <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          Starting XI
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>SPD {player.attributes.speed} • PAS {player.attributes.passing} • DEF {player.attributes.defense} • ATT {player.attributes.attack}</span>
                      <span>•</span>
                      <span className={`font-bold ${(player.fitness ?? 100) >= 80 ? 'text-emerald-400' : (player.fitness ?? 100) >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                        ⚡ {player.fitness ?? 100}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overall Rating Pill */}
                <div className="text-right flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-navy-900 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-white">
                    {player.overallRating}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    )}
  </div>
  );
};
