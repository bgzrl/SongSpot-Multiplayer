import React from 'react';
import { Play, Square, Volume2, Volume1, VolumeX, Lock, FastForward, Flag, RotateCcw } from 'lucide-react';

interface AudioWaveformProps {
  steps: number[];
  currentStep: number;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlaySegment?: (startSec: number, endSec: number) => void;
  onSeek?: (sec: number) => void;
  onReplayAll?: () => void;
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
  onPlaySegment,
  onSeek,
  onReplayAll,
  isRevealed = false,
  volume = 0.8,
  onVolumeChange,
  onSkip,
}) => {
  const safeVolume = typeof volume === 'number' && !isNaN(volume) ? volume : 0.8;
  const totalMax = steps[steps.length - 1] || 16.0;
  const currentStepIndex = Math.min(currentStep - 1, steps.length - 1);
  const currentStepStart = currentStepIndex === 0 ? 0 : steps[currentStepIndex - 1];
  const currentStepEnd = steps[currentStepIndex] || 1.0;

  // Next unlocked step delta
  const nextDurationDiff =
    currentStep < steps.length
      ? (steps[currentStep] - steps[currentStep - 1]).toFixed(1)
      : null;

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

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = isRevealed ? clickRatio * 30 : clickRatio * totalMax;
    if (targetSec <= currentStepEnd) {
      onSeek?.(targetSec);
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg select-none">
      {/* Top Bar: Extrait Info & Potard de son */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-slate-400 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          {isRevealed ? (
            <span className="text-emerald-400 font-semibold text-xs">
              Morceau complet débloqué (30s)
            </span>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-300 text-xs">
                Étape {currentStep} : Extrait de{' '}
                <strong className="text-emerald-400 font-bold">
                  {currentStepStart}s à {currentStepEnd}s
                </strong>
              </span>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className="text-slate-400 text-xs">
                {currentStep}/{steps.length}
              </span>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className="text-slate-400 text-xs italic">
                Cliquez sur une tranche pour la réécouter
              </span>
            </div>
          )}
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

          <span className="tabular-nums text-xs font-semibold text-slate-300 w-8 text-right">
            {volumePercent}%
          </span>
        </div>
      </div>

      {/* The Segmented Heardle Progress Bar with pixel-perfect numbers */}
      <div className="relative mb-3">
        {/* Step duration markers precisely anchored above their segment dividers */}
        <div className="relative w-full h-6 mb-1 select-none pointer-events-none">
          {/* 0s marker at the left edge */}
          <div className="absolute left-0 top-0 flex flex-col items-start">
            <span className="text-[11px] font-bold tabular-nums text-slate-400">
              0s
            </span>
            <div className="w-[1.5px] h-1.5 rounded-full mt-0.5 bg-slate-500" />
          </div>

          {/* Each step boundary marker aligned exactly above its divider */}
          {steps.map((sec, idx) => {
            const isLast = idx === steps.length - 1;
            const pct = (sec / totalMax) * 100;
            const isUnlocked = idx + 1 <= currentStep || isRevealed;

            return (
              <div
                key={idx}
                className={`absolute top-0 flex flex-col transition-colors ${
                  isLast ? 'items-end' : 'items-center'
                }`}
                style={{
                  left: isLast ? undefined : `${pct}%`,
                  right: isLast ? 0 : undefined,
                  transform: isLast ? 'none' : 'translateX(-50%)',
                }}
              >
                <span
                  className={`text-[11px] font-bold tabular-nums transition-colors ${
                    isUnlocked ? 'text-emerald-400' : 'text-slate-600'
                  }`}
                >
                  {sec}s
                </span>
                <div
                  className={`w-[1.5px] h-1.5 rounded-full mt-0.5 transition-colors ${
                    isUnlocked ? 'bg-emerald-400/80' : 'bg-slate-700'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Horizontal Segmented Bar Container */}
        <div
          onClick={handleBarClick}
          className="relative h-7 sm:h-8 w-full bg-[#18201a] rounded-[12px] overflow-hidden border border-white/10 flex shadow-inner cursor-pointer"
          title="Cliquez pour écouter"
        >
          {/* Slices for each step */}
          {steps.map((sec, idx) => {
            const stepStart = idx === 0 ? 0 : steps[idx - 1];
            const stepWidthPct = ((sec - stepStart) / totalMax) * 100;
            const isUnlocked = isRevealed || idx + 1 <= currentStep;
            const isCurrent = !isRevealed && idx + 1 === currentStep;

            return (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isUnlocked) {
                    if (onPlaySegment) {
                      onPlaySegment(stepStart, sec);
                    } else {
                      onSeek?.(stepStart);
                    }
                  }
                }}
                className={`group relative h-full border-r border-slate-950/80 transition-all ${
                  isUnlocked
                    ? isCurrent
                      ? 'bg-emerald-500 shadow-[inset_0_0_12px_rgba(255,255,255,0.25)] hover:bg-emerald-400 ring-2 ring-emerald-400/60 ring-inset cursor-pointer'
                      : 'bg-emerald-700/80 hover:bg-emerald-600/90 cursor-pointer'
                    : 'bg-[#212923] cursor-not-allowed'
                }`}
                style={{ width: `${stepWidthPct}%` }}
                title={
                  isUnlocked
                    ? `Étape ${idx + 1} (${stepStart}s - ${sec}s) : Cliquer pour écouter ce segment`
                    : `Étape ${idx + 1} verrouillée (${sec}s)`
                }
              >
                {!isUnlocked ? (
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <Lock className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                ) : (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-white/10 transition-opacity">
                    <span className="text-[10px] font-bold text-white drop-shadow">
                      {stepStart}s-{sec}s
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Dynamic Playhead scrubber cursor moving along during playback */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-white/40 border-r-2 border-white pointer-events-none transition-all duration-75 shadow-[0_0_10px_white]"
            style={{ width: `${playheadRatio * 100}%` }}
          />
        </div>
      </div>

      {/* Center Controls: Play Button & Timers & Quick Replay */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-slate-400 w-14">
            {formatTime(isPlaying ? currentTime : (currentTime > 0 ? currentTime : currentStepStart))}
          </span>

          {/* Quick replay from 0s button */}
          <button
            onClick={() => onReplayAll?.()}
            type="button"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 text-[11px] font-medium transition-colors cursor-pointer border border-slate-700/60"
            title={`Tout réécouter depuis le début (0s à ${currentStepEnd}s)`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tout écouter</span>
          </button>
        </div>

        {/* Big Play / Pause Circle */}
        <button
          onClick={onTogglePlay}
          type="button"
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 transform active:scale-95 cursor-pointer ${
            isPlaying
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_30px_rgba(244,63,94,0.4)] ring-4 ring-rose-500/20'
              : 'bg-[#10b981] hover:bg-[#059669] text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 ring-4 ring-emerald-500/20'
          }`}
          title={
            isPlaying
              ? 'Arrêter la lecture'
              : isRevealed
              ? 'Écouter le morceau complet (30s)'
              : `Écouter l'étape ${currentStep} (${currentStepStart}s ➔ ${currentStepEnd}s)`
          }
        >
          {isPlaying ? (
            <Square className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-1" />
          )}
        </button>

        <span className="font-mono text-xs font-bold text-slate-400 w-16 text-right">
          {formatTime(isRevealed ? 30 : currentStepEnd)}
        </span>
      </div>

      {/* Footer bar with 'Espace pour écouter' on the left, and PASSER button placed on the right */}
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400 px-1 border-t border-slate-800/60 pt-3">
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded-md border border-slate-700/80 text-xs font-medium shadow-sm">
            Espace
          </span>
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
            className={`flex items-center gap-1.5 px-4 py-1.5 font-bold text-xs rounded-xl border transition-all cursor-pointer active:scale-95 shadow-sm ${
              currentStep >= steps.length
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white'
            }`}
            title="Passer à l'extrait suivant"
          >
            {currentStep >= steps.length ? (
              <>
                <Flag className="w-3.5 h-3.5 text-rose-400" />
                <span>Terminer la manche</span>
              </>
            ) : (
              <>
                <FastForward className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Passer {nextDurationDiff ? `(+${nextDurationDiff}s)` : ''}
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
