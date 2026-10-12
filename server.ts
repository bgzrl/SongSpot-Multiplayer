import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PLAYLIST_PRESETS,
  searchFreeMusic,
  getGameSongs,
  checkGuessMatch,
  SEED_TRACKS,
} from './server/musicService.js';
import {
  Song,
  Player,
  GameSettings,
  RoomState,
  ChatMessage,
  LiveReaction,
  RoundScoreRecord,
} from './src/types/game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ConnectedPlayer {
  ws: WebSocket;
  player: Player;
}

interface Room {
  id: string;
  hostId: string;
  settings: GameSettings;
  status: 'lobby' | 'playing' | 'round_end' | 'game_over';
  players: Map<string, ConnectedPlayer>;
  currentRound: number;
  songs: Song[];
  currentSong: Song | null;
  roundStartTime: number;
  roundTimeLeft: number;
  roundTimer: NodeJS.Timeout | null;
  tickerTimer: NodeJS.Timeout | null;
  nextRoundTimer: NodeJS.Timeout | null;
  roundGuesses: Map<string, { isCorrect: boolean; step: number; points: number; timeSec: number }>;
  chatMessages: ChatMessage[];
}

const rooms = new Map<string, Room>();

const AVATARS = ['🎧', '🎸', '🎹', '🥁', '🎷', '🎺', '🎤', '💿', '🔥', '⚡', '🌟', '👾'];
const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function getSanitizedRoomState(room: Room): RoomState {
  const playersList: Player[] = Array.from(room.players.values()).map(cp => ({ ...cp.player }));

  let currentSongHint = undefined;
  if (room.currentSong && (room.status === 'playing' || room.status === 'round_end')) {
    currentSongHint = {
      id: room.currentSong.id,
      previewUrl: room.currentSong.previewUrl,
      genre: room.currentSong.genre,
      era: room.currentSong.year ? `${Math.floor(room.currentSong.year / 10) * 10}s (${room.currentSong.year})` : undefined,
      duration: 30,
    };
  }

  const roundScores: RoundScoreRecord[] = [];
  if (room.status === 'round_end' || room.status === 'game_over') {
    for (const [playerId, rec] of room.roundGuesses.entries()) {
      const p = room.players.get(playerId)?.player;
      if (p) {
        roundScores.push({
          playerId,
          playerName: p.nickname,
          playerAvatar: p.avatar,
          playerColor: p.color,
          points: rec.points,
          step: rec.step,
          isCorrect: rec.isCorrect,
          timeSec: rec.timeSec,
        });
      }
    }
    // Sort round scores descending
    roundScores.sort((a, b) => b.points - a.points);
  }

  return {
    roomId: room.id,
    status: room.status,
    players: playersList,
    hostId: room.hostId,
    settings: room.settings,
    currentRound: room.currentRound,
    totalRounds: room.settings.totalRounds,
    roundTimeLeft: room.roundTimeLeft,
    currentSongHint,
    revealedSong: (room.status === 'round_end' || room.status === 'game_over') ? (room.currentSong || undefined) : undefined,
    roundScores,
  };
}

function broadcastToRoom(room: Room, type: string, payload: any) {
  const data = JSON.stringify({ type, payload });
  for (const cp of room.players.values()) {
    if (cp.ws.readyState === WebSocket.OPEN) {
      cp.ws.send(data);
    }
  }
}

function sendToPlayer(ws: WebSocket, type: string, payload: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function calculatePoints(step: number, timeLeftSec: number, totalTimeSec: number): number {
  // Step points (1st step = 1000, 2nd = 800, 3rd = 600, 4th = 450, 5th = 300, 6th = 150)
  const basePointsMap: Record<number, number> = {
    1: 1000,
    2: 800,
    3: 600,
    4: 450,
    5: 300,
    6: 150,
  };
  const base = basePointsMap[step] || 100;
  // Speed bonus up to 150 pts
  const speedBonus = Math.floor((Math.max(0, timeLeftSec) / Math.max(1, totalTimeSec)) * 150);
  return base + speedBonus;
}

function endRound(room: Room) {
  if (room.status !== 'playing') return;

  if (room.roundTimer) clearTimeout(room.roundTimer);
  if (room.tickerTimer) clearInterval(room.tickerTimer);
  room.roundTimer = null;
  room.tickerTimer = null;

  room.status = 'round_end';

  // Mark players who didn't guess as missed
  for (const [playerId, cp] of room.players.entries()) {
    if (!room.roundGuesses.has(playerId)) {
      room.roundGuesses.set(playerId, {
        isCorrect: false,
        step: 6,
        points: 0,
        timeSec: room.settings.roundDurationSec,
      });
      cp.player.pointsEarnedThisRound = 0;
    }
  }

  broadcastToRoom(room, 'room:update', getSanitizedRoomState(room));

  // Auto proceed after 5.5 seconds if not skipped manually
  if (room.nextRoundTimer) clearTimeout(room.nextRoundTimer);
  room.nextRoundTimer = setTimeout(() => {
    if (room.currentRound >= room.settings.totalRounds) {
      endGame(room);
    } else {
      startNextRound(room);
    }
  }, 5500);
}

function endGame(room: Room) {
  if (room.roundTimer) clearTimeout(room.roundTimer);
  if (room.tickerTimer) clearInterval(room.tickerTimer);
  if (room.nextRoundTimer) clearTimeout(room.nextRoundTimer);

  room.status = 'game_over';
  broadcastToRoom(room, 'room:update', getSanitizedRoomState(room));
}

async function startNextRound(room: Room) {
  if (room.nextRoundTimer) clearTimeout(room.nextRoundTimer);
  room.nextRoundTimer = null;

  room.currentRound += 1;
  room.roundGuesses.clear();
  room.roundTimeLeft = room.settings.roundDurationSec;
  room.roundStartTime = Date.now();

  const songIndex = room.currentRound - 1;
  room.currentSong = room.songs[songIndex] || room.songs[0];

  // Reset player round flags
  for (const cp of room.players.values()) {
    cp.player.hasGuessed = false;
    cp.player.currentStep = 1;
    cp.player.pointsEarnedThisRound = 0;
  }

  room.status = 'playing';

  // Broadcast sanitized state
  broadcastToRoom(room, 'room:update', getSanitizedRoomState(room));

  // Start round countdown ticker
  if (room.tickerTimer) clearInterval(room.tickerTimer);
  room.tickerTimer = setInterval(() => {
    room.roundTimeLeft -= 1;
    if (room.roundTimeLeft <= 0) {
      clearInterval(room.tickerTimer!);
      room.tickerTimer = null;
      endRound(room);
    } else {
      // Broadcast time sync every 2 seconds or when <= 5
      if (room.roundTimeLeft % 2 === 0 || room.roundTimeLeft <= 5) {
        broadcastToRoom(room, 'round:tick', { timeLeft: room.roundTimeLeft });
      }
    }
  }, 1000);

  if (room.roundTimer) clearTimeout(room.roundTimer);
  room.roundTimer = setTimeout(() => {
    endRound(room);
  }, room.settings.roundDurationSec * 1000);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // API endpoints
  app.get('/api/music/search', async (req, res) => {
    const q = req.query.q as string;
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }
    const limit = Math.min(Number(req.query.limit) || 12, 30);
    const results = await searchFreeMusic(q, limit);
    res.json(results);
  });

  app.get('/api/music/playlists', (_req, res) => {
    res.json(PLAYLIST_PRESETS);
  });

  app.get('/api/music/solo-songs', async (req, res) => {
    const playlistId = (req.query.playlist as string) || 'trending-gen-z';
    const custom = (req.query.artist as string) || (req.query.custom as string);
    const count = Math.min(Number(req.query.count) || 10, 20);
    const songs = await getGameSongs(playlistId, count, custom);
    res.json({ songs, count: songs.length });
  });

  // Audio Proxy endpoint to bypass strict CORS / referrer policies in production
  app.get('/api/music/proxy-audio', async (req, res) => {
    const audioUrl = req.query.url as string;
    if (!audioUrl || !audioUrl.startsWith('http')) {
      return res.status(400).send('Invalid audio URL');
    }

    try {
      const upstreamRes = await fetch(audioUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
      });

      if (!upstreamRes.ok) {
        return res.status(upstreamRes.status).send('Upstream audio fetch failed');
      }

      res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'audio/mpeg');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      const arrayBuffer = await upstreamRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.warn('Audio proxy error:', err);
      res.status(502).send('Error proxying audio');
    }
  });

  // WebSocket Server
  wss.on('connection', (ws: WebSocket) => {
    let currentRoomId: string | null = null;
    let playerId: string | null = null;

    ws.on('message', async (rawMsg: string) => {
      try {
        const { type, payload } = JSON.parse(rawMsg.toString());

        switch (type) {
          case 'room:create': {
            const roomId = generateRoomCode();
            playerId = `p_${Math.random().toString(36).substring(2, 9)}`;
            currentRoomId = roomId;

            const player: Player = {
              id: playerId,
              nickname: (payload.nickname || 'Music Lover').trim().slice(0, 16) || 'Player',
              avatar: payload.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)],
              color: payload.color || COLORS[Math.floor(Math.random() * COLORS.length)],
              score: 0,
              isHost: true,
              isReady: true,
              hasGuessed: false,
              currentStep: 1,
              pointsEarnedThisRound: 0,
              connected: true,
            };

            const initialSettings: GameSettings = {
              totalRounds: 5,
              roundDurationSec: 45,
              playlistId: payload.playlistId || 'trending-gen-z',
              playlistName: payload.playlistName || '🔥 Tendances Gen Z & TikTok 2024-2026',
              snippetSteps: [1.0, 2.0, 4.0, 7.0, 11.0, 16.0],
              customArtist: payload.customArtist || '',
            };

            const room: Room = {
              id: roomId,
              hostId: playerId,
              settings: initialSettings,
              status: 'lobby',
              players: new Map([[playerId, { ws, player }]]),
              currentRound: 0,
              songs: [],
              currentSong: null,
              roundStartTime: 0,
              roundTimeLeft: initialSettings.roundDurationSec,
              roundTimer: null,
              tickerTimer: null,
              nextRoundTimer: null,
              roundGuesses: new Map(),
              chatMessages: [
                {
                  id: `sys_${Date.now()}`,
                  senderId: 'system',
                  senderName: 'Système',
                  senderColor: '#6366f1',
                  text: `Bienvenue dans la salle ${roomId} ! Partagez le code avec vos amis.`,
                  timestamp: Date.now(),
                  isSystem: true,
                },
              ],
            };

            rooms.set(roomId, room);

            sendToPlayer(ws, 'room:joined', {
              roomId,
              playerId,
              state: getSanitizedRoomState(room),
              messages: room.chatMessages,
            });
            break;
          }

          case 'room:join': {
            const targetRoomId = (payload.roomId || '').toUpperCase().trim();
            const room = rooms.get(targetRoomId);

            if (!room) {
              sendToPlayer(ws, 'error', { message: 'Salle introuvable ou expirée' });
              return;
            }

            if (room.status !== 'lobby') {
              sendToPlayer(ws, 'error', { message: 'Partie déjà en cours dans cette salle' });
              return;
            }

            playerId = `p_${Math.random().toString(36).substring(2, 9)}`;
            currentRoomId = targetRoomId;

            const newPlayer: Player = {
              id: playerId,
              nickname: (payload.nickname || 'Music Lover').trim().slice(0, 16) || 'Player',
              avatar: payload.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)],
              color: payload.color || COLORS[Math.floor(Math.random() * COLORS.length)],
              score: 0,
              isHost: false,
              isReady: false,
              hasGuessed: false,
              currentStep: 1,
              pointsEarnedThisRound: 0,
              connected: true,
            };

            room.players.set(playerId, { ws, player: newPlayer });

            const joinMsg: ChatMessage = {
              id: `sys_${Date.now()}`,
              senderId: 'system',
              senderName: 'Système',
              senderColor: '#10b981',
              text: `${newPlayer.nickname} a rejoint la partie ! 🎵`,
              timestamp: Date.now(),
              isSystem: true,
            };
            room.chatMessages.push(joinMsg);

            sendToPlayer(ws, 'room:joined', {
              roomId: targetRoomId,
              playerId,
              state: getSanitizedRoomState(room),
              messages: room.chatMessages,
            });

            broadcastToRoom(room, 'player:joined', {
              player: newPlayer,
              state: getSanitizedRoomState(room),
              message: joinMsg,
            });
            break;
          }

          case 'room:update_settings': {
            if (!currentRoomId || !playerId) return;
            const room = rooms.get(currentRoomId);
            if (!room || room.hostId !== playerId || room.status !== 'lobby') return;

            room.settings = { ...room.settings, ...payload.settings };
            broadcastToRoom(room, 'room:update', getSanitizedRoomState(room));
            break;
          }

          case 'player:toggle_ready': {
            if (!currentRoomId || !playerId) return;
            const room = rooms.get(currentRoomId);
            if (!room) return;

            const cp = room.players.get(playerId);
            if (cp) {
              cp.player.isReady = !cp.player.isReady;
              broadcastToRoom(room, 'room:update', getSanitizedRoomState(room));
            }
            break;
          }

          case 'game:start': {
            if (!currentRoomId || !playerId) return;
            const room = rooms.get(currentRoomId);
            if (!room || room.hostId !== playerId || room.status !== 'lobby') return;

            broadcastToRoom(room, 'game:starting', { message: 'Chargement des titres musicaux...' });

            // Fetch songs for the game
            const songs = await getGameSongs(
              room.settings.playlistId,
              room.settings.totalRounds,
              room.settings.customArtist
            );

            if (!songs || songs.length === 0) {
              sendToPlayer(ws, 'error', { message: 'Impossible de charger la playlist' });
              return;
            }

            room.songs = songs;
            room.currentRound = 0;
            // Reset player scores
            for (const cp of room.players.values()) {
              cp.player.score = 0;
              cp.player.hasGuessed = false;
              cp.player.currentStep = 1;
            }

            await startNextRound(room);
            break;
          }

          case 'player:guess': {
            if (!currentRoomId || !playerId) return;
            const room = rooms.get(currentRoomId);
            if (!room || room.status !== 'playing' || !room.currentSong) return;

            const cp = room.players.get(playerId);
            if (!cp || cp.player.hasGuessed) return;

            const { guessText, guessedTrackId, step } = payload;
            const isMatch = checkGuessMatch(guessText, room.currentSong, guessedTrackId);

            if (isMatch) {
              const elapsedSec = (Date.now() - room.roundStartTime) / 1000;
              const points = calculatePoints(step, room.roundTimeLeft, room.settings.roundDurationSec);

              cp.player.score += points;
              cp.player.hasGuessed = true;
              cp.player.currentStep = step;
              cp.player.pointsEarnedThisRound = points;

              room.roundGuesses.set(playerId, {
                isCorrect: true,
                step,
                points,
                timeSec: Math.round(elapsedSec * 10) / 10,
              });

              // Send private victory payload to the guesser including full song
              sendToPlayer(ws, 'guess:result', {
                correct: true,
                points,
                step,
                song: room.currentSong,
              });

              // Broadcast announcement to all
              broadcastToRoom(room, 'player:guessed', {
                playerId,
                playerName: cp.player.nickname,
                playerAvatar: cp.player.avatar,
                playerScore: cp.player.score,
                points,
                step,
                state: getSanitizedRoomState(room),
              });

              // Check if all players have guessed
              const allGuessed = Array.from(room.players.values()).every(p => p.player.hasGuessed);
              if (allGuessed) {
                endRound(room);
              }
            } else {
              // Incorrect guess
              const nextStep = Math.min(step + 1, 6);
              cp.player.currentStep = nextStep;

              sendToPlayer(ws, 'guess:result', {
                correct: false,
                step: nextStep,
                skipped: false,
              });

              const updatedState = getSanitizedRoomState(room);
              broadcastToRoom(room, 'player:step_update', {
                playerId,
                step: nextStep,
                state: updatedState,
              });
              broadcastToRoom(room, 'room:update', updatedState);
            }
            break;
          }

          case 'player:give_up':
          case 'player:skip': {
            if (!currentRoomId || !playerId) return;
            const room = rooms.get(currentRoomId);
            if (!room || room.status !== 'playing') return;

            const cp = room.players.get(playerId);
            if (!cp || cp.player.hasGuessed) return;

            const isGivingUp = type === 'player:give_up' || (payload.currentStep && payload.currentStep >= 6) || cp.player.currentStep >= 6;

            if (isGivingUp) {
              cp.player.hasGuessed = true;
              cp.player.currentStep = 6;
              cp.player.pointsEarnedThisRound = 0;

              room.roundGuesses.set(playerId, {
                isCorrect: false,
                step: 6,
                points: 0,
                timeSec: Math.round(((Date.now() - room.roundStartTime) / 1000) * 10) / 10,
              });

              sendToPlayer(ws, 'guess:result', {
                correct: false,
                step: 6,
                givenUp: true,
              });

              const updatedState = getSanitizedRoomState(room);
              broadcastToRoom(room, 'player:step_update', {
                playerId,
                step: 6,
                state: updatedState,
              });
              broadcastToRoom(room, 'room:update', updatedState);

              // If all players have guessed or given up, or if host finishes, end round
              const allDone = Array.from(room.players.values()).every(p => p.player.hasGuessed);
              if (allDone || room.hostId === playerId) {
                endRound(room);
              }
            } else {
              const nextStep = Math.min(payload.currentStep + 1, 6);
              cp.player.currentStep = nextStep;

              sendToPlayer(ws, 'guess:result', {
                correct: false,
                step: nextStep,
                skipped: true,
              });

              const updatedState = getSanitizedRoomState(room);
              broadcastToRoom(room, 'player:step_update', {
                playerId,
                step: nextStep,
                state: updatedState,
              });
              broadcastToRoom(room, 'room:update', updatedState);
            }
            break;
          }

          case 'chat:send': {
            if (!currentRoomId || !playerId) return;
            const room = rooms.get(currentRoomId);
            if (!room) return;

            const cp = room.players.get(playerId);
            if (!cp) return;

            const text = (payload.text || '').trim().slice(0, 200);
            if (!text) return;

            const chatMsg: ChatMessage = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              senderId: playerId,
              senderName: cp.player.nickname,
              senderColor: cp.player.color,
              text,
              timestamp: Date.now(),
            };

            room.chatMessages.push(chatMsg);
            if (room.chatMessages.length > 50) room.chatMessages.shift();

            broadcastToRoom(room, 'chat:message', chatMsg);
            break;
          }

          case 'player:react': {
            if (!currentRoomId || !playerId) return;
            const room = rooms.get(currentRoomId);
            if (!room) return;

            const cp = room.players.get(playerId);
            if (!cp) return;

            const reaction: LiveReaction = {
              id: `react_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              senderName: cp.player.nickname,
              emoji: payload.emoji || '🎵',
              timestamp: Date.now(),
            };

            broadcastToRoom(room, 'player:reaction', reaction);
            break;
          }

          case 'round:next': {
            if (!currentRoomId) return;
            const room = rooms.get(currentRoomId);
            if (!room) return;

            // If in round_end: proceed immediately to next round or game over
            if (room.status === 'round_end') {
              if (room.nextRoundTimer) {
                clearTimeout(room.nextRoundTimer);
                room.nextRoundTimer = null;
              }
              if (room.currentRound >= room.settings.totalRounds) {
                endGame(room);
              } else {
                startNextRound(room);
              }
            } else if (room.status === 'playing' && room.hostId === playerId) {
              // Host can skip remaining active round time if players are done
              endRound(room);
            }
            break;
          }

          case 'room:play_again': {
            if (!currentRoomId || !playerId) return;
            const room = rooms.get(currentRoomId);
            if (!room || room.hostId !== playerId) return;

            room.status = 'lobby';
            room.currentRound = 0;
            room.songs = [];
            room.currentSong = null;
            for (const cp of room.players.values()) {
              cp.player.score = 0;
              cp.player.hasGuessed = false;
              cp.player.currentStep = 1;
              cp.player.isReady = cp.player.id === room.hostId;
            }

            broadcastToRoom(room, 'room:update', getSanitizedRoomState(room));
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomId && playerId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          const leavingPlayer = room.players.get(playerId)?.player;
          room.players.delete(playerId);

          if (room.players.size === 0) {
            if (room.roundTimer) clearTimeout(room.roundTimer);
            if (room.tickerTimer) clearInterval(room.tickerTimer);
            if (room.nextRoundTimer) clearTimeout(room.nextRoundTimer);
            rooms.delete(currentRoomId);
          } else {
            // Reassign host if host left
            if (room.hostId === playerId) {
              const nextHost = Array.from(room.players.values())[0];
              if (nextHost) {
                room.hostId = nextHost.player.id;
                nextHost.player.isHost = true;
              }
            }

            const leaveMsg: ChatMessage = {
              id: `sys_${Date.now()}`,
              senderId: 'system',
              senderName: 'Système',
              senderColor: '#ef4444',
              text: `${leavingPlayer?.nickname || 'Un joueur'} a quitté la salle.`,
              timestamp: Date.now(),
              isSystem: true,
            };
            room.chatMessages.push(leaveMsg);

            broadcastToRoom(room, 'player:left', {
              playerId,
              state: getSanitizedRoomState(room),
              message: leaveMsg,
            });

            // If in active round and remaining players all finished, end round
            if (room.status === 'playing') {
              const allGuessed = Array.from(room.players.values()).every(p => p.player.hasGuessed);
              if (allGuessed) {
                endRound(room);
              }
            }
          }
        }
      }
    });
  });

  // Mount Vite middleware in development or serve static in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SongSpot Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
