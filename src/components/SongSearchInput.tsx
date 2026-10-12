import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, Send, Music, Check } from 'lucide-react';
import { Song } from '../types/game';

interface SongSearchInputProps {
  onGuess: (song: Song, queryText: string) => void;
  onSkip?: () => void;
  disabled?: boolean;
  hasGuessed?: boolean;
  currentStep?: number;
  totalSteps?: number;
  steps?: number[];
}

export const SongSearchInput: React.FC<SongSearchInputProps> = ({
  onGuess,
  disabled = false,
  hasGuessed = false,
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

  // Debounced search with race-condition prevention
  useEffect(() => {
    if (selectedSong) return;

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }

    const currentSeq = ++searchSeqRef.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(trimmed)}&limit=10`);
        if (res.ok && currentSeq === searchSeqRef.current) {
          const data: Song[] = await res.json();
          if (currentSeq === searchSeqRef.current) {
            setResults(data);
            setIsOpen(data.length > 0);
            setSelectedIndex(0); // Auto-highlight first suggestion for quick Enter key
          }
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (currentSeq === searchSeqRef.current) {
          setLoading(false);
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, selectedSong]);

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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled || hasGuessed) return;

    if (selectedSong) {
      onGuess(selectedSong, `${selectedSong.title} ${selectedSong.artist}`);
      setSelectedSong(null);
      setQuery('');
      setIsOpen(false);
      setResults([]);
    } else if (isOpen && results.length > 0 && selectedIndex >= 0 && selectedIndex < results.length) {
      // Pick the currently highlighted suggestion immediately!
      const song = results[selectedIndex];
      onGuess(song, `${song.title} ${song.artist}`);
      setSelectedSong(null);
      setQuery('');
      setIsOpen(false);
      setResults([]);
    } else if (query.trim().length >= 2) {
      const raw = query.trim().toLowerCase();
      // Strict title matching: only pick from results if the SONG TITLE matches what was typed
      const titleMatch = results.find(
        r => r.title.toLowerCase() === raw || r.title.toLowerCase().startsWith(raw)
      );
      if (titleMatch) {
        onGuess(titleMatch, `${titleMatch.title} ${titleMatch.artist}`);
      } else {
        onGuess(
          {
            id: 'raw_guess',
            title: query.trim(),
            artist: '',
            album: '',
            previewUrl: '',
            artwork: '',
          },
          query.trim()
        );
      }
      setSelectedSong(null);
      setQuery('');
      setIsOpen(false);
      setResults([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || hasGuessed) return;

    if (isOpen && results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // If user hits Enter while dropdown is open, select the highlighted suggestion
        const songToSelect = results[selectedIndex >= 0 ? selectedIndex : 0];
        if (songToSelect) {
          handleSelectSong(songToSelect);
          return;
        }
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

  const canSubmit = !disabled && !hasGuessed && (selectedSong !== null || query.trim().length >= 2);

  return (
    <div className="w-full relative space-y-2">
      {/* Search Input & Submit Button Container */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 relative">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>

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
                : 'Tapez le titre ou l’artiste (ex: Theodort, Jul, Gazo...)'
            }
            className={`w-full pl-11 pr-10 py-3.5 bg-slate-900 border rounded-2xl text-slate-100 placeholder-slate-500 font-medium text-sm sm:text-base focus:outline-none transition-all duration-200 shadow-inner ${
              hasGuessed
                ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300 cursor-not-allowed'
                : selectedSong
                ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-slate-900 font-bold'
                : 'border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
            }`}
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

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          type="button"
          className={`px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shrink-0 cursor-pointer ${
            canSubmit
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
              : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
          }`}
        >
          <Send className="w-4 h-4 fill-current" />
          <span>Valider</span>
        </button>
      </form>

      {/* Autocomplete Dropdown spans full container width */}
      {isOpen && results.length > 0 && !hasGuessed && (
        <div
          ref={dropdownRef}
          className="absolute z-[100] left-0 right-0 top-full mt-2 bg-slate-900 border-2 border-slate-700/80 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-800 animate-in fade-in zoom-in-98 duration-150"
        >
          <div className="bg-slate-950/90 px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800">
            <span>Suggestions ({results.length})</span>
            <span className="text-emerald-400 text-xs lowercase font-semibold">Cliquez ou Entrée pour valider</span>
          </div>

          {results.map((song, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={song.id || index}
                onMouseDown={(e) => {
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
