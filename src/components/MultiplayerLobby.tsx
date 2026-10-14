import React, { useState } from 'react';
import { RoomState, PlaylistInfo } from '../types/game';
import {
  Copy,
  Check,
  Crown,
  Play,
  Users,
  Settings,
  Music,
  Share2,
  Sliders,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface MultiplayerLobbyProps {
  roomState: RoomState;
  currentUserId: string;
  playlists: PlaylistInfo[];
  onStartGame: () => void;
  onToggleReady: () => void;
  onUpdateSettings: (settings: Partial<RoomState['settings']>) => void;
  onLeaveRoom?: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  roomState,
  currentUserId,
  playlists,
  onStartGame,
  onToggleReady,
  onUpdateSettings,
  onLeaveRoom,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customSearch, setCustomSearch] = useState(roomState.settings.customArtist || '');
  const [playlistUrlInput, setPlaylistUrlInput] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);
  const [importUrlError, setImportUrlError] = useState<string | null>(null);

  const isHost = roomState.hostId === currentUserId;
  const me = roomState.players.find(p => p.id === currentUserId);
  const nonHostPlayers = roomState.players.filter(p => !p.isHost && p.id !== roomState.hostId);
  const totalNonHost = nonHostPlayers.length;
  const readyCount = nonHostPlayers.filter(p => p.isReady).length;
  const hasEnoughPlayers = roomState.players.length >= 2;
  const allReady = hasEnoughPlayers && totalNonHost > 0 && readyCount === totalNonHost;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomState.roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#room=${roomState.roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCustomSearchApply = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      customArtist: customSearch.trim(),
      playlistName: customSearch.trim() ? `👑 100% ${customSearch.trim()}` : '⚡ Rap FR',
    });
  };

  const handleImportPlaylistUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = playlistUrlInput.trim();
    if (!url.startsWith('http')) {
      setImportUrlError('Veuillez coller un lien valide (Spotify ou Deezer)');
      return;
    }
    setImportingUrl(true);
    setImportUrlError(null);
    try {
      const res = await fetch(`/api/music/import-playlist?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok || data.success === false || data.error) {
        throw new Error(data.message || data.error || 'Erreur lors de l’import');
      }
      onUpdateSettings({
        playlistId: 'custom-link',
        playlistName: `🔗 ${data.name || 'Playlist importée'} (${data.songs?.length || 0} titres)`,
        customArtist: url,
      });
      setPlaylistUrlInput('');
    } catch (err: any) {
      setImportUrlError(err.message || 'Impossible de charger la playlist');
    } finally {
      setImportingUrl(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Room Code & Share Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
            Salon Multijoueur
          </div>
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-widest">
              {roomState.roomId}
            </h2>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-semibold">
              {roomState.players.length} joueur{roomState.players.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Partagez ce code avec vos amis pour qu'ils rejoignent la partie.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <button
            onClick={copyRoomCode}
            type="button"
            className="flex-1 md:flex-initial px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copiedCode ? 'Copié !' : 'Copier Code'}
          </button>

          <button
            onClick={copyInviteLink}
            type="button"
            className="flex-1 md:flex-initial px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            {copiedLink ? 'Copié !' : 'Inviter'}
          </button>

          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              type="button"
              className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white border border-rose-500/30 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Quitter la salle"
            >
              <span>Quitter 🚪</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Players List (2 columns on lg) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> Joueurs connectés ({roomState.players.length})
            </h3>
            <span className="text-xs text-slate-400">
              {allReady ? '🎉 Tout le monde est prêt !' : 'En attente des joueurs...'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {roomState.players.map(player => {
              const isPlayerHost = player.id === roomState.hostId;
              const isCurrentUser = player.id === currentUserId;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isCurrentUser
                      ? 'bg-slate-800/80 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl filter drop-shadow">{player.avatar}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-white truncate flex items-center gap-1.5">
                        <span>{player.nickname}</span>
                        {isPlayerHost && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                        {isCurrentUser && (
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                            Vous
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isPlayerHost ? 'Chef de salle' : player.isReady ? 'Prêt à jouer !' : 'En préparation'}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isPlayerHost ? (
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        Hôte
                      </span>
                    ) : player.isReady ? (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Prêt
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                        Attente
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-800">
            {!isHost && (
              <button
                onClick={onToggleReady}
                type="button"
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  me?.isReady
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                }`}
              >
                {me?.isReady ? 'Annuler Prêt' : 'Je suis prêt ! ✅'}
              </button>
            )}

            {isHost && (
              <button
                onClick={onStartGame}
                disabled={!allReady}
                type="button"
                className={`w-full sm:flex-1 px-8 py-3.5 font-bold text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 ${
                  allReady
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer active:scale-95 shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {!hasEnoughPlayers
                    ? "En attente d'autres joueurs (2 joueurs min.)"
                    : !allReady
                    ? `En attente des joueurs (${readyCount}/${totalNonHost} prêts)`
                    : 'Lancer la partie ! 🚀'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Room Settings Panel (Host controls or Read-only for guests) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800 font-bold text-white text-base">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>Paramètres de partie</span>
              {!isHost && (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">
                  Hôte seul
                </span>
              )}
            </div>

            {/* Rounds selection */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Nombre de manches
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 15, 20].map(n => (
                  <button
                    key={n}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ totalRounds: n })}
                    className={`py-2 rounded-xl text-xs font-semibold tabular-nums border transition-all ${
                      roomState.settings.totalRounds === n
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    } ${!isHost ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Time limit per round */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Temps par manche
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[30, 45, 60].map(sec => (
                  <button
                    key={sec}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ roundDurationSec: sec })}
                    className={`py-2 rounded-xl text-xs font-semibold tabular-nums border transition-all ${
                      roomState.settings.roundDurationSec === sec
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    } ${!isHost ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Playlist Preset Selection */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Thème musical
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {playlists.map(pl => {
                  const isSelected = roomState.settings.playlistId === pl.id;
                  return (
                    <button
                      key={pl.id}
                      type="button"
                      disabled={!isHost}
                      onClick={() => {
                        onUpdateSettings({
                          playlistId: pl.id,
                          playlistName: pl.name,
                          customArtist: pl.id === 'single-artist' ? (roomState.settings.customArtist || 'Theodort') : '',
                        });
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                      } ${!isHost ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{pl.icon}</span>
                        <span className="text-xs font-semibold truncate">{pl.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* URL Playlist Link Import (Spotify / Deezer) */}
            {isHost && (
              <div className="mt-3 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  🔗 Ou coller le lien d'une playlist (Spotify / Deezer)
                </label>
                <form onSubmit={handleImportPlaylistUrl} className="flex gap-1.5">
                  <input
                    type="url"
                    value={playlistUrlInput}
                    onChange={e => setPlaylistUrlInput(e.target.value)}
                    placeholder="Lien playlist Spotify ou Deezer..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    type="submit"
                    disabled={importingUrl}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {importingUrl ? '...' : 'Charger'}
                  </button>
                </form>
                {importUrlError && (
                  <p className="text-[11px] text-rose-400">{importUrlError}</p>
                )}
                {roomState.settings.playlistId === 'custom-link' && (
                  <p className="text-[11px] text-emerald-400 font-semibold truncate">
                    {roomState.settings.playlistName}
                  </p>
                )}
              </div>
            )}

            {/* If Single Artist is selected */}
            {roomState.settings.playlistId === 'single-artist' && (
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 flex items-center gap-1">
                    👑 Artiste à deviner :
                  </span>
                  <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[11px]">
                    {roomState.settings.customArtist || 'Theodort'}
                  </span>
                </div>

                {isHost && (
                  <>
                    <form onSubmit={handleCustomSearchApply} className="flex gap-1.5">
                      <input
                        type="text"
                        value={customSearch}
                        onChange={e => setCustomSearch(e.target.value)}
                        placeholder="Ex: Theodort, Jul, Gazo, SDM..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Appliquer
                      </button>
                    </form>

                    {/* Quick artist chips in clean horizontal row */}
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-1">
                      {['Theodort', 'Jul', 'Gazo', 'Ninho', 'SDM', 'PLK', 'Tiakola', 'Billie Eilish'].map(art => (
                        <button
                          key={art}
                          type="button"
                          onClick={() => {
                            setCustomSearch(art);
                            onUpdateSettings({
                              playlistId: 'single-artist',
                              customArtist: art,
                              playlistName: `👑 100% ${art}`,
                            });
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                            (roomState.settings.customArtist || '').toLowerCase() === art.toLowerCase()
                              ? 'bg-amber-400 text-slate-950 border-amber-400'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {art}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
