import React, { useState, useEffect, useRef } from 'react';
import { Song, PlaylistInfo, SoloStats, ArtistInfo } from '../types/game';
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
  ChevronLeft,
  ChevronRight,
  Clock,
  Trophy,
  RotateCcw,
  Sparkles,
  Sliders,
  X,
  Music,
} from 'lucide-react';

export interface AttemptItem {
  type: 'skipped' | 'wrong' | 'correct';
  title?: string;
  artist?: string;
  artwork?: string;
}

interface RoundResult {
  song: Song;
  step: number;
  isCorrect: boolean;
  points: number;
  timeTakenSec?: number;
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
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('rap-fr');
  const [singleArtistTarget, setSingleArtistTarget] = useState<string>('Theodort');
  const [artistInputText, setArtistInputText] = useState<string>('');
  const [artistCardPicture, setArtistCardPicture] = useState<string>('');
  const [artistSuggestions, setArtistSuggestions] = useState<ArtistInfo[]>([]);
  const [isSearchingArtist, setIsSearchingArtist] = useState(false);
  const [showArtistDropdown, setShowArtistDropdown] = useState(false);

  // Round count & time settings (just like multiplayer)
  const [totalRoundsOption, setTotalRoundsOption] = useState<number | 'all'>(10);
  const [roundDurationSec, setRoundDurationSec] = useState<number>(30); // 30, 45, 60 or 0 = unlimited
  const [roundTimeLeft, setRoundTimeLeft] = useState<number>(30);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);

  // Custom link playlist
  const [playlistUrlInput, setPlaylistUrlInput] = useState<string>('');
  const [importingUrl, setImportingUrl] = useState<boolean>(false);
  const [importUrlError, setImportUrlError] = useState<string | null>(null);
  const [customPlaylistName, setCustomPlaylistName] = useState<string | null>(null);

  // Game & Round states
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

  // Session score recap (when all rounds end or discography is exhausted)
  const [sessionResults, setSessionResults] = useState<RoundResult[]>([]);
  const [isSessionFinished, setIsSessionFinished] = useState(false);

  // Draggable theme slider refs & state
  const themesScrollRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollBounds = () => {
    const el = themesScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  };

  useEffect(() => {
    checkScrollBounds();
    window.addEventListener('resize', checkScrollBounds);
    return () => window.removeEventListener('resize', checkScrollBounds);
  }, [playlists]);

  const handleScrollLeft = () => {
    themesScrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' });
    setTimeout(checkScrollBounds, 250);
  };

  const handleScrollRight = () => {
    themesScrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' });
    setTimeout(checkScrollBounds, 250);
  };

  const onSliderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = themesScrollRef.current;
    if (!el) return;
    isMouseDownRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
    hasDraggedRef.current = false;
  };

  const onSliderMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current) return;
    const el = themesScrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(x - startXRef.current) > 5) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
    checkScrollBounds();
  };

  const onSliderMouseUpOrLeave = () => {
    isMouseDownRef.current = false;
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 60);
  };

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

  // Debounced artist search query for real-time artist cards suggestions
  useEffect(() => {
    const q = artistInputText.trim();
    if (q.length < 1) {
      setArtistSuggestions([]);
      setShowArtistDropdown(false);
      return;
    }
    setIsSearchingArtist(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/music/artists?q=${encodeURIComponent(q)}&limit=8`);
        if (res.ok) {
          const list = await res.json();
          setArtistSuggestions(list);
          setShowArtistDropdown(list.length > 0);
        }
      } catch {
        setArtistSuggestions([]);
      } finally {
        setIsSearchingArtist(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [artistInputText]);

  // Load songs on playlist or artist change & auto-scroll theme into view
  useEffect(() => {
    if (selectedPlaylist !== 'custom-link') {
      loadSongs(selectedPlaylist, singleArtistTarget, totalRoundsOption);
    }
    const timer = setTimeout(() => {
      checkScrollBounds();
      const activeEl = themesScrollRef.current?.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [selectedPlaylist, singleArtistTarget, totalRoundsOption]);

  const loadSongs = async (
    playlistId: string,
    artistName?: string,
    roundsCount: number | 'all' = totalRoundsOption
  ) => {
    setLoading(true);
    setAttempts([]);
    setCurrentStep(1);
    setGameStatus('playing');
    setIsSessionFinished(false);
    setSessionResults([]);
    setRoundTimeLeft(roundDurationSec);
    playerRef.current?.stop();

    try {
      const countParam = roundsCount === 'all' ? 0 : roundsCount;
      let url = `/api/music/solo-songs?playlist=${encodeURIComponent(playlistId)}&count=${countParam}`;
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
        } else {
          setSongPool([]);
        }
      }
    } catch (err) {
      console.error('Error loading solo songs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportPlaylistUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    let url = playlistUrlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    setImportingUrl(true);
    setImportUrlError(null);
    try {
      const res = await fetch(`/api/music/import-playlist?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok || data.success === false || data.error) {
        throw new Error(data.message || data.error || 'Erreur lors de l’import');
      }
      const songs: Song[] = data.songs || [];
      if (songs.length === 0) {
        throw new Error('Aucun extrait trouvé dans cette playlist');
      }
      const shuffled = [...songs];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setSongPool(shuffled);
      setCurrentSongIndex(0);
      setAttempts([]);
      setCurrentStep(1);
      setGameStatus('playing');
      setIsSessionFinished(false);
      setSessionResults([]);
      setRoundTimeLeft(roundDurationSec);
      setSelectedPlaylist('custom-link');
      setCustomPlaylistName(data.name || 'Playlist importée');
      setPlaylistUrlInput('');
    } catch (err: any) {
      setImportUrlError(err.message || 'Impossible de charger la playlist');
    } finally {
      setImportingUrl(false);
    }
  };

  const prevStepRef = useRef<number>(1);
  const prevSongIdRef = useRef<string | null>(null);

  // Initialize Audio Player for current song
  useEffect(() => {
    if (!currentSong) return;

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    const player = new SnippetAudioPlayer();
    player.setCallbacks(
      (time: number) => setCurrentTime(time),
      (playing: boolean) => setIsPlaying(playing)
    );

    player.setVolume(volume);
    const stepIdx = Math.min(currentStep - 1, SNIPPET_STEPS.length - 1);
    const startSec = stepIdx === 0 ? 0 : SNIPPET_STEPS[stepIdx - 1];
    const endSec = SNIPPET_STEPS[stepIdx];
    player.load(currentSong.previewUrl, startSec, endSec);
    playerRef.current = player;
    setCurrentTime(startSec);
    setIsPlaying(false);

    if (gameStatus === 'playing') {
      const isNewSong = prevSongIdRef.current !== currentSong.id;
      const isNewStep = prevStepRef.current !== currentStep;

      if (isNewSong || isNewStep) {
        const timer = setTimeout(() => {
          player.playSnippet(startSec, endSec);
        }, 150);

        prevStepRef.current = currentStep;
        prevSongIdRef.current = currentSong.id;
        return () => clearTimeout(timer);
      }
    }

    return () => {
      player.destroy();
    };
  }, [currentSong?.id, currentStep]);

  // Round countdown timer (if roundDurationSec > 0)
  useEffect(() => {
    if (roundDurationSec <= 0 || gameStatus !== 'playing' || isSessionFinished || loading) {
      return;
    }

    const timer = setInterval(() => {
      setRoundTimeLeft(prev => {
        if (prev <= 1) {
          // Time expired for this round: automatically skip step
          handleSkip();
          return roundDurationSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [roundDurationSec, gameStatus, isSessionFinished, loading, currentStep]);

  const handleTogglePlay = () => {
    if (!playerRef.current || !currentSong) return;
    if (isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
    } else {
      if (gameStatus !== 'playing') {
        playerRef.current.playSnippet(0, 30);
      } else {
        const stepIdx = Math.min(currentStep - 1, SNIPPET_STEPS.length - 1);
        const startSec = stepIdx === 0 ? 0 : SNIPPET_STEPS[stepIdx - 1];
        const endSec = SNIPPET_STEPS[stepIdx];
        playerRef.current.playSnippet(startSec, endSec);
      }
    }
  };

  const handlePlaySegment = (startSec: number, endSec: number) => {
    if (!playerRef.current) return;
    playerRef.current.playSnippet(startSec, endSec);
  };

  const handleSeek = (sec: number) => {
    if (!playerRef.current) return;
    const maxSec = gameStatus !== 'playing' ? 30 : (SNIPPET_STEPS[currentStep - 1] || 1.0);
    const targetSec = Math.min(maxSec, Math.max(0, sec));
    if (isPlaying) {
      playerRef.current.seekAndPlay(targetSec, maxSec);
    } else {
      playerRef.current.seek(targetSec);
    }
    setCurrentTime(targetSec);
  };

  const handleGuess = (song: Song, queryText: string) => {
    if (gameStatus !== 'playing' || !currentSong) return;

    const normTargetTitle = currentSong.title.toLowerCase().trim();
    const coreTargetTitle = extractCoreTitle(currentSong.title);
    const normGuessedTitle = song.title.toLowerCase().trim();
    const coreGuessedTitle = extractCoreTitle(song.title);
    const normGuessedArtist = song.artist.toLowerCase().trim();
    const normTargetArtist = currentSong.artist.toLowerCase().trim();

    const isIdMatch = song.id === currentSong.id;
    const isTitleMatch =
      (coreGuessedTitle && coreGuessedTitle === coreTargetTitle) ||
      (normGuessedTitle && normGuessedTitle === normTargetTitle);

    let isRawMatch = false;
    if (queryText && queryText.trim().length >= 2) {
      const cleanRaw = extractCoreTitle(queryText) || queryText.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanRaw && (cleanRaw === coreTargetTitle || cleanRaw === normTargetTitle.replace(/[^a-z0-9]/g, ''))) {
        isRawMatch = true;
      }
    }

    const isMatch = isIdMatch || isTitleMatch || isRawMatch;

    if (isMatch) {
      // Won this round!
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

      const basePointsMap: Record<number, number> = {
        1: 1000, 2: 800, 3: 600, 4: 450, 5: 300, 6: 150
      };
      let earnedPoints = basePointsMap[currentStep] || 150;
      if (roundDurationSec > 0) {
        const timeBonus = Math.round((roundTimeLeft / roundDurationSec) * 200);
        earnedPoints += timeBonus;
      }

      setSessionResults(prev => [
        ...prev,
        {
          song: currentSong,
          step: currentStep,
          isCorrect: true,
          points: earnedPoints,
          timeTakenSec: roundDurationSec > 0 ? (roundDurationSec - roundTimeLeft) : undefined,
        },
      ]);

      setGameStatus('won');
      setStats(prev => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        gamesWon: prev.gamesWon + 1,
        currentStreak: prev.currentStreak + 1,
        bestStreak: Math.max(prev.bestStreak, prev.currentStreak + 1),
        totalScore: (prev.totalScore || 0) + earnedPoints,
        guessDistribution: {
          ...prev.guessDistribution,
          [currentStep]: (prev.guessDistribution[currentStep] || 0) + 1,
        },
      }));

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
        // Lost this round
        setGameStatus('lost');
        setSessionResults(prev => [
          ...prev,
          {
            song: currentSong,
            step: currentStep,
            isCorrect: false,
            points: 0,
            timeTakenSec: roundDurationSec > 0 ? (roundDurationSec - roundTimeLeft) : undefined,
          },
        ]);
        setStats(prev => ({
          ...prev,
          gamesPlayed: prev.gamesPlayed + 1,
          currentStreak: 0,
        }));
        playerRef.current?.playSnippet(0, 30);
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleSkip = () => {
    if (gameStatus !== 'playing' || !currentSong) return;

    playerRef.current?.stop();
    soundFX.playSkip();
    setAttempts(prev => [...prev, { type: 'skipped' }]);

    if (currentStep >= SNIPPET_STEPS.length) {
      setGameStatus('lost');
      setSessionResults(prev => [
        ...prev,
        {
          song: currentSong,
          step: currentStep,
          isCorrect: false,
          points: 0,
          timeTakenSec: roundDurationSec > 0 ? (roundDurationSec - roundTimeLeft) : undefined,
        },
      ]);
      setStats(prev => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        currentStreak: 0,
      }));
      playerRef.current?.playSnippet(0, 30);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const effectiveTotalRounds = totalRoundsOption === 'all'
    ? songPool.length
    : Math.min(totalRoundsOption, songPool.length);

  const isLastRound = currentSongIndex + 1 >= effectiveTotalRounds || currentSongIndex + 1 >= songPool.length;

  const handleNextSong = () => {
    playerRef.current?.stop();
    prevStepRef.current = 1;
    setAttempts([]);
    setCurrentStep(1);

    const nextIndex = currentSongIndex + 1;
    if (nextIndex < effectiveTotalRounds && nextIndex < songPool.length) {
      setCurrentSongIndex(nextIndex);
      setGameStatus('playing');
      setRoundTimeLeft(roundDurationSec);
    } else {
      // Discography exhausted or rounds finished: cut and show score screen!
      setIsSessionFinished(true);
      soundFX.playVictory();
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.5 } });
    }
  };

  const handleSelectArtistCard = (artist: ArtistInfo) => {
    setSingleArtistTarget(artist.name);
    setArtistCardPicture(artist.picture);
    setSelectedPlaylist('single-artist');
    setArtistInputText('');
    setShowArtistDropdown(false);
  };

  const handleRestartSession = () => {
    loadSongs(selectedPlaylist, singleArtistTarget, totalRoundsOption);
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

    const scoreString = gameStatus === 'won' ? `${currentStep}/${SNIPPET_STEPS.length}` : 'X/6';
    return `${title}\nScore: ${scoreString}\n${emojiMap.join('')}`;
  };

  const handleCopyShare = () => {
    const text = generateShareText();
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  // Final session totals
  const totalSessionPoints = sessionResults.reduce((acc, r) => acc + r.points, 0);
  const correctSessionCount = sessionResults.filter(r => r.isCorrect).length;
  const accuracyPercent = sessionResults.length > 0
    ? Math.round((correctSessionCount / sessionResults.length) * 100)
    : 0;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 animate-in fade-in duration-300">
      {/* Mode & Theme Selector Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        {/* Top Info & Stats bar */}
        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 font-bold text-slate-300 min-w-0">
            <span className="text-slate-500 uppercase tracking-wider text-[11px] shrink-0">Thème</span>
            <span className="text-slate-600 shrink-0">·</span>
            <span className="text-emerald-400 font-extrabold text-xs truncate">
              {playlists.find(p => p.id === selectedPlaylist)?.name || (selectedPlaylist === 'custom-link' ? '🔗 Playlist personnalisée' : selectedPlaylist)}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Round info indicator */}
            {songPool.length > 0 && !isSessionFinished && (
              <span className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-slate-300 font-semibold text-xs tabular-nums">
                Manche {currentSongIndex + 1}/{effectiveTotalRounds}
              </span>
            )}

            {/* Live Round Timer badge if active */}
            {roundDurationSec > 0 && gameStatus === 'playing' && !isSessionFinished && (
              <span className={`px-2.5 py-1 rounded-xl border text-xs font-bold tabular-nums flex items-center gap-1 ${
                roundTimeLeft <= 10
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                  : 'bg-slate-950 text-emerald-400 border-slate-800'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                {roundTimeLeft}s
              </span>
            )}

            {/* Streak */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-slate-300 text-xs">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Série : <strong className="text-orange-400 tabular-nums">{stats.currentStreak}</strong></span>
            </div>

            {/* Settings toggle */}
            <button
              onClick={() => setShowSettingsPanel(prev => !prev)}
              type="button"
              className={`flex items-center justify-center w-7 h-7 rounded-xl border transition-colors cursor-pointer ${
                showSettingsPanel
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Paramètres de manche & temps"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {/* Stats modal button */}
            <button
              onClick={() => setShowStatsModal(true)}
              type="button"
              className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 w-7 h-7 rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Statistiques"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Collapsible Game Settings Panel: Répétition des paramètres du mode multi */}
        {showSettingsPanel && (
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                ⚙️ Configuration de la partie Solo
              </span>
              <button
                onClick={() => setShowSettingsPanel(false)}
                type="button"
                className="text-slate-500 hover:text-white text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Number of rounds */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">
                  Nombre de manches
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {[5, 10, 15, 20].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setTotalRoundsOption(n);
                        loadSongs(selectedPlaylist, singleArtistTarget, n);
                      }}
                      className={`py-1.5 rounded-lg font-bold tabular-nums text-center transition-all cursor-pointer border ${
                        totalRoundsOption === n
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setTotalRoundsOption('all');
                      loadSongs(selectedPlaylist, singleArtistTarget, 'all');
                    }}
                    className={`py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer border ${
                      totalRoundsOption === 'all'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                    title="Toute la discographie disponible"
                  >
                    Tout
                  </button>
                </div>
              </div>

              {/* Time per round */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> Temps par manche
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[30, 45, 60].map(sec => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setRoundDurationSec(sec);
                        setRoundTimeLeft(sec);
                      }}
                      className={`py-1.5 rounded-lg font-bold tabular-nums text-center transition-all cursor-pointer border ${
                        roundDurationSec === sec
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setRoundDurationSec(0);
                      setRoundTimeLeft(0);
                    }}
                    className={`py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer border ${
                      roundDurationSec === 0
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    ∞
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Draggable and scrollable full-width themes slider */}
        <div className="relative flex items-center group">
          {canScrollLeft && (
            <button
              onClick={handleScrollLeft}
              type="button"
              className="absolute left-0 z-10 w-7 h-7 -ml-2 rounded-full bg-slate-800/95 hover:bg-slate-700 text-white shadow-lg border border-slate-700 flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm"
              title="Faire glisser vers la gauche"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div
            ref={themesScrollRef}
            onMouseDown={onSliderMouseDown}
            onMouseMove={onSliderMouseMove}
            onMouseUp={onSliderMouseUpOrLeave}
            onMouseLeave={onSliderMouseUpOrLeave}
            onScroll={checkScrollBounds}
            onWheel={(e) => {
              if (e.deltaY !== 0 && themesScrollRef.current) {
                themesScrollRef.current.scrollLeft += e.deltaY;
                checkScrollBounds();
              }
            }}
            className="w-full flex items-center gap-2 overflow-x-auto scrollbar-none py-1 cursor-grab active:cursor-grabbing select-none scroll-smooth"
          >
            {playlists.map(pl => {
              const isSelected = selectedPlaylist === pl.id;
              return (
                <button
                  key={pl.id}
                  onClick={() => {
                    if (hasDraggedRef.current) return;
                    setSelectedPlaylist(pl.id);
                  }}
                  type="button"
                  data-selected={isSelected}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold ring-2 ring-emerald-400/40'
                      : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                  }`}
                >
                  <span>{pl.icon}</span>
                  <span className="ml-1.5">{pl.name.replace(/^[^\w\s]+\s*/, '')}</span>
                </button>
              );
            })}

            {/* Custom Playlist Link Button */}
            <button
              onClick={() => {
                if (hasDraggedRef.current) return;
                setSelectedPlaylist('custom-link');
              }}
              type="button"
              data-selected={selectedPlaylist === 'custom-link'}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                selectedPlaylist === 'custom-link'
                  ? 'bg-indigo-600 text-white shadow-md font-extrabold ring-2 ring-indigo-400/40'
                  : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800'
              }`}
            >
              <span>🔗</span>
              <span className="ml-1.5">Lien</span>
            </button>
          </div>

          {canScrollRight && (
            <button
              onClick={handleScrollRight}
              type="button"
              className="absolute right-0 z-10 w-7 h-7 -mr-2 rounded-full bg-slate-800/95 hover:bg-slate-700 text-white shadow-lg border border-slate-700 flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm"
              title="Faire glisser vers la droite"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Custom playlist URL input box when custom-link is selected */}
        {selectedPlaylist === 'custom-link' && (
          <div className="pt-2.5 border-t border-slate-800 space-y-2">
            <form onSubmit={handleImportPlaylistUrl} className="flex gap-1.5">
              <input
                type="text"
                value={playlistUrlInput}
                onChange={e => setPlaylistUrlInput(e.target.value)}
                placeholder="Coller un lien Spotify ou Deezer (ex: open.spotify.com/playlist/...)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
              />
              <button
                type="submit"
                disabled={importingUrl}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
              >
                {importingUrl ? 'Chargement...' : 'Charger'}
              </button>
            </form>
            {importUrlError && (
              <p className="text-[11px] text-rose-400 font-medium">{importUrlError}</p>
            )}
            {customPlaylistName && (
              <p className="text-xs text-indigo-300 font-semibold truncate">
                🎵 {customPlaylistName} ({songPool.length} titres)
              </p>
            )}
          </div>
        )}

        {/* Dedicated controls for 100% Un Seul Artiste with Real-Time Suggestion Cards */}
        {selectedPlaylist === 'single-artist' && (
          <div className="pt-2.5 border-t border-slate-800 space-y-2 relative">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Custom artist input with autocompletion */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={artistInputText}
                  onChange={(e) => setArtistInputText(e.target.value)}
                  onFocus={() => {
                    if (artistSuggestions.length > 0) setShowArtistDropdown(true);
                  }}
                  placeholder="Tapez le nom d'un artiste (ex: Theodort, Jul...)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />

                {/* Autocomplete Suggestions Cards Dropdown */}
                {showArtistDropdown && artistSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-1.5 z-50 max-h-64 overflow-y-auto space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Suggestions d'artistes
                    </div>
                    {artistSuggestions.map(art => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => handleSelectArtistCard(art)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-colors text-left cursor-pointer group"
                      >
                        {/* Square Artist Photo Card */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 border border-slate-700 shrink-0 shadow-sm">
                          {art.picture ? (
                            <img
                              src={art.picture}
                              alt={art.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                              {art.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                            {art.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {art.nb_fan && art.nb_fan > 0
                              ? art.nb_fan > 1000000
                                ? `${(art.nb_fan / 1000000).toFixed(1)}M fans`
                                : `${Math.round(art.nb_fan / 1000)}k fans`
                              : 'Artiste vérifié'}
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-amber-400/80 bg-amber-400/10 px-2 py-1 rounded-md shrink-0">
                          Choisir
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Active artist badge with photo */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">En écoute :</span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold px-2 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                  {artistCardPicture ? (
                    <img
                      src={artistCardPicture}
                      alt={singleArtistTarget}
                      className="w-4 h-4 rounded-md object-cover border border-amber-400/40"
                    />
                  ) : (
                    <Crown className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{singleArtistTarget}</span>
                  <span className="text-[10px] text-amber-200/70 font-normal">
                    ({songPool.length} titres)
                  </span>
                </span>
              </div>
            </div>

            {/* Horizontal scrollable quick artist chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Populaires :
              </span>
              {POPULAR_ARTISTS.map(art => {
                const isActive = singleArtistTarget.toLowerCase() === art.toLowerCase();
                return (
                  <button
                    key={art}
                    onClick={() => {
                      setSingleArtistTarget(art);
                      setArtistCardPicture('');
                      setSelectedPlaylist('single-artist');
                    }}
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
          <p className="font-semibold text-sm">Chargement de la discographie...</p>
        </div>
      ) : isSessionFinished ? (
        /* FINAL SCORE SCREEN: When discography runs out or configured rounds finish! */
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300 space-y-6">
          {/* Header Trophy Banner */}
          <div className="text-center space-y-2 pb-5 border-b border-slate-800">
            <div className="w-16 h-16 rounded-3xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <Trophy className="w-8 h-8 stroke-[2.2]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {selectedPlaylist === 'single-artist'
                ? `Discographie terminée !`
                : `Partie Terminée !`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {selectedPlaylist === 'single-artist'
                ? `Vous avez écouté tous les titres disponibles de ${singleArtistTarget} !`
                : `Toutes les manches prévues ont été jouées.`}
            </p>
          </div>

          {/* Score Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Score Total
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">
                {totalSessionPoints} pts
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Trouvés
              </span>
              <span className="text-xl sm:text-2xl font-black text-white tabular-nums">
                {correctSessionCount}/{sessionResults.length}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Précision
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                {accuracyPercent}%
              </span>
            </div>
          </div>

          {/* Songs Played Summary List */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Récapitulatif des morceaux ({sessionResults.length})
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {sessionResults.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-xl border ${
                    item.isCorrect
                      ? 'bg-emerald-950/30 border-emerald-500/30'
                      : 'bg-rose-950/20 border-rose-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.song.artwork}
                      alt={item.song.title}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-700"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {item.song.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.song.artist}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {item.isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        Étape {item.step} (+{item.points} pts)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
                        <X className="w-3.5 h-3.5" />
                        Non trouvé
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={handleRestartSession}
              type="button"
              className="w-full sm:flex-1 py-3 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rejouer avec cet artiste</span>
            </button>

            <button
              onClick={() => {
                setIsSessionFinished(false);
                setSelectedPlaylist('rap-fr');
              }}
              type="button"
              className="w-full sm:w-auto py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              Changer de mode
            </button>
          </div>
        </div>
      ) : currentSong ? (
        <>
          {/* THE AUDIO PLAYER WITH DRAGGABLE SLIDING SCRUBBER */}
          <AudioWaveform
            steps={SNIPPET_STEPS}
            currentStep={currentStep}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onPlaySegment={handlePlaySegment}
            onSeek={handleSeek}
            isRevealed={gameStatus !== 'playing'}
            volume={volume}
            onVolumeChange={handleVolumeChange}
          />

          {/* IN PLAY: SEARCH & SUBMIT */}
          {gameStatus === 'playing' ? (
            <div className="relative z-30 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
              <SongSearchInput
                onGuess={handleGuess}
                onSkip={handleSkip}
                currentStep={currentStep}
                totalSteps={SNIPPET_STEPS.length}
                steps={SNIPPET_STEPS}
                imposedArtist={selectedPlaylist === 'single-artist' ? singleArtistTarget : undefined}
              />
            </div>
          ) : (
            /* ROUND FINISHED: REVEAL CARD */
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

                {/* Next Song or Final Results Button */}
                <button
                  onClick={handleNextSong}
                  type="button"
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {isLastRound ? (
                    <>
                      <span>Voir le score final</span>
                      <Trophy className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Chanson suivante</span>
                      <span>⏩</span>
                    </>
                  )}
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
