import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player } from '../types/game';
import { Trophy, Crown, Sparkles, RotateCcw, Home, Medal } from 'lucide-react';
import { soundFX } from '../services/soundEffects';

interface GamePodiumProps {
  players: Player[];
  isHost: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export const GamePodium: React.FC<GamePodiumProps> = ({
  players,
  isHost,
  onPlayAgain,
  onLeave,
}) => {
  // Sort players by score descending
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const first = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];

  useEffect(() => {
    soundFX.playFanfare();

    // Trigger confetti bursts
    const end = Date.now() + 3.5 * 1000;
    const colors = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#3b82f6'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-500">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" /> Partie Terminée !
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Podium Final 🏆
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Félicitations à tous les mélomanes !
        </p>
      </div>

      {/* 3D-Style Podium Standings */}
      <div className="flex items-end justify-center gap-3 sm:gap-6 mb-12 pt-8 px-2">
        {/* 2nd Place */}
        {second && (
          <div className="flex-1 max-w-[150px] sm:max-w-[180px] flex flex-col items-center">
            <div className="relative mb-2 flex flex-col items-center">
              <span className="text-3xl sm:text-4xl filter drop-shadow">{second.avatar}</span>
              <div className="font-bold text-sm text-white truncate max-w-full text-center mt-1">
                {second.nickname}
              </div>
              <div className="font-mono text-xs font-bold text-slate-300">
                {second.score} pts
              </div>
            </div>
            <div className="w-full h-32 sm:h-40 bg-gradient-to-t from-slate-800 to-slate-700/80 rounded-t-2xl border-t-4 border-slate-400 flex flex-col items-center justify-start pt-3 shadow-lg">
              <div className="w-9 h-9 rounded-full bg-slate-400/20 border border-slate-400 flex items-center justify-center font-black text-slate-300 text-base">
                2
              </div>
              <span className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                Argent
              </span>
            </div>
          </div>
        )}

        {/* 1st Place (Winner) */}
        {first && (
          <div className="flex-1 max-w-[170px] sm:max-w-[210px] flex flex-col items-center z-10">
            <div className="relative mb-2 flex flex-col items-center">
              <Crown className="w-8 h-8 text-amber-400 fill-amber-400 animate-bounce mb-1" />
              <span className="text-4xl sm:text-5xl filter drop-shadow-lg">{first.avatar}</span>
              <div className="font-extrabold text-base sm:text-lg text-amber-300 truncate max-w-full text-center mt-1">
                {first.nickname}
              </div>
              <div className="font-mono text-sm font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                {first.score} pts
              </div>
            </div>
            <div className="w-full h-44 sm:h-52 bg-gradient-to-t from-amber-600/40 via-amber-500/30 to-amber-400/40 rounded-t-2xl border-t-4 border-amber-400 flex flex-col items-center justify-start pt-4 shadow-2xl ring-2 ring-amber-400/20">
              <div className="w-11 h-11 rounded-full bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg">
                1
              </div>
              <span className="text-xs font-black text-amber-300 mt-1 uppercase tracking-wider">
                Champion
              </span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {third && (
          <div className="flex-1 max-w-[150px] sm:max-w-[180px] flex flex-col items-center">
            <div className="relative mb-2 flex flex-col items-center">
              <span className="text-3xl sm:text-4xl filter drop-shadow">{third.avatar}</span>
              <div className="font-bold text-sm text-white truncate max-w-full text-center mt-1">
                {third.nickname}
              </div>
              <div className="font-mono text-xs font-bold text-slate-300">
                {third.score} pts
              </div>
            </div>
            <div className="w-full h-24 sm:h-32 bg-gradient-to-t from-slate-900 to-amber-900/40 rounded-t-2xl border-t-4 border-amber-700 flex flex-col items-center justify-start pt-3 shadow-lg">
              <div className="w-9 h-9 rounded-full bg-amber-700/20 border border-amber-600 flex items-center justify-center font-black text-amber-600 text-base">
                3
              </div>
              <span className="text-[11px] font-semibold text-amber-600 mt-1 uppercase tracking-wider">
                Bronze
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Full Leaderboard Table (if > 3 players) */}
      {sortedPlayers.length > 3 && (
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-8">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Classement Complet
          </div>
          <div className="space-y-1.5">
            {sortedPlayers.slice(3).map((player, idx) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500 font-bold">
                    #{idx + 4}
                  </span>
                  <span className="text-lg">{player.avatar}</span>
                  <span className="font-semibold text-sm text-white">{player.nickname}</span>
                </div>
                <div className="font-mono font-bold text-sm text-slate-300">
                  {player.score} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {isHost ? (
          <button
            onClick={onPlayAgain}
            type="button"
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base rounded-2xl shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" /> Rejouer une partie
          </button>
        ) : (
          <div className="text-sm text-slate-400 italic">
            En attente de l'hôte pour relancer une partie...
          </div>
        )}

        <button
          onClick={onLeave}
          type="button"
          className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-5 h-5" /> Quitter le salon
        </button>
      </div>
    </div>
  );
};
