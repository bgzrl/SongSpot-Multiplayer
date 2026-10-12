import React, { useState, useEffect, useRef } from 'react';
import { Song, PlaylistInfo, SoloStats } from '../types/game';
import { AudioWaveform } from './AudioWaveform';
import { SongSearchInput } from './SongSearchInput';
import { StatsModal } from './StatsModal';
import { SnippetAudioPlayer } from '../services/audioController';
import { soundFX } from '../services/soundEffects';
import confetti from 'canvas-confetti';
import {
  Flame,
  CheckCircle2,
  XCircle,
  Crown,
  Share2,
  Check,
  BarChart3,
  Search,
} from 'lucide-react';

export interface AttemptItem {
  type: 'skipped' | 'wrong' | 'correct';
  title?: string;
  artist?: string;
  artwork?: string;
}

interface SoloGameProps {
  playlists: PlaylistInfo[];
}

const SNIPPET_STEPS = [0.2, 0.5, 1.5, 4.0, 9.0, 15.0];

const POPULAR_ARTISTS = [
  'Theodort',
  'Jul',
  'Gazo',
  'Ninho',
  'SDM',
  'Tiakola',
  'Werenoi',
  'PLK',
  'Billie Eilish',
  'Sabrina Carpenter',
  'The Weeknd',
  'Dua Lipa',
  'Kendrick Lamar',
  'Orelsan',
  'Angèle',
  'Daft Punk',
  'Queen',
];

const INITIAL_STATS: SoloStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  totalScore: 0,
};

function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/feat\..*$/i, '')
    .replace(/ft\..*$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export const SoloGame: React.FC<SoloGameProps> = ({ playlists }) => {
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('trending-gen-z');
  const [singleArtistTarget, setSingleArtistTarget] = useState<string>('Theodort');
  const [artistInputText, setArtistInputText] = useState<string>('');
  const [songPool, setSongPool] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [attempts, setAttempts] = useState<AttemptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Volume state (persisted)
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('songspot_volume');
      return saved !== null ? parseFloat(saved) : 0.8;
    } catch {
      return 0.8;
    }
  });

  const [stats, setStats] = useState<SoloStats>(() => {
    try {
      const saved = localStorage.getItem('songspot_solo_stats');
      return saved ? JSON.parse(saved) : INITIAL_STATS;
    } catch {
      return INITIAL_STATS;
    }
  });

  const playerRef = useRef<SnippetAudioPlayer | null>(null);
  const currentSong = songPool[currentSongIndex];

  // Save stats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('songspot_solo_stats', JSON.stringify(stats));
    } catch {
      // ignore
    }
  }, [stats]);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    try {
      localStorage.setItem('songspot_volume', newVol.toString());
    } catch {
      // ignore
    }
    playerRef.current?.setVolume(newVol);
  };

  // Load songs on playlist or artist change
  useEffect(() => {
    loadSongs(selectedPlaylist, singleArtistTarget);
  }, [selectedPlaylist, singleArtistTarget]);

  const loadSongs = async (playlistId: string, artistName?: string) => {
    setLoading(true);
    setAttempts([]);
    setCurrentStep(1);
    setGameStatus('playing');
    playerRef.current?.stop();

    try {
      let url = `/api/music/solo-songs?playlist=${encodeURIComponent(playlistId)}&count=12`;
      if (playlistId === 'single-artist' && artistName) {
        url += `&artist=${encodeURIComponent(artistName)}&custom=${encodeURIComponent(artistName)}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const songList: Song[] = Array.isArray(data) ? data : data.songs || [];
        if (songList.length > 0) {
          setSongPool(songList);
          setCurrentSongIndex(0);
        }
      }
    } catch (err) {
      console.error('Error loading solo songs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Audio Player for current song
  useEffect(() => {
    if (!currentSong?.previewUrl) return;

    if (playerRef.current) {
      playerRef.current.destroy();
    }

    const audioCtrl = new SnippetAudioPlayer();
    audioCtrl.setCallbacks(
      (time: number) => setCurrentTime(time),
      (playing: boolean) => setIsPlaying(playing)
    );

    audioCtrl.setVolume(volume);
    playerRef.current = audioCtrl;

    const startSec = 0;
    const endSec = SNIPPET_STEPS[0];
    audioCtrl.load(currentSong.previewUrl, startSec, endSec);

    // Auto-play the first snippet
    audioCtrl.playSnippet(startSec, endSec);

    return () => {
      audioCtrl.destroy();
    };
  }, [currentSong?.previewUrl]);

  // Update snippet bounds when step changes
  useEffect(() => {
    if (!playerRef.current || !currentSong) return;

    if (gameStatus === 'playing') {
      const startSec = currentStep > 1 ? SNIPPET_STEPS[currentStep - 2] : 0;
      const endSec = SNIPPET_STEPS[Math.min(currentStep - 1, SNIPPET_STEPS.length - 1)];
      playerRef.current.setRange(startSec, endSec);

      // Auto-play the newly unlocked segment so user hears the continuation without rewinding
      if (currentStep > 1) {
        playerRef.current.playSnippet(startSec, endSec);
      }
    } else {
      playerRef.current.setRange(0, 30);
    }
  }, [currentStep, currentSong, gameStatus]);

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
  }, [currentStep, gameStatus]);

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    if (gameStatus !== 'playing') {
      playerRef.current.togglePlay(0, 30);
      return;
    }
    const startSec = currentStep > 1 ? SNIPPET_STEPS[currentStep - 2] : 0;
    const endSec = SNIPPET_STEPS[Math.min(currentStep - 1, SNIPPET_STEPS.length - 1)];
    playerRef.current.togglePlay(startSec, endSec);
  };

  const handleGuess = (song: Song, queryText: string) => {
    if (gameStatus !== 'playing' || !currentSong) return;

    // Robust case-insensitive and diacritic matching
    const normTargetTitle = normalizeText(currentSong.title);
    const normTargetArtist = normalizeText(currentSong.artist);
    const normTargetFull = `${normTargetTitle} ${normTargetArtist}`;

    const normGuessedTitle = normalizeText(song.title);
    const normGuessedArtist = normalizeText(song.artist);
    const normGuessedFull = normalizeText(queryText || `${song.title} ${song.artist}`);

    const isMatch =
      song.id === currentSong.id ||
      (normGuessedTitle && normGuessedTitle === normTargetTitle) ||
      (normGuessedFull.includes(normTargetTitle) && normGuessedFull.includes(normTargetArtist)) ||
      (normTargetFull.includes(normGuessedTitle) && normGuessedTitle.length >= 3) ||
      (normGuessedFull === normTargetFull);

    if (isMatch) {
      // Won!
      soundFX.playCorrect();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#f59e0b'],
      });

      setAttempts(prev => [
        ...prev,
        {
          type: 'correct',
          title: currentSong.title,
          artist: currentSong.artist,
          artwork: currentSong.artwork,
        },
      ]);

      setGameStatus('won');
      setStats(prev => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        gamesWon: prev.gamesWon + 1,
        currentStreak: prev.currentStreak + 1,
        bestStreak: Math.max(prev.bestStreak, prev.currentStreak + 1),
        guessDistribution: {
          ...prev.guessDistribution,
          [currentStep]: (prev.guessDistribution[currentStep] || 0) + 1,
        },
      }));

      // Play full audio
      playerRef.current?.playSnippet(0, 30);
    } else {
      // Wrong guess
      soundFX.playWrong();
      setAttempts(prev => [
        ...prev,
        {
          type: 'wrong',
          title: song.title,
          artist: song.artist,
        },
      ]);

      if (currentStep >= SNIPPET_STEPS.length) {
        // Lost!
        setGameStatus('lost');
        setStats(prev => ({
          ...prev,
          gamesPlayed: prev.gamesPlayed + 1,
          currentStreak: 0,
        }));
        playerRef.current?.playSnippet(0, 30);
      } else {
        // Advance to next step
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleSkip = () => {
    if (gameStatus !== 'playing') return;

    soundFX.playSkip();
    setAttempts(prev => [...prev, { type: 'skipped' }]);

    if (currentStep >= SNIPPET_STEPS.length) {
      // Forfeited on last step
      setGameStatus('lost');
      setStats(prev => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        currentStreak: 0,
      }));
      playerRef.current?.playSnippet(0, 30);
    } else {
      // Unlock next snippet
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleNextSong = () => {
    playerRef.current?.stop();
    setAttempts([]);
    setCurrentStep(1);
    setGameStatus('playing');

    if (currentSongIndex + 1 < songPool.length) {
      setCurrentSongIndex(prev => prev + 1);
    } else {
      loadSongs(selectedPlaylist, singleArtistTarget);
    }
  };

  const handleSelectArtist = (artistName: string) => {
    setSingleArtistTarget(artistName);
    setSelectedPlaylist('single-artist');
  };

  const handleCustomArtistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistInputText.trim()) return;
    const clean = artistInputText.trim();
    setSingleArtistTarget(clean);
    setSelectedPlaylist('single-artist');
    setArtistInputText('');
  };

  const generateShareText = () => {
    const title = selectedPlaylist === 'single-artist'
      ? `👑 SongSpot Solo (${singleArtistTarget})`
      : `🎵 SongSpot Solo`;

    const emojiMap: string[] = attempts.map(a => {
      if (a.type === 'correct') return '🟩';
      if (a.type === 'wrong') return '🟥';
      return '⬛';
    });

    while (emojiMap.length < SNIPPET_STEPS.length) {
      emojiMap.push('⬜');
    }

    const scoreString = gameStatus === 'won' ? `${currentStep}/${SNIPPET_STEPS.length}` : 'X/6';
    return `${title}\nScore: ${scoreString}\n${emojiMap.join('')}`;
  };

  const handleCopyShare = () => {
    const text = generateShareText();
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-in fade-in duration-300">
      {/* Mode Header: Mix Tendances vs 100% Artiste Unique */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Main Mode Toggle Buttons */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedPlaylist('trending-gen-z')}
              type="button"
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                selectedPlaylist !== 'single-artist'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Top Tendances</span>
            </button>

            <button
              onClick={() => setSelectedPlaylist('single-artist')}
              type="button"
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                selectedPlaylist === 'single-artist'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Crown className="w-4 h-4 fill-current" />
              <span>100% Artiste</span>
            </button>
          </div>

          {/* Stats & Streak counter */}
          <div className="flex items-center justify-end gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Série : <strong className="text-orange-400 tabular-nums">{stats.currentStreak}</strong></span>
            </div>

            <button
              onClick={() => setShowStatsModal(true)}
              type="button"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Voir les statistiques"
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline font-medium">Stats</span>
            </button>
          </div>
        </div>

        {/* Sub-playlist tags if in Mix mode */}
        {selectedPlaylist !== 'single-artist' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-800/80 scrollbar-none">
            {playlists
              .filter(p => p.id !== 'single-artist')
              .map(pl => (
                <button
                  key={pl.id}
                  onClick={() => setSelectedPlaylist(pl.id)}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedPlaylist === pl.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {pl.icon} {pl.name}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Prominent 100% Single Artist Selector Box */}
      {selectedPlaylist === 'single-artist' && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md">
                <Crown className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Mode 100% Artiste Unique</span>
                  <span className="text-xs bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-400/30 font-bold">
                    {singleArtistTarget}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Devinez exclusivement les sons de cet artiste (zéro intrus)
                </div>
              </div>
            </div>

            {/* Custom Artist Search Input */}
            <form onSubmit={handleCustomArtistSubmit} className="flex items-center gap-1.5">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="text"
                  value={artistInputText}
                  onChange={(e) => setArtistInputText(e.target.value)}
                  placeholder="Tapez un artiste (ex: Theodort)..."
                  className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-full sm:w-56"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
              >
                Changer
              </button>
            </form>
          </div>

          {/* Quick preset artist buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 mr-1">
              Artistes populaires :
            </span>
            {POPULAR_ARTISTS.map(art => (
              <button
                key={art}
                onClick={() => handleSelectArtist(art)}
                type="button"
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  singleArtistTarget.toLowerCase() === art.toLowerCase()
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {art}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-slate-400 bg-slate-900/60 border border-slate-800 rounded-3xl">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="font-semibold text-sm">Chargement des morceaux...</p>
        </div>
      ) : currentSong ? (
        <>
          {/* THE AUDIO PLAYER WITH PROGRESS BAR, PLAY BUTTON & PASSER BUTTON AT BOTTOM-RIGHT */}
          <AudioWaveform
            steps={SNIPPET_STEPS}
            currentStep={currentStep}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            isRevealed={gameStatus !== 'playing'}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            onSkip={handleSkip}
          />

          {/* IN PLAY: SEARCH & SUBMIT */}
          {gameStatus === 'playing' ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
              <SongSearchInput
                onGuess={handleGuess}
                currentStep={currentStep}
                totalSteps={SNIPPET_STEPS.length}
                steps={SNIPPET_STEPS}
              />
            </div>
          ) : (
            /* GAME FINISHED: REVEAL CARD */
            <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300">
              {/* Header Status & Next Song Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
                <div>
                  {gameStatus === 'won' ? (
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </span>
                      <div>
                        <div className="text-emerald-400 font-black text-lg tracking-tight">
                          Gagné en {currentStep} essai{currentStep > 1 ? 's' : ''} !
                        </div>
                        <div className="text-xs text-slate-400">
                          Extrait de {SNIPPET_STEPS[currentStep - 1]}s
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40">
                        <XCircle className="w-5 h-5" />
                      </span>
                      <div>
                        <div className="text-rose-400 font-black text-lg tracking-tight">
                          Perdu ! Vous ferez mieux la prochaine fois
                        </div>
                        <div className="text-xs text-slate-400">
                          Voici le morceau qui était à deviner :
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Next Song Button */}
                <button
                  onClick={handleNextSong}
                  type="button"
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Chanson suivante</span>
                  <span>⏩</span>
                </button>
              </div>

              {/* Revealed Album Card */}
              <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 mb-6">
                <div className="relative group shrink-0">
                  <img
                    src={currentSong.artwork}
                    alt={currentSong.title}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover shadow-2xl border-2 border-slate-700 group-hover:scale-102 transition-transform"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-black/20 pointer-events-none" />
                </div>

                <div className="flex-1 text-center sm:text-left min-w-0">
                  <h3 className="text-xl sm:text-2xl font-black text-white mb-1 truncate">
                    {currentSong.title}
                  </h3>
                  <div className="text-base sm:text-lg font-bold text-emerald-400 mb-2 truncate">
                    {currentSong.artist}
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-400">
                    {currentSong.album && (
                      <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        💽 {currentSong.album}
                      </span>
                    )}
                    {currentSong.genre && (
                      <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        🏷️ {currentSong.genre}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Emoji Share Block */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm tracking-wider">
                    {attempts.map((a, i) => (
                      <span key={i}>
                        {a.type === 'correct' ? '🟩' : a.type === 'wrong' ? '🟥' : '⬛'}
                      </span>
                    ))}
                    {Array.from({ length: Math.max(0, SNIPPET_STEPS.length - attempts.length) }).map(
                      (_, i) => (
                        <span key={i}>⬜</span>
                      )
                    )}
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums font-semibold">
                    {gameStatus === 'won' ? `${currentStep}/6` : 'X/6'}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopyShare}
                    type="button"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  >
                    {copiedShare ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copié !</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Partager mon score</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowStatsModal(true)}
                    type="button"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    title="Voir les statistiques"
                  >
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Stats Modal */}
      <StatsModal
        stats={stats}
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />
    </div>
  );
};
