import React, { useState } from 'react';
import { BADGE_OPTIONS, BadgeIcon } from './common/BadgeIcon';
import { Shield, Sparkles } from 'lucide-react';

interface ClubCreationModalProps {
  onCreateClub: (name: string, primaryColor: string, secondaryColor: string, badgeId: string) => Promise<unknown>;
}

const COLOR_PRESETS = [
  { name: 'Emerald & Navy', primary: '#10B981', secondary: '#0F172A' },
  { name: 'Royal Gold & Blue', primary: '#F59E0B', secondary: '#1E3A8A' },
  { name: 'Crimson & Slate', primary: '#EF4444', secondary: '#0F172A' },
  { name: 'Cyan & Dark Navy', primary: '#06B6D4', secondary: '#080D1A' },
  { name: 'Purple & Gold', primary: '#8B5CF6', secondary: '#D97706' },
  { name: 'White & Emerald', primary: '#F8FAFC', secondary: '#10B981' },
];

export const ClubCreationModal: React.FC<ClubCreationModalProps> = ({ onCreateClub }) => {
  const [name, setName] = useState('Apex Rangers');
  const [badgeId, setBadgeId] = useState('shield');
  const [primaryColor, setPrimaryColor] = useState('#10B981');
  const [secondaryColor, setSecondaryColor] = useState('#0F172A');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a club name.');
      return;
    }
    if (trimmed.length < 3) {
      setError('Club name must be at least 3 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreateClub(trimmed, primaryColor, secondaryColor, badgeId);
    } catch (err: unknown) {
      console.error('Failed to create club:', err);
      setError('An error occurred while creating your club. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-navy-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Create Your Football Club</h2>
          <p className="text-xs text-slate-400 mt-1">
            Establish your identity, customize colors, and receive 15 fictional players to begin your manager career.
          </p>
        </div>

        {/* Live Badge Preview */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-navy-950/70 border border-slate-800 mb-5">
          <div className="relative p-2 rounded-2xl bg-slate-900/50 shadow-inner">
            <BadgeIcon
              badgeId={badgeId}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              size={64}
            />
          </div>
          <div className="mt-2 text-center">
            <div className="font-bold text-sm text-white">{name.trim() || 'Club Name'}</div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-center gap-1.5 mt-0.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block border border-slate-700" style={{ backgroundColor: primaryColor }} />
              <span className="w-2.5 h-2.5 rounded-full inline-block border border-slate-700" style={{ backgroundColor: secondaryColor }} />
              <span>Starting Division</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Club Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Club Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Metro Stars FC"
              maxLength={25}
              className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium transition"
              required
            />
          </div>

          {/* Badge Style Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Crest Emblem
            </label>
            <div className="grid grid-cols-5 gap-2">
              {BADGE_OPTIONS.map((badge) => {
                const isSelected = badgeId === badge.id;
                return (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => setBadgeId(badge.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                        : 'border-slate-800 bg-navy-950 hover:border-slate-700'
                    }`}
                  >
                    <BadgeIcon
                      badgeId={badge.id}
                      primaryColor={isSelected ? primaryColor : '#94A3B8'}
                      secondaryColor={isSelected ? secondaryColor : '#1E293B'}
                      size={28}
                    />
                    <span className="text-[9px] text-slate-400 mt-1 truncate max-w-full">
                      {badge.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Color Scheme Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = primaryColor === preset.primary && secondaryColor === preset.secondary;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setPrimaryColor(preset.primary);
                      setSecondaryColor(preset.secondary);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-navy-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex -space-x-1 shrink-0">
                      <div
                        className="w-4 h-4 rounded-full border border-slate-700"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-slate-700"
                        style={{ backgroundColor: preset.secondary }}
                      />
                    </div>
                    <span className="text-[10px] font-medium truncate">{preset.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom color inputs */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 flex items-center gap-2 bg-navy-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs text-slate-300 font-mono">{primaryColor.toUpperCase()}</span>
            </div>
            <div className="flex-1 flex items-center gap-2 bg-navy-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs text-slate-300 font-mono">{secondaryColor.toUpperCase()}</span>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-navy-950 shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Drafting 15 Squad Members...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Found Club & Generate Squad</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
