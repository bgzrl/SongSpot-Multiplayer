import React, { useMemo } from 'react';
import { Play, Square, Volume2, Volume1, VolumeX, Sparkles, Lock, FastForward, Flag } from 'lucide-react';

interface AudioWaveformProps {
  steps: number[];
  currentStep: number;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isRevealed?: boolean;
  volume?: number;
  onVolumeChange?: (vol: number) => void;
  onSkip?: () => void;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  steps,
  currentStep,
  currentTime,
  isPlaying,
  onTogglePlay,
  isRevealed = false,
  volume = 0.8,
  onVolumeChange,
  onSkip,
}) => {
  const safeVolume = typeof volume === 'number' && !isNaN(volume) ? volume : 0.8;
  const totalMax = steps[steps.length - 1] || 15.0;
  const prevDuration = currentStep > 1 && !isRevealed ? steps[currentStep - 2] : 0;
  const currentMaxDuration = isRevealed ? 30 : steps[Math.min(currentStep - 1, steps.length - 1)] || 0.2;

  // Next unlocked step delta
  const nextDurationDiff =
    currentStep < steps.length
      ? (steps[currentStep] - steps[currentStep - 1]).toFixed(1)
      : null;

  // Unlocked portion ratio across total duration
  const unlockedRatio = isRevealed ? 1 : Math.min(1, currentMaxDuration / totalMax);

  // Playhead scrubber position (0 to 1) across total duration
  const playheadRatio = isRevealed
    ? Math.min(1, Math.max(0, currentTime / 30))
    : Math.min(1, Math.max(0, currentTime / totalMax));

  const volumePercent = Math.round(safeVolume * 100);

  // Format seconds to mm:ss.s
  const formatTime = (sec: number) => {
    const s = Math.max(0, sec);
    return s.toFixed(1) + 's';
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md select-none">
      {/* Top Bar: Extrait Info & Potard de son */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-slate-400 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-xl font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isRevealed
                ? 'Morceau complet débloqué (30s)'
                : `Extrait débloqué : ${prevDuration}s ➔ ${currentMaxDuration}s (Essai ${currentStep}/${steps.length})`}
            </span>
          </div>
        </div>

        {/* Potard de Son Réglable (Volume slider) */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => onVolumeChange?.(safeVolume > 0 ? 0 : 0.8)}
            type="button"
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={safeVolume === 0 ? 'Activer le son' : 'Couper le son'}
          >
            {safeVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : safeVolume < 0.5 ? (
              <Volume1 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={volumePercent}
            onChange={(e) => onVolumeChange?.(Number(e.target.value) / 100)}
            className="w-20 sm:w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            title={`Volume : ${volumePercent}%`}
          />

          <span className="font-mono text-[11px] font-bold text-slate-300 w-8 text-right">
            {volumePercent}%
          </span>
        </div>
      </div>

      {/* The Segmented Heardle Progress Bar */}
      <div className="relative mb-3">
        {/* Step duration markers above segments */}
        <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1 px-0.5">
          <span>0s</span>
          {steps.map((sec, idx) => (
            <span
              key={idx}
              className={idx + 1 <= currentStep || isRevealed ? 'text-emerald-400 font-bold' : 'text-slate-600'}
            >
              {sec}s
            </span>
          ))}
        </div>

        {/* Horizontal Segmented Bar Container */}
        <div className="relative h-4 sm:h-5 w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex">
          {/* Slices for each step */}
          {steps.map((sec, idx) => {
            const stepStart = idx === 0 ? 0 : steps[idx - 1];
            const stepWidthPct = ((sec - stepStart) / totalMax) * 100;
            const isUnlocked = isRevealed || idx + 1 <= currentStep;
            const isCurrent = !isRevealed && idx + 1 === currentStep;

            return (
              <div
                key={idx}
                className={`relative h-full border-r border-slate-900/90 transition-all ${
                  isUnlocked
                    ? isCurrent
                      ? 'bg-emerald-500/30'
                      : 'bg-emerald-500/15'
                    : 'bg-slate-950/60'
                }`}
                style={{ width: `${stepWidthPct}%` }}
              >
                {!isUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    <Lock className="w-2.5 h-2.5 text-slate-600" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Unlocked fill underlay */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-emerald-500/10 pointer-events-none transition-all duration-300"
            style={{ width: `${unlockedRatio * 100}%` }}
          />

          {/* Dynamic Playhead scrubber cursor moving along during playback */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] border-r-2 border-white pointer-events-none transition-all duration-75"
            style={{ width: `${playheadRatio * 100}%` }}
          />
        </div>
      </div>

      {/* Center Controls: Play Button & Timers */}
      <div className="flex items-center justify-between pt-2">
        <span className="font-mono text-xs font-bold text-slate-400 w-16">
          {formatTime(currentTime)}
        </span>

        {/* Big Play / Pause Circle */}
        <button
          onClick={onTogglePlay}
          type="button"
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 transform active:scale-95 cursor-pointer ${
            isPlaying
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30 ring-4 ring-rose-500/20'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/40 hover:scale-105 ring-4 ring-emerald-500/20'
          }`}
          title={
            isPlaying
              ? 'Arrêter la lecture'
              : isRevealed
              ? 'Écouter le morceau complet (30s)'
              : `Écouter l'extrait (${prevDuration}s ➔ ${currentMaxDuration}s)`
          }
        >
          {isPlaying ? (
            <Square className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-1" />
          )}
        </button>

        <span className="font-mono text-xs font-bold text-slate-400 w-16 text-right">
          {formatTime(currentMaxDuration)}
        </span>
      </div>

      {/* Footer bar with 'Espace pour écouter' on the left, and PASSER button placed on the right */}
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400 px-1 border-t border-slate-800/60 pt-3">
        <span className="flex items-center gap-1.5 text-slate-300">
          <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded-lg border border-slate-700 font-mono text-xs shadow-sm">
            Espace
          </kbd>
          <span>pour écouter</span>
        </span>

        {/* Passer button placed right on the bar as requested */}
        {!isRevealed && onSkip && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onSkip();
            }}
            type="button"
            className={`flex items-center gap-1.5 px-4 py-1.5 font-black text-xs rounded-xl border transition-all cursor-pointer active:scale-95 shadow-md ${
              currentStep >= steps.length
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/50 hover:border-rose-400 ring-2 ring-rose-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 hover:border-slate-500 shadow-slate-900/40 hover:text-white'
            }`}
            title="Passer à l'extrait suivant"
          >
            {currentStep >= steps.length ? (
              <>
                <Flag className="w-3.5 h-3.5 text-rose-400" />
                <span>FINIR LA MANCHE 🏳️</span>
              </>
            ) : (
              <>
                <FastForward className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  PASSER {nextDurationDiff ? `(+${nextDurationDiff}s)` : ''}
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
