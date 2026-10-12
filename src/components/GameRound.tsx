import React, { useState, useEffect, useRef } from 'react';
import { RoomState, Song } from '../types/game';
import { AudioWaveform } from './AudioWaveform';
import { SongSearchInput } from './SongSearchInput';
import { SnippetAudioPlayer } from '../services/audioController';

export interface AttemptItem {
  type: 'skipped' | 'wrong' | 'correct';
  title?: string;
  artist?: string;
  artwork?: string;
}
import { soundFX } from '../services/soundEffects';
import {
  Clock,
  Music2,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Volume2,
} from 'lucide-react';

interface GameRoundProps {
  roomState: RoomState;
  currentUserId: string;
  onGuess: (song: Song, queryText: string) => void;
  onSkip: () => void;
  onForceEndRound?: () => void;
}

export const GameRound: React.FC<GameRoundProps> = ({
  roomState,
  currentUserId,
  onGuess,
  onSkip,
  onForceEndRound,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [attempts, setAttempts] = useState<AttemptItem[]>([]);
  const playerRef = useRef<SnippetAudioPlayer | null>(null);

  const me = roomState.players.find(p => p.id === currentUserId);
  const myStep = me?.currentStep || 1;
  const hasGuessed = me?.hasGuessed || false;
  const currentHint = roomState.currentSongHint;
  const steps = roomState.settings.snippetSteps || [0.2, 0.5, 1.5, 4.0, 9.0, 15.0];

  // Volume state (persisted)
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('songspot_volume');
      return saved !== null ? parseFloat(saved) : 0.8;
    } catch {
      return 0.8;
    }
  });

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    try {
      localStorage.setItem('songspot_volume', newVol.toString());
    } catch {
      // ignore
    }
    playerRef.current?.setVolume(newVol);
  };

  // Reset attempts on each new song hint
  useEffect(() => {
    setAttempts([]);
  }, [currentHint?.previewUrl, roomState.currentRound]);

  // When player has guessed successfully and full song is revealed
  useEffect(() => {
    if (hasGuessed && roomState.revealedSong) {
      setAttempts(prev => {
        const last = prev[prev.length - 1];
        if (last && last.type === 'correct') return prev;
        return [
          ...prev,
          {
            type: 'correct',
            title: roomState.revealedSong?.title,
            artist: roomState.revealedSong?.artist,
            artwork: roomState.revealedSong?.artwork,
          },
        ];
      });
    }
  }, [hasGuessed, roomState.revealedSong]);

  // Initialize and load audio player when hint changes
  useEffect(() => {
    const audioCtrl = new SnippetAudioPlayer();
    playerRef.current = audioCtrl;
    audioCtrl.setVolume(volume);

    audioCtrl.setCallbacks(
      (time) => {
        setCurrentTime(time);
      },
      (playing) => {
        setIsPlaying(playing);
      }
    );

    if (currentHint?.previewUrl) {
      const startSec = 0;
      const endSec = steps[0] || 0.2;
      audioCtrl.load(currentHint.previewUrl, startSec, endSec);
      // Auto play on new round start
      audioCtrl.playSnippet(startSec, endSec);
    }

    return () => {
      audioCtrl.destroy();
    };
  }, [currentHint?.previewUrl]);

  // Update snippet bounds and immediately play the newly unlocked portion when step advances
  useEffect(() => {
    if (playerRef.current && currentHint?.previewUrl) {
      if (!hasGuessed) {
        const startSec = myStep > 1 ? steps[myStep - 2] : 0;
        const endSec = steps[Math.min(myStep - 1, steps.length - 1)] || 0.2;
        playerRef.current.setRange(startSec, endSec);

        // Auto-play the newly unlocked snippet so the player immediately hears the extra audio
        if (myStep > 1) {
          playerRef.current.playSnippet(startSec, endSec);
        }
      } else {
        playerRef.current.setRange(0, 30);
      }
    }
  }, [myStep, steps, currentHint?.previewUrl, hasGuessed]);

  // Spacebar shortcut to play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [myStep, steps, hasGuessed]);

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    if (hasGuessed) {
      playerRef.current.togglePlay(0, 30);
      return;
    }
    const startSec = myStep > 1 ? steps[myStep - 2] : 0;
    const endSec = steps[Math.min(myStep - 1, steps.length - 1)] || 0.2;
    playerRef.current.togglePlay(startSec, endSec);
  };

  const handleGuessSubmit = (song: Song, queryText: string) => {
    // Record tentative guess attempt locally
    setAttempts(prev => [
      ...prev,
      {
        type: 'wrong', // will be replaced if server confirms correct
        title: song.title,
        artist: song.artist,
        artwork: song.artwork,
      },
    ]);
    onGuess(song, queryText);
  };

  const handleSkipSnippet = () => {
    soundFX.playClick();
    setAttempts(prev => [
      ...prev,
      {
        type: 'skipped',
      },
    ]);
    onSkip();
  };

  const isTimeCritical = roomState.roundTimeLeft <= 10;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-in fade-in duration-200">
      {/* Top Round Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-md flex items-center justify-between gap-4">
        {/* Left: Round & Theme */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-400 text-sm">
            {roomState.currentRound}/{roomState.totalRounds}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-extrabold text-white">
              {roomState.settings.playlistName}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              {currentHint?.genre && (
                <span className="text-emerald-400 font-semibold">
                  🎵 {currentHint.genre}
                </span>
              )}
              {currentHint?.era && (
                <span>
                  • 📅 {currentHint.era}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Round Countdown Timer */}
        <div className="flex items-center gap-2 tabular-nums">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-bold text-sm sm:text-base ${
              isTimeCritical
                ? 'bg-rose-500/20 border-rose-500/80 text-rose-400 animate-pulse ring-2 ring-rose-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-200'
            }`}
          >
            <Clock className={`w-4 h-4 ${isTimeCritical ? 'text-rose-400 animate-spin' : 'text-slate-400'}`} />
            <span>{roomState.roundTimeLeft}s</span>
          </div>
        </div>
      </div>

      {/* THE HORIZONTAL AUDIO BAR & PASSER BUTTON */}
      <AudioWaveform
        steps={steps}
        currentStep={myStep}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        isRevealed={hasGuessed}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        onSkip={!hasGuessed ? handleSkipSnippet : undefined}
      />

      {/* SEARCH INPUT & DUAL BUTTONS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <SongSearchInput
          onGuess={handleGuessSubmit}
          onSkip={handleSkipSnippet}
          disabled={roomState.status !== 'playing' || hasGuessed}
          hasGuessed={hasGuessed}
          currentStep={myStep}
          totalSteps={steps.length}
          steps={steps}
        />

        {/* Skip button when player found the song */}
        {hasGuessed && onForceEndRound && (
          <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs">
            <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Chanson trouvée ! Pas envie d'attendre la fin du chrono ?</span>
            </span>
            <button
              onClick={onForceEndRound}
              type="button"
              className="w-full sm:w-auto px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg transition-all active:scale-95 cursor-pointer shadow-md whitespace-nowrap"
            >
              Passer à la suite ⏩ (Skip)
            </button>
          </div>
        )}

        {/* Finish button on step 6 */}
        {!hasGuessed && myStep >= steps.length && (
          <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs">
            <span className="text-rose-300 font-semibold flex items-center gap-1.5">
              <span>⚠️ Tous les extraits écoutés (15s). Vous séchez ?</span>
            </span>
            <button
              onClick={handleSkipSnippet}
              type="button"
              className="w-full sm:w-auto px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg transition-all active:scale-95 cursor-pointer shadow-md whitespace-nowrap"
            >
              Finir la manche et révéler 🏳️
            </button>
          </div>
        )}
      </div>

      {/* Live Multiplayer Status Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" /> Progression des joueurs
          </span>
          <span className="text-[11px] text-slate-500">
            {roomState.players.filter(p => p.hasGuessed).length} / {roomState.players.length} ont trouvé
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {roomState.players.map(player => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                player.hasGuessed
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                <span className="text-base">{player.avatar}</span>
                <span className="font-semibold truncate">{player.nickname}</span>
              </div>

              <div>
                {player.hasGuessed ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> +{player.pointsEarnedThisRound}
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs font-medium">
                    Étape {player.currentStep || 1}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
