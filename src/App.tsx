import React, { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { ClubCreationModal } from './components/ClubCreationModal';
import { HomeTab } from './pages/HomeTab';
import { SquadTab } from './pages/SquadTab';
import { MatchTab } from './pages/MatchTab';
import { LeagueTab } from './pages/LeagueTab';
import { ProfileTab } from './pages/ProfileTab';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const { club, isLoading, activeTab, setActiveTab, initStore, createClub } = useGameStore();

  useEffect(() => {
    initStore();
  }, [initStore]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
        <div className="text-sm font-bold text-white tracking-wider uppercase font-mono">
          Loading GOAL RUSH...
        </div>
        <div className="text-xs text-slate-400 mt-1">Accessing local club archives</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col">
      {/* Club Creation Gate for first-time players */}
      {!club && <ClubCreationModal onCreateClub={createClub} />}

      {/* Main App Layout */}
      <Header club={club} onOpenProfile={() => setActiveTab('profile')} />

      <main className="flex-1 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl w-full px-4 pt-4">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'squad' && <SquadTab />}
        {activeTab === 'match' && <MatchTab />}
        {activeTab === 'league' && <LeagueTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </main>

      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
};

export default App;
