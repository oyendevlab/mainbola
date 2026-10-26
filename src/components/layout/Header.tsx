import React from 'react';
import { BadgeIcon } from '../common/BadgeIcon';
import { Club } from '@/types';
import { Coins } from 'lucide-react';

interface HeaderProps {
  club: Club | null;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ club, onOpenProfile }) => {
  return (
    <header className="sticky top-0 z-30 bg-navy-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-4xl flex items-center justify-between">
        {club ? (
          <div
            onClick={onOpenProfile}
            className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
          >
            <div className="relative">
              <BadgeIcon
                badgeId={club.badgeId}
                primaryColor={club.primaryColor}
                secondaryColor={club.secondaryColor}
                size={36}
              />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-tight group-hover:text-emerald-400 transition-colors">
                {club.name}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="font-medium text-emerald-400">{club.formation}</span>
                <span>•</span>
                <span className="text-slate-400">{club.tactics}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="MainBola" className="w-7 h-7 rounded-lg" />
            <span className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              MainBola
            </span>
          </div>
        )}

        {/* Club Quick Stats / Tag */}
        {club && (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Club Budget */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-mono font-bold tracking-tight">
                {(club.budget ?? 50000).toLocaleString()}
              </span>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Record</div>
              <div className="text-xs font-mono font-bold text-white">
                <span className="text-emerald-400">{club.stats.won}W</span>
                <span className="text-slate-500 mx-1">-</span>
                <span className="text-amber-400">{club.stats.drawn}D</span>
                <span className="text-slate-500 mx-1">-</span>
                <span className="text-rose-400">{club.stats.lost}L</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
