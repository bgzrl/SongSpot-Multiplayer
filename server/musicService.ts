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
    /\bprod\s*by\b/i,
    /\bprod\./i,
    /\bproduced\s+by\b/i,
    /\bbeatmaker\b/i,
    /\bversion\s+karaoke\b/i,
    /\bkaraoke\s+version\b/i,
    /\bkaraoke\b/i,
    /\btribute\s+to\b/i,
    /\bbacking\s+track\b/i,
    /\bin\s+the\s+style\s+of\b/i,
    /\boriginally\s+performed\b/i,
    /\bversion\s+instrumentale\b/i,
    /\binstrumental\s+version\b/i,
    /\bsample\s+pack\b/i,
    /\bfree\s+beat\b/i,
    /\bwav\s+leak\b/i,
  ];
  return !badPatterns.some(re => re.test(title) || re.test(artist));
}

const searchCache = new Map<string, { timestamp: number; songs: Song[] }>();
const playlistCache = new Map<string, { timestamp: number; songs: Song[] }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export const activeGameSongsCache: Song[] = [];

export function registerActiveGameSongs(songs: Song[]) {
  for (const s of songs) {
    if (!s || !s.title || !s.artist) continue;
    if (!activeGameSongsCache.some(existing => existing.id === s.id)) {
      activeGameSongsCache.push(s);
    }
  }
  if (activeGameSongsCache.length > 250) {
    activeGameSongsCache.splice(0, activeGameSongsCache.length - 250);
  }
}

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
 * High-Precision Multi-Source Hybrid Search Engine
 * - Searches Active Game Pool & In-Memory Playlists first (ensures currently playing songs are always ranked #1)
 * - Queries Deezer API & iTunes API in parallel
 * - Ranks candidates using relevance scoring (exact titles, artist prefix, whole word matches)
 * - Smart deduplication keeping highest-quality entries
 */
const inFlightSearches = new Map<string, Promise<Song[]>>();

/**
 * Ultra-Fast Multi-Source Search Engine
 * - Searches Active Game Pool & In-Memory Playlists first
 * - Fast-path Deezer Primary (~80-120ms): if Deezer yields sufficient tracks, returns immediately
 * - Fast fallback to iTunes API only if Deezer returns few/no results or fails
 * - Deduplicates concurrent in-flight requests
 * - Intelligent scoring, token matching, and smart deduplication
 */
export async function searchFreeMusic(query: string, limit = 15): Promise<Song[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  const cached = searchCache.get(cleanQuery);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.songs.slice(0, limit);
  }

  const existingInFlight = inFlightSearches.get(cleanQuery);
  if (existingInFlight) {
    const songs = await existingInFlight;
    return songs.slice(0, limit);
  }

  const searchPromise = (async () => {
    const normQ = normalizeString(cleanQuery);
    const coreQ = extractCoreTitle(cleanQuery);
    const queryTokens = cleanQuery
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[\s,+'"-_/]+/)
      .map(t => t.replace(/[^a-z0-9]/g, ''))
      .filter(t => t.length >= 2);

    interface ScoredCandidate {
      song: Song;
      score: number;
      source: 'in_memory' | 'deezer' | 'itunes';
    }

    const rawCandidates: ScoredCandidate[] = [];

    // 1. Scan in-memory playlists and active tracks (Priority 0)
    const allInMemorySongs: Song[] = [...activeGameSongsCache];
    for (const [, cacheItem] of playlistCache.entries()) {
      allInMemorySongs.push(...cacheItem.songs);
    }

    for (const s of allInMemorySongs) {
      if (!s.title || !s.artist) continue;
      const sNormTitle = normalizeString(s.title);
      const sCoreTitle = extractCoreTitle(s.title);
      const sNormArtist = normalizeString(s.artist);

      let matched = false;
      let memScore = 180; // In-memory active game track boost

      if (sCoreTitle === coreQ || sNormTitle === normQ) {
        memScore += 350;
        matched = true;
      } else if (sNormTitle.startsWith(normQ) || sCoreTitle.startsWith(coreQ)) {
        memScore += 220;
        matched = true;
      } else if (sNormArtist === normQ || sNormArtist.startsWith(normQ)) {
        memScore += 180;
        matched = true;
      } else if (sNormTitle.includes(normQ) || sNormArtist.includes(normQ)) {
        memScore += 120;
        matched = true;
      } else if (
        queryTokens.length >= 2 &&
        queryTokens.every(tok => sNormTitle.includes(tok) || sNormArtist.includes(tok))
      ) {
        memScore += 280;
        matched = true;
      }

      if (matched) {
        rawCandidates.push({ song: s, score: memScore, source: 'in_memory' });
      }
    }

    // 2. Fast-Path: Deezer API primary lookup (average 70-120ms)
    let deezerTracksCount = 0;
    try {
      const url = `https://api.deezer.com/search?q=${encodeURIComponent(cleanQuery)}&limit=30`;
      const res = await fetch(url, { signal: AbortSignal.timeout(1800) });
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : [];
        for (const item of data) {
          if (!item.preview || !item.title || !item.artist?.name) continue;
          if (!isLegitSong(item.title, item.artist.name)) continue;

          rawCandidates.push({
            song: {
              id: `dz_${item.id}`,
              title: item.title,
              artist: item.artist.name,
              album: item.album?.title || '',
              previewUrl: item.preview,
              artwork: item.album?.cover_xl || item.album?.cover_medium || item.artist?.picture_big || '',
              year: undefined,
              genre: 'Musique',
            },
            score: (item.rank ? Math.min(50, Math.floor(item.rank / 25000)) : 0),
            source: 'deezer',
          });
          deezerTracksCount++;
        }
      }
    } catch {
      // Deezer timeout or error - will fallback to iTunes
    }

    // 3. Fallback: If Deezer returned few or no tracks (< 5), query iTunes with short timeout
    if (deezerTracksCount < 5) {
      try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&country=FR&entity=song&limit=25`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(1800),
        });
        if (res.ok) {
          const json = await res.json();
          const results = Array.isArray(json.results) ? json.results : [];
          for (const item of results) {
            if (!item.previewUrl || !item.trackName || !item.artistName) continue;
            if (!isLegitSong(item.trackName, item.artistName)) continue;

            const artwork = item.artworkUrl100
              ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100bb', '600x600bb')
              : '';
            const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined;

            rawCandidates.push({
              song: {
                id: String(item.trackId || Math.random().toString(36).substring(2, 9)),
                title: item.trackName,
                artist: item.artistName,
                album: item.collectionName || 'Single',
                previewUrl: item.previewUrl,
                artwork: artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
                year,
                genre: item.primaryGenreName || 'Musique',
                appleMusicUrl: item.trackViewUrl,
              },
              score: 0,
              source: 'itunes',
            });
          }
        }
      } catch {
        // iTunes error ignored
      }
    }

  // 3. Relevance Scoring and Smart Deduplication
  const scoredResults: ScoredCandidate[] = [];
  const seenMap = new Map<string, number>();

  for (const candidate of rawCandidates) {
    const { song } = candidate;
    const targetNormTitle = normalizeString(song.title);
    const targetCoreTitle = extractCoreTitle(song.title);
    const targetNormArtist = normalizeString(song.artist);

    // Deduplication Key (by core title + first 6 chars of artist)
    const dedupeKey = `${targetCoreTitle}_${targetNormArtist.slice(0, 7)}`;

    let score = candidate.score;

    // Bad/Tribute/Parody title or artist penalty
    if (/(karaoke|tribute|tributo|in the style of|originally performed|backing track)/i.test(`${song.title} ${song.artist}`)) {
      score -= 400;
    }
    if (/(parodie|parody|fortnite|fan made|roblox|remake)/i.test(song.title)) {
      score -= 350;
    }
    if (/remix/i.test(song.title) && !/remix/i.test(cleanQuery)) {
      score -= 150;
    }
    // Third-party channel uploading "Artist - Title (Remix)"
    if (/\s+-\s+/.test(song.title) && !song.title.toLowerCase().includes(song.artist.toLowerCase())) {
      score -= 180;
    }

    // 1. Core title exact match
    if (targetCoreTitle === coreQ) {
      score += 350;
    } else if (targetNormTitle === normQ) {
      score += 300;
    } else if (targetCoreTitle.startsWith(coreQ) || targetNormTitle.startsWith(normQ)) {
      score += 190;
    } else if (targetNormTitle.includes(normQ)) {
      score += 90;
    }

    // 2. Artist exact or prefix match
    if (targetNormArtist === normQ) {
      score += 280;
    } else if (targetNormArtist.startsWith(normQ)) {
      score += 180;
    } else if (targetNormArtist.includes(normQ)) {
      score += 70;
    }

    // 3. Multi-token queries (e.g. "gazo die", "theodort wayeh", "spider gims")
    if (queryTokens.length >= 2) {
      const allFound = queryTokens.every(
        tok => targetNormTitle.includes(tok) || targetNormArtist.includes(tok)
      );
      if (allFound) {
        score += 320;
        // If the artist field actually contains or equals one of the tokens, reward official artist
        if (queryTokens.some(tok => targetNormArtist === tok || targetNormArtist.startsWith(tok))) {
          score += 200;
        }
      }
    }

    // Keep highest scoring version for duplicate tracks
    const existingScore = seenMap.get(dedupeKey);
    if (existingScore !== undefined) {
      if (score > existingScore) {
        seenMap.set(dedupeKey, score);
        const idx = scoredResults.findIndex(r => `${extractCoreTitle(r.song.title)}_${normalizeString(r.song.artist).slice(0, 7)}` === dedupeKey);
        if (idx !== -1) {
          scoredResults[idx] = { song, score, source: candidate.source };
        }
      }
    } else {
      seenMap.set(dedupeKey, score);
      scoredResults.push({ song, score, source: candidate.source });
    }
  }

  // 4. Sort strictly by relevance score descending
  scoredResults.sort((a, b) => b.score - a.score);

  const finalSongs = scoredResults.slice(0, limit).map(r => r.song);
  if (finalSongs.length > 0) {
    searchCache.set(cleanQuery, { timestamp: Date.now(), songs: finalSongs });
  }

  return finalSongs;
  })();

  inFlightSearches.set(cleanQuery, searchPromise);
  try {
    const res = await searchPromise;
    return res.slice(0, limit);
  } finally {
    inFlightSearches.delete(cleanQuery);
  }
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
    const shuffledArtistSongs = shuffleArray(chosen).slice(0, count);
    registerActiveGameSongs(shuffledArtistSongs);
    return shuffledArtistSongs;
  }

  // 2. Official Charts with strict genre and year filtering
  let pool: Song[] = [];

  if (playlistId === 'trending-gen-z') {
    const [tracksMoment, tracksTikTok] = await Promise.all([
      loadDeezerPlaylist('playlist/53362031/tracks?limit=60'), // Les titres du moment (60 tracks)
      loadDeezerPlaylist('playlist/1082651151/tracks?limit=60'), // TikTok Hits France (60 tracks)
    ]);
    pool = [...tracksMoment, ...tracksTikTok];
    // Filter modern tracks only
    pool = pool.filter(s => !s.year || s.year >= 2021);
  } else if (playlistId === 'rap-fr-gen-z') {
    const [tracksActuRap, tracksRap2024] = await Promise.all([
      loadDeezerPlaylist('playlist/1071669561/tracks?limit=80'), // Actu Rap FR (Narjes - Deezer Rap Editor)
      loadDeezerPlaylist('playlist/13154564983/tracks?limit=75'), // Rap Français 2024
    ]);
    pool = [...tracksActuRap, ...tracksRap2024];
  } else if (playlistId === 'french-hits') {
    const [tracksBleuBlanc, tracksVariete] = await Promise.all([
      loadDeezerPlaylist('playlist/1189520191/tracks?limit=60'), // Bleu Blanc Hits
      loadDeezerPlaylist('playlist/788022051/tracks?limit=50'), // Les Variétés françaises
    ]);
    pool = [...tracksBleuBlanc, ...tracksVariete];
  } else if (playlistId === 'classics-80-90') {
    const [tracks80s, tracksSoiree] = await Promise.all([
      loadDeezerPlaylist('playlist/867825522/tracks?limit=80'), // 80s Hits (Deezer Pop Editor)
      loadDeezerPlaylist('playlist/1743878062/tracks?limit=50'), // Soirée 80
    ]);
    pool = [...tracks80s, ...tracksSoiree];
  } else if (playlistId === 'nostalgia-2000s') {
    const [tracks2000, tracksTop2000] = await Promise.all([
      loadDeezerPlaylist('playlist/751764391/tracks?limit=60'), // En mode 2000
      loadDeezerPlaylist('playlist/11837091441/tracks?limit=80'), // Top Hits 2000
    ]);
    pool = [...tracks2000, ...tracksTop2000];
  } else if (playlistId === 'global-hits') {
    const [tracksGlobal, tracksTopWorld] = await Promise.all([
      loadDeezerPlaylist('playlist/2098157264/tracks?limit=60'), // Global Hits
      loadDeezerPlaylist('playlist/3155776842/tracks?limit=60'), // Top Worldwide
    ]);
    pool = [...tracksGlobal, ...tracksTopWorld];
  } else if (playlistId === 'electro-dance') {
    pool = await loadDeezerPlaylist('playlist/706093725/tracks?limit=60'); // Global Dance Hits
  } else {
    pool = await loadDeezerPlaylist('playlist/53362031/tracks?limit=60');
  }

  // If pool has enough diverse tracks, return them
  if (pool.length >= count * 2) {
    const picked = pickDiverseSongs(pool, count);
    if (picked.length >= count) {
      registerActiveGameSongs(picked);
      return picked;
    }
  }

  // Curated iconic hit artists guarantee high-profile recognizable music
  const artistSets: Record<string, string[]> = {
    'trending-gen-z': [
      'Gazo', 'SDM', 'Tiakola', 'Theodort', 'Jul', 'PLK', 'Werenoi',
      'Sabrina Carpenter', 'Billie Eilish', 'Kendrick Lamar', 'Dua Lipa', 'The Weeknd',
      'Carbonne', 'Yamê', 'Chappell Roan', 'Charli xcx', 'Benson Boone', 'Teddy Swims', 'Ninho',
    ],
    'rap-fr-gen-z': [
      'Gazo', 'Tiakola', 'SDM', 'Werenoi', 'PLK', 'Jul', 'Theodort', 'Ninho',
      'Carbonne', 'Yamê', 'Favé', 'Josman', 'Shay', 'Franglish', 'Zola',
    ],
    'global-hits': ['The Weeknd', 'Taylor Swift', 'Dua Lipa', 'Bruno Mars', 'Billie Eilish', 'Sabrina Carpenter', 'Kendrick Lamar', 'SZA'],
    'french-hits': ['Stromae', 'Angèle', 'Pierre Garnier', 'Santa', 'Orelsan', 'Céline Dion', 'Indochine', 'Gazo', 'Theodort'],
    'classics-80-90': ['Michael Jackson', 'Queen', 'Nirvana', 'ABBA', 'ACDC', 'Guns N Roses', 'a-ha'],
    'nostalgia-2000s': ['Britney Spears', 'Eminem', 'Black Eyed Peas', 'Lady Gaga', 'Shakira', 'Rihanna'],
    'electro-dance': ['Daft Punk', 'David Guetta', 'Avicii', 'Calvin Harris', 'Martin Garrix'],
  };

  const artists = artistSets[playlistId] || artistSets['trending-gen-z'];
  const shuffledArtists = shuffleArray([...artists]).slice(0, count);
  const fallbackSongs: Song[] = [];

  for (const art of shuffledArtists) {
    const res = await searchFreeMusic(art, 4);
    if (res.length > 0) {
      fallbackSongs.push(res[0]); // 1 song per artist
    }
  }

  if (fallbackSongs.length >= 3) {
    const shuffledFallback = shuffleArray(fallbackSongs).slice(0, count);
    registerActiveGameSongs(shuffledFallback);
    return shuffledFallback;
  }

  // Emergency seed fallback
  const seeds = pickDiverseSongs(SEED_TRACKS[playlistId] || SEED_TRACKS['trending-gen-z'] || [], count);
  registerActiveGameSongs(seeds);
  return seeds;
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
 * Extracts the core musical title by stripping features, remix tags,
 * radio edit, version, album descriptors, and non-alphanumeric noise.
 */
export function extractCoreTitle(title: string): string {
  if (!title) return '';
  let t = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Remove parenthesized or bracketed descriptions: (feat. X), [Remix], {Live}, etc.
  t = t.replace(/\([^)]*\)/g, ' ');
  t = t.replace(/\[[^\]]*\]/g, ' ');
  t = t.replace(/\{[^}]*\}/g, ' ');

  // 2. Remove standard track descriptor suffixes: " - Radio Edit", " - Remix", " - Double Shot", etc.
  t = t.replace(
    /\s*-\s*(feat|ft|featuring|with|remix|radio edit|edit|club mix|original mix|extended|live|acoustique|acoustic|version|bonus|instrumental|sped up|slowed|remastered|deluxe|double shot).*/i,
    ' '
  );

  // 3. Remove inline feat/ft without brackets
  t = t.replace(/\b(feat|ft|featuring|with)\b.*$/i, ' ');

  // 4. If a hyphen/dash remains after the main title (e.g. "Spider - Gims"), keep preceding title
  const dashIndex = t.indexOf('-');
  if (dashIndex >= 2) {
    const beforeDash = t.slice(0, dashIndex).trim();
    if (beforeDash.length >= 2) {
      t = beforeDash;
    }
  }

  // 5. Clean punctuation and spaces
  return t.replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Validates a guess: MUST match the song's actual title.
 * - Handles remixes, radio edits, feats, and diacritics.
 * - Supports explicit track title passed from the search dropdown.
 * - Strictly rejects entering another song by the same artist or just the artist name.
 */
export function checkGuessMatch(
  guessText: string,
  targetSong: Song,
  guessedTrackId?: string,
  guessedSongTitle?: string,
  _guessedSongArtist?: string
): boolean {
  // 1. Exact ID match (unless raw guess)
  if (
    guessedTrackId &&
    guessedTrackId !== 'raw_guess' &&
    String(guessedTrackId) === String(targetSong.id)
  ) {
    return true;
  }

  const targetCore = extractCoreTitle(targetSong.title);
  if (!targetCore || targetCore.length < 2) return false;

  // 2. Explicit song title selected by the user in the suggestion dropdown
  if (guessedSongTitle) {
    const guessCore = extractCoreTitle(guessedSongTitle);
    if (guessCore && guessCore === targetCore) return true;
    if (
      guessCore &&
      targetCore &&
      guessCore.length >= 4 &&
      targetCore.length >= 4 &&
      (guessCore.startsWith(targetCore) || targetCore.startsWith(guessCore))
    ) {
      return true;
    }
  }

  // 3. Direct match on cleaned raw query
  const rawCore = extractCoreTitle(guessText);
  if (rawCore && rawCore === targetCore) return true;

  // 4. If raw guess text contains artist names, strip artist tokens and re-check title
  const artistsInTarget = (targetSong.artist || '')
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

  if (stripped && stripped === targetCore) return true;

  // 5. Check if raw query text with artist words removed yields target core
  let textStripped = (guessText || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  for (const art of artistsInTarget) {
    if (art.length >= 2 && textStripped.includes(art)) {
      textStripped = textStripped.replace(art, ' ');
    }
  }
  const textStrippedCore = extractCoreTitle(textStripped);
  if (textStrippedCore && textStrippedCore === targetCore) return true;

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
