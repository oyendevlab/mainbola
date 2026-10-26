import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { BadgeIcon } from '../common/BadgeIcon';
import { PhaserGame } from '../../renderer/PhaserGame';
import { CupMatch } from '../../types';
import {
  Trophy,
  Play,
  Sparkles,
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Swords,
  ChevronRight,
} from 'lucide-react';

export const KnockoutCupView: React.FC = () => {
  const {
    club,
    activeCup,
    createCupTournament,
    simulateCupRound,
    claimCupPrize,
  } = useGameStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [inspectedMatch, setInspectedMatch] = useState<CupMatch | null>(null);

  if (!club) return null;

  const handleStartCup = async () => {
    try {
      setIsProcessing(true);
      await createCupTournament();
      setFeedback({
        type: 'success',
        message: 'Kejohanan Piala MainBola (8 Pasukan) telah bermula!',
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal memulakan piala.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateRound = async () => {
    try {
      setIsProcessing(true);
      const res = await simulateCupRound();
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaimPrize = async () => {
    try {
      setIsProcessing(true);
      const res = await claimCupPrize();
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const quarterMatches = activeCup?.matches.filter((m) => m.round === 'Quarter') || [];
  const semiMatches = activeCup?.matches.filter((m) => m.round === 'Semi') || [];
  const finalMatches = activeCup?.matches.filter((m) => m.round === 'Final') || [];

  const roundNameMalay: Record<string, string> = {
    Quarter: 'Suku Akhir',
    Semi: 'Separuh Akhir',
    Final: 'Pentas Akhir',
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 border border-slate-800 p-5 shadow-xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Piala MainBola</h2>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Kalah Mati
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                8 Pasukan • 3 Pusingan Penentuan • Hadiah Juara RM35,000
              </p>
            </div>
          </div>

          {activeCup && activeCup.status === 'completed' && (
            <button
              onClick={handleStartCup}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Piala Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* STATE 1: NO ACTIVE CUP */}
      {!activeCup ? (
        <div className="rounded-2xl bg-navy-900 border border-slate-800 p-8 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Swords className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">Sertai Kejohanan Piala Kalah Mati</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Uji ketangkasan taktikal kelab anda menentang 7 kelab elit lain dalam sistem penyingkiran mutlak. Setiap perlawanan wajib ada pemenang (termasuk penentuan sepakan penalti jika seri).
            </p>
          </div>
          <button
            onClick={handleStartCup}
            disabled={isProcessing}
            className="px-6 py-3 rounded-xl font-extrabold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-navy-950 transition shadow-xl shadow-amber-500/20 flex items-center gap-2 mx-auto cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Mulakan Kejohanan Piala MainBola</span>
          </button>
        </div>
      ) : (
        /* STATE 2: ACTIVE / COMPLETED CUP BRACKET */
        <div className="space-y-6">
          {/* Winner Banner if completed */}
          {activeCup.status === 'completed' && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-teal-500/20 border border-amber-500/40 p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-navy-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-400/30">
                  🏆
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-wider">
                    Juara Piala MainBola
                  </div>
                  <div className="text-base font-extrabold text-white mt-0.5">
                    {activeCup.winnerClubName}
                  </div>
                </div>
              </div>

              {activeCup.winnerClubId === club.id && (
                <div>
                  {!activeCup.prizeClaimed ? (
                    <button
                      disabled={isProcessing}
                      onClick={handleClaimPrize}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-navy-950 font-black text-xs transition shadow-lg shadow-amber-400/20 cursor-pointer animate-pulse"
                    >
                      Tuntut Hadiah RM35,000!
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Hadiah RM35,000 Telah Dituntut</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Simulation Bar */}
          {activeCup.status === 'active' && (
            <div className="rounded-2xl bg-navy-900 border border-slate-800 p-4 shadow-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Pusingan Semasa: {roundNameMalay[activeCup.currentRound]}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Klik pada perlawanan yang selesai untuk tontonan ulangan 2D pixel.
                </div>
              </div>

              <button
                disabled={isProcessing}
                onClick={handleSimulateRound}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-navy-950 font-extrabold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5 fill-navy-950" />
                <span>Simulasi {roundNameMalay[activeCup.currentRound]}</span>
              </button>
            </div>
          )}

          {/* Tournament Bracket Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* COLUMN 1: QUARTER FINALS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Suku Akhir (4 Perlawanan)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Pusingan 1</span>
              </div>

              <div className="space-y-2.5">
                {quarterMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    userClubId={club.id}
                    onInspect={() => match.isCompleted && setInspectedMatch(match)}
                  />
                ))}
              </div>
            </div>

            {/* COLUMN 2: SEMI FINALS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Separuh Akhir (2 Perlawanan)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Pusingan 2</span>
              </div>

              <div className="space-y-2.5">
                {semiMatches.length > 0 ? (
                  semiMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      userClubId={club.id}
                      onInspect={() => match.isCompleted && setInspectedMatch(match)}
                    />
                  ))
                ) : (
                  <div className="p-6 rounded-xl bg-navy-950/40 border border-slate-800/60 text-center text-xs text-slate-500">
                    Menanti keputusan Suku Akhir...
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 3: GRAND FINAL */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Pentas Akhir</span>
                </span>
                <span className="text-[10px] font-mono text-amber-400 font-bold">PENENTUAN</span>
              </div>

              <div>
                {finalMatches.length > 0 ? (
                  finalMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      userClubId={club.id}
                      isFinal
                      onInspect={() => match.isCompleted && setInspectedMatch(match)}
                    />
                  ))
                ) : (
                  <div className="p-8 rounded-xl bg-navy-950/40 border border-slate-800/60 text-center text-xs text-slate-500">
                    Menanti juara Separuh Akhir...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Replay Modal */}
      {inspectedMatch && inspectedMatch.result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-amber-400 uppercase">
                  Ulangan {roundNameMalay[inspectedMatch.round]}
                </div>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {inspectedMatch.homeClub.name} vs {inspectedMatch.awayClub.name}
                </h3>
              </div>
              <button
                onClick={() => setInspectedMatch(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interactive 2D Replay Engine */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black">
              <PhaserGame
                events={inspectedMatch.result.events}
                homeTeam={inspectedMatch.result.homeClub}
                awayTeam={inspectedMatch.result.awayClub}
                playbackSpeed={1}
                className="w-full aspect-[16/9]"
              />
            </div>

            {/* Score & Penalties Summary */}
            <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-white">{inspectedMatch.homeClub.name}</span>
              <div className="text-center font-mono font-extrabold text-sm text-emerald-400">
                <span>{inspectedMatch.result.homeScore} - {inspectedMatch.result.awayScore}</span>
                {inspectedMatch.homePenalties !== undefined && inspectedMatch.awayPenalties !== undefined && (
                  <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                    (Penalti: {inspectedMatch.homePenalties} - {inspectedMatch.awayPenalties})
                  </div>
                )}
              </div>
              <span className="font-bold text-white">{inspectedMatch.awayClub.name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MatchCardProps {
  match: CupMatch;
  userClubId: string;
  isFinal?: boolean;
  onInspect: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, userClubId, isFinal, onInspect }) => {
  const isUserHome = match.homeClub.id === userClubId;
  const isUserAway = match.awayClub.id === userClubId;
  const isHomeWinner = match.isCompleted && match.winnerId === match.homeClub.id;
  const isAwayWinner = match.isCompleted && match.winnerId === match.awayClub.id;

  return (
    <div
      onClick={onInspect}
      className={`p-3 rounded-xl border transition-all ${
        match.isCompleted ? 'cursor-pointer hover:border-slate-700' : ''
      } ${
        isFinal
          ? 'bg-gradient-to-b from-navy-900 to-navy-950 border-amber-500/40 shadow-lg shadow-amber-500/5'
          : 'bg-navy-950 border-slate-800'
      }`}
    >
      <div className="space-y-1.5">
        {/* Home Club */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BadgeIcon
              badgeId={match.homeClub.badgeId}
              primaryColor={match.homeClub.primaryColor}
              secondaryColor={match.homeClub.secondaryColor}
              size={20}
            />
            <span
              className={`text-xs truncate ${
                isHomeWinner
                  ? 'font-extrabold text-emerald-400'
                  : isUserHome
                  ? 'font-bold text-white'
                  : 'text-slate-300'
              }`}
            >
              {match.homeClub.name}
            </span>
            {isUserHome && (
              <span className="text-[8px] font-mono font-bold px-1 rounded bg-emerald-500/20 text-emerald-400">
                ANDA
              </span>
            )}
          </div>
          <span className="font-mono font-bold text-xs text-white ml-2">
            {match.isCompleted && match.result ? match.result.homeScore : '-'}
          </span>
        </div>

        {/* Away Club */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BadgeIcon
              badgeId={match.awayClub.badgeId}
              primaryColor={match.awayClub.primaryColor}
              secondaryColor={match.awayClub.secondaryColor}
              size={20}
            />
            <span
              className={`text-xs truncate ${
                isAwayWinner
                  ? 'font-extrabold text-emerald-400'
                  : isUserAway
                  ? 'font-bold text-white'
                  : 'text-slate-300'
              }`}
            >
              {match.awayClub.name}
            </span>
            {isUserAway && (
              <span className="text-[8px] font-mono font-bold px-1 rounded bg-emerald-500/20 text-emerald-400">
                ANDA
              </span>
            )}
          </div>
          <span className="font-mono font-bold text-xs text-white ml-2">
            {match.isCompleted && match.result ? match.result.awayScore : '-'}
          </span>
        </div>
      </div>

      {/* Match Footer */}
      <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
        {match.isCompleted ? (
          <>
            <span className="text-slate-400 flex items-center gap-1 font-mono">
              {match.homePenalties !== undefined && match.awayPenalties !== undefined ? (
                <span className="text-amber-400 font-semibold">
                  Pen: {match.homePenalties}-{match.awayPenalties}
                </span>
              ) : (
                <span>Tamat</span>
              )}
            </span>
            <span className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5">
              <span>Tonton Replay</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </>
        ) : (
          <span className="text-slate-500 font-mono">Belum Dimainkan</span>
        )}
      </div>
    </div>
  );
};
