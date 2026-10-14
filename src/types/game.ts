export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  previewUrl: string;
  artwork: string;
  year?: number;
  genre?: string;
  appleMusicUrl?: string;
}

export interface ClientSongHint {
  id: string;
  previewUrl: string;
  genre?: string;
  era?: string;
  duration?: number;
}

export interface Player {
  id: string;
  nickname: string;
  avatar: string;
  color: string;
  score: number;
  isHost: boolean;
  isReady: boolean;
  hasGuessed: boolean;
  currentStep: number;
  pointsEarnedThisRound: number;
  connected: boolean;
  guessHistory?: {
    attempt: number;
    text: string;
    isCorrect: boolean;
    timestamp: number;
  }[];
}

export interface GameSettings {
  totalRounds: number;
  roundDurationSec: number;
  playlistId: string;
  playlistName: string;
  snippetSteps: number[]; // e.g. [0.2, 0.5, 1.5, 4.0, 9.0, 15.0]
  customArtist?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface LiveReaction {
  id: string;
  senderName: string;
  emoji: string;
  timestamp: number;
}

export interface RoundScoreRecord {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  playerColor: string;
  points: number;
  step: number;
  isCorrect: boolean;
  timeSec: number;
}

export interface RoomState {
  roomId: string;
  status: 'lobby' | 'playing' | 'round_end' | 'game_over';
  players: Player[];
  hostId: string;
  settings: GameSettings;
  currentRound: number;
  totalRounds: number;
  roundTimeLeft: number;
  currentSongHint?: ClientSongHint;
  revealedSong?: Song;
  roundScores?: RoundScoreRecord[];
}

export interface SoloStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  guessDistribution: Record<number, number>; // step 1 to 6
  totalScore: number;
}

export interface PlaylistInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge: string;
  gradient: string;
  songsCount: number;
}

export interface ArtistInfo {
  id: number | string;
  name: string;
  picture: string;
  nb_fan?: number;
}
