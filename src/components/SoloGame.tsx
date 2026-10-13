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

const SNIPPET_STEPS = [1.0, 2.0, 4.0, 7.0, 11.0, 16.0];

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

export function extractCoreTitle(title: string): string {
  if (!title) return '';
  let t = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  t = t.replace(/\([^)]*\)/g, ' ');
  t = t.replace(/\[[^\]]*\]/g, ' ');
  t = t.replace(/\{[^}]*\}/g, ' ');
  t = t.replace(
    /\s*-\s*(feat|ft|featuring|with|remix|radio edit|edit|club mix|original mix|extended|live|acoustique|acoustic|version|bonus|instrumental|sped up|slowed|remastered|deluxe|double shot).*/i,
    ' '
  );
  t = t.replace(/\b(feat|ft|featuring|with)\b.*$/i, ' ');
  const dashIndex = t.indexOf('-');
  if (dashIndex >= 2) {
    const beforeDash = t.slice(0, dashIndex).trim();
    if (beforeDash.length >= 2) {
      t = beforeDash;
    }
  }
  return t.replace(/[^a-z0-9]/g, '').trim();
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

  const prevStepRef = useRef<number>(1);
  const prevSongIdRef = useRef<string | null>(null);

  // Initialize Audio Player for current song
  useEffect(() => {
    if (!currentSong?.previewUrl) return;

    if (prevSongIdRef.current === currentSong.id) return;
    prevSongIdRef.current = currentSong.id;
    prevStepRef.current = 1;

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

    const endSec = SNIPPET_STEPS[0];
    audioCtrl.load(currentSong.previewUrl, 0, endSec);

    // Auto-play the first snippet
    audioCtrl.playSnippet(0, endSec);

    return () => {
      audioCtrl.destroy();
    };
  }, [currentSong?.id, currentSong?.previewUrl]);

  // Update snippet bounds and auto-play ONLY when step advances
  useEffect(() => {
    if (!playerRef.current || !currentSong) return;

    if (gameStatus === 'playing') {
      const stepIdx = Math.min(currentStep - 1, SNIPPET_STEPS.length - 1);
      const startSec = stepIdx === 0 ? 0 : SNIPPET_STEPS[stepIdx - 1];
      const endSec = SNIPPET_STEPS[stepIdx];
      playerRef.current.setRange(startSec, endSec);

      // Auto-play ONLY if currentStep actually increased, playing ONLY this step's slice
      if (currentStep > prevStepRef.current && currentStep > 1) {
        playerRef.current.playSnippet(startSec, endSec);
      }
      prevStepRef.current = currentStep;
    } else {
      playerRef.current.setRange(0, 30);
    }
  }, [currentStep, gameStatus]);

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
    const stepIdx = Math.min(currentStep - 1, SNIPPET_STEPS.length - 1);
    const startSec = stepIdx === 0 ? 0 : SNIPPET_STEPS[stepIdx - 1];
    const endSec = SNIPPET_STEPS[stepIdx];
    // Toggles playback strictly for the current step's excerpt
    playerRef.current.togglePlay(startSec, endSec);
  };

  const handlePlaySegment = (startSec: number, endSec: number) => {
    if (!playerRef.current) return;
    playerRef.current.playSnippet(startSec, endSec);
  };

  const handleSeek = (targetSec: number) => {
    if (!playerRef.current) return;
    const endSec =
      gameStatus === 'playing'
        ? SNIPPET_STEPS[Math.min(currentStep - 1, SNIPPET_STEPS.length - 1)]
        : 30;
    const safeTarget = Math.max(0, Math.min(targetSec, endSec - 0.1));
    playerRef.current.playSnippet(safeTarget, endSec);
  };

  const handleReplayAll = () => {
    if (!playerRef.current) return;
    const endSec =
      gameStatus === 'playing'
        ? SNIPPET_STEPS[Math.min(currentStep - 1, SNIPPET_STEPS.length - 1)]
        : 30;
    playerRef.current.playSnippet(0, endSec);
  };

  const handleGuess = (song: Song, queryText: string) => {
    if (gameStatus !== 'playing' || !currentSong) return;

    // 1. Direct ID match (unless raw guess)
    const isIdMatch = Boolean(
      song.id &&
      currentSong.id &&
      song.id !== 'raw_guess' &&
      String(song.id) === String(currentSong.id)
    );

    const targetCore = extractCoreTitle(currentSong.title);

    // 2. Explicit song title selected by the user in suggestion dropdown
    let isTitleMatch = false;
    if (song.title && song.id !== 'raw_guess') {
      const guessCore = extractCoreTitle(song.title);
      if (guessCore && guessCore === targetCore) {
        isTitleMatch = true;
      } else if (
        guessCore &&
        targetCore &&
        guessCore.length >= 4 &&
        targetCore.length >= 4 &&
        (guessCore.startsWith(targetCore) || targetCore.startsWith(guessCore))
      ) {
        isTitleMatch = true;
      }
    }

    // 3. Raw query match
    let isRawMatch = false;
    const rawCore = extractCoreTitle(queryText || song.title);
    if (rawCore && rawCore === targetCore) {
      isRawMatch = true;
    } else {
      // Strip artist tokens from raw query
      const artistsInTarget = (currentSong.artist || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[,&/]|feat\.?|ft\.?|featuring|with/)
        .map(a => a.replace(/[^a-z0-9]/g, '').trim())
        .filter(a => a.length >= 2);

      let stripped = rawCore;
      for (const art of artistsInTarget) {
        if (art.length >= 2 && stripped.includes(art)) {
          stripped = stripped.replace(art, '');
        }
      }
      if (stripped && stripped === targetCore) {
        isRawMatch = true;
      } else {
        let textStripped = (queryText || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        for (const art of artistsInTarget) {
          if (art.length >= 2 && textStripped.includes(art)) {
            textStripped = textStripped.replace(art, ' ');
          }
        }
        const textStrippedCore = extractCoreTitle(textStripped);
        if (textStrippedCore && textStrippedCore === targetCore) {
          isRawMatch = true;
        }
      }
    }

    const isMatch = isIdMatch || isTitleMatch || isRawMatch;

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

    // Explicitly stop previous snippet before unlocking next step so playback resets to 0s
    playerRef.current?.stop();

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
    prevStepRef.current = 1;
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
    <div className="w-full max-w-xl mx-auto space-y-4 animate-in fade-in duration-300">
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

        {/* Sub-bar: Playlist tags for Mix mode OR streamlined Artist selector for 100% Artiste */}
        {selectedPlaylist !== 'single-artist' ? (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 border-t border-slate-800 scrollbar-none">
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
        ) : (
          <div className="pt-2.5 border-t border-slate-800 space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Custom artist input */}
              <form onSubmit={handleCustomArtistSubmit} className="flex items-center gap-1.5 flex-1 max-w-sm">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={artistInputText}
                    onChange={(e) => setArtistInputText(e.target.value)}
                    placeholder="Rechercher un artiste (ex: Theodort)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                >
                  Choisir
                </button>
              </form>

              {/* Active artist badge */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400">En écoute :</span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Crown className="w-3 h-3 fill-current" />
                  {singleArtistTarget}
                </span>
              </div>
            </div>

            {/* Horizontal scrollable quick artist chips (single clean row) */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Populaires :
              </span>
              {POPULAR_ARTISTS.map(art => {
                const isActive = singleArtistTarget.toLowerCase() === art.toLowerCase();
                return (
                  <button
                    key={art}
                    onClick={() => handleSelectArtist(art)}
                    type="button"
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {art}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
            onPlaySegment={handlePlaySegment}
            onSeek={handleSeek}
            onReplayAll={handleReplayAll}
            isRevealed={gameStatus !== 'playing'}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            onSkip={handleSkip}
          />

          {/* IN PLAY: SEARCH & SUBMIT */}
          {gameStatus === 'playing' ? (
            <div className="relative z-30 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
              <SongSearchInput
                onGuess={handleGuess}
                currentStep={currentStep}
                totalSteps={SNIPPET_STEPS.length}
                steps={SNIPPET_STEPS}
                imposedArtist={selectedPlaylist === 'single-artist' ? singleArtistTarget : undefined}
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
