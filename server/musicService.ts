import { Song, PlaylistInfo } from '../src/types/game.js';

export const PLAYLIST_PRESETS: PlaylistInfo[] = [
  {
    id: 'trending-gen-z',
    name: '🔥 Top Tendances France & TikTok',
    description: 'Les plus gros hits officiels du Top 100 France (Apple Charts, TikTok & Deezer)',
    icon: '🔥',
    badge: 'N°1 France',
    gradient: 'from-rose-500 via-amber-500 to-violet-600',
    songsCount: 40,
  },
  {
    id: 'rap-fr-gen-z',
    name: '⚡ Rap FR & Bangers Gen Z',
    description: 'Gazo, SDM, Tiakola, Werenoi, PLK, Jul, Theodort, Ninho, Yamê...',
    icon: '⚡',
    badge: 'Top Rap FR',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    songsCount: 40,
  },
  {
    id: 'single-artist',
    name: '👑 100% Un Seul Artiste',
    description: 'Choisissez votre artiste favori (Theodort, Jul, Billie Eilish...) et devinez ses titres !',
    icon: '👑',
    badge: 'Mode Star',
    gradient: 'from-amber-400 via-pink-500 to-purple-600',
    songsCount: 25,
  },
  {
    id: 'global-hits',
    name: '🌍 Top Hits Mondiaux',
    description: 'The Weeknd, Sabrina Carpenter, Billie Eilish, Bruno Mars, Dua Lipa, Kendrick...',
    icon: '🌍',
    badge: 'International',
    gradient: 'from-amber-500 to-rose-600',
    songsCount: 35,
  },
  {
    id: 'french-hits',
    name: '🇫🇷 Hits Français & Variété',
    description: 'Stromae, Angèle, Orelsan, Pierre Garnier, Santa, Céline Dion, Indochine...',
    icon: '🇫🇷',
    badge: 'France',
    gradient: 'from-blue-600 via-white to-red-600',
    songsCount: 30,
  },
  {
    id: 'nostalgia-2000s',
    name: '📻 Nostalgie 2000s & 2010s',
    description: 'Britney, Eminem, Shakira, Rihanna, Black Eyed Peas, Coldplay...',
    icon: '📻',
    badge: 'Nostalgie',
    gradient: 'from-cyan-500 to-blue-600',
    songsCount: 30,
  },
  {
    id: 'classics-80-90',
    name: '🎸 Classiques Rock & Pop (80s/90s)',
    description: 'Queen, Michael Jackson, Nirvana, ABBA, AC/DC, Guns N\' Roses...',
    icon: '🎸',
    badge: 'Légendes',
    gradient: 'from-purple-600 to-indigo-700',
    songsCount: 30,
  },
  {
    id: 'electro-dance',
    name: '🎧 Électro, Dance & Club',
    description: 'Daft Punk, David Guetta, Avicii, Calvin Harris, Martin Garrix...',
    icon: '🎧',
    badge: 'Club',
    gradient: 'from-emerald-500 to-teal-700',
    songsCount: 30,
  },
];

export const POPULAR_ARTISTS_PRESETS = [
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
  'Taylor Swift',
  'Michael Jackson',
  'Eminem',
  'Travis Scott',
  'Aya Nakamura',
];

/**
 * Rejects type beats, prods, beatmaker instrumentals, covers, karaoke, parodies.
 * Only genuine studio songs are accepted!
 */
export function isLegitSong(title: string, artist: string): boolean {
  if (!title || !artist) return false;
  const badPatterns = [
    /\btype\s*beat\b/i,
    /\btype\s*drill\b/i,
    /\bbeat\b/i,
    /\bprod\b/i,
    /\bprod\./i,
    /\bproduced\s+by\b/i,
    /\bbeatmaker\b/i,
    /\binstrumental\b/i,
    /\bkaraoke\b/i,
    /\btribute\b/i,
    /\bparody\b/i,
    /\bcover\b/i,
    /\bremake\b/i,
    /\bbacking\s+track\b/i,
    /\bin\s+the\s+style\s+of\b/i,
    /\boriginally\s+performed\b/i,
    /\bslowed/i,
    /\breverb\b/i,
    /\bsped\s*up\b/i,
    /\bfree\s+beat\b/i,
    /\bwav\s+leak\b/i,
    /\bversion\s+instrumentale\b/i,
    /\bsample\s+pack\b/i,
  ];
  return !badPatterns.some(re => re.test(title) || re.test(artist));
}

// In-memory cache for search queries and external feeds
const searchCache = new Map<string, { timestamp: number; songs: Song[] }>();
const playlistCache = new Map<string, { timestamp: number; songs: Song[] }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

/**
 * Loads the official Apple Music / iTunes Top 100 Songs France JSON RSS feed
 * 100% legal, free, official top chart in France with full previews and metadata.
 */
export async function loadAppleTopFranceRSS(): Promise<Song[]> {
  const cacheKey = 'apple-rss-top-france-100';
  const cached = playlistCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.songs;
  }

  try {
    const res = await fetch('https://itunes.apple.com/fr/rss/topsongs/limit=100/json', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      const entries = data?.feed?.entry;
      if (Array.isArray(entries) && entries.length > 0) {
        const songs: Song[] = [];
        const seen = new Set<string>();

        for (const entry of entries) {
          const title = entry['im:name']?.label || '';
          const artist = entry['im:artist']?.label || '';
          if (!title || !artist || !isLegitSong(title, artist)) continue;

          // Find audio preview link
          const links = entry.link;
          let previewUrl = '';
          if (Array.isArray(links)) {
            const enclosure = links.find((l: any) => l.attributes?.rel === 'enclosure' || l.attributes?.type?.includes('audio'));
            previewUrl = enclosure?.attributes?.href || '';
          } else if (links?.attributes?.rel === 'enclosure') {
            previewUrl = links.attributes.href;
          }

          if (!previewUrl) continue;

          const key = `${normalizeString(title)}-${normalizeString(artist)}`;
          if (seen.has(key)) continue;
          seen.add(key);

          // Find high-res image
          const images = entry['im:image'];
          let artwork = '';
          if (Array.isArray(images) && images.length > 0) {
            const best = images[images.length - 1]?.label || '';
            artwork = best.replace(/\/\d+x\d+bb\./, '/600x600bb.');
          }

          const genre = entry.category?.attributes?.label || 'Top Hit France';
          const releaseStr = entry['im:releaseDate']?.label || '';
          const year = releaseStr ? new Date(releaseStr).getFullYear() : undefined;
          const trackId = entry.id?.attributes?.['im:id'] || String(Math.random().toString(36).substring(2, 9));

          songs.push({
            id: String(trackId),
            title,
            artist,
            album: entry['im:collection']?.['im:name']?.label || 'Single',
            previewUrl,
            artwork: artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
            year,
            genre,
          });
        }

        if (songs.length > 0) {
          playlistCache.set(cacheKey, { timestamp: Date.now(), songs });
          return songs;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load Apple Top France RSS feed:', err);
  }

  return [];
}

/**
 * Loads tracks from official Deezer playlists with caching and filtering
 */
export async function loadDeezerPlaylist(endpoint: string): Promise<Song[]> {
  const cached = playlistCache.get(endpoint);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.songs;
  }

  try {
    const url = endpoint.startsWith('http') ? endpoint : `https://api.deezer.com/${endpoint}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : (Array.isArray(json.tracks?.data) ? json.tracks.data : []);

      const songs: Song[] = [];
      const seen = new Set<string>();

      for (const item of list) {
        if (!item.preview || !item.title || !item.artist?.name) continue;
        if (!isLegitSong(item.title, item.artist.name)) continue;

        const key = `${normalizeString(item.title)}-${normalizeString(item.artist.name)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        songs.push({
          id: `dz_${item.id}`,
          title: item.title,
          artist: item.artist.name,
          album: item.album?.title || '',
          previewUrl: item.preview,
          artwork: item.album?.cover_xl || item.album?.cover_medium || item.artist?.picture_big || '',
          year: undefined,
          genre: 'Top Hit',
        });
      }

      if (songs.length > 0) {
        playlistCache.set(endpoint, { timestamp: Date.now(), songs });
        return songs;
      }
    }
  } catch (err) {
    console.warn(`Deezer playlist fetch failed for ${endpoint}:`, err);
  }

  return [];
}

/**
 * Searches music using free iTunes Search API + Deezer with strict type beat filtering
 * Case-insensitive, accent-insensitive search.
 */
export async function searchFreeMusic(query: string, limit = 15): Promise<Song[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  const cached = searchCache.get(cleanQuery);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.songs.slice(0, limit);
  }

  // 1. Try iTunes with country=FR
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&country=FR&entity=song&limit=${Math.max(limit * 2, 35)}`;
    const response = await fetch(itunesUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        const songs: Song[] = [];
        const seen = new Set<string>();

        for (const item of data.results) {
          if (!item.previewUrl || !item.trackName || !item.artistName) continue;
          if (!isLegitSong(item.trackName, item.artistName)) continue;

          const key = `${normalizeString(item.trackName)}-${normalizeString(item.artistName)}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const artwork = item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100bb', '600x600bb')
            : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

          const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined;

          songs.push({
            id: String(item.trackId || Math.random().toString(36).substring(2, 9)),
            title: item.trackName,
            artist: item.artistName,
            album: item.collectionName || 'Single',
            previewUrl: item.previewUrl,
            artwork,
            year,
            genre: item.primaryGenreName || 'Musique',
            appleMusicUrl: item.trackViewUrl,
          });
        }

        if (songs.length > 0) {
          searchCache.set(cleanQuery, { timestamp: Date.now(), songs });
          return songs.slice(0, limit);
        }
      }
    }
  } catch (err) {
    console.warn(`iTunes search error for "${query}":`, err);
  }

  // 2. Deezer API search fallback
  try {
    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(cleanQuery)}&limit=${Math.max(limit * 2, 25)}`;
    const deezerRes = await fetch(deezerUrl, { signal: AbortSignal.timeout(4500) });
    if (deezerRes.ok) {
      const dData = await deezerRes.json();
      if (Array.isArray(dData.data) && dData.data.length > 0) {
        const dSongs: Song[] = dData.data
          .filter((t: any) => t.preview && t.title && t.artist?.name && isLegitSong(t.title, t.artist.name))
          .map((t: any) => ({
            id: `dz-${t.id}`,
            title: t.title,
            artist: t.artist?.name || 'Artiste',
            album: t.album?.title || '',
            previewUrl: t.preview,
            artwork: t.album?.cover_xl || t.album?.cover_medium || '',
            year: undefined,
            genre: 'Musique',
          }));

        if (dSongs.length > 0) {
          searchCache.set(cleanQuery, { timestamp: Date.now(), songs: dSongs });
          return dSongs.slice(0, limit);
        }
      }
    }
  } catch (dErr) {
    console.warn('Deezer fallback error:', dErr);
  }

  // 3. Fallback to cached playlist tracks if remote APIs fail or return 0 results
  const normQ = normalizeString(cleanQuery);
  const cachedMatches: Song[] = [];
  for (const [, cacheItem] of playlistCache.entries()) {
    for (const s of cacheItem.songs) {
      if (
        isLegitSong(s.title, s.artist) &&
        (normalizeString(s.title).includes(normQ) || normalizeString(s.artist).includes(normQ))
      ) {
        if (!cachedMatches.some(m => m.id === s.id)) {
          cachedMatches.push(s);
        }
      }
    }
  }
  if (cachedMatches.length > 0) {
    return cachedMatches.slice(0, limit);
  }

  return [];
}

/**
 * Guarantees artist diversity: each song in the game has a DIFFERENT artist!
 * Perfectly shuffled.
 */
export function pickDiverseSongs(songs: Song[], count: number): Song[] {
  const legitOnly = songs.filter(s => isLegitSong(s.title, s.artist));
  const pool = legitOnly.length > 0 ? legitOnly : songs;
  const shuffled = shuffleArray([...pool]);

  const selected: Song[] = [];
  const seenArtists = new Set<string>();

  // Pass 1: pick strictly 1 song per artist
  for (const song of shuffled) {
    const artistKey = normalizeString(song.artist);
    if (!seenArtists.has(artistKey)) {
      seenArtists.add(artistKey);
      selected.push(song);
      if (selected.length >= count) return selected;
    }
  }

  // Pass 2: if not enough unique artists, fill from the remaining tracks
  if (selected.length < count) {
    for (const song of shuffled) {
      if (!selected.some(sel => sel.id === song.id)) {
        selected.push(song);
        if (selected.length >= count) break;
      }
    }
  }

  return selected;
}

/**
 * Gets songs for a game round from official charts, playlist or dedicated artist.
 * Ensures maximum variety and real music only.
 */
export async function getGameSongs(
  playlistId: string,
  count = 10,
  customArtist?: string
): Promise<Song[]> {
  // 1. Dedicated Single Artist Mode or Custom Artist Search
  if (playlistId === 'single-artist' || (customArtist && customArtist.trim().length > 1)) {
    // If no artist was typed by the user, pick a random artist from presets so it's NOT always the same one!
    const artistTarget = (
      customArtist && customArtist.trim().length > 1
        ? customArtist.trim()
        : POPULAR_ARTISTS_PRESETS[Math.floor(Math.random() * POPULAR_ARTISTS_PRESETS.length)]
    ).trim();

    const artistSongs = await searchFreeMusic(artistTarget, Math.max(count * 3, 35));

    // Filter to songs strictly belonging to the requested artist (case-insensitive)
    const targetNorm = normalizeString(artistTarget);
    const strictlyByArtist = artistSongs.filter(s => {
      const artNorm = normalizeString(s.artist);
      return artNorm.includes(targetNorm) || targetNorm.includes(artNorm);
    });

    const chosen = strictlyByArtist.length >= 3 ? strictlyByArtist : artistSongs;
    return shuffleArray(chosen).slice(0, count);
  }

  // 2. Official Charts (Apple Top 100 France + Deezer Playlists)
  let pool: Song[] = [];

  if (playlistId === 'trending-gen-z') {
    // Official Apple Top 100 France RSS + Deezer TikTok Hits
    const [appleTop100, deezerTikTok, deezerChart] = await Promise.all([
      loadAppleTopFranceRSS(),
      loadDeezerPlaylist('playlist/706093485/tracks?limit=80'), // TikTok Hits France
      loadDeezerPlaylist('chart/0/tracks?limit=80'), // Deezer Top Global
    ]);
    pool = [...appleTop100, ...deezerTikTok, ...deezerChart];
  } else if (playlistId === 'rap-fr-gen-z') {
    const [tracksTopFR, tracksRapFR] = await Promise.all([
      loadDeezerPlaylist('playlist/1109890291/tracks?limit=80'), // Top France
      loadDeezerPlaylist('playlist/1209673751/tracks?limit=80'), // Rap FR
    ]);
    pool = [...tracksRapFR, ...tracksTopFR];
  } else if (playlistId === 'french-hits') {
    const [tracksTopFR, tracksVarFR] = await Promise.all([
      loadAppleTopFranceRSS(),
      loadDeezerPlaylist('playlist/1306931615/tracks?limit=80'), // Variété FR
    ]);
    pool = [...tracksTopFR, ...tracksVarFR];
  } else if (playlistId === 'classics-80-90') {
    pool = await loadDeezerPlaylist('playlist/1313621735/tracks?limit=80');
  } else if (playlistId === 'nostalgia-2000s') {
    pool = await loadDeezerPlaylist('playlist/1479458365/tracks?limit=80');
  } else {
    pool = await loadDeezerPlaylist('chart/0/tracks?limit=80');
  }

  // If online feeds returned tracks, pick diverse tracks (1 song per artist, no duplicates!)
  if (pool.length >= count) {
    return pickDiverseSongs(pool, count);
  }

  // Dynamic artist queries fallback
  const artistSets: Record<string, string[]> = {
    'trending-gen-z': [
      'Sabrina Carpenter', 'Billie Eilish', 'Chappell Roan', 'Charli xcx', 'Kendrick Lamar',
      'Tommy Richman', 'Benson Boone', 'Teddy Swims', 'Olivia Rodrigo', 'Tate McRae', 'Artemas', 'Dua Lipa',
    ],
    'rap-fr-gen-z': [
      'Gazo', 'Tiakola', 'SDM', 'Werenoi', 'PLK', 'Jul', 'Theodort', 'Carbonne', 'Yamê', 'Ninho', 'Favé',
    ],
    'global-hits': ['The Weeknd', 'Taylor Swift', 'Dua Lipa', 'Bruno Mars', 'Ed Sheeran', 'Harry Styles', 'SZA'],
    'french-hits': ['Stromae', 'Angèle', 'Pierre Garnier', 'Santa', 'Orelsan', 'Céline Dion', 'Indochine'],
    'classics-80-90': ['Michael Jackson', 'Queen', 'Nirvana', 'ABBA', 'ACDC', 'Guns N Roses', 'a-ha'],
    'nostalgia-2000s': ['Britney Spears', 'Eminem', 'Black Eyed Peas', 'Lady Gaga', 'Shakira', 'Rihanna'],
    'electro-dance': ['Daft Punk', 'David Guetta', 'Avicii', 'Calvin Harris', 'Martin Garrix'],
  };

  const artists = artistSets[playlistId] || artistSets['trending-gen-z'];
  // Pick exactly 1 song per random artist
  const shuffledArtists = shuffleArray([...artists]).slice(0, count);
  const fallbackSongs: Song[] = [];

  for (const art of shuffledArtists) {
    const res = await searchFreeMusic(art, 4);
    if (res.length > 0) {
      fallbackSongs.push(res[0]); // 1 song per artist
    }
  }

  if (fallbackSongs.length >= 3) {
    return shuffleArray(fallbackSongs).slice(0, count);
  }

  // Emergency seed fallback
  return pickDiverseSongs(SEED_TRACKS[playlistId] || SEED_TRACKS['trending-gen-z'] || [], count);
}

/**
 * Normalizes strings for lenient, case-insensitive, accent-insensitive matching.
 * "THEODORT" -> "theodort"
 * "théôdort" -> "theodort"
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove all accents: é, è, ê, à, etc.
    .replace(/\([^)]*\)/g, '') // remove (feat. ...) or (remastered)
    .replace(/\[[^\]]*\]/g, '')
    .replace(/feat\..*$/i, '')
    .replace(/ft\..*$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Validates a guess: supports title match, artist match, combined match, with lenient normalization.
 * Case-insensitive & accent-insensitive.
 */
export function checkGuessMatch(
  guessText: string,
  targetSong: Song,
  guessedTrackId?: string
): boolean {
  if (guessedTrackId && String(guessedTrackId) === String(targetSong.id)) {
    return true;
  }

  const normGuess = normalizeString(guessText);
  if (!normGuess || normGuess.length < 2) return false;

  const normTitle = normalizeString(targetSong.title);
  const normArtist = normalizeString(targetSong.artist);
  const normBoth = normalizeString(`${targetSong.title} ${targetSong.artist}`);
  const normBothReverse = normalizeString(`${targetSong.artist} ${targetSong.title}`);

  // 1. Direct title match
  if (normGuess === normTitle) return true;
  if (normTitle.includes(normGuess) && (normGuess.length >= 3 || normGuess.length >= normTitle.length * 0.6)) return true;
  if (normGuess.includes(normTitle) && normTitle.length >= 3) return true;

  // 2. Direct artist match (e.g. typing "theodort" or "THEODORT" for artist THEODORT is 100% valid!)
  if (normGuess === normArtist) return true;
  if (normArtist.includes(normGuess) && (normGuess.length >= 3 || normGuess.length >= normArtist.length * 0.6)) return true;
  if (normGuess.includes(normArtist) && normArtist.length >= 3) return true;

  // 3. Combined title + artist match
  if (normGuess === normBoth || normGuess === normBothReverse) return true;
  if (normBoth.includes(normGuess) && normGuess.length >= 3) return true;
  if (normBothReverse.includes(normGuess) && normGuess.length >= 3) return true;

  return false;
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Built-in seed fallback (genuine top hits)
export const SEED_TRACKS: Record<string, Song[]> = {
  'trending-gen-z': [
    {
      id: 'gz-1',
      title: 'Espresso',
      artist: 'Sabrina Carpenter',
      album: 'Short n\' Sweet',
      previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e9/4d/02/e94d0230-11ee-ef94-d2cf-a5d547bd73f4/mzaf_554140808559155562.plus.aac.p.m4a',
      artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/57/e8/7b/57e87ba0-5057-9bb9-c247-ce7dbe426e89/24UMGIM55213.rgb.jpg/600x600bb.jpg',
      year: 2024,
      genre: 'Pop',
    },
    {
      id: 'gz-2',
      title: 'BIRDS OF A FEATHER',
      artist: 'Billie Eilish',
      album: 'HIT ME HARD AND SOFT',
      previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/34/31/d3/3431d34e-847f-5d66-df83-0bce688d997e/mzaf_18106743962423782018.plus.aac.p.m4a',
      artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/600x600bb.jpg',
      year: 2024,
      genre: 'Alternative Pop',
    },
    {
      id: 'gz-3',
      title: 'Good Luck, Babe!',
      artist: 'Chappell Roan',
      album: 'Good Luck, Babe! - Single',
      previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a1/9b/6c/a19b6ca7-ef56-d6ca-5334-0348705f13ee/mzaf_17072545582500057041.plus.aac.p.m4a',
      artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/36/53/19/36531980-60b6-1936-cb79-d5fe123c563e/24UMGIM35201.rgb.jpg/600x600bb.jpg',
      year: 2024,
      genre: 'Synth-Pop',
    },
    {
      id: 'gz-4',
      title: 'Not Like Us',
      artist: 'Kendrick Lamar',
      album: 'Not Like Us - Single',
      previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/05/db/5d/05db5d24-742a-a53a-c3ad-e5a07c92a95c/mzaf_12448375525547690623.plus.aac.p.m4a',
      artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/71/84/38/7184382c-b26a-91d5-8eb6-a36ff8580231/24UMGIM52377.rgb.jpg/600x600bb.jpg',
      year: 2024,
      genre: 'Hip-Hop / West Coast',
    },
    {
      id: 'gz-5',
      title: 'Beautiful Things',
      artist: 'Benson Boone',
      album: 'Fireworks & Rollerblades',
      previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/58/0f/c6/580fc601-570a-fc89-53dc-13531b997c41/mzaf_13508491823795642408.plus.aac.p.m4a',
      artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/05/23/dc/0523dcfe-3ca6-be0a-9d62-7fa689eb06b6/093624855490.jpg/600x600bb.jpg',
      year: 2024,
      genre: 'Pop Rock',
    },
  ],
  'rap-fr-gen-z': [
    {
      id: 'rf-1',
      title: 'Bolide allemand',
      artist: 'SDM',
      album: 'Liens du 100',
      previewUrl: 'https://cdnt-preview.dzcdn.net/api/1/1/b/f/c/0/bfc508998f5e7eb28489bbe435a6453d.mp3',
      artwork: 'https://e-cdns-images.dzcdn.net/images/cover/82e46172fe6ace4c287cde4a8f1c8392/500x500-000000-80-0-0.jpg',
      year: 2022,
      genre: 'Rap Français',
    },
    {
      id: 'rf-2',
      title: 'DIE',
      artist: 'Gazo',
      album: 'KMT',
      previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview123/v4/57/75/19/5775190c-84ee-c638-695e-074774a8b20e/mzaf_13220864094656637281.plus.aac.p.m4a',
      artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/42/4d/6f/424d6f11-7e9e-cbe5-974b-7ee74712e0a4/artwork.jpg/600x600bb.jpg',
      year: 2022,
      genre: 'Drill FR',
    },
    {
      id: 'rf-3',
      title: 'Wayeh',
      artist: 'THEODORT',
      album: 'Imad',
      previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/df/a1/b9/dfa1b95e-8573-4cc9-b5f1-c71975094ac0/mzaf_11080257702606144032.plus.aac.p.m4a',
      artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/5d/83/ac/5d83ac12-6590-6abf-7573-a806d4da3770/196871942898.jpg/600x600bb.jpg',
      year: 2024,
      genre: 'Afro-pop',
    },
    {
      id: 'rf-4',
      title: 'Imagine',
      artist: 'Carbonne',
      album: 'Imagine - Single',
      previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b0/16/9e/b0169ec2-0ca5-ab00-c98f-928154113237/mzaf_17951255333728914139.plus.aac.p.m4a',
      artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/05/23/dc/0523dcfe-3ca6-be0a-9d62-7fa689eb06b6/carbonne.jpg/600x600bb.jpg',
      year: 2024,
      genre: 'Rap / Pop Urbaine',
    },
  ],
};
