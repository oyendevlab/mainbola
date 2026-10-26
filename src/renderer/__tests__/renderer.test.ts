import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  return {
    default: {
      AUTO: 0,
      Scale: {
        FIT: 3,
        CENTER_BOTH: 1,
      },
      Scene: class {
        scene = {
          start: vi.fn(),
        };
        textures = {
          exists: vi.fn().mockReturnValue(false),
          remove: vi.fn(),
          createCanvas: vi.fn().mockReturnValue({
            context: {
              clearRect: vi.fn(),
              fillRect: vi.fn(),
              fillStyle: '',
            },
            refresh: vi.fn(),
          }),
        };
        add = {
          graphics: vi.fn().mockReturnValue({
            destroy: vi.fn(),
            setDepth: vi.fn(),
            fillStyle: vi.fn(),
            fillRect: vi.fn(),
            lineStyle: vi.fn(),
            strokeRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            strokePath: vi.fn(),
            strokeCircle: vi.fn(),
            fillCircle: vi.fn(),
            arc: vi.fn(),
            fillTriangle: vi.fn(),
            lineBetween: vi.fn(),
          }),
          container: vi.fn().mockReturnValue({
            destroy: vi.fn(),
            setDepth: vi.fn(),
            add: vi.fn(),
            setPosition: vi.fn(),
            setAngle: vi.fn(),
            setScale: vi.fn(),
            setAlpha: vi.fn(),
            setVisible: vi.fn(),
            active: true,
            x: 100,
            y: 100,
          }),
          rectangle: vi.fn().mockReturnValue({
            setStrokeStyle: vi.fn(),
          }),
          text: vi.fn().mockReturnValue({
            setOrigin: vi.fn(),
            setStroke: vi.fn(),
            setText: vi.fn(),
            destroy: vi.fn(),
            setDepth: vi.fn(),
          }),
          sprite: vi.fn().mockReturnValue({
            setOrigin: vi.fn(),
            setDepth: vi.fn(),
            setPosition: vi.fn(),
            destroy: vi.fn(),
            setY: vi.fn(),
            setTint: vi.fn(),
            x: 240,
            y: 135,
          }),
        };
        time = {
          addEvent: vi.fn().mockReturnValue({ destroy: vi.fn() }),
          delayedCall: vi.fn().mockReturnValue({ destroy: vi.fn() }),
        };
        tweens = {
          add: vi.fn().mockReturnValue({
            isPlaying: () => true,
            isPaused: () => false,
            pause: vi.fn(),
            resume: vi.fn(),
            stop: vi.fn(),
          }),
        };
        cameras = {
          main: {
            shake: vi.fn(),
          },
        };
      },
      Math: {
        DegToRad: (deg: number) => (deg * Math.PI) / 180,
        Between: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
      },
      Game: class {
        destroy = vi.fn();
        isBooted = true;
        scale = {
          refresh: vi.fn(),
        };
      },
    },
  };
});

import {
  createGameConfig,
  GAME_WIDTH,
  GAME_HEIGHT,
  DEFAULT_CONTAINER_ID,
  MatchScene,
  PhaserGame,
} from '../index';
import { MatchEvent } from '../../types';

describe('Phaser Renderer Module', () => {
  it('exports valid resolution constants and defaults', () => {
    expect(GAME_WIDTH).toBe(480);
    expect(GAME_HEIGHT).toBe(270);
    expect(DEFAULT_CONTAINER_ID).toBe('phaser-match-container');
  });

  it('creates valid 16-bit pixel-art game configuration', () => {
    const scene = new MatchScene();
    const config = createGameConfig(scene, 'custom-container');

    expect(config.width).toBe(480);
    expect(config.height).toBe(270);
    expect(config.pixelArt).toBe(true);
    expect(config.antialias).toBe(false);
    expect(config.roundPixels).toBe(true);
    expect(config.parent).toBe('custom-container');
    expect(config.scale?.mode).toBe(3); // FIT
    expect(config.scale?.autoCenter).toBe(1); // CENTER_BOTH
  });

  it('initializes MatchScene with custom events, teams and controls', () => {
    const scene = new MatchScene();

    const sampleEvents: MatchEvent[] = [
      {
        id: 'ev-1',
        minute: 0,
        type: 'KICKOFF',
        teamId: 'home-1',
        description: 'Kickoff at Wembley',
        homeScore: 0,
        awayScore: 0,
      },
      {
        id: 'ev-2',
        minute: 14,
        type: 'GOAL',
        teamId: 'home-1',
        playerName: 'Marcus Rashford',
        description: 'Goal! Curled into the top corner',
        homeScore: 1,
        awayScore: 0,
      },
    ];

    let timeUpdated = -1;
    let scoreUpdated: [number, number] = [-1, -1];

    scene.init({
      events: sampleEvents,
      homeTeam: {
        id: 'home-1',
        name: 'Manchester Red',
        primaryColor: '#EF4444',
        secondaryColor: '#FFFFFF',
        formation: '4-3-3',
      },
      awayTeam: {
        id: 'away-1',
        name: 'London Blue',
        primaryColor: '#3B82F6',
        secondaryColor: '#FFFFFF',
        formation: '4-4-2',
      },
      playbackSpeed: 2,
      isPaused: false,
      callbacks: {
        onTimeUpdate: (min) => {
          timeUpdated = min;
        },
        onScoreUpdate: (h, a) => {
          scoreUpdated = [h, a];
        },
      },
    });

    expect(scene.getCurrentMinute()).toBe(0);
    expect(scene.getScores()).toEqual({ homeScore: 0, awayScore: 0 });

    // Speed controls
    scene.setSpeed(4);
    scene.pause();
    scene.resume();

    // Restart resets scores and minute
    scene.restart();
    expect(scene.getCurrentMinute()).toBe(0);
    expect(scene.getScores()).toEqual({ homeScore: 0, awayScore: 0 });
    expect(timeUpdated).toBe(0);
    expect(scoreUpdated).toEqual([0, 0]);
  });

  it('exports PhaserGame React component properly', () => {
    expect(PhaserGame).toBeDefined();
    expect(typeof PhaserGame).toBe('object');
  });
});
