import React from 'react';
import { SoloStats } from '../types/game';
import { X, Trophy, Flame, BarChart3, CheckCircle2 } from 'lucide-react';

interface StatsModalProps {
  stats: SoloStats;
  isOpen: boolean;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ stats, isOpen, onClose }) => {
  if (!isOpen) return null;

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const maxGuesses = Math.max(1, ...Object.values(stats.guessDistribution || {}));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative animate-in zoom-in-95 duration-200 text-white">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">Statistiques</h3>
            <p className="text-xs text-slate-400">Vos performances en Solo</p>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
            <div className="text-xl sm:text-2xl font-black text-white">{stats.gamesPlayed}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jouées</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
            <div className="text-xl sm:text-2xl font-black text-emerald-400">{winRate}%</div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Victoires</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
            <div className="text-xl sm:text-2xl font-black text-orange-400 flex items-center justify-center gap-0.5">
              <Flame className="w-4 h-4 fill-current" />
              <span>{stats.currentStreak}</span>
            </div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Série</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
            <div className="text-xl sm:text-2xl font-black text-amber-400 flex items-center justify-center gap-0.5">
              <Trophy className="w-4 h-4 fill-current" />
              <span>{stats.bestStreak}</span>
            </div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Record</div>
          </div>
        </div>

        {/* Guess Distribution Histogram (1 to 6) */}
        <div className="mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Répartition des victoires
          </h4>
          <div className="space-y-1.5 tabular-nums text-xs">
            {[1, 2, 3, 4, 5, 6].map(num => {
              const count = stats.guessDistribution?.[num] || 0;
              const widthPct = Math.max(7, Math.round((count / maxGuesses) * 100));
              return (
                <div key={num} className="flex items-center gap-2">
                  <span className="w-3 text-slate-400 font-bold">{num}</span>
                  <div className="flex-1 bg-slate-950 rounded-lg overflow-hidden h-6 border border-slate-800/80">
                    <div
                      className={`h-full flex items-center justify-end px-2 font-bold transition-all duration-500 ${
                        count > 0 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-850 text-slate-600'
                      }`}
                      style={{ width: `${count > 0 ? widthPct : 7}%` }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          type="button"
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98 text-sm"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};
