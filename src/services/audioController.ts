// High-precision HTML5 Audio Player Controller for ultra-short snippets

export class SnippetAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private animFrameId: number | null = null;
  private startDurationSec: number = 0;
  private maxDurationSec: number = 0.2;
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
        console.warn('Audio playback error:', e);
        this.stop();
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

  load(url: string, startDurationSec: number, maxDurationSec: number) {
    if (!this.audio) return;
    this.stop();
    this.startDurationSec = Math.max(0, startDurationSec);
    this.maxDurationSec = Math.max(this.startDurationSec + 0.1, maxDurationSec);
    if (this.audio.src !== url) {
      this.audio.src = url;
      this.audio.load();
    }
  }

  setRange(startDurationSec: number, maxDurationSec: number) {
    this.startDurationSec = Math.max(0, startDurationSec);
    this.maxDurationSec = Math.max(this.startDurationSec + 0.1, maxDurationSec);
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

  playSnippet(startDurationSec?: number, maxDurationSec?: number) {
    if (!this.audio) return;

    if (startDurationSec !== undefined) {
      this.startDurationSec = Math.max(0, startDurationSec);
    }
    if (maxDurationSec !== undefined) {
      this.maxDurationSec = Math.max(this.startDurationSec + 0.1, maxDurationSec);
    }

    // Forward lock: always start exactly at the unlocked start point
    this.audio.currentTime = this.startDurationSec;

    this.audio.play().then(() => {
      this.isPlayingState = true;
      this.onPlayStateChangeCallback?.(true);
      this.startPrecisionLoop();
    }).catch(err => {
      console.warn('Auto-play prevented or network issue:', err);
      this.stop();
    });
  }

  togglePlay(startDurationSec?: number, maxDurationSec?: number) {
    if (this.isPlayingState) {
      this.stop();
    } else {
      this.playSnippet(startDurationSec, maxDurationSec);
    }
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = this.startDurationSec;
    }
    this.isPlayingState = false;
    this.onPlayStateChangeCallback?.(false);
    this.onTimeUpdateCallback?.(this.startDurationSec, 0);
  }

  private startPrecisionLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    const checkTime = () => {
      if (!this.audio || !this.isPlayingState) return;

      const current = this.audio.currentTime;
      const range = Math.max(0.1, this.maxDurationSec - this.startDurationSec);
      const progress = Math.min(1, Math.max(0, (current - this.startDurationSec) / range));
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
