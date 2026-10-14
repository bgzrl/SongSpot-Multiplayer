import React, { useState, useRef, useCallback } from 'react';
import { Play, Square, Volume2, Volume1, VolumeX, Lock, GripVertical } from 'lucide-react';

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

  // Draggable scrub state
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);

  const maxAllowedSec = isRevealed ? 30 : currentStepEnd;
  const effectiveTime = dragTime !== null ? dragTime : currentTime;

  // Playhead scrubber position (0 to 1) across total duration
  const playheadRatio = isRevealed
    ? Math.min(1, Math.max(0, effectiveTime / 30))
    : Math.min(1, Math.max(0, effectiveTime / totalMax));

  const volumePercent = Math.round(safeVolume * 100);

  // Format seconds to mm:ss.s
  const formatTime = (sec: number) => {
    const s = Math.max(0, sec);
    return s.toFixed(1) + 's';
  };

  const getTimeFromPointerX = useCallback((clientX: number): number => {
    const el = barRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawSec = isRevealed ? ratio * 30 : ratio * totalMax;
    return Math.min(maxAllowedSec, Math.max(0, rawSec));
  }, [isRevealed, totalMax, maxAllowedSec]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = barRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const targetSec = getTimeFromPointerX(e.clientX);
    setDragTime(targetSec);
    onSeek?.(targetSec);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const targetSec = getTimeFromPointerX(e.clientX);
    setDragTime(targetSec);
    onSeek?.(targetSec);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const el = barRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    }
    const finalSec = getTimeFromPointerX(e.clientX);
    setIsDragging(false);
    setDragTime(null);
    onSeek?.(finalSec);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const el = barRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    }
    setIsDragging(false);
    setDragTime(null);
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
              <span className="text-slate-400 text-xs font-medium">
                {currentStep}/{steps.length}
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

        {/* Horizontal Segmented Bar Container with Drag/Slide Support */}
        <div
          ref={barRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="relative h-8 sm:h-9 w-full bg-[#18201a] rounded-[12px] overflow-hidden border border-white/10 flex shadow-inner cursor-ew-resize touch-none select-none"
          title="Glissez ou cliquez pour sélectionner le moment d'écoute"
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
                className={`group relative h-full border-r border-slate-950/80 transition-all ${
                  isUnlocked
                    ? isCurrent
                      ? 'bg-emerald-500 shadow-[inset_0_0_12px_rgba(255,255,255,0.25)] hover:bg-emerald-400 ring-2 ring-emerald-400/60 ring-inset'
                      : 'bg-emerald-700/80 hover:bg-emerald-600/90'
                    : 'bg-[#212923] opacity-60'
                }`}
                style={{ width: `${stepWidthPct}%` }}
                title={
                  isUnlocked
                    ? `Étape ${idx + 1} (${stepStart}s - ${sec}s)`
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

          {/* Dynamic Playhead scrubber highlight filling up to current position */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-white/30 border-r-2 border-white pointer-events-none transition-all duration-75 shadow-[0_0_12px_rgba(255,255,255,0.8)]"
            style={{ width: `${playheadRatio * 100}%` }}
          />

          {/* Draggable Scrubber Thumb & Indicator Needle */}
          <div
            className={`absolute top-0 bottom-0 -ml-2 w-4 flex flex-col items-center justify-center pointer-events-none transition-transform z-20 ${
              isDragging ? 'scale-110' : ''
            }`}
            style={{
              left: `${playheadRatio * 100}%`,
            }}
          >
            {/* Draggable Handle pill */}
            <div className="w-3.5 h-6 rounded-md bg-white text-slate-950 shadow-[0_0_12px_rgba(255,255,255,0.9)] flex items-center justify-center border border-slate-300 ring-2 ring-emerald-500/50">
              <GripVertical className="w-3 h-3 text-slate-800" />
            </div>

            {/* Time badge tooltip while dragging */}
            {isDragging && (
              <div className="absolute -top-7 bg-slate-950 text-emerald-400 border border-emerald-500/50 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                {effectiveTime.toFixed(1)}s
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center Controls: Play Button & Timers */}
      <div className="grid grid-cols-3 items-center pt-2">
        {/* Left: Current Time */}
        <div className="flex items-center justify-start">
          <span className="font-mono text-xs sm:text-sm font-bold text-slate-400">
            {formatTime(isPlaying ? currentTime : (currentTime > 0 ? currentTime : currentStepStart))}
          </span>
        </div>

        {/* Center: Big Play / Pause Circle (Truly Centered) */}
        <div className="flex items-center justify-center">
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
        </div>

        {/* Right: Step End Time */}
        <div className="flex items-center justify-end">
          <span className="font-mono text-xs sm:text-sm font-bold text-slate-400">
            {formatTime(isRevealed ? 30 : currentStepEnd)}
          </span>
        </div>
      </div>
    </div>
  );
};
