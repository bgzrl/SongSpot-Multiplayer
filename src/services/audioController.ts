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
  private lastStartSec: number = 0;
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

  load(url: string, startDurationSec: number = 0, maxDurationSec: number = 1.0) {
    if (this.isDestroyed || !this.audio) return;
    this.stop();
    this.currentUrl = url;
    this.lastStartSec = Math.max(0, startDurationSec);
    this.maxDurationSec = Math.max(this.lastStartSec + 0.2, maxDurationSec);
    if (this.audio.src !== url) {
      this.audio.src = url;
      this.audio.load();
    }
    try {
      this.audio.currentTime = this.lastStartSec;
    } catch {}
    this.onTimeUpdateCallback?.(
      this.lastStartSec,
      this.maxDurationSec > 0 ? this.lastStartSec / this.maxDurationSec : 0
    );
  }

  setRange(startDurationSec: number = 0, maxDurationSec: number = 1.0) {
    this.lastStartSec = Math.max(0, startDurationSec);
    this.maxDurationSec = Math.max(this.lastStartSec + 0.2, maxDurationSec);
    if (this.audio && !this.isPlayingState) {
      try {
        this.audio.currentTime = this.lastStartSec;
      } catch {}
      this.onTimeUpdateCallback?.(
        this.lastStartSec,
        this.maxDurationSec > 0 ? this.lastStartSec / this.maxDurationSec : 0
      );
    }
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

  // Plays strictly from startDurationSec up to maxDurationSec
  // Cancels any other playing audio in the entire application
  playSnippet(startDurationSec: number = 0, maxDurationSec?: number) {
    if (this.isDestroyed || !this.audio || !this.currentUrl) return;

    // 1. Immediately silence and stop any other player across the entire app
    stopAllAudio(this);

    const safeStart = Math.max(0, startDurationSec);
    this.lastStartSec = safeStart;
    if (maxDurationSec !== undefined) {
      this.maxDurationSec = Math.max(safeStart + 0.2, maxDurationSec);
    }

    const currentSession = ++this.sessionId;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // 2. Pause first to break any active audio pipeline before seeking
    try {
      this.audio.pause();
    } catch {}

    // 3. Immediately seek to safeStart while paused
    try {
      this.audio.currentTime = safeStart;
    } catch {}

    this.audio.volume = this.volumeLevel;
    this.isPlayingState = true;
    this.onPlayStateChangeCallback?.(true);

    // Immediately report the initial position
    this.onTimeUpdateCallback?.(
      safeStart,
      this.maxDurationSec > 0 ? safeStart / this.maxDurationSec : 0
    );

    const promise = this.audio.play();

    const onPlayReady = () => {
      // If stopped or another session started while promise was resolving, abort!
      if (this.isDestroyed || this.sessionId !== currentSession || !this.isPlayingState) {
        if (this.audio) {
          try {
            this.audio.pause();
          } catch {}
        }
        return;
      }

      // 4. Critical check: If browser ignored seek, force seek now
      if (this.audio && Math.abs(this.audio.currentTime - safeStart) > 0.2) {
        try {
          this.audio.currentTime = safeStart;
        } catch {}
      }

      this.startPrecisionLoop(currentSession);
    };

    if (promise !== undefined) {
      promise
        .then(onPlayReady)
        .catch(err => {
          if (this.sessionId === currentSession && !this.isDestroyed) {
            if (err?.name !== 'AbortError') {
              console.warn('Playback interrupted:', err);
            }
            this.stop();
          }
        });
    } else {
      onPlayReady();
    }
  }

  togglePlay(startDurationSec?: number, maxDurationSec?: number) {
    if (this.isPlayingState) {
      this.stop();
    } else {
      const start = startDurationSec !== undefined ? startDurationSec : this.lastStartSec;
      const end = maxDurationSec !== undefined ? maxDurationSec : this.maxDurationSec;
      this.playSnippet(start, end);
    }
  }

  seekAndPlay(targetSec: number, maxDurationSec?: number) {
    this.playSnippet(targetSec, maxDurationSec);
  }

  seek(targetSec: number) {
    const safe = Math.max(0, targetSec);
    this.lastStartSec = safe;
    if (this.audio) {
      try {
        this.audio.currentTime = safe;
      } catch {}
    }
    this.onTimeUpdateCallback?.(
      safe,
      this.maxDurationSec > 0 ? safe / this.maxDurationSec : 0
    );
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
        this.audio.currentTime = this.lastStartSec;
      } catch {
        // ignore
      }
    }

    this.isPlayingState = false;
    this.onPlayStateChangeCallback?.(false);
    this.onTimeUpdateCallback?.(
      this.lastStartSec,
      this.maxDurationSec > 0 ? this.lastStartSec / this.maxDurationSec : 0
    );
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
