import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { BadgeIcon } from '../components/common/BadgeIcon';
import { ClubFacilitiesSection } from '../components/home/ClubFacilitiesSection';
import { Play, Users, Trophy, ChevronRight, Activity, Calendar } from 'lucide-react';

export const HomeTab: React.FC = () => {
  const { club, matchHistory, setActiveTab } = useGameStore();

  if (!club) return null;

  const totalMatches = club.stats.played;
  const goalDiff = club.stats.goalsFor - club.stats.goalsAgainst;

  // Top 3 rated players in club
  const topPlayers = [...club.squad]
    .sort((a, b) => b.overallRating - a.overallRating)
    .slice(0, 3);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Club Identity Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-slate-800 p-5 shadow-xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4">
          <BadgeIcon
            badgeId={club.badgeId}
            primaryColor={club.primaryColor}
            secondaryColor={club.secondaryColor}
            size={56}
          />

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-extrabold text-white tracking-tight truncate">
              {club.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {club.formation}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {club.tactics}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-slate-800/80 text-center">
          <div className="bg-navy-950/60 rounded-xl p-2 border border-slate-800/50">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Played</div>
            <div className="text-sm font-bold text-white font-mono mt-0.5">{totalMatches}</div>
          </div>
          <div className="bg-navy-950/60 rounded-xl p-2 border border-slate-800/50">
            <div className="text-[10px] font-bold text-emerald-400 uppercase">Won</div>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{club.stats.won}</div>
          </div>
          <div className="bg-navy-950/60 rounded-xl p-2 border border-slate-800/50">
            <div className="text-[10px] font-bold text-amber-400 uppercase">Drawn</div>
            <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">{club.stats.drawn}</div>
          </div>
          <div className="bg-navy-950/60 rounded-xl p-2 border border-slate-800/50">
            <div className="text-[10px] font-bold text-rose-400 uppercase">Lost</div>
            <div className="text-sm font-bold text-rose-400 font-mono mt-0.5">{club.stats.lost}</div>
          </div>
        </div>
      </div>

      {/* Main CTA: Quick Match */}
      <button
        onClick={() => setActiveTab('match')}
        className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-navy-950 p-4 shadow-xl shadow-emerald-500/20 transition-all duration-200 transform active:scale-[0.99] flex items-center justify-between group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-navy-950/20 flex items-center justify-center font-bold text-navy-950 group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-navy-950" />
          </div>
          <div className="text-left">
            <div className="text-base font-extrabold uppercase tracking-tight">Play Quick Match</div>
            <div className="text-xs text-navy-950/80 font-medium">Test your tactics with 2D pixel replays</div>
          </div>
        </div>
        <ChevronRight className="w-6 h-6 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Club Infrastructure & Facilities Management */}
      <ClubFacilitiesSection />

      {/* Squad Overview & Key Players */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Squad Leaders
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('squad')}
            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
          >
            <span>Manage Squad</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {topPlayers.map((player) => (
            <div
              key={player.id}
              className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold text-slate-400">
                  {player.position}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {player.overallRating}
                </span>
              </div>
              <div className="text-xs font-bold text-white truncate mt-1">
                {player.name.split(' ')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Match History */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Recent Matches
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            GD: {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
          </span>
        </div>

        {matchHistory.length === 0 ? (
          <div className="p-6 rounded-xl bg-navy-950/60 border border-slate-800/80 text-center">
            <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-300">No match records yet</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Play your first quick match against AI opponents to begin your club history.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {matchHistory.slice(0, 5).map((match) => {
              const isHome = match.homeClub.id === club.id;
              const teamScore = isHome ? match.homeScore : match.awayScore;
              const oppScore = isHome ? match.awayScore : match.homeScore;
              const opponent = isHome ? match.awayClub : match.homeClub;

              const isWin = teamScore > oppScore;
              const isDraw = teamScore === oppScore;

              return (
                <div
                  key={match.id}
                  className="p-3 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-[10px] ${
                        isWin
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isDraw
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isWin ? 'W' : isDraw ? 'D' : 'L'}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">vs {opponent.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(match.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="font-mono font-extrabold text-sm text-white">
                    {teamScore} - {oppScore}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
