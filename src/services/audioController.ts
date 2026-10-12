// High-precision HTML5 Audio Player Controller for ultra-short snippets
// Enforces strictly ONE active audio stream in the browser at all times (zero overlap)

const activeAudioInstances = new Set<SnippetAudioPlayer>();

export function stopAllAudio(except?: SnippetAudioPlayer) {
  for (const player of activeAudioInstances) {
    if (player !== except) {
      player.stop();
    }
  }
}

export class SnippetAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private animFrameId: number | null = null;
  private currentUrl: string = '';
  private maxDurationSec: number = 1.0;
  private onTimeUpdateCallback?: (currentTime: number, progressPercent: number) => void;
  private onPlayStateChangeCallback?: (isPlaying: boolean) => void;
  private isPlayingState: boolean = false;
  private isDestroyed: boolean = false;
  private volumeLevel: number = 0.8;
  private sessionId: number = 0;

  constructor() {
    activeAudioInstances.add(this);

    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem('songspot_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed)) {
          this.volumeLevel = Math.max(0, Math.min(1, parsed));
        }
      }

      const audioEl = new Audio();
      audioEl.preload = 'auto';
      audioEl.volume = this.volumeLevel;

      audioEl.addEventListener('ended', () => {
        if (!this.isDestroyed) {
          this.stop();
        }
      });

      audioEl.addEventListener('error', () => {
        if (this.isDestroyed || !this.currentUrl) return;

        // Fallback to server audio proxy if direct playback fails
        if (!this.currentUrl.includes('/api/music/proxy-audio') && this.audio) {
          const proxyUrl = `/api/music/proxy-audio?url=${encodeURIComponent(this.currentUrl)}`;
          this.audio.src = proxyUrl;
          this.audio.load();
          if (this.isPlayingState) {
            this.audio.play().catch(() => {});
          }
        } else {
          this.stop();
        }
      });

      this.audio = audioEl;
    }
  }

  setCallbacks(
    onTimeUpdate?: (currentTime: number, progressPercent: number) => void,
    onPlayStateChange?: (isPlaying: boolean) => void
  ) {
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onPlayStateChangeCallback = onPlayStateChange;
  }

  load(url: string, _startDurationSec: number = 0, maxDurationSec: number = 1.0) {
    if (this.isDestroyed || !this.audio) return;
    this.stop();
    this.currentUrl = url;
    this.maxDurationSec = Math.max(0.5, maxDurationSec);
    if (this.audio.src !== url) {
      this.audio.src = url;
      this.audio.load();
    }
  }

  setRange(_startDurationSec: number = 0, maxDurationSec: number = 1.0) {
    this.maxDurationSec = Math.max(0.5, maxDurationSec);
  }

  setVolume(volume: number) {
    this.volumeLevel = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volumeLevel;
    }
    try {
      localStorage.setItem('songspot_volume', String(this.volumeLevel));
    } catch {}
  }

  getVolume(): number {
    return this.volumeLevel;
  }

  // Always plays from 0 seconds up to maxDurationSec
  // Cancels any other playing audio in the entire application
  playSnippet(_startDurationSec: number = 0, maxDurationSec?: number) {
    if (this.isDestroyed || !this.audio || !this.currentUrl) return;

    // 1. Immediately silence and stop any other player across the entire app
    stopAllAudio(this);

    if (maxDurationSec !== undefined) {
      this.maxDurationSec = Math.max(0.5, maxDurationSec);
    }

    const currentSession = ++this.sessionId;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Reset playhead to start
    try {
      this.audio.currentTime = 0;
    } catch {}
    this.audio.volume = this.volumeLevel;

    this.isPlayingState = true;
    this.onPlayStateChangeCallback?.(true);

    const promise = this.audio.play();

    if (promise !== undefined) {
      promise
        .then(() => {
          // If stopped or another session started while promise was resolving, abort!
          if (this.isDestroyed || this.sessionId !== currentSession || !this.isPlayingState) {
            if (this.audio) {
              try {
                this.audio.pause();
              } catch {}
            }
            return;
          }
          this.startPrecisionLoop(currentSession);
        })
        .catch(err => {
          if (this.sessionId === currentSession && !this.isDestroyed) {
            // AbortError is normal when quickly interrupted by pause/stop
            if (err?.name !== 'AbortError') {
              console.warn('Playback interrupted:', err);
            }
            this.stop();
          }
        });
    } else {
      this.startPrecisionLoop(currentSession);
    }
  }

  togglePlay(_startDurationSec: number = 0, maxDurationSec?: number) {
    if (this.isPlayingState) {
      this.stop();
    } else {
      this.playSnippet(0, maxDurationSec);
    }
  }

  stop() {
    this.sessionId++; // Invalidate any pending play promises

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch {
        // ignore
      }
    }

    this.isPlayingState = false;
    this.onPlayStateChangeCallback?.(false);
    this.onTimeUpdateCallback?.(0, 0);
  }

  private startPrecisionLoop(expectedSession: number) {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const checkTime = () => {
      if (this.isDestroyed || !this.audio || !this.isPlayingState || this.sessionId !== expectedSession) return;

      const current = this.audio.currentTime;
      const progress = Math.min(1, Math.max(0, current / this.maxDurationSec));
      this.onTimeUpdateCallback?.(current, progress);

      if (current >= this.maxDurationSec) {
        this.stop();
        return;
      }

      this.animFrameId = requestAnimationFrame(checkTime);
    };

    this.animFrameId = requestAnimationFrame(checkTime);
  }

  destroy() {
    this.isDestroyed = true;
    this.stop();
    activeAudioInstances.delete(this);
    this.onTimeUpdateCallback = undefined;
    this.onPlayStateChangeCallback = undefined;

    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch {}
      this.audio = null;
    }
  }
}
