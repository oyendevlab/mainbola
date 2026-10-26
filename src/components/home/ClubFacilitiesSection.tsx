import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import {
  STADIUM_LEVELS,
  YOUTH_LEVELS,
  MEDICAL_LEVELS,
  upgradeCost,
} from '../../engine/facilities';
import { getAllSponsors } from '../../engine/sponsors';
import {
  Building2,
  GraduationCap,
  HeartPulse,
  Briefcase,
  Sparkles,
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
  X,
  Coins,
} from 'lucide-react';

export const ClubFacilitiesSection: React.FC = () => {
  const {
    club,
    upgradeFacility,
    promoteYouthProdigy,
    signSponsorContract,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'stadium' | 'youth' | 'medical' | 'sponsor'>('stadium');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSponsorModal, setShowSponsorModal] = useState(false);

  if (!club) return null;

  const facilities = club.facilities ?? {
    stadiumLevel: 1,
    youthAcademyLevel: 1,
    medicalLevel: 1,
  };

  const currentStadium = STADIUM_LEVELS.find((s) => s.level === facilities.stadiumLevel) || STADIUM_LEVELS[0];
  const currentYouth = YOUTH_LEVELS.find((y) => y.level === facilities.youthAcademyLevel) || YOUTH_LEVELS[0];
  const currentMedical = MEDICAL_LEVELS.find((m) => m.level === facilities.medicalLevel) || MEDICAL_LEVELS[0];

  const stadiumCost = upgradeCost('stadium', facilities.stadiumLevel);
  const youthCost = upgradeCost('youthAcademy', facilities.youthAcademyLevel);
  const medicalCost = upgradeCost('medical', facilities.medicalLevel);

  const allSponsors = getAllSponsors();
  const activeSponsor = allSponsors.find((s) => s.id === club.activeSponsorId);

  const handleUpgrade = async (facility: 'stadium' | 'youthAcademy' | 'medical') => {
    try {
      setIsProcessing(true);
      const res = await upgradeFacility(facility);
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromoteYouth = async () => {
    try {
      setIsProcessing(true);
      const res = await promoteYouthProdigy();
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignSponsor = async (sponsorId: string) => {
    try {
      setIsProcessing(true);
      const res = await signSponsorContract(sponsorId);
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      setShowSponsorModal(false);
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl bg-navy-900 border border-slate-800 p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Pengurusan Kelab &amp; Kemudahan
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <Coins className="w-3.5 h-3.5" />
          <span>RM{(club.budget ?? 50000).toLocaleString()}</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-1.5 bg-navy-950 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('stadium')}
          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'stadium'
              ? 'bg-emerald-500 text-navy-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Stadium</span>
        </button>
        <button
          onClick={() => setActiveTab('youth')}
          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'youth'
              ? 'bg-emerald-500 text-navy-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Akademi</span>
        </button>
        <button
          onClick={() => setActiveTab('medical')}
          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'medical'
              ? 'bg-emerald-500 text-navy-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>Perubatan</span>
        </button>
        <button
          onClick={() => setActiveTab('sponsor')}
          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'sponsor'
              ? 'bg-emerald-500 text-navy-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Tajaan</span>
        </button>
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

      {/* TAB 1: STADIUM */}
      {activeTab === 'stadium' && (
        <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{currentStadium.name}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Tahap {facilities.stadiumLevel} / 5
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Kapasiti Penonton: <strong className="text-white font-mono">{currentStadium.capacity.toLocaleString()}</strong> tempat duduk
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Hasil Tiket</div>
              <div className="text-sm font-mono font-extrabold text-emerald-400 mt-0.5">
                +RM{currentStadium.ticketRevenue.toLocaleString()} / match
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            {stadiumCost !== null ? (
              <>
                <div className="text-xs text-slate-400">
                  Kos Naik Taraf: <strong className="text-amber-400 font-mono">RM{stadiumCost.toLocaleString()}</strong>
                </div>
                <button
                  disabled={isProcessing || club.budget < stadiumCost}
                  onClick={() => handleUpgrade('stadium')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-navy-950 transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                  <span>Naik Taraf (Tahap {facilities.stadiumLevel + 1})</span>
                </button>
              </>
            ) : (
              <div className="w-full text-center py-1 text-xs font-bold text-amber-400">
                ★ Stadium telah dinaik taraf ke tahap maksimum!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: YOUTH ACADEMY */}
      {activeTab === 'youth' && (
        <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{currentYouth.name}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Tahap {facilities.youthAcademyLevel} / 3
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {currentYouth.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
            <button
              disabled={isProcessing || club.budget < 3000}
              onClick={handlePromoteYouth}
              className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-navy-950 font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-amber-500/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Serap Permata Akademi (RM3,000)</span>
            </button>

            {youthCost !== null ? (
              <button
                disabled={isProcessing || club.budget < youthCost}
                onClick={() => handleUpgrade('youthAcademy')}
                className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-navy-950 font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span>Naik Taraf Akademi (RM{youthCost.toLocaleString()})</span>
              </button>
            ) : (
              <div className="flex items-center justify-center text-xs font-bold text-amber-400 bg-amber-500/10 rounded-xl border border-amber-500/20 py-2">
                ★ Akademi Tahap Maksimum
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MEDICAL CENTRE */}
      {activeTab === 'medical' && (
        <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{currentMedical.name}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Tahap {facilities.medicalLevel} / 3
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {currentMedical.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Bonus Pulih</div>
              <div className="text-sm font-mono font-extrabold text-emerald-400 mt-0.5">
                +{currentMedical.fatigueRecoveryBonus}%
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            {medicalCost !== null ? (
              <>
                <div className="text-xs text-slate-400">
                  Kos Naik Taraf: <strong className="text-amber-400 font-mono">RM{medicalCost.toLocaleString()}</strong>
                </div>
                <button
                  disabled={isProcessing || club.budget < medicalCost}
                  onClick={() => handleUpgrade('medical')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-navy-950 transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                  <span>Naik Taraf (Tahap {facilities.medicalLevel + 1})</span>
                </button>
              </>
            ) : (
              <div className="w-full text-center py-1 text-xs font-bold text-amber-400">
                ★ Pusat Perubatan telah mencapai tahap maksimum!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SPONSOR */}
      {activeTab === 'sponsor' && (
        <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-3">
          {activeSponsor ? (
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{activeSponsor.name}</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {activeSponsor.tier} Tier
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    AKTIF
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                  <div>Bonus Menang: <strong className="text-emerald-400 font-mono">+RM{activeSponsor.winBonus.toLocaleString()}</strong></div>
                  <div>Bonus Bolos Sifar (Clean Sheet): <strong className="text-emerald-400 font-mono">+RM{activeSponsor.cleanSheetBonus.toLocaleString()}</strong></div>
                </div>
              </div>
              <button
                onClick={() => setShowSponsorModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              >
                Tukar Penaja
              </button>
            </div>
          ) : (
            <div className="text-center py-2 space-y-2">
              <div className="text-xs text-slate-400">
                Kelab anda belum mempunyai sebarang penaja rasmi aktif.
              </div>
              <button
                onClick={() => setShowSponsorModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-navy-950 transition cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Pilih Tawaran Penajaan Rasmi
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sponsor Selection Modal */}
      {showSponsorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Tawaran Penajaan Kelab</h3>
              </div>
              <button
                onClick={() => setShowSponsorModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {allSponsors.map((deal) => {
                const isCurrent = club.activeSponsorId === deal.id;
                return (
                  <div
                    key={deal.id}
                    className={`p-3.5 rounded-xl border transition ${
                      isCurrent
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : 'bg-navy-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{deal.name}</span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            deal.tier === 'Gold'
                              ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                              : deal.tier === 'Silver'
                              ? 'bg-slate-300/20 text-slate-200 border-slate-300/40'
                              : 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                          }`}
                        >
                          {deal.tier}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-extrabold text-emerald-400">
                        +RM{deal.upfrontBonus.toLocaleString()} Pendahuluan
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1">{deal.description}</p>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <div className="text-slate-400">
                        Menang: <strong className="text-white font-mono">+RM{deal.winBonus.toLocaleString()}</strong> • Bolos Sifar: <strong className="text-white font-mono">+RM{deal.cleanSheetBonus.toLocaleString()}</strong>
                      </div>
                      <button
                        disabled={isCurrent || isProcessing}
                        onClick={() => handleSignSponsor(deal.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-navy-950'
                        }`}
                      >
                        {isCurrent ? 'Aktif' : 'Tandatangan'}
                      </button>
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
