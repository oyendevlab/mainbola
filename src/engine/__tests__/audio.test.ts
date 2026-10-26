import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  SoundEngine,
  soundEngine,
  playWhistle,
  playKick,
  playCheer,
  playTackle,
  setSoundEnabled,
} from '../audio';

// Helper to create a functional mock AudioContext
function createMockAudioContext() {
  const destination = {} as AudioDestinationNode;

  const createMockAudioParam = () => ({
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });

  const createMockOscillator = () => ({
    type: 'sine' as OscillatorType,
    frequency: createMockAudioParam(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });

  const createMockGain = () => ({
    gain: createMockAudioParam(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  });

  const createMockBiquadFilter = () => ({
    type: 'bandpass' as BiquadFilterType,
    frequency: createMockAudioParam(),
    Q: createMockAudioParam(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  });

  const createMockBufferSource = () => ({
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });

  const createMockBuffer = (channels: number, length: number, sampleRate: number) => {
    const data = new Float32Array(length);
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: vi.fn(() => data),
    };
  };

  const mockCtx = {
    currentTime: 10,
    sampleRate: 44100,
    state: 'running' as AudioContextState,
    destination,
    createOscillator: vi.fn(createMockOscillator),
    createGain: vi.fn(createMockGain),
    createBiquadFilter: vi.fn(createMockBiquadFilter),
    createBufferSource: vi.fn(createMockBufferSource),
    createBuffer: vi.fn(createMockBuffer),
    resume: vi.fn().mockResolvedValue(undefined),
  };

  return mockCtx as unknown as AudioContext;
}

describe('SoundEngine (Web Audio API Procedural Audio)', () => {
  beforeEach(() => {
    soundEngine.setSoundEnabled(true);
    soundEngine.setContext(null);
  });

  afterEach(() => {
    soundEngine.setSoundEnabled(true);
    soundEngine.setContext(null);
  });

  describe('Node/Vitest Safe Fallback (No Web Audio API)', () => {
    it('initializes in enabled state by default', () => {
      const engine = new SoundEngine();
      expect(engine.isSoundEnabled()).toBe(true);
    });

    it('toggles enabled state via setSoundEnabled', () => {
      soundEngine.setSoundEnabled(false);
      expect(soundEngine.isSoundEnabled()).toBe(false);

      soundEngine.setSoundEnabled(true);
      expect(soundEngine.isSoundEnabled()).toBe(true);

      setSoundEnabled(false);
      expect(soundEngine.isSoundEnabled()).toBe(false);
    });

    it('safely handles play calls without throwing when AudioContext is missing', () => {
      expect(() => playWhistle('kickoff')).not.toThrow();
      expect(() => playWhistle('halftime')).not.toThrow();
      expect(() => playWhistle('fulltime')).not.toThrow();
      expect(() => playKick(false)).not.toThrow();
      expect(() => playKick(true)).not.toThrow();
      expect(() => playCheer()).not.toThrow();
      expect(() => playTackle()).not.toThrow();
    });
  });

  describe('Procedural Synthesis with AudioContext Mock', () => {
    let mockContext: ReturnType<typeof createMockAudioContext>;

    beforeEach(() => {
      mockContext = createMockAudioContext();
      soundEngine.setContext(mockContext);
      soundEngine.setSoundEnabled(true);
    });

    it('resumes suspended context when playing sound', () => {
      (mockContext as any).state = 'suspended';
      soundEngine.playKick();
      expect(mockContext.resume).toHaveBeenCalled();
    });

    it('plays kickoff whistle with single blast and modulated oscillator', () => {
      soundEngine.playWhistle('kickoff');

      // 1 carrier + 1 modulator = 2 oscillators
      expect(mockContext.createOscillator).toHaveBeenCalledTimes(2);
      expect(mockContext.createGain).toHaveBeenCalled();
    });

    it('plays halftime whistle with two blasts', () => {
      soundEngine.playWhistle('halftime');

      // 2 blasts x 2 oscillators = 4 oscillators
      expect(mockContext.createOscillator).toHaveBeenCalledTimes(4);
    });

    it('plays fulltime whistle with three blasts', () => {
      soundEngine.playWhistle('fulltime');

      // 3 blasts x 2 oscillators = 6 oscillators
      expect(mockContext.createOscillator).toHaveBeenCalledTimes(6);
    });

    it('plays kick (pass) with frequency drop pitch sweep', () => {
      soundEngine.playKick(false);

      expect(mockContext.createOscillator).toHaveBeenCalledTimes(1);
      const osc = (mockContext.createOscillator as any).mock.results[0].value;
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(260, 10);
      expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(55, 10 + 0.11);
    });

    it('plays shot kick with higher punch and snap transient', () => {
      soundEngine.playKick(true);

      // Main kick osc + snap osc = 2 oscillators
      expect(mockContext.createOscillator).toHaveBeenCalledTimes(2);
      const mainOsc = (mockContext.createOscillator as any).mock.results[0].value;
      expect(mainOsc.frequency.setValueAtTime).toHaveBeenCalledWith(420, 10);
      expect(mainOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(48, 10 + 0.18);
    });

    it('plays goal cheer with 4-note retro arpeggio (C-E-G-C) and noise buffer', () => {
      soundEngine.playCheer();

      // 4 arpeggio notes
      expect(mockContext.createOscillator).toHaveBeenCalledTimes(4);
      // Noise buffer for crowd cheer
      expect(mockContext.createBuffer).toHaveBeenCalled();
      expect(mockContext.createBufferSource).toHaveBeenCalled();
      expect(mockContext.createBiquadFilter).toHaveBeenCalled();
    });

    it('plays tackle sound with low thud and snap transient', () => {
      soundEngine.playTackle();

      // 1 thud osc + 1 snap osc = 2 oscillators
      expect(mockContext.createOscillator).toHaveBeenCalledTimes(2);
      const thudOsc = (mockContext.createOscillator as any).mock.results[0].value;
      expect(thudOsc.frequency.setValueAtTime).toHaveBeenCalledWith(150, 10);
      expect(thudOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(32, 10 + 0.14);
    });

    it('does not trigger synthesis when sound is disabled', () => {
      soundEngine.setSoundEnabled(false);

      soundEngine.playWhistle('kickoff');
      soundEngine.playKick(true);
      soundEngine.playCheer();
      soundEngine.playTackle();

      expect(mockContext.createOscillator).not.toHaveBeenCalled();
      expect(mockContext.createBufferSource).not.toHaveBeenCalled();
    });
  });
});
