import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { getPreMatchPressConference, PressAnswer } from '../../engine/press';
import { Mic, CheckCircle2, ChevronRight, X } from 'lucide-react';

interface PressConferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  seed: number;
}

export const PressConferenceModal: React.FC<PressConferenceModalProps> = ({
  isOpen,
  onClose,
  seed,
}) => {
  const { club, answerPressConference } = useGameStore();
  const [selectedAnswer, setSelectedAnswer] = useState<PressAnswer | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  if (!isOpen || !club) return null;

  const pressQ = getPreMatchPressConference(seed);

  const handleSelectAnswer = async (ans: PressAnswer) => {
    setSelectedAnswer(ans);
    setHasAnswered(true);
    await answerPressConference(ans.moraleDelta);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl my-auto animate-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Sidang Media Pra-Perlawanan</h3>
              <p className="text-[11px] text-slate-400">{pressQ.context}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Question Prompt */}
        <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 text-slate-200 text-xs sm:text-sm font-medium leading-relaxed italic">
          {pressQ.question}
        </div>

        {/* Answer Options */}
        {!hasAnswered ? (
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Pilih Jawapan Pengurus:
            </div>
            {pressQ.answers.map((ans) => (
              <button
                key={ans.id}
                onClick={() => handleSelectAnswer(ans)}
                className="w-full text-left p-3.5 rounded-xl bg-navy-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {ans.tone}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      ans.moraleDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {ans.moraleDelta > 0 ? `+${ans.moraleDelta}` : ans.moraleDelta} Moral
                  </span>
                </div>
                <div className="text-xs text-slate-300 group-hover:text-white transition">
                  {ans.text}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white mb-0.5">Kenyataan Diterbitkan:</strong>
                {selectedAnswer?.feedback}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-navy-950 transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              <span>Kembali Ke Persediaan Perlawanan</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
