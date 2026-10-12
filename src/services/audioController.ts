// High-precision HTML5 Audio Player Controller for ultra-short snippets

export class SnippetAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private animFrameId: number | null = null;
  private currentUrl: string = '';
  private maxDurationSec: number = 1.0;
  private onTimeUpdateCallback?: (currentTime: number, progressPercent: number) => void;
  private onPlayStateChangeCallback?: (isPlaying: boolean) => void;
  private isPlayingState: boolean = false;
  private volumeLevel: number = 0.8;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem('songspot_volume');
      if (savedVol !== null) {
        this.volumeLevel = parseFloat(savedVol) || 0.8;
      }

      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.volume = this.volumeLevel;

      this.audio.addEventListener('ended', () => {
        this.stop();
      });

      this.audio.addEventListener('error', (e) => {
        console.warn('Audio playback error on direct URL:', e);
        // Fallback to server audio proxy if direct playback fails
        if (this.currentUrl && !this.currentUrl.includes('/api/music/proxy-audio') && this.audio) {
          const proxyUrl = `/api/music/proxy-audio?url=${encodeURIComponent(this.currentUrl)}`;
          this.audio.src = proxyUrl;
          this.audio.load();
        } else {
          this.stop();
        }
      });
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
    if (!this.audio) return;
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

  // Always plays from 0 seconds up to maxDurationSec (standard Heardle/Songspot mechanic)
  playSnippet(_startDurationSec: number = 0, maxDurationSec?: number) {
    if (!this.audio) return;

    if (maxDurationSec !== undefined) {
      this.maxDurationSec = Math.max(0.5, maxDurationSec);
    }

    // Always restart from the beginning of the song
    this.audio.currentTime = 0;

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlayingState = true;
          this.onPlayStateChangeCallback?.(true);
          this.startPrecisionLoop();
        })
        .catch(err => {
          console.warn('Auto-play prevented or network issue:', err);
          this.stop();
        });
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
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.isPlayingState = false;
    this.onPlayStateChangeCallback?.(false);
    this.onTimeUpdateCallback?.(0, 0);
  }

  private startPrecisionLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    const checkTime = () => {
      if (!this.audio || !this.isPlayingState) return;

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
    this.stop();
    if (this.audio) {
      this.audio.src = '';
      this.audio = null;
    }
  }
}
