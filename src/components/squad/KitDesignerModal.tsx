import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Shirt, Check, X, Sparkles } from 'lucide-react';

interface KitDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  '#10B981', // Emerald
  '#0F172A', // Dark Navy
  '#EF4444', // Crimson Red
  '#3B82F6', // Royal Blue
  '#F59E0B', // Amber Gold
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#FFFFFF', // Pure White
  '#1E293B', // Slate
];

const PATTERNS: Array<{ id: 'solid' | 'stripes' | 'hoops' | 'half'; name: string }> = [
  { id: 'solid', name: 'Polos (Solid)' },
  { id: 'stripes', name: 'Jalur (Stripes)' },
  { id: 'hoops', name: 'Gelung (Hoops)' },
  { id: 'half', name: 'Separuh (Half)' },
];

export const KitDesignerModal: React.FC<KitDesignerModalProps> = ({ isOpen, onClose }) => {
  const { club, updateKitDesign } = useGameStore();

  const [awayPrimary, setAwayPrimary] = useState(club?.awayPrimaryColor || '#FFFFFF');
  const [awaySecondary, setAwaySecondary] = useState(club?.awaySecondaryColor || club?.primaryColor || '#10B981');
  const [pattern, setPattern] = useState<'solid' | 'stripes' | 'hoops' | 'half'>(club?.kitPattern || 'solid');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !club) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateKitDesign(awayPrimary, awaySecondary, pattern);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl my-auto animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shirt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Pereka Jersi Kelab</h3>
              <p className="text-[11px] text-slate-400">Tetapkan corak & jersi kedua (Away Kit)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Kit Previews */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Home Kit */}
          <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">
              Jersi Utama (Home)
            </span>
            <div
              className="w-16 h-16 mx-auto rounded-xl border-2 flex items-center justify-center shadow-inner relative overflow-hidden"
              style={{ backgroundColor: club.primaryColor, borderColor: club.secondaryColor }}
            >
              <Shirt className="w-8 h-8 opacity-90" style={{ color: club.secondaryColor }} />
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-2 truncate">
              {club.primaryColor}
            </div>
          </div>

          {/* Away Kit */}
          <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-2">
              Jersi Lawan (Away)
            </span>
            <div
              className="w-16 h-16 mx-auto rounded-xl border-2 flex items-center justify-center shadow-inner relative overflow-hidden"
              style={{ backgroundColor: awayPrimary, borderColor: awaySecondary }}
            >
              <Shirt className="w-8 h-8 opacity-90" style={{ color: awaySecondary }} />
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-2 truncate">
              {awayPrimary}
            </div>
          </div>
        </div>

        {/* Corak Jersi (Kit Pattern) */}
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
            Corak Jersi Skuad
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PATTERNS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPattern(p.id)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  pattern === p.id
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-navy-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span>{p.name}</span>
                {pattern === p.id && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Warna Jersi Lawan (Away Primary) */}
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
            Warna Utama Jersi Lawan
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => setAwayPrimary(color)}
                className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 flex items-center justify-center"
                style={{
                  backgroundColor: color,
                  borderColor: awayPrimary === color ? '#10B981' : '#334155',
                }}
              >
                {awayPrimary === color && (
                  <Check className={`w-3.5 h-3.5 ${color === '#FFFFFF' ? 'text-black' : 'text-white'}`} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Warna Sekunder Jersi Lawan (Away Secondary) */}
        <div className="mb-5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
            Warna Jalur / Kolar Jersi Lawan
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => setAwaySecondary(color)}
                className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 flex items-center justify-center"
                style={{
                  backgroundColor: color,
                  borderColor: awaySecondary === color ? '#F59E0B' : '#334155',
                }}
              >
                {awaySecondary === color && (
                  <Check className={`w-3.5 h-3.5 ${color === '#FFFFFF' ? 'text-black' : 'text-white'}`} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Save Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-navy-950 transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Simpan Rekaan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
