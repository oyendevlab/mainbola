import React from 'react';
import { Home, Users, PlayCircle, Trophy, User } from 'lucide-react';

export type TabType = 'home' | 'squad' | 'match' | 'league' | 'profile';

interface NavbarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'squad' as TabType, label: 'Squad', icon: Users },
    { id: 'match' as TabType, label: 'Match', icon: PlayCircle, highlight: true },
    { id: 'league' as TabType, label: 'League', icon: Trophy },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-navy-900/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl shadow-2xl safe-area-bottom">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.highlight) {
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className="flex flex-col items-center justify-center -mt-4 group focus:outline-none"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500 text-navy-950 scale-105 shadow-emerald-500/30'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span
                  className={`text-[10px] font-bold mt-1 tracking-wider uppercase ${
                    isActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-colors duration-150 focus:outline-none ${
                isActive
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] mt-1 font-medium tracking-wide">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
