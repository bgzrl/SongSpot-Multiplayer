import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, Send, Music, Check, FastForward } from 'lucide-react';
import { Song } from '../types/game';

interface SongSearchInputProps {
  onGuess: (song: Song, queryText: string) => void;
  onSkip?: () => void;
  disabled?: boolean;
  hasGuessed?: boolean;
  currentStep?: number;
  totalSteps?: number;
  steps?: number[];
  imposedArtist?: string;
}

// In-memory client cache for instant responses as the user types or backspaces
const clientSearchCache = new Map<string, Song[]>();

export const SongSearchInput: React.FC<SongSearchInputProps> = ({
  onGuess,
  onSkip,
  disabled = false,
  hasGuessed = false,
  currentStep,
  totalSteps,
  steps,
  imposedArtist,
}) => {
  const [query, setQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchSeqRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const minChars = imposedArtist ? 1 : 2;

  // Debounced search with client-side instant cache and race-condition prevention
  useEffect(() => {
    if (selectedSong) return;

    const trimmed = query.trim();
    const clean = trimmed.toLowerCase();

    if (!trimmed || trimmed.length < minChars) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setResults([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }

    const effectiveQuery = imposedArtist ? `${imposedArtist} ${trimmed}` : trimmed;
    const cacheKey = (imposedArtist ? `${imposedArtist.toLowerCase()}::` : '') + clean;

    // 1. Instant Cache Hit (0ms delay)
    if (clientSearchCache.has(cacheKey)) {
      const cached = clientSearchCache.get(cacheKey)!;
      setResults(cached);
      setIsOpen(cached.length > 0);
      setSelectedIndex(0);
      setLoading(false);
      return;
    }

    // 2. Instant Prefix Filtering from existing cached parent queries
    let prefixFound = false;
    for (let len = clean.length - 1; len >= minChars; len--) {
      const parentKey = (imposedArtist ? `${imposedArtist.toLowerCase()}::` : '') + clean.slice(0, len);
      const parentResults = clientSearchCache.get(parentKey);
      if (parentResults && parentResults.length > 0) {
        const filtered = parentResults.filter(s =>
          `${s.title} ${s.artist}`.toLowerCase().includes(clean)
        );
        if (filtered.length > 0) {
          setResults(filtered);
          setIsOpen(true);
          setSelectedIndex(0);
          prefixFound = true;
          break;
        }
      }
    }

    // Abort previous in-flight fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentSeq = ++searchSeqRef.current;
    if (!prefixFound) {
      setLoading(true);
    }

    const timer = setTimeout(async () => {
      try {
        const artistParam = imposedArtist ? `&artist=${encodeURIComponent(imposedArtist)}` : '';
        const res = await fetch(
          `/api/music/search?q=${encodeURIComponent(effectiveQuery)}${artistParam}&limit=15`,
          {
            signal: controller.signal,
          }
        );
        if (res.ok && currentSeq === searchSeqRef.current) {
          const data: Song[] = await res.json();
          if (currentSeq === searchSeqRef.current) {
            clientSearchCache.set(cacheKey, data);
            setResults(data);
            setIsOpen(data.length > 0);
            setSelectedIndex(0);
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Search error:', err);
        }
      } finally {
        if (currentSeq === searchSeqRef.current) {
          setLoading(false);
        }
      }
    }, 80);

    return () => {
      clearTimeout(timer);
    };
  }, [query, selectedSong, imposedArtist]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSong = (song: Song) => {
    if (disabled || hasGuessed) return;
    onGuess(song, `${song.title} ${song.artist}`);
    setSelectedSong(null);
    setQuery('');
    setIsOpen(false);
    setResults([]);
  };

  const handleClearSelection = () => {
    setSelectedSong(null);
    setQuery('');
    setIsOpen(false);
    setResults([]);
    inputRef.current?.focus();
  };

  // For single-artist mode, sort suggestions alphabetically by title so suggestions never leak round sequence!
  const displayResults = React.useMemo(() => {
    if (imposedArtist && results.length > 0) {
      return [...results].sort((a, b) => a.title.localeCompare(b.title));
    }
    return results;
  }, [results, imposedArtist]);

  const hasText = Boolean(query.trim().length > 0 || selectedSong !== null);
  const canSubmit = !disabled && !hasGuessed && (selectedSong !== null || query.trim().length >= minChars);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled || hasGuessed) return;

    if (!hasText) {
      onSkip?.();
      return;
    }

    if (selectedSong) {
      onGuess(selectedSong, `${selectedSong.title} ${selectedSong.artist}`);
      setSelectedSong(null);
      setQuery('');
      setIsOpen(false);
      setResults([]);
      return;
    }

    // If suggestions are available, pick the highlighted or #1 ranked suggestion
    if (displayResults.length > 0) {
      const bestSong = displayResults[selectedIndex >= 0 && selectedIndex < displayResults.length ? selectedIndex : 0];
      if (bestSong) {
        onGuess(bestSong, `${bestSong.title} ${bestSong.artist}`);
        setSelectedSong(null);
        setQuery('');
        setIsOpen(false);
        setResults([]);
        return;
      }
    }

    // Direct text submission fallback
    if (query.trim().length >= minChars) {
      const fullGuess = imposedArtist ? `${query.trim()} ${imposedArtist}` : query.trim();
      onGuess(
        {
          id: 'raw_guess',
          title: query.trim(),
          artist: imposedArtist || '',
          album: '',
          previewUrl: '',
          artwork: '',
        },
        fullGuess
      );
      setSelectedSong(null);
      setQuery('');
      setIsOpen(false);
      setResults([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || hasGuessed) return;

    if (isOpen && displayResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < displayResults.length - 1 ? prev + 1 : 0));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : displayResults.length - 1));
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
        return;
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full relative space-y-2">
      {/* Search Input & Submit Button Container */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 relative">
        <div className={`relative flex items-center flex-1 bg-slate-900 border rounded-2xl transition-all duration-200 shadow-inner ${
          hasGuessed
            ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300 cursor-not-allowed'
            : selectedSong
            ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-slate-900 font-bold'
            : 'border-slate-700/80 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'
        }`}>
          {/* Left search icon or loading spinner */}
          <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400 shrink-0">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>

          {/* Locked Gray Artist Badge when imposed */}
          {imposedArtist && !hasGuessed && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-xl font-bold text-xs sm:text-sm select-none shrink-0 shadow-sm mr-1 cursor-default"
              title={`Artiste imposé : ${imposedArtist}`}
            >
              <span className="text-slate-400 text-xs">👤</span>
              <span className="text-slate-200">{imposedArtist}</span>
              <span className="text-slate-500 font-bold">/</span>
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              if (selectedSong) setSelectedSong(null);
              setQuery(e.target.value);
            }}
            onFocus={() => {
              if (results.length > 0 && !selectedSong) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled || hasGuessed}
            placeholder={
              hasGuessed
                ? '✅ Chanson trouvée !'
                : imposedArtist
                ? `Titre du morceau de ${imposedArtist}...`
                : 'Tapez le titre ou l’artiste (ex: Theodort, Jul, Gazo...)'
            }
            className="w-full py-3.5 pr-10 bg-transparent text-slate-100 placeholder-slate-500 font-medium text-sm sm:text-base focus:outline-none"
          />

          {(query || selectedSong) && !hasGuessed && (
            <button
              onClick={handleClearSelection}
              type="button"
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Unified Dynamic Action Button: Passer when empty, Valider when text entered */}
        {hasText ? (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            type="submit"
            className={`px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shrink-0 cursor-pointer min-w-[125px] ${
              canSubmit
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
                : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Send className="w-4 h-4 fill-current" />
            <span>Valider</span>
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              onSkip?.();
            }}
            disabled={disabled || hasGuessed || !onSkip}
            type="button"
            className="px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-200 border border-slate-700/80 cursor-pointer shrink-0 min-w-[125px] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Passer à l'extrait suivant"
          >
            <FastForward className="w-4 h-4 text-emerald-400" />
            <span>Passer</span>
          </button>
        )}
      </form>

      {/* Autocomplete Dropdown spans full container width */}
      {isOpen && !hasGuessed && query.trim().length >= minChars && (
        <div
          ref={dropdownRef}
          className="absolute z-[100] left-0 right-0 top-full mt-2 bg-slate-900 border-2 border-slate-700/80 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-800 animate-in fade-in zoom-in-98 duration-150"
        >
          {displayResults.length > 0 ? (
            <>
              <div className="bg-slate-950/90 px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800">
                <span>Titres ({displayResults.length})</span>
                <span className="text-emerald-400 text-xs lowercase font-semibold">Entrée ou clic pour valider</span>
              </div>

              {displayResults.map((song, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={song.id || index}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSong(song);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelectSong(song);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3.5 p-3 text-left transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'bg-emerald-500/20 text-white'
                        : 'hover:bg-slate-800/70 text-slate-200'
                    }`}
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700/50">
                      {song.artwork ? (
                        <img
                          src={song.artwork}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          <Music className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate text-white">
                        {song.title}
                      </div>
                      <div className="text-xs text-slate-400 truncate flex items-center gap-2">
                        <span className="font-semibold text-emerald-400">{song.artist}</span>
                        {song.album && <span className="text-slate-500">• {song.album}</span>}
                      </div>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isSelected ? 'Deviner ↵' : 'Deviner'}
                    </span>
                  </div>
                );
              })}
            </>
          ) : !loading ? (
            <div className="p-3 text-center text-xs text-slate-400">
              <span>Aucun titre trouvé pour « <strong className="text-white">{query}</strong> »</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Selected Song Preview Pill if user selected a song */}
      {selectedSong && !hasGuessed && (
        <div className="flex items-center justify-between gap-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">Sélectionné :</span>
            <span className="font-bold text-white truncate">{selectedSong.title}</span>
            <span className="text-emerald-400 font-bold truncate">({selectedSong.artist})</span>
          </div>
          <button
            onClick={handleClearSelection}
            type="button"
            className="text-slate-400 hover:text-white text-xs underline cursor-pointer shrink-0"
          >
            Changer
          </button>
        </div>
      )}
    </div>
  );
};
