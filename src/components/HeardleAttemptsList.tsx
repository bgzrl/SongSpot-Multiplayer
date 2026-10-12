import React from 'react';
import { Check, X, FastForward, Music } from 'lucide-react';

export interface AttemptItem {
  type: 'skipped' | 'wrong' | 'correct';
  title?: string;
  artist?: string;
  artwork?: string;
}

interface HeardleAttemptsListProps {
  attempts: AttemptItem[];
  maxAttempts?: number;
  currentStep: number;
  isRevealed?: boolean;
}

export const HeardleAttemptsList: React.FC<HeardleAttemptsListProps> = ({
  attempts,
  maxAttempts = 6,
  currentStep,
  isRevealed = false,
}) => {
  const rows = Array.from({ length: maxAttempts }, (_, idx) => {
    return attempts[idx] || null;
  });

  return (
    <div className="w-full space-y-2 select-none">
      {rows.map((att, idx) => {
        const stepNum = idx + 1;
        const isCurrent = !isRevealed && !att && stepNum === currentStep;

        if (att?.type === 'correct') {
          return (
            <div
              key={idx}
              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border-2 border-emerald-500 text-emerald-200 flex items-center justify-between gap-3 shadow-lg shadow-emerald-500/10 animate-in zoom-in-95 duration-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                {att.artwork && (
                  <img
                    src={att.artwork}
                    alt=""
                    className="w-7 h-7 rounded-lg object-cover shrink-0 border border-emerald-400/40"
                  />
                )}
                <div className="truncate text-xs sm:text-sm font-bold text-white">
                  <span>{att.artist}</span>
                  <span className="text-emerald-300 font-normal"> — {att.title}</span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 shrink-0 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                Trouvé !
              </span>
            </div>
          );
        }

        if (att?.type === 'wrong') {
          return (
            <div
              key={idx}
              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 flex items-center justify-between gap-3 animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                {att.artwork && (
                  <img
                    src={att.artwork}
                    alt=""
                    className="w-7 h-7 rounded-lg object-cover shrink-0 border border-rose-400/30 opacity-70"
                  />
                )}
                <div className="truncate text-xs sm:text-sm text-rose-200 font-medium line-through opacity-85">
                  <span>{att.artist}</span>
                  <span className="text-slate-400"> — {att.title}</span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-mono font-bold text-rose-400/80 shrink-0">
                Faux
              </span>
            </div>
          );
        }

        if (att?.type === 'skipped') {
          return (
            <div
              key={idx}
              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 flex items-center justify-between gap-3 animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                  <FastForward className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs sm:text-sm font-semibold tracking-wide text-slate-400">
                  Passé (extrait suivant débloqué)
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500 shrink-0">
                Ignoré
              </span>
            </div>
          );
        }

        // Empty row
        return (
          <div
            key={idx}
            className={`w-full h-11 px-3.5 rounded-xl flex items-center transition-all ${
              isCurrent
                ? 'bg-slate-900/80 border-2 border-slate-600 shadow-sm'
                : 'bg-slate-950/40 border border-slate-800/80'
            }`}
          >
            {isCurrent && (
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Essai n°{stepNum} en cours...</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
