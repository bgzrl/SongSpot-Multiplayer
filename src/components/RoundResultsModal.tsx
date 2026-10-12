import React, { useState, useEffect } from 'react';
import { Song, RoundScoreRecord } from '../types/game';
import { Play, Square, Award, Disc3, ExternalLink, Trophy, CheckCircle2, XCircle, Volume2, Volume1, VolumeX } from 'lucide-react';

interface RoundResultsModalProps {
  song: Song;
  roundScores?: RoundScoreRecord[];
  currentRound: number;
  totalRounds: number;
  isHost: boolean;
  onNextRound?: () => void;
  volume?: number;
  onVolumeChange?: (vol: number) => void;
}

export const RoundResultsModal: React.FC<RoundResultsModalProps> = ({
  song,
  roundScores = [],
  currentRound,
  totalRounds,
  isHost,
  onNextRound,
  volume,
  onVolumeChange,
}) => {
  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [currentVolume, setCurrentVolume] = useState<number>(() => {
    if (typeof volume === 'number' && !isNaN(volume)) return volume;
    try {
      const saved = localStorage.getItem('songspot_volume');
      return saved !== null ? parseFloat(saved) || 0.8 : 0.8;
    } catch {
      return 0.8;
    }
  });

  // Sync when prop volume changes
  useEffect(() => {
    if (typeof volume === 'number' && !isNaN(volume)) {
      setCurrentVolume(volume);
      if (audioEl) {
        audioEl.volume = volume;
      }
    }
  }, [volume, audioEl]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const audio = new Audio(song.previewUrl);
    // Preserves the exact volume set on the potard!
    audio.volume = currentVolume;
    audio.addEventListener('ended', () => setIsPlayingFull(false));
    audio.addEventListener('error', () => {
      // Fallback via proxy if needed
      if (!song.previewUrl.includes('/api/music/proxy-audio')) {
        audio.src = `/api/music/proxy-audio?url=${encodeURIComponent(song.previewUrl)}`;
        audio.load();
        audio.play().then(() => setIsPlayingFull(true)).catch(() => {});
      }
    });
    setAudioEl(audio);

    // Auto-play the full 30s track on reveal
    audio.play().then(() => setIsPlayingFull(true)).catch(() => {});

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [song]);

  const handleSliderVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setCurrentVolume(clamped);
    if (audioEl) {
      audioEl.volume = clamped;
    }
    try {
      localStorage.setItem('songspot_volume', clamped.toString());
    } catch {
      // ignore
    }
    onVolumeChange?.(clamped);
  };

  const toggleFullPlay = () => {
    if (!audioEl) return;
    if (isPlayingFull) {
      audioEl.pause();
      setIsPlayingFull(false);
    } else {
      audioEl.play().then(() => setIsPlayingFull(true)).catch(() => {});
    }
  };

  const volumePercent = Math.round(currentVolume * 100);

  return (
    <div className="w-full bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
      {/* Round banner with Potard de son */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span className="text-xs uppercase tracking-wider font-bold text-amber-400">
            Révélation Manche {currentRound} / {totalRounds}
          </span>
        </div>

        {/* Volume slider potard */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-2xl border border-slate-800 self-end sm:self-auto">
          <button
            onClick={() => handleSliderVolumeChange(currentVolume > 0 ? 0 : 0.8)}
            type="button"
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={currentVolume === 0 ? 'Activer le son' : 'Couper le son'}
          >
            {currentVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : currentVolume < 0.5 ? (
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
            onChange={(e) => handleSliderVolumeChange(Number(e.target.value) / 100)}
            className="w-20 sm:w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            title={`Volume : ${volumePercent}%`}
          />

          <span className="tabular-nums text-xs font-semibold text-slate-300 w-8 text-right">
            {volumePercent}%
          </span>
        </div>
      </div>

      {/* Main Track Presentation */}
      <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
        {/* Vinyl & Artwork Display */}
        <div className="relative group shrink-0">
          {/* Spinning Vinyl Record Effect */}
          <div
            className={`absolute -right-6 top-1 w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-slate-950 border-4 border-slate-800 flex items-center justify-center shadow-xl transition-all ${
              isPlayingFull ? 'animate-spin-slow' : 'opacity-80'
            }`}
          >
            <div className="w-12 h-12 rounded-full border border-slate-700 flex items-center justify-center bg-slate-900">
              <Disc3 className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
          </div>

          {/* Album Cover */}
          <div className="relative z-10 w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-800">
            <img
              src={song.artwork}
              alt={song.title}
              className="w-full h-full object-cover"
            />
            <button
              onClick={toggleFullPlay}
              type="button"
              className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer group"
              title={isPlayingFull ? 'Pause' : 'Écouter'}
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                {isPlayingFull ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </div>
            </button>
          </div>
        </div>

        {/* Track Metadata */}
        <div className="flex-1 text-center md:text-left min-w-0">
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1 truncate">
            {song.title}
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-400 mb-3 truncate">
            {song.artist}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-slate-300">
            {song.album && (
              <span className="bg-slate-800/90 px-3 py-1 rounded-full border border-slate-700">
                💽 {song.album}
              </span>
            )}
            {song.year && (
              <span className="bg-slate-800/90 px-3 py-1 rounded-full border border-slate-700">
                📅 {song.year}
              </span>
            )}
            {song.genre && (
              <span className="bg-slate-800/90 px-3 py-1 rounded-full border border-slate-700">
                🏷️ {song.genre}
              </span>
            )}
            {song.appleMusicUrl && (
              <a
                href={song.appleMusicUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-emerald-300 px-3 py-1 rounded-full border border-slate-700 inline-flex items-center gap-1 transition-colors"
              >
                Écouter complet <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Round Scoreboard (Who found it & points) */}
      {roundScores.length > 0 && (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 mb-6">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-400" /> Résultats de la manche
          </div>

          <div className="space-y-2">
            {roundScores.map((score, idx) => (
              <div
                key={score.playerId || idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{score.playerAvatar}</span>
                  <div>
                    <div className="font-semibold text-sm text-white flex items-center gap-2">
                      {score.playerName}
                      {score.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {score.isCorrect
                        ? `Trouvé à l'extrait ${score.step} (${score.timeSec}s)`
                        : 'Non trouvé'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`tabular-nums font-bold text-sm ${score.points > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    +{score.points} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skip / Next Round Action Button (Snappy skip button) */}
      {onNextRound && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>
              Passage auto dans <strong className="text-emerald-400 tabular-nums text-sm font-semibold">{secondsLeft}s</strong>... ou passez direct :
            </span>
          </div>

          <button
            onClick={onNextRound}
            type="button"
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm sm:text-base rounded-2xl transition-all shadow-xl shadow-emerald-500/30 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            {currentRound >= totalRounds ? 'Voir le podium final 🏆' : 'Passer à la manche suivante ⏩ (Skip)'}
          </button>
        </div>
      )}
    </div>
  );
};
