/**
 * Procedural Audio FX Engine for MainBola (v0.4.0)
 * Pure 8-bit/16-bit retro audio synthesis using the Web Audio API.
 * No external audio files (.mp3, .wav) are required.
 */

export type WhistleType = 'kickoff' | 'halftime' | 'fulltime';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private masterGainNode: GainNode | null = null;

  constructor() {
    // AudioContext is lazily initialized on first interaction
  }

  /**
   * Enable or disable audio output.
   */
  public setSoundEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if audio output is enabled.
   */
  public isSoundEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Inject or override AudioContext (useful for testing or custom host contexts).
   */
  public setContext(context: AudioContext | null): void {
    this.ctx = context;
    this.masterGainNode = null;
  }

  /**
   * Safely obtain or instantiate the AudioContext in browser environments.
   * Returns null in Node/SSR/Vitest environments when Web Audio API is unavailable.
   */
  public getContext(): AudioContext | null {
    if (this.ctx) return this.ctx;

    if (typeof window !== 'undefined') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (typeof AudioCtxClass === 'function') {
        try {
          this.ctx = new AudioCtxClass();
        } catch {
          this.ctx = null;
        }
      }
    }

    return this.ctx;
  }

  /**
   * Ensure AudioContext is resumed if suspended (e.g. autoplay policies).
   */
  private resumeContext(ctx: AudioContext): void {
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(() => {
        // Safe no-op if blocked by user gesture policy
      });
    }
  }

  /**
   * Get or create a master gain bus for volume control.
   */
  private getMasterGain(ctx: AudioContext): GainNode {
    if (this.masterGainNode && this.masterGainNode.context === ctx) {
      return this.masterGainNode;
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.connect(ctx.destination);
    this.masterGainNode = gain;
    return gain;
  }

  /**
   * Create an AudioBuffer filled with white noise for bursts and applause.
   */
  private createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate || 44100;
    const bufferSize = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Synthesize a referee whistle blast using frequency modulation (FM oscillator).
   * Modulator LFO (32Hz) introduces the pea-whistle trill/flutter.
   */
  private playWhistleBlast(ctx: AudioContext, masterBus: GainNode, startTime: number, duration: number): void {
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const blastGain = ctx.createGain();

    // Retro triangle/sine carrier for realistic high-pitch whistle
    carrier.type = 'triangle';
    carrier.frequency.setValueAtTime(2850, startTime);
    carrier.frequency.linearRampToValueAtTime(2950, startTime + duration);

    // Modulator oscillator: 32Hz trill
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(32, startTime);

    // Modulator depth
    modGain.gain.setValueAtTime(160, startTime);

    // Modulate carrier frequency
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    // Amplitude envelope
    blastGain.gain.setValueAtTime(0.0001, startTime);
    blastGain.gain.linearRampToValueAtTime(0.7, startTime + 0.02);
    blastGain.gain.setValueAtTime(0.7, startTime + Math.max(0.02, duration - 0.04));
    blastGain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

    carrier.connect(blastGain);
    blastGain.connect(masterBus);

    carrier.start(startTime);
    modulator.start(startTime);
    carrier.stop(startTime + duration + 0.05);
    modulator.stop(startTime + duration + 0.05);
  }

  /**
   * Play referee whistle.
   * - 'kickoff': 1 sharp medium blast
   * - 'halftime': 2 distinct blasts
   * - 'fulltime': 3 blasts (short, short, long)
   */
  public playWhistle(type: WhistleType = 'kickoff'): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    this.resumeContext(ctx);

    const master = this.getMasterGain(ctx);
    const now = ctx.currentTime;

    switch (type) {
      case 'kickoff':
        this.playWhistleBlast(ctx, master, now, 0.35);
        break;

      case 'halftime':
        this.playWhistleBlast(ctx, master, now, 0.22);
        this.playWhistleBlast(ctx, master, now + 0.30, 0.38);
        break;

      case 'fulltime':
        this.playWhistleBlast(ctx, master, now, 0.18);
        this.playWhistleBlast(ctx, master, now + 0.25, 0.18);
        this.playWhistleBlast(ctx, master, now + 0.50, 0.65);
        break;
    }
  }

  /**
   * Play a retro ball kick / pass / shot sound using a frequency-drop pitch sweep.
   * Shots have higher punch, faster sweep, and a punchier transient click.
   */
  public playKick(isShot: boolean = false): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    this.resumeContext(ctx);

    const master = this.getMasterGain(ctx);
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const startFreq = isShot ? 420 : 260;
    const endFreq = isShot ? 48 : 55;
    const duration = isShot ? 0.18 : 0.11;
    const peakVolume = isShot ? 0.9 : 0.6;

    osc.type = isShot ? 'triangle' : 'sine';

    // Exponential pitch drop
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    // Gain envelope
    gain.gain.setValueAtTime(peakVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + duration + 0.02);

    // Add snap transient for shots
    if (isShot) {
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();

      snapOsc.type = 'square';
      snapOsc.frequency.setValueAtTime(900, now);
      snapOsc.frequency.exponentialRampToValueAtTime(100, now + 0.03);

      snapGain.gain.setValueAtTime(0.3, now);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      snapOsc.connect(snapGain);
      snapGain.connect(master);

      snapOsc.start(now);
      snapOsc.stop(now + 0.04);
    }
  }

  /**
   * Play goal celebration cheer:
   * Fast retro chord arpeggio (C-E-G-C) layered over a filtered crowd noise burst.
   */
  public playCheer(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    this.resumeContext(ctx);

    const master = this.getMasterGain(ctx);
    const now = ctx.currentTime;

    // 1. Retro Arpeggio (C5 -> E5 -> G5 -> C6)
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.10 }, // C5
      { freq: 659.25, time: 0.09, dur: 0.10 }, // E5
      { freq: 783.99, time: 0.18, dur: 0.12 }, // G5
      { freq: 1046.50, time: 0.28, dur: 0.45 }, // C6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const noteStart = now + time;
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      // Retro pulse-like square or triangle wave
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);

      noteGain.gain.setValueAtTime(0.0001, noteStart);
      noteGain.gain.linearRampToValueAtTime(0.5, noteStart + 0.015);
      noteGain.gain.setValueAtTime(0.5, noteStart + dur - 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + dur);

      osc.connect(noteGain);
      noteGain.connect(master);

      osc.start(noteStart);
      osc.stop(noteStart + dur + 0.02);
    });

    // 2. Crowd roar / noise burst
    try {
      const noiseDuration = 0.8;
      const noiseBuffer = this.createNoiseBuffer(ctx, noiseDuration);
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Bandpass filter to shape noise like stadium roar
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.Q.setValueAtTime(1.2, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.4, now + 0.15);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + noiseDuration);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);

      noiseSource.start(now);
      noiseSource.stop(now + noiseDuration + 0.05);
    } catch {
      // Buffer source fallback
    }
  }

  /**
   * Play tackle FX: Low impact thud combined with a snappy contact crack.
   */
  public playTackle(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    this.resumeContext(ctx);

    const master = this.getMasterGain(ctx);
    const now = ctx.currentTime;

    // 1. Low Thud (150Hz -> 32Hz)
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();

    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(150, now);
    thudOsc.frequency.exponentialRampToValueAtTime(32, now + 0.14);

    thudGain.gain.setValueAtTime(0.7, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    thudOsc.connect(thudGain);
    thudGain.connect(master);

    thudOsc.start(now);
    thudOsc.stop(now + 0.16);

    // 2. High snap / clash transient
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();

    snapOsc.type = 'square';
    snapOsc.frequency.setValueAtTime(1200, now);
    snapOsc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

    snapGain.gain.setValueAtTime(0.35, now);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    snapOsc.connect(snapGain);
    snapGain.connect(master);

    snapOsc.start(now);
    snapOsc.stop(now + 0.05);
  }
}

// Singleton instance
export const soundEngine = new SoundEngine();

// Convenience helper functions
export const playWhistle = (type: WhistleType = 'kickoff'): void => {
  soundEngine.playWhistle(type);
};

export const playKick = (isShot?: boolean): void => {
  soundEngine.playKick(isShot);
};

export const playCheer = (): void => {
  soundEngine.playCheer();
};

export const playTackle = (): void => {
  soundEngine.playTackle();
};

export const setSoundEnabled = (enabled: boolean): void => {
  soundEngine.setSoundEnabled(enabled);
};
