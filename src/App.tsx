import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { GameRound } from './components/GameRound';
import { RoundResultsModal } from './components/RoundResultsModal';
import { GamePodium } from './components/GamePodium';
import { ChatAndReactions } from './components/ChatAndReactions';
import { SoloGame } from './components/SoloGame';
import {
  RoomState,
  Song,
  ChatMessage,
  LiveReaction,
  PlaylistInfo,
} from './types/game';
import { soundFX } from './services/soundEffects';
import confetti from 'canvas-confetti';
import {
  Users,
  PlusCircle,
  LogIn,
  Music,
  Flame,
  Radio,
  Share2,
  Check,
  Disc,
} from 'lucide-react';

const AVATAR_LIST = ['🎧', '🎸', '🎹', '🥁', '🎷', '🎺', '🎤', '💿', '🔥', '⚡', '🌟', '👾'];
const COLOR_LIST = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'multiplayer' | 'solo'>('multiplayer');

  // User Profile
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('songspot_nickname') || `Mélomane${Math.floor(Math.random() * 900 + 100)}`;
  });
  const [avatar, setAvatar] = useState(() => {
    return localStorage.getItem('songspot_avatar') || AVATAR_LIST[Math.floor(Math.random() * AVATAR_LIST.length)];
  });
  const [color, setColor] = useState(() => {
    return localStorage.getItem('songspot_color') || COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)];
  });

  // Room & WebSocket state
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [liveReactions, setLiveReactions] = useState<LiveReaction[]>([]);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [selectedLobbyPlaylist, setSelectedLobbyPlaylist] = useState('trending-gen-z');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);

  // Save profile changes
  useEffect(() => {
    localStorage.setItem('songspot_nickname', nickname);
    localStorage.setItem('songspot_avatar', avatar);
    localStorage.setItem('songspot_color', color);
  }, [nickname, avatar, color]);

  // Load playlists presets
  useEffect(() => {
    fetch('/api/music/playlists')
      .then(res => res.json())
      .then(data => setPlaylists(data))
      .catch(err => console.error('Error fetching playlists:', err));
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onclose = () => {
        setIsConnected(false);
        // Attempt reconnection after 2.5 seconds
        reconnectTimer = setTimeout(connect, 2500);
      };

      socket.onerror = (err) => {
        console.warn('WebSocket error:', err);
      };

      socket.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);

          switch (type) {
            case 'room:joined':
              setPlayerId(payload.playerId);
              setRoomState(payload.state);
              if (payload.messages) setChatMessages(payload.messages);
              // Update URL hash with room code
              window.location.hash = `room=${payload.roomId}`;
              showToast(`Connecté à la salle ${payload.roomId} !`, 'success');
              soundFX.playClick();
              break;

            case 'room:update':
              setRoomState(payload);
              break;

            case 'round:tick':
              setRoomState(prev => prev ? { ...prev, roundTimeLeft: payload.timeLeft } : null);
              if (payload.timeLeft <= 5 && payload.timeLeft > 0) {
                soundFX.playTick();
              }
              break;

            case 'player:joined':
              setRoomState(payload.state);
              if (payload.message) {
                setChatMessages(prev => [...prev, payload.message]);
              }
              soundFX.playClick();
              showToast(`${payload.player.nickname} a rejoint la salle !`, 'info');
              break;

            case 'player:left':
              setRoomState(payload.state);
              if (payload.message) {
                setChatMessages(prev => [...prev, payload.message]);
              }
              break;

            case 'player:guessed':
              setRoomState(payload.state);
              if (payload.playerId !== playerId) {
                soundFX.playTick();
                showToast(`🎉 ${payload.playerName} a trouvé la chanson (+${payload.points} pts) !`, 'success');
              }
              break;

            case 'player:step_update':
              if (payload.state) {
                setRoomState(payload.state);
              } else {
                setRoomState(prev => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    players: prev.players.map(p =>
                      p.id === payload.playerId ? { ...p, currentStep: payload.step } : p
                    ),
                  };
                });
              }
              break;

            case 'guess:result':
              if (payload.correct) {
                soundFX.playCorrect();
                confetti({
                  particleCount: 80,
                  spread: 70,
                  origin: { y: 0.6 },
                });
                showToast(`🎉 Excellent ! Chanson trouvée (+${payload.points} pts)`, 'success');
              } else if (payload.givenUp) {
                soundFX.playClick();
                showToast('🏳️ Manche terminée, révélation de la chanson !', 'info');
              } else if (payload.skipped) {
                soundFX.playClick();
                showToast(`⏩ Extrait ${payload.step}/6 débloqué`, 'info');
              } else {
                soundFX.playWrong();
                showToast(`❌ Pas tout à fait... Extrait ${payload.step}/6 débloqué`, 'error');
              }

              if (payload.step && playerId) {
                setRoomState(prev => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    players: prev.players.map(p =>
                      p.id === playerId ? { ...p, currentStep: payload.step } : p
                    ),
                  };
                });
              }
              break;

            case 'chat:message':
              setChatMessages(prev => [...prev, payload]);
              break;

            case 'player:reaction':
              setLiveReactions(prev => [...prev, payload]);
              // Remove reaction after 3 seconds
              setTimeout(() => {
                setLiveReactions(prev => prev.filter(r => r.id !== payload.id));
              }, 3000);
              break;

            case 'error':
              showToast(payload.message || 'Une erreur est survenue', 'error');
              break;
          }
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      setWs(socket);
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, []);

  // Parse URL hash for room code on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('room=')) {
      const match = hash.match(/room=([A-Za-z0-9]+)/);
      if (match && match[1]) {
        setJoinCodeInput(match[1].toUpperCase());
      }
    }
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Multiplayer Actions
  const handleCreateRoom = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      showToast('Connexion au serveur en cours...', 'error');
      return;
    }

    const selectedPl = playlists.find(p => p.id === selectedLobbyPlaylist);
    ws.send(JSON.stringify({
      type: 'room:create',
      payload: {
        nickname,
        avatar,
        color,
        playlistId: selectedLobbyPlaylist,
        playlistName: selectedPl?.name || '🔥 Tendances Gen Z & TikTok 2024-2026',
      },
    }));
  };

  const handleJoinRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!joinCodeInput.trim()) return;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      showToast('Connexion au serveur en cours...', 'error');
      return;
    }

    ws.send(JSON.stringify({
      type: 'room:join',
      payload: {
        roomId: joinCodeInput.trim().toUpperCase(),
        nickname,
        avatar,
        color,
      },
    }));
  };

  const handleStartGame = () => {
    if (!ws || !roomState) return;
    ws.send(JSON.stringify({ type: 'game:start' }));
  };

  const handleToggleReady = () => {
    if (!ws || !roomState) return;
    ws.send(JSON.stringify({ type: 'player:toggle_ready' }));
  };

  const handleUpdateSettings = (settings: Partial<RoomState['settings']>) => {
    if (!ws || !roomState) return;
    ws.send(JSON.stringify({
      type: 'room:update_settings',
      payload: { settings },
    }));
  };

  const handleGuess = (song: Song, queryText: string) => {
    if (!ws || !roomState || !playerId) return;
    const me = roomState.players.find(p => p.id === playerId);
    const step = me?.currentStep || 1;

    ws.send(JSON.stringify({
      type: 'player:guess',
      payload: {
        guessText: queryText,
        guessedTrackId: song.id,
        step,
      },
    }));
  };

  const handleSkip = () => {
    if (!ws || !roomState || !playerId) return;
    const me = roomState.players.find(p => p.id === playerId);
    const currentStep = me?.currentStep || 1;

    ws.send(JSON.stringify({
      type: currentStep >= 6 ? 'player:give_up' : 'player:skip',
      payload: { currentStep },
    }));
  };

  const handleSendMessage = (text: string) => {
    if (!ws || !roomState) return;
    ws.send(JSON.stringify({
      type: 'chat:send',
      payload: { text },
    }));
  };

  const handleSendReaction = (emoji: string) => {
    if (!ws || !roomState) return;
    ws.send(JSON.stringify({
      type: 'player:react',
      payload: { emoji },
    }));
  };

  const handleNextRound = () => {
    if (!ws || !roomState) return;
    ws.send(JSON.stringify({ type: 'round:next' }));
  };

  const handlePlayAgain = () => {
    if (!ws || !roomState) return;
    ws.send(JSON.stringify({ type: 'room:play_again' }));
  };

  const handleLeaveRoom = () => {
    window.location.hash = '';
    setRoomState(null);
    setPlayerId(null);
    setChatMessages([]);
  };

  const handleReturnHome = () => {
    if (roomState && ws) {
      ws.send(JSON.stringify({ type: 'leave_room' }));
    }
    setRoomState(null);
    setActiveTab('multiplayer');
    setToastMessage({ text: 'Retour à l’accueil', type: 'info' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold border backdrop-blur-md flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500/90 text-slate-950 border-emerald-400'
                : toastMessage.type === 'error'
                ? 'bg-rose-500/90 text-white border-rose-400'
                : 'bg-slate-900/90 text-white border-slate-700'
            }`}
          >
            {toastMessage.text}
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        currentTab={activeTab}
        onTabChange={tab => {
          setActiveTab(tab);
        }}
        isConnected={isConnected}
        onHomeClick={handleReturnHome}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {activeTab === 'solo' ? (
          <SoloGame playlists={playlists} />
        ) : roomState ? (
          /* Active Multiplayer Session */
          <div className="space-y-6">
            {roomState.status === 'lobby' && (
              <MultiplayerLobby
                roomState={roomState}
                currentUserId={playerId || ''}
                playlists={playlists}
                onStartGame={handleStartGame}
                onToggleReady={handleToggleReady}
                onUpdateSettings={handleUpdateSettings}
              />
            )}

            {roomState.status === 'playing' && (
              <GameRound
                roomState={roomState}
                currentUserId={playerId || ''}
                onGuess={handleGuess}
                onSkip={handleSkip}
                onForceEndRound={handleNextRound}
              />
            )}

            {roomState.status === 'round_end' && roomState.revealedSong && (
              <RoundResultsModal
                song={roomState.revealedSong}
                roundScores={roomState.roundScores}
                currentRound={roomState.currentRound}
                totalRounds={roomState.totalRounds}
                isHost={roomState.hostId === playerId}
                onNextRound={handleNextRound}
              />
            )}

            {roomState.status === 'game_over' && (
              <GamePodium
                players={roomState.players}
                isHost={roomState.hostId === playerId}
                onPlayAgain={handlePlayAgain}
                onLeave={handleLeaveRoom}
              />
            )}

            {/* Persistent In-Room Chat & Live Reactions */}
            <ChatAndReactions
              messages={chatMessages}
              reactions={liveReactions}
              onSendMessage={handleSendMessage}
              onSendReaction={handleSendReaction}
              currentUserId={playerId || ''}
            />
          </div>
        ) : (
          /* Multiplayer Home (Profile setup, Create or Join Room) */
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Direct, Clean Title */}
            <div className="text-center space-y-2 pt-2">
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Blind test musical multijoueur
              </h1>
              <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
                Écoutez une fraction de seconde et devinez le morceau en direct avec vos amis.
              </p>
            </div>

            {/* User Profile Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Votre profil joueur
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Avatar Display */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 border"
                  style={{
                    backgroundColor: `${color}20`,
                    borderColor: `${color}60`,
                  }}
                >
                  {avatar}
                </div>

                <div className="flex-1 w-full space-y-3">
                  {/* Nickname input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Pseudo
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      maxLength={16}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-white font-semibold text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {/* Avatar Picker */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Avatar
                    </label>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {AVATAR_LIST.map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setAvatar(em)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all cursor-pointer ${
                            avatar === em
                              ? 'bg-emerald-500 text-slate-950 scale-105 shadow-md font-bold'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Create Room vs Join Room Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Create Room */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-slate-700/80 transition-colors">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white mb-1">
                    Créer une partie
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm mb-5">
                    Choisissez la playlist, invitez vos amis avec le code et lancez le jeu.
                  </p>

                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-slate-400 mb-2">
                      Playlist de départ
                    </label>
                    <div className="space-y-1.5">
                      {playlists.slice(0, 4).map(pl => (
                        <button
                          key={pl.id}
                          type="button"
                          onClick={() => setSelectedLobbyPlaylist(pl.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            selectedLobbyPlaylist === pl.id
                              ? 'bg-indigo-600/20 border-indigo-500/60 text-white font-bold'
                              : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                          }`}
                        >
                          <span>{pl.icon} {pl.name}</span>
                          {selectedLobbyPlaylist === pl.id && <Check className="w-4 h-4 text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateRoom}
                  type="button"
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Radio className="w-4 h-4" /> Créer un salon
                </button>
              </div>

              {/* Join Room */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-slate-700/80 transition-colors">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                    <LogIn className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white mb-1">
                    Rejoindre une partie
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm mb-5">
                    Entrez le code à 6 lettres partagé par l’hôte pour entrer dans le salon.
                  </p>

                  <form onSubmit={handleJoinRoom} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Code du salon
                      </label>
                      <input
                        type="text"
                        value={joinCodeInput}
                        onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                        maxLength={6}
                        placeholder="Ex: BEAT42"
                        className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-4 py-3 text-white font-extrabold text-center text-lg tracking-widest uppercase focus:outline-none transition-colors"
                      />
                    </div>
                  </form>
                </div>

                <button
                  onClick={() => handleJoinRoom()}
                  type="button"
                  disabled={!joinCodeInput.trim()}
                  className="w-full mt-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <LogIn className="w-4 h-4" /> Rejoindre la salle
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold text-slate-400">SongSpot</span>
            <span className="text-slate-600">·</span>
            <span>Blind test musical en direct</span>
          </div>
          <div className="text-slate-500">
            Extraits audio officiels certifiés
          </div>
        </div>
      </footer>
    </div>
  );
}
